import { serverConfig } from '../config/serverConfig';
import { GameError } from '../errors/GameError';
import { Logger } from '../logging/Logger';
import { PersistedWorldSnapshot } from '../state/stateTypes';
import { PlayerSession, SessionManager } from '../security/SessionManager';
import { PlayerJoinPayload } from '../security/InputValidator';
import {
  BuildOrderRequest,
  HeroInterface,
  Race,
  SOCKET_EVENTS,
  WorldState,
} from '../../../shared/types';
import { CharacterDirection } from '../../../shared/characterAnimation';
import { BuildingManager } from '../BuildingManager';
import { EntityManager } from '../EntityManager';
import { EnemyManager } from '../EnemyManager';
import { HeroFactory } from '../HeroFactory';
import { HeroMovementManager } from '../HeroMovementManager';
import { MayorManager } from '../MayorManager';
import { ResourceManager } from '../ResourceManager';
import { WorldManager } from '../WorldManager';
import { ProfessionAiManager } from '../professions/ProfessionAiManager';
import { WorldStateManager } from '../state/WorldStateManager';

export interface JoinResult {
  hero: HeroInterface;
  session: PlayerSession;
  mayorChanged: boolean;
}

export interface BuildOrderBroadcast {
  order: NonNullable<ReturnType<BuildingManager['issueBuildOrderFromSocket']>['order']>;
  building: NonNullable<ReturnType<BuildingManager['issueBuildOrderFromSocket']>['building']>;
}

export class GameRoom {
  readonly id: string;
  readonly entityManager: EntityManager;
  readonly worldManager: WorldManager;
  readonly mayorManager: MayorManager;
  readonly buildingManager: BuildingManager;
  readonly resourceManager: ResourceManager;
  readonly professionAiManager: ProfessionAiManager;
  readonly heroMovementManager: HeroMovementManager;
  readonly enemyManager: EnemyManager;
  readonly stateManager: WorldStateManager;

  private readonly logger: Logger;
  private readonly maxPlayers: number;

  constructor(
    id: string,
    logger: Logger,
    maxPlayers = serverConfig.maxPlayersPerLobby,
  ) {
    this.id = id;
    this.maxPlayers = maxPlayers;
    this.logger = logger.child(`room:${id}`);
    this.stateManager = new WorldStateManager();

    this.entityManager = new EntityManager();
    this.worldManager = new WorldManager();
    this.mayorManager = new MayorManager();
    this.buildingManager = new BuildingManager();
    this.resourceManager = new ResourceManager();
    this.professionAiManager = new ProfessionAiManager();
    this.heroMovementManager = new HeroMovementManager(
      this.entityManager,
      this.worldManager,
      this.buildingManager,
    );
    this.enemyManager = new EnemyManager();

    this.professionAiManager.initialize(this.worldManager, this.resourceManager);
    this.enemyManager.initializeFromWorld(this.worldManager);
  }

  get playerCount(): number {
    return this.entityManager.playerCount;
  }

  canJoin(): boolean {
    return this.entityManager.canJoin();
  }

  simulateTick(tick: number): void {
    this.professionAiManager.tick(
      this.worldManager,
      this.buildingManager,
      this.resourceManager,
    );
    this.stateManager.markDirty('npcs');
    this.stateManager.markDirty('resources');
    this.stateManager.advanceVersion();

    if (tick % 100 === 0) {
      this.logger.debug('Simulation-Tick', { tick, players: this.playerCount });
    }
  }

  buildWorldState(): WorldState {
    return {
      timestamp: Date.now(),
      playerCount: this.entityManager.playerCount,
      maxPlayers: this.maxPlayers,
      mayorId: this.mayorManager.getMayorId(),
      heroes: this.entityManager.getAllHeroes(),
      npcs: this.professionAiManager.getNpcManager().getAllNpcs(),
      map: this.worldManager.getMap(),
      enemies: this.enemyManager.getAllEnemies(),
      resources: this.resourceManager.getAllResources(),
      buildOrders: this.buildManagerOrders(),
      buildings: this.buildingManager.getAllBuildings(),
    };
  }

  private buildManagerOrders() {
    return this.buildingManager.getAllBuildOrders();
  }

  handleJoin(
    socketId: string,
    payload: PlayerJoinPayload,
    sessionManager: SessionManager,
  ): JoinResult {
    if (this.entityManager.getHeroIdBySocket(socketId)) {
      throw new GameError('ALREADY_CONNECTED', 'Spieler ist bereits verbunden.');
    }

    if (!this.canJoin()) {
      throw new GameError('LOBBY_FULL', `Lobby voll. Maximal ${this.maxPlayers} Spieler.`);
    }

    const spawn = this.worldManager.findSpawnPosition();
    const hero = HeroFactory.createHero(
      payload.name,
      payload.classType,
      Race.HUMAN,
      spawn,
      payload.profileId,
    );

    if (!this.entityManager.addHero(hero)) {
      throw new GameError('ACTION_FAILED', 'Held konnte nicht erstellt werden.');
    }

    if (!this.entityManager.bindSocket(socketId, hero.id)) {
      this.entityManager.removeHero(hero.id);
      this.worldManager.releaseSpawnTile(hero.position.x, hero.position.y);
      throw new GameError('ACTION_FAILED', 'Socket-Verbindung konnte nicht zugeordnet werden.');
    }

    const assignedHero = this.mayorManager.assignMayorOnJoin(hero.id, this.entityManager) ?? hero;
    const session = sessionManager.createSession(assignedHero.id, this.id);

    this.stateManager.markDirty('heroes');
    this.stateManager.markDirty('mayor');
    this.stateManager.markDirty('meta');
    this.stateManager.advanceVersion();

    this.logger.info('Spieler beigetreten', {
      heroId: assignedHero.id,
      name: assignedHero.name,
      socketId,
    });

    return {
      hero: assignedHero,
      session,
      mayorChanged: this.mayorManager.isMayor(assignedHero.id),
    };
  }

  handleReconnect(
    socketId: string,
    sessionToken: string,
    sessionManager: SessionManager,
  ): JoinResult {
    const session = sessionManager.getSession(sessionToken);
    if (!session || session.lobbyId !== this.id) {
      throw new GameError('SESSION_INVALID', 'Session ungültig oder abgelaufen.');
    }

    const hero = this.entityManager.getHero(session.heroId);
    if (!hero) {
      sessionManager.revoke(sessionToken);
      throw new GameError('HERO_NOT_FOUND', 'Spielerdaten nicht mehr vorhanden.');
    }

    if (this.entityManager.getHeroIdBySocket(socketId)) {
      throw new GameError('ALREADY_CONNECTED', 'Socket ist bereits einem Helden zugeordnet.');
    }

    const existingSocket = this.entityManager.getSocketIdByHero(hero.id);
    if (existingSocket) {
      this.entityManager.releaseSocket(existingSocket);
    }

    if (!this.entityManager.bindSocket(socketId, hero.id)) {
      throw new GameError('ACTION_FAILED', 'Reconnect fehlgeschlagen.');
    }

    sessionManager.refresh(sessionToken);
    this.stateManager.markDirty('meta');
    this.stateManager.advanceVersion();

    this.logger.info('Spieler reconnected', { heroId: hero.id, socketId });

    return {
      hero,
      session,
      mayorChanged: false,
    };
  }

  handleBuildOrder(socketId: string, request: BuildOrderRequest): BuildOrderBroadcast {
    const result = this.buildingManager.issueBuildOrderFromSocket(
      socketId,
      request,
      this.entityManager,
      this.mayorManager,
      this.worldManager,
    );

    if (!result.success || !result.order || !result.building) {
      throw new GameError('UNAUTHORIZED', result.error ?? 'Bauauftrag abgelehnt.');
    }

    this.stateManager.markDirty('buildings');
    this.stateManager.advanceVersion();

    return { order: result.order, building: result.building };
  }

  handleMove(socketId: string, direction: CharacterDirection): boolean {
    const moved = this.heroMovementManager.tryMove(socketId, direction);
    if (moved) {
      this.stateManager.markDirty('heroes');
      this.stateManager.advanceVersion();
    }
    return moved;
  }

  /** Trennt Socket, behält Held für Grace-Period (Reconnect). */
  detachSocket(socketId: string): string | undefined {
    const heroId = this.entityManager.releaseSocket(socketId);
    if (heroId) {
      this.stateManager.markDirty('meta');
      this.stateManager.advanceVersion();
      this.logger.info('Socket getrennt (Grace-Period aktiv)', { heroId, socketId });
    }
    return heroId;
  }

  /** Entfernt Held endgültig nach Ablauf der Grace-Period. */
  removeHeroPermanently(heroId: string, sessionManager: SessionManager): HeroInterface | undefined {
    const hero = this.entityManager.getHero(heroId);
    if (!hero) {
      return undefined;
    }

    this.worldManager.releaseSpawnTile(hero.position.x, hero.position.y);
    const newMayor = this.mayorManager.handleMayorDisconnect(heroId, this.entityManager);
    this.entityManager.removeHero(heroId);
    sessionManager.revokeByHero(heroId);

    this.stateManager.markDirty('heroes');
    this.stateManager.markDirty('mayor');
    this.stateManager.markDirty('meta');
    this.stateManager.advanceVersion();

    this.logger.info('Spieler endgültig entfernt', { heroId });

    return newMayor;
  }

  applyPersistedSnapshot(snapshot: PersistedWorldSnapshot): void {
    this.entityManager.clear();
    this.buildingManager.importState(
      snapshot.buildOrders,
      snapshot.buildings,
      this.worldManager.getMap().width,
    );

    for (const hero of snapshot.heroes) {
      this.entityManager.addHero(hero);
      this.worldManager.reserveSpawnTile(hero.position.x, hero.position.y);
    }

    this.resourceManager.applyResourceSnapshot(snapshot.resources);

    const npcManager = this.professionAiManager.getNpcManager();
    for (const npc of snapshot.npcs) {
      npcManager.addNpc(npc);
    }

    if (snapshot.mayorId) {
      this.mayorManager.restoreMayor(snapshot.mayorId, this.entityManager);
    }

    this.stateManager.resetFromPersisted(snapshot);
    this.logger.info('Weltzustand aus Snapshot wiederhergestellt', {
      version: snapshot.version,
      heroes: snapshot.heroes.length,
    });
  }

  createPersistedSnapshot(): PersistedWorldSnapshot {
    return this.stateManager.toPersistedSnapshot(this.id, this.buildWorldState());
  }
}
