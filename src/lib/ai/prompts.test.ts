import { describe, it, expect } from 'vitest';
import {
  LEGO_GENERATION_SYSTEM_PROMPT,
  FIRST_BUILD_SUFFIX,
  IMAGE_TO_LEGO_SYSTEM_PROMPT,
  getSystemPrompt,
  getImageSystemPrompt,
} from './prompts';

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

  describe('IMAGE_TO_LEGO_SYSTEM_PROMPT', () => {
    it('is defined and non-empty', () => {
      expect(IMAGE_TO_LEGO_SYSTEM_PROMPT).toBeDefined();
      expect(IMAGE_TO_LEGO_SYSTEM_PROMPT.length).toBeGreaterThan(0);
    });

    it('mentions image analysis', () => {
      expect(IMAGE_TO_LEGO_SYSTEM_PROMPT.toLowerCase()).toContain('image');
    });

    it('contains analysis instructions', () => {
      expect(IMAGE_TO_LEGO_SYSTEM_PROMPT).toContain('ANALYSIS INSTRUCTIONS');
    });

    it('contains HTML doctype declaration', () => {
      expect(IMAGE_TO_LEGO_SYSTEM_PROMPT).toContain('<!DOCTYPE html>');
    });

    it('contains Three.js importmap', () => {
      expect(IMAGE_TO_LEGO_SYSTEM_PROMPT).toContain('importmap');
    });

    it('defines the addBrick helper function', () => {
      expect(IMAGE_TO_LEGO_SYSTEM_PROMPT).toContain('function addBrick');
    });

    it('instructs to keep design simple', () => {
      expect(IMAGE_TO_LEGO_SYSTEM_PROMPT).toContain('15-50 bricks');
    });

    it('mentions LEGO Master Builder', () => {
      expect(IMAGE_TO_LEGO_SYSTEM_PROMPT).toContain('LEGO Master Builder');
    });
  });

  describe('getSystemPrompt', () => {
    it('returns standard prompt when isFirstBuild is false', () => {
      const prompt = getSystemPrompt(false);
      expect(prompt).toBe(LEGO_GENERATION_SYSTEM_PROMPT);
    });

    it('returns prompt with FIRST_BUILD_SUFFIX when isFirstBuild is true', () => {
      const prompt = getSystemPrompt(true);
      expect(prompt).toContain(LEGO_GENERATION_SYSTEM_PROMPT);
      expect(prompt).toContain(FIRST_BUILD_SUFFIX);
    });

    it('first-build prompt is longer than standard prompt', () => {
      const standardPrompt = getSystemPrompt(false);
      const firstBuildPrompt = getSystemPrompt(true);
      expect(firstBuildPrompt.length).toBeGreaterThan(standardPrompt.length);
    });

    it('first-build prompt mentions simplicity', () => {
      const prompt = getSystemPrompt(true);
      expect(prompt.toLowerCase()).toContain('simple');
    });

    it('first-build prompt mentions brick limit', () => {
      const prompt = getSystemPrompt(true);
      expect(prompt).toContain('50 bricks');
    });
  });

  describe('getImageSystemPrompt', () => {
    it('returns standard image prompt when isFirstBuild is false', () => {
      const prompt = getImageSystemPrompt(false);
      expect(prompt).toBe(IMAGE_TO_LEGO_SYSTEM_PROMPT);
    });

    it('returns prompt with FIRST_BUILD_SUFFIX when isFirstBuild is true', () => {
      const prompt = getImageSystemPrompt(true);
      expect(prompt).toContain(IMAGE_TO_LEGO_SYSTEM_PROMPT);
      expect(prompt).toContain(FIRST_BUILD_SUFFIX);
    });

    it('first-build prompt is longer than standard prompt', () => {
      const standardPrompt = getImageSystemPrompt(false);
      const firstBuildPrompt = getImageSystemPrompt(true);
      expect(firstBuildPrompt.length).toBeGreaterThan(standardPrompt.length);
    });

    it('first-build prompt mentions simplicity', () => {
      const prompt = getImageSystemPrompt(true);
      expect(prompt.toLowerCase()).toContain('simple');
    });

    it('first-build prompt mentions brick limit', () => {
      const prompt = getImageSystemPrompt(true);
      expect(prompt).toContain('50 bricks');
    });
  });
});
