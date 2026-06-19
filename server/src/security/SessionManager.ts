import { randomBytes } from 'crypto';
import { serverConfig } from '../config/serverConfig';

export interface PlayerSession {
  sessionToken: string;
  heroId: string;
  lobbyId: string;
  createdAt: number;
  expiresAt: number;
}

export class SessionManager {
  private readonly sessions = new Map<string, PlayerSession>();
  private readonly heroToToken = new Map<string, string>();

  createSession(heroId: string, lobbyId: string): PlayerSession {
    const existingToken = this.heroToToken.get(heroId);
    if (existingToken) {
      this.sessions.delete(existingToken);
    }

    const sessionToken = randomBytes(32).toString('hex');
    const now = Date.now();
    const session: PlayerSession = {
      sessionToken,
      heroId,
      lobbyId,
      createdAt: now,
      expiresAt: now + serverConfig.sessionTtlMs,
    };

    this.sessions.set(sessionToken, session);
    this.heroToToken.set(heroId, sessionToken);
    return session;
  }

  getSession(sessionToken: string): PlayerSession | undefined {
    const session = this.sessions.get(sessionToken);
    if (!session) {
      return undefined;
    }

    if (Date.now() > session.expiresAt) {
      this.revoke(sessionToken);
      return undefined;
    }

    return session;
  }

  getTokenByHero(heroId: string): string | undefined {
    return this.heroToToken.get(heroId);
  }

  refresh(sessionToken: string): void {
    const session = this.sessions.get(sessionToken);
    if (!session) {
      return;
    }

    session.expiresAt = Date.now() + serverConfig.sessionTtlMs;
    this.sessions.set(sessionToken, session);
  }

  revoke(sessionToken: string): void {
    const session = this.sessions.get(sessionToken);
    if (!session) {
      return;
    }

    this.sessions.delete(sessionToken);
    this.heroToToken.delete(session.heroId);
  }

  revokeByHero(heroId: string): void {
    const token = this.heroToToken.get(heroId);
    if (token) {
      this.revoke(token);
    }
  }

  purgeExpired(): number {
    const now = Date.now();
    let removed = 0;

    for (const [token, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.revoke(token);
        removed += 1;
      }
    }

    return removed;
  }
}
