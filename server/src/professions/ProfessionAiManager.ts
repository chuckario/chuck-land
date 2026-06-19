import { BuildingManager } from '../BuildingManager';
import { ResourceManager } from '../ResourceManager';
import { WorldManager } from '../WorldManager';
import { isReservedProfession } from '../../../shared/professionConfig';
import { NpcInterface } from '../../../shared/types';
import { ProfessionBehaviorResult } from './BaseProfessionBehavior';
import { NpcManager } from './NpcManager';
import { createPlaceholderResult } from './PlaceholderBehavior';
import { ProfessionContext } from './ProfessionContext';
import { ProfessionRegistry } from './ProfessionRegistry';

export class ProfessionAiManager {
  private readonly registry: ProfessionRegistry;
  private readonly npcManager: NpcManager;
  private tickCount = 0;

  constructor(registry?: ProfessionRegistry, npcManager?: NpcManager) {
    this.registry = registry ?? new ProfessionRegistry();
    this.npcManager = npcManager ?? new NpcManager(this.registry);
  }

  getRegistry(): ProfessionRegistry {
    return this.registry;
  }

  getNpcManager(): NpcManager {
    return this.npcManager;
  }

  getTickCount(): number {
    return this.tickCount;
  }

  initialize(worldManager: WorldManager, resourceManager: ResourceManager): void {
    resourceManager.initializeFromWorld(worldManager);

    if (this.npcManager.getAllNpcs().length > 0) {
      return;
    }

    this.npcManager.spawnStarterNpcs(worldManager, resourceManager);
  }

  tick(
    worldManager: WorldManager,
    buildingManager: BuildingManager,
    resourceManager: ResourceManager,
  ): void {
    this.tickCount += 1;

    const context = this.createContext(worldManager, buildingManager, resourceManager);

    this.npcManager.getAllNpcs().forEach((npc) => {
      const result = this.executeBehaviorForNpc(npc, context);
      this.applyBehaviorResult(npc.id, result);
    });
  }

  private createContext(
    worldManager: WorldManager,
    buildingManager: BuildingManager,
    resourceManager: ResourceManager,
  ): ProfessionContext {
    return {
      worldManager,
      buildingManager,
      resourceManager,
      timestamp: Date.now(),
    };
  }

  private executeBehaviorForNpc(
    npc: NpcInterface,
    context: ProfessionContext,
  ): ProfessionBehaviorResult {
    if (isReservedProfession(npc.profession)) {
      return createPlaceholderResult(npc);
    }

    const behavior = this.registry.get(npc.profession);
    if (!behavior) {
      return createPlaceholderResult(npc);
    }

    return behavior.tick(npc, context);
  }

  private applyBehaviorResult(npcId: string, result: ProfessionBehaviorResult): void {
    this.npcManager.updateNpc(npcId, {
      state: result.state,
      currentAction: result.action,
      position: result.position,
    });
  }
}
