import { describe, it, expect } from 'vitest';
import {
  detectCategory,
  getCategoryGuidelines,
  getCategoryBrickCount,
  getGuidelinesForPrompt,
  CATEGORY_KEYWORDS,
  CATEGORY_GUIDELINES,
  CATEGORY_BRICK_COUNTS,
  type LegoCategory,
} from './categories';

describe('detectCategory', () => {
  describe('vehicles', () => {
    it('detects car prompts', () => {
      expect(detectCategory('build a red car')).toBe('vehicles');
      expect(detectCategory('sports car')).toBe('vehicles');
      expect(detectCategory('a race car with flames')).toBe('vehicles');
    });

    it('detects aircraft prompts', () => {
      expect(detectCategory('airplane')).toBe('vehicles');
      expect(detectCategory('a helicopter landing')).toBe('vehicles');
      expect(detectCategory('rocket ship')).toBe('vehicles');
    });

    it('detects boats', () => {
      expect(detectCategory('sailboat')).toBe('vehicles');
      expect(detectCategory('a small boat')).toBe('vehicles');
      expect(detectCategory('yacht')).toBe('vehicles');
    });

    it('detects trains', () => {
      expect(detectCategory('steam train')).toBe('vehicles');
      expect(detectCategory('locomotive')).toBe('vehicles');
    });
  });

  describe('buildings', () => {
    it('detects house prompts', () => {
      expect(detectCategory('a small house')).toBe('buildings');
      expect(detectCategory('cottage in the woods')).toBe('buildings');
    });

    it('detects commercial buildings', () => {
      expect(detectCategory('office building')).toBe('buildings');
      expect(detectCategory('a hospital')).toBe('buildings');
    });

    it('detects castles', () => {
      expect(detectCategory('medieval castle')).toBe('buildings');
      expect(detectCategory('palace')).toBe('buildings');
    });
  });

  describe('animals', () => {
    it('detects common pets', () => {
      expect(detectCategory('a cute dog')).toBe('animals');
      expect(detectCategory('my cat')).toBe('animals');
    });

    it('detects wild animals', () => {
      expect(detectCategory('elephant')).toBe('animals');
      expect(detectCategory('a lion roaring')).toBe('animals');
    });

    it('detects dinosaurs', () => {
      expect(detectCategory('t-rex')).toBe('animals');
      expect(detectCategory('triceratops')).toBe('animals');
    });

    it('detects sea creatures', () => {
      expect(detectCategory('shark')).toBe('animals');
      expect(detectCategory('whale')).toBe('animals');
    });
  });

  describe('characters', () => {
    it('detects people', () => {
      expect(detectCategory('a ninja')).toBe('characters');
      expect(detectCategory('knight in armor')).toBe('characters');
    });

    it('detects fantasy characters', () => {
      expect(detectCategory('wizard with staff')).toBe('characters');
      expect(detectCategory('a robot')).toBe('characters');
    });

    it('detects superheros', () => {
      expect(detectCategory('superhero')).toBe('characters');
    });
  });

  describe('furniture', () => {
    it('detects seating', () => {
      expect(detectCategory('a chair')).toBe('furniture');
      expect(detectCategory('sofa')).toBe('furniture');
    });

    it('detects tables', () => {
      expect(detectCategory('dining table')).toBe('furniture');
      expect(detectCategory('desk')).toBe('furniture');
    });

    it('detects storage', () => {
      expect(detectCategory('bookshelf')).toBe('furniture');
      expect(detectCategory('dresser')).toBe('furniture');
    });
  });

  describe('nature', () => {
    it('detects plants', () => {
      expect(detectCategory('a tree')).toBe('nature');
      expect(detectCategory('flower garden')).toBe('nature');
    });

    it('detects landscapes', () => {
      expect(detectCategory('mountain scene')).toBe('nature');
      expect(detectCategory('waterfall')).toBe('nature');
    });

    it('detects celestial objects', () => {
      expect(detectCategory('sun')).toBe('nature');
      expect(detectCategory('moon')).toBe('nature');
    });
  });

  describe('food', () => {
    it('detects fruits', () => {
      expect(detectCategory('apple')).toBe('food');
      expect(detectCategory('banana')).toBe('food');
    });

    it('detects prepared food', () => {
      expect(detectCategory('pizza')).toBe('food');
      expect(detectCategory('birthday cake')).toBe('food');
    });

    it('detects vegetables', () => {
      expect(detectCategory('carrot')).toBe('food');
      expect(detectCategory('broccoli')).toBe('food');
    });
  });

  describe('abstract', () => {
    it('detects geometric shapes', () => {
      expect(detectCategory('a cube')).toBe('abstract');
      expect(detectCategory('sphere')).toBe('abstract');
      expect(detectCategory('cylinder shape')).toBe('abstract');
    });

    it('detects abstract concepts', () => {
      expect(detectCategory('abstract sculpture')).toBe('abstract');
      expect(detectCategory('geometric pattern')).toBe('abstract');
    });

    it('detects symbols', () => {
      expect(detectCategory('heart shape')).toBe('abstract');
      expect(detectCategory('logo design')).toBe('abstract');
    });
  });

  describe('fallback to general', () => {
    it('returns general for ambiguous prompts', () => {
      expect(detectCategory('something cool')).toBe('general');
      expect(detectCategory('random object')).toBe('general');
      expect(detectCategory('')).toBe('general');
    });

    it('returns general for nonsense', () => {
      expect(detectCategory('asdfghjkl')).toBe('general');
      expect(detectCategory('xyz123')).toBe('general');
    });
  });

  describe('word boundary matching', () => {
    it('does not match partial words', () => {
      // "cartoon" should not match "car"
      expect(detectCategory('a cartoon character')).toBe('characters');
      // "catalog" should not match "cat"
      expect(detectCategory('product catalog')).toBe('general');
    });

    it('matches whole words correctly', () => {
      expect(detectCategory('I want a car')).toBe('vehicles');
      expect(detectCategory('build cat')).toBe('animals');
    });
  });

  describe('case insensitivity', () => {
    it('handles uppercase', () => {
      expect(detectCategory('CAR')).toBe('vehicles');
      expect(detectCategory('HOUSE')).toBe('buildings');
    });

    it('handles mixed case', () => {
      expect(detectCategory('A Red Car')).toBe('vehicles');
      expect(detectCategory('Big ELEPHANT')).toBe('animals');
    });
  });
});

describe('getCategoryGuidelines', () => {
  it('returns guidelines for each category', () => {
    const categories: LegoCategory[] = [
      'vehicles', 'buildings', 'animals', 'characters',
      'furniture', 'nature', 'food', 'abstract', 'general',
    ];

    for (const category of categories) {
      const guidelines = getCategoryGuidelines(category);
      expect(guidelines).toBeDefined();
      expect(guidelines.length).toBeGreaterThan(100);
      expect(typeof guidelines).toBe('string');
    }
  });

  it('guidelines contain relevant content', () => {
    expect(getCategoryGuidelines('vehicles')).toContain('WHEEL');
    expect(getCategoryGuidelines('buildings')).toContain('FOUNDATION');
    expect(getCategoryGuidelines('animals')).toContain('LEG');
    expect(getCategoryGuidelines('characters')).toContain('MINIFIG');
  });
});

describe('getCategoryBrickCount', () => {
  it('returns brick counts for each category', () => {
    const categories: LegoCategory[] = [
      'vehicles', 'buildings', 'animals', 'characters',
      'furniture', 'nature', 'food', 'abstract', 'general',
    ];

    for (const category of categories) {
      const { min, minRange } = getCategoryBrickCount(category);
      expect(min).toBeGreaterThan(0);
      expect(minRange).toMatch(/^\d+-\d+$/); // Format: "100-150"
    }
  });

  it('complex categories have higher brick counts', () => {
    const vehicleCount = getCategoryBrickCount('vehicles');
    const foodCount = getCategoryBrickCount('food');

    expect(vehicleCount.min).toBeGreaterThan(foodCount.min);
  });

  it('returns expected tier values with minRange', () => {
    // Complex tier (doubled for accuracy)
    expect(getCategoryBrickCount('vehicles')).toEqual({ min: 100, minRange: '100-150' });
    expect(getCategoryBrickCount('buildings')).toEqual({ min: 100, minRange: '100-150' });

    // Medium tier
    expect(getCategoryBrickCount('furniture')).toEqual({ min: 60, minRange: '60-100' });
    expect(getCategoryBrickCount('nature')).toEqual({ min: 60, minRange: '60-100' });

    // Simple tier
    expect(getCategoryBrickCount('food')).toEqual({ min: 40, minRange: '40-60' });
    expect(getCategoryBrickCount('abstract')).toEqual({ min: 40, minRange: '40-60' });
  });
});

describe('getGuidelinesForPrompt', () => {
  it('returns category, guidelines, and brick count', () => {
    const result = getGuidelinesForPrompt('build a car');

    expect(result.category).toBe('vehicles');
    expect(result.guidelines).toContain('WHEEL');
    expect(result.brickCount).toEqual({ min: 100, minRange: '100-150' });
  });

  it('handles unknown prompts with general fallback', () => {
    const result = getGuidelinesForPrompt('something random');

    expect(result.category).toBe('general');
    expect(result.guidelines).toBeDefined();
    expect(result.brickCount).toEqual({ min: 80, minRange: '80-120' });
  });
});

describe('CATEGORY_KEYWORDS', () => {
  it('has keywords for all categories except general', () => {
    const expectedCategories = [
      'vehicles', 'buildings', 'animals', 'characters',
      'furniture', 'nature', 'food', 'abstract',
    ];

    for (const category of expectedCategories) {
      const keywords = CATEGORY_KEYWORDS[category as keyof typeof CATEGORY_KEYWORDS];
      expect(keywords).toBeDefined();
      expect(keywords.length).toBeGreaterThan(5);
    }
  });

  it('keywords are lowercase', () => {
    for (const keywords of Object.values(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        expect(keyword).toBe(keyword.toLowerCase());
      }
    }
  });
});

describe('CATEGORY_GUIDELINES', () => {
  it('has guidelines for all categories including general', () => {
    const categories: LegoCategory[] = [
      'vehicles', 'buildings', 'animals', 'characters',
      'furniture', 'nature', 'food', 'abstract', 'general',
    ];

    for (const category of categories) {
      expect(CATEGORY_GUIDELINES[category]).toBeDefined();
      expect(typeof CATEGORY_GUIDELINES[category]).toBe('string');
    }
  });
});

describe('CATEGORY_BRICK_COUNTS', () => {
  it('has brick counts for all categories', () => {
    const categories: LegoCategory[] = [
      'vehicles', 'buildings', 'animals', 'characters',
      'furniture', 'nature', 'food', 'abstract', 'general',
    ];

    for (const category of categories) {
      const count = CATEGORY_BRICK_COUNTS[category];
      expect(count).toBeDefined();
      expect(count.min).toBeDefined();
      expect(count.minRange).toBeDefined();
    }
  });
});
