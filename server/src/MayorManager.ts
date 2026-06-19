import { HeroInterface, HeroRole } from '../../shared/types';
import { EntityManager } from './EntityManager';

export class MayorManager {
  private mayorId: string | null = null;

  getMayorId(): string | null {
    return this.mayorId;
  }

  getMayor(entityManager: EntityManager): HeroInterface | undefined {
    if (!this.mayorId) {
      return undefined;
    }

    return entityManager.getHero(this.mayorId);
  }

  isMayor(heroId: string): boolean {
    return this.mayorId === heroId;
  }

  canIssueBuildOrders(heroId: string): boolean {
    return this.isMayor(heroId);
  }

  assignMayorOnJoin(heroId: string, entityManager: EntityManager): HeroInterface | undefined {
    if (this.mayorId) {
      return entityManager.getHero(heroId);
    }

    this.mayorId = heroId;
    return entityManager.updateHero(heroId, { role: HeroRole.MAYOR });
  }

  handleMayorDisconnect(heroId: string, entityManager: EntityManager): HeroInterface | undefined {
    if (!this.isMayor(heroId)) {
      return undefined;
    }

    entityManager.updateHero(heroId, { role: HeroRole.CITIZEN });
    this.mayorId = null;

    const nextMayor = entityManager.getAllHeroes().find((hero) => hero.id !== heroId);
    if (!nextMayor) {
      return undefined;
    }

    this.mayorId = nextMayor.id;
    return entityManager.updateHero(nextMayor.id, { role: HeroRole.MAYOR });
  }

  restoreMayor(mayorId: string, entityManager: EntityManager): void {
    this.mayorId = mayorId;
    for (const hero of entityManager.getAllHeroes()) {
      entityManager.updateHero(hero.id, {
        role: hero.id === mayorId ? HeroRole.MAYOR : HeroRole.CITIZEN,
      });
    }
  }
}
