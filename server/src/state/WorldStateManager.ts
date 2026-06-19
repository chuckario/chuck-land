import { WorldState } from '../../../shared/types';
import {
  createDirtyFlags,
  DirtyFlags,
  PersistedWorldSnapshot,
  WorldStateDelta,
} from './stateTypes';

export class WorldStateManager {
  private version = 0;
  private dirty: DirtyFlags = createDirtyFlags(true);
  private lastSnapshot: WorldState | null = null;

  getVersion(): number {
    return this.version;
  }

  markDirty(scope: keyof DirtyFlags): void {
    this.dirty[scope] = true;
  }

  markAllDirty(): void {
    this.dirty = createDirtyFlags(true);
  }

  clearDirty(): void {
    this.dirty = createDirtyFlags(false);
  }

  isDirty(): boolean {
    return Object.values(this.dirty).some(Boolean);
  }

  /** Wird nach jedem Simulation-Tick aufgerufen, wenn sich der Zustand geändert hat. */
  advanceVersion(): number {
    this.version += 1;
    return this.version;
  }

  buildDelta(current: WorldState, forceFull: boolean): WorldStateDelta {
    const delta: WorldStateDelta = {
      version: this.version,
      timestamp: current.timestamp,
    };

    if (forceFull || !this.lastSnapshot) {
      delta.full = current;
      this.lastSnapshot = structuredClone(current);
      return delta;
    }

    if (this.dirty.meta) {
      delta.playerCount = current.playerCount;
    }

    if (this.dirty.mayor) {
      delta.mayorId = current.mayorId;
    }

    if (this.dirty.heroes) {
      delta.heroes = current.heroes;
    }

    if (this.dirty.npcs) {
      delta.npcs = current.npcs;
    }

    if (this.dirty.resources) {
      delta.resources = current.resources;
    }

    if (this.dirty.buildings) {
      delta.buildOrders = current.buildOrders;
      delta.buildings = current.buildings;
    }

    this.lastSnapshot = structuredClone(current);
    return delta;
  }

  toPersistedSnapshot(
    lobbyId: string,
    current: WorldState,
  ): PersistedWorldSnapshot {
    return {
      lobbyId,
      version: this.version,
      savedAt: Date.now(),
      mayorId: current.mayorId,
      heroes: current.heroes,
      npcs: current.npcs,
      resources: current.resources,
      buildOrders: current.buildOrders,
      buildings: current.buildings,
    };
  }

  resetFromPersisted(snapshot: PersistedWorldSnapshot): void {
    this.version = snapshot.version;
    this.markAllDirty();
  }
}
