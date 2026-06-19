import {
  CharacterAnimationAction,
  CharacterDirection,
  CharacterSpriteProfile,
  CHARACTER_MANIFEST_URL,
  SpritesheetEntry,
  SpriteManifestBundle,
} from '@shared/characterAnimation';

export function getManifestUrl(): string {
  return CHARACTER_MANIFEST_URL;
}

export function getSpritesheetUrl(profile: CharacterSpriteProfile, file: string): string {
  const segments = file.split(/[/\\]/).map((segment) => encodeURIComponent(segment));
  return `${profile.assetRoot}/${segments.join('/')}`;
}

export function hasAction(
  sheets: SpritesheetEntry[],
  action: CharacterAnimationAction,
): boolean {
  return sheets.some((sheet) => sheet.action === action);
}

export function pickMovementAction(
  sheets: SpritesheetEntry[],
  isCarrying: boolean,
): CharacterAnimationAction {
  if (isCarrying) {
    if (hasAction(sheets, CharacterAnimationAction.CARRY_RUN)) {
      return CharacterAnimationAction.CARRY_RUN;
    }
    if (hasAction(sheets, CharacterAnimationAction.CARRY_WALK)) {
      return CharacterAnimationAction.CARRY_WALK;
    }
    if (hasAction(sheets, CharacterAnimationAction.CARRY)) {
      return CharacterAnimationAction.CARRY;
    }
  }

  if (hasAction(sheets, CharacterAnimationAction.RUN)) {
    return CharacterAnimationAction.RUN;
  }

  if (hasAction(sheets, CharacterAnimationAction.WALK)) {
    return CharacterAnimationAction.WALK;
  }

  return CharacterAnimationAction.IDLE;
}

export function pickIdleAction(
  sheets: SpritesheetEntry[],
  isCarrying: boolean,
): CharacterAnimationAction {
  if (isCarrying) {
    if (hasAction(sheets, CharacterAnimationAction.CARRY_IDLE)) {
      return CharacterAnimationAction.CARRY_IDLE;
    }
    if (hasAction(sheets, CharacterAnimationAction.CARRY)) {
      return CharacterAnimationAction.CARRY;
    }
  }

  return CharacterAnimationAction.IDLE;
}

export function findSheetForActionDirection(
  sheets: SpritesheetEntry[],
  action: CharacterAnimationAction,
  direction: CharacterDirection,
): SpritesheetEntry | undefined {
  return sheets.find((sheet) => sheet.action === action && sheet.direction === direction);
}

export function findDefaultTextureSheet(sheets: SpritesheetEntry[]): SpritesheetEntry | undefined {
  return (
    findSheetForActionDirection(sheets, CharacterAnimationAction.IDLE, CharacterDirection.DOWN)
    ?? findSheetForActionDirection(sheets, CharacterAnimationAction.IDLE, CharacterDirection.RIGHT)
    ?? sheets.find((sheet) => sheet.action === CharacterAnimationAction.IDLE)
    ?? sheets[0]
  );
}

export function countBundleSheets(bundle: SpriteManifestBundle): number {
  return bundle.profiles.reduce((total, profile) => total + profile.sheets.length, 0);
}
