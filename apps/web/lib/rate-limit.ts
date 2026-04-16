const hits = new Map<string, { n: number; reset: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now > cur.reset) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return { ok: true };
  }
  if (cur.n >= limit) {
    return { ok: false, retryAfter: Math.ceil((cur.reset - now) / 1000) };
  }
  cur.n += 1;
  return { ok: true };
}
