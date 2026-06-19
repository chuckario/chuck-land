import { Namespace, Socket } from 'socket.io';
import { SOCKET_EVENTS, WorldState, WorldStateDelta } from '../../../shared/types';
import { Logger } from '../logging/Logger';
import { WorldStateManager } from '../state/WorldStateManager';

export class SyncBroadcaster {
  private syncTickCounter = 0;
  private readonly fullSyncEveryNTicks: number;

  constructor(
    private readonly namespace: Namespace,
    private readonly stateManager: WorldStateManager,
    private readonly logger: Logger,
    fullSyncEverySeconds = 30,
    syncRateHz = 10,
  ) {
    this.fullSyncEveryNTicks = Math.max(1, fullSyncEverySeconds * syncRateHz);
  }

  /** Sendet Weltzustand nur wenn sich etwas geändert hat oder Full-Sync fällig ist. */
  broadcast(current: WorldState): void {
    if (!this.stateManager.isDirty()) {
      return;
    }

    this.syncTickCounter += 1;
    const forceFull = this.syncTickCounter >= this.fullSyncEveryNTicks;

    if (forceFull) {
      this.syncTickCounter = 0;
    }

    const delta = this.stateManager.buildDelta(current, forceFull);

    if (delta.full) {
      this.namespace.emit(SOCKET_EVENTS.WORLD_STATE, delta.full);
    } else {
      this.namespace.emit(SOCKET_EVENTS.WORLD_STATE_DELTA, delta);
    }

    this.stateManager.clearDirty();
    this.logger.debug('Weltzustand synchronisiert', {
      version: delta.version,
      full: Boolean(delta.full),
    });
  }

  /** Sofortiger Full-Sync an einen einzelnen Client (Join/Reconnect). */
  sendFullToSocket(socket: Socket, state: WorldState): void {
    socket.emit(SOCKET_EVENTS.WORLD_STATE, state);
    this.logger.debug('Full-Sync an Client', { socketId: socket.id });
  }
}
