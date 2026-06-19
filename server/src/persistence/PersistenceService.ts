import { Logger } from '../logging/Logger';
import { PersistedWorldSnapshot } from '../state/stateTypes';
import { WorldStateManager } from '../state/WorldStateManager';
import { PersistenceAdapter } from './PersistenceAdapter';

export class PersistenceService {
  private persistTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly adapter: PersistenceAdapter,
    private readonly logger: Logger,
    private readonly intervalMs: number,
  ) {}

  async initialize(): Promise<void> {
    await this.adapter.initialize();
  }

  startAutoSave(getSnapshot: () => PersistedWorldSnapshot | null): void {
    this.persistTimer = setInterval(async () => {
      const snapshot = getSnapshot();
      if (!snapshot) {
        return;
      }

      try {
        await this.adapter.saveSnapshot(snapshot);
        this.logger.debug('Weltzustand persistiert', {
          lobbyId: snapshot.lobbyId,
          version: snapshot.version,
        });
      } catch (error) {
        this.logger.error('Persistenz fehlgeschlagen', { lobbyId: snapshot.lobbyId }, error);
      }
    }, this.intervalMs);
  }

  async load(lobbyId: string): Promise<PersistedWorldSnapshot | null> {
    try {
      return await this.adapter.loadLatestSnapshot(lobbyId);
    } catch (error) {
      this.logger.error('Laden des Weltzustands fehlgeschlagen', { lobbyId }, error);
      return null;
    }
  }

  async saveNow(
    stateManager: WorldStateManager,
    lobbyId: string,
    buildWorldState: () => import('../../../shared/types').WorldState,
  ): Promise<void> {
    const snapshot = stateManager.toPersistedSnapshot(lobbyId, buildWorldState());
    await this.adapter.saveSnapshot(snapshot);
  }

  stop(): void {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = null;
    }
  }

  async close(): Promise<void> {
    this.stop();
    await this.adapter.close();
  }
}
