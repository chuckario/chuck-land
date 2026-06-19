import {
  BuildOrderInterface,
  BuildingInterface,
  HeroInterface,
  NpcInterface,
  ResourceNodeInterface,
  WorldState,
} from '../../../shared/types';

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

export interface WorldStateDelta {
  version: number;
  timestamp: number;
  /** Vollständiger Zustand bei version=1 oder periodischem Full-Sync */
  full?: WorldState;
  /** Nur geänderte Entitäten bei inkrementellem Sync */
  heroes?: HeroInterface[];
  npcs?: NpcInterface[];
  resources?: ResourceNodeInterface[];
  buildOrders?: BuildOrderInterface[];
  buildings?: BuildingInterface[];
  mayorId?: string | null;
  playerCount?: number;
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
