import { BuildingType, NpcAiState, NpcInterface, Profession, ProfessionAction, TerrainType } from '../../../shared/types';
import { BaseProfessionBehavior, ProfessionBehaviorResult } from './BaseProfessionBehavior';
import { ProfessionContext } from './ProfessionContext';

export class LumberjackBehavior extends BaseProfessionBehavior {
  readonly profession = Profession.LUMBERJACK;
  readonly primaryAction = ProfessionAction.GATHER_WOOD;
  readonly workingState = NpcAiState.WORKING;

  tick(npc: NpcInterface, context: ProfessionContext): ProfessionBehaviorResult {
    return this.gatherFromConfig(npc, context);
  }
}

export class CarpenterBehavior extends BaseProfessionBehavior {
  readonly profession = Profession.CARPENTER;
  readonly primaryAction = ProfessionAction.PROCESS_WOOD;
  readonly workingState = NpcAiState.WORKING;

  tick(npc: NpcInterface, context: ProfessionContext): ProfessionBehaviorResult {
    const workshopTile = this.findNearbyTerrain(context, npc.position, TerrainType.STONE)
      ?? this.findNearbyTerrain(context, npc.position, TerrainType.DIRT);

    return this.workAt(npc, ProfessionAction.PROCESS_WOOD, workshopTile ?? npc.position);
  }
}

export class HunterBehavior extends BaseProfessionBehavior {
  readonly profession = Profession.HUNTER;
  readonly primaryAction = ProfessionAction.HUNT;
  readonly workingState = NpcAiState.MOVING;

  tick(npc: NpcInterface, context: ProfessionContext): ProfessionBehaviorResult {
    return this.gatherFromConfig(npc, context);
  }
}

export class FarmerBehavior extends BaseProfessionBehavior {
  readonly profession = Profession.FARMER;
  readonly primaryAction = ProfessionAction.TEND_CROPS;
  readonly workingState = NpcAiState.WORKING;

  tick(npc: NpcInterface, context: ProfessionContext): ProfessionBehaviorResult {
    return this.gatherFromConfig(npc, context);
  }
}

export class CookBehavior extends BaseProfessionBehavior {
  readonly profession = Profession.COOK;
  readonly primaryAction = ProfessionAction.PREPARE_FOOD;
  readonly workingState = NpcAiState.WORKING;

  tick(npc: NpcInterface, context: ProfessionContext): ProfessionBehaviorResult {
    const kitchenTile = context.buildingManager.getAllBuildings().find(
      (building) => building.buildingType === BuildingType.FARM || building.buildingType === BuildingType.HOUSE,
    );

    if (!kitchenTile) {
      return this.workAt(npc, ProfessionAction.PREPARE_FOOD, npc.position);
    }

    return this.workAt(npc, ProfessionAction.PREPARE_FOOD, { x: kitchenTile.x, y: kitchenTile.y });
  }
}

export class StonemasonBehavior extends BaseProfessionBehavior {
  readonly profession = Profession.STONEMASON;
  readonly primaryAction = ProfessionAction.CUT_STONE;
  readonly workingState = NpcAiState.WORKING;

  tick(npc: NpcInterface, context: ProfessionContext): ProfessionBehaviorResult {
    return this.gatherFromConfig(npc, context);
  }
}

export class BuilderBehavior extends BaseProfessionBehavior {
  readonly profession = Profession.BUILDER;
  readonly primaryAction = ProfessionAction.CONSTRUCT;
  readonly workingState = NpcAiState.WORKING;

  tick(npc: NpcInterface, context: ProfessionContext): ProfessionBehaviorResult {
    const buildSite = context.buildingManager.getAllBuildings().at(-1);
    if (!buildSite) {
      return this.idle(npc);
    }

    return this.workAt(npc, ProfessionAction.CONSTRUCT, { x: buildSite.x, y: buildSite.y });
  }
}

export class MayorNpcBehavior extends BaseProfessionBehavior {
  readonly profession = Profession.MAYOR;
  readonly primaryAction = ProfessionAction.GOVERN;
  readonly workingState = NpcAiState.WAITING;

  tick(npc: NpcInterface, context: ProfessionContext): ProfessionBehaviorResult {
    const townHall = context.buildingManager.getAllBuildings().find(
      (building) => building.buildingType === BuildingType.TOWN_HALL,
    );

    if (townHall) {
      return this.createResult(npc, ProfessionAction.GOVERN, NpcAiState.WAITING, {
        x: townHall.x,
        y: townHall.y,
      });
    }

    return this.createResult(npc, ProfessionAction.GOVERN, NpcAiState.WAITING);
  }
}

export class SoldierBehavior extends BaseProfessionBehavior {
  readonly profession = Profession.SOLDIER;
  readonly primaryAction = ProfessionAction.PATROL;
  readonly workingState = NpcAiState.MOVING;

  tick(npc: NpcInterface, context: ProfessionContext): ProfessionBehaviorResult {
    const target = this.clampToMap(context, {
      x: npc.position.x + (context.timestamp % 3 === 0 ? 1 : 0),
      y: npc.position.y + (context.timestamp % 5 === 0 ? 1 : 0),
    });

    return this.moveToward(npc, target, ProfessionAction.PATROL);
  }
}

export class QuarryWorkerBehavior extends BaseProfessionBehavior {
  readonly profession = Profession.QUARRY_WORKER;
  readonly primaryAction = ProfessionAction.MINE_QUARRY;
  readonly workingState = NpcAiState.WORKING;

  tick(npc: NpcInterface, context: ProfessionContext): ProfessionBehaviorResult {
    return this.gatherFromConfig(npc, context);
  }
}

export class LeatherworkerBehavior extends BaseProfessionBehavior {
  readonly profession = Profession.LEATHERWORKER;
  readonly primaryAction = ProfessionAction.TAN_LEATHER;
  readonly workingState = NpcAiState.WORKING;

  tick(npc: NpcInterface, context: ProfessionContext): ProfessionBehaviorResult {
    return this.workAt(npc, ProfessionAction.TAN_LEATHER, npc.position);
  }
}

export class TailorBehavior extends BaseProfessionBehavior {
  readonly profession = Profession.TAILOR;
  readonly primaryAction = ProfessionAction.SEW;
  readonly workingState = NpcAiState.WORKING;

  tick(npc: NpcInterface, context: ProfessionContext): ProfessionBehaviorResult {
    return this.workAt(npc, ProfessionAction.SEW, npc.position);
  }
}

export class BlacksmithBehavior extends BaseProfessionBehavior {
  readonly profession = Profession.BLACKSMITH;
  readonly primaryAction = ProfessionAction.FORGE;
  readonly workingState = NpcAiState.WORKING;

  tick(npc: NpcInterface, context: ProfessionContext): ProfessionBehaviorResult {
    const forgeTile = this.findNearbyTerrain(context, npc.position, TerrainType.STONE)
      ?? npc.position;

    return this.workAt(npc, ProfessionAction.FORGE, forgeTile);
  }
}

export class ReservedProfessionBehavior extends BaseProfessionBehavior {
  readonly profession: Profession;
  readonly primaryAction = ProfessionAction.PLACEHOLDER;
  readonly workingState = NpcAiState.IDLE;

  constructor(profession: Profession) {
    super();
    this.profession = profession;
  }

  tick(npc: NpcInterface, _context: ProfessionContext): ProfessionBehaviorResult {
    return this.createResult(npc, ProfessionAction.PLACEHOLDER, NpcAiState.IDLE);
  }
}
