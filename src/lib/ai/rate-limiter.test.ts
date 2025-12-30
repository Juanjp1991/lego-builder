/**
 * Unit tests for the rate limiter module.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  checkRateLimit,
  getClientIP,
  getRetryAfterSeconds,
  clearRateLimitStore,
  cleanupExpiredEntries,
  getRateLimitStoreSize,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
} from './rate-limiter';

describe('rate-limiter', () => {
  beforeEach(() => {
    clearRateLimitStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    clearRateLimitStore();
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('allows first request from new IP', () => {
      expect(checkRateLimit('192.168.1.1')).toBe(true);
    });

    it('allows requests up to the limit', () => {
      const ip = '192.168.1.2';
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        expect(checkRateLimit(ip)).toBe(true);
      }
    });

    it('blocks requests exceeding the limit', () => {
      const ip = '192.168.1.3';
      // Use up all allowed requests
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        checkRateLimit(ip);
      }
      // Next request should be blocked
      expect(checkRateLimit(ip)).toBe(false);
    });

    it('resets after the time window expires', () => {
      const ip = '192.168.1.4';
      // Use up all allowed requests
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        checkRateLimit(ip);
      }
      expect(checkRateLimit(ip)).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(RATE_LIMIT_WINDOW_MS + 1);

      // Should be allowed again
      expect(checkRateLimit(ip)).toBe(true);
    });

    it('tracks different IPs independently', () => {
      const ip1 = '192.168.1.10';
      const ip2 = '192.168.1.11';

      // Use up all requests for ip1
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        checkRateLimit(ip1);
      }

      // ip1 should be blocked
      expect(checkRateLimit(ip1)).toBe(false);
      // ip2 should still be allowed
      expect(checkRateLimit(ip2)).toBe(true);
    });
  });

  describe('getClientIP', () => {
    it('extracts IP from x-forwarded-for header', () => {
      const req = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '203.0.113.50' },
      });
      expect(getClientIP(req)).toBe('203.0.113.50');
    });

    it('extracts first IP from comma-separated x-forwarded-for', () => {
      const req = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '203.0.113.50, 198.51.100.10, 192.0.2.1' },
      });
      expect(getClientIP(req)).toBe('203.0.113.50');
    });

    it('extracts IP from x-real-ip header', () => {
      const req = new Request('http://localhost', {
        headers: { 'x-real-ip': '198.51.100.20' },
      });
      expect(getClientIP(req)).toBe('198.51.100.20');
    });

    it('prefers x-forwarded-for over x-real-ip', () => {
      const req = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '203.0.113.50',
          'x-real-ip': '198.51.100.20',
        },
      });
      expect(getClientIP(req)).toBe('203.0.113.50');
    });

    it('returns "unknown" when no IP headers present', () => {
      const req = new Request('http://localhost');
      expect(getClientIP(req)).toBe('unknown');
    });
  });

  describe('getRetryAfterSeconds', () => {
    it('returns 0 for unknown IP', () => {
      expect(getRetryAfterSeconds('unknown-ip')).toBe(0);
    });

    it('returns remaining seconds until reset', () => {
      const ip = '192.168.1.20';
      checkRateLimit(ip);

      // Should return approximately 60 seconds
      const retryAfter = getRetryAfterSeconds(ip);
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60);
    });

    it('returns 0 after window expires', () => {
      const ip = '192.168.1.21';
      checkRateLimit(ip);

      vi.advanceTimersByTime(RATE_LIMIT_WINDOW_MS + 1);

      expect(getRetryAfterSeconds(ip)).toBe(0);
    });
  });

  describe('clearRateLimitStore', () => {
    it('clears all rate limit records', () => {
      const ip = '192.168.1.30';
      // Use up all requests
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        checkRateLimit(ip);
      }
      expect(checkRateLimit(ip)).toBe(false);

      // Clear the store
      clearRateLimitStore();

      // Should be allowed again
      expect(checkRateLimit(ip)).toBe(true);
    });
  });

  describe('cleanupExpiredEntries', () => {
    it('removes expired entries from the store', () => {
      // Create entries for multiple IPs
      checkRateLimit('192.168.1.40');
      checkRateLimit('192.168.1.41');
      checkRateLimit('192.168.1.42');

      expect(getRateLimitStoreSize()).toBe(3);

      // Advance time past the window
      vi.advanceTimersByTime(RATE_LIMIT_WINDOW_MS + 1);

      // Cleanup should remove all expired entries
      const cleaned = cleanupExpiredEntries();
      expect(cleaned).toBe(3);
      expect(getRateLimitStoreSize()).toBe(0);
    });

    it('keeps non-expired entries', () => {
      checkRateLimit('192.168.1.50');

      // Advance time but not past the window
      vi.advanceTimersByTime(RATE_LIMIT_WINDOW_MS / 2);

      // Add another entry
      checkRateLimit('192.168.1.51');

      // Advance time to expire only the first entry
      vi.advanceTimersByTime((RATE_LIMIT_WINDOW_MS / 2) + 1);

      const cleaned = cleanupExpiredEntries();
      expect(cleaned).toBe(1);
      expect(getRateLimitStoreSize()).toBe(1);
    });

    it('returns 0 when no entries to clean', () => {
      const cleaned = cleanupExpiredEntries();
      expect(cleaned).toBe(0);
    });
  });

  describe('getRateLimitStoreSize', () => {
    it('returns 0 for empty store', () => {
      expect(getRateLimitStoreSize()).toBe(0);
    });

    it('returns correct count of entries', () => {
      checkRateLimit('192.168.1.60');
      checkRateLimit('192.168.1.61');
      checkRateLimit('192.168.1.62');

      expect(getRateLimitStoreSize()).toBe(3);
    });
  });
});
