import { TerrainType } from '@shared/types';
import { LayerTileContext } from './layerTileContext';
import { shouldRenderCliffUnderfill } from './cliffRendering';
import { pickLayerTileFrame, pickOverlayCliffBaseFrame } from './terrainAutotile';
import { isOverlayTerrain } from './terrainLayerRules';

export type { LayerTileContext } from './layerTileContext';

const WATER_LAYER_DEPTH = 0;
const SAND_LAYER_DEPTH = 10;
const STONE_LAYER_DEPTH = 15;
const SURFACE_LAYER_DEPTH = 20;

export function isSurfaceTerrain(terrain: TerrainType): boolean {
  return isOverlayTerrain(terrain);
}

export function resolveWaterLayerTile(context: LayerTileContext): number | null {
  return pickLayerTileFrame(WATER_LAYER_DEPTH, context);
}

export function resolveSandLayerTile(context: LayerTileContext): number | null {
  if (context.terrain === TerrainType.SAND) {
    return pickLayerTileFrame(SAND_LAYER_DEPTH, context, TerrainType.SAND);
  }

  if (shouldRenderCliffUnderfill(context, SAND_LAYER_DEPTH, TerrainType.SAND)) {
    return pickOverlayCliffBaseFrame(TerrainType.SAND, context);
  }

  return null;
}

export function resolveStoneLayerTile(context: LayerTileContext): number | null {
  if (context.terrain === TerrainType.STONE) {
    return pickLayerTileFrame(STONE_LAYER_DEPTH, context, TerrainType.STONE);
  }

  if (shouldRenderCliffUnderfill(context, STONE_LAYER_DEPTH, TerrainType.STONE)) {
    return pickOverlayCliffBaseFrame(TerrainType.STONE, context);
  }

  return null;
}

export function resolveSurfaceLayerTile(context: LayerTileContext): number | null {
  if (!isOverlayTerrain(context.terrain)) {
    return null;
  }

  return pickLayerTileFrame(SURFACE_LAYER_DEPTH, context);
}
