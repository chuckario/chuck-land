import Phaser from 'phaser';
import { TerrainType } from '@shared/types';
import { EnvironmentLoader } from '../world/EnvironmentLoader';
import {
  getTerrainTileVisual,
  pickTerrainFrame,
  TERRAIN_LEGEND_ORDER,
  WATER_ANIM_KEY,
} from '../world/tilesetConfig';

export { TERRAIN_LEGEND_ORDER, getTerrainTileVisual as getTerrainPlaceholder };

export function createTerrainSwatch(
  scene: Phaser.Scene,
  x: number,
  y: number,
  terrain: TerrainType,
  size: number,
): Phaser.GameObjects.GameObject {
  if (!EnvironmentLoader.isReady(scene)) {
    return scene.add.rectangle(x + size / 2, y + size / 2, size, size, 0x334155);
  }

  const visual = getTerrainTileVisual(terrain);
  const frame = pickTerrainFrame(terrain, terrain.length, 0);

  if (terrain === TerrainType.WATER) {
    const sprite = scene.add.sprite(x, y, visual.textureKey, frame)
      .setOrigin(0, 0)
      .setDisplaySize(size, size);
    sprite.play(WATER_ANIM_KEY);
    return sprite;
  }

  return scene.add.image(x, y, visual.textureKey, frame)
    .setOrigin(0, 0)
    .setDisplaySize(size, size);
}
