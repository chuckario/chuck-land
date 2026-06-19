import { HeroInterface, HeroRole, MAX_PLAYERS } from '../../shared/types';

export class EntityManager {
  private readonly heroes = new Map<string, HeroInterface>();
  private readonly socketToHeroId = new Map<string, string>();
  private readonly heroToSocketId = new Map<string, string>();

  get maxPlayers(): number {
    return MAX_PLAYERS;
  }

  get playerCount(): number {
    return this.heroes.size;
  }

  isFull(): boolean {
    return this.playerCount >= MAX_PLAYERS;
  }

  canJoin(): boolean {
    return !this.isFull();
  }

  hasHero(heroId: string): boolean {
    return this.heroes.has(heroId);
  }

  isSocketBound(socketId: string): boolean {
    return this.socketToHeroId.has(socketId);
  }

  addHero(hero: HeroInterface): boolean {
    if (this.isFull() || this.heroes.has(hero.id)) {
      return false;
    }

    this.heroes.set(hero.id, hero);
    return true;
  }

  removeHero(heroId: string): boolean {
    this.unbindHero(heroId);
    return this.heroes.delete(heroId);
  }

  bindSocket(socketId: string, heroId: string): boolean {
    if (!this.hasHero(heroId)) {
      return false;
    }

    if (this.socketToHeroId.has(socketId)) {
      return false;
    }

    const existingSocket = this.heroToSocketId.get(heroId);
    if (existingSocket && existingSocket !== socketId) {
      return false;
    }

    this.socketToHeroId.set(socketId, heroId);
    this.heroToSocketId.set(heroId, socketId);
    return true;
  }

  releaseSocket(socketId: string): string | undefined {
    const heroId = this.socketToHeroId.get(socketId);
    if (!heroId) {
      return undefined;
    }

    this.socketToHeroId.delete(socketId);
    this.heroToSocketId.delete(heroId);
    return heroId;
  }

  unbindHero(heroId: string): void {
    const socketId = this.heroToSocketId.get(heroId);
    if (!socketId) {
      return;
    }

    this.heroToSocketId.delete(heroId);
    this.socketToHeroId.delete(socketId);
  }

  getHeroIdBySocket(socketId: string): string | undefined {
    return this.socketToHeroId.get(socketId);
  }

  getHeroBySocket(socketId: string): HeroInterface | undefined {
    const heroId = this.getHeroIdBySocket(socketId);
    if (!heroId) {
      return undefined;
    }

    return this.getHero(heroId);
  }

  getSocketIdByHero(heroId: string): string | undefined {
    return this.heroToSocketId.get(heroId);
  }

  getHero(heroId: string): HeroInterface | undefined {
    return this.heroes.get(heroId);
  }

  getAllHeroes(): HeroInterface[] {
    return Array.from(this.heroes.values());
  }

  getHeroesByRole(role: HeroRole): HeroInterface[] {
    return this.getAllHeroes().filter((hero) => hero.role === role);
  }

  updateHero(heroId: string, updates: Partial<HeroInterface>): HeroInterface | undefined {
    const hero = this.heroes.get(heroId);
    if (!hero) {
      return undefined;
    }

    const updated = { ...hero, ...updates, id: hero.id };
    this.heroes.set(heroId, updated);
    return updated;
  }

  clear(): void {
    this.heroes.clear();
    this.socketToHeroId.clear();
    this.heroToSocketId.clear();
  }
}
