import {
  EnemySpawnDefinition,
  getEnemyDefinitionsForBiome,
  WorldBiome,
} from '../../shared/biomeConfig';
import { MapEnemyInterface } from '../../shared/types';
import { WorldManager } from './WorldManager';

const BASE_MAP_TILES = 160 * 120;
const TARGET_ENEMY_DENSITY = 0.00045;

function tileHash(x: number, y: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function pickWeightedEnemy(
  definitions: EnemySpawnDefinition[],
  roll: number,
): EnemySpawnDefinition | null {
  if (definitions.length === 0) {
    return null;
  }

  const totalWeight = definitions.reduce((sum, definition) => sum + definition.spawnWeight, 0);
  let cursor = roll * totalWeight;

  for (const definition of definitions) {
    cursor -= definition.spawnWeight;
    if (cursor <= 0) {
      return definition;
    }
  }

  return definitions[definitions.length - 1] ?? null;
}

export class EnemyManager {
  private readonly enemies = new Map<string, MapEnemyInterface>();

  initializeFromWorld(worldManager: WorldManager): void {
    if (this.enemies.size > 0) {
      return;
    }

    const map = worldManager.getMap();
    const mapTiles = map.width * map.height;
    const density = TARGET_ENEMY_DENSITY * (BASE_MAP_TILES / mapTiles);

    for (let y = 1; y < map.height - 1; y += 1) {
      for (let x = 1; x < map.width - 1; x += 1) {
        if (!worldManager.isWalkable(x, y)) {
          continue;
        }

        const biome = worldManager.getBiomeAt(x, y);
        if (!biome) {
          continue;
        }

        const spawnRoll = tileHash(x + 17, y + 31);
        if (spawnRoll > density) {
          continue;
        }

        const candidates = getEnemyDefinitionsForBiome(biome);
        const definition = pickWeightedEnemy(candidates, tileHash(x + 53, y + 71));
        if (!definition) {
          continue;
        }

        this.spawnEnemy(definition, biome, x, y);
      }
    }
  }

  getAllEnemies(): MapEnemyInterface[] {
    return Array.from(this.enemies.values());
  }

  private spawnEnemy(
    definition: EnemySpawnDefinition,
    biome: WorldBiome,
    x: number,
    y: number,
  ): void {
    const id = `enemy-${x}-${y}-${definition.profileId}`;
    this.enemies.set(id, {
      id,
      profileId: definition.profileId,
      label: definition.label,
      x,
      y,
      biome,
      hp: 100,
    });
  }
}
