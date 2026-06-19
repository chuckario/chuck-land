import { randomUUID } from 'crypto';
import {
  getGatherConfig,
  ProfessionGatherConfig,
  RESOURCE_DEFAULT_AMOUNT,
} from '../../shared/resourceConfig';
import { fbm, hashNoise, tileHash } from '../../shared/worldNoise';
import {
  Profession,
  ProfessionAction,
  ResourceNodeInterface,
  ResourceNodeType,
  TerrainType,
} from '../../shared/types';
import { WorldManager } from './WorldManager';

export interface GatherResult {
  action: ProfessionAction;
  target: { x: number; y: number };
  gathered: boolean;
  depleted: boolean;
  resource?: ResourceNodeInterface;
}

function toTileKey(x: number, y: number, width: number): number {
  return y * width + x;
}

const OVERLAY_TERRAINS = new Set<TerrainType>([
  TerrainType.GRASS,
  TerrainType.FOREST,
  TerrainType.DIRT,
]);

export class ResourceManager {
  private readonly resources = new Map<string, ResourceNodeInterface>();
  private readonly tileToResourceId = new Map<number, string>();
  private mapWidth = 0;

  initializeFromWorld(worldManager: WorldManager): void {
    if (this.resources.size > 0) {
      return;
    }

    const map = worldManager.getMap();
    this.mapWidth = map.width;

    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        const terrain = worldManager.getTerrainAt(x, y);
        const placement = ResourceManager.resolveOrganicPlacement(
          worldManager,
          x,
          y,
          terrain,
        );

        if (placement) {
          this.placeResource(placement.type, x, y, placement.amount, placement.variant);
        }
      }
    }
  }

  getAllResources(): ResourceNodeInterface[] {
    return Array.from(this.resources.values());
  }

  getResourceById(resourceId: string): ResourceNodeInterface | undefined {
    return this.resources.get(resourceId);
  }

  getResourceAt(x: number, y: number): ResourceNodeInterface | undefined {
    const resourceId = this.tileToResourceId.get(toTileKey(x, y, this.mapWidth));
    if (!resourceId) {
      return undefined;
    }

    return this.resources.get(resourceId);
  }

  hasResourceAt(x: number, y: number): boolean {
    return this.tileToResourceId.has(toTileKey(x, y, this.mapWidth));
  }

  applyResourceSnapshot(resources: ResourceNodeInterface[]): void {
    for (const snapshot of resources) {
      const existing = this.resources.get(snapshot.id);
      if (existing) {
        this.resources.set(snapshot.id, { ...existing, amount: snapshot.amount });
      }
    }
  }

  findNearestResource(
    type: ResourceNodeType,
    origin: { x: number; y: number },
    maxRadius = 12,
  ): ResourceNodeInterface | undefined {
    return this.findNearestMatching(
      origin,
      (resource) => resource.type === type && resource.amount > 0,
      maxRadius,
    );
  }

  findNearestForProfession(
    profession: Profession,
    origin: { x: number; y: number },
    maxRadius = 12,
  ): ResourceNodeInterface | undefined {
    const config = getGatherConfig(profession);
    if (!config) {
      return undefined;
    }

    const primary = this.findNearestResource(config.resourceType, origin, maxRadius);
    if (primary) {
      return primary;
    }

    if (config.fallbackResourceType) {
      return this.findNearestResource(config.fallbackResourceType, origin, maxRadius);
    }

    return undefined;
  }

  resolveGatherStep(
    profession: Profession,
    position: { x: number; y: number },
    timestamp: number,
  ): GatherResult | null {
    const config = getGatherConfig(profession);
    if (!config) {
      return null;
    }

    const resource = this.findNearestForProfession(profession, position);
    if (!resource) {
      return null;
    }

    const action = this.resolveActionForConfig(config, timestamp);
    const target = { x: resource.x, y: resource.y };
    const atTarget = position.x === resource.x && position.y === resource.y;

    if (!atTarget) {
      return { action, target, gathered: false, depleted: false, resource };
    }

    if (!this.shouldGather(config, timestamp)) {
      return { action, target, gathered: false, depleted: false, resource };
    }

    const gatheredResource = this.gather(resource.id, 1);
    return {
      action,
      target,
      gathered: gatheredResource !== undefined,
      depleted: gatheredResource?.amount === 0,
      resource: gatheredResource,
    };
  }

  gather(resourceId: string, amount = 1): ResourceNodeInterface | undefined {
    const resource = this.resources.get(resourceId);
    if (!resource || resource.amount <= 0) {
      return undefined;
    }

    const remaining = Math.max(0, resource.amount - amount);

    if (remaining === 0) {
      const depleted = { ...resource, amount: 0 };
      this.removeResource(resourceId);
      return depleted;
    }

    const updated: ResourceNodeInterface = { ...resource, amount: remaining };
    this.resources.set(resourceId, updated);
    return updated;
  }

  placeResource(
    type: ResourceNodeType,
    x: number,
    y: number,
    amount?: number,
    variant?: number,
  ): ResourceNodeInterface | undefined {
    const key = toTileKey(x, y, this.mapWidth);
    if (this.tileToResourceId.has(key)) {
      return undefined;
    }

    const maxAmount = amount ?? RESOURCE_DEFAULT_AMOUNT[type];
    const resource: ResourceNodeInterface = {
      id: randomUUID(),
      type,
      x,
      y,
      amount: maxAmount,
      maxAmount,
      variant,
    };

    this.resources.set(resource.id, resource);
    this.tileToResourceId.set(key, resource.id);
    return resource;
  }

  private removeResource(resourceId: string): void {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      return;
    }

    this.resources.delete(resourceId);
    this.tileToResourceId.delete(toTileKey(resource.x, resource.y, this.mapWidth));
  }

  private findNearestMatching(
    origin: { x: number; y: number },
    predicate: (resource: ResourceNodeInterface) => boolean,
    maxRadius: number,
  ): ResourceNodeInterface | undefined {
    let nearest: ResourceNodeInterface | undefined;
    let nearestDistance = Infinity;

    this.resources.forEach((resource) => {
      if (!predicate(resource)) {
        return;
      }

      const distance = Math.abs(resource.x - origin.x) + Math.abs(resource.y - origin.y);
      if (distance <= maxRadius && distance < nearestDistance) {
        nearest = resource;
        nearestDistance = distance;
      }
    });

    return nearest;
  }

  private resolveActionForConfig(config: ProfessionGatherConfig, timestamp: number): ProfessionAction {
    if (config.harvestAction && timestamp % 4 === 0) {
      return config.harvestAction;
    }

    return config.action;
  }

  private shouldGather(config: ProfessionGatherConfig, timestamp: number): boolean {
    if (!config.harvestAction) {
      return true;
    }

    return timestamp % 4 === 0;
  }

  private static resolveOrganicPlacement(
    worldManager: WorldManager,
    x: number,
    y: number,
    terrain: TerrainType | null,
  ): { type: ResourceNodeType; amount?: number; variant: number } | undefined {
    if (!terrain) {
      return undefined;
    }

    const density = fbm(x * 0.11 + 19, y * 0.11 + 53, 3);
    const fine = hashNoise(x * 1.7 + 3, y * 1.7 + 9);
    const seed = Math.abs(tileHash(x, y)) % 1000;

    switch (terrain) {
      case TerrainType.FOREST:
        return ResourceManager.resolveForestPlacement(x, y, density, fine, seed);
      case TerrainType.STONE:
        return ResourceManager.resolveStonePlacement(worldManager, x, y, density, fine, seed);
      case TerrainType.DIRT:
        return ResourceManager.resolveDirtPlacement(x, y, density, fine, seed);
      case TerrainType.GRASS:
        return ResourceManager.resolveGrassPlacement(worldManager, x, y, density, fine, seed);
      case TerrainType.SAND:
        return ResourceManager.resolveSandPlacement(x, y, density, fine, seed);
      default:
        return undefined;
    }
  }

  private static resolveForestPlacement(
    x: number,
    y: number,
    density: number,
    fine: number,
    seed: number,
  ): { type: ResourceNodeType; variant: number } | undefined {
    const cluster = fbm(x * 0.06, y * 0.06, 2);
    const threshold = 0.38 - cluster * 0.22;

    if (fine > threshold) {
      return undefined;
    }

    return {
      type: ResourceNodeType.TREE,
      variant: Math.floor(cluster * 500) + seed,
    };
  }

  private static resolveStonePlacement(
    worldManager: WorldManager,
    x: number,
    y: number,
    density: number,
    fine: number,
    seed: number,
  ): { type: ResourceNodeType; variant: number } | undefined {
    const borderCode = ResourceManager.resolveStoneBorderCode(worldManager, x, y);
    const interiorBoost = borderCode === 0 ? 0.12 : 0;
    const threshold = 0.58 - density * 0.2 - interiorBoost;

    if (fine > threshold) {
      return undefined;
    }

    return {
      type: ResourceNodeType.STONE_NODE,
      variant: borderCode * 1000 + seed,
    };
  }

  private static resolveGrassPlacement(
    worldManager: WorldManager,
    x: number,
    y: number,
    density: number,
    fine: number,
    seed: number,
  ): { type: ResourceNodeType; variant: number } | undefined {
    if (ResourceManager.hasTerrainNeighbor(worldManager, x, y, TerrainType.STONE)) {
      const borderCode = ResourceManager.resolveStoneBorderCode(worldManager, x, y);
      if (fine < 0.22 + density * 0.08) {
        return {
          type: ResourceNodeType.STONE_NODE,
          variant: borderCode * 1000 + seed,
        };
      }
    }

    if (fine > 0.965 - density * 0.04) {
      return undefined;
    }

    if (fine < 0.018 + density * 0.01) {
      return {
        type: ResourceNodeType.WILD_GAME,
        variant: seed,
      };
    }

    return undefined;
  }

  private static resolveDirtPlacement(
    x: number,
    y: number,
    density: number,
    fine: number,
    seed: number,
  ): { type: ResourceNodeType; variant: number } | undefined {
    const fieldNoise = fbm(x * 0.14 + 7, y * 0.14 + 11, 2);
    if (fieldNoise < 0.42 || fine > 0.48 - density * 0.1) {
      return undefined;
    }

    return {
      type: ResourceNodeType.CROP,
      variant: seed,
    };
  }

  private static resolveSandPlacement(
    x: number,
    y: number,
    density: number,
    fine: number,
    seed: number,
  ): { type: ResourceNodeType; variant: number } | undefined {
    const oreVein = fbm(x * 0.09 + 201, y * 0.09 + 77, 3);
    if (oreVein < 0.68 || fine > 0.35 - density * 0.08) {
      return undefined;
    }

    return {
      type: ResourceNodeType.IRON_ORE,
      variant: seed,
    };
  }

  private static resolveStoneBorderCode(worldManager: WorldManager, x: number, y: number): number {
    const terrain = worldManager.getTerrainAt(x, y);
    const hasGrass = ResourceManager.hasTerrainNeighbor(worldManager, x, y, TerrainType.GRASS)
      || ResourceManager.hasTerrainNeighbor(worldManager, x, y, TerrainType.FOREST);
    const hasSand = ResourceManager.hasTerrainNeighbor(worldManager, x, y, TerrainType.SAND);
    const hasDirt = ResourceManager.hasTerrainNeighbor(worldManager, x, y, TerrainType.DIRT);

    if (terrain !== TerrainType.STONE && hasGrass) {
      return 1;
    }
    if (hasSand) {
      return 2;
    }
    if (hasDirt) {
      return 3;
    }
    if (terrain === TerrainType.STONE && hasGrass) {
      return 1;
    }

    return 0;
  }

  private static hasTerrainNeighbor(
    worldManager: WorldManager,
    x: number,
    y: number,
    terrain: TerrainType,
  ): boolean {
    const neighbors = [
      [x, y - 1],
      [x + 1, y],
      [x, y + 1],
      [x - 1, y],
    ] as const;

    return neighbors.some(([nx, ny]) => worldManager.getTerrainAt(nx, ny) === terrain);
  }
}
