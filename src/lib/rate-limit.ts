/**
 * Simple in-memory rate limiter.
 * Suitable for single-process / demo. Use Redis for multi-instance production.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const store = new Map<string, Bucket>();

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * @param key - Unique key (e.g. `ip:login` or `userId:action`)
 * @param limit - Max requests per window
 * @param windowMs - Window length in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  let bucket = store.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    store.set(key, bucket);
  }

  if (bucket.count >= limit) {
    return { success: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return {
    success: true,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

/** Alias used by API routes. */
export function checkRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
): RateLimitResult {
  return rateLimit(key, limit, windowMs);
}

/** Test / maintenance helper. */
export function clearRateLimitStore(): void {
  store.clear();
}
