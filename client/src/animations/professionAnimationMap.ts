import {
  CharacterAnimationAction,
  SpritesheetEntry,
} from '@shared/characterAnimation';
import { ProfessionAction } from '@shared/types';
import { hasAction } from './characterAnimationUtils';

const PROFESSION_ACTION_PRIORITY: Partial<Record<ProfessionAction, CharacterAnimationAction[]>> = {
  [ProfessionAction.GATHER_WOOD]: [CharacterAnimationAction.SLICE, CharacterAnimationAction.COLLECT],
  [ProfessionAction.PROCESS_WOOD]: [CharacterAnimationAction.CRUSH, CharacterAnimationAction.SLICE],
  [ProfessionAction.HUNT]: [CharacterAnimationAction.PIERCE, CharacterAnimationAction.SLICE],
  [ProfessionAction.TEND_CROPS]: [CharacterAnimationAction.WATERING, CharacterAnimationAction.COLLECT],
  [ProfessionAction.HARVEST]: [CharacterAnimationAction.COLLECT, CharacterAnimationAction.WATERING],
  [ProfessionAction.PREPARE_FOOD]: [CharacterAnimationAction.SLICE, CharacterAnimationAction.COLLECT],
  [ProfessionAction.CUT_STONE]: [CharacterAnimationAction.CRUSH, CharacterAnimationAction.PIERCE],
  [ProfessionAction.CONSTRUCT]: [CharacterAnimationAction.CRUSH, CharacterAnimationAction.COLLECT],
  [ProfessionAction.GOVERN]: [CharacterAnimationAction.IDLE],
  [ProfessionAction.PATROL]: [CharacterAnimationAction.IDLE],
  [ProfessionAction.MINE_QUARRY]: [CharacterAnimationAction.PIERCE, CharacterAnimationAction.CRUSH],
  [ProfessionAction.TAN_LEATHER]: [CharacterAnimationAction.SLICE, CharacterAnimationAction.COLLECT],
  [ProfessionAction.SEW]: [CharacterAnimationAction.SLICE],
  [ProfessionAction.FORGE]: [CharacterAnimationAction.CRUSH],
  [ProfessionAction.IDLE]: [CharacterAnimationAction.IDLE],
  [ProfessionAction.PLACEHOLDER]: [CharacterAnimationAction.IDLE],
};

export function resolveProfessionAnimationAction(
  professionAction: ProfessionAction,
  sheets: SpritesheetEntry[],
): CharacterAnimationAction | null {
  const candidates = PROFESSION_ACTION_PRIORITY[professionAction] ?? [CharacterAnimationAction.IDLE];

  for (const candidate of candidates) {
    if (hasAction(sheets, candidate)) {
      return candidate;
    }
  }

  return null;
}

export function isLoopingWorkAction(action: CharacterAnimationAction): boolean {
  return action === CharacterAnimationAction.IDLE
    || action === CharacterAnimationAction.WALK
    || action === CharacterAnimationAction.RUN;
}
