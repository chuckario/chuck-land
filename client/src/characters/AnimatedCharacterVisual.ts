import Phaser from 'phaser';
import { CharacterDirection, CharacterSpriteProfile } from '@shared/characterAnimation';
import { NpcAiState, ProfessionAction } from '@shared/types';
import { CHARACTER_DISPLAY_SCALE } from '../config/constants';
import { CharacterAnimationController } from '../animations/CharacterAnimationController';
import { findDefaultTextureSheet } from '../animations/characterAnimationUtils';
import { inferDirectionFromDelta } from '../animations/inferDirection';
import { TileWorldRenderer } from '../world/TileWorldRenderer';
import {
  beginCharacterGlide,
  CharacterMotionState,
  createCharacterMotionState,
  isCharacterInMotion,
  snapCharacterMotion,
  tickCharacterMotion,
} from './characterMotion';

export interface AnimatedCharacterVisual {
  id: string;
  profileId: string;
  sprite?: Phaser.GameObjects.Sprite;
  controller?: CharacterAnimationController;
  fallback?: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  lastTile: { x: number; y: number };
  direction: CharacterDirection;
  motion: CharacterMotionState;
  locomoting: boolean;
  syncProfile: CharacterSpriteProfile | null;
  lastAnimationMoving: boolean;
  lastAnimationDirection: CharacterDirection;
  npcState?: NpcAiState;
  professionAction?: ProfessionAction;
  isCarrying?: boolean;
}

export interface CharacterVisualSyncOptions {
  x: number;
  y: number;
  tileX: number;
  tileY: number;
  labelText: string;
  profile: CharacterSpriteProfile | null;
  facingDirection?: CharacterDirection | null;
  explicitDirection?: CharacterDirection;
  locomoting?: boolean;
  npcState?: NpcAiState;
  professionAction?: ProfessionAction;
  isCarrying?: boolean;
  skipMotion?: boolean;
}

interface AnimatedCharacterOptions {
  id: string;
  profileId: string;
  profile: CharacterSpriteProfile | null;
  x: number;
  y: number;
  tileX: number;
  tileY: number;
  labelText: string;
  depth: number;
  labelDepth: number;
  fallbackColor: number;
  fallbackRadius: number;
  strokeColor: number;
  labelStyle: Phaser.Types.GameObjects.Text.TextStyle;
  followTarget?: boolean;
}

export class AnimatedCharacterVisualFactory {
  static create(
    scene: Phaser.Scene,
    options: AnimatedCharacterOptions,
  ): AnimatedCharacterVisual {
    const {
      id,
      profileId,
      profile,
      x,
      y,
      tileX,
      tileY,
      labelText,
      depth,
      labelDepth,
      fallbackColor,
      fallbackRadius,
      strokeColor,
      labelStyle,
    } = options;

    const displayRadius = fallbackRadius * CHARACTER_DISPLAY_SCALE;
    const labelOffsetY = 22 * CHARACTER_DISPLAY_SCALE;

    const label = scene.add.text(x, y - labelOffsetY, labelText, labelStyle)
      .setOrigin(0.5)
      .setDepth(labelDepth);

    const firstSheet = profile ? findDefaultTextureSheet(profile.sheets) : undefined;
    if (profile && profile.sheets.length > 0 && firstSheet) {
      const sprite = scene.add.sprite(x, y, firstSheet.textureKey, 0)
        .setDepth(depth)
        .setOrigin(0.5, 0.85);

      const scale = (displayRadius * 2) / firstSheet.frameHeight;
      sprite.setScale(scale);

      const controller = new CharacterAnimationController(sprite, profile);
      controller.sync({
        moved: false,
        direction: CharacterDirection.DOWN,
      });

      if (options.followTarget) {
        scene.cameras.main.startFollow(sprite, true, 0.08, 0.08);
      }

      return {
        id,
        profileId,
        sprite,
        controller,
        label,
        lastTile: { x: tileX, y: tileY },
        direction: CharacterDirection.DOWN,
        motion: createCharacterMotionState(x, y),
        locomoting: false,
        syncProfile: profile,
        lastAnimationMoving: false,
        lastAnimationDirection: CharacterDirection.DOWN,
      };
    }

    const fallback = scene.add.circle(x, y, displayRadius, fallbackColor)
      .setStrokeStyle(2, strokeColor)
      .setDepth(depth);

    if (options.followTarget) {
      scene.cameras.main.startFollow(fallback, true, 0.08, 0.08);
    }

    return {
      id,
      profileId,
      fallback,
      label,
      lastTile: { x: tileX, y: tileY },
      direction: CharacterDirection.DOWN,
      motion: createCharacterMotionState(x, y),
      locomoting: false,
      syncProfile: profile,
      lastAnimationMoving: false,
      lastAnimationDirection: CharacterDirection.DOWN,
    };
  }

  static syncVisual(
    visual: AnimatedCharacterVisual,
    options: CharacterVisualSyncOptions,
  ): void {
    visual.label.setText(options.labelText);
    visual.syncProfile = options.profile;
    visual.npcState = options.npcState;
    visual.professionAction = options.professionAction;
    visual.isCarrying = options.isCarrying;
    visual.locomoting = options.locomoting === true;

    const tileChanged =
      options.tileX !== visual.lastTile.x
      || options.tileY !== visual.lastTile.y;

    const direction = tileChanged
      ? (options.explicitDirection
        ?? inferDirectionFromDelta(visual.lastTile, { x: options.tileX, y: options.tileY }, visual.direction))
      : (options.facingDirection ?? options.explicitDirection ?? visual.direction);

    visual.direction = direction;
    visual.lastTile = { x: options.tileX, y: options.tileY };

    if (!options.skipMotion) {
      if (tileChanged) {
        beginCharacterGlide(visual.motion, options.x, options.y);
      } else if (!visual.motion.active) {
        snapCharacterMotion(visual.motion, options.x, options.y);
      } else {
        visual.motion.targetWorldX = options.x;
        visual.motion.targetWorldY = options.y;
        const dx = visual.motion.targetWorldX - visual.motion.worldX;
        const dy = visual.motion.targetWorldY - visual.motion.worldY;
        visual.motion.segmentLength = Math.hypot(dx, dy);
      }
    }

    AnimatedCharacterVisualFactory.applyVisualState(visual);
  }

  static tickVisual(visual: AnimatedCharacterVisual, deltaMs: number): void {
    tickCharacterMotion(visual.motion, deltaMs);
    AnimatedCharacterVisualFactory.applyVisualState(visual);
  }

  private static applyVisualState(visual: AnimatedCharacterVisual): void {
    const labelOffsetY = 22 * CHARACTER_DISPLAY_SCALE;
    const { worldX, worldY } = visual.motion;

    const entityDepth = TileWorldRenderer.getEntityDepth(visual.lastTile.x, visual.lastTile.y);

    visual.label.setPosition(worldX, worldY - labelOffsetY);
    visual.label.setDepth(entityDepth + 1);

    const isMoving = isCharacterInMotion(visual.motion, visual.locomoting);

    if (visual.sprite && visual.controller && visual.syncProfile) {
      visual.sprite.setPosition(worldX, worldY);
      visual.sprite.setDepth(entityDepth);

      const animationStateChanged =
        isMoving !== visual.lastAnimationMoving
        || visual.direction !== visual.lastAnimationDirection;

      if (animationStateChanged) {
        visual.controller.sync({
          moved: isMoving,
          direction: visual.direction,
          npcState: visual.npcState,
          professionAction: visual.professionAction,
          isCarrying: visual.isCarrying,
        });
        visual.lastAnimationMoving = isMoving;
        visual.lastAnimationDirection = visual.direction;
      }
      return;
    }

    visual.fallback?.setPosition(worldX, worldY);
    visual.fallback?.setDepth(entityDepth);
  }

  static destroy(visual: AnimatedCharacterVisual): void {
    visual.controller?.destroy();
    visual.sprite?.destroy();
    visual.fallback?.destroy();
    visual.label.destroy();
  }
}
