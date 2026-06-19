import { CharacterDirection } from '@shared/characterAnimation';
import { tileDeltaToDirection } from '@shared/movement';

export function inferDirectionFromDelta(
  previous: { x: number; y: number },
  current: { x: number; y: number },
  fallback: CharacterDirection = CharacterDirection.DOWN,
): CharacterDirection {
  const dx = current.x - previous.x;
  const dy = current.y - previous.y;
  return tileDeltaToDirection(dx, dy, fallback);
}
