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
    // Hard cap on tracked IPs so a flood of distinct keys can't grow the Map
    // without bound (expiry-based cleanup frees nothing during such a flood).
    private maxEntries: number = 10_000
  ) {
    this.cleanupThreshold = Math.max(100, Math.floor(maxRequests * 10));
  }

  check(request: Request): RateLimitResult {
    this.accessCount++;
    if (this.accessCount >= this.cleanupThreshold) {
      this.accessCount = 0;
      this.cleanup();
    }

    // Note: keyed on the client-supplied X-Forwarded-For and stored in-memory,
    // so the limit is best-effort and per-instance (each serverless instance
    // keeps its own counts). Use a shared store for strict global limiting.
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

    if (this.store.size > this.maxEntries) {
      const overflow = this.store.size - this.maxEntries;
      const keys = this.store.keys();
      for (let i = 0; i < overflow; i++) {
        const oldest = keys.next().value;
        if (oldest === undefined) break;
        if (oldest !== ip) this.store.delete(oldest);
      }
    }

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
