import { isGatheringProfession } from '@shared/resourceConfig';
import { getProfessionLabel, isReservedProfession } from '@shared/professionConfig';
import { NpcAiState, Profession } from '@shared/types';

export const GATHERING_NPC_COLOR = 0x22c55e;
export const DEFAULT_NPC_COLOR = 0xa855f7;

export const NPC_STATE_COLORS: Record<NpcAiState, number> = {
  [NpcAiState.IDLE]: 0x94a3b8,
  [NpcAiState.MOVING]: 0x38bdf8,
  [NpcAiState.WORKING]: 0xf59e0b,
  [NpcAiState.WAITING]: 0xc084fc,
};

export function getNpcColor(profession: Profession, state: NpcAiState): number {
  if (state === NpcAiState.WORKING && isGatheringProfession(profession)) {
    return GATHERING_NPC_COLOR;
  }

  return NPC_STATE_COLORS[state] ?? DEFAULT_NPC_COLOR;
}

export function getNpcLabel(profession: Profession): string {
  if (isReservedProfession(profession)) {
    return '';
  }

  return getProfessionLabel(profession);
}
