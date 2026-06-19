import { WorldBiome } from '@shared/biomeConfig';
import { TerrainType } from '@shared/types';
import { LayerTileContext } from './layerTileContext';
import { getTerrainRenderLayer, isOverlayTerrain } from './terrainLayerRules';

export const CLIFF_ELEVATION_THRESHOLD = 0.055;

export function getTileTerrain(
  context: LayerTileContext,
  x: number,
  y: number,
): TerrainType | null {
  if (x < 0 || y < 0 || x >= context.width || y >= context.height) {
    return null;
  }

  return context.tiles[y * context.width + x] ?? null;
}

export function getTileElevation(context: LayerTileContext, x: number, y: number): number {
  if (!context.elevations || x < 0 || y < 0 || x >= context.width || y >= context.height) {
    return 0;
  }

  return context.elevations[y * context.width + x] ?? 0;
}

export function getTileBiome(context: LayerTileContext, x: number, y: number): WorldBiome | null {
  if (!context.biomes || x < 0 || y < 0 || x >= context.width || y >= context.height) {
    return null;
  }

  return context.biomes[y * context.width + x] ?? null;
}

export function biomeToBaseTerrain(biome: WorldBiome | null): TerrainType {
  switch (biome) {
    case WorldBiome.DESERT:
      return TerrainType.SAND;
    case WorldBiome.CEMETERY:
      return TerrainType.STONE;
    case WorldBiome.FAIRY_FOREST:
    case WorldBiome.STANDARD:
    default:
      return TerrainType.SAND;
  }
}

export function terrainToUnderfillBase(terrain: TerrainType): TerrainType | null {
  switch (terrain) {
    case TerrainType.WATER:
      return TerrainType.SAND;
    case TerrainType.SAND:
    case TerrainType.STONE:
      return terrain;
    default:
      return null;
  }
}

export function hasLowerElevationNeighbor(context: LayerTileContext): boolean {
  if (!context.elevations) {
    return false;
  }

  const elevation = getTileElevation(context, context.x, context.y);
  const neighbors = [
    [context.x, context.y - 1],
    [context.x + 1, context.y],
    [context.x, context.y + 1],
    [context.x - 1, context.y],
  ] as const;

  return neighbors.some(([x, y]) => {
    const neighborElevation = getTileElevation(context, x, y);
    return elevation > neighborElevation + CLIFF_ELEVATION_THRESHOLD;
  });
}

export function exposesCliffToNeighbor(
  context: LayerTileContext,
  renderLayerDepth: number,
  neighborX: number,
  neighborY: number,
): boolean {
  const neighbor = getTileTerrain(context, neighborX, neighborY);
  if (!neighbor) {
    return false;
  }

  const neighborLayer = getTerrainRenderLayer(neighbor);
  if (neighborLayer < renderLayerDepth) {
    return true;
  }

  if (!context.elevations || renderLayerDepth < 20 || !isOverlayTerrain(context.terrain)) {
    return false;
  }

  const elevation = getTileElevation(context, context.x, context.y);
  const neighborElevation = getTileElevation(context, neighborX, neighborY);
  return elevation > neighborElevation + CLIFF_ELEVATION_THRESHOLD;
}

export function collectCliffUnderfillBases(context: LayerTileContext): Set<TerrainType> {
  const bases = new Set<TerrainType>();
  const neighbors = [
    [context.x, context.y - 1],
    [context.x + 1, context.y],
    [context.x, context.y + 1],
    [context.x - 1, context.y],
  ] as const;

  for (const [nx, ny] of neighbors) {
    const neighbor = getTileTerrain(context, nx, ny);
    if (!neighbor) {
      continue;
    }

    const directBase = terrainToUnderfillBase(neighbor);
    if (directBase && getTerrainRenderLayer(neighbor) < getTerrainRenderLayer(context.terrain)) {
      bases.add(directBase);
      continue;
    }

    if (isOverlayTerrain(context.terrain) && neighbor === TerrainType.SAND) {
      bases.add(TerrainType.SAND);
    }

    if (isOverlayTerrain(context.terrain) && neighbor === TerrainType.STONE) {
      bases.add(TerrainType.STONE);
    }

    if (context.elevations) {
      const elevation = getTileElevation(context, context.x, context.y);
      const neighborElevation = getTileElevation(context, nx, ny);
      if (elevation > neighborElevation + CLIFF_ELEVATION_THRESHOLD) {
        const inferred = terrainToUnderfillBase(neighbor)
          ?? biomeToBaseTerrain(getTileBiome(context, nx, ny));
        bases.add(inferred);
      }
    }
  }

  return bases;
}

export function shouldRenderCliffUnderfill(
  context: LayerTileContext,
  layerDepth: number,
  baseTerrain: TerrainType,
): boolean {
  const baseLayer = getTerrainRenderLayer(baseTerrain);
  if (layerDepth !== baseLayer) {
    return false;
  }

  if (context.terrain === baseTerrain) {
    return true;
  }

  if (!isOverlayTerrain(context.terrain)) {
    return false;
  }

  return collectCliffUnderfillBases(context).has(baseTerrain);
}
