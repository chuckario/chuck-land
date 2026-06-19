import { WORLD_MAP_WIDTH } from '@shared/types';

export interface IsoPoint {
  x: number;
  y: number;
}

export interface IsoBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Orthogonal top-down layout — the map is a flat rectangle on screen.
 * Tile column x = 0 forms the straight left edge (coast/ocean border).
 */
export function gridToIso(
  tileX: number,
  tileY: number,
  _mapWidth: number,
  _mapHeight: number,
  tileSize: number,
): IsoPoint {
  return {
    x: (tileX + 0.5) * tileSize,
    y: (tileY + 0.5) * tileSize,
  };
}

export function getIsoWorldBounds(mapWidth: number, mapHeight: number, tileSize: number): IsoBounds {
  return {
    x: 0,
    y: 0,
    width: mapWidth * tileSize,
    height: mapHeight * tileSize,
  };
}

/** Back-to-front draw order for top-down maps (lower rows paint over upper rows). */
export function getIsoPaintOrder(tileX: number, tileY: number, mapWidth = WORLD_MAP_WIDTH): number {
  return tileY * mapWidth + tileX;
}
