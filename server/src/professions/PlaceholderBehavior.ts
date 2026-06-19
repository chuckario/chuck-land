import { isReservedProfession } from '../../../shared/professionConfig';
import { NpcAiState, NpcInterface, ProfessionAction } from '../../../shared/types';
import { ProfessionBehaviorResult } from './BaseProfessionBehavior';

export function createPlaceholderResult(npc: NpcInterface): ProfessionBehaviorResult {
  return {
    state: NpcAiState.IDLE,
    action: ProfessionAction.PLACEHOLDER,
    position: npc.position,
  };
}

export function shouldUsePlaceholderBehavior(profession: NpcInterface['profession']): boolean {
  return isReservedProfession(profession);
}
