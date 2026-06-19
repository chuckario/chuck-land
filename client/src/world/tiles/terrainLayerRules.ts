import { TerrainType } from '@shared/types';

/** Render depth used by WORLD_RENDER_LAYERS — higher draws on top. */
export const TERRAIN_RENDER_LAYER: Record<TerrainType, number> = {
  [TerrainType.WATER]: 0,
  [TerrainType.SAND]: 10,
  [TerrainType.STONE]: 15,
  [TerrainType.GRASS]: 20,
  [TerrainType.FOREST]: 20,
  [TerrainType.DIRT]: 20,
};

const OVERLAY_TERRAINS = new Set<TerrainType>([
  TerrainType.GRASS,
  TerrainType.FOREST,
  TerrainType.DIRT,
]);

export function getTerrainRenderLayer(terrain: TerrainType): number {
  return TERRAIN_RENDER_LAYER[terrain];
}

export function isOverlayTerrain(terrain: TerrainType): boolean {
  return OVERLAY_TERRAINS.has(terrain);
}

export function neighborExposesLowerLayer(
  cellTerrain: TerrainType,
  renderLayerDepth: number,
  neighborTerrain: TerrainType,
): boolean {
  const neighborLayer = getTerrainRenderLayer(neighborTerrain);

  if (neighborLayer < renderLayerDepth) {
    return true;
  }

  if (renderLayerDepth >= 20 && isOverlayTerrain(cellTerrain)) {
    return neighborLayer < 20;
  }

  return false;
}

export function getAutotileTerrainForLayer(
  cellTerrain: TerrainType,
  renderLayerDepth: number,
): TerrainType | null {
  switch (renderLayerDepth) {
    case 0:
      return cellTerrain === TerrainType.WATER ? TerrainType.WATER : null;
    case 10:
      return cellTerrain === TerrainType.SAND ? TerrainType.SAND : null;
    case 15:
      return cellTerrain === TerrainType.STONE ? TerrainType.STONE : null;
    case 20:
      return isOverlayTerrain(cellTerrain) ? cellTerrain : null;
    default:
      return null;
  }
}
