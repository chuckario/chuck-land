import Phaser from 'phaser';
import { NpcAiState, NpcInterface } from '@shared/types';
import { isReservedProfession } from '@shared/professionConfig';
import { BootScene } from '../scenes/BootScene';
import { AnimatedCharacterVisual, AnimatedCharacterVisualFactory } from '../characters/AnimatedCharacterVisual';
import { DEFAULT_NPC_PROFILE_ID } from '../config/entityVisualConfig';
import { getNpcColor, getNpcLabel } from '../config/npcConfig';
import { TileWorldRenderer } from './TileWorldRenderer';

export class NpcRenderer {
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

  sync(npcs: NpcInterface[], tileSize: number): void {
    const visibleNpcs = npcs.filter((npc) => !isReservedProfession(npc.profession));
    const activeIds = new Set(visibleNpcs.map((npc) => npc.id));

    visibleNpcs.forEach((npc) => {
      this.render(npc, tileSize);
    });

    this.sprites.forEach((visual, npcId) => {
      if (!activeIds.has(npcId)) {
        AnimatedCharacterVisualFactory.destroy(visual);
        this.sprites.delete(npcId);
      }
    });
  }

  private render(npc: NpcInterface, tileSize: number): void {
    const { x, y } = this.tileToWorld(npc.position.x, npc.position.y, tileSize);
    const color = getNpcColor(npc.profession, npc.state);
    const labelText = getNpcLabel(npc.profession);
    const profile = BootScene.getProfile(this.scene, DEFAULT_NPC_PROFILE_ID)
      ?? BootScene.getDefaultVillagerProfile(this.scene);

    const existing = this.sprites.get(npc.id);
    if (existing) {
      AnimatedCharacterVisualFactory.syncVisual(existing, {
        x,
        y,
        tileX: npc.position.x,
        tileY: npc.position.y,
        labelText,
        profile,
        npcState: npc.state,
        professionAction: npc.currentAction,
        locomoting: npc.state === NpcAiState.MOVING,
      });
      existing.fallback?.setFillStyle(color);
      existing.label.setVisible(labelText.length > 0);
      return;
    }

    const visual = AnimatedCharacterVisualFactory.create(this.scene, {
      id: npc.id,
      profileId: DEFAULT_NPC_PROFILE_ID,
      profile,
      x,
      y,
      tileX: npc.position.x,
      tileY: npc.position.y,
      labelText,
      depth: TileWorldRenderer.getEntityDepth(npc.position.x, npc.position.y),
      labelDepth: TileWorldRenderer.getEntityDepth(npc.position.x, npc.position.y) + 1,
      fallbackColor: color,
      fallbackRadius: tileSize * 0.28,
      strokeColor: 0xffffff,
      labelStyle: {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '11px',
        color: '#fef9c3',
        backgroundColor: '#422006aa',
        padding: { x: 4, y: 2 },
      },
    });

    visual.label.setVisible(labelText.length > 0);
    this.sprites.set(npc.id, visual);
  }

  tick(deltaMs: number): void {
    this.sprites.forEach((visual) => {
      AnimatedCharacterVisualFactory.tickVisual(visual, deltaMs);
    });
  }
}
