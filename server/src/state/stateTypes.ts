import {
  BuildOrderInterface,
  BuildingInterface,
  HeroInterface,
  NpcInterface,
  ResourceNodeInterface,
  WorldState,
  WorldStateDelta,
} from '../../../shared/types';

export type { WorldStateDelta } from '../../../shared/types';

/** Persistierbarer Snapshot des dynamischen Weltzustands (Karte ist deterministisch). */
export interface PersistedWorldSnapshot {
  lobbyId: string;
  version: number;
  savedAt: number;
  mayorId: string | null;
  heroes: HeroInterface[];
  npcs: NpcInterface[];
  resources: ResourceNodeInterface[];
  buildOrders: BuildOrderInterface[];
  buildings: BuildingInterface[];
}

export type DirtyFlags = {
  heroes: boolean;
  npcs: boolean;
  resources: boolean;
  buildings: boolean;
  mayor: boolean;
  meta: boolean;
};

export function createDirtyFlags(all = false): DirtyFlags {
  return {
    heroes: all,
    npcs: all,
    resources: all,
    buildings: all,
    mayor: all,
    meta: all,
  };
}
