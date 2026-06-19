import { serverConfig } from '../config/serverConfig';
import { Logger } from '../logging/Logger';
import { SessionManager } from '../security/SessionManager';
import { GameRoom } from '../core/GameRoom';

interface PendingDisconnect {
  heroId: string;
  lobbyId: string;
  expiresAt: number;
}

export class ConnectionManager {
  private readonly pending = new Map<string, PendingDisconnect>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly sessionManager: SessionManager,
    private readonly logger: Logger,
    private readonly graceMs: number = serverConfig.disconnectGraceMs,
    private readonly resolveLobby: (lobbyId: string) => GameRoom | undefined,
    private readonly onHeroRemoved: (lobby: GameRoom, heroId: string, newMayorId?: string, newMayorName?: string) => void,
  ) {}

  start(): void {
    this.cleanupTimer = setInterval(() => this.expirePending(), 5000);
  }

  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.pending.clear();
  }

  scheduleGraceDisconnect(lobbyId: string, heroId: string): void {
    this.pending.set(heroId, {
      heroId,
      lobbyId,
      expiresAt: Date.now() + this.graceMs,
    });

    this.logger.info('Grace-Period gestartet', {
      heroId,
      lobbyId,
      graceMs: this.graceMs,
    });
  }

  cancelGrace(heroId: string): void {
    if (this.pending.delete(heroId)) {
      this.logger.info('Grace-Period abgebrochen (Reconnect)', { heroId });
    }
  }

  isInGrace(heroId: string): boolean {
    const entry = this.pending.get(heroId);
    if (!entry) {
      return false;
    }
    return Date.now() <= entry.expiresAt;
  }

  private expirePending(): void {
    const now = Date.now();
    const expired = [...this.pending.entries()].filter(([, entry]) => entry.expiresAt <= now);

    for (const [heroId, entry] of expired) {
      this.pending.delete(heroId);
      const lobby = this.resolveLobby(entry.lobbyId);
      if (!lobby) {
        continue;
      }

      const newMayor = lobby.removeHeroPermanently(heroId, this.sessionManager);
      this.onHeroRemoved(
        lobby,
        heroId,
        newMayor?.id,
        newMayor?.name,
      );
    }

    this.sessionManager.purgeExpired();
  }
}
