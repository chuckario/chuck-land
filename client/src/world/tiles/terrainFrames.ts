/**
 * Terrain fill tiles and transition-set origins on Floors_Tiles.png (25 columns × 16px).
 *
 * Transition topology per biome (see terrainAutotileAtlas.ts):
 *   cliff-frame  — rows 0-2: inner corners + edges, row 3: outer corners
 *   terrain-patch — sand/snow islands with center fill + outer ring
 */
export const FLOOR_TILESET_COLUMNS = 25;

/** 4x4 blob-grid index from 4-bit connectivity mask (legacy fallback). */
export const BLOB_TILE_OFFSETS = [
  6, 7, 4, 5,
  2, 3, 1, 0,
  8, 9, 10, 11,
  12, 13, 14, 15,
] as const;

export const GRASS_FILL_FRAMES = [126, 127, 251, 252] as const;
export const FOREST_FILL_FRAMES = [126, 127, 251, 252] as const;
export const DIRT_FILL_FRAMES = [261, 262] as const;
export const STONE_FILL_FRAMES = [257, 258] as const;
export const SAND_FILL_FRAMES = [184, 185] as const;

/** @deprecated Use TRANSITION_ATLASES in terrainAutotileAtlas.ts */
export const GRASS_LOWER_TRANSITION_ORIGIN = 25;
/** @deprecated Use TRANSITION_ATLASES in terrainAutotileAtlas.ts */
export const GRASS_OVERLAY_TRANSITION_ORIGIN = 150;
/** @deprecated Use TRANSITION_ATLASES in terrainAutotileAtlas.ts */
export const FOREST_LOWER_TRANSITION_ORIGIN = 25;
/** @deprecated Use TRANSITION_ATLASES in terrainAutotileAtlas.ts */
export const FOREST_OVERLAY_TRANSITION_ORIGIN = 150;
/** @deprecated Use TRANSITION_ATLASES in terrainAutotileAtlas.ts */
export const DIRT_LOWER_TRANSITION_ORIGIN = 136;
/** @deprecated Use TRANSITION_ATLASES in terrainAutotileAtlas.ts */
export const DIRT_OVERLAY_TRANSITION_ORIGIN = 211;
/** @deprecated Use TRANSITION_ATLASES in terrainAutotileAtlas.ts */
export const STONE_LOWER_TRANSITION_ORIGIN = 132;
/** @deprecated Use TRANSITION_ATLASES in terrainAutotileAtlas.ts */
export const STONE_OVERLAY_TRANSITION_ORIGIN = 207;
/** @deprecated Use TRANSITION_ATLASES in terrainAutotileAtlas.ts */
export const SAND_WATER_TRANSITION_ORIGIN = 276;
/** @deprecated Use TRANSITION_ATLASES in terrainAutotileAtlas.ts */
export const SAND_GRASS_TRANSITION_ORIGIN = 301;

export const WATER_FRAMES = [151, 152, 153, 176, 177, 178] as const;
