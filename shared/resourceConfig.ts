import { Profession, ProfessionAction, ResourceNodeType } from './types';
export const RESOURCE_NODE_LABELS: Record<ResourceNodeType, string> = {
  [ResourceNodeType.TREE]: 'Baum',
  [ResourceNodeType.STONE_NODE]: 'Stein',
  [ResourceNodeType.IRON_ORE]: 'Eisenerz',
  [ResourceNodeType.WILD_GAME]: 'Wild',
  [ResourceNodeType.CROP]: 'Ernte',
};

export const RESOURCE_DEFAULT_AMOUNT: Record<ResourceNodeType, number> = {
  [ResourceNodeType.TREE]: 8,
  [ResourceNodeType.STONE_NODE]: 6,
  [ResourceNodeType.IRON_ORE]: 5,
  [ResourceNodeType.WILD_GAME]: 3,
  [ResourceNodeType.CROP]: 4,
};

export interface ProfessionGatherConfig {
  profession: Profession;
  professionLabel: string;
  resourceType: ResourceNodeType;
  resourceLabel: string;
  action: ProfessionAction;
  fallbackResourceType?: ResourceNodeType;
  fallbackResourceLabel?: string;
  harvestAction?: ProfessionAction;
}

/**
 * Sammel-Logik für Berufe — Beruf, Ziel-Ressource und Aktion.
 *
 * | Beruf              | Ziel-Ressource | Aktion                    |
 * |--------------------|----------------|---------------------------|
 * | Holzfäller         | Baum           | GATHER_WOOD               |
 * | Steinmetz          | Stein          | CUT_STONE                 |
 * | Steinbruch-Arbeiter| Eisenerz       | MINE_QUARRY (Fallback: Stein) |
 * | Jäger              | Wild           | HUNT                      |
 * | Farmer             | Ernte          | TEND_CROPS / HARVEST      |
 */
export const professionConfigs: ProfessionGatherConfig[] = [
  {
    profession: Profession.LUMBERJACK,
    professionLabel: 'Holzfäller',
    resourceType: ResourceNodeType.TREE,
    resourceLabel: 'Baum',
    action: ProfessionAction.GATHER_WOOD,
  },
  {
    profession: Profession.STONEMASON,
    professionLabel: 'Steinmetz',
    resourceType: ResourceNodeType.STONE_NODE,
    resourceLabel: 'Stein',
    action: ProfessionAction.CUT_STONE,
  },
  {
    profession: Profession.QUARRY_WORKER,
    professionLabel: 'Steinbruch-Arbeiter',
    resourceType: ResourceNodeType.IRON_ORE,
    resourceLabel: 'Eisenerz',
    action: ProfessionAction.MINE_QUARRY,
    fallbackResourceType: ResourceNodeType.STONE_NODE,
    fallbackResourceLabel: 'Stein',
  },
  {
    profession: Profession.HUNTER,
    professionLabel: 'Jäger',
    resourceType: ResourceNodeType.WILD_GAME,
    resourceLabel: 'Wild',
    action: ProfessionAction.HUNT,
  },
  {
    profession: Profession.FARMER,
    professionLabel: 'Farmer',
    resourceType: ResourceNodeType.CROP,
    resourceLabel: 'Ernte',
    action: ProfessionAction.TEND_CROPS,
    harvestAction: ProfessionAction.HARVEST,
  },
];
/** @deprecated Verwende `professionConfigs`. */
export const PROFESSION_GATHER_CONFIG = professionConfigs;

export const PROFESSION_GATHER_CONFIG_MAP: Record<Profession, ProfessionGatherConfig | undefined> =
  professionConfigs.reduce(
    (map, entry) => {
      map[entry.profession] = entry;
      return map;
    },
    {} as Record<Profession, ProfessionGatherConfig | undefined>,
  );

export const PROFESSION_GATHER_TARGETS: Partial<Record<Profession, ResourceNodeType>> =
  professionConfigs.reduce(
    (map, entry) => {
      map[entry.profession] = entry.resourceType;
      return map;
    },
    {} as Partial<Record<Profession, ResourceNodeType>>,
  );

export function getResourceLabel(type: ResourceNodeType): string {
  return RESOURCE_NODE_LABELS[type];
}

export function getGatherConfig(profession: Profession): ProfessionGatherConfig | undefined {
  return PROFESSION_GATHER_CONFIG_MAP[profession];
}

export function getGatherTargetForProfession(profession: Profession): ResourceNodeType | undefined {
  return getGatherConfig(profession)?.resourceType;
}

export function getGatherActionForProfession(profession: Profession): ProfessionAction | undefined {
  return getGatherConfig(profession)?.action;
}

export function isGatheringProfession(profession: Profession): boolean {
  return PROFESSION_GATHER_CONFIG_MAP[profession] !== undefined;
}

export function findNearestGatherResource(
  findNearest: (type: ResourceNodeType, origin: { x: number; y: number }) => { id: string } | undefined,
  config: ProfessionGatherConfig,
  origin: { x: number; y: number },
): { id: string; type: ResourceNodeType } | undefined {
  const primary = findNearest(config.resourceType, origin);
  if (primary) {
    return { id: primary.id, type: config.resourceType };
  }

  if (config.fallbackResourceType) {
    const fallback = findNearest(config.fallbackResourceType, origin);
    if (fallback) {
      return { id: fallback.id, type: config.fallbackResourceType };
    }
  }

  return undefined;
}
