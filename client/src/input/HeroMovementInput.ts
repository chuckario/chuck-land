import Phaser from 'phaser';

import { CharacterDirection } from '@shared/characterAnimation';



interface WasdKeys {

  W: Phaser.Input.Keyboard.Key;

  A: Phaser.Input.Keyboard.Key;

  S: Phaser.Input.Keyboard.Key;

  D: Phaser.Input.Keyboard.Key;

}



export class HeroMovementInput {

  private readonly keys: WasdKeys;



  constructor(scene: Phaser.Scene) {

    if (!scene.input.keyboard) {

      throw new Error('Keyboard input is not available.');

    }



    this.keys = scene.input.keyboard.addKeys('W,A,S,D') as WasdKeys;

  }



  getHeldDirection(): CharacterDirection | null {

    return this.readDirection();

  }



  private readDirection(): CharacterDirection | null {

    const { W, A, S, D } = this.keys;

    const up = W.isDown;

    const down = S.isDown;

    const left = A.isDown;

    const right = D.isDown;



    if (up && right && !down && !left) {

      return CharacterDirection.UP_RIGHT;

    }

    if (up && left && !down && !right) {

      return CharacterDirection.UP_LEFT;

    }

    if (down && right && !up && !left) {

      return CharacterDirection.DOWN_RIGHT;

    }

    if (down && left && !up && !right) {

      return CharacterDirection.DOWN_LEFT;

    }



    if (up && !down) {

      return CharacterDirection.UP;

    }

    if (down && !up) {

      return CharacterDirection.DOWN;

    }

    if (left && !right) {

      return CharacterDirection.LEFT;

    }

    if (right && !left) {

      return CharacterDirection.RIGHT;

    }



    return null;

  }

}


