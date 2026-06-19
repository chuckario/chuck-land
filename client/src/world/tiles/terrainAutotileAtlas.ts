import {
  AutotileLayoutMode,
  BlobTileRole,
  blobGridIndexToFrame,
  LEGACY_BLOB_GRID_INDEX,
} from '@shared/blobAutotile';

/** Floors_Tiles.png is 400x416 with 16px cells -> 25 columns. */
export const FLOOR_TILESET_COLUMNS = 25;

export interface TransitionAtlas {
  id: string;
  origin: number;
  layout: AutotileLayoutMode;
  sheetColumns: number;
  /** Explicit frame index per semantic tile role. */
  roleFrames: Partial<Record<BlobTileRole, number>>;
  /** Optional direct 4-bit mask overrides (connectivity mask 0..15). */
  maskFrames?: Partial<Record<number, number>>;
  emptyFrames?: ReadonlySet<number>;
}

function frameAt(
  origin: number,
  blobCol: number,
  blobRow: number,
  sheetColumns = FLOOR_TILESET_COLUMNS,
): number {
  return origin + blobCol + blobRow * sheetColumns;
}

const GLOBAL_EMPTY_FRAMES = new Set([
  27, 51, 52, 53, 77, 100, 125, 129, 130, 152, 157, 176, 177, 178, 202,
]);

/**
 * Grass / forest cliff over sand, water or stone.
 * Top 3x3 (rows 0-2): concave inner corners + cardinal edges.
 * Bottom row (row 3): convex outer corners.
 */
function createCliffFrameAtlas(id: string, origin: number): TransitionAtlas {
  return {
    id,
    origin,
    layout: 'cliff-frame',
    sheetColumns: FLOOR_TILESET_COLUMNS,
    roleFrames: {
      'inner-ne': frameAt(origin, 1, 2),
      'inner-nw': frameAt(origin, 3, 2),
      'inner-se': frameAt(origin, 3, 0),
      'inner-sw': frameAt(origin, 0, 2),
      'edge-n': frameAt(origin, 1, 0),
      'edge-s': frameAt(origin, 1, 2),
      'edge-w': frameAt(origin, 0, 1),
      'edge-e': frameAt(origin, 3, 2),
      'outer-nw': frameAt(origin, 1, 3),
      'outer-ne': frameAt(origin, 2, 3),
      'outer-se': frameAt(origin, 3, 3),
      'outer-sw': frameAt(origin, 0, 2),
      'isolated': frameAt(origin, 0, 0),
      'edge-vertical': frameAt(origin, 1, 0),
      'edge-horizontal': frameAt(origin, 0, 1),
    },
    emptyFrames: GLOBAL_EMPTY_FRAMES,
  };
}

/** Stone cliff — same topology, different sheet region. */
const STONE_CLIFF_ATLAS: TransitionAtlas = {
  id: 'stone-cliff',
  origin: 132,
  layout: 'cliff-frame',
  sheetColumns: FLOOR_TILESET_COLUMNS,
  roleFrames: {
    'inner-nw': frameAt(132, 2, 1),
    'edge-n': frameAt(132, 1, 0),
    'inner-ne': frameAt(132, 3, 1),
    'edge-w': frameAt(132, 0, 0),
    'inner-sw': frameAt(132, 0, 2),
    'edge-s': frameAt(132, 2, 2),
    'inner-se': frameAt(132, 3, 2),
    'edge-e': frameAt(132, 3, 2),
    'outer-nw': frameAt(132, 1, 3),
    'outer-ne': frameAt(132, 2, 3),
    'outer-se': frameAt(132, 3, 3),
    'outer-sw': frameAt(132, 0, 3),
    'isolated': frameAt(132, 3, 3),
    'edge-vertical': frameAt(132, 1, 0),
    'edge-horizontal': frameAt(132, 0, 0),
  },
  emptyFrames: GLOBAL_EMPTY_FRAMES,
};

/** Dirt cliff set. */
const DIRT_CLIFF_ATLAS: TransitionAtlas = {
  id: 'dirt-cliff',
  origin: 136,
  layout: 'cliff-frame',
  sheetColumns: FLOOR_TILESET_COLUMNS,
  roleFrames: {
    'inner-nw': frameAt(136, 3, 0),
    'edge-n': frameAt(136, 1, 0),
    'inner-ne': frameAt(136, 2, 0),
    'edge-w': frameAt(136, 0, 1),
    'inner-sw': frameAt(136, 0, 3),
    'edge-s': frameAt(136, 2, 3),
    'inner-se': frameAt(136, 3, 3),
    'edge-e': frameAt(136, 3, 1),
    'outer-nw': frameAt(136, 0, 3),
    'outer-ne': frameAt(136, 2, 3),
    'outer-se': frameAt(136, 3, 3),
    'outer-sw': frameAt(136, 1, 3),
    'isolated': frameAt(136, 3, 3),
    'edge-vertical': frameAt(136, 1, 0),
    'edge-horizontal': frameAt(136, 0, 1),
  },
  emptyFrames: GLOBAL_EMPTY_FRAMES,
};

/**
 * Sand meeting water — island / patch layout.
 * Row 0: N edges, row 1: W/E + inner corners, row 2-3: outer ring & fills.
 */
const SAND_WATER_PATCH_ATLAS: TransitionAtlas = {
  id: 'sand-water-patch',
  origin: 276,
  layout: 'terrain-patch',
  sheetColumns: FLOOR_TILESET_COLUMNS,
  roleFrames: {
    'edge-n': frameAt(276, 1, 0),
    'edge-e': frameAt(276, 2, 0),
    'edge-s': frameAt(276, 1, 2),
    'edge-w': frameAt(276, 0, 1),
    'inner-nw': frameAt(276, 0, 1),
    'inner-ne': frameAt(276, 2, 1),
    'inner-sw': frameAt(276, 0, 2),
    'inner-se': frameAt(276, 2, 2),
    'outer-nw': frameAt(276, 0, 3),
    'outer-ne': frameAt(276, 2, 3),
    'outer-se': frameAt(276, 3, 3),
    'outer-sw': frameAt(276, 1, 3),
    'isolated': frameAt(276, 1, 1),
    'edge-vertical': frameAt(276, 1, 0),
    'edge-horizontal': frameAt(276, 0, 1),
    fill: frameAt(276, 1, 1),
  },
  emptyFrames: GLOBAL_EMPTY_FRAMES,
};

/** Sand meeting grass overlay — patch with stronger convex corners on row 3. */
const SAND_GRASS_PATCH_ATLAS: TransitionAtlas = {
  id: 'sand-grass-patch',
  origin: 301,
  layout: 'terrain-patch',
  sheetColumns: FLOOR_TILESET_COLUMNS,
  roleFrames: {
    'edge-n': frameAt(301, 1, 0),
    'edge-e': frameAt(301, 2, 0),
    'edge-s': frameAt(301, 1, 3),
    'edge-w': frameAt(301, 0, 1),
    'inner-nw': frameAt(301, 0, 0),
    'inner-ne': frameAt(301, 2, 0),
    'inner-sw': frameAt(301, 0, 3),
    'inner-se': frameAt(301, 3, 3),
    'outer-nw': frameAt(301, 1, 3),
    'outer-ne': frameAt(301, 2, 3),
    'outer-se': frameAt(301, 3, 3),
    'outer-sw': frameAt(301, 0, 2),
    'isolated': frameAt(301, 3, 3),
    'edge-vertical': frameAt(301, 1, 0),
    'edge-horizontal': frameAt(301, 0, 1),
    fill: frameAt(301, 2, 2),
  },
  emptyFrames: GLOBAL_EMPTY_FRAMES,
};

const GRASS_CLIFF_ATLAS = createCliffFrameAtlas('grass-cliff', 25);
const GRASS_OVERLAY_CLIFF_ATLAS = createCliffFrameAtlas('grass-overlay-cliff', 150);
const FOREST_CLIFF_ATLAS = createCliffFrameAtlas('forest-cliff', 25);
const FOREST_OVERLAY_CLIFF_ATLAS = createCliffFrameAtlas('forest-overlay-cliff', 150);

export const TRANSITION_ATLASES = {
  grassLower: GRASS_CLIFF_ATLAS,
  grassOverlay: GRASS_OVERLAY_CLIFF_ATLAS,
  forestLower: FOREST_CLIFF_ATLAS,
  forestOverlay: FOREST_OVERLAY_CLIFF_ATLAS,
  stoneLower: STONE_CLIFF_ATLAS,
  stoneOverlay: { ...STONE_CLIFF_ATLAS, id: 'stone-overlay', origin: 207 },
  dirtLower: DIRT_CLIFF_ATLAS,
  dirtOverlay: { ...DIRT_CLIFF_ATLAS, id: 'dirt-overlay', origin: 211 },
  sandWater: SAND_WATER_PATCH_ATLAS,
  sandGrass: SAND_GRASS_PATCH_ATLAS,
} as const;

export function isEmptyAtlasFrame(atlas: TransitionAtlas, frame: number): boolean {
  return atlas.emptyFrames?.has(frame) ?? GLOBAL_EMPTY_FRAMES.has(frame);
}

export function pickAtlasFrame(
  atlas: TransitionAtlas,
  role: BlobTileRole,
  connectivityMask: number,
): number | null {
  const roleFrame = atlas.roleFrames[role];
  if (roleFrame !== undefined && !isEmptyAtlasFrame(atlas, roleFrame)) {
    return roleFrame;
  }

  const maskFrame = atlas.maskFrames?.[connectivityMask];
  if (maskFrame !== undefined && !isEmptyAtlasFrame(atlas, maskFrame)) {
    return maskFrame;
  }

  const legacyIndex = LEGACY_BLOB_GRID_INDEX[connectivityMask];
  if (legacyIndex === undefined) {
    return null;
  }

  const legacyFrame = blobGridIndexToFrame(atlas.origin, legacyIndex, atlas.sheetColumns);
  if (isEmptyAtlasFrame(atlas, legacyFrame)) {
    return null;
  }

  return legacyFrame;
}
