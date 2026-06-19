import Phaser from 'phaser';
import { WorldBiome } from '@shared/biomeConfig';
import { MapEnemyInterface } from '@shared/types';
import { AnimatedCharacterVisual, AnimatedCharacterVisualFactory } from '../characters/AnimatedCharacterVisual';
import { BootScene } from '../scenes/BootScene';
import { TileWorldRenderer } from './TileWorldRenderer';

const BIOME_ENEMY_COLORS: Record<WorldBiome, number> = {
  [WorldBiome.STANDARD]: 0x16a34a,
  [WorldBiome.DESERT]: 0xd97706,
  [WorldBiome.FAIRY_FOREST]: 0xc026d3,
  [WorldBiome.CEMETERY]: 0x64748b,
};

export class EnemyRenderer {
  private readonly scene: Phaser.Scene;
  private readonly sprites = new Map<string, AnimatedCharacterVisual>();
  private readonly tileToWorld: (x: number, y: number, tileSize: number) => { x: number; y: number };

  constructor(
    scene: Phaser.Scene,
    tileToWorld: (x: number, y: number, tileSize: number) => { x: number; y: number },
  ) {
    this.scene = scene;
    this.tileToWorld = tileToWorld;
  }

  sync(enemies: MapEnemyInterface[], tileSize: number): void {
    const activeIds = new Set(enemies.map((enemy) => enemy.id));

    enemies.forEach((enemy) => {
      this.render(enemy, tileSize);
    });

    this.sprites.forEach((visual, enemyId) => {
      if (!activeIds.has(enemyId)) {
        AnimatedCharacterVisualFactory.destroy(visual);
        this.sprites.delete(enemyId);
      }
    });
  }

  tick(deltaMs: number): void {
    this.sprites.forEach((visual) => {
      AnimatedCharacterVisualFactory.tickVisual(visual, deltaMs);
    });
  }

  private render(enemy: MapEnemyInterface, tileSize: number): void {
    const { x, y } = this.tileToWorld(enemy.x, enemy.y, tileSize);
    const profile = BootScene.getProfile(this.scene, enemy.profileId)
      ?? BootScene.getDefaultEnemyProfile(this.scene);
    const color = BIOME_ENEMY_COLORS[enemy.biome] ?? 0xdc2626;

    const existing = this.sprites.get(enemy.id);
    if (existing) {
      AnimatedCharacterVisualFactory.syncVisual(existing, {
        x,
        y,
        tileX: enemy.x,
        tileY: enemy.y,
        labelText: enemy.label,
        profile,
        locomoting: false,
      });
      existing.fallback?.setFillStyle(color);
      return;
    }

    const visual = AnimatedCharacterVisualFactory.create(this.scene, {
      id: enemy.id,
      profileId: enemy.profileId,
      profile,
      x,
      y,
      tileX: enemy.x,
      tileY: enemy.y,
      labelText: enemy.label,
      depth: TileWorldRenderer.getEntityDepth(enemy.x, enemy.y),
      labelDepth: TileWorldRenderer.getEntityDepth(enemy.x, enemy.y) + 1,
      fallbackColor: color,
      fallbackRadius: tileSize * 0.3,
      strokeColor: 0x7f1d1d,
      labelStyle: {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '11px',
        color: '#fee2e2',
        backgroundColor: '#450a0acc',
        padding: { x: 4, y: 2 },
      },
    });

    this.sprites.set(enemy.id, visual);
  }
}
