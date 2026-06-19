import { HeroInterface, HeroRole } from './types';

export function isMayor(hero: HeroInterface): boolean {
  return hero.role === HeroRole.MAYOR;
}

export function canIssueBuildOrders(hero: HeroInterface): boolean {
  return isMayor(hero);
}

export function isCitizen(hero: HeroInterface): boolean {
  return hero.role === HeroRole.CITIZEN;
}
