export class RateLimiter {
  private readonly buckets = new Map<string, { tokens: number; lastRefill: number }>();

  constructor(
    private readonly maxTokens: number,
    private readonly refillIntervalMs: number = 1000,
  ) {}

  tryConsume(key: string, cost = 1): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key) ?? { tokens: this.maxTokens, lastRefill: now };

    const elapsed = now - bucket.lastRefill;
    if (elapsed >= this.refillIntervalMs) {
      const intervals = Math.floor(elapsed / this.refillIntervalMs);
      bucket.tokens = Math.min(this.maxTokens, bucket.tokens + intervals * this.maxTokens);
      bucket.lastRefill = now;
    }

    if (bucket.tokens < cost) {
      this.buckets.set(key, bucket);
      return false;
    }

    bucket.tokens -= cost;
    this.buckets.set(key, bucket);
    return true;
  }

  release(key: string): void {
    this.buckets.delete(key);
  }

  clear(): void {
    this.buckets.clear();
  }
}
