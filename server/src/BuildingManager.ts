import { randomUUID } from 'crypto';
import { canIssueBuildOrders } from '../../shared/permissions';
import {
  BuildOrderInterface,
  BuildOrderRequest,
  BuildOrderStatus,
  BuildingInterface,
  BuildingType,
  HeroInterface,
  TerrainType,
} from '../../shared/types';
import { EntityManager } from './EntityManager';
import { MayorManager } from './MayorManager';
import { WorldManager } from './WorldManager';

export interface BuildOrderResult {
  success: boolean;
  order?: BuildOrderInterface;
  building?: BuildingInterface;
  error?: string;
}

const BUILDABLE_TERRAIN = new Set<TerrainType>([
  TerrainType.GRASS,
  TerrainType.DIRT,
  TerrainType.STONE,
]);

export class BuildingManager {
  private readonly buildOrders = new Map<string, BuildOrderInterface>();
  private readonly buildings = new Map<string, BuildingInterface>();
  private readonly buildingTiles = new Set<number>();

  getAllBuildOrders(): BuildOrderInterface[] {
    return Array.from(this.buildOrders.values());
  }

  getAllBuildings(): BuildingInterface[] {
    return Array.from(this.buildings.values());
  }

  getBuildingAt(x: number, y: number, mapWidth: number): BuildingInterface | undefined {
    const index = this.tileIndex(x, y, mapWidth);
    if (!this.buildingTiles.has(index)) {
      return undefined;
    }

    return this.getAllBuildings().find((building) => building.x === x && building.y === y);
  }

  issueBuildOrderFromSocket(
    socketId: string,
    request: BuildOrderRequest,
    entityManager: EntityManager,
    mayorManager: MayorManager,
    worldManager: WorldManager,
  ): BuildOrderResult {
    const hero = entityManager.getHeroBySocket(socketId);
    if (!hero) {
      return { success: false, error: 'Spieler ist nicht im Spiel.' };
    }

    return this.issueBuildOrder(hero.id, request, entityManager, mayorManager, worldManager);
  }

  issueBuildOrder(
    heroId: string,
    request: BuildOrderRequest,
    entityManager: EntityManager,
    mayorManager: MayorManager,
    worldManager: WorldManager,
  ): BuildOrderResult {
    const payloadError = this.validatePayload(request);
    if (payloadError) {
      return { success: false, error: payloadError };
    }

    const hero = entityManager.getHero(heroId);
    if (!hero) {
      return { success: false, error: 'Held nicht gefunden.' };
    }

    const mayorError = this.validateMayorAuthority(hero, mayorManager);
    if (mayorError) {
      return { success: false, error: mayorError };
    }

    const siteError = this.validateBuildSite(request, worldManager);
    if (siteError) {
      return { success: false, error: siteError };
    }

    const order: BuildOrderInterface = {
      id: randomUUID(),
      buildingType: request.buildingType,
      x: request.x,
      y: request.y,
      issuedBy: heroId,
      status: BuildOrderStatus.COMPLETED,
      createdAt: Date.now(),
    };

    const building: BuildingInterface = {
      id: randomUUID(),
      buildingType: request.buildingType,
      x: request.x,
      y: request.y,
      orderId: order.id,
      builtAt: Date.now(),
    };

    this.buildOrders.set(order.id, order);
    this.buildings.set(building.id, building);
    this.buildingTiles.add(this.tileIndex(request.x, request.y, worldManager.getMap().width));

    return { success: true, order, building };
  }

  private validatePayload(request: BuildOrderRequest | undefined): string | null {
    if (!request) {
      return 'Bauauftrag fehlt.';
    }

    if (!request.buildingType) {
      return 'Gebäudetyp ist erforderlich.';
    }

    if (request.x === undefined || request.y === undefined) {
      return 'Kachelkoordinaten sind erforderlich.';
    }

    return null;
  }

  private validateMayorAuthority(hero: HeroInterface, mayorManager: MayorManager): string | null {
    if (!mayorManager.canIssueBuildOrders(hero.id)) {
      return 'Nur der Bürgermeister kann Bauaufträge erteilen.';
    }

    if (!canIssueBuildOrders(hero)) {
      return 'Der Held hat keine Berechtigung für Bauaufträge.';
    }

    return null;
  }

  private validateBuildSite(
    request: BuildOrderRequest,
    worldManager: WorldManager,
  ): string | null {
    if (!Object.values(BuildingType).includes(request.buildingType)) {
      return 'Ungültiger Gebäudetyp.';
    }

    if (!Number.isInteger(request.x) || !Number.isInteger(request.y)) {
      return 'Ungültige Kachelkoordinaten.';
    }

    if (!worldManager.isInBounds(request.x, request.y)) {
      return 'Bauplatz liegt außerhalb der Karte.';
    }

    const terrain = worldManager.getTerrainAt(request.x, request.y);
    if (!terrain || !BUILDABLE_TERRAIN.has(terrain)) {
      return 'An dieser Stelle kann nicht gebaut werden.';
    }

    const tileIndex = this.tileIndex(request.x, request.y, worldManager.getMap().width);
    if (this.buildingTiles.has(tileIndex)) {
      return 'An dieser Stelle steht bereits ein Gebäude.';
    }

    return null;
  }

  importState(
    orders: BuildOrderInterface[],
    buildings: BuildingInterface[],
    mapWidth: number,
  ): void {
    this.buildOrders.clear();
    this.buildings.clear();
    this.buildingTiles.clear();

    for (const order of orders) {
      this.buildOrders.set(order.id, order);
    }

    for (const building of buildings) {
      this.buildings.set(building.id, building);
      this.buildingTiles.add(this.tileIndex(building.x, building.y, mapWidth));
    }
  }

  private tileIndex(x: number, y: number, width: number): number {
    return y * width + x;
  }
}
