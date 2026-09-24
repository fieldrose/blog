/**
 * Best-effort instance-level fixed-window rate limiter for serverless BFF routes.
 * NOT a global guarantee — real vote uniqueness is enforced in the database
 * by partial unique indexes. This only raises the cost of abuse.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 5_000;

/**
 * Returns true when the request is allowed, false when the window limit is hit.
 */
export function rateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    sweep(now);
    return true;
  }

  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

/** Opportunistically drop expired buckets so the Map cannot grow unbounded. */
function sweep(now: number): void {
  if (buckets.size < MAX_TRACKED_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
