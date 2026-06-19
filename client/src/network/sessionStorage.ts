import { HeroClass } from '@shared/types';

const SESSION_STORAGE_KEY = 'chuck-land-session';

export interface StoredPlayerSession {
  sessionToken: string;
  heroId: string;
  expiresAt: number;
  name: string;
  classType: HeroClass;
  profileId: string;
}

export function loadStoredSession(): StoredPlayerSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredPlayerSession;
    if (!parsed.sessionToken || !parsed.heroId || !parsed.expiresAt) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredSession(session: StoredPlayerSession): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function isStoredSessionValid(session: StoredPlayerSession | null): session is StoredPlayerSession {
  return Boolean(session && session.expiresAt > Date.now());
}
