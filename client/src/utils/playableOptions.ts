import { HeroClass } from '@shared/types';

export function formatEnumLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

export const CLASS_COLORS: Record<HeroClass, number> = {
  [HeroClass.FIRE_MAGE]: 0xe74c3c,
  [HeroClass.WATER_MAGE]: 0x3498db,
  [HeroClass.ARCANE_MAGE]: 0x9b59b6,
  [HeroClass.WARRIOR]: 0x95a5a6,
  [HeroClass.ARCHER]: 0x27ae60,
  [HeroClass.ROGUE]: 0x2c3e50,
  [HeroClass.PALADIN]: 0xf1c40f,
  [HeroClass.DRUID]: 0x1abc9c,
  [HeroClass.PRIEST]: 0xecf0f1,
  [HeroClass.SUMMONER]: 0xe67e22,
  [HeroClass.NECROMANCER]: 0x4a235a,
  [HeroClass.VAMPIRE]: 0x922b21,
  [HeroClass.WEREWOLF]: 0x566573,
  [HeroClass.RESERVED_01]: 0x333333,
  [HeroClass.RESERVED_02]: 0x333333,
  [HeroClass.RESERVED_03]: 0x333333,
  [HeroClass.RESERVED_04]: 0x333333,
  [HeroClass.RESERVED_05]: 0x333333,
  [HeroClass.RESERVED_06]: 0x333333,
  [HeroClass.RESERVED_07]: 0x333333,
  [HeroClass.RESERVED_08]: 0x333333,
  [HeroClass.RESERVED_09]: 0x333333,
  [HeroClass.RESERVED_10]: 0x333333,
  [HeroClass.RESERVED_11]: 0x333333,
  [HeroClass.RESERVED_12]: 0x333333,
  [HeroClass.RESERVED_13]: 0x333333,
  [HeroClass.RESERVED_14]: 0x333333,
  [HeroClass.RESERVED_15]: 0x333333,
  [HeroClass.RESERVED_16]: 0x333333,
  [HeroClass.RESERVED_17]: 0x333333,
  [HeroClass.RESERVED_18]: 0x333333,
  [HeroClass.RESERVED_19]: 0x333333,
  [HeroClass.RESERVED_20]: 0x333333,
};
