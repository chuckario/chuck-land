import Phaser from 'phaser';
import { ResourceNodeInterface, ResourceNodeType, TerrainType } from '@shared/types';
import { EnvironmentLoader } from './EnvironmentLoader';
import { pickIronOreProp, pickRockProp } from '../config/props/rockPropConfig';
import { resolveTreePropDefinition, RESOURCE_PROPS } from '../config/props/resourcePropConfig';
import { TileWorldRenderer } from './TileWorldRenderer';

interface ResourceSprite {
  resourceId: string;
  sprite: Phaser.GameObjects.GameObject;
  lastAmount: number;
}

export class ResourceRenderer {
  private readonly scene: Phaser.Scene;
  private readonly sprites = new Map<string, ResourceSprite>();
  private readonly tileToWorld: (x: number, y: number, tileSize: number) => { x: number; y: number };

  constructor(
    scene: Phaser.Scene,
    tileToWorld: (x: number, y: number, tileSize: number) => { x: number; y: number },
  ) {
    this.scene = scene;
    this.tileToWorld = tileToWorld;
  }

  sync(resources: ResourceNodeInterface[], tileSize: number): void {
    const activeIds = new Set(resources.map((resource) => resource.id));

    resources.forEach((resource) => {
      this.render(resource, tileSize);
    });

    this.sprites.forEach((sprite, resourceId) => {
      if (!activeIds.has(resourceId)) {
        sprite.sprite.destroy();
        this.sprites.delete(resourceId);
      }
    });
  }

  private render(resource: ResourceNodeInterface, tileSize: number): void {
    const alpha = computeResourceAlpha(resource.amount, resource.maxAmount);
    const existing = this.sprites.get(resource.id);

    if (existing) {
      if (existing.lastAmount !== resource.amount) {
        if ('setAlpha' in existing.sprite) {
          (existing.sprite as Phaser.GameObjects.Sprite).setAlpha(alpha);
        }
        existing.lastAmount = resource.amount;
      }
      return;
    }

    const { x, y } = this.tileToWorld(resource.x, resource.y, tileSize);
    const sprite = this.createProp(resource, x, y, tileSize, alpha);
    this.sprites.set(resource.id, {
      resourceId: resource.id,
      sprite,
      lastAmount: resource.amount,
    });
  }

  private createProp(
    resource: ResourceNodeInterface,
    x: number,
    y: number,
    tileSize: number,
    alpha: number,
  ): Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc {
    const depth = TileWorldRenderer.getEntityDepth(resource.x, resource.y);

    if (!EnvironmentLoader.isReady(this.scene)) {
      return this.scene.add.circle(x, y, tileSize * 0.25, 0x65a30d)
        .setAlpha(alpha)
        .setDepth(depth);
    }

    const variant = resource.variant ?? resource.x * 17 + resource.y * 31;
    const definition = this.resolvePropDefinition(resource, variant);

    const displaySize = tileSize * definition.displayScale;
    const propY = y + tileSize * definition.yOffsetFactor;
    const jitterX = ((variant % 7) - 3) * (tileSize * 0.02);
    const propX = x + jitterX;

    if (definition.frame === undefined) {
      return this.scene.add.image(propX, propY, definition.textureKey)
        .setOrigin(0.5, definition.originY)
        .setDisplaySize(displaySize, displaySize)
        .setAlpha(alpha)
        .setDepth(depth);
    }

    return this.scene.add.sprite(propX, propY, definition.textureKey, definition.frame)
      .setOrigin(0.5, definition.originY)
      .setDisplaySize(displaySize, displaySize)
      .setAlpha(alpha)
      .setDepth(depth);
  }

  private resolvePropDefinition(
    resource: ResourceNodeInterface,
    variant: number,
  ): {
    textureKey: string;
    frame?: number;
    displayScale: number;
    originY: number;
    yOffsetFactor: number;
  } {
    if (resource.type === ResourceNodeType.TREE) {
      const profiles = EnvironmentLoader.getTreeManifest(this.scene)?.profiles ?? [];
      return resolveTreePropDefinition(profiles, resource.x, resource.y, variant);
    }

    if (resource.type === ResourceNodeType.STONE_NODE) {
      const borderCode = Math.floor(variant / 1000);
      const rockSeed = variant % 1000;
      const isBorderTile = borderCode > 0;
      const borderTerrains = borderCode === 2
        ? [TerrainType.SAND as TerrainType]
        : borderCode === 3
          ? [TerrainType.DIRT as TerrainType]
          : borderCode === 1
            ? [TerrainType.GRASS as TerrainType]
            : [];

      return pickRockProp(rockSeed, TerrainType.STONE, borderTerrains, isBorderTile);
    }

    if (resource.type === ResourceNodeType.IRON_ORE) {
      return pickIronOreProp(variant);
    }

    return RESOURCE_PROPS[resource.type];
  }
}

export function computeResourceAlpha(amount: number, maxAmount: number): number {
  if (maxAmount <= 0) {
    return 1;
  }

  const ratio = Math.max(0, Math.min(1, amount / maxAmount));
  return 0.35 + ratio * 0.65;
}
