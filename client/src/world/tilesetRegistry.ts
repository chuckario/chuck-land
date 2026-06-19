import Phaser from 'phaser';
import { LAND_ASSETS } from '@shared/assetPaths';
import { getProcessedTextureKey, processTilesetTransparency } from './tileTextureProcessor';

export const ASSET_TILE_SIZE = 16;

export interface TilesetDefinition {
  id: string;
  sourceKey: string;
  path: string;
  tileWidth: number;
  tileHeight: number;
}

/** Land tilesets used for world map rendering. */
export const TILESET_DEFINITIONS: TilesetDefinition[] = [
  {
    id: 'floors',
    sourceKey: 'tileset-floors',
    path: LAND_ASSETS.tilesets.floors,
    tileWidth: ASSET_TILE_SIZE,
    tileHeight: ASSET_TILE_SIZE,
  },
  {
    id: 'water',
    sourceKey: 'tileset-water',
    path: LAND_ASSETS.tilesets.water,
    tileWidth: ASSET_TILE_SIZE,
    tileHeight: ASSET_TILE_SIZE,
  },
];

export function getTilesetDefinition(id: string): TilesetDefinition | undefined {
  return TILESET_DEFINITIONS.find((definition) => definition.id === id);
}

export function getTilesetDefinitionBySourceKey(sourceKey: string): TilesetDefinition | undefined {
  return TILESET_DEFINITIONS.find((definition) => definition.sourceKey === sourceKey);
}

export function getRenderTextureKey(tilesetId: string): string {
  const definition = getTilesetDefinition(tilesetId);
  if (!definition) {
    return tilesetId;
  }

  return getProcessedTextureKey(definition.sourceKey);
}

export function preloadRegisteredTilesets(scene: Phaser.Scene): void {
  for (const definition of TILESET_DEFINITIONS) {
    scene.load.spritesheet(definition.sourceKey, definition.path, {
      frameWidth: definition.tileWidth,
      frameHeight: definition.tileHeight,
    });
  }
}

export function processRegisteredTilesets(scene: Phaser.Scene): void {
  for (const definition of TILESET_DEFINITIONS) {
    processTilesetTransparency(scene, definition.sourceKey, {
      tileWidth: definition.tileWidth,
      tileHeight: definition.tileHeight,
    });
  }
}
