/**
 * Multi-View Voxelization
 *
 * Combines front and side view silhouettes using visual hull carving
 * to create accurate 3D voxel reconstructions.
 *
 * Algorithm: For each Y level (height):
 * 1. Get filled X positions from front view at height Y
 * 2. Get filled Z positions from side view at height Y
 * 3. Create voxels at intersection: (X, Y, Z) where both are filled
 */

import type { LegoColor } from '../ai/silhouette-schemas';

// ============================================================================
// Types
// ============================================================================

/**
 * A single column in a silhouette view
 * Represents a vertical span of filled pixels
 */
export interface SilhouetteColumn {
    position: number; // X for front view, Z for side view
    y_min: number;    // Bottom of filled region (plates)
    y_max: number;    // Top of filled region (plates)
    color: LegoColor;
}

/**
 * Front view silhouette (looking at X-Y plane)
 */
export interface FrontView {
    width: number;        // Total width in studs
    height_plates: number; // Total height in plates
    columns: SilhouetteColumn[];
}

/**
 * Side view silhouette (looking at Z-Y plane)
 */
export interface SideView {
    depth: number;        // Total depth in studs
    height_plates: number; // Total height in plates
    columns: SilhouetteColumn[];
}

/**
 * Top view silhouette (looking at X-Z plane from above)
 * Each "row" represents filled Z positions at a given X
 */
export interface TopView {
    width: number;        // Total width in studs (X)
    depth: number;        // Total depth in studs (Z)
    cells: TopViewCell[]; // Filled cells in the X-Z plane
}

/**
 * A single filled cell in the top view
 */
export interface TopViewCell {
    x: number;    // X position (studs)
    z: number;    // Z position (studs)
    color: string;
}

/**
 * Combined multi-view model from AI (2 views: front + side)
 */
export interface MultiViewModel {
    view_mode: 'multi';
    bounding_box: {
        width: number;
        depth: number;
        height_plates: number;
    };
    front_view: FrontView;
    side_view: SideView;
    top_view?: TopView;  // Optional top view for tri-view mode
    recommended_symmetry?: 'x' | 'z' | 'both' | 'none';
}

/**
 * Tri-view model with front, side, AND top views
 */
export interface TriViewModel {
    view_mode: 'tri';
    bounding_box: {
        width: number;
        depth: number;
        height_plates: number;
    };
    front_view: FrontView;
    side_view: SideView;
    top_view: TopView;  // Required for tri-view
    recommended_symmetry?: 'x' | 'z' | 'both' | 'none';
}

/**
 * Voxel output compatible with voxel-to-brick.ts
 */
export interface Voxel {
    x: number;
    y: number;
    z: number;
    color: string;
}

// ============================================================================
// Main Algorithm
// ============================================================================

/**
 * Rasterizes multi-view silhouettes to 3D voxels using visual hull carving.
 *
 * The algorithm creates voxels at the intersection of front and side views:
 * - Front view defines which X positions are filled at each Y
 * - Side view defines which Z positions are filled at each Y
 * - A voxel exists at (X, Y, Z) if BOTH views say that position is filled
 *
 * @param model - Multi-view model with front and side silhouettes
 * @returns Array of voxels
 */
export function rasterizeMultiView(model: MultiViewModel): Voxel[] {
    const voxels: Voxel[] = [];
    const { front_view, side_view, bounding_box } = model;

    // Determine the maximum height to process
    const maxHeight = Math.min(
        front_view.height_plates,
        side_view.height_plates,
        bounding_box.height_plates
    );

    // Build lookup maps for efficient querying
    // frontMap[y] = Set of filled X positions at height Y
    // sideMap[y] = Set of filled Z positions at height Y
    const frontMap = buildFilledPositionsMap(front_view.columns, maxHeight);
    const sideMap = buildFilledPositionsMap(side_view.columns, maxHeight);

    // For each Y level, create voxels at the intersection of filled positions
    for (let y = 0; y < maxHeight; y++) {
        const filledX = frontMap.get(y);
        const filledZ = sideMap.get(y);

        if (!filledX || !filledZ) continue;

        // Create voxels at intersection
        for (const xData of filledX) {
            for (const zData of filledZ) {
                // Blend colors (prefer front view color)
                const color = xData.color;

                voxels.push({
                    x: xData.position,
                    y,
                    z: zData.position,
                    color,
                });
            }
        }
    }

    return voxels;
}

/**
 * Rasterizes tri-view silhouettes (front + side + top) to 3D voxels.
 * 
 * Uses visual hull carving with all three views:
 * - Front view: defines which (X, Y) positions have material
 * - Side view: defines which (Z, Y) positions have material
 * - Top view: defines which (X, Z) positions have material
 *
 * A voxel exists at (X, Y, Z) only if ALL THREE views agree.
 * This eliminates "phantom volumes" from 2-view intersection.
 *
 * Note: If top view is too sparse (< 50% of expected coverage),
 * we fall back to 2-view rasterization for better results.
 *
 * @param model - Tri-view model with front, side, and top silhouettes
 * @returns Array of voxels
 */
export function rasterizeTriView(model: TriViewModel): Voxel[] {
    const voxels: Voxel[] = [];
    const { front_view, side_view, top_view, bounding_box } = model;

    // Build lookup structures for each view
    const maxHeight = Math.min(
        front_view.height_plates,
        side_view.height_plates,
        bounding_box.height_plates
    );

    // frontMap[y] = Set of X positions filled at height Y
    const frontMap = buildFilledPositionsMap(front_view.columns, maxHeight);

    // sideMap[y] = Set of Z positions filled at height Y
    const sideMap = buildFilledPositionsMap(side_view.columns, maxHeight);

    // Build filled top view set with interior filling
    // The AI gives us outline/sample points, we need to fill the interior
    const topSet = buildFilledTopViewSet(top_view);

    // Check if top view has sufficient coverage
    // If too sparse, fall back to 2-view for better results
    const expectedCoverage = bounding_box.width * bounding_box.depth * 0.3; // Expect at least 30% fill
    const isTopViewSparse = topSet.size < expectedCoverage;

    if (isTopViewSparse) {
        console.log('[rasterizeTriView] Top view too sparse, falling back to 2-view');
        // Fall back to 2-view rasterization
        return rasterizeMultiView({
            view_mode: 'multi',
            bounding_box,
            front_view,
            side_view,
            recommended_symmetry: model.recommended_symmetry,
        });
    }

    // For each Y level, create voxels at triple intersection
    for (let y = 0; y < maxHeight; y++) {
        const filledX = frontMap.get(y);
        const filledZ = sideMap.get(y);

        if (!filledX || !filledZ) continue;

        // Create voxels at intersection of all three views
        for (const xData of filledX) {
            for (const zData of filledZ) {
                const x = xData.position;
                const z = zData.position;

                // Check if top view also has this (X, Z) position
                if (topSet.has(`${x},${z}`)) {
                    voxels.push({
                        x,
                        y,
                        z,
                        color: xData.color, // Prefer front view color
                    });
                }
            }
        }
    }

    return voxels;
}

// ============================================================================
// Helper Functions
// ============================================================================

interface PositionData {
    position: number;
    color: string;
}

/**
 * Builds a map from Y level to filled positions at that level.
 */
function buildFilledPositionsMap(
    columns: SilhouetteColumn[],
    maxHeight: number
): Map<number, PositionData[]> {
    const map = new Map<number, PositionData[]>();

    // Initialize empty arrays for each Y level
    for (let y = 0; y < maxHeight; y++) {
        map.set(y, []);
    }

    // Populate from columns
    for (const column of columns) {
        const yMin = Math.max(0, column.y_min);
        const yMax = Math.min(maxHeight, column.y_max);

        for (let y = yMin; y < yMax; y++) {
            const positions = map.get(y);
            if (positions) {
                positions.push({
                    position: column.position,
                    color: column.color,
                });
            }
        }
    }

    return map;
}

/**
 * Builds a filled set of (x,z) positions from top view cells.
 * Uses convex hull filling to interpolate between sparse sample points.
 */
function buildFilledTopViewSet(top_view: TopView): Set<string> {
    const set = new Set<string>();

    // First, add all explicit cells from AI
    for (const cell of top_view.cells) {
        set.add(`${cell.x},${cell.z}`);
    }

    // If we have enough cells, try to fill the interior using scanline fill
    if (top_view.cells.length >= 3) {
        // Find bounding box of cells
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        for (const cell of top_view.cells) {
            minX = Math.min(minX, cell.x);
            maxX = Math.max(maxX, cell.x);
            minZ = Math.min(minZ, cell.z);
            maxZ = Math.max(maxZ, cell.z);
        }

        // For each row (Z), find filled X range and fill between
        for (let z = minZ; z <= maxZ; z++) {
            const cellsAtZ = top_view.cells.filter(c => c.z === z);
            if (cellsAtZ.length >= 2) {
                // Fill between min and max X at this Z
                const xMin = Math.min(...cellsAtZ.map(c => c.x));
                const xMax = Math.max(...cellsAtZ.map(c => c.x));
                for (let x = xMin; x <= xMax; x++) {
                    set.add(`${x},${z}`);
                }
            } else if (cellsAtZ.length === 1) {
                // Single cell, fill a small region around it
                const x = cellsAtZ[0].x;
                set.add(`${x},${z}`);
                set.add(`${x - 1},${z}`);
                set.add(`${x + 1},${z}`);
            }
        }

        // Also fill vertically for each column (X)
        for (let x = minX; x <= maxX; x++) {
            const cellsAtX = top_view.cells.filter(c => c.x === x);
            if (cellsAtX.length >= 2) {
                const zMin = Math.min(...cellsAtX.map(c => c.z));
                const zMax = Math.max(...cellsAtX.map(c => c.z));
                for (let z = zMin; z <= zMax; z++) {
                    set.add(`${x},${z}`);
                }
            }
        }
    }

    return set;
}

/**
 * Validates that a multi-view model has compatible dimensions.
 */
export function validateMultiViewModel(model: MultiViewModel): {
    valid: boolean;
    error?: string;
} {
    const { front_view, side_view, bounding_box } = model;

    // Check height compatibility
    if (front_view.height_plates !== side_view.height_plates) {
        // Allow some tolerance (within 20%)
        const diff = Math.abs(front_view.height_plates - side_view.height_plates);
        const avg = (front_view.height_plates + side_view.height_plates) / 2;
        if (diff / avg > 0.2) {
            return {
                valid: false,
                error: `Height mismatch: front=${front_view.height_plates}, side=${side_view.height_plates}`,
            };
        }
    }

    // Check for empty views
    if (front_view.columns.length === 0) {
        return { valid: false, error: 'Front view has no filled columns' };
    }
    if (side_view.columns.length === 0) {
        return { valid: false, error: 'Side view has no filled columns' };
    }

    // Check bounding box consistency
    if (bounding_box.width < front_view.width) {
        return { valid: false, error: 'Bounding box width smaller than front view' };
    }
    if (bounding_box.depth < side_view.depth) {
        return { valid: false, error: 'Bounding box depth smaller than side view' };
    }

    return { valid: true };
}

/**
 * Estimates voxel count for a multi-view model without full rasterization.
 */
export function estimateMultiViewVoxelCount(model: MultiViewModel): number {
    const { front_view, side_view } = model;
    const maxHeight = Math.min(front_view.height_plates, side_view.height_plates);

    let estimate = 0;

    // For each height level, estimate intersection count
    for (let y = 0; y < maxHeight; y++) {
        // Count columns that span this Y level
        const frontCount = front_view.columns.filter(
            c => c.y_min <= y && c.y_max > y
        ).length;
        const sideCount = side_view.columns.filter(
            c => c.y_min <= y && c.y_max > y
        ).length;

        // Intersection is at most min of both counts
        estimate += frontCount * sideCount;
    }

    return estimate;
}

// ============================================================================
// Aspect Ratio Correction
// ============================================================================

/**
 * The stud-to-plate ratio for LEGO units.
 * 1 stud = 8mm, 1 plate = 3.2mm, so ratio = 2.5
 */
const STUD_TO_PLATE_RATIO = 2.5;

/**
 * Scales multi-view model heights to correct for LEGO physical unit differences.
 * 
 * Problem: AI outputs Y values as if plates and studs are equal, but:
 * - 1 stud = 8mm horizontal
 * - 1 plate = 3.2mm vertical
 * - To look visually correct, height_plates should be height_visual * 2.5
 * 
 * But AI often outputs raw pixel-based heights, making models too tall.
 * This function divides all Y values by the stud-to-plate ratio.
 * 
 * @param model - Multi-view model with possibly incorrect heights
 * @returns Corrected model with scaled heights
 */
export function scaleMultiViewHeights(model: MultiViewModel): MultiViewModel {
    const scale = (y: number) => Math.round(y / STUD_TO_PLATE_RATIO);

    return {
        ...model,
        bounding_box: {
            ...model.bounding_box,
            height_plates: scale(model.bounding_box.height_plates),
        },
        front_view: {
            ...model.front_view,
            height_plates: scale(model.front_view.height_plates),
            columns: model.front_view.columns.map(col => ({
                ...col,
                y_min: scale(col.y_min),
                y_max: scale(col.y_max),
            })),
        },
        side_view: {
            ...model.side_view,
            height_plates: scale(model.side_view.height_plates),
            columns: model.side_view.columns.map(col => ({
                ...col,
                y_min: scale(col.y_min),
                y_max: scale(col.y_max),
            })),
        },
    };
}
