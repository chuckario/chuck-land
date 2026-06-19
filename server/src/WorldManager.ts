import {
  assignBiomeField,
  buildTemperatureField,
  paintBiomeTerrain,
  softenBiomeBoundaries,
} from './biomeGeneration';
import { WorldBiome } from '../../shared/biomeConfig';
import {
  TerrainType,
  WORLD_MAP_HEIGHT,
  WORLD_MAP_WIDTH,
  WORLD_TILE_SIZE,
  WorldMapInterface,
} from '../../shared/types';

const WALKABLE_TERRAIN = new Set<TerrainType>([
  TerrainType.GRASS,
  TerrainType.SAND,
  TerrainType.DIRT,
  TerrainType.STONE,
  TerrainType.FOREST,
]);

/** Reference width used to keep noise feature scale stable when map size changes. */
const REFERENCE_MAP_WIDTH = 160;

/** Width of the guaranteed ocean ring around the map edge (tiles). */
const OCEAN_BORDER_WIDTH = 7;
/** Elevation cutoff when painting the initial landmass from the height field. */
const LAND_ELEVATION_THRESHOLD = 0.14;
/** Fraction of map size used to ramp from coast to deep inland elevation. */
const CONTINENTAL_COAST_FRACTION = 0.15;

function index(x: number, y: number, width: number): number {
  return y * width + x;
}

function distanceFromMapEdge(x: number, y: number, width: number, height: number): number {
  return Math.min(x, y, width - 1 - x, height - 1 - y);
}

interface Point {
  x: number;
  y: number;
}

export class WorldManager {
  private readonly map: WorldMapInterface;
  private readonly occupiedTiles = new Set<number>();

  constructor() {
    this.map = WorldManager.generateMap();
  }

  getMap(): WorldMapInterface {
    return this.map;
  }

  getTerrainAt(x: number, y: number): TerrainType | null {
    if (!this.isInBounds(x, y)) {
      return null;
    }

    return this.map.tiles[index(x, y, this.map.width)];
  }

  getBiomeAt(x: number, y: number): WorldBiome | null {
    if (!this.isInBounds(x, y)) {
      return null;
    }

    const terrain = this.getTerrainAt(x, y);
    if (terrain === null || terrain === TerrainType.WATER) {
      return null;
    }

    return this.map.biomes[index(x, y, this.map.width)] ?? null;
  }

  isWalkable(x: number, y: number): boolean {
    const terrain = this.getTerrainAt(x, y);
    return terrain !== null && WALKABLE_TERRAIN.has(terrain);
  }

  isInBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.map.width && y < this.map.height;
  }

  reserveSpawnTile(x: number, y: number): void {
    this.occupiedTiles.add(index(x, y, this.map.width));
  }

  releaseSpawnTile(x: number, y: number): void {
    this.occupiedTiles.delete(index(x, y, this.map.width));
  }

  findSpawnPosition(): { x: number; y: number } {
    const centerX = Math.floor(this.map.width / 2);
    const centerY = Math.floor(this.map.height / 2);

    for (let radius = 0; radius < Math.max(this.map.width, this.map.height); radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
            continue;
          }

          const x = centerX + dx;
          const y = centerY + dy;
          const tileIndex = index(x, y, this.map.width);

          if (!this.isWalkable(x, y) || this.occupiedTiles.has(tileIndex)) {
            continue;
          }

          this.occupiedTiles.add(tileIndex);
          return { x, y };
        }
      }
    }

    return { x: centerX, y: centerY };
  }

  private static generateMap(): WorldMapInterface {
    const width = WORLD_MAP_WIDTH;
    const height = WORLD_MAP_HEIGHT;
    const tiles: TerrainType[] = new Array(width * height).fill(TerrainType.WATER);

    const elevation = WorldManager.buildElevationField(width, height);
    const moisture = WorldManager.buildMoistureField(width, height);
    const forestField = WorldManager.buildForestField(width, height);
    const stoneField = WorldManager.buildStoneField(width, height);
    const temperature = buildTemperatureField(width, height, elevation, (x, y, baseFreq, offsetX = 0, offsetY = 0) => {
      const sx = WorldManager.scaledCoord(x + offsetX, width);
      const sy = WorldManager.scaledCoord(y + offsetY, height);
      return WorldManager.fbm(sx * baseFreq, sy * baseFreq);
    });

    WorldManager.paintLandmass(tiles, width, height, elevation);
    WorldManager.expandLandmass(tiles, width, height, elevation);
    WorldManager.paintMountainRanges(tiles, width, height, elevation, stoneField);
    WorldManager.growStoneBiomes(tiles, width, height, stoneField, elevation);
    WorldManager.scatterStoneOutcrops(tiles, width, height, stoneField, elevation);

    const biomes = assignBiomeField(width, height, tiles, elevation, moisture, temperature);
    paintBiomeTerrain(tiles, biomes, width, height, forestField, WorldManager.hashNoise);
    softenBiomeBoundaries(tiles, biomes, width, height, forestField, WorldManager.hashNoise);

    WorldManager.paintFarmlandsAndTrails(tiles, width, height, elevation);
    WorldManager.generateFlowingRiverNetwork(tiles, width, height, elevation);
    WorldManager.enforceCoastalOcean(tiles, width, height);
    WorldManager.applyBeaches(tiles, width, height);
    WorldManager.cleanupSandTiles(tiles, width, height);
    WorldManager.refineStoneFoothills(tiles, width, height, stoneField);
    WorldManager.softenBiomeEdges(tiles, width, height);
    WorldManager.cleanupSandTiles(tiles, width, height);

    return {
      width,
      height,
      tileSize: WORLD_TILE_SIZE,
      tiles,
      biomes,
      elevations: elevation,
    };
  }

  private static scaledCoord(value: number, mapExtent: number): number {
    return value * (REFERENCE_MAP_WIDTH / mapExtent);
  }

  private static hashNoise(x: number, y: number): number {
    const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  private static fbm(x: number, y: number, octaves = 4): number {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;

    for (let octave = 0; octave < octaves; octave += 1) {
      value += amplitude * WorldManager.hashNoise(x * frequency, y * frequency);
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value;
  }

  private static buildElevationField(width: number, height: number): number[] {
    const values: number[] = [];
    const coastScale = Math.min(width, height) * CONTINENTAL_COAST_FRACTION;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const edgeDistance = distanceFromMapEdge(x, y, width, height);
        const inland = edgeDistance / coastScale;
        const continental = Math.min(inland, 1.35);
        const sx = WorldManager.scaledCoord(x, width);
        const sy = WorldManager.scaledCoord(y, height);
        const elevation =
          continental * 0.54
          + WorldManager.fbm(sx * 0.028, sy * 0.028) * 0.34
          + WorldManager.fbm(sx * 0.06, sy * 0.06) * 0.14
          + WorldManager.fbm(sx * 0.11, sy * 0.11) * 0.06
          - WorldManager.fbm(sx * 0.05 + 50, sy * 0.05 + 50) * 0.06;

        values.push(elevation);
      }
    }

    return values;
  }

  private static buildMoistureField(width: number, height: number): number[] {
    const values: number[] = [];

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const sx = WorldManager.scaledCoord(x, width);
        const sy = WorldManager.scaledCoord(y, height);
        values.push(
          WorldManager.fbm(sx * 0.04 + 91, sy * 0.04 + 37) * 0.65
          + WorldManager.fbm(sx * 0.085 + 17, sy * 0.085 + 53) * 0.35,
        );
      }
    }

    return values;
  }

  private static buildForestField(width: number, height: number): number[] {
    const values: number[] = [];

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const sx = WorldManager.scaledCoord(x, width);
        const sy = WorldManager.scaledCoord(y, height);
        values.push(
          WorldManager.fbm(sx * 0.038 + 211, sy * 0.038 + 67) * 0.6
          + WorldManager.fbm(sx * 0.075 + 43, sy * 0.075 + 19) * 0.4,
        );
      }
    }

    return values;
  }

  private static buildStoneField(width: number, height: number): number[] {
    const values: number[] = [];

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const sx = WorldManager.scaledCoord(x, width);
        const sy = WorldManager.scaledCoord(y, height);
        values.push(
          WorldManager.fbm(sx * 0.035 + 157, sy * 0.035 + 83) * 0.55
          + WorldManager.fbm(sx * 0.08 + 29, sy * 0.08 + 101) * 0.45,
        );
      }
    }

    return values;
  }

  private static buildAridityField(width: number, height: number): number[] {
    const values: number[] = [];

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        values.push(
          WorldManager.fbm(x * 0.05 + 401, y * 0.05 + 233) * 0.6
          + WorldManager.fbm(x * 0.1 + 67, y * 0.1 + 151) * 0.4,
        );
      }
    }

    return values;
  }

  private static isLandTile(terrain: TerrainType): boolean {
    return terrain !== TerrainType.WATER;
  }

  private static isWater(tiles: TerrainType[], x: number, y: number, width: number, height: number): boolean {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return true;
    }

    return tiles[index(x, y, width)] === TerrainType.WATER;
  }

  private static paintLandmass(
    tiles: TerrainType[],
    width: number,
    height: number,
    elevation: number[],
  ): void {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (elevation[index(x, y, width)]! >= LAND_ELEVATION_THRESHOLD) {
          tiles[index(x, y, width)] = TerrainType.GRASS;
        }
      }
    }
  }

  /** Grows land into shallow coastal water for a larger, more connected landmass. */
  private static expandLandmass(
    tiles: TerrainType[],
    width: number,
    height: number,
    elevation: number[],
  ): void {
    for (let pass = 0; pass < 2; pass += 1) {
      const next = [...tiles];

      for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
          const i = index(x, y, width);
          if (tiles[i] !== TerrainType.WATER) {
            continue;
          }

          const elev = elevation[i]!;
          let landNeighbors = 0;

          for (const [nx, ny] of [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]]) {
            if (WorldManager.isLandTile(tiles[index(nx, ny, width)]!)) {
              landNeighbors += 1;
            }
          }

          if (landNeighbors >= 2 && elev >= 0.02) {
            next[i] = TerrainType.GRASS;
          } else if (landNeighbors >= 1 && elev >= 0.1) {
            next[i] = TerrainType.GRASS;
          }
        }
      }

      tiles.splice(0, tiles.length, ...next);
    }
  }

  private static paintMountainRanges(
    tiles: TerrainType[],
    width: number,
    height: number,
    elevation: number[],
    stoneField: number[],
  ): void {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = index(x, y, width);
        if (!WorldManager.isLandTile(tiles[i]!)) {
          continue;
        }

        const edgeDistance = distanceFromMapEdge(x, y, width, height);
        const elev = elevation[i]!;
        const stone = stoneField[i]!;

        const isMountain =
          (edgeDistance < 8 && elev > 0.34 && stone > 0.48)
          || (elev > 0.62 && stone > 0.56)
          || (x < width * 0.18 && stone > 0.54 && elev > 0.4)
          || (x > width * 0.82 && stone > 0.52 && elev > 0.38);

        if (isMountain) {
          tiles[i] = TerrainType.STONE;
        }
      }
    }
  }

  private static growStoneBiomes(
    tiles: TerrainType[],
    width: number,
    height: number,
    stoneField: number[],
    elevation: number[],
  ): void {
    const stone = new Array(width * height).fill(false);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = index(x, y, width);
        if (tiles[i] !== TerrainType.GRASS && tiles[i] !== TerrainType.STONE) {
          continue;
        }

        if (stoneField[i]! > 0.58 && elevation[i]! > 0.42) {
          stone[i] = true;
        }
      }
    }

    for (let pass = 0; pass < 5; pass += 1) {
      const next = [...stone];

      for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
          const i = index(x, y, width);
          if (tiles[i] === TerrainType.WATER || tiles[i] === TerrainType.SAND) {
            continue;
          }

          let neighbors = 0;
          for (const [nx, ny] of [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]]) {
            if (stone[index(nx, ny, width)]) {
              neighbors += 1;
            }
          }

          if (!stone[i] && neighbors >= 3 && stoneField[i]! > 0.5 && elevation[i]! > 0.38) {
            next[i] = true;
          }

          if (stone[i] && neighbors <= 1 && stoneField[i]! < 0.54) {
            next[i] = false;
          }
        }
      }

      stone.splice(0, stone.length, ...next);
    }

    for (let i = 0; i < stone.length; i += 1) {
      if (stone[i] && tiles[i] !== TerrainType.WATER && tiles[i] !== TerrainType.SAND) {
        tiles[i] = TerrainType.STONE;
      }
    }
  }

  private static scatterStoneOutcrops(
    tiles: TerrainType[],
    width: number,
    height: number,
    stoneField: number[],
    elevation: number[],
  ): void {
    for (let y = 2; y < height - 2; y += 1) {
      for (let x = 2; x < width - 2; x += 1) {
        const i = index(x, y, width);
        if (tiles[i] !== TerrainType.GRASS) {
          continue;
        }

        const nearStone = WorldManager.distanceToTerrain(tiles, x, y, width, height, TerrainType.STONE, 4);
        if (nearStone > 3 || nearStone < 1) {
          continue;
        }

        const outcropNoise = WorldManager.fbm(x * 0.2 + 311, y * 0.2 + 97, 3);
        if (stoneField[i]! > 0.46 && elevation[i]! > 0.36 && outcropNoise > 0.62) {
          WorldManager.stampOrganicBlob(
            tiles,
            width,
            height,
            x,
            y,
            3,
            2,
            TerrainType.STONE,
            elevation,
          );
        }
      }
    }
  }

  private static refineStoneFoothills(
    tiles: TerrainType[],
    width: number,
    height: number,
    stoneField: number[],
  ): void {
    const next = [...tiles];

    for (let y = 2; y < height - 2; y += 1) {
      for (let x = 2; x < width - 2; x += 1) {
        const i = index(x, y, width);
        const terrain = tiles[i]!;

        if (terrain === TerrainType.STONE) {
          let softNeighbors = 0;
          for (const [nx, ny] of [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]]) {
            const neighbor = tiles[index(nx, ny, width)]!;
            if (neighbor === TerrainType.GRASS || neighbor === TerrainType.FOREST) {
              softNeighbors += 1;
            }
          }

          if (softNeighbors >= 3 && stoneField[i]! < 0.54) {
            next[i] = TerrainType.GRASS;
          }
        }

        if (terrain === TerrainType.GRASS || terrain === TerrainType.FOREST) {
          let stoneNeighbors = 0;
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              if (tiles[index(x + dx, y + dy, width)] === TerrainType.STONE) {
                stoneNeighbors += 1;
              }
            }
          }

          if (stoneNeighbors >= 5 && stoneField[i]! > 0.57) {
            next[i] = TerrainType.STONE;
          }
        }
      }
    }

    tiles.splice(0, tiles.length, ...next);
  }

  private static distanceToTerrain(
    tiles: TerrainType[],
    x: number,
    y: number,
    width: number,
    height: number,
    terrain: TerrainType,
    maxDistance: number,
  ): number {
    for (let radius = 1; radius <= maxDistance; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
            continue;
          }

          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            continue;
          }

          if (tiles[index(nx, ny, width)] === terrain) {
            return radius;
          }
        }
      }
    }

    return maxDistance + 1;
  }

  private static growForestBiomes(
    tiles: TerrainType[],
    width: number,
    height: number,
    forestField: number[],
    elevation: number[],
  ): void {
    const forest = new Array(width * height).fill(false);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = index(x, y, width);
        if (tiles[i] !== TerrainType.GRASS) {
          continue;
        }

        if (forestField[i]! > 0.56 && elevation[i]! < 0.58) {
          forest[i] = true;
        }
      }
    }

    for (let pass = 0; pass < 6; pass += 1) {
      const next = [...forest];

      for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
          const i = index(x, y, width);
          if (tiles[i] !== TerrainType.GRASS) {
            continue;
          }

          let neighbors = 0;
          for (const [nx, ny] of [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]]) {
            if (forest[index(nx, ny, width)]) {
              neighbors += 1;
            }
          }

          if (!forest[i] && neighbors >= 3 && forestField[i]! > 0.5) {
            next[i] = true;
          }

          if (forest[i] && neighbors <= 1 && forestField[i]! < 0.56) {
            next[i] = false;
          }
        }
      }

      forest.splice(0, forest.length, ...next);
    }

    for (let i = 0; i < forest.length; i += 1) {
      if (forest[i] && tiles[i] === TerrainType.GRASS) {
        tiles[i] = TerrainType.FOREST;
      }
    }
  }

  private static paintDesertBasins(
    tiles: TerrainType[],
    width: number,
    height: number,
    aridity: number[],
    moisture: number[],
    elevation: number[],
  ): void {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = index(x, y, width);
        if (tiles[i] !== TerrainType.GRASS) {
          continue;
        }

        if (aridity[i]! > 0.64 && moisture[i]! < 0.46 && elevation[i]! > 0.34 && elevation[i]! < 0.56) {
          tiles[i] = TerrainType.SAND;
        }
      }
    }

    for (let pass = 0; pass < 2; pass += 1) {
      const next = [...tiles];

      for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
          const i = index(x, y, width);
          if (tiles[i] !== TerrainType.SAND) {
            continue;
          }

          let sandNeighbors = 0;
          for (const [nx, ny] of [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]]) {
            if (tiles[index(nx, ny, width)] === TerrainType.SAND) {
              sandNeighbors += 1;
            }
          }

          if (sandNeighbors >= 2 && aridity[index(x, y, width)]! > 0.58) {
            next[i] = TerrainType.SAND;
          }
        }
      }

      tiles.splice(0, tiles.length, ...next);
    }
  }

  private static paintFarmlandsAndTrails(
    tiles: TerrainType[],
    width: number,
    height: number,
    elevation: number[],
  ): void {
    const hub = {
      x: Math.floor(width * 0.5),
      y: Math.floor(height * 0.5),
    };

    const farmSeeds: Point[] = [
      { x: Math.floor(width * 0.34), y: Math.floor(height * 0.46) },
      { x: Math.floor(width * 0.42), y: Math.floor(height * 0.58) },
      { x: Math.floor(width * 0.58), y: Math.floor(height * 0.44) },
    ];

    for (const seed of farmSeeds) {
      WorldManager.stampOrganicBlob(tiles, width, height, seed.x, seed.y, 7, 5, TerrainType.DIRT, elevation);
    }

    const trailTargets: Point[] = [
      { x: Math.floor(width * 0.22), y: Math.floor(height * 0.28) },
      { x: Math.floor(width * 0.72), y: Math.floor(height * 0.24) },
      { x: Math.floor(width * 0.28), y: Math.floor(height * 0.72) },
      { x: Math.floor(width * 0.7), y: Math.floor(height * 0.68) },
      farmSeeds[0]!,
      farmSeeds[1]!,
    ];

    for (const target of trailTargets) {
      WorldManager.carveMeanderingPath(tiles, width, height, hub, target, elevation, TerrainType.DIRT, 1);
    }
  }

  private static generateFlowingRiverNetwork(
    tiles: TerrainType[],
    width: number,
    height: number,
    elevation: number[],
  ): void {
    const minInlandDistance = OCEAN_BORDER_WIDTH + 14;
    const lakeSeeds: Array<{ x: number; y: number; radiusX: number; radiusY: number }> = [
      { x: Math.floor(width * 0.32), y: Math.floor(height * 0.38), radiusX: 5, radiusY: 4 },
      { x: Math.floor(width * 0.58), y: Math.floor(height * 0.34), radiusX: 6, radiusY: 5 },
      { x: Math.floor(width * 0.44), y: Math.floor(height * 0.62), radiusX: 5, radiusY: 4 },
      { x: Math.floor(width * 0.7), y: Math.floor(height * 0.55), radiusX: 4, radiusY: 4 },
    ];

    for (const lake of lakeSeeds) {
      if (distanceFromMapEdge(lake.x, lake.y, width, height) < minInlandDistance) {
        continue;
      }

      WorldManager.stampOrganicBlob(
        tiles,
        width,
        height,
        lake.x,
        lake.y,
        lake.radiusX,
        lake.radiusY,
        TerrainType.WATER,
        elevation,
        true,
      );
    }

    const riverCount = 3;
    for (let river = 0; river < riverCount; river += 1) {
      const startX = Math.floor(width * (0.22 + WorldManager.hashNoise(river, 3) * 0.56));
      const startY = Math.floor(height * (0.2 + WorldManager.hashNoise(river, 7) * 0.6));
      const i = index(startX, startY, width);

      if (
        distanceFromMapEdge(startX, startY, width, height) < minInlandDistance
        || elevation[i]! < 0.28
        || tiles[i] === TerrainType.WATER
        || tiles[i] === TerrainType.STONE
      ) {
        continue;
      }

      const target = WorldManager.findNearestOceanTarget(startX, startY, width, height);
      WorldManager.carveMeanderingPath(
        tiles,
        width,
        height,
        { x: startX, y: startY },
        target,
        elevation,
        TerrainType.WATER,
        2,
      );
    }
  }

  /** Forces a continuous ocean ring along the map perimeter. */
  private static enforceCoastalOcean(
    tiles: TerrainType[],
    width: number,
    height: number,
  ): void {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (distanceFromMapEdge(x, y, width, height) < OCEAN_BORDER_WIDTH) {
          tiles[index(x, y, width)] = TerrainType.WATER;
        }
      }
    }
  }

  private static findNearestOceanTarget(
    x: number,
    y: number,
    width: number,
    height: number,
  ): Point {
    const candidates: Point[] = [
      { x: 0, y },
      { x: width - 1, y },
      { x, y: 0 },
      { x, y: height - 1 },
    ];

    let best = candidates[0]!;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      const distance = Math.abs(candidate.x - x) + Math.abs(candidate.y - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = candidate;
      }
    }

    return best;
  }

  private static carveMeanderingPath(
    tiles: TerrainType[],
    width: number,
    height: number,
    from: Point,
    to: Point,
    elevation: number[],
    terrain: TerrainType,
    pathWidth: number,
  ): void {
    let x = from.x;
    let y = from.y;
    let guard = width * height * 2;
    let step = 0;

    while ((Math.abs(to.x - x) > 1 || Math.abs(to.y - y) > 1) && guard > 0) {
      guard -= 1;
      step += 1;

      WorldManager.stampDisk(tiles, width, height, x, y, pathWidth, terrain);

      const dx = to.x - x;
      const dy = to.y - y;
      const meanderStrength = terrain === TerrainType.WATER ? 1.4 : 0.8;
      const meander = (WorldManager.hashNoise(step * 7 + from.x, step * 11 + from.y) - 0.5) * meanderStrength;
      const flowBias = (WorldManager.hashNoise(x, y + step) - 0.5) * 0.6;

      const options: Array<{ x: number; y: number; score: number }> = [];
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 1 || ny < 1 || nx >= width - 1 || ny >= height - 1) {
          continue;
        }

        const distance = Math.abs(to.x - nx) + Math.abs(to.y - ny);
        const downhill = elevation[index(nx, ny, width)]! - elevation[index(x, y, width)]!;
        const bend =
          Math.abs(nx - x - Math.sign(dx))
          + Math.abs(ny - y - Math.sign(dy));
        const score = distance + downhill * 3 + bend * meander + flowBias;

        options.push({ x: nx, y: ny, score });
      }

      if (options.length === 0) {
        break;
      }

      options.sort((a, b) => a.score - b.score);
      const next = options[0]!;
      x = next.x;
      y = next.y;
    }

    WorldManager.stampDisk(tiles, width, height, to.x, to.y, pathWidth, terrain);
  }

  private static stampOrganicBlob(
    tiles: TerrainType[],
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number,
    terrain: TerrainType,
    elevation: number[],
    forceTerrain = false,
  ): void {
    for (let y = centerY - radiusY - 2; y <= centerY + radiusY + 2; y += 1) {
      for (let x = centerX - radiusX - 2; x <= centerX + radiusX + 2; x += 1) {
        if (x < 1 || y < 1 || x >= width - 1 || y >= height - 1) {
          continue;
        }

        const dx = (x - centerX) / radiusX;
        const dy = (y - centerY) / radiusY;
        const jitter = WorldManager.hashNoise(x * 3, y * 5) * 0.22;
        if (dx * dx + dy * dy > 1 + jitter) {
          continue;
        }

        const i = index(x, y, width);
        if (terrain === TerrainType.WATER && tiles[i] === TerrainType.STONE) {
          continue;
        }

        if (forceTerrain || terrain === TerrainType.WATER || elevation[i]! < 0.72) {
          tiles[i] = terrain;
        }
      }
    }
  }

  private static stampDisk(
    tiles: TerrainType[],
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    radius: number,
    terrain: TerrainType,
  ): void {
    for (let y = centerY - radius; y <= centerY + radius; y += 1) {
      for (let x = centerX - radius; x <= centerX + radius; x += 1) {
        if (x < 1 || y < 1 || x >= width - 1 || y >= height - 1) {
          continue;
        }

        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const edge = radius + WorldManager.hashNoise(x, y) * 0.45;

        if (dist > edge) {
          continue;
        }

        const i = index(x, y, width);
        if (terrain === TerrainType.WATER || tiles[i] !== TerrainType.STONE) {
          tiles[i] = terrain;
        }
      }
    }
  }

  private static applyBeaches(tiles: TerrainType[], width: number, height: number): void {
    const next = [...tiles];

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = index(x, y, width);
        const terrain = tiles[i];

        if (terrain === TerrainType.WATER || terrain === TerrainType.STONE) {
          continue;
        }

        const waterDistance = WorldManager.distanceToWater(tiles, x, y, width, height, 3);
        if (waterDistance === 1) {
          next[i] = TerrainType.SAND;
          continue;
        }

        if (
          waterDistance === 2
          && WorldManager.hasTerrainNeighbor(tiles, x, y, width, height, TerrainType.SAND)
          && (terrain === TerrainType.GRASS || terrain === TerrainType.SAND)
        ) {
          next[i] = TerrainType.SAND;
        }
      }
    }

    tiles.splice(0, tiles.length, ...next);
  }

  private static hasTerrainNeighbor(
    tiles: TerrainType[],
    x: number,
    y: number,
    width: number,
    height: number,
    terrain: TerrainType,
  ): boolean {
    const neighbors = [
      [x, y - 1],
      [x + 1, y],
      [x, y + 1],
      [x - 1, y],
    ] as const;

    return neighbors.some(([nx, ny]) => {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        return false;
      }

      return tiles[index(nx, ny, width)] === terrain;
    });
  }

  private static cleanupSandTiles(tiles: TerrainType[], width: number, height: number): void {
    WorldManager.removeSandSurroundedByWater(tiles, width, height);
    WorldManager.removeFloatingSandTiles(tiles, width, height);
  }

  private static removeSandSurroundedByWater(
    tiles: TerrainType[],
    width: number,
    height: number,
  ): void {
    let changed = true;

    while (changed) {
      changed = false;
      const next = [...tiles];

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const i = index(x, y, width);
          if (tiles[i] !== TerrainType.SAND) {
            continue;
          }

          let waterNeighbors = 0;
          let landNeighbors = 0;

          for (const [nx, ny] of [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]]) {
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
              waterNeighbors += 1;
              continue;
            }

            const neighbor = tiles[index(nx, ny, width)]!;
            if (neighbor === TerrainType.WATER) {
              waterNeighbors += 1;
            } else if (neighbor !== TerrainType.SAND) {
              landNeighbors += 1;
            }
          }

          if (waterNeighbors >= 3 && landNeighbors === 0) {
            next[i] = TerrainType.WATER;
            changed = true;
          }
        }
      }

      tiles.splice(0, tiles.length, ...next);
    }
  }

  private static removeFloatingSandTiles(
    tiles: TerrainType[],
    width: number,
    height: number,
  ): void {
    const next = [...tiles];

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = index(x, y, width);
        if (tiles[i] !== TerrainType.SAND) {
          continue;
        }

        const sandNeighbors = WorldManager.countTerrainNeighbors(
          tiles,
          x,
          y,
          width,
          height,
          TerrainType.SAND,
        );
        const waterNeighbors = WorldManager.countTerrainNeighbors(
          tiles,
          x,
          y,
          width,
          height,
          TerrainType.WATER,
        );
        const landNeighbors = WorldManager.countLandNeighbors(tiles, x, y, width, height);

        if (sandNeighbors > 0) {
          continue;
        }

        // Only remove sand that is clearly isolated inside water — not inland desert or 1-wide beaches.
        if (waterNeighbors >= 2 && landNeighbors === 0) {
          next[i] = TerrainType.WATER;
        }
      }
    }

    tiles.splice(0, tiles.length, ...next);
  }

  private static countLandNeighbors(
    tiles: TerrainType[],
    x: number,
    y: number,
    width: number,
    height: number,
  ): number {
    let count = 0;

    for (const [nx, ny] of [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        continue;
      }

      const neighbor = tiles[index(nx, ny, width)]!;
      if (neighbor !== TerrainType.WATER && neighbor !== TerrainType.SAND) {
        count += 1;
      }
    }

    return count;
  }

  private static countTerrainNeighbors(
    tiles: TerrainType[],
    x: number,
    y: number,
    width: number,
    height: number,
    terrain: TerrainType,
  ): number {
    let count = 0;

    for (const [nx, ny] of [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        continue;
      }

      if (tiles[index(nx, ny, width)] === terrain) {
        count += 1;
      }
    }

    return count;
  }

  private static distanceToWater(
    tiles: TerrainType[],
    x: number,
    y: number,
    width: number,
    height: number,
    maxDistance: number,
  ): number {
    for (let radius = 1; radius <= maxDistance; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
            continue;
          }

          if (WorldManager.isWater(tiles, x + dx, y + dy, width, height)) {
            return radius;
          }
        }
      }
    }

    return maxDistance + 1;
  }

  private static softenBiomeEdges(tiles: TerrainType[], width: number, height: number): void {
    for (let pass = 0; pass < 2; pass += 1) {
      const next = [...tiles];

      for (let y = 2; y < height - 2; y += 1) {
        for (let x = 2; x < width - 2; x += 1) {
          const i = index(x, y, width);
          const terrain = tiles[i];

          if (terrain === TerrainType.WATER || terrain === TerrainType.SAND) {
            continue;
          }

          const counts = new Map<TerrainType, number>();
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              const neighbor = tiles[index(x + dx, y + dy, width)]!;
              if (neighbor === TerrainType.WATER || neighbor === TerrainType.SAND) {
                continue;
              }

              counts.set(neighbor, (counts.get(neighbor) ?? 0) + 1);
            }
          }

          let dominant: TerrainType = terrain;
          let dominantCount = 0;
          counts.forEach((count, type) => {
            if (count > dominantCount) {
              dominant = type;
              dominantCount = count;
            }
          });

          if (dominantCount >= 5 && dominant !== terrain) {
            next[i] = dominant;
          }
        }
      }

      tiles.splice(0, tiles.length, ...next);
    }
  }
}
