import { randomUUID } from 'crypto';
import { getProfessionDefaultAction, PROFESSION_LABELS } from '../../../shared/professionConfig';
import { NpcAiState, NpcInterface, Profession, ProfessionAction } from '../../../shared/types';
import { ProfessionRegistry } from './ProfessionRegistry';

export class NpcFactory {
  static createNpc(
    profession: Profession,
    position: { x: number; y: number },
    name?: string,
    registry?: ProfessionRegistry,
  ): NpcInterface {
    const behavior = registry?.get(profession);
    const currentAction = behavior?.getDefaultAction()
      ?? getProfessionDefaultAction(profession);

    return {
      id: randomUUID(),
      name: name ?? PROFESSION_LABELS[profession],
      profession,
      position,
      state: NpcAiState.IDLE,
      currentAction,
    };
  }
}
