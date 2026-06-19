import Phaser from 'phaser';
import { BuildingInterface, BuildingType, HeroInterface, HeroRole, WORLD_TILE_SIZE, WorldState } from '@shared/types';
import { resolveHeroProfileId } from '@shared/classConfig';
import { canIssueBuildOrders } from '@shared/permissions';
import { socketClient } from '../network/SocketClient';
import { formatEnumLabel } from '../utils/playableOptions';
import { TileWorldRenderer } from '../world/TileWorldRenderer';
import { ResourceRenderer } from '../world/ResourceRenderer';
import { NpcRenderer } from '../world/NpcRenderer';
import { EnemyRenderer } from '../world/EnemyRenderer';
import {
  createTerrainSwatch,
  getTerrainPlaceholder,
  TERRAIN_LEGEND_ORDER,
} from '../config/terrainConfig';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { isGatheringProfession } from '@shared/resourceConfig';
import { isReservedProfession } from '@shared/professionConfig';
import { BootScene } from './BootScene';
import { AnimatedCharacterVisual, AnimatedCharacterVisualFactory } from '../characters/AnimatedCharacterVisual';
import { HeroMovementInput } from '../input/HeroMovementInput';
import { LocalHeroMovement } from '../input/LocalHeroMovement';

interface BuildingSprite {
  buildingId: string;
  shape: Phaser.GameObjects.Rectangle;
}

const BUILDING_COLORS: Record<BuildingType, number> = {
  [BuildingType.HOUSE]: 0xa16207,
  [BuildingType.TOWN_HALL]: 0x7c3aed,
  [BuildingType.MARKET]: 0xea580c,
  [BuildingType.WATCHTOWER]: 0x475569,
  [BuildingType.FARM]: 0x65a30d,
};

const UI_DEPTH = 200;
const LEGEND_X = GAME_WIDTH - 16;
const LEGEND_SWATCH_SIZE = 16;

export class GameScene extends Phaser.Scene {
  private localHero?: HeroInterface;
  private heroSprites = new Map<string, AnimatedCharacterVisual>();
  private buildingSprites = new Map<string, BuildingSprite>();
  private hudText!: Phaser.GameObjects.Text;
  private connectionStatusText!: Phaser.GameObjects.Text;
  private tileWorld!: TileWorldRenderer;
  private resourceRenderer!: ResourceRenderer;
  private npcRenderer!: NpcRenderer;
  private enemyRenderer!: EnemyRenderer;
  private legendContainer!: Phaser.GameObjects.Container;
  private mapSynced = false;
  private currentMapKey = '';
  private movementInput?: HeroMovementInput;
  private localHeroMovement?: LocalHeroMovement;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { hero: HeroInterface }): void {
    this.localHero = data.hero;
  }

  create(): void {
    this.tileWorld = new TileWorldRenderer(this);
    this.resourceRenderer = new ResourceRenderer(
      this,
      (x, y, tileSize) => this.tileWorld.tileToWorld(x, y, tileSize),
    );
    this.npcRenderer = new NpcRenderer(
      this,
      (x, y, tileSize) => this.tileWorld.tileToWorld(x, y, tileSize),
    );
    this.enemyRenderer = new EnemyRenderer(
      this,
      (x, y, tileSize) => this.tileWorld.tileToWorld(x, y, tileSize),
    );

    this.createHud();
    this.createLegend();
    this.movementInput = new HeroMovementInput(this);
    this.localHeroMovement = new LocalHeroMovement(
      this.movementInput,
      (x, y, tileSize) => this.tileWorld.tileToWorld(x, y, tileSize),
      WORLD_TILE_SIZE,
    );

    if (this.localHero) {
      this.renderHero(this.localHero, true, WORLD_TILE_SIZE);
      const visual = this.heroSprites.get(this.localHero.id);
      if (visual) {
        this.localHeroMovement.resetFromHero(this.localHero, visual);
      }
    }

    socketClient.onWorldState((state) => {
      this.syncWorld(state);
    });

    socketClient.onConnectionState((connected) => {
      this.connectionStatusText.setVisible(!connected);
    });

    socketClient.onSessionExpired(() => {
      this.connectionStatusText.setText('Session abgelaufen — zurück zur Auswahl');
      this.connectionStatusText.setVisible(true);
      this.time.delayedCall(2000, () => {
        this.scene.start('ClassSelectScene');
      });
    });
  }

  update(_time: number, delta: number): void {
    const localVisual = this.localHero
      ? this.heroSprites.get(this.localHero.id)
      : undefined;

    this.localHeroMovement?.update(localVisual);

    this.heroSprites.forEach((visual) => {
      AnimatedCharacterVisualFactory.tickVisual(visual, delta);
    });
    this.npcRenderer.tick(delta);
    this.enemyRenderer.tick(delta);
  }

  private createHud(): void {
    this.hudText = this.add.text(16, GAME_HEIGHT - 36, 'Warte auf Serverdaten...', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '15px',
      color: '#dcfce7',
      backgroundColor: '#052e16cc',
      padding: { x: 12, y: 8 },
    })
      .setScrollFactor(0)
      .setDepth(UI_DEPTH);

    this.connectionStatusText = this.add.text(GAME_WIDTH / 2, 16, 'Verbindung unterbrochen — Reconnect...', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '14px',
      color: '#fef3c7',
      backgroundColor: '#78350fcc',
      padding: { x: 10, y: 6 },
    })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(UI_DEPTH + 1)
      .setVisible(false);
  }

  private createLegend(): void {
    this.legendContainer = this.add.container(LEGEND_X, 16);
    this.legendContainer.setScrollFactor(0).setDepth(UI_DEPTH);

    const panelWidth = 148;
    const rowHeight = 22;
    const headerHeight = 30;
    const panelHeight = headerHeight + TERRAIN_LEGEND_ORDER.length * rowHeight + 10;

    const panel = this.add.rectangle(-panelWidth / 2, panelHeight / 2, panelWidth, panelHeight, 0x0f172a, 0.92)
      .setStrokeStyle(1, 0x334155);

    const title = this.add.text(-panelWidth / 2 + 12, 10, 'Gelände', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '14px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });

    this.legendContainer.add([panel, title]);

    TERRAIN_LEGEND_ORDER.forEach((terrain, index) => {
      const config = getTerrainPlaceholder(terrain);
      const rowY = headerHeight + index * rowHeight;

      const swatch = createTerrainSwatch(
        this,
        -panelWidth / 2 + 12,
        rowY,
        terrain,
        LEGEND_SWATCH_SIZE,
      );

      const label = this.add.text(-panelWidth / 2 + 36, rowY + LEGEND_SWATCH_SIZE / 2, config.label, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '12px',
        color: '#e2e8f0',
      }).setOrigin(0, 0.5);

      this.legendContainer.add([swatch, label]);
    });
  }

  private syncWorld(state: WorldState): void {
    this.renderMapFromServer(state);
    this.syncResources(state);
    this.syncNpcs(state);
    this.syncEnemies(state);
    this.syncHeroes(state);
    this.syncBuildings(state);
    this.updateHud(state);
  }

  private renderMapFromServer(state: WorldState): void {
    if (!state.map?.tiles?.length) {
      return;
    }

    const mapKey = `${state.map.width}:${state.map.height}:${state.map.tileSize}:${state.map.tiles.length}`;

    if (mapKey !== this.currentMapKey) {
      this.tileWorld.render(state.map);
      this.currentMapKey = mapKey;
    }

    if (!this.mapSynced) {
      const bounds = this.tileWorld.getWorldBounds(state.map);
      this.setupCamera(bounds.width, bounds.height, state.map.tileSize);
      this.mapSynced = true;
    }
  }

  private syncResources(state: WorldState): void {
    this.resourceRenderer.sync(state.resources ?? [], state.map.tileSize);
  }

  private syncNpcs(state: WorldState): void {
    this.npcRenderer.sync(state.npcs ?? [], state.map.tileSize);
  }

  private syncEnemies(state: WorldState): void {
    this.enemyRenderer.sync(state.enemies ?? [], state.map.tileSize);
  }

  private syncHeroes(state: WorldState): void {
    const activeIds = new Set(state.heroes.map((hero) => hero.id));

    state.heroes.forEach((hero) => {
      if (hero.id === this.localHero?.id) {
        this.localHero = hero;
      }
      this.renderHero(hero, hero.id === this.localHero?.id, state.map.tileSize);
    });

    this.heroSprites.forEach((visual, heroId) => {
      if (!activeIds.has(heroId)) {
        AnimatedCharacterVisualFactory.destroy(visual);
        this.heroSprites.delete(heroId);
      }
    });
  }

  private syncBuildings(state: WorldState): void {
    const activeIds = new Set(state.buildings.map((building) => building.id));

    state.buildings.forEach((building) => {
      this.renderBuilding(building, state.map.tileSize);
    });

    this.buildingSprites.forEach((sprite, buildingId) => {
      if (!activeIds.has(buildingId)) {
        sprite.shape.destroy();
        this.buildingSprites.delete(buildingId);
      }
    });
  }

  private updateHud(state: WorldState): void {
    const mayor = state.heroes.find((hero) => hero.id === state.mayorId);
    const mayorLabel = mayor ? mayor.name : '—';
    const roleLabel = this.localHero?.role === HeroRole.MAYOR ? 'Bürgermeister' : 'Bürger';
    const buildRights = this.localHero && canIssueBuildOrders(this.localHero)
      ? 'Bauaufträge: erlaubt'
      : 'Bauaufträge: nicht erlaubt';

    const activeNpcs = (state.npcs ?? []).filter((npc) => !isReservedProfession(npc.profession));
    const gatheringNpcCount = activeNpcs.filter((npc) => isGatheringProfession(npc.profession)).length;

    this.hudText.setText(
      `Spieler: ${state.playerCount}/${state.maxPlayers}  |  NPCs: ${activeNpcs.length} (${gatheringNpcCount} Sammler)  |  Gegner: ${state.enemies?.length ?? 0}  |  Bürgermeister: ${mayorLabel}  |  Rolle: ${roleLabel}  |  ${buildRights}  |  Ressourcen: ${state.resources?.length ?? 0}`,
    );
  }

  private setupCamera(worldWidth: number, worldHeight: number, tileSize: number): void {
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    if (this.localHero) {
      const { x, y } = this.tileWorld.tileToWorld(
        this.localHero.position.x,
        this.localHero.position.y,
        tileSize,
      );
      this.cameras.main.centerOn(x, y);
    }
  }

  private renderHero(hero: HeroInterface, isLocal: boolean, tileSize: number): void {
    const { x, y } = this.tileWorld.tileToWorld(hero.position.x, hero.position.y, tileSize);
    const color = isLocal ? 0x3b82f6 : 0xf97316;
    const profileId = resolveHeroProfileId(hero);
    const profile = BootScene.getProfile(this, profileId)
      ?? BootScene.getDefaultCharacterProfile(this);

    const existing = this.heroSprites.get(hero.id);
    const roleBadge = hero.role === HeroRole.MAYOR ? ' ★' : '';
    const labelText = `${hero.name}${roleBadge} (${formatEnumLabel(hero.classType)})`;

    if (existing) {
      if (isLocal) {
        this.localHeroMovement?.reconcile(hero, existing);
      }

      AnimatedCharacterVisualFactory.syncVisual(existing, {
        x,
        y,
        tileX: hero.position.x,
        tileY: hero.position.y,
        labelText,
        profile,
        explicitDirection: hero.facingDirection,
        facingDirection: isLocal
          ? (this.movementInput?.getHeldDirection() ?? hero.facingDirection ?? null)
          : (hero.facingDirection ?? null),
        locomoting: isLocal
          ? (this.localHeroMovement?.isLocomoting() ?? false)
          : false,
        skipMotion: isLocal && (this.localHeroMovement?.isPredictionAhead(hero.position) ?? false),
      });
      return;
    }

    const visual = AnimatedCharacterVisualFactory.create(this, {
      id: hero.id,
      profileId,
      profile,
      x,
      y,
      tileX: hero.position.x,
      tileY: hero.position.y,
      labelText,
      depth: TileWorldRenderer.getEntityDepth(hero.position.x, hero.position.y),
      labelDepth: TileWorldRenderer.getEntityDepth(hero.position.x, hero.position.y) + 1,
      fallbackColor: color,
      fallbackRadius: tileSize * 0.35,
      strokeColor: hero.role === HeroRole.MAYOR ? 0xfacc15 : 0xffffff,
      labelStyle: {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#00000088',
        padding: { x: 6, y: 2 },
      },
      followTarget: isLocal,
    });

    this.heroSprites.set(hero.id, visual);

    if (isLocal) {
      this.localHeroMovement?.resetFromHero(hero, visual);
    }
  }

  private renderBuilding(building: BuildingInterface, tileSize: number): void {
    if (this.buildingSprites.has(building.id)) {
      return;
    }

    const { x, y } = this.tileWorld.tileToWorld(building.x, building.y, tileSize);
    const size = tileSize * 0.75;
    const shape = this.add.rectangle(x, y, size, size, BUILDING_COLORS[building.buildingType])
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setDepth(TileWorldRenderer.getEntityDepth(building.x, building.y));

    this.buildingSprites.set(building.id, { buildingId: building.id, shape });
  }
}
