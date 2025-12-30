/**
 * Unit tests for the AI prompts module.
 */

import { describe, it, expect } from 'vitest';
import { LEGO_GENERATION_SYSTEM_PROMPT, FIRST_BUILD_SUFFIX } from './prompts';

describe('AI Prompts', () => {
  describe('LEGO_GENERATION_SYSTEM_PROMPT', () => {
    it('is defined and non-empty', () => {
      expect(LEGO_GENERATION_SYSTEM_PROMPT).toBeDefined();
      expect(LEGO_GENERATION_SYSTEM_PROMPT.length).toBeGreaterThan(0);
    });

    it('mentions LEGO Master Builder', () => {
      expect(LEGO_GENERATION_SYSTEM_PROMPT).toContain('LEGO Master Builder');
    });

    it('contains HTML doctype declaration', () => {
      expect(LEGO_GENERATION_SYSTEM_PROMPT).toContain('<!DOCTYPE html>');
    });

    it('contains Three.js importmap', () => {
      expect(LEGO_GENERATION_SYSTEM_PROMPT).toContain('importmap');
    });

    it('defines the addBrick helper function', () => {
      expect(LEGO_GENERATION_SYSTEM_PROMPT).toContain('function addBrick');
    });

    it('instructs to loop/call addBrick repeatedly', () => {
      expect(LEGO_GENERATION_SYSTEM_PROMPT).toContain('specific addBrick() calls');
    });

    it('enforces strict integer alignment', () => {
      expect(LEGO_GENERATION_SYSTEM_PROMPT).toContain('integers');
    });

    it('defines standard camera setup', () => {
      expect(LEGO_GENERATION_SYSTEM_PROMPT).toContain('camera.position.set');
    });
  });

  describe('FIRST_BUILD_SUFFIX', () => {
    it('is defined and non-empty', () => {
      expect(FIRST_BUILD_SUFFIX).toBeDefined();
      expect(FIRST_BUILD_SUFFIX.length).toBeGreaterThan(0);
    });

    it('limits brick count for beginners', () => {
      expect(FIRST_BUILD_SUFFIX).toContain('50 bricks');
    });

    it('emphasizes simplicity', () => {
      expect(FIRST_BUILD_SUFFIX.toLowerCase()).toContain('simple');
    });
  });
});
