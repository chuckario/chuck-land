import Phaser from 'phaser';
import {
  CharacterAnimationAction,
  CharacterDirection,
  CharacterSpriteProfile,
  buildAnimationKey,
  CHARACTER_MANIFEST_URL,
  SpriteManifestBundle,
} from '@shared/characterAnimation';
import { resolveAnimationDirection } from '@shared/movement';
import { countBundleSheets, getSpritesheetUrl } from './characterAnimationUtils';

interface ResolvedAnimation {
  animationKey: string;
  textureKey: string;
  mirrorX: boolean;
  repeat: number;
}

export class CharacterAnimationLoader {
  static async fetchBundle(scene: Phaser.Scene): Promise<SpriteManifestBundle | null> {
    try {
      const response = await fetch(CHARACTER_MANIFEST_URL);
      if (!response.ok) {
        return null;
      }

      const bundle = (await response.json()) as SpriteManifestBundle;
      scene.registry.set('spriteManifestBundle', bundle);
      return bundle;
    } catch {
      return null;
    }
  }

  static preloadBundle(scene: Phaser.Scene, bundle: SpriteManifestBundle): void {
    for (const profile of bundle.profiles) {
      for (const sheet of profile.sheets) {
        const url = getSpritesheetUrl(profile, sheet.file);
        scene.load.spritesheet(sheet.textureKey, url, {
          frameWidth: sheet.frameWidth,
          frameHeight: sheet.frameHeight,
        });
      }
    }
  }

  static registerBundleAnimations(scene: Phaser.Scene, bundle: SpriteManifestBundle): void {
    for (const profile of bundle.profiles) {
      for (const sheet of profile.sheets) {
        if (scene.anims.exists(sheet.animationKey)) {
          continue;
        }

        scene.anims.create({
          key: sheet.animationKey,
          frames: scene.anims.generateFrameNumbers(sheet.textureKey, {
            start: 0,
            end: Math.max(0, sheet.frameCount - 1),
          }),
          frameRate: sheet.frameRate,
          repeat: sheet.repeat,
        });
      }
    }

    scene.registry.set('characterAnimationsRegistered', true);
  }

  static hasBundleContent(bundle: SpriteManifestBundle | null): boolean {
    return bundle !== null && countBundleSheets(bundle) > 0;
  }

  static resolveAnimation(
    profile: CharacterSpriteProfile,
    action: CharacterAnimationAction,
    direction: CharacterDirection,
  ): ResolvedAnimation | null {
    const animationDirection = resolveAnimationDirection(direction);

    const exact = profile.sheets.find(
      (sheet) => sheet.action === action && sheet.direction === animationDirection,
    );

    if (exact) {
      return {
        animationKey: exact.animationKey,
        textureKey: exact.textureKey,
        mirrorX: false,
        repeat: exact.repeat,
      };
    }

    if (animationDirection === CharacterDirection.LEFT) {
      const mirrored = profile.sheets.find(
        (sheet) =>
          sheet.action === action && sheet.direction === CharacterDirection.RIGHT,
      );

      if (mirrored) {
        return {
          animationKey: mirrored.animationKey,
          textureKey: mirrored.textureKey,
          mirrorX: true,
          repeat: mirrored.repeat,
        };
      }
    }

    const directionFallbacks =
      animationDirection === CharacterDirection.UP || animationDirection === CharacterDirection.DOWN
        ? [animationDirection, CharacterDirection.DOWN, CharacterDirection.RIGHT]
        : [animationDirection, CharacterDirection.RIGHT, CharacterDirection.DOWN];

    for (const fallbackDirection of directionFallbacks) {
      const fallbackSheet = profile.sheets.find(
        (sheet) => sheet.action === action && sheet.direction === fallbackDirection,
      );

      if (fallbackSheet) {
        return {
          animationKey: fallbackSheet.animationKey,
          textureKey: fallbackSheet.textureKey,
          mirrorX: false,
          repeat: fallbackSheet.repeat,
        };
      }
    }

    const fallbackAction = profile.sheets.find((sheet) => sheet.action === action);
    if (fallbackAction) {
      return {
        animationKey: fallbackAction.animationKey,
        textureKey: fallbackAction.textureKey,
        mirrorX: false,
        repeat: fallbackAction.repeat,
      };
    }

    return null;
  }

  static buildKey(
    characterSet: string,
    action: CharacterAnimationAction,
    direction: CharacterDirection,
  ): string {
    return buildAnimationKey(characterSet, action, direction);
  }
}
