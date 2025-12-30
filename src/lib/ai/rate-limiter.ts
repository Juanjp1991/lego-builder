/**
 * Simple In-Memory Rate Limiter
 *
 * MVP implementation - tracks requests per IP address.
 * For production, consider using upstash-ratelimit for distributed environments.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/** Maximum requests allowed per window */
export const RATE_LIMIT_MAX_REQUESTS = 10;

/** Rate limit window in milliseconds (1 minute) */
export const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Extracts client IP from request headers.
 * Handles common proxy headers (x-forwarded-for, x-real-ip).
 */
export function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  return 'unknown';
}

/**
 * Checks if the client has exceeded the rate limit.
 * Returns true if request is allowed, false if rate limited.
 */
export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  // No existing record or window expired - start fresh
  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  // Check if limit exceeded
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  // Increment counter
  record.count++;
  return true;
}

/**
 * Gets the number of seconds until the rate limit resets.
 */
export function getRetryAfterSeconds(ip: string): number {
  const record = rateLimitStore.get(ip);
  if (!record) return 0;

  const now = Date.now();
  const remaining = record.resetTime - now;
  return Math.max(0, Math.ceil(remaining / 1000));
}

/**
 * Clears the rate limit store (useful for testing).
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}

/**
 * Removes expired entries from the rate limit store.
 * Call this periodically to prevent memory leaks in long-running servers.
 * Returns the number of entries cleaned up.
 */
export function cleanupExpiredEntries(): number {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(ip);
      cleanedCount++;
    }
  }

  return cleanedCount;
}

/**
 * Gets the current size of the rate limit store.
 * Useful for monitoring memory usage.
 */
export function getRateLimitStoreSize(): number {
  return rateLimitStore.size;
}
