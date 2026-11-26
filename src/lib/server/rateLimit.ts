/**
 * 面向 serverless BFF 路由的尽力而为、实例级固定窗口限流器。
 * 不提供全局保证——真正的投票唯一性由数据库的 partial unique index 约束。
 * 该限流仅提高滥用成本。
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 5_000;

/**
 * 请求允许时返回 true，达到窗口上限时返回 false。
 * `limit` 默认 30，`windowMs` 默认 60 秒。
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

/** 择机清理已过期桶，避免 Map 无界增长。 */
function sweep(now: number): void {
  if (buckets.size < MAX_TRACKED_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
