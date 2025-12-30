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

    it('mentions LEGO', () => {
      expect(LEGO_GENERATION_SYSTEM_PROMPT).toContain('LEGO');
    });

    it('mentions Three.js for 3D rendering', () => {
      expect(LEGO_GENERATION_SYSTEM_PROMPT).toContain('Three.js');
    });

    it('specifies brick sizes', () => {
      expect(LEGO_GENERATION_SYSTEM_PROMPT).toMatch(/1x1|2x2|2x4/);
    });

    it('mentions HTML output format', () => {
      expect(LEGO_GENERATION_SYSTEM_PROMPT).toContain('HTML');
    });

    it('mentions iframe rendering', () => {
      expect(LEGO_GENERATION_SYSTEM_PROMPT).toContain('iframe');
    });

    it('instructs to avoid markdown formatting', () => {
      expect(LEGO_GENERATION_SYSTEM_PROMPT).toContain('Do not include any markdown');
    });

    it('mentions OrbitControls for interaction', () => {
      expect(LEGO_GENERATION_SYSTEM_PROMPT).toContain('OrbitControls');
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

    it('mentions beginner-friendly', () => {
      expect(FIRST_BUILD_SUFFIX).toContain('beginner-friendly');
    });

    it('prioritizes stability', () => {
      expect(FIRST_BUILD_SUFFIX).toContain('stability');
    });
  });
});
