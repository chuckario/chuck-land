import {
  DEFAULT_CHARACTER_PROFILE_ID,
  EntityVisualType,
  SpriteManifestBundle,
} from './characterAnimation';
import { HeroClass } from './types';

/** Maps sprite manifest profile IDs to gameplay hero classes. */
export const PROFILE_HERO_CLASS_MAP: Partial<Record<string, HeroClass>> = {
  'class:body-a': HeroClass.ARCHER,
  'class:knight': HeroClass.WARRIOR,
  'class:rogue': HeroClass.ROGUE,
  'class:wizzard': HeroClass.ARCANE_MAGE,
};

export interface PlayableClassOption {
  profileId: string;
  heroClass: HeroClass;
  label: string;
}

export function getPlayableClassOptions(
  bundle: SpriteManifestBundle | null | undefined,
): PlayableClassOption[] {
  if (!bundle) {
    return [];
  }

  return bundle.profiles
    .filter((profile) => profile.entityType === EntityVisualType.CLASS)
    .map((profile) => ({
      profileId: profile.profileId,
      heroClass: PROFILE_HERO_CLASS_MAP[profile.profileId] ?? HeroClass.WARRIOR,
      label: profile.label,
    }));
}

export function resolveHeroProfileId(hero: {
  classType: HeroClass;
  profileId?: string;
}): string {
  if (hero.profileId) {
    return hero.profileId;
  }

  const match = Object.entries(PROFILE_HERO_CLASS_MAP).find(
    ([, heroClass]) => heroClass === hero.classType,
  );

  return match?.[0] ?? DEFAULT_CHARACTER_PROFILE_ID;
}
