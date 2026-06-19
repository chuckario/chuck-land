import { WorldState, WorldStateDelta } from '@shared/types';

export class WorldStateStore {
  private state: WorldState | null = null;
  private version = 0;

  get current(): WorldState | null {
    return this.state;
  }

  get currentVersion(): number {
    return this.version;
  }

  applyFull(state: WorldState, version = 0): WorldState {
    this.state = state;
    this.version = version;
    return state;
  }

  applyDelta(delta: WorldStateDelta): WorldState | null {
    if (delta.full) {
      return this.applyFull(delta.full, delta.version);
    }

    if (!this.state) {
      return null;
    }

    const next: WorldState = {
      ...this.state,
      timestamp: delta.timestamp,
    };

    if (delta.heroes !== undefined) {
      next.heroes = delta.heroes;
    }
    if (delta.npcs !== undefined) {
      next.npcs = delta.npcs;
    }
    if (delta.resources !== undefined) {
      next.resources = delta.resources;
    }
    if (delta.buildOrders !== undefined) {
      next.buildOrders = delta.buildOrders;
    }
    if (delta.buildings !== undefined) {
      next.buildings = delta.buildings;
    }
    if (delta.mayorId !== undefined) {
      next.mayorId = delta.mayorId;
    }
    if (delta.playerCount !== undefined) {
      next.playerCount = delta.playerCount;
    }

    this.state = next;
    this.version = delta.version;
    return next;
  }

  reset(): void {
    this.state = null;
    this.version = 0;
  }
}
