import { describe, it, expect } from 'vitest';
import {
  LEGO_GENERATION_SYSTEM_PROMPT,
  FIRST_BUILD_SUFFIX,
  IMAGE_TO_LEGO_SYSTEM_PROMPT,
  STRUCTURAL_ANALYSIS_SUFFIX,
  STABILITY_REGENERATION_SUFFIX,
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

  describe('STRUCTURAL_ANALYSIS_SUFFIX', () => {
    it('is defined and non-empty', () => {
      expect(STRUCTURAL_ANALYSIS_SUFFIX).toBeDefined();
      expect(STRUCTURAL_ANALYSIS_SUFFIX.length).toBeGreaterThan(0);
    });

    it('contains STRUCTURAL_ANALYSIS marker', () => {
      expect(STRUCTURAL_ANALYSIS_SUFFIX).toContain('STRUCTURAL_ANALYSIS');
    });

    it('contains issue types to evaluate', () => {
      expect(STRUCTURAL_ANALYSIS_SUFFIX).toContain('CANTILEVER');
      expect(STRUCTURAL_ANALYSIS_SUFFIX).toContain('FLOATING');
      expect(STRUCTURAL_ANALYSIS_SUFFIX).toContain('TOO_TALL');
      expect(STRUCTURAL_ANALYSIS_SUFFIX).toContain('NARROW_BASE');
      expect(STRUCTURAL_ANALYSIS_SUFFIX).toContain('UNBALANCED');
    });

    it('specifies JSON output format', () => {
      expect(STRUCTURAL_ANALYSIS_SUFFIX).toContain('isStable');
      expect(STRUCTURAL_ANALYSIS_SUFFIX).toContain('issues');
      expect(STRUCTURAL_ANALYSIS_SUFFIX).toContain('overallScore');
      expect(STRUCTURAL_ANALYSIS_SUFFIX).toContain('summary');
    });

    it('provides example for stable model', () => {
      expect(STRUCTURAL_ANALYSIS_SUFFIX).toContain('"isStable":true');
    });

    it('provides example for unstable model', () => {
      expect(STRUCTURAL_ANALYSIS_SUFFIX).toContain('"isStable":false');
    });
  });

  describe('STABILITY_REGENERATION_SUFFIX', () => {
    it('is defined and non-empty', () => {
      expect(STABILITY_REGENERATION_SUFFIX).toBeDefined();
      expect(STABILITY_REGENERATION_SUFFIX.length).toBeGreaterThan(0);
    });

    it('mentions structural stability', () => {
      expect(STABILITY_REGENERATION_SUFFIX.toLowerCase()).toContain('stable');
    });

    it('mentions wider base', () => {
      expect(STABILITY_REGENERATION_SUFFIX.toLowerCase()).toContain('wider base');
    });

    it('mentions support columns', () => {
      expect(STABILITY_REGENERATION_SUFFIX.toLowerCase()).toContain('support');
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
    it('always includes structural analysis suffix', () => {
      const prompt = getSystemPrompt(false);
      expect(prompt).toContain(STRUCTURAL_ANALYSIS_SUFFIX);
    });

    it('returns prompt with FIRST_BUILD_SUFFIX when isFirstBuild is true', () => {
      const prompt = getSystemPrompt(true);
      expect(prompt).toContain(LEGO_GENERATION_SYSTEM_PROMPT);
      expect(prompt).toContain(FIRST_BUILD_SUFFIX);
      expect(prompt).toContain(STRUCTURAL_ANALYSIS_SUFFIX);
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

    it('includes STRUCTURAL_ANALYSIS marker in all modes', () => {
      expect(getSystemPrompt(false)).toContain('STRUCTURAL_ANALYSIS');
      expect(getSystemPrompt(true)).toContain('STRUCTURAL_ANALYSIS');
    });
  });

  describe('getImageSystemPrompt', () => {
    it('always includes structural analysis suffix', () => {
      const prompt = getImageSystemPrompt(false);
      expect(prompt).toContain(STRUCTURAL_ANALYSIS_SUFFIX);
    });

    it('returns prompt with FIRST_BUILD_SUFFIX when isFirstBuild is true', () => {
      const prompt = getImageSystemPrompt(true);
      expect(prompt).toContain(IMAGE_TO_LEGO_SYSTEM_PROMPT);
      expect(prompt).toContain(FIRST_BUILD_SUFFIX);
      expect(prompt).toContain(STRUCTURAL_ANALYSIS_SUFFIX);
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

    it('includes STRUCTURAL_ANALYSIS marker in all modes', () => {
      expect(getImageSystemPrompt(false)).toContain('STRUCTURAL_ANALYSIS');
      expect(getImageSystemPrompt(true)).toContain('STRUCTURAL_ANALYSIS');
    });
  });
});

