import { classifyWorldBiome, WorldBiome } from '../../shared/biomeConfig';
import { TerrainType } from '../../shared/types';

function tileIndex(x: number, y: number, width: number): number {
  return y * width + x;
}

function isLandTile(terrain: TerrainType): boolean {
  return terrain !== TerrainType.WATER;
}

export function buildTemperatureField(
  width: number,
  height: number,
  elevation: number[],
  sampleNoise: (x: number, y: number, baseFreq: number, offsetX?: number, offsetY?: number) => number,
): number[] {
  const values: number[] = [];

  for (let y = 0; y < height; y += 1) {
    const latitude = 1 - Math.abs((y / (height - 1)) - 0.5) * 2;
    for (let x = 0; x < width; x += 1) {
      const i = tileIndex(x, y, width);
      const regional =
        sampleNoise(x, y, 0.04, 301, 97) * 0.55
        + sampleNoise(x, y, 0.085, 67, 151) * 0.45;
      const cooled = latitude * 0.35 + regional * 0.65 - elevation[i]! * 0.18;
      values.push(Math.min(1, Math.max(0, cooled)));
    }
  }

  return values;
}

export function assignBiomeField(
  width: number,
  height: number,
  tiles: TerrainType[],
  elevation: number[],
  moisture: number[],
  temperature: number[],
): WorldBiome[] {
  const biomes: WorldBiome[] = new Array(width * height).fill(WorldBiome.STANDARD);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = tileIndex(x, y, width);
      const terrain = tiles[i]!;
      biomes[i] = classifyWorldBiome(
        elevation[i]!,
        moisture[i]!,
        temperature[i]!,
        isLandTile(terrain),
      );
    }
  }

  return biomes;
}

export function paintBiomeTerrain(
  tiles: TerrainType[],
  biomes: WorldBiome[],
  width: number,
  height: number,
  forestField: number[],
  hashNoise: (x: number, y: number) => number,
): void {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = tileIndex(x, y, width);
      if (!isLandTile(tiles[i]!)) {
        continue;
      }

      if (tiles[i] === TerrainType.STONE) {
        continue;
      }

      const biome = biomes[i]!;
      const forest = forestField[i]!;
      const noise = hashNoise(x * 3, y * 5);

      switch (biome) {
        case WorldBiome.DESERT:
          tiles[i] = TerrainType.SAND;
          break;
        case WorldBiome.CEMETERY:
          tiles[i] = noise > 0.62 ? TerrainType.STONE : TerrainType.DIRT;
          break;
        case WorldBiome.FAIRY_FOREST:
          tiles[i] = forest > 0.4 || noise > 0.55 ? TerrainType.FOREST : TerrainType.GRASS;
          break;
        case WorldBiome.STANDARD:
        default:
          tiles[i] = forest > 0.52 && noise > 0.38 ? TerrainType.FOREST : TerrainType.GRASS;
          break;
      }
    }
  }
}

export function softenBiomeBoundaries(
  tiles: TerrainType[],
  biomes: WorldBiome[],
  width: number,
  height: number,
  forestField: number[],
  hashNoise: (x: number, y: number) => number,
): void {
  const nextBiomes = [...biomes];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = tileIndex(x, y, width);
      if (!isLandTile(tiles[i]!)) {
        continue;
      }

      const counts = new Map<WorldBiome, number>();
      for (const [nx, ny] of [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]]) {
        const neighborBiome = biomes[tileIndex(nx, ny, width)]!;
        counts.set(neighborBiome, (counts.get(neighborBiome) ?? 0) + 1);
      }

      let dominant = biomes[i]!;
      let dominantCount = 0;
      for (const [biome, count] of counts) {
        if (count > dominantCount) {
          dominant = biome;
          dominantCount = count;
        }
      }

      if (dominantCount >= 3 && dominant !== biomes[i]) {
        nextBiomes[i] = dominant;
      }
    }
  }

  biomes.splice(0, biomes.length, ...nextBiomes);
  paintBiomeTerrain(tiles, biomes, width, height, forestField, hashNoise);
}
