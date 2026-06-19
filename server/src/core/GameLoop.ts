import { serverConfig } from '../config/serverConfig';
import { Logger } from '../logging/Logger';

export type TickCallback = (tick: number, deltaMs: number) => void;
export type SyncCallback = () => void;

export class GameLoop {
  private tick = 0;
  private lastTickAt = 0;
  private tickAccumulator = 0;
  private syncAccumulator = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly onTick: TickCallback,
    private readonly onSync: SyncCallback,
    private readonly logger: Logger,
    private readonly tickMs: number = serverConfig.tickRateHz > 0
      ? Math.floor(1000 / serverConfig.tickRateHz)
      : 50,
    private readonly syncMs: number = serverConfig.syncRateHz > 0
      ? Math.floor(1000 / serverConfig.syncRateHz)
      : 100,
  ) {}

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.lastTickAt = Date.now();

    this.timer = setInterval(() => {
      const now = Date.now();
      const frameMs = now - this.lastTickAt;
      this.lastTickAt = now;

      this.tickAccumulator += frameMs;
      this.syncAccumulator += frameMs;

      while (this.tickAccumulator >= this.tickMs) {
        this.tick += 1;
        this.onTick(this.tick, this.tickMs);
        this.tickAccumulator -= this.tickMs;
      }

      while (this.syncAccumulator >= this.syncMs) {
        this.onSync();
        this.syncAccumulator -= this.syncMs;
      }
    }, Math.min(this.tickMs, this.syncMs));

    this.logger.info('Game-Loop gestartet', {
      tickMs: this.tickMs,
      syncMs: this.syncMs,
      tickRateHz: serverConfig.tickRateHz,
      syncRateHz: serverConfig.syncRateHz,
    });
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
  }

  getCurrentTick(): number {
    return this.tick;
  }
}
