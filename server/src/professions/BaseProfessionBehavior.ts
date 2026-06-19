import {
  NpcAiState,
  NpcInterface,
  Profession,
  ProfessionAction,
  ResourceNodeType,
  TerrainType,
} from '../../../shared/types';
import { getGatherConfig, ProfessionGatherConfig } from '../../../shared/resourceConfig';
import { ProfessionContext } from './ProfessionContext';

export interface ProfessionBehaviorResult {
  state: NpcAiState;
  action: ProfessionAction;
  position?: { x: number; y: number };
}

export interface ProfessionBehavior {
  readonly profession: Profession;
  getDefaultAction(): ProfessionAction;
  tick(npc: NpcInterface, context: ProfessionContext): ProfessionBehaviorResult;
}

export abstract class BaseProfessionBehavior implements ProfessionBehavior {
  abstract readonly profession: Profession;
  abstract readonly primaryAction: ProfessionAction;
  abstract readonly workingState: NpcAiState;

  getDefaultAction(): ProfessionAction {
    return this.primaryAction;
  }

  tick(npc: NpcInterface, context: ProfessionContext): ProfessionBehaviorResult {
    return this.performWork(npc, context);
  }

  protected performWork(npc: NpcInterface, _context: ProfessionContext): ProfessionBehaviorResult {
    return this.createResult(npc, this.primaryAction, this.workingState);
  }

  protected createResult(
    npc: NpcInterface,
    action: ProfessionAction,
    state: NpcAiState,
    position?: { x: number; y: number },
  ): ProfessionBehaviorResult {
    return {
      state,
      action,
      position: position ?? npc.position,
    };
  }

  protected idle(npc: NpcInterface): ProfessionBehaviorResult {
    return this.createResult(npc, ProfessionAction.IDLE, NpcAiState.IDLE);
  }

  protected moveToward(
    npc: NpcInterface,
    target: { x: number; y: number },
    action: ProfessionAction,
  ): ProfessionBehaviorResult {
    return this.createResult(npc, action, NpcAiState.MOVING, target);
  }

  protected workAt(
    npc: NpcInterface,
    action: ProfessionAction,
    position?: { x: number; y: number },
  ): ProfessionBehaviorResult {
    return this.createResult(npc, action, NpcAiState.WORKING, position);
  }

  protected findNearbyTerrain(
    context: ProfessionContext,
    origin: { x: number; y: number },
    terrain: TerrainType,
  ): { x: number; y: number } | undefined {
    for (let radius = 0; radius <= 3; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const x = origin.x + dx;
          const y = origin.y + dy;
          if (context.worldManager.getTerrainAt(x, y) === terrain) {
            return { x, y };
          }
        }
      }
    }

    return undefined;
  }

  protected gatherFromResource(
    npc: NpcInterface,
    context: ProfessionContext,
    resourceType: ResourceNodeType,
    action: ProfessionAction,
  ): ProfessionBehaviorResult {
    const resource = context.resourceManager.findNearestResource(resourceType, npc.position);
    if (!resource) {
      return this.idle(npc);
    }

    if (npc.position.x !== resource.x || npc.position.y !== resource.y) {
      return this.moveToward(npc, { x: resource.x, y: resource.y }, action);
    }

    context.resourceManager.gather(resource.id, 1);
    return this.workAt(npc, action, { x: resource.x, y: resource.y });
  }

  protected gatherFromConfig(
    npc: NpcInterface,
    context: ProfessionContext,
    config?: ProfessionGatherConfig,
  ): ProfessionBehaviorResult {
    const gatherConfig = config ?? getGatherConfig(npc.profession);
    if (!gatherConfig) {
      return this.idle(npc);
    }

    const step = context.resourceManager.resolveGatherStep(
      npc.profession,
      npc.position,
      context.timestamp,
    );

    if (!step) {
      return this.idle(npc);
    }

    const atTarget = npc.position.x === step.target.x && npc.position.y === step.target.y;
    if (!atTarget) {
      return this.moveToward(npc, step.target, step.action);
    }

    return this.workAt(npc, step.action, step.target);
  }

  protected clampToMap(
    context: ProfessionContext,
    position: { x: number; y: number },
  ): { x: number; y: number } {
    const map = context.worldManager.getMap();
    return {
      x: Math.max(1, Math.min(map.width - 2, position.x)),
      y: Math.max(1, Math.min(map.height - 2, position.y)),
    };
  }
}
