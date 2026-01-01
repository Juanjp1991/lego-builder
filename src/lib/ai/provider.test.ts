/**
 * Unit tests for the AI provider module.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock @ai-sdk/google before importing provider
vi.mock('@ai-sdk/google', () => ({
  google: vi.fn((modelId: string) => ({ modelId, provider: 'google' })),
}));

import { geminiFlash, geminiPro, geminiWithThinking } from './provider';

describe('AI Provider', () => {
  describe('geminiFlash', () => {
    it('is configured with gemini-2.5-flash model', () => {
      expect(geminiFlash).toEqual({
        modelId: 'gemini-2.5-flash',
        provider: 'google',
      });
    });
  });

  describe('geminiPro', () => {
    it('is configured with gemini-2.5-pro model', () => {
      expect(geminiPro).toEqual({
        modelId: 'gemini-2.5-pro',
        provider: 'google',
      });
    });
  });

  describe('geminiWithThinking', () => {
    it('is configured with gemini-2.5-pro model', () => {
      expect(geminiWithThinking).toEqual({
        modelId: 'gemini-2.5-pro',
        provider: 'google',
      });
    });
  });

  describe('provider exports', () => {
    it('exports all three model configurations', () => {
      expect(geminiFlash).toBeDefined();
      expect(geminiPro).toBeDefined();
      expect(geminiWithThinking).toBeDefined();
    });
  });
});
