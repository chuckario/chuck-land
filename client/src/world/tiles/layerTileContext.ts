import { TerrainType } from '@shared/types';
import type { WorldBiome } from '@shared/biomeConfig';

export interface LayerTileContext {
  x: number;
  y: number;
  terrain: TerrainType;
  tiles: TerrainType[];
  width: number;
  height: number;
  elevations?: number[];
  biomes?: WorldBiome[];
}
