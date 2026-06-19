import { CharacterDirection } from '../../shared/characterAnimation';
import { directionToTileDelta } from '../../shared/movement';
import { BuildingManager } from './BuildingManager';
import { EntityManager } from './EntityManager';
import { WorldManager } from './WorldManager';

export class HeroMovementManager {
  constructor(
    private readonly entityManager: EntityManager,
    private readonly worldManager: WorldManager,
    private readonly buildingManager: BuildingManager,
  ) {}

  tryMove(socketId: string, direction: CharacterDirection): boolean {
    const hero = this.entityManager.getHeroBySocket(socketId);
    if (!hero) {
      return false;
    }

    const delta = directionToTileDelta(direction);
    const nextX = hero.position.x + delta.x;
    const nextY = hero.position.y + delta.y;

    if (!this.canMoveTo(nextX, nextY, hero.id)) {
      return false;
    }

    this.worldManager.releaseSpawnTile(hero.position.x, hero.position.y);
    this.entityManager.updateHero(hero.id, {
      position: { x: nextX, y: nextY },
      facingDirection: direction,
    });
    this.worldManager.reserveSpawnTile(nextX, nextY);
    return true;
  }

  private canMoveTo(x: number, y: number, heroId: string): boolean {
    if (!this.worldManager.isInBounds(x, y)) {
      return false;
    }

    if (!this.worldManager.isWalkable(x, y)) {
      return false;
    }

    const mapWidth = this.worldManager.getMap().width;
    if (this.buildingManager.getBuildingAt(x, y, mapWidth)) {
      return false;
    }

    if (this.isOccupiedByOtherHero(x, y, heroId)) {
      return false;
    }

    return true;
  }

  private isOccupiedByOtherHero(x: number, y: number, heroId: string): boolean {
    return this.entityManager.getAllHeroes().some(
      (hero) => hero.id !== heroId && hero.position.x === x && hero.position.y === y,
    );
  }
}
