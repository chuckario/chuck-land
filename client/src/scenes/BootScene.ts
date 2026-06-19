import Phaser from 'phaser';
import {
  CharacterSpriteProfile,
  findProfile,
  getDefaultCharacterProfile,
  getDefaultEnemyProfile,
  getDefaultVillagerProfile,
  SpriteManifestBundle,
} from '@shared/characterAnimation';
import { fetchTreeAssetManifest } from '@shared/treeAssets';
import { CharacterAnimationLoader } from '../animations/CharacterAnimationLoader';
import { EnvironmentLoader } from '../world/EnvironmentLoader';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.load.setPath('');
  }

  async create(): Promise<void> {
    const [bundle, treeManifest] = await Promise.all([
      CharacterAnimationLoader.fetchBundle(this),
      fetchTreeAssetManifest(),
    ]);

    if (CharacterAnimationLoader.hasBundleContent(bundle)) {
      CharacterAnimationLoader.preloadBundle(this, bundle!);
    }

    this.registry.set('treeAssetManifest', treeManifest);
    EnvironmentLoader.preload(this, treeManifest);

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      if (CharacterAnimationLoader.hasBundleContent(bundle)) {
        CharacterAnimationLoader.registerBundleAnimations(this, bundle!);
      }

      EnvironmentLoader.register(this);
      this.scene.start('ClassSelectScene');
    });

    this.load.start();
  }

  static getBundle(scene: Phaser.Scene): SpriteManifestBundle | null {
    return scene.registry.get('spriteManifestBundle') ?? null;
  }

  static getProfile(scene: Phaser.Scene, profileId: string): CharacterSpriteProfile | null {
    return findProfile(BootScene.getBundle(scene), profileId);
  }

  static getDefaultCharacterProfile(scene: Phaser.Scene): CharacterSpriteProfile | null {
    return getDefaultCharacterProfile(BootScene.getBundle(scene));
  }

  static getDefaultVillagerProfile(scene: Phaser.Scene): CharacterSpriteProfile | null {
    return getDefaultVillagerProfile(BootScene.getBundle(scene));
  }

  static getDefaultEnemyProfile(scene: Phaser.Scene): CharacterSpriteProfile | null {
    return getDefaultEnemyProfile(BootScene.getBundle(scene));
  }
}
