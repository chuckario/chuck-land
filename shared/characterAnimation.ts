import { SPRITE_MANIFEST_URL } from './assetPaths';

export enum CharacterDirection {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  UP_RIGHT = 'UP_RIGHT',
  UP_LEFT = 'UP_LEFT',
  DOWN_RIGHT = 'DOWN_RIGHT',
  DOWN_LEFT = 'DOWN_LEFT',
}

export enum CharacterAnimationAction {
  IDLE = 'IDLE',
  WALK = 'WALK',
  RUN = 'RUN',
  CARRY = 'CARRY',
  CARRY_IDLE = 'CARRY_IDLE',
  CARRY_RUN = 'CARRY_RUN',
  CARRY_WALK = 'CARRY_WALK',
  COLLECT = 'COLLECT',
  CRUSH = 'CRUSH',
  DEATH = 'DEATH',
  FISHING = 'FISHING',
  HIT = 'HIT',
  PIERCE = 'PIERCE',
  SLICE = 'SLICE',
  WATERING = 'WATERING',
  PICKUP = 'PICKUP',
  PUTDOWN = 'PUTDOWN',
  THROW = 'THROW',
}

export enum EntityVisualType {
  CLASS = 'CLASS',
  ENEMY = 'ENEMY',
  VILLAGER = 'VILLAGER',
}

export interface SpritesheetDefaults {
  frameWidth: number;
  frameHeight: number;
  defaultFrameCount: number;
  animations: Record<
    string,
    {
      frameRate: number;
      repeat: number;
      frameCount?: number;
    }
  >;
}

export interface SpritesheetEntry {
  file: string;
  textureKey: string;
  animationKey: string;
  action: CharacterAnimationAction;
  direction: CharacterDirection;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameRate: number;
  repeat: number;
  mirrorOf?: CharacterDirection;
}

export interface CharacterSpriteProfile {
  profileId: string;
  characterSet: string;
  entityType: EntityVisualType;
  label: string;
  assetRoot: string;
  sheets: SpritesheetEntry[];
}

export interface SpriteManifestBundle {
  scannedAt: string;
  defaultCharacterProfileId: string;
  defaultVillagerProfileId?: string;
  profiles: CharacterSpriteProfile[];
}

/** @deprecated Use CharacterSpriteProfile via SpriteManifestBundle */
export interface CharacterSpriteManifest {
  characterSet: string;
  assetRoot: string;
  scannedAt: string;
  sheets: SpritesheetEntry[];
}

export const CHARACTER_ASSET_ROOT = '/assets';
export const CHARACTER_MANIFEST_URL = SPRITE_MANIFEST_URL;
export const DEFAULT_CHARACTER_PROFILE_ID = 'class:body-a';
export const DEFAULT_VILLAGER_PROFILE_ID = 'villager:body-a';
export const DEFAULT_ENEMY_PROFILE_ID = 'enemy:orc-crew-orc';

export function buildAnimationKey(
  characterSet: string,
  action: CharacterAnimationAction,
  direction: CharacterDirection,
): string {
  return `${characterSet}-${action.toLowerCase()}-${direction.toLowerCase()}`;
}

export function buildTextureKey(
  characterSet: string,
  action: CharacterAnimationAction,
  direction: CharacterDirection,
): string {
  return `${characterSet}-tex-${action.toLowerCase()}-${direction.toLowerCase()}`;
}

export function findProfile(
  bundle: SpriteManifestBundle | null | undefined,
  profileId: string,
): CharacterSpriteProfile | null {
  if (!bundle) {
    return null;
  }

  return bundle.profiles.find((profile) => profile.profileId === profileId) ?? null;
}

export function getDefaultCharacterProfile(
  bundle: SpriteManifestBundle | null | undefined,
): CharacterSpriteProfile | null {
  if (!bundle) {
    return null;
  }

  return (
    findProfile(bundle, bundle.defaultCharacterProfileId)
    ?? bundle.profiles.find((profile) => profile.entityType === EntityVisualType.CLASS)
    ?? null
  );
}

export function getDefaultVillagerProfile(
  bundle: SpriteManifestBundle | null | undefined,
): CharacterSpriteProfile | null {
  if (!bundle) {
    return null;
  }

  const preferredId = bundle.defaultVillagerProfileId ?? DEFAULT_VILLAGER_PROFILE_ID;

  return (
    findProfile(bundle, preferredId)
    ?? bundle.profiles.find((profile) => profile.entityType === EntityVisualType.VILLAGER)
    ?? getDefaultCharacterProfile(bundle)
  );
}

export function getDefaultEnemyProfile(
  bundle: SpriteManifestBundle | null | undefined,
): CharacterSpriteProfile | null {
  if (!bundle) {
    return null;
  }

  return (
    findProfile(bundle, DEFAULT_ENEMY_PROFILE_ID)
    ?? bundle.profiles.find((profile) => profile.entityType === EntityVisualType.ENEMY)
    ?? null
  );
}
