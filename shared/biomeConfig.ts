/**
 * World biomes derived from elevation, temperature and moisture.
 *
 * Enemy profile IDs mirror `tools/scanSpritesheets.mjs` (Enemies/ folder structure).
 */
export enum WorldBiome {
  /** Meadow with scattered trees. */
  STANDARD = 'STANDARD',
  DESERT = 'DESERT',
  FAIRY_FOREST = 'FAIRY_FOREST',
  /** Friedhof */
  CEMETERY = 'CEMETERY',
}

export interface EnemySpawnDefinition {
  profileId: string;
  label: string;
  /** Path under client/public/assets — mirrors Enemies/ on disk. */
  assetFolder: string;
  biomes: WorldBiome[];
  spawnWeight: number;
}

/** Spawn table aligned with assets/Enemies/ — only listed enemies are used. */
export const ENEMY_SPAWN_DEFINITIONS: EnemySpawnDefinition[] = [
  {
    profileId: 'enemy:skeleton-crew-skeleton-base',
    label: 'Skeleton',
    assetFolder: 'Enemies/Skeleton Crew/Skeleton - Base',
    biomes: [WorldBiome.CEMETERY],
    spawnWeight: 1.2,
  },
  {
    profileId: 'enemy:skeleton-crew-skeleton-mage',
    label: 'Skeleton Mage',
    assetFolder: 'Enemies/Skeleton Crew/Skeleton - Mage',
    biomes: [WorldBiome.CEMETERY],
    spawnWeight: 0.7,
  },
  {
    profileId: 'enemy:skeleton-crew-skeleton-rogue',
    label: 'Skeleton Rogue',
    assetFolder: 'Enemies/Skeleton Crew/Skeleton - Rogue',
    biomes: [WorldBiome.CEMETERY],
    spawnWeight: 0.8,
  },
  {
    profileId: 'enemy:skeleton-crew-skeleton-warrior',
    label: 'Skeleton Warrior',
    assetFolder: 'Enemies/Skeleton Crew/Skeleton - Warrior',
    biomes: [WorldBiome.CEMETERY],
    spawnWeight: 1,
  },
  {
    profileId: 'enemy:orc-crew-orc',
    label: 'Orc',
    assetFolder: 'Enemies/Orc Crew/Orc',
    biomes: [WorldBiome.DESERT, WorldBiome.STANDARD],
    spawnWeight: 1,
  },
  {
    profileId: 'enemy:orc-crew-orc-rogue',
    label: 'Orc Rogue',
    assetFolder: 'Enemies/Orc Crew/Orc - Rogue',
    biomes: [WorldBiome.DESERT],
    spawnWeight: 0.75,
  },
  {
    profileId: 'enemy:orc-crew-orc-shaman',
    label: 'Orc Shaman',
    assetFolder: 'Enemies/Orc Crew/Orc - Shaman',
    biomes: [WorldBiome.FAIRY_FOREST, WorldBiome.DESERT],
    spawnWeight: 0.6,
  },
  {
    profileId: 'enemy:orc-crew-orc-warrior',
    label: 'Orc Warrior',
    assetFolder: 'Enemies/Orc Crew/Orc - Warrior',
    biomes: [WorldBiome.DESERT, WorldBiome.STANDARD],
    spawnWeight: 0.9,
  },
];

export function classifyWorldBiome(
  elevation: number,
  moisture: number,
  temperature: number,
  isLand: boolean,
): WorldBiome {
  if (!isLand) {
    return WorldBiome.STANDARD;
  }

  if (temperature > 0.6 && moisture < 0.42) {
    return WorldBiome.DESERT;
  }

  if (moisture < 0.36 && temperature < 0.44) {
    return WorldBiome.CEMETERY;
  }

  if (moisture > 0.62 && temperature > 0.48 && temperature < 0.72) {
    return WorldBiome.FAIRY_FOREST;
  }

  return WorldBiome.STANDARD;
}

export function getEnemyDefinitionsForBiome(biome: WorldBiome): EnemySpawnDefinition[] {
  return ENEMY_SPAWN_DEFINITIONS.filter((definition) => definition.biomes.includes(biome));
}
