import Phaser from 'phaser';
import { LAND_ASSETS } from '@shared/assetPaths';
import { getProcessedTextureKey, processTilesetTransparency } from './tileTextureProcessor';

export const PROP_SPRITE_SIZE = 16;

export interface PropSpritesheetDefinition {
  id: string;
  sourceKey: string;
  path: string;
}

/** Land prop spritesheets used on the world map. */
export const PROP_SPRITESHEET_DEFINITIONS: PropSpritesheetDefinition[] = [
  {
    id: 'rocks',
    sourceKey: 'prop-rocks',
    path: LAND_ASSETS.props.rocks,
  },
  {
    id: 'vegetation',
    sourceKey: 'prop-vegetation',
    path: LAND_ASSETS.props.vegetation,
  },
  {
    id: 'farm',
    sourceKey: 'prop-farm',
    path: LAND_ASSETS.props.farm,
  },
];

export function getPropRenderTextureKey(sourceKey: string): string {
  return getProcessedTextureKey(sourceKey);
}

export function preloadPropSpritesheets(scene: Phaser.Scene): void {
  for (const definition of PROP_SPRITESHEET_DEFINITIONS) {
    scene.load.spritesheet(definition.sourceKey, definition.path, {
      frameWidth: PROP_SPRITE_SIZE,
      frameHeight: PROP_SPRITE_SIZE,
    });
  }
}

export function processPropSpritesheets(scene: Phaser.Scene): void {
  for (const definition of PROP_SPRITESHEET_DEFINITIONS) {
    processTilesetTransparency(scene, definition.sourceKey, {
      tileWidth: PROP_SPRITE_SIZE,
      tileHeight: PROP_SPRITE_SIZE,
    });
  }
}
