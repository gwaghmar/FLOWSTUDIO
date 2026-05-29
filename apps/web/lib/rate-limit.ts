import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// In-memory fallback for local dev / when Upstash is not configured.
// NOT suitable for production — per-process, resets on every cold start.
const inMemoryHits = new Map<string, { n: number; reset: number }>();

function inMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const cur = inMemoryHits.get(key);
  if (!cur || now > cur.reset) {
    inMemoryHits.set(key, { n: 1, reset: now + windowMs });
    return { ok: true };
  }
  if (cur.n >= limit) {
    return { ok: false, retryAfter: Math.ceil((cur.reset - now) / 1000) };
  }
  cur.n += 1;
  return { ok: true };
}

function createUpstashLimiter(limit: number, windowSeconds: number) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const redis = new Redis({ url, token });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    prefix: "flowstudio:rl",
  });
}

// Cached limiter instance per (limit, window) pair — avoids creating a new Redis
// connection on every request in the same Lambda instance.
const limiterCache = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowSeconds: number): Ratelimit | null {
  const key = `${limit}:${windowSeconds}`;
  if (!limiterCache.has(key)) {
    const l = createUpstashLimiter(limit, windowSeconds);
    if (l) limiterCache.set(key, l);
  }
  return limiterCache.get(key) ?? null;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const windowSeconds = Math.ceil(windowMs / 1000);
  const limiter = getLimiter(limit, windowSeconds);

  if (limiter) {
    const result = await limiter.limit(key);
    if (result.success) return { ok: true };
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    return { ok: false, retryAfter: Math.max(1, retryAfter) };
  }

  // Fallback: in-memory (dev only)
  return inMemoryRateLimit(key, limit, windowMs);
}
