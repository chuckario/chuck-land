import { CharacterDirection } from '@shared/characterAnimation';
import { directionToTileDelta } from '@shared/movement';
import { HeroInterface } from '@shared/types';
import { socketClient } from '../network/SocketClient';
import { AnimatedCharacterVisual } from '../characters/AnimatedCharacterVisual';
import {
  beginCharacterGlide,
  isMotionReadyForNextStep,
  MAX_PENDING_MOVE_REQUESTS,
  snapCharacterMotion,
  CHARACTER_STEP_CHAIN_THRESHOLD,
} from '../characters/characterMotion';
import { HeroMovementInput } from './HeroMovementInput';

export class LocalHeroMovement {
  private predictedTile = { x: 0, y: 0 };
  private pendingMoves = 0;
  private initialized = false;

  constructor(
    private readonly input: HeroMovementInput,
    private readonly tileToWorld: (x: number, y: number, tileSize: number) => { x: number; y: number },
    private readonly tileSize: number,
  ) {}

  resetFromHero(hero: HeroInterface, visual?: AnimatedCharacterVisual): void {
    this.predictedTile = { x: hero.position.x, y: hero.position.y };
    this.pendingMoves = 0;
    this.initialized = true;

    if (visual) {
      const { x, y } = this.tileToWorld(hero.position.x, hero.position.y, this.tileSize);
      snapCharacterMotion(visual.motion, x, y);
    }
  }

  reconcile(hero: HeroInterface, visual: AnimatedCharacterVisual): void {
    if (!this.initialized) {
      this.resetFromHero(hero, visual);
      return;
    }

    const server = hero.position;
    const matchesPrediction =
      server.x === this.predictedTile.x
      && server.y === this.predictedTile.y;

    if (matchesPrediction) {
      this.pendingMoves = Math.max(0, this.pendingMoves - 1);
      return;
    }

    if (this.pendingMoves > 0) {
      this.predictedTile = { x: server.x, y: server.y };
      this.pendingMoves = 0;
      const { x, y } = this.tileToWorld(server.x, server.y, this.tileSize);
      snapCharacterMotion(visual.motion, x, y);
      return;
    }

    this.predictedTile = { x: server.x, y: server.y };
  }

  update(visual: AnimatedCharacterVisual | undefined): void {
    if (!visual || !this.initialized) {
      return;
    }

    const direction = this.input.getHeldDirection();
    if (!direction) {
      return;
    }

    visual.direction = direction;

    if (this.pendingMoves >= MAX_PENDING_MOVE_REQUESTS) {
      return;
    }

    if (!isMotionReadyForNextStep(visual.motion, CHARACTER_STEP_CHAIN_THRESHOLD)) {
      return;
    }

    const delta = directionToTileDelta(direction);
    this.predictedTile = {
      x: this.predictedTile.x + delta.x,
      y: this.predictedTile.y + delta.y,
    };

    const { x, y } = this.tileToWorld(
      this.predictedTile.x,
      this.predictedTile.y,
      this.tileSize,
    );

    beginCharacterGlide(visual.motion, x, y);
    this.pendingMoves += 1;
    socketClient.move(direction);
  }

  isLocomoting(): boolean {
    return this.input.getHeldDirection() != null;
  }

  getPredictedTile(): { x: number; y: number } {
    return this.predictedTile;
  }

  isPredictionAhead(serverTile: { x: number; y: number }): boolean {
    return this.predictedTile.x !== serverTile.x || this.predictedTile.y !== serverTile.y;
  }
}
