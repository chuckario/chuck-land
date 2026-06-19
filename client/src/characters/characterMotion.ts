/** World pixels per second — movement uses delta time, not frame count. */
export const CHARACTER_MOVE_SPEED_PX_PER_SEC = 112;

/** Start the next tile step when this fraction of the current segment remains. */
export const CHARACTER_STEP_CHAIN_THRESHOLD = 0.18;

export const MAX_PENDING_MOVE_REQUESTS = 2;

export interface CharacterMotionState {
  worldX: number;
  worldY: number;
  targetWorldX: number;
  targetWorldY: number;
  segmentLength: number;
  active: boolean;
}

export function createCharacterMotionState(worldX: number, worldY: number): CharacterMotionState {
  return {
    worldX,
    worldY,
    targetWorldX: worldX,
    targetWorldY: worldY,
    segmentLength: 0,
    active: false,
  };
}

export function beginCharacterGlide(
  motion: CharacterMotionState,
  targetWorldX: number,
  targetWorldY: number,
): void {
  const dx = targetWorldX - motion.worldX;
  const dy = targetWorldY - motion.worldY;
  const distance = Math.hypot(dx, dy);

  if (distance < 0.5) {
    motion.worldX = targetWorldX;
    motion.worldY = targetWorldY;
    motion.targetWorldX = targetWorldX;
    motion.targetWorldY = targetWorldY;
    motion.segmentLength = 0;
    motion.active = false;
    return;
  }

  motion.targetWorldX = targetWorldX;
  motion.targetWorldY = targetWorldY;
  motion.segmentLength = distance;
  motion.active = true;
}

export function snapCharacterMotion(
  motion: CharacterMotionState,
  worldX: number,
  worldY: number,
): void {
  motion.worldX = worldX;
  motion.worldY = worldY;
  motion.targetWorldX = worldX;
  motion.targetWorldY = worldY;
  motion.segmentLength = 0;
  motion.active = false;
}

export function tickCharacterMotion(
  motion: CharacterMotionState,
  deltaMs: number,
  speedPxPerSec: number = CHARACTER_MOVE_SPEED_PX_PER_SEC,
): boolean {
  if (!motion.active) {
    return false;
  }

  const dx = motion.targetWorldX - motion.worldX;
  const dy = motion.targetWorldY - motion.worldY;
  const distance = Math.hypot(dx, dy);

  if (distance < 0.5) {
    motion.worldX = motion.targetWorldX;
    motion.worldY = motion.targetWorldY;
    motion.active = false;
    return true;
  }

  const step = speedPxPerSec * (deltaMs / 1000);
  const progress = Math.min(1, step / distance);

  motion.worldX += dx * progress;
  motion.worldY += dy * progress;

  if (progress >= 1 || Math.hypot(motion.targetWorldX - motion.worldX, motion.targetWorldY - motion.worldY) < 0.5) {
    motion.worldX = motion.targetWorldX;
    motion.worldY = motion.targetWorldY;
    motion.active = false;
    return true;
  }

  return false;
}

export function isMotionReadyForNextStep(
  motion: CharacterMotionState,
  threshold: number = CHARACTER_STEP_CHAIN_THRESHOLD,
): boolean {
  if (!motion.active) {
    return true;
  }

  if (motion.segmentLength < 0.5) {
    return true;
  }

  const remaining = Math.hypot(
    motion.targetWorldX - motion.worldX,
    motion.targetWorldY - motion.worldY,
  );

  return remaining / motion.segmentLength <= threshold;
}

export function isCharacterInMotion(motion: CharacterMotionState, locomoting: boolean): boolean {
  return motion.active || locomoting;
}
