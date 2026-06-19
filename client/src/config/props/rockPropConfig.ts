import { TerrainType } from '@shared/types';
import { PROP_KEYS } from '../../world/EnvironmentLoader';
import { getPropRenderTextureKey } from '../../world/propSpritesheetRegistry';

export type RockPalette = 'grey' | 'brown' | 'dark';

export interface RockPropSelection {
  textureKey: string;
  frame: number;
  displayScale: number;
  originY: number;
  yOffsetFactor: number;
}

const ROCK_FRAMES: Record<RockPalette, Record<'boulder' | 'medium' | 'small' | 'pebble', number[]>> = {
  grey: {
    boulder: [39, 40, 41],
    medium: [42, 43, 44, 45],
    small: [46, 47, 48],
    pebble: [49, 50, 51, 52],
  },
  brown: {
    boulder: [0, 1, 2],
    medium: [16, 17, 18, 19],
    small: [20, 21, 22],
    pebble: [23, 24, 25, 26],
  },
  dark: {
    boulder: [32, 33],
    medium: [34, 35, 36, 37],
    small: [38, 39],
    pebble: [40, 41, 42],
  },
};

const ROCK_TEXTURE_KEY = getPropRenderTextureKey(PROP_KEYS.rocks);

export function pickRockPalette(
  terrain: TerrainType | null,
  borderTerrains: TerrainType[],
): RockPalette {
  if (terrain === TerrainType.SAND || borderTerrains.includes(TerrainType.SAND)) {
    return 'brown';
  }

  if (terrain === TerrainType.DIRT || borderTerrains.includes(TerrainType.DIRT)) {
    return 'dark';
  }

  return 'grey';
}

export function pickRockProp(
  variant: number,
  terrain: TerrainType | null,
  borderTerrains: TerrainType[],
  isBorderTile: boolean,
): RockPropSelection {
  const palette = pickRockPalette(terrain, borderTerrains);
  const sizeRoll = Math.abs(variant) % 100;

  let tier: keyof typeof ROCK_FRAMES.grey;
  let displayScale: number;
  let originY: number;
  let yOffsetFactor: number;

  if (isBorderTile) {
    tier = sizeRoll > 55 ? 'medium' : 'small';
    displayScale = tier === 'medium' ? 1.15 : 0.95;
    originY = 0.88;
    yOffsetFactor = 0.02;
  } else if (sizeRoll > 82) {
    tier = 'boulder';
    displayScale = 1.85;
    originY = 0.92;
    yOffsetFactor = -0.04;
  } else if (sizeRoll > 48) {
    tier = 'medium';
    displayScale = 1.35;
    originY = 0.9;
    yOffsetFactor = 0;
  } else if (sizeRoll > 18) {
    tier = 'small';
    displayScale = 1.05;
    originY = 0.86;
    yOffsetFactor = 0.03;
  } else {
    tier = 'pebble';
    displayScale = 0.75;
    originY = 0.8;
    yOffsetFactor = 0.05;
  }

  const frames = ROCK_FRAMES[palette][tier];
  const frame = frames[Math.abs(variant) % frames.length]!;

  return {
    textureKey: ROCK_TEXTURE_KEY,
    frame,
    displayScale,
    originY,
    yOffsetFactor,
  };
}

export function pickIronOreProp(variant: number): RockPropSelection {
  const crystalFrames = [57, 58, 59, 60];
  const frame = crystalFrames[Math.abs(variant) % crystalFrames.length]!;

  return {
    textureKey: ROCK_TEXTURE_KEY,
    frame,
    displayScale: 1.25,
    originY: 0.88,
    yOffsetFactor: 0.01,
  };
}
