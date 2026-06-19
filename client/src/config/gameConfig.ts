import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { ClassSelectScene } from '../scenes/ClassSelectScene';
import { GameScene } from '../scenes/GameScene';
import { GAME_HEIGHT, GAME_WIDTH } from './constants';

export { GAME_HEIGHT, GAME_WIDTH } from './constants';
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#0f172a',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, ClassSelectScene, GameScene],
};
