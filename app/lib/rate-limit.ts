export interface RateLimitResult {
  allowed: boolean;
  headers: Record<string, string>;
}

export class RateLimiter {
  private store = new Map<string, number[]>();
  private accessCount = 0;
  private readonly cleanupThreshold: number;

  constructor(
    private maxRequests: number,
    private windowMs: number,
    cleanupIntervalMs: number = 60000
  ) {
    this.cleanupThreshold = Math.max(100, Math.floor(maxRequests * 10));
    setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  check(request: Request): RateLimitResult {
    this.accessCount++;
    if (this.accessCount >= this.cleanupThreshold) {
      this.accessCount = 0;
      this.cleanup();
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let timestamps = this.store.get(ip) ?? [];
    timestamps = timestamps.filter((t) => t > windowStart);

    const reset =
      timestamps.length > 0
        ? Math.ceil((timestamps[0] + this.windowMs) / 1000)
        : Math.ceil((now + this.windowMs) / 1000);

    if (timestamps.length >= this.maxRequests) {
      this.store.set(ip, timestamps);
      return {
        allowed: false,
        headers: {
          "X-RateLimit-Limit": String(this.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(reset),
        },
      };
    }

    timestamps.push(now);
    this.store.set(ip, timestamps);

    return {
      allowed: true,
      headers: {
        "X-RateLimit-Limit": String(this.maxRequests),
        "X-RateLimit-Remaining": String(this.maxRequests - timestamps.length),
        "X-RateLimit-Reset": String(reset),
      },
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    for (const [ip, timestamps] of this.store.entries()) {
      const filtered = timestamps.filter((t) => t > windowStart);
      if (filtered.length === 0) {
        this.store.delete(ip);
      } else {
        this.store.set(ip, filtered);
      }
    }
  }
}
