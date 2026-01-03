/**
 * Silhouette Schemas Tests
 */

import { describe, it, expect } from 'vitest';
import {
    SilhouetteModelSchema,
    validateSilhouetteModel,
    hasValidBaseLayer,
    estimateVoxelCount,
    MAX_LAYERS,
    MAX_POLYGON_POINTS,
    MAX_BBOX_STUDS,
    type SilhouetteModel,
} from './silhouette-schemas';

describe('SilhouetteModelSchema', () => {
    const validModel: SilhouetteModel = {
        units: 'studs',
        bounding_box: { width: 32, depth: 24, height_plates: 48 },
        layers: [
            {
                y_min_plates: 0,
                y_max_plates: 3,
                shapes: [
                    { type: 'rect', x: 0, z: 0, width: 32, depth: 24, color: 'gray' },
                ],
                confidence: 0.95,
            },
            {
                y_min_plates: 3,
                y_max_plates: 12,
                shapes: [
                    { type: 'rect', x: 4, z: 4, width: 24, depth: 16, color: 'red' },
                ],
            },
        ],
    };

    it('validates a correct model', () => {
        const result = SilhouetteModelSchema.safeParse(validModel);
        expect(result.success).toBe(true);
    });

    it('rejects model with wrong units', () => {
        const invalid = { ...validModel, units: 'meters' };
        const result = SilhouetteModelSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('rejects model with no layers', () => {
        const invalid = { ...validModel, layers: [] };
        const result = SilhouetteModelSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('rejects model with too many layers', () => {
        const tooManyLayers = Array.from({ length: MAX_LAYERS + 1 }, (_, i) => ({
            y_min_plates: i,
            y_max_plates: i + 1,
            shapes: [{ type: 'rect' as const, x: 0, z: 0, width: 10, depth: 10, color: 'gray' as const }],
        }));
        const invalid = { ...validModel, layers: tooManyLayers };
        const result = SilhouetteModelSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('rejects layer where y_max <= y_min', () => {
        const invalid = {
            ...validModel,
            layers: [
                {
                    y_min_plates: 5,
                    y_max_plates: 3,
                    shapes: [{ type: 'rect', x: 0, z: 0, width: 10, depth: 10, color: 'gray' }],
                },
            ],
        };
        const result = SilhouetteModelSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('rejects bbox exceeding maximum studs', () => {
        const invalid = {
            ...validModel,
            bounding_box: { width: MAX_BBOX_STUDS + 1, depth: 24, height_plates: 48 },
        };
        const result = SilhouetteModelSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('rejects layers exceeding bounding box height', () => {
        const invalid = {
            ...validModel,
            bounding_box: { width: 32, depth: 24, height_plates: 10 },
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 20, // exceeds height_plates
                    shapes: [{ type: 'rect', x: 0, z: 0, width: 32, depth: 24, color: 'gray' }],
                },
            ],
        };
        const result = SilhouetteModelSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });
});

describe('Shape validation', () => {
    const baseModel = {
        units: 'studs' as const,
        bounding_box: { width: 32, depth: 32, height_plates: 48 },
    };

    it('validates circle shape', () => {
        const model = {
            ...baseModel,
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 3,
                    shapes: [{ type: 'circle', center_x: 16, center_z: 16, radius: 10, color: 'blue' }],
                },
            ],
        };
        const result = SilhouetteModelSchema.safeParse(model);
        expect(result.success).toBe(true);
    });

    it('validates oval shape', () => {
        const model = {
            ...baseModel,
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 3,
                    shapes: [{ type: 'oval', center_x: 16, center_z: 16, radius_x: 12, radius_z: 8, color: 'green' }],
                },
            ],
        };
        const result = SilhouetteModelSchema.safeParse(model);
        expect(result.success).toBe(true);
    });

    it('validates polygon shape', () => {
        const model = {
            ...baseModel,
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 3,
                    shapes: [
                        {
                            type: 'polygon',
                            points: [
                                { x: 0, z: 0 },
                                { x: 10, z: 0 },
                                { x: 5, z: 10 },
                            ],
                            color: 'yellow',
                        },
                    ],
                },
            ],
        };
        const result = SilhouetteModelSchema.safeParse(model);
        expect(result.success).toBe(true);
    });

    it('rejects polygon with too few points', () => {
        const model = {
            ...baseModel,
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 3,
                    shapes: [
                        {
                            type: 'polygon',
                            points: [{ x: 0, z: 0 }, { x: 10, z: 0 }], // only 2 points
                            color: 'yellow',
                        },
                    ],
                },
            ],
        };
        const result = SilhouetteModelSchema.safeParse(model);
        expect(result.success).toBe(false);
    });

    it('rejects polygon with too many points', () => {
        const points = Array.from({ length: MAX_POLYGON_POINTS + 1 }, (_, i) => ({
            x: Math.cos((i * 2 * Math.PI) / (MAX_POLYGON_POINTS + 1)) * 10,
            z: Math.sin((i * 2 * Math.PI) / (MAX_POLYGON_POINTS + 1)) * 10,
        }));
        const model = {
            ...baseModel,
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 3,
                    shapes: [{ type: 'polygon', points, color: 'yellow' }],
                },
            ],
        };
        const result = SilhouetteModelSchema.safeParse(model);
        expect(result.success).toBe(false);
    });

    it('rejects invalid color', () => {
        const model = {
            ...baseModel,
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 3,
                    shapes: [{ type: 'rect', x: 0, z: 0, width: 10, depth: 10, color: 'magenta' }],
                },
            ],
        };
        const result = SilhouetteModelSchema.safeParse(model);
        expect(result.success).toBe(false);
    });
});

describe('validateSilhouetteModel', () => {
    it('returns success with valid data', () => {
        const result = validateSilhouetteModel({
            units: 'studs',
            bounding_box: { width: 16, depth: 16, height_plates: 24 },
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 6,
                    shapes: [{ type: 'rect', x: 0, z: 0, width: 16, depth: 16, color: 'gray' }],
                },
            ],
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.layers).toHaveLength(1);
        }
    });

    it('returns error with invalid data', () => {
        const result = validateSilhouetteModel({ invalid: 'data' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeDefined();
        }
    });
});

describe('hasValidBaseLayer', () => {
    it('returns true for model with good base coverage', () => {
        const model: SilhouetteModel = {
            units: 'studs',
            bounding_box: { width: 20, depth: 20, height_plates: 30 },
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 3,
                    shapes: [{ type: 'rect', x: 0, z: 0, width: 20, depth: 20, color: 'gray' }],
                },
            ],
        };
        expect(hasValidBaseLayer(model, 0.5)).toBe(true);
    });

    it('returns false for model with no base layer', () => {
        const model: SilhouetteModel = {
            units: 'studs',
            bounding_box: { width: 20, depth: 20, height_plates: 30 },
            layers: [
                {
                    y_min_plates: 10, // doesn't start at 0
                    y_max_plates: 20,
                    shapes: [{ type: 'rect', x: 0, z: 0, width: 20, depth: 20, color: 'gray' }],
                },
            ],
        };
        expect(hasValidBaseLayer(model, 0.5)).toBe(false);
    });

    it('returns false for model with insufficient base coverage', () => {
        const model: SilhouetteModel = {
            units: 'studs',
            bounding_box: { width: 20, depth: 20, height_plates: 30 },
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 3,
                    shapes: [{ type: 'rect', x: 0, z: 0, width: 5, depth: 5, color: 'gray' }], // only 25/400 = 6.25%
                },
            ],
        };
        expect(hasValidBaseLayer(model, 0.5)).toBe(false);
    });
});

describe('estimateVoxelCount', () => {
    it('calculates correct count for rectangular model', () => {
        const model: SilhouetteModel = {
            units: 'studs',
            bounding_box: { width: 10, depth: 10, height_plates: 6 },
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 6,
                    shapes: [{ type: 'rect', x: 0, z: 0, width: 10, depth: 10, color: 'gray' }],
                },
            ],
        };
        // 10 * 10 * 6 = 600 voxels
        expect(estimateVoxelCount(model)).toBe(600);
    });

    it('calculates correct count for multi-layer model', () => {
        const model: SilhouetteModel = {
            units: 'studs',
            bounding_box: { width: 10, depth: 10, height_plates: 12 },
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 6,
                    shapes: [{ type: 'rect', x: 0, z: 0, width: 10, depth: 10, color: 'gray' }],
                },
                {
                    y_min_plates: 6,
                    y_max_plates: 12,
                    shapes: [{ type: 'rect', x: 2, z: 2, width: 6, depth: 6, color: 'red' }],
                },
            ],
        };
        // Layer 1: 10*10*6 = 600, Layer 2: 6*6*6 = 216
        expect(estimateVoxelCount(model)).toBe(816);
    });
});
