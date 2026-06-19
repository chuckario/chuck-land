import { ACTIVE_PROFESSIONS, Profession, ProfessionAction } from './types';

export const PROFESSION_LABELS: Record<Profession, string> = {
  [Profession.LUMBERJACK]: 'Holzfäller',
  [Profession.CARPENTER]: 'Schreiner',
  [Profession.HUNTER]: 'Jäger',
  [Profession.FARMER]: 'Farmer',
  [Profession.COOK]: 'Koch',
  [Profession.STONEMASON]: 'Steinmetz',
  [Profession.BUILDER]: 'Baumeister',
  [Profession.MAYOR]: 'Bürgermeister',
  [Profession.SOLDIER]: 'Soldat',
  [Profession.QUARRY_WORKER]: 'Steinbruch-Arbeiter',
  [Profession.LEATHERWORKER]: 'Lederer',
  [Profession.TAILOR]: 'Schneider',
  [Profession.BLACKSMITH]: 'Schmied',
  [Profession.RESERVED_PROFESSION_01]: 'Reserviert 01',
  [Profession.RESERVED_PROFESSION_02]: 'Reserviert 02',
  [Profession.RESERVED_PROFESSION_03]: 'Reserviert 03',
  [Profession.RESERVED_PROFESSION_04]: 'Reserviert 04',
  [Profession.RESERVED_PROFESSION_05]: 'Reserviert 05',
  [Profession.RESERVED_PROFESSION_06]: 'Reserviert 06',
  [Profession.RESERVED_PROFESSION_07]: 'Reserviert 07',
  [Profession.RESERVED_PROFESSION_08]: 'Reserviert 08',
  [Profession.RESERVED_PROFESSION_09]: 'Reserviert 09',
  [Profession.RESERVED_PROFESSION_10]: 'Reserviert 10',
  [Profession.RESERVED_PROFESSION_11]: 'Reserviert 11',
  [Profession.RESERVED_PROFESSION_12]: 'Reserviert 12',
  [Profession.RESERVED_PROFESSION_13]: 'Reserviert 13',
  [Profession.RESERVED_PROFESSION_14]: 'Reserviert 14',
  [Profession.RESERVED_PROFESSION_15]: 'Reserviert 15',
  [Profession.RESERVED_PROFESSION_16]: 'Reserviert 16',
  [Profession.RESERVED_PROFESSION_17]: 'Reserviert 17',
  [Profession.RESERVED_PROFESSION_18]: 'Reserviert 18',
  [Profession.RESERVED_PROFESSION_19]: 'Reserviert 19',
  [Profession.RESERVED_PROFESSION_20]: 'Reserviert 20',
};

export const PROFESSION_DEFAULT_ACTIONS: Record<Profession, ProfessionAction> = {
  [Profession.LUMBERJACK]: ProfessionAction.GATHER_WOOD,
  [Profession.CARPENTER]: ProfessionAction.PROCESS_WOOD,
  [Profession.HUNTER]: ProfessionAction.HUNT,
  [Profession.FARMER]: ProfessionAction.TEND_CROPS,
  [Profession.COOK]: ProfessionAction.PREPARE_FOOD,
  [Profession.STONEMASON]: ProfessionAction.CUT_STONE,
  [Profession.BUILDER]: ProfessionAction.CONSTRUCT,
  [Profession.MAYOR]: ProfessionAction.GOVERN,
  [Profession.SOLDIER]: ProfessionAction.PATROL,
  [Profession.QUARRY_WORKER]: ProfessionAction.MINE_QUARRY,
  [Profession.LEATHERWORKER]: ProfessionAction.TAN_LEATHER,
  [Profession.TAILOR]: ProfessionAction.SEW,
  [Profession.BLACKSMITH]: ProfessionAction.FORGE,
  [Profession.RESERVED_PROFESSION_01]: ProfessionAction.PLACEHOLDER,
  [Profession.RESERVED_PROFESSION_02]: ProfessionAction.PLACEHOLDER,
  [Profession.RESERVED_PROFESSION_03]: ProfessionAction.PLACEHOLDER,
  [Profession.RESERVED_PROFESSION_04]: ProfessionAction.PLACEHOLDER,
  [Profession.RESERVED_PROFESSION_05]: ProfessionAction.PLACEHOLDER,
  [Profession.RESERVED_PROFESSION_06]: ProfessionAction.PLACEHOLDER,
  [Profession.RESERVED_PROFESSION_07]: ProfessionAction.PLACEHOLDER,
  [Profession.RESERVED_PROFESSION_08]: ProfessionAction.PLACEHOLDER,
  [Profession.RESERVED_PROFESSION_09]: ProfessionAction.PLACEHOLDER,
  [Profession.RESERVED_PROFESSION_10]: ProfessionAction.PLACEHOLDER,
  [Profession.RESERVED_PROFESSION_11]: ProfessionAction.PLACEHOLDER,
  [Profession.RESERVED_PROFESSION_12]: ProfessionAction.PLACEHOLDER,
  [Profession.RESERVED_PROFESSION_13]: ProfessionAction.PLACEHOLDER,
  [Profession.RESERVED_PROFESSION_14]: ProfessionAction.PLACEHOLDER,
  [Profession.RESERVED_PROFESSION_15]: ProfessionAction.PLACEHOLDER,
  [Profession.RESERVED_PROFESSION_16]: ProfessionAction.PLACEHOLDER,
  [Profession.RESERVED_PROFESSION_17]: ProfessionAction.PLACEHOLDER,
  [Profession.RESERVED_PROFESSION_18]: ProfessionAction.PLACEHOLDER,
  [Profession.RESERVED_PROFESSION_19]: ProfessionAction.PLACEHOLDER,
  [Profession.RESERVED_PROFESSION_20]: ProfessionAction.PLACEHOLDER,
};

export function getProfessionLabel(profession: Profession): string {
  return PROFESSION_LABELS[profession];
}

export function getProfessionDefaultAction(profession: Profession): ProfessionAction {
  return PROFESSION_DEFAULT_ACTIONS[profession];
}

export function isReservedProfession(profession: Profession): boolean {
  return !ACTIVE_PROFESSIONS.includes(profession);
}
