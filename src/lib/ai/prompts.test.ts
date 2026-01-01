import { describe, it, expect } from 'vitest';
import {
  LEGO_GENERATION_SYSTEM_PROMPT,
  FIRST_BUILD_SUFFIX,
  IMAGE_TO_LEGO_SYSTEM_PROMPT,
  STRUCTURAL_ANALYSIS_SUFFIX,
  STABILITY_REGENERATION_SUFFIX,
  getSystemPrompt,
  getImageSystemPrompt,
  type SystemPromptOptions,
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

    it('instructs to add addBrick calls in BUILD section', () => {
      expect(LEGO_GENERATION_SYSTEM_PROMPT).toContain('addBrick() calls');
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

    it('emphasizes standard brick sizes for beginners', () => {
      expect(FIRST_BUILD_SUFFIX).toContain('standard brick sizes');
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

    it('defines isStable field in format', () => {
      expect(STRUCTURAL_ANALYSIS_SUFFIX).toContain('isStable');
    });

    it('defines severity levels', () => {
      expect(STRUCTURAL_ANALYSIS_SUFFIX).toContain('warning|critical');
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

    it('contains image analysis section', () => {
      expect(IMAGE_TO_LEGO_SYSTEM_PROMPT).toContain('IMAGE ANALYSIS');
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

    it('instructs to use appropriate brick count for accuracy', () => {
      expect(IMAGE_TO_LEGO_SYSTEM_PROMPT).toContain('80-120 bricks');
    });

    it('mentions LEGO Master Builder', () => {
      expect(IMAGE_TO_LEGO_SYSTEM_PROMPT).toContain('LEGO Master Builder');
    });
  });

  describe('getSystemPrompt', () => {
    it('always includes structural analysis suffix', () => {
      const { systemPrompt } = getSystemPrompt(false);
      expect(systemPrompt).toContain(STRUCTURAL_ANALYSIS_SUFFIX);
    });

    it('returns prompt with FIRST_BUILD_SUFFIX when isFirstBuild is true', () => {
      const { systemPrompt } = getSystemPrompt(true);
      expect(systemPrompt).toContain(LEGO_GENERATION_SYSTEM_PROMPT);
      expect(systemPrompt).toContain(FIRST_BUILD_SUFFIX);
      expect(systemPrompt).toContain(STRUCTURAL_ANALYSIS_SUFFIX);
    });

    it('first-build prompt is longer than standard prompt', () => {
      const { systemPrompt: standardPrompt } = getSystemPrompt(false);
      const { systemPrompt: firstBuildPrompt } = getSystemPrompt(true);
      expect(firstBuildPrompt.length).toBeGreaterThan(standardPrompt.length);
    });

    it('first-build prompt mentions simplicity', () => {
      const { systemPrompt } = getSystemPrompt(true);
      expect(systemPrompt.toLowerCase()).toContain('simple');
    });

    it('first-build prompt mentions standard brick sizes', () => {
      const { systemPrompt } = getSystemPrompt(true);
      expect(systemPrompt).toContain('standard brick sizes');
    });

    it('includes STRUCTURAL_ANALYSIS marker in all modes', () => {
      expect(getSystemPrompt(false).systemPrompt).toContain('STRUCTURAL_ANALYSIS');
      expect(getSystemPrompt(true).systemPrompt).toContain('STRUCTURAL_ANALYSIS');
    });

    it('returns category from prompt detection', () => {
      const { category: vehicleCategory } = getSystemPrompt(false, 'build a car');
      expect(vehicleCategory).toBe('vehicles');

      const { category: generalCategory } = getSystemPrompt(false);
      expect(generalCategory).toBe('general');
    });

    it('includes category-specific guidelines when prompt provided', () => {
      const { systemPrompt } = getSystemPrompt(false, 'build a car');
      expect(systemPrompt).toContain('WHEEL');
      expect(systemPrompt).toContain('BRICKS:');
    });

    it('supports options object with targetBrickCount', () => {
      const opts: SystemPromptOptions = {
        isFirstBuild: false,
        userPrompt: 'build a house',
        targetBrickCount: 100,
      };
      const { systemPrompt } = getSystemPrompt(opts);
      expect(systemPrompt).toContain('Target ~100 bricks');
      expect(systemPrompt).toContain('90 to 110 acceptable');
    });

    it('uses targetBrickCount instead of category minimum when specified', () => {
      const opts: SystemPromptOptions = {
        isFirstBuild: false,
        userPrompt: 'build a car',
        targetBrickCount: 75,
      };
      const { systemPrompt } = getSystemPrompt(opts);
      expect(systemPrompt).toContain('Target ~75 bricks');
      expect(systemPrompt).not.toContain('Use at least');
    });

    it('works with targetBrickCount and no userPrompt', () => {
      const opts: SystemPromptOptions = {
        isFirstBuild: false,
        targetBrickCount: 50,
      };
      const { systemPrompt } = getSystemPrompt(opts);
      expect(systemPrompt).toContain('Target ~50 bricks');
    });
  });

  describe('getImageSystemPrompt', () => {
    it('always includes structural analysis suffix', () => {
      const { systemPrompt } = getImageSystemPrompt(false);
      expect(systemPrompt).toContain(STRUCTURAL_ANALYSIS_SUFFIX);
    });

    it('returns prompt with FIRST_BUILD_SUFFIX when isFirstBuild is true', () => {
      const { systemPrompt } = getImageSystemPrompt(true);
      expect(systemPrompt).toContain(IMAGE_TO_LEGO_SYSTEM_PROMPT);
      expect(systemPrompt).toContain(FIRST_BUILD_SUFFIX);
      expect(systemPrompt).toContain(STRUCTURAL_ANALYSIS_SUFFIX);
    });

    it('first-build prompt is longer than standard prompt', () => {
      const { systemPrompt: standardPrompt } = getImageSystemPrompt(false);
      const { systemPrompt: firstBuildPrompt } = getImageSystemPrompt(true);
      expect(firstBuildPrompt.length).toBeGreaterThan(standardPrompt.length);
    });

    it('first-build prompt mentions simplicity', () => {
      const { systemPrompt } = getImageSystemPrompt(true);
      expect(systemPrompt.toLowerCase()).toContain('simple');
    });

    it('first-build prompt mentions standard brick sizes', () => {
      const { systemPrompt } = getImageSystemPrompt(true);
      expect(systemPrompt).toContain('standard brick sizes');
    });

    it('includes STRUCTURAL_ANALYSIS marker in all modes', () => {
      expect(getImageSystemPrompt(false).systemPrompt).toContain('STRUCTURAL_ANALYSIS');
      expect(getImageSystemPrompt(true).systemPrompt).toContain('STRUCTURAL_ANALYSIS');
    });

    it('returns category from prompt detection', () => {
      const { category } = getImageSystemPrompt(false, 'picture of a dog');
      expect(category).toBe('animals');
    });
  });
});

