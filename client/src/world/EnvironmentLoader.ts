import Phaser from 'phaser';
import { TreeAssetManifest } from '@shared/treeAssets';
import {
  getRenderTextureKey,
  preloadRegisteredTilesets,
  processRegisteredTilesets,
} from './tilesetRegistry';
import { preloadPropSpritesheets, processPropSpritesheets } from './propSpritesheetRegistry';
import { WATER_ANIM_FRAMES, WATER_ANIM_KEY } from './tilesetConfig';

export const PROP_KEYS = {
  rocks: 'prop-rocks',
  vegetation: 'prop-vegetation',
  farm: 'prop-farm',
} as const;

export class EnvironmentLoader {
  static preload(scene: Phaser.Scene, treeManifest: TreeAssetManifest | null): void {
    preloadRegisteredTilesets(scene);
    preloadPropSpritesheets(scene);

    treeManifest?.profiles.forEach((profile) => {
      scene.load.image(profile.textureKey, profile.assetPath);
    });
  }

  static register(scene: Phaser.Scene): void {
    processRegisteredTilesets(scene);
    processPropSpritesheets(scene);

    const waterTextureKey = getRenderTextureKey('water');
    if (!scene.anims.exists(WATER_ANIM_KEY)) {
      scene.anims.create({
        key: WATER_ANIM_KEY,
        frames: WATER_ANIM_FRAMES.map((frame) => ({
          key: waterTextureKey,
          frame,
        })),
        frameRate: 6,
        repeat: -1,
      });
    }

    scene.registry.set('environmentAssetsReady', true);
  }

  static isReady(scene: Phaser.Scene): boolean {
    return scene.registry.get('environmentAssetsReady') === true;
  }

  static getTreeManifest(scene: Phaser.Scene): TreeAssetManifest | null {
    return scene.registry.get('treeAssetManifest') ?? null;
  }
}
