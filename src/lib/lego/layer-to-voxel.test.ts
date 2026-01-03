/**
 * Layer to Voxel Rasterization Tests
 */

import { describe, it, expect } from 'vitest';
import { rasterizeLayers } from './layer-to-voxel';
import type { SilhouetteModel } from '@/lib/ai/silhouette-schemas';

describe('rasterizeLayers', () => {
    it('rasterizes a simple rectangle layer', () => {
        const model: SilhouetteModel = {
            units: 'studs',
            bounding_box: { width: 10, depth: 10, height_plates: 6 },
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 3,
                    shapes: [{ type: 'rect', x: 0, z: 0, width: 4, depth: 4, color: 'red' }],
                },
            ],
        };

        const voxels = rasterizeLayers(model, false);

        // 4x4 rect * 3 plates high = 48 voxels
        expect(voxels).toHaveLength(48);
        expect(voxels[0].color).toBe('red');
        expect(voxels.every((v) => v.y >= 0 && v.y < 3)).toBe(true);
    });

    it('rasterizes multiple layers', () => {
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
                    shapes: [{ type: 'rect', x: 2, z: 2, width: 6, depth: 6, color: 'blue' }],
                },
            ],
        };

        const voxels = rasterizeLayers(model, false);

        // Layer 1: 10*10*6 = 600, Layer 2: 6*6*6 = 216
        expect(voxels).toHaveLength(816);

        const grayVoxels = voxels.filter((v) => v.color === 'gray');
        const blueVoxels = voxels.filter((v) => v.color === 'blue');
        expect(grayVoxels).toHaveLength(600);
        expect(blueVoxels).toHaveLength(216);
    });

    it('rasterizes a circle', () => {
        const model: SilhouetteModel = {
            units: 'studs',
            bounding_box: { width: 20, depth: 20, height_plates: 3 },
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 1,
                    shapes: [{ type: 'circle', center_x: 10, center_z: 10, radius: 5, color: 'green' }],
                },
            ],
        };

        const voxels = rasterizeLayers(model, false);

        // Circle with radius 5 has approximately π*5² ≈ 78 voxels per plate
        // Allow some tolerance due to rasterization
        expect(voxels.length).toBeGreaterThan(70);
        expect(voxels.length).toBeLessThan(90);
        expect(voxels.every((v) => v.color === 'green')).toBe(true);
    });

    it('rasterizes an oval', () => {
        const model: SilhouetteModel = {
            units: 'studs',
            bounding_box: { width: 20, depth: 10, height_plates: 2 },
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 1,
                    shapes: [{ type: 'oval', center_x: 10, center_z: 5, radius_x: 8, radius_z: 4, color: 'yellow' }],
                },
            ],
        };

        const voxels = rasterizeLayers(model, false);

        // Oval area ≈ π * 8 * 4 ≈ 100 voxels
        expect(voxels.length).toBeGreaterThan(90);
        expect(voxels.length).toBeLessThan(110);
    });

    it('rasterizes a triangle polygon', () => {
        const model: SilhouetteModel = {
            units: 'studs',
            bounding_box: { width: 10, depth: 10, height_plates: 3 },
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 1,
                    shapes: [
                        {
                            type: 'polygon',
                            points: [
                                { x: 0, z: 0 },
                                { x: 10, z: 0 },
                                { x: 5, z: 10 },
                            ],
                            color: 'orange',
                        },
                    ],
                },
            ],
        };

        const voxels = rasterizeLayers(model, false);

        // Triangle area = 0.5 * 10 * 10 = 50, but rasterization varies
        expect(voxels.length).toBeGreaterThan(40);
        expect(voxels.length).toBeLessThan(60);
        expect(voxels.every((v) => v.color === 'orange')).toBe(true);
    });

    it('subtracts rectangular holes', () => {
        const model: SilhouetteModel = {
            units: 'studs',
            bounding_box: { width: 10, depth: 10, height_plates: 3 },
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 1,
                    shapes: [{ type: 'rect', x: 0, z: 0, width: 10, depth: 10, color: 'gray' }],
                    holes: [{ type: 'rect', x: 3, z: 3, width: 4, depth: 4 }],
                },
            ],
        };

        const voxels = rasterizeLayers(model, false);

        // 10*10 - 4*4 = 84 voxels * 1 plate
        expect(voxels).toHaveLength(84);
    });

    it('subtracts circular holes', () => {
        const model: SilhouetteModel = {
            units: 'studs',
            bounding_box: { width: 20, depth: 20, height_plates: 3 },
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 1,
                    shapes: [{ type: 'rect', x: 0, z: 0, width: 20, depth: 20, color: 'gray' }],
                    holes: [{ type: 'circle', center_x: 10, center_z: 10, radius: 5 }],
                },
            ],
        };

        const voxels = rasterizeLayers(model, false);

        // 20*20 = 400, minus circle π*5² ≈ 78 = ~322
        expect(voxels.length).toBeGreaterThan(310);
        expect(voxels.length).toBeLessThan(330);
    });

    it('handles empty model gracefully', () => {
        const model: SilhouetteModel = {
            units: 'studs',
            bounding_box: { width: 10, depth: 10, height_plates: 10 },
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 1,
                    shapes: [{ type: 'rect', x: 100, z: 100, width: 5, depth: 5, color: 'gray' }], // outside bbox
                },
            ],
        };

        const voxels = rasterizeLayers(model, false);
        expect(voxels).toHaveLength(0);
    });

    it('clips shapes at bounding box edges', () => {
        const model: SilhouetteModel = {
            units: 'studs',
            bounding_box: { width: 10, depth: 10, height_plates: 3 },
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 1,
                    shapes: [{ type: 'rect', x: -2, z: -2, width: 8, depth: 8, color: 'red' }], // extends beyond 0,0
                },
            ],
        };

        const voxels = rasterizeLayers(model, false);

        // Only the part inside the grid (6x6 = 36) should be rasterized
        expect(voxels).toHaveLength(36);
    });

    it('preserves Y coordinate correctly', () => {
        const model: SilhouetteModel = {
            units: 'studs',
            bounding_box: { width: 5, depth: 5, height_plates: 20 },
            layers: [
                {
                    y_min_plates: 10,
                    y_max_plates: 15,
                    shapes: [{ type: 'rect', x: 0, z: 0, width: 2, depth: 2, color: 'blue' }],
                },
            ],
        };

        const voxels = rasterizeLayers(model, false);

        // 2*2*5 = 20 voxels
        expect(voxels).toHaveLength(20);
        expect(voxels.every((v) => v.y >= 10 && v.y < 15)).toBe(true);
    });

    it('enforces X-axis symmetry when enabled (centers and mirrors left-right)', () => {
        // Asymmetric shape on left side
        const model: SilhouetteModel = {
            units: 'studs',
            bounding_box: { width: 10, depth: 10, height_plates: 3 },
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 1,
                    shapes: [{ type: 'rect', x: 0, z: 4, width: 2, depth: 2, color: 'red' }],
                },
            ],
        };

        // Without symmetry: only 2x2 = 4 voxels
        const voxelsNoSymmetry = rasterizeLayers(model, false);
        expect(voxelsNoSymmetry).toHaveLength(4);

        // With symmetry: shape is centered on X, then mirrored left-right
        // Original 2x2 at x=0 -> centered -> mirrored on X = 4x2 = 8 voxels
        const voxelsWithSymmetry = rasterizeLayers(model, true);

        // X positions should be symmetric around center (5)
        const xPositions = new Set(voxelsWithSymmetry.map(v => v.x));
        for (const x of xPositions) {
            const mirrorX = 9 - x;
            expect(xPositions.has(mirrorX)).toBe(true);
        }

        // Z positions should NOT be changed (we preserve front-back for likeness)
        const zPositions = new Set(voxelsWithSymmetry.map(v => v.z));
        expect(zPositions.has(4)).toBe(true);
        expect(zPositions.has(5)).toBe(true);
    });

    it('symmetry enforces X-axis only by default (preserves Z for likeness)', () => {
        // Single 1x1 shape in corner - will be centered and X-mirrored only
        const model: SilhouetteModel = {
            units: 'studs',
            bounding_box: { width: 10, depth: 10, height_plates: 3 },
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 1,
                    shapes: [{ type: 'rect', x: 0, z: 0, width: 1, depth: 1, color: 'red' }],
                },
            ],
        };

        // Without symmetry: only 1 voxel
        const voxelsNoSymmetry = rasterizeLayers(model, false);
        expect(voxelsNoSymmetry).toHaveLength(1);

        // With symmetry (X-axis only by default): 1x1 centered then X-mirrored = 2 voxels
        const voxelsWithSymmetry = rasterizeLayers(model, true);
        expect(voxelsWithSymmetry).toHaveLength(2);

        // X positions should be symmetric
        const xValues = voxelsWithSymmetry.map(v => v.x).sort((a, b) => a - b);
        expect(xValues[0] + xValues[1]).toBe(9); // symmetric around center

        // Z positions should remain at 0 (not mirrored)
        expect(voxelsWithSymmetry.every(v => v.z === 0)).toBe(true);
    });

    it('symmetry can enforce both X and Z when explicitly specified', () => {
        // Single 1x1 shape in corner - will be centered and mirrored on both axes
        const model: SilhouetteModel = {
            units: 'studs',
            bounding_box: { width: 10, depth: 10, height_plates: 3 },
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 1,
                    shapes: [{ type: 'rect', x: 0, z: 0, width: 1, depth: 1, color: 'red' }],
                },
            ],
        };

        // With both axes: 1x1 centered then mirrored on X and Z = 4 voxels
        const voxelsBothAxes = rasterizeLayers(model, { x: true, z: true });
        expect(voxelsBothAxes).toHaveLength(4);

        // X positions should be symmetric
        const xValues = [...new Set(voxelsBothAxes.map(v => v.x))].sort((a, b) => a - b);
        expect(xValues[0] + xValues[1]).toBe(9);

        // Z positions should also be symmetric
        const zValues = [...new Set(voxelsBothAxes.map(v => v.z))].sort((a, b) => a - b);
        expect(zValues[0] + zValues[1]).toBe(9);
    });

    it('symmetry can enforce X-axis only when specified', () => {
        // Single 1x1 shape in corner - will be centered and X-mirrored only
        const model: SilhouetteModel = {
            units: 'studs',
            bounding_box: { width: 10, depth: 10, height_plates: 3 },
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 1,
                    shapes: [{ type: 'rect', x: 0, z: 0, width: 1, depth: 1, color: 'red' }],
                },
            ],
        };

        // With X-only symmetry: 1x1 centered on X then mirrored = 2 voxels
        const voxelsXOnly = rasterizeLayers(model, { x: true, z: false });
        expect(voxelsXOnly).toHaveLength(2);

        // Both voxels should be at same Z (0) but mirrored X positions
        expect(voxelsXOnly.every(v => v.z === 0)).toBe(true);

        // X positions should be symmetric
        const xValues = voxelsXOnly.map(v => v.x).sort((a, b) => a - b);
        expect(xValues[0] + xValues[1]).toBe(9);
    });

    it('symmetry can enforce Z-axis only when specified', () => {
        // Single 1x1 shape in corner - will be centered and Z-mirrored only
        const model: SilhouetteModel = {
            units: 'studs',
            bounding_box: { width: 10, depth: 10, height_plates: 3 },
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 1,
                    shapes: [{ type: 'rect', x: 0, z: 0, width: 1, depth: 1, color: 'red' }],
                },
            ],
        };

        // With Z-only symmetry: 1x1 centered on Z then mirrored = 2 voxels
        const voxelsZOnly = rasterizeLayers(model, { x: false, z: true });
        expect(voxelsZOnly).toHaveLength(2);

        // Both voxels should be at same X (0) but mirrored Z positions
        expect(voxelsZOnly.every(v => v.x === 0)).toBe(true);

        // Z positions should be symmetric
        const zValues = voxelsZOnly.map(v => v.z).sort((a, b) => a - b);
        expect(zValues[0] + zValues[1]).toBe(9);
    });

    it('symmetry preserves centered symmetric shapes', () => {
        // Already-centered symmetric shape should remain the same
        const model: SilhouetteModel = {
            units: 'studs',
            bounding_box: { width: 10, depth: 10, height_plates: 3 },
            layers: [
                {
                    y_min_plates: 0,
                    y_max_plates: 1,
                    shapes: [{ type: 'rect', x: 3, z: 3, width: 4, depth: 4, color: 'blue' }],
                },
            ],
        };

        // Without symmetry: 4x4 = 16 voxels
        const voxelsNoSymmetry = rasterizeLayers(model, false);
        expect(voxelsNoSymmetry).toHaveLength(16);

        // With symmetry: still 16 voxels (shape was already symmetric on X-axis)
        const voxelsWithSymmetry = rasterizeLayers(model, true);
        expect(voxelsWithSymmetry).toHaveLength(16);
    });
});
