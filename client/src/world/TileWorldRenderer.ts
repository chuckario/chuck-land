import Phaser from 'phaser';
import { TerrainType, WorldMapInterface, WORLD_MAP_HEIGHT, WORLD_MAP_WIDTH } from '@shared/types';
import { EnvironmentLoader } from './EnvironmentLoader';
import { gridToIso, getIsoPaintOrder, getIsoWorldBounds } from './tiles/isometricCoords';
import { LayerTileContext } from './tiles/layerTileResolver';
import { ASSET_TILE_SIZE, getRenderTextureKey } from './tilesetRegistry';
import { WORLD_RENDER_LAYERS } from './tiles/worldLayerConfig';

const FALLBACK_TERRAIN_COLORS: Record<TerrainType, number> = {
  [TerrainType.GRASS]: 0x3d8b37,
  [TerrainType.WATER]: 0x2563eb,
  [TerrainType.SAND]: 0xd4a574,
  [TerrainType.STONE]: 0x6b7280,
  [TerrainType.FOREST]: 0x14532d,
  [TerrainType.DIRT]: 0x78350f,
};

const ENTITY_DEPTH_BASE = 30;

interface TileDrawCommand {
  layerDepth: number;
  paintOrder: number;
  tileX: number;
  worldX: number;
  worldY: number;
  textureKey: string;
  frame: number;
  animated: boolean;
  animationKey?: string;
}

export class TileWorldRenderer {
  private readonly scene: Phaser.Scene;
  private readonly worldContainer: Phaser.GameObjects.Container;
  private renderedMapKey = '';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.worldContainer = scene.add.container(0, 0);
    this.worldContainer.setDepth(0);
  }

  get container(): Phaser.GameObjects.Container {
    return this.worldContainer;
  }

  static getEntityDepthBase(): number {
    return ENTITY_DEPTH_BASE;
  }

  static getEntityDepth(tileX: number, tileY: number, mapWidth?: number): number {
    return ENTITY_DEPTH_BASE + getIsoPaintOrder(tileX, tileY, mapWidth ?? WORLD_MAP_WIDTH) * 0.01;
  }

  render(map: WorldMapInterface): void {
    const mapKey = `${map.width}:${map.height}:${map.tileSize}:${map.tiles.join('|')}`;
    if (mapKey === this.renderedMapKey) {
      return;
    }

    this.destroyLayers();
    this.renderedMapKey = mapKey;

    const useTilesets = EnvironmentLoader.isReady(this.scene);
    if (!useTilesets) {
      this.renderFallback(map);
      return;
    }

    this.renderLayeredIsoWorld(map);
  }

  tileToWorld(x: number, y: number, tileSize: number, mapWidth?: number, mapHeight?: number): { x: number; y: number } {
    const width = mapWidth ?? (this.lastMapWidth || WORLD_MAP_WIDTH);
    const height = mapHeight ?? (this.lastMapHeight || WORLD_MAP_HEIGHT);
    return gridToIso(x, y, width, height, tileSize);
  }

  getWorldBounds(map: WorldMapInterface): { x: number; y: number; width: number; height: number } {
    return getIsoWorldBounds(map.width, map.height, map.tileSize);
  }

  private lastMapWidth = 0;
  private lastMapHeight = 0;

  private getLastMapHeight(tileSize: number): number {
    if (this.lastMapHeight > 0) {
      return this.lastMapHeight;
    }

    return Math.max(1, Math.round(3840 / tileSize));
  }

  private destroyLayers(): void {
    this.worldContainer.removeAll(true);
  }

  private renderFallback(map: WorldMapInterface): void {
    const { width, height, tileSize, tiles } = map;
    this.lastMapWidth = width;
    this.lastMapHeight = height;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const terrain = tiles[y * width + x]!;
        const { x: worldX, y: worldY } = gridToIso(x, y, width, height, tileSize);
        const tile = this.scene.add.rectangle(worldX, worldY, tileSize, tileSize, FALLBACK_TERRAIN_COLORS[terrain]);
        this.worldContainer.add(tile);
      }
    }
  }

  private renderLayeredIsoWorld(map: WorldMapInterface): void {
    const { width, height, tileSize, tiles } = map;
    this.lastMapWidth = width;
    this.lastMapHeight = height;

    const commands = this.buildDrawCommands(map);
    const displayScale = tileSize / ASSET_TILE_SIZE;

    for (const command of commands) {
      const gameObject = command.animated
        ? this.scene.add.sprite(command.worldX, command.worldY, command.textureKey, command.frame)
        : this.scene.add.image(command.worldX, command.worldY, command.textureKey, command.frame);

      gameObject
        .setOrigin(0.5, 0.5)
        .setDisplaySize(ASSET_TILE_SIZE * displayScale, ASSET_TILE_SIZE * displayScale);

      if (command.animated && command.animationKey) {
        (gameObject as Phaser.GameObjects.Sprite).play(command.animationKey);
      }

      this.worldContainer.add(gameObject);
    }
  }

  private buildDrawCommands(map: WorldMapInterface): TileDrawCommand[] {
    const { width, height, tileSize, tiles, elevations, biomes } = map;
    const commands: TileDrawCommand[] = [];

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const terrain = tiles[y * width + x]!;
        const context: LayerTileContext = {
          x,
          y,
          terrain,
          tiles,
          width,
          height,
          elevations,
          biomes,
        };
        const { x: worldX, y: worldY } = gridToIso(x, y, width, height, tileSize);
        const paintOrder = getIsoPaintOrder(x, y, width);

        for (const layer of WORLD_RENDER_LAYERS) {
          const frame = layer.resolveFrame(context);
          if (frame === null) {
            continue;
          }

          commands.push({
            layerDepth: layer.depth,
            paintOrder,
            tileX: x,
            worldX,
            worldY,
            textureKey: getRenderTextureKey(layer.tilesetId),
            frame,
            animated: layer.animated === true,
            animationKey: layer.animationKey,
          });
        }
      }
    }

    commands.sort((left, right) => {
      if (left.layerDepth !== right.layerDepth) {
        return left.layerDepth - right.layerDepth;
      }
      if (left.paintOrder !== right.paintOrder) {
        return left.paintOrder - right.paintOrder;
      }
      return left.tileX - right.tileX;
    });

    return commands;
  }
}
