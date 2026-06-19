import { HeroClass, HeroInterface, HeroRole, Race } from '../../shared/types';
import { randomUUID } from 'crypto';

export class HeroFactory {
  static createHero(
    name: string,
    classType: HeroClass,
    race: Race = Race.HUMAN,
    position: { x: number; y: number } = { x: 0, y: 0 },
    profileId?: string,
  ): HeroInterface {
    return {
      id: randomUUID(),
      name,
      classType,
      race,
      profileId,
      role: HeroRole.CITIZEN,
      position,
      level: 1,
      xp: 0,
      attributes: {
        strength: 10,
        agility: 10,
        intelligence: 10,
        spirit: 10,
      },
      skills: [],
    };
  }
}
