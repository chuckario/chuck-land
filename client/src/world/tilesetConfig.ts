import { TerrainType } from '@shared/types';
import { tileHash } from '@shared/worldNoise';
import {
  DIRT_FILL_FRAMES,
  FOREST_FILL_FRAMES,
  GRASS_FILL_FRAMES,
  SAND_FILL_FRAMES,
  STONE_FILL_FRAMES,
  WATER_FRAMES,
} from './tiles/terrainFrames';
import { getRenderTextureKey } from './tilesetRegistry';

export const WATER_ANIM_FRAMES = [...WATER_FRAMES];
export const WATER_ANIM_KEY = 'env-water';
export const WATER_STATIC_FRAME = WATER_ANIM_FRAMES[0];

export interface TerrainTileVisual {
  type: TerrainType;
  textureKey: string;
  frames: number[];
  label: string;
}

export const TERRAIN_TILE_VISUALS: Record<TerrainType, TerrainTileVisual> = {
  [TerrainType.GRASS]: {
    type: TerrainType.GRASS,
    textureKey: getRenderTextureKey('floors'),
    frames: [...GRASS_FILL_FRAMES],
    label: 'Gras',
  },
  [TerrainType.FOREST]: {
    type: TerrainType.FOREST,
    textureKey: getRenderTextureKey('floors'),
    frames: [...FOREST_FILL_FRAMES],
    label: 'Wald',
  },
  [TerrainType.DIRT]: {
    type: TerrainType.DIRT,
    textureKey: getRenderTextureKey('floors'),
    frames: [...DIRT_FILL_FRAMES],
    label: 'Erde',
  },
  [TerrainType.STONE]: {
    type: TerrainType.STONE,
    textureKey: getRenderTextureKey('floors'),
    frames: [...STONE_FILL_FRAMES],
    label: 'Stein',
  },
  [TerrainType.SAND]: {
    type: TerrainType.SAND,
    textureKey: getRenderTextureKey('floors'),
    frames: [...SAND_FILL_FRAMES],
    label: 'Sand',
  },
  [TerrainType.WATER]: {
    type: TerrainType.WATER,
    textureKey: getRenderTextureKey('water'),
    frames: WATER_ANIM_FRAMES,
    label: 'Wasser',
  },
};

export const TERRAIN_LEGEND_ORDER: TerrainType[] = [
  TerrainType.GRASS,
  TerrainType.WATER,
  TerrainType.SAND,
  TerrainType.STONE,
  TerrainType.FOREST,
  TerrainType.DIRT,
];

export function getTerrainTileVisual(terrain: TerrainType): TerrainTileVisual {
  return TERRAIN_TILE_VISUALS[terrain];
}

export function pickTerrainFrame(terrain: TerrainType, x: number, y: number): number {
  const visual = getTerrainTileVisual(terrain);
  const index = Math.abs(tileHash(x, y)) % visual.frames.length;
  return visual.frames[index]!;
}
