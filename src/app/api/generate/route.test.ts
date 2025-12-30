/**
 * Unit tests for POST /api/generate
 *
 * @see Story 2.1: Create Gemini API Proxy Route
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { clearRateLimitStore, RATE_LIMIT_MAX_REQUESTS } from '@/lib/ai/rate-limiter';

// Mock the AI SDK modules
vi.mock('@ai-sdk/google', () => ({
  google: vi.fn(() => 'mocked-model'),
}));

vi.mock('ai', () => ({
  streamText: vi.fn(() =>
    Promise.resolve({
      toTextStreamResponse: vi.fn(() => new Response('streamed data', { status: 200 })),
    })
  ),
}));

/**
 * Helper to create a mock POST request.
 */
function createRequest(
  body: unknown,
  headers?: Record<string, string>
): Request {
  return new Request('http://localhost:3000/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Helper to create a request with custom IP.
 */
function createRequestWithIP(body: unknown, ip: string): Request {
  return createRequest(body, { 'x-forwarded-for': ip });
}

describe('/api/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimitStore();
  });

  afterEach(() => {
    clearRateLimitStore();
  });

  describe('Input Validation', () => {
    it('returns 400 for missing prompt', async () => {
      const req = createRequest({});
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_INPUT');
      expect(data.error.message).toBe('Prompt is required');
    });

    it('returns 400 for empty prompt', async () => {
      const req = createRequest({ prompt: '' });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('INVALID_INPUT');
      expect(data.error.message).toContain('empty');
    });

    it('returns 400 for whitespace-only prompt', async () => {
      const req = createRequest({ prompt: '   ' });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('INVALID_INPUT');
    });

    it('returns 400 for prompt exceeding max length', async () => {
      const longPrompt = 'a'.repeat(1001);
      const req = createRequest({ prompt: longPrompt });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('INVALID_INPUT');
      expect(data.error.message).toContain('too long');
    });

    it('returns 400 for non-string prompt', async () => {
      const req = createRequest({ prompt: 123 });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('INVALID_INPUT');
    });

    it('returns 400 for invalid JSON', async () => {
      const req = new Request('http://localhost:3000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('INVALID_INPUT');
      expect(data.error.message).toContain('Invalid JSON');
    });

    it('accepts valid prompt at max length', async () => {
      const maxLengthPrompt = 'a'.repeat(1000);
      const req = createRequest({ prompt: maxLengthPrompt });
      const res = await POST(req);

      expect(res.status).toBe(200);
    });
  });

  describe('Successful Generation', () => {
    it('returns streaming response for valid prompt', async () => {
      const req = createRequest({ prompt: 'A dragon made of LEGO' });
      const res = await POST(req);

      expect(res.status).toBe(200);
    });

    it('trims whitespace from prompt', async () => {
      const { streamText } = await import('ai');
      const req = createRequest({ prompt: '  A castle  ' });
      await POST(req);

      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({ text: 'A castle' }),
              ]),
            }),
          ]),
        })
      );
    });

    it('uses LEGO generation system prompt', async () => {
      const { streamText } = await import('ai');
      const req = createRequest({ prompt: 'A spaceship' });
      await POST(req);

      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('LEGO'),
        })
      );
    });

    it('supports text-only input (AC #5)', async () => {
      const { streamText } = await import('ai');
      const req = createRequest({ prompt: 'A robot' });
      await POST(req);

      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            {
              role: 'user',
              content: [{ type: 'text', text: 'A robot' }],
            },
          ],
        })
      );
    });

    it('supports text + image input (AC #5)', async () => {
      const { streamText } = await import('ai');
      const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const req = createRequest({ prompt: 'Build this', imageData: testImageData });
      await POST(req);

      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', image: testImageData },
                { type: 'text', text: 'Build this' },
              ],
            },
          ],
        })
      );
    });
  });

  describe('Rate Limiting', () => {
    it('allows requests within rate limit', async () => {
      const ip = '192.168.1.100';

      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        const req = createRequestWithIP({ prompt: `Request ${i}` }, ip);
        const res = await POST(req);
        expect(res.status).toBe(200);
      }
    });

    it('returns 429 when rate limit exceeded', async () => {
      const ip = '192.168.1.101';

      // Exhaust rate limit
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        const req = createRequestWithIP({ prompt: `Request ${i}` }, ip);
        await POST(req);
      }

      // Next request should be rate limited
      const req = createRequestWithIP({ prompt: 'One more request' }, ip);
      const res = await POST(req);

      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('RATE_LIMITED');
      expect(res.headers.get('Retry-After')).toBeTruthy();
    });

    it('tracks rate limits per IP', async () => {
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';

      // Exhaust rate limit for ip1
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        const req = createRequestWithIP({ prompt: `Request ${i}` }, ip1);
        await POST(req);
      }

      // ip2 should still be allowed
      const req = createRequestWithIP({ prompt: 'Request from ip2' }, ip2);
      const res = await POST(req);

      expect(res.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('returns 500 with GENERATION_FAILED on AI error', async () => {
      const { streamText } = await import('ai');
      vi.mocked(streamText).mockRejectedValueOnce(new Error('AI service unavailable'));

      const req = createRequest({ prompt: 'A robot' });
      const res = await POST(req);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('GENERATION_FAILED');
      expect(data.error.message).toBe('Unable to generate model. Please try again.');
    });

    it('does not expose internal error details to client', async () => {
      const { streamText } = await import('ai');
      const secretError = 'Internal secret: API_KEY=xyz123';
      vi.mocked(streamText).mockRejectedValueOnce(new Error(secretError));

      const req = createRequest({ prompt: 'A car' });
      const res = await POST(req);

      const data = await res.json();
      expect(data.error.message).not.toContain('secret');
      expect(data.error.message).not.toContain('API_KEY');
    });
  });

  describe('Response Format', () => {
    it('error responses follow standardized format', async () => {
      const req = createRequest({ prompt: '' });
      const res = await POST(req);

      const data = await res.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('message');
    });
  });
});
