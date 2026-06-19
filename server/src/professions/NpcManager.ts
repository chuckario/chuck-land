import { isGatheringProfession, professionConfigs } from '../../../shared/resourceConfig';
import { ACTIVE_PROFESSIONS, NpcInterface, Profession } from '../../../shared/types';
import { ResourceManager } from '../ResourceManager';
import { WorldManager } from '../WorldManager';
import { NpcFactory } from './NpcFactory';
import { ProfessionRegistry } from './ProfessionRegistry';

function positionKey(x: number, y: number): string {
  return `${x},${y}`;
}

export class NpcManager {
  private readonly npcs = new Map<string, NpcInterface>();
  private readonly registry: ProfessionRegistry;

  constructor(registry: ProfessionRegistry) {
    this.registry = registry;
  }

  getAllNpcs(): NpcInterface[] {
    return Array.from(this.npcs.values());
  }

  getGatheringNpcs(): NpcInterface[] {
    return this.getAllNpcs().filter((npc) => isGatheringProfession(npc.profession));
  }

  getNpc(npcId: string): NpcInterface | undefined {
    return this.npcs.get(npcId);
  }

  getNpcsByProfession(profession: Profession): NpcInterface[] {
    return this.getAllNpcs().filter((npc) => npc.profession === profession);
  }

  addNpc(npc: NpcInterface): boolean {
    if (this.npcs.has(npc.id)) {
      return false;
    }

    this.npcs.set(npc.id, npc);
    return true;
  }

  updateNpc(npcId: string, updates: Partial<NpcInterface>): NpcInterface | undefined {
    const npc = this.npcs.get(npcId);
    if (!npc) {
      return undefined;
    }

    const updated = { ...npc, ...updates, id: npc.id };
    this.npcs.set(npcId, updated);
    return updated;
  }

  removeNpc(npcId: string): boolean {
    return this.npcs.delete(npcId);
  }

  spawnStarterNpcs(worldManager: WorldManager, resourceManager: ResourceManager): void {
    const map = worldManager.getMap();
    const usedPositions = new Set<string>();
    const mapCenter = {
      x: Math.floor(map.width / 2),
      y: Math.floor(map.height / 2),
    };

    const gridOrigin = {
      x: mapCenter.x - 3,
      y: mapCenter.y - 3,
    };

    let gridIndex = 0;
    const allProfessions = ACTIVE_PROFESSIONS;

    for (const profession of allProfessions) {
      const position = isGatheringProfession(profession)
        ? this.findGathererSpawnPosition(profession, mapCenter, worldManager, resourceManager, usedPositions)
        : this.findGridSpawnPosition(gridOrigin, gridIndex, worldManager, usedPositions);

      gridIndex += 1;

      if (!position) {
        continue;
      }

      const npc = NpcFactory.createNpc(profession, position, undefined, this.registry);
      if (this.addNpc(npc)) {
        usedPositions.add(positionKey(position.x, position.y));
      }
    }

    this.ensureGatheringNpcsSpawned(worldManager, resourceManager, usedPositions, mapCenter);
  }

  clear(): void {
    this.npcs.clear();
  }

  private ensureGatheringNpcsSpawned(
    worldManager: WorldManager,
    resourceManager: ResourceManager,
    usedPositions: Set<string>,
    mapCenter: { x: number; y: number },
  ): void {
    for (const config of professionConfigs) {
      if (this.getNpcsByProfession(config.profession).length > 0) {
        continue;
      }

      const position = this.findGathererSpawnPosition(
        config.profession,
        mapCenter,
        worldManager,
        resourceManager,
        usedPositions,
      );

      if (!position) {
        continue;
      }

      const npc = NpcFactory.createNpc(config.profession, position, undefined, this.registry);
      if (this.addNpc(npc)) {
        usedPositions.add(positionKey(position.x, position.y));
      }
    }
  }

  private findGathererSpawnPosition(
    profession: Profession,
    origin: { x: number; y: number },
    worldManager: WorldManager,
    resourceManager: ResourceManager,
    usedPositions: Set<string>,
  ): { x: number; y: number } | undefined {
    const map = worldManager.getMap();
    const maxRadius = Math.max(map.width, map.height);
    const resource = resourceManager.findNearestForProfession(profession, origin, maxRadius);

    if (!resource) {
      return this.findWalkableNear(origin, worldManager, usedPositions);
    }

    const nearResource = this.findWalkableNear(
      { x: resource.x, y: resource.y },
      worldManager,
      usedPositions,
    );

    return nearResource ?? { x: resource.x, y: resource.y };
  }

  private findGridSpawnPosition(
    origin: { x: number; y: number },
    index: number,
    worldManager: WorldManager,
    usedPositions: Set<string>,
  ): { x: number; y: number } | undefined {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const slot = index + attempt;
      const candidate = {
        x: origin.x + (slot % 6),
        y: origin.y + Math.floor(slot / 6),
      };

      if (this.isValidSpawnTile(candidate, worldManager, usedPositions)) {
        return candidate;
      }
    }

    return this.findWalkableNear(origin, worldManager, usedPositions);
  }

  private findWalkableNear(
    origin: { x: number; y: number },
    worldManager: WorldManager,
    usedPositions: Set<string>,
  ): { x: number; y: number } | undefined {
    if (this.isValidSpawnTile(origin, worldManager, usedPositions)) {
      return origin;
    }

    for (let radius = 1; radius <= 8; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const candidate = { x: origin.x + dx, y: origin.y + dy };
          if (this.isValidSpawnTile(candidate, worldManager, usedPositions)) {
            return candidate;
          }
        }
      }
    }

    return undefined;
  }

  private isValidSpawnTile(
    position: { x: number; y: number },
    worldManager: WorldManager,
    usedPositions: Set<string>,
  ): boolean {
    if (!worldManager.isInBounds(position.x, position.y)) {
      return false;
    }

    if (!worldManager.isWalkable(position.x, position.y)) {
      return false;
    }

    if (usedPositions.has(positionKey(position.x, position.y))) {
      return false;
    }

    return true;
  }
}
