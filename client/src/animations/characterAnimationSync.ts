import {
  CharacterAnimationAction,
  CharacterSpriteProfile,
  SpritesheetEntry,
} from '@shared/characterAnimation';
import { NpcAiState, ProfessionAction } from '@shared/types';
import { pickIdleAction, pickMovementAction } from './characterAnimationUtils';
import { resolveProfessionAnimationAction } from './professionAnimationMap';

export interface CharacterAnimationSyncInput {
  moved: boolean;
  npcState?: NpcAiState;
  professionAction?: ProfessionAction;
  isCarrying?: boolean;
}

export function resolveSyncedAnimationAction(
  profile: CharacterSpriteProfile,
  input: CharacterAnimationSyncInput,
): CharacterAnimationAction {
  const { sheets } = profile;

  if (input.moved) {
    return pickMovementAction(sheets, input.isCarrying === true);
  }

  if (input.npcState === NpcAiState.WORKING && input.professionAction) {
    const workAction = resolveProfessionAnimationAction(input.professionAction, sheets);
    if (workAction) {
      return workAction;
    }
  }

  return pickIdleAction(sheets, input.isCarrying === true);
}

export function findSheetForAnimation(
  sheets: SpritesheetEntry[],
  action: CharacterAnimationAction,
  direction: import('@shared/characterAnimation').CharacterDirection,
): SpritesheetEntry | undefined {
  return sheets.find((sheet) => sheet.action === action && sheet.direction === direction);
}
