import { CharacterDirection } from './characterAnimation';

/**
 * Maps WASD / facing to grid steps on an orthogonal top-down map.
 *
 * Screen up    → ( 0, -1)   W
 * Screen down  → ( 0,  1)   S
 * Screen left  → (-1,  0)   A
 * Screen right → ( 1,  0)   D
 */
export function directionToTileDelta(direction: CharacterDirection): { x: number; y: number } {
  switch (direction) {
    case CharacterDirection.UP:
      return { x: 0, y: -1 };
    case CharacterDirection.DOWN:
      return { x: 0, y: 1 };
    case CharacterDirection.LEFT:
      return { x: -1, y: 0 };
    case CharacterDirection.RIGHT:
      return { x: 1, y: 0 };
    case CharacterDirection.UP_RIGHT:
      return { x: 1, y: -1 };
    case CharacterDirection.UP_LEFT:
      return { x: -1, y: -1 };
    case CharacterDirection.DOWN_RIGHT:
      return { x: 1, y: 1 };
    case CharacterDirection.DOWN_LEFT:
      return { x: -1, y: 1 };
    default:
      return { x: 0, y: 0 };
  }
}

/** Diagonal movement uses the side-facing walk/run sprites (no dedicated diagonal sheets). */
export function resolveAnimationDirection(direction: CharacterDirection): CharacterDirection {
  switch (direction) {
    case CharacterDirection.UP_RIGHT:
    case CharacterDirection.DOWN_RIGHT:
      return CharacterDirection.RIGHT;
    case CharacterDirection.UP_LEFT:
    case CharacterDirection.DOWN_LEFT:
      return CharacterDirection.LEFT;
    default:
      return direction;
  }
}

export function tileDeltaToDirection(
  dx: number,
  dy: number,
  fallback: CharacterDirection = CharacterDirection.DOWN,
): CharacterDirection {
  if (dx === 0 && dy === 0) {
    return fallback;
  }

  if (dx === 0 && dy === -1) {
    return CharacterDirection.UP;
  }
  if (dx === 0 && dy === 1) {
    return CharacterDirection.DOWN;
  }
  if (dx === -1 && dy === 0) {
    return CharacterDirection.LEFT;
  }
  if (dx === 1 && dy === 0) {
    return CharacterDirection.RIGHT;
  }
  if (dx === 1 && dy === -1) {
    return CharacterDirection.UP_RIGHT;
  }
  if (dx === -1 && dy === -1) {
    return CharacterDirection.UP_LEFT;
  }
  if (dx === 1 && dy === 1) {
    return CharacterDirection.DOWN_RIGHT;
  }
  if (dx === -1 && dy === 1) {
    return CharacterDirection.DOWN_LEFT;
  }

  if (dy < 0 && dx === 0) {
    return CharacterDirection.UP;
  }
  if (dy > 0 && dx === 0) {
    return CharacterDirection.DOWN;
  }
  if (dx < 0 && dy === 0) {
    return CharacterDirection.LEFT;
  }
  if (dx > 0 && dy === 0) {
    return CharacterDirection.RIGHT;
  }

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? CharacterDirection.RIGHT : CharacterDirection.LEFT;
  }

  return dy > 0 ? CharacterDirection.DOWN : CharacterDirection.UP;
}
