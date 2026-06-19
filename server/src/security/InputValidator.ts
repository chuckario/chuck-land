import { CharacterDirection } from '../../../shared/characterAnimation';
import {
  BuildOrderRequest,
  BuildingType,
  HeroClass,
  WORLD_MAP_HEIGHT,
  WORLD_MAP_WIDTH,
} from '../../../shared/types';
import { GameError } from '../errors/GameError';

const VALID_HERO_CLASSES = new Set<string>(Object.values(HeroClass));
const VALID_BUILDING_TYPES = new Set<string>(Object.values(BuildingType));
const VALID_DIRECTIONS = new Set<string>(Object.values(CharacterDirection));
const PLAYER_NAME_PATTERN = /^[\p{L}\p{N}\s_-]{2,24}$/u;

export interface PlayerJoinPayload {
  name: string;
  classType: HeroClass;
  profileId?: string;
}

export class InputValidator {
  validateJoinPayload(payload: unknown): PlayerJoinPayload {
    if (!payload || typeof payload !== 'object') {
      throw new GameError('INVALID_INPUT', 'Ungültige Join-Anfrage.');
    }

    const data = payload as Record<string, unknown>;
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    const classType = data.classType;

    if (!name || !PLAYER_NAME_PATTERN.test(name)) {
      throw new GameError('INVALID_INPUT', 'Name muss 2–24 Zeichen lang sein.');
    }

    if (typeof classType !== 'string' || !VALID_HERO_CLASSES.has(classType)) {
      throw new GameError('INVALID_INPUT', 'Ungültige Heldenklasse.');
    }

    const profileId = typeof data.profileId === 'string' && data.profileId.length <= 64
      ? data.profileId
      : undefined;

    return { name, classType: classType as HeroClass, profileId };
  }

  validateMovePayload(payload: unknown): CharacterDirection {
    if (!payload || typeof payload !== 'object') {
      throw new GameError('INVALID_INPUT', 'Ungültige Bewegungsanfrage.');
    }

    const direction = (payload as { direction?: unknown }).direction;
    if (typeof direction !== 'string' || !VALID_DIRECTIONS.has(direction)) {
      throw new GameError('INVALID_INPUT', 'Ungültige Bewegungsrichtung.');
    }

    return direction as CharacterDirection;
  }

  validateBuildOrderPayload(payload: unknown): BuildOrderRequest {
    if (!payload || typeof payload !== 'object') {
      throw new GameError('INVALID_INPUT', 'Bauauftrag fehlt.');
    }

    const data = payload as Record<string, unknown>;
    const buildingType = data.buildingType;
    const x = data.x;
    const y = data.y;

    if (typeof buildingType !== 'string' || !VALID_BUILDING_TYPES.has(buildingType)) {
      throw new GameError('INVALID_INPUT', 'Ungültiger Gebäudetyp.');
    }

    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new GameError('INVALID_INPUT', 'Kachelkoordinaten müssen ganze Zahlen sein.');
    }

    if (x < 0 || y < 0 || x >= WORLD_MAP_WIDTH || y >= WORLD_MAP_HEIGHT) {
      throw new GameError('INVALID_INPUT', 'Bauplatz liegt außerhalb der Karte.');
    }

    return {
      buildingType: buildingType as BuildingType,
      x: x as number,
      y: y as number,
    };
  }

  validateReconnectPayload(payload: unknown): { sessionToken: string } {
    if (!payload || typeof payload !== 'object') {
      throw new GameError('INVALID_INPUT', 'Reconnect-Anfrage ungültig.');
    }

    const token = (payload as { sessionToken?: unknown }).sessionToken;
    if (typeof token !== 'string' || token.length < 16 || token.length > 128) {
      throw new GameError('INVALID_INPUT', 'Session-Token ungültig.');
    }

    return { sessionToken: token };
  }
}
