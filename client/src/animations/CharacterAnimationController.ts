import Phaser from 'phaser';
import {
  CharacterAnimationAction,
  CharacterDirection,
  CharacterSpriteProfile,
} from '@shared/characterAnimation';
import { resolveAnimationDirection } from '@shared/movement';
import { CharacterAnimationLoader } from './CharacterAnimationLoader';
import { resolveSyncedAnimationAction } from './characterAnimationSync';
import { isLoopingWorkAction } from './professionAnimationMap';

export interface CharacterAnimationSyncState {
  moved: boolean;
  direction: CharacterDirection;
  npcState?: import('@shared/types').NpcAiState;
  professionAction?: import('@shared/types').ProfessionAction;
  isCarrying?: boolean;
}

export class CharacterAnimationController {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly profile: CharacterSpriteProfile;
  private currentDirection: CharacterDirection = CharacterDirection.DOWN;
  private currentAction: CharacterAnimationAction = CharacterAnimationAction.IDLE;
  private isCarrying = false;
  private activeAnimationKey = '';
  private activeTextureKey = '';

  constructor(sprite: Phaser.GameObjects.Sprite, profile: CharacterSpriteProfile) {
    this.sprite = sprite;
    this.profile = profile;
    this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.handleAnimationComplete, this);
  }

  destroy(): void {
    this.sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE, this.handleAnimationComplete, this);
  }

  get direction(): CharacterDirection {
    return this.currentDirection;
  }

  get action(): CharacterAnimationAction {
    return this.currentAction;
  }

  setCarrying(isCarrying: boolean): void {
    this.isCarrying = isCarrying;
    this.applyCurrentAction();
  }

  faceDirection(direction: CharacterDirection): void {
    const animationDirection = resolveAnimationDirection(direction);
    if (this.currentDirection === animationDirection) {
      return;
    }

    this.currentDirection = animationDirection;
    this.applyCurrentAction();
  }

  sync(state: CharacterAnimationSyncState): void {
    this.currentDirection = resolveAnimationDirection(state.direction);
    this.currentAction = resolveSyncedAnimationAction(this.profile, {
      moved: state.moved,
      npcState: state.npcState,
      professionAction: state.professionAction,
      isCarrying: state.isCarrying ?? this.isCarrying,
    });
    this.applyCurrentAction();
  }

  private applyCurrentAction(): void {
    const resolved = CharacterAnimationLoader.resolveAnimation(
      this.profile,
      this.currentAction,
      this.currentDirection,
    );

    if (!resolved) {
      return;
    }

    const needsRetexture =
      this.activeTextureKey !== resolved.textureKey
      || this.activeAnimationKey !== resolved.animationKey
      || this.sprite.flipX !== resolved.mirrorX;

    if (
      !needsRetexture
      && this.sprite.anims.isPlaying
      && this.sprite.anims.currentAnim?.key === resolved.animationKey
    ) {
      return;
    }

    this.activeTextureKey = resolved.textureKey;
    this.activeAnimationKey = resolved.animationKey;

    if (this.sprite.texture.key !== resolved.textureKey) {
      this.sprite.setTexture(resolved.textureKey, 0);
    }

    this.sprite.setFlipX(resolved.mirrorX);
    this.sprite.play(resolved.animationKey, true);
  }

  private handleAnimationComplete(): void {
    if (isLoopingWorkAction(this.currentAction)) {
      return;
    }

    this.sprite.play(this.activeAnimationKey, true);
  }
}
