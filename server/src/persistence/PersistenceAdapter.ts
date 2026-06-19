import { PersistedWorldSnapshot } from '../state/stateTypes';

export interface PersistenceAdapter {
  initialize(): Promise<void>;
  saveSnapshot(snapshot: PersistedWorldSnapshot): Promise<void>;
  loadLatestSnapshot(lobbyId: string): Promise<PersistedWorldSnapshot | null>;
  close(): Promise<void>;
}
