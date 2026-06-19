import { MAX_PLAYERS } from '../../../shared/types';

export interface ServerConfig {
  port: number;
  /** Game-Logic-Ticks pro Sekunde (Authoritative Simulation) */
  tickRateHz: number;
  /** Weltzustand-Broadcasts pro Sekunde an Clients */
  syncRateHz: number;
  maxPlayersPerLobby: number;
  maxLobbies: number;
  defaultLobbyId: string;
  disconnectGraceMs: number;
  persistIntervalMs: number;
  dbPath: string;
  corsOrigin: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** Rate-Limit: max. Aktionen pro Sekunde pro Socket */
  rateLimitPerSecond: number;
  /** Session-Gültigkeit für Reconnect (ms) */
  sessionTtlMs: number;
}

function readInt(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readLogLevel(): ServerConfig['logLevel'] {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  if (level === 'debug' || level === 'info' || level === 'warn' || level === 'error') {
    return level;
  }
  return 'info';
}

export const serverConfig: ServerConfig = {
  port: readInt('PORT', 3000),
  tickRateHz: readInt('TICK_RATE_HZ', 20),
  syncRateHz: readInt('SYNC_RATE_HZ', 10),
  maxPlayersPerLobby: readInt('MAX_PLAYERS', MAX_PLAYERS),
  maxLobbies: readInt('MAX_LOBBIES', 16),
  defaultLobbyId: process.env.DEFAULT_LOBBY_ID ?? 'main',
  disconnectGraceMs: readInt('DISCONNECT_GRACE_MS', 60_000),
  persistIntervalMs: readInt('PERSIST_INTERVAL_MS', 30_000),
  dbPath: process.env.DB_PATH ?? 'data/chuck-land.db',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  logLevel: readLogLevel(),
  rateLimitPerSecond: readInt('RATE_LIMIT_PER_SECOND', 30),
  sessionTtlMs: readInt('SESSION_TTL_MS', 3_600_000),
};

export function tickIntervalMs(config: ServerConfig = serverConfig): number {
  return Math.floor(1000 / config.tickRateHz);
}

export function syncIntervalMs(config: ServerConfig = serverConfig): number {
  return Math.floor(1000 / config.syncRateHz);
}
