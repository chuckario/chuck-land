import {
  AutotileLayoutMode,
  BlobTileRole,
  blobGridIndexToFrame,
  cardinalMask,
  CardinalNeighbors,
  DiagonalNeighbors,
  LEGACY_BLOB_GRID_INDEX,
  resolveAutotileRole,
} from '@shared/blobAutotile';
import { TerrainType } from '@shared/types';
import { tileHash } from '@shared/worldNoise';
import { exposesCliffToNeighbor } from './cliffRendering';
import { LayerTileContext } from './layerTileContext';
import {
  getAutotileTerrainForLayer,
  getTerrainRenderLayer,
  isOverlayTerrain,
} from './terrainLayerRules';
import {
  DIRT_FILL_FRAMES,
  FOREST_FILL_FRAMES,
  GRASS_FILL_FRAMES,
  SAND_FILL_FRAMES,
  STONE_FILL_FRAMES,
  WATER_FRAMES,
} from './terrainFrames';
import {
  isEmptyAtlasFrame,
  pickAtlasFrame,
  TRANSITION_ATLASES,
  TransitionAtlas,
} from './terrainAutotileAtlas';

interface CustomTerrainTransition {
  atlas: TransitionAtlas;
  matches: (context: LayerTileContext) => boolean;
  connectedTerrains: TerrainType[];
}

interface StructuredTerrainAutotile {
  fillFrames: readonly number[];
  lowerAtlas: TransitionAtlas;
  overlayAtlas?: TransitionAtlas;
  customTransitions?: CustomTerrainTransition[];
}

const STRUCTURED_TERRAIN_AUTOTILE: Partial<Record<TerrainType, StructuredTerrainAutotile>> = {
  [TerrainType.GRASS]: {
    fillFrames: GRASS_FILL_FRAMES,
    lowerAtlas: TRANSITION_ATLASES.grassLower,
    overlayAtlas: TRANSITION_ATLASES.grassOverlay,
  },
  [TerrainType.FOREST]: {
    fillFrames: FOREST_FILL_FRAMES,
    lowerAtlas: TRANSITION_ATLASES.forestLower,
    overlayAtlas: TRANSITION_ATLASES.forestOverlay,
  },
  [TerrainType.DIRT]: {
    fillFrames: DIRT_FILL_FRAMES,
    lowerAtlas: TRANSITION_ATLASES.dirtLower,
    overlayAtlas: TRANSITION_ATLASES.dirtOverlay,
  },
  [TerrainType.STONE]: {
    fillFrames: STONE_FILL_FRAMES,
    lowerAtlas: TRANSITION_ATLASES.stoneLower,
    overlayAtlas: TRANSITION_ATLASES.stoneOverlay,
  },
  [TerrainType.SAND]: {
    fillFrames: SAND_FILL_FRAMES,
    lowerAtlas: TRANSITION_ATLASES.sandWater,
    overlayAtlas: TRANSITION_ATLASES.sandGrass,
    customTransitions: [
      {
        atlas: TRANSITION_ATLASES.sandWater,
        matches: (context) => hasTerrainNeighbor(context, TerrainType.WATER),
        connectedTerrains: [TerrainType.SAND, TerrainType.GRASS, TerrainType.FOREST, TerrainType.DIRT],
      },
      {
        atlas: TRANSITION_ATLASES.sandGrass,
        matches: (context) => hasTerrainNeighbor(context, TerrainType.GRASS)
          || hasTerrainNeighbor(context, TerrainType.FOREST)
          || hasTerrainNeighbor(context, TerrainType.DIRT),
        connectedTerrains: [TerrainType.SAND],
      },
    ],
  },
};

export function buildNeighborMask(
  tiles: TerrainType[],
  width: number,
  height: number,
  x: number,
  y: number,
  terrain: TerrainType,
): number {
  return buildNeighborMaskWhere(tiles, width, height, x, y, (value) => value === terrain);
}

export function buildNeighborMaskWhere(
  tiles: TerrainType[],
  width: number,
  height: number,
  x: number,
  y: number,
  matches: (terrain: TerrainType) => boolean,
): number {
  const cardinals = readCardinalNeighbors(tiles, width, height, x, y, matches);
  return cardinalMask(cardinals);
}

function readCardinalNeighbors(
  tiles: TerrainType[],
  width: number,
  height: number,
  x: number,
  y: number,
  matches: (terrain: TerrainType) => boolean,
): CardinalNeighbors {
  return {
    n: matchesTerrainWhere(tiles, width, height, x, y - 1, matches),
    e: matchesTerrainWhere(tiles, width, height, x + 1, y, matches),
    s: matchesTerrainWhere(tiles, width, height, x, y + 1, matches),
    w: matchesTerrainWhere(tiles, width, height, x - 1, y, matches),
  };
}

function readDiagonalNeighbors(
  tiles: TerrainType[],
  width: number,
  height: number,
  x: number,
  y: number,
  matches: (terrain: TerrainType) => boolean,
): DiagonalNeighbors {
  return {
    ne: matchesTerrainWhere(tiles, width, height, x + 1, y - 1, matches),
    se: matchesTerrainWhere(tiles, width, height, x + 1, y + 1, matches),
    sw: matchesTerrainWhere(tiles, width, height, x - 1, y + 1, matches),
    nw: matchesTerrainWhere(tiles, width, height, x - 1, y - 1, matches),
  };
}

function matchesTerrainWhere(
  tiles: TerrainType[],
  width: number,
  height: number,
  x: number,
  y: number,
  matches: (terrain: TerrainType) => boolean,
): boolean {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return false;
  }

  return matches(tiles[y * width + x]!);
}

export function hasTerrainNeighbor(context: LayerTileContext, terrain: TerrainType): boolean {
  return matchesTerrainWhere(
    context.tiles,
    context.width,
    context.height,
    context.x,
    context.y - 1,
    (value) => value === terrain,
  )
    || matchesTerrainWhere(context.tiles, context.width, context.height, context.x + 1, context.y, (value) => value === terrain)
    || matchesTerrainWhere(context.tiles, context.width, context.height, context.x, context.y + 1, (value) => value === terrain)
    || matchesTerrainWhere(context.tiles, context.width, context.height, context.x - 1, context.y, (value) => value === terrain);
}

export function pickLayerAutotileFrame(
  visualTerrain: TerrainType,
  renderLayerDepth: number,
  context: LayerTileContext,
): number {
  const config = STRUCTURED_TERRAIN_AUTOTILE[visualTerrain];
  if (!config) {
    return pickWaterFrame(context.x, context.y);
  }

  return pickStructuredTerrainFrame(config, context, renderLayerDepth);
}

function pickStructuredTerrainFrame(
  config: StructuredTerrainAutotile,
  context: LayerTileContext,
  renderLayerDepth: number,
): number {
  const connectedTerrains = [context.terrain];
  const cardinals = readCardinalNeighbors(
    context.tiles,
    context.width,
    context.height,
    context.x,
    context.y,
    (terrain) => connectedTerrains.includes(terrain),
  );
  const connectivityMask = cardinalMask(cardinals);

  if (connectivityMask === 15) {
    const diagonals = readDiagonalNeighbors(
      context.tiles,
      context.width,
      context.height,
      context.x,
      context.y,
      (terrain) => connectedTerrains.includes(terrain),
    );
    const innerRole = resolveAutotileRole(config.lowerAtlas.layout, cardinals, diagonals);
    if (innerRole === 'fill') {
      return pickTerrainFillFrame(config.fillFrames, context.x, context.y);
    }

    return pickAtlasFrame(config.lowerAtlas, innerRole, connectivityMask)
      ?? pickTerrainFillFrame(config.fillFrames, context.x, context.y);
  }

  if (config.customTransitions) {
    for (const transition of config.customTransitions) {
      if (!transition.matches(context)) {
        continue;
      }

      return pickTransitionAtlasFrame(
        transition.atlas,
        context,
        transition.connectedTerrains,
      );
    }

    return pickTerrainFillFrame(config.fillFrames, context.x, context.y);
  }

  const touchesLowerLayer = hasLowerLayerNeighbor(context, renderLayerDepth);
  const touchesOverlayPeer = hasOverlayPeerNeighbor(context, context.terrain, renderLayerDepth);

  if (!touchesLowerLayer && !touchesOverlayPeer) {
    return pickTerrainFillFrame(config.fillFrames, context.x, context.y);
  }

  if (touchesLowerLayer) {
    return pickTransitionAtlasFrame(config.lowerAtlas, context, [context.terrain]);
  }

  if (config.overlayAtlas && touchesOverlayPeer) {
    return pickTransitionAtlasFrame(config.overlayAtlas, context, [context.terrain]);
  }

  return pickTerrainFillFrame(config.fillFrames, context.x, context.y);
}

function pickTransitionAtlasFrame(
  atlas: TransitionAtlas,
  context: LayerTileContext,
  connectedTerrains: TerrainType[],
): number {
  const connected = new Set(connectedTerrains);
  const cardinals = readCardinalNeighbors(
    context.tiles,
    context.width,
    context.height,
    context.x,
    context.y,
    (terrain) => connected.has(terrain),
  );
  const diagonals = readDiagonalNeighbors(
    context.tiles,
    context.width,
    context.height,
    context.x,
    context.y,
    (terrain) => connected.has(terrain),
  );

  const connectivityMask = cardinalMask(cardinals);
  const role = resolveAutotileRole(atlas.layout, cardinals, diagonals);

  if (role === 'fill') {
    const fillFrame = atlas.roleFrames.fill;
    if (fillFrame !== undefined && !isEmptyAtlasFrame(atlas, fillFrame)) {
      return fillFrame;
    }
  }

  const frame = pickAtlasFrame(atlas, role, connectivityMask);
  if (frame !== null) {
    return frame;
  }

  const invertedMask = (~connectivityMask) & 15;
  const invertedIndex = LEGACY_BLOB_GRID_INDEX[invertedMask];
  if (invertedIndex !== undefined) {
    const invertedFrame = blobGridIndexToFrame(atlas.origin, invertedIndex, atlas.sheetColumns);
    if (!isEmptyAtlasFrame(atlas, invertedFrame)) {
      return invertedFrame;
    }
  }

  return pickTerrainFillFrame(
    STRUCTURED_TERRAIN_AUTOTILE[connectedTerrains[0]!]?.fillFrames ?? GRASS_FILL_FRAMES,
    context.x,
    context.y,
  );
}

function hasLowerLayerNeighbor(context: LayerTileContext, renderLayerDepth: number): boolean {
  const { tiles, width, height, x, y } = context;

  for (const [nx, ny] of [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]]) {
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
      continue;
    }

    const neighbor = tiles[ny * width + nx]!;
    if (getTerrainRenderLayer(neighbor) < renderLayerDepth) {
      return true;
    }

    if (exposesCliffToNeighbor(context, renderLayerDepth, nx, ny)) {
      return true;
    }
  }

  return false;
}

function hasOverlayPeerNeighbor(
  context: LayerTileContext,
  terrain: TerrainType,
  renderLayerDepth: number,
): boolean {
  if (renderLayerDepth < 20) {
    return false;
  }

  return cardinalNeighbors(context).some(
    (neighbor) => isOverlayTerrain(neighbor) && neighbor !== terrain,
  );
}

function cardinalNeighbors(context: LayerTileContext): TerrainType[] {
  const { tiles, width, height, x, y } = context;
  const neighbors: TerrainType[] = [];

  for (const [nx, ny] of [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]]) {
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
      continue;
    }

    neighbors.push(tiles[ny * width + nx]!);
  }

  return neighbors;
}

function pickTerrainFillFrame(fillFrames: readonly number[], tileX: number, tileY: number): number {
  const index = Math.abs(tileHash(tileX, tileY)) % fillFrames.length;
  return fillFrames[index]!;
}

export function pickOverlayCliffBaseFrame(
  baseTerrain: TerrainType,
  context: LayerTileContext,
): number {
  const config = STRUCTURED_TERRAIN_AUTOTILE[baseTerrain];
  if (!config) {
    return pickWaterFrame(context.x, context.y);
  }

  if (baseTerrain === TerrainType.SAND && hasTerrainNeighbor(context, TerrainType.WATER)) {
    return pickTransitionAtlasFrame(
      TRANSITION_ATLASES.sandWater,
      context,
      [TerrainType.SAND, TerrainType.GRASS, TerrainType.FOREST, TerrainType.DIRT],
    );
  }

  if (baseTerrain === TerrainType.SAND && isOverlayTerrain(context.terrain)) {
    const sandMask = buildNeighborMaskWhere(
      context.tiles,
      context.width,
      context.height,
      context.x,
      context.y,
      (terrain) => terrain === TerrainType.SAND,
    );
    if (sandMask !== 0) {
      return pickTransitionAtlasFrame(TRANSITION_ATLASES.sandGrass, context, [TerrainType.SAND]);
    }
  }

  return pickTransitionAtlasFrame(config.lowerAtlas, context, [baseTerrain]);
}

export function pickAutotileFrame(
  terrain: TerrainType,
  mask: number,
  tileX: number,
  tileY: number,
): number {
  const config = STRUCTURED_TERRAIN_AUTOTILE[terrain];
  if (!config) {
    return pickWaterFrame(tileX, tileY);
  }

  const role = resolveAutotileRole(config.lowerAtlas.layout, {
    n: (mask & 1) !== 0,
    e: (mask & 2) !== 0,
    s: (mask & 4) !== 0,
    w: (mask & 8) !== 0,
  }, {
    ne: false,
    se: false,
    sw: false,
    nw: false,
  });

  return pickAtlasFrame(config.lowerAtlas, role, mask)
    ?? pickTerrainFillFrame(config.fillFrames, tileX, tileY);
}

export function pickWaterFrame(tileX: number, tileY: number): number {
  const flow = Math.abs(tileHash(tileX, tileY)) % WATER_FRAMES.length;
  const ripple = Math.abs(tileHash(tileY, tileX * 3)) % WATER_FRAMES.length;
  return WATER_FRAMES[(flow + ripple) % WATER_FRAMES.length]!;
}

export function pickLayerTileFrame(
  renderLayerDepth: number,
  context: LayerTileContext,
  forcedTerrain?: TerrainType,
): number | null {
  const visualTerrain = forcedTerrain ?? getAutotileTerrainForLayer(context.terrain, renderLayerDepth);
  if (!visualTerrain) {
    return null;
  }

  if (visualTerrain === TerrainType.WATER && renderLayerDepth === 0) {
    return pickWaterFrame(context.x, context.y);
  }

  return pickLayerAutotileFrame(visualTerrain, renderLayerDepth, context);
}

export type { BlobTileRole } from '@shared/blobAutotile';
