/**
 * Cardinal connectivity bitmask for blob / Wang-style autotiling.
 *
 * Bit is set when the matching cardinal neighbor belongs to the same terrain mass.
 *   N = 1, E = 2, S = 4, W = 8
 */
export const CARDINAL_N = 1;
export const CARDINAL_E = 2;
export const CARDINAL_S = 4;
export const CARDINAL_W = 8;
export const CARDINAL_ALL = CARDINAL_N | CARDINAL_E | CARDINAL_S | CARDINAL_W;

export type BlobTileRole =
  | 'fill'
  | 'isolated'
  | 'edge-n'
  | 'edge-e'
  | 'edge-s'
  | 'edge-w'
  | 'edge-vertical'
  | 'edge-horizontal'
  | 'outer-ne'
  | 'outer-nw'
  | 'outer-se'
  | 'outer-sw'
  | 'inner-ne'
  | 'inner-nw'
  | 'inner-se'
  | 'inner-sw';

export type AutotileLayoutMode =
  /** Grass / stone / dirt cliffs — terrain frames a lower layer (concave + convex sets). */
  | 'cliff-frame'
  /** Sand / snow patches — terrain sits as an island on a lower layer. */
  | 'terrain-patch';

export interface CardinalNeighbors {
  n: boolean;
  e: boolean;
  s: boolean;
  w: boolean;
}

export interface DiagonalNeighbors {
  ne: boolean;
  se: boolean;
  sw: boolean;
  nw: boolean;
}

export function cardinalMask(neighbors: CardinalNeighbors): number {
  let mask = 0;
  if (neighbors.n) mask |= CARDINAL_N;
  if (neighbors.e) mask |= CARDINAL_E;
  if (neighbors.s) mask |= CARDINAL_S;
  if (neighbors.w) mask |= CARDINAL_W;
  return mask;
}

export function resolveBlobTileRole(
  cardinals: CardinalNeighbors,
  diagonals: DiagonalNeighbors,
): BlobTileRole {
  const { n, e, s, w } = cardinals;
  const { ne, se, sw, nw } = diagonals;
  const count = Number(n) + Number(e) + Number(s) + Number(w);

  if (count === 4) {
    if (!ne) return 'inner-ne';
    if (!se) return 'inner-se';
    if (!sw) return 'inner-sw';
    if (!nw) return 'inner-nw';
    return 'fill';
  }

  if (count === 0) {
    return 'isolated';
  }

  if (count === 1) {
    if (n) return 'edge-n';
    if (e) return 'edge-e';
    if (s) return 'edge-s';
    return 'edge-w';
  }

  if (count === 2) {
    if (n && s) return 'edge-vertical';
    if (e && w) return 'edge-horizontal';
    if (n && e) return 'outer-se';
    if (e && s) return 'outer-ne';
    if (s && w) return 'outer-nw';
    if (n && w) return 'outer-sw';
  }

  if (count === 3) {
    if (!n) return 'edge-n';
    if (!e) return 'edge-e';
    if (!s) return 'edge-s';
    return 'edge-w';
  }

  return 'isolated';
}

export function resolvePatchTileRole(
  cardinals: CardinalNeighbors,
  diagonals: DiagonalNeighbors,
): BlobTileRole {
  const role = resolveBlobTileRole(cardinals, diagonals);
  if (role === 'fill') {
    return 'fill';
  }

  // Patch sheets store convex outer corners on the second 3x3 ring — same role names apply.
  return role;
}

export function resolveAutotileRole(
  layout: AutotileLayoutMode,
  cardinals: CardinalNeighbors,
  diagonals: DiagonalNeighbors,
): BlobTileRole {
  if (layout === 'terrain-patch') {
    return resolvePatchTileRole(cardinals, diagonals);
  }

  return resolveBlobTileRole(cardinals, diagonals);
}

/** Convert a 4x4 blob-grid index (0..15) to an absolute spritesheet frame index. */
export function blobGridIndexToFrame(
  origin: number,
  blobIndex: number,
  sheetColumns: number,
): number {
  const col = blobIndex % 4;
  const row = Math.floor(blobIndex / 4);
  return origin + col + row * sheetColumns;
}

/**
 * Legacy 4-bit lookup table (connectivity mask -> blob-grid index).
 * Used only as fallback when a role frame is missing in the atlas.
 */
export const LEGACY_BLOB_GRID_INDEX: readonly number[] = [
  6, 7, 4, 5,
  2, 3, 1, 0,
  8, 9, 10, 11,
  12, 13, 14, 15,
];
