import {
  LayerTileContext,
  resolveSandLayerTile,
  resolveStoneLayerTile,
  resolveSurfaceLayerTile,
  resolveWaterLayerTile,
} from './layerTileResolver';

export type WorldRenderLayerId = 'water' | 'sand' | 'stone' | 'surface' | (string & {});

export interface WorldRenderLayerDefinition {
  id: WorldRenderLayerId;
  depth: number;
  tilesetId: string;
  animated?: boolean;
  animationKey?: string;
  resolveFrame: (context: LayerTileContext) => number | null;
}

export const WORLD_RENDER_LAYERS: WorldRenderLayerDefinition[] = [
  {
    id: 'water',
    depth: 0,
    tilesetId: 'water',
    animated: true,
    animationKey: 'env-water',
    resolveFrame: resolveWaterLayerTile,
  },
  {
    id: 'sand',
    depth: 10,
    tilesetId: 'floors',
    resolveFrame: resolveSandLayerTile,
  },
  {
    id: 'stone',
    depth: 15,
    tilesetId: 'floors',
    resolveFrame: resolveStoneLayerTile,
  },
  {
    id: 'surface',
    depth: 20,
    tilesetId: 'floors',
    resolveFrame: resolveSurfaceLayerTile,
  },
];

export function getWorldRenderLayer(id: WorldRenderLayerId): WorldRenderLayerDefinition | undefined {
  return WORLD_RENDER_LAYERS.find((layer) => layer.id === id);
}
