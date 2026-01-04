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
// Edge Smoothing Algorithm
// ============================================================================

/**
 * Smooths voxel edges by removing isolated corner voxels to create
 * more organic, rounded shapes.
 * 
 * Algorithm:
 * 1. Build a 3D set of all voxel positions
 * 2. For each voxel, count horizontal neighbors (X-Z plane)
 * 3. Remove voxels that are "corner" voxels (only 2 or fewer XZ neighbors)
 *    that are also on the exterior (missing neighbors in multiple directions)
 * 
 * This rounds off sharp rectangular edges while preserving the core shape.
 */
export function smoothVoxelEdges(voxels: Voxel[]): Voxel[] {
    if (voxels.length < 10) return voxels; // Too few to smooth

    // Build lookup set
    const voxelSet = new Set<string>();
    for (const v of voxels) {
        voxelSet.add(`${v.x},${v.y},${v.z}`);
    }

    // Calculate bounds
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (const v of voxels) {
        minX = Math.min(minX, v.x);
        maxX = Math.max(maxX, v.x);
        minZ = Math.min(minZ, v.z);
        maxZ = Math.max(maxZ, v.z);
    }

    const smoothed: Voxel[] = [];
    let removedCount = 0;

    for (const v of voxels) {
        const { x, y, z } = v;

        // Count neighbors in XZ plane (horizontal)
        const hasXPlus = voxelSet.has(`${x + 1},${y},${z}`);
        const hasXMinus = voxelSet.has(`${x - 1},${y},${z}`);
        const hasZPlus = voxelSet.has(`${x},${y},${z + 1}`);
        const hasZMinus = voxelSet.has(`${x},${y},${z - 1}`);

        const xzNeighbors = [hasXPlus, hasXMinus, hasZPlus, hasZMinus].filter(Boolean).length;

        // Check if this is an exterior corner
        // A corner has exactly 2 adjacent neighbors that are perpendicular
        const isCornerXPlusZPlus = hasXPlus && hasZPlus && !hasXMinus && !hasZMinus;
        const isCornerXPlusZMinus = hasXPlus && hasZMinus && !hasXMinus && !hasZPlus;
        const isCornerXMinusZPlus = hasXMinus && hasZPlus && !hasXPlus && !hasZMinus;
        const isCornerXMinusZMinus = hasXMinus && hasZMinus && !hasXPlus && !hasZPlus;

        const isExteriorCorner = isCornerXPlusZPlus || isCornerXPlusZMinus ||
            isCornerXMinusZPlus || isCornerXMinusZMinus;

        // Also check for edge voxels (on the boundary)
        const isOnXEdge = x === minX || x === maxX;
        const isOnZEdge = z === minZ || z === maxZ;

        // Remove if it's an isolated corner on the exterior
        // But keep if it has vertical support (above/below)
        const hasAbove = voxelSet.has(`${x},${y + 1},${z}`);
        const hasBelow = voxelSet.has(`${x},${y - 1},${z}`);
        const hasVerticalSupport = hasAbove || hasBelow;

        // Remove corners that are truly isolated (on boundary with only 2 XZ neighbors)
        const shouldRemove = isExteriorCorner && isOnXEdge && isOnZEdge && xzNeighbors <= 2;

        if (!shouldRemove) {
            smoothed.push(v);
        } else {
            removedCount++;
        }
    }

    if (removedCount > 0) {
        console.log(`[smoothVoxelEdges] Smoothed ${removedCount} corner voxels`);
    }

    return smoothed;
}

/**
 * More aggressive smoothing for rounder shapes.
 * Removes voxels that protrude from the main mass.
 */
export function smoothVoxelEdgesAggressive(voxels: Voxel[]): Voxel[] {
    if (voxels.length < 20) return voxels;

    // Build lookup set
    const voxelSet = new Set<string>();
    for (const v of voxels) {
        voxelSet.add(`${v.x},${v.y},${v.z}`);
    }

    const smoothed: Voxel[] = [];
    let removedCount = 0;

    for (const v of voxels) {
        const { x, y, z } = v;

        // Count all 6 neighbors (3D)
        const neighbors = [
            voxelSet.has(`${x + 1},${y},${z}`),
            voxelSet.has(`${x - 1},${y},${z}`),
            voxelSet.has(`${x},${y + 1},${z}`),
            voxelSet.has(`${x},${y - 1},${z}`),
            voxelSet.has(`${x},${y},${z + 1}`),
            voxelSet.has(`${x},${y},${z - 1}`),
        ].filter(Boolean).length;

        // Count diagonal neighbors in XZ plane
        const diagonalNeighbors = [
            voxelSet.has(`${x + 1},${y},${z + 1}`),
            voxelSet.has(`${x + 1},${y},${z - 1}`),
            voxelSet.has(`${x - 1},${y},${z + 1}`),
            voxelSet.has(`${x - 1},${y},${z - 1}`),
        ].filter(Boolean).length;

        // Remove voxels that are very isolated (only 1-2 neighbors, no diagonals)
        // But preserve voxels at Y=0 (ground layer)
        const isGroundLayer = y === 0;
        const shouldRemove = !isGroundLayer && neighbors <= 2 && diagonalNeighbors === 0;

        if (!shouldRemove) {
            smoothed.push(v);
        } else {
            removedCount++;
        }
    }

    if (removedCount > 0) {
        console.log(`[smoothVoxelEdges] Aggressive smoothing removed ${removedCount} voxels`);
    }

    return smoothed;
}

// ============================================================================
// Color-Based Feature Preservation
// ============================================================================

/**
 * Analyzes columns to find the dominant (body) color and feature colors.
 * Features are parts with contrasting colors (e.g., orange beak on yellow duck).
 */
function analyzeColors(frontColumns: SilhouetteColumn[], sideColumns: SilhouetteColumn[]): {
    dominantColor: string;
    featureColors: Set<string>;
} {
    // Count color occurrences weighted by column size
    const colorCounts = new Map<string, number>();

    for (const col of [...frontColumns, ...sideColumns]) {
        const height = col.y_max - col.y_min;
        const current = colorCounts.get(col.color) || 0;
        colorCounts.set(col.color, current + height);
    }

    // Find dominant color (most coverage)
    let dominantColor = 'yellow';
    let maxCount = 0;
    for (const [color, count] of colorCounts.entries()) {
        if (count > maxCount) {
            maxCount = count;
            dominantColor = color;
        }
    }

    // Feature colors are any non-dominant colors
    const featureColors = new Set<string>();
    for (const color of colorCounts.keys()) {
        if (color !== dominantColor) {
            featureColors.add(color);
        }
    }

    if (featureColors.size > 0) {
        console.log(`[multi-view-voxel] Detected features: dominant=${dominantColor}, features=[${[...featureColors].join(', ')}]`);
    }

    return { dominantColor, featureColors };
}

/**
 * Extracts "feature voxels" - voxels with contrasting colors that should be preserved.
 * These are added to the final result regardless of intersection.
 * 
 * Strategy: For feature-colored columns in front view, project them along the Z axis
 * using the side view's Z range at that Y level. This ensures features connect to the body.
 */
function extractFeatureVoxels(
    frontColumns: SilhouetteColumn[],
    sideColumns: SilhouetteColumn[],
    featureColors: Set<string>,
    boundingBox: { width: number; depth: number; height_plates: number }
): Voxel[] {
    if (featureColors.size === 0) return [];

    const voxels: Voxel[] = [];
    const added = new Set<string>(); // Prevent duplicates

    // Build a map of Z ranges from side view for each Y level
    const sideRangesMap = new Map<number, { min: number; max: number }>();
    for (const col of sideColumns) {
        for (let y = col.y_min; y < col.y_max; y++) {
            const existing = sideRangesMap.get(y);
            if (existing) {
                existing.min = Math.min(existing.min, col.position);
                existing.max = Math.max(existing.max, col.position);
            } else {
                sideRangesMap.set(y, { min: col.position, max: col.position });
            }
        }
    }

    // Feature columns from front view - project into 3D using side view Z range
    for (const col of frontColumns) {
        if (!featureColors.has(col.color)) continue;

        const x = col.position;

        // For each Y level of this feature column, project across the Z range
        for (let y = col.y_min; y < col.y_max; y++) {
            const zRange = sideRangesMap.get(y);
            if (!zRange) continue;

            // Project feature across the front portion of Z range (first 30%)
            // This ensures it connects to the body but protrudes at the front
            const zStart = 0;
            const zEnd = Math.min(Math.ceil(zRange.max * 0.3), zRange.max);

            for (let z = zStart; z <= zEnd; z++) {
                const key = `${x},${y},${z}`;
                if (!added.has(key)) {
                    voxels.push({ x, y, z, color: col.color });
                    added.add(key);
                }
            }
        }
    }

    // Feature columns from side view - project into 3D using front view X range
    // Build X ranges from front view for each Y level
    const frontRangesMap = new Map<number, { min: number; max: number }>();
    for (const col of frontColumns) {
        for (let y = col.y_min; y < col.y_max; y++) {
            const existing = frontRangesMap.get(y);
            if (existing) {
                existing.min = Math.min(existing.min, col.position);
                existing.max = Math.max(existing.max, col.position);
            } else {
                frontRangesMap.set(y, { min: col.position, max: col.position });
            }
        }
    }

    for (const col of sideColumns) {
        if (!featureColors.has(col.color)) continue;

        const z = col.position;

        for (let y = col.y_min; y < col.y_max; y++) {
            const xRange = frontRangesMap.get(y);
            if (!xRange) continue;

            // Project feature at the center of X range to ensure connectivity
            const xMid = Math.floor((xRange.min + xRange.max) / 2);

            for (let x = xMid - 1; x <= xMid + 1; x++) {
                if (x < 0) continue;
                const key = `${x},${y},${z}`;
                if (!added.has(key)) {
                    voxels.push({ x, y, z, color: col.color });
                    added.add(key);
                }
            }
        }
    }

    if (voxels.length > 0) {
        console.log(`[multi-view-voxel] Extracted ${voxels.length} feature voxels (connected projection)`);
    }

    return voxels;
}

// ============================================================================
// Main Algorithm
// ============================================================================

/**
 * Rasterizes multi-view silhouettes to 3D voxels using visual hull carving.
 *
 * The algorithm creates voxels at the intersection of front and side views:
 * - Front view defines the X range filled at each Y
 * - Side view defines the Z range filled at each Y
 * - A voxel exists at (X, Y, Z) if position is within BOTH ranges
 *
 * Note: We fill the INTERIOR (all positions between min and max) to create
 * solid shapes instead of just using discrete column points.
 *
 * @param model - Multi-view model with front and side silhouettes
 * @returns Array of voxels
 */
export function rasterizeMultiView(model: MultiViewModel): Voxel[] {
    const voxels: Voxel[] = [];
    const { front_view, side_view, bounding_box } = model;

    // Analyze colors to find dominant body color and feature colors (e.g., orange beak)
    const { dominantColor, featureColors } = analyzeColors(front_view.columns, side_view.columns);

    // Determine the maximum height to process
    const maxHeight = Math.min(
        front_view.height_plates,
        side_view.height_plates,
        bounding_box.height_plates
    );

    // Build filled RANGES for each Y level (fill interior, not just discrete points)
    const frontRanges = buildFilledRangesMap(front_view.columns, maxHeight);
    const sideRanges = buildFilledRangesMap(side_view.columns, maxHeight);

    // For each Y level, fill the intersection of X and Z ranges
    for (let y = 0; y < maxHeight; y++) {
        const xRange = frontRanges.get(y);
        const zRange = sideRanges.get(y);

        if (!xRange || !zRange) continue;

        // Fill ALL positions within both ranges (solid interior)
        for (let x = xRange.min; x <= xRange.max; x++) {
            for (let z = zRange.min; z <= zRange.max; z++) {
                voxels.push({
                    x,
                    y,
                    z,
                    color: dominantColor,
                });
            }
        }
    }

    // Extract and add feature voxels (contrasting colors like orange beak)
    // These are added regardless of intersection to preserve important details
    const featureVoxels = extractFeatureVoxels(
        front_view.columns,
        side_view.columns,
        featureColors,
        bounding_box
    );
    voxels.push(...featureVoxels);

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

    // Analyze colors to find dominant body color and feature colors (e.g., orange beak)
    const { dominantColor, featureColors } = analyzeColors(front_view.columns, side_view.columns);

    // Build lookup structures for each view
    const maxHeight = Math.min(
        front_view.height_plates,
        side_view.height_plates,
        bounding_box.height_plates
    );

    // Build filled RANGES for each Y level (fill interior, not just discrete points)
    const frontRanges = buildFilledRangesMap(front_view.columns, maxHeight);
    const sideRanges = buildFilledRangesMap(side_view.columns, maxHeight);

    // Build filled top view set with interior filling
    // The AI gives us outline/sample points, we need to fill the interior
    const topSet = buildFilledTopViewSet(top_view);

    // Check if top view has sufficient coverage
    // If too sparse, fall back to 2-view for better results
    const expectedCoverage = bounding_box.width * bounding_box.depth * 0.3; // Expect at least 30% fill
    const isTopViewSparse = topSet.size < expectedCoverage;

    if (isTopViewSparse) {
        console.log('[rasterizeTriView] Top view too sparse, falling back to 2-view');
        // Fall back to 2-view rasterization (which also handles feature preservation)
        return rasterizeMultiView({
            view_mode: 'multi',
            bounding_box,
            front_view,
            side_view,
            recommended_symmetry: model.recommended_symmetry,
        });
    }

    // For each Y level, fill the intersection of X range, Z range, and top view
    for (let y = 0; y < maxHeight; y++) {
        const xRange = frontRanges.get(y);
        const zRange = sideRanges.get(y);

        if (!xRange || !zRange) continue;

        // Fill ALL positions within both ranges that are also in top view
        for (let x = xRange.min; x <= xRange.max; x++) {
            for (let z = zRange.min; z <= zRange.max; z++) {
                // Check if top view also has this (X, Z) position
                if (topSet.has(`${x},${z}`)) {
                    voxels.push({
                        x,
                        y,
                        z,
                        color: dominantColor,
                    });
                }
            }
        }
    }

    // Extract and add feature voxels (contrasting colors like orange beak)
    // These are added regardless of intersection to preserve important details
    const featureVoxels = extractFeatureVoxels(
        front_view.columns,
        side_view.columns,
        featureColors,
        bounding_box
    );
    voxels.push(...featureVoxels);

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
 * Range of filled positions at a Y level
 */
interface PositionRange {
    min: number;
    max: number;
}

/**
 * Builds a map from Y level to min/max filled position ranges.
 * Used for filling solid interiors instead of sparse discrete points.
 */
function buildFilledRangesMap(
    columns: SilhouetteColumn[],
    maxHeight: number
): Map<number, PositionRange> {
    const map = new Map<number, PositionRange>();

    // For each Y level, find the min and max position
    for (const column of columns) {
        const yMin = Math.max(0, column.y_min);
        const yMax = Math.min(maxHeight, column.y_max);

        for (let y = yMin; y < yMax; y++) {
            const existing = map.get(y);
            if (existing) {
                existing.min = Math.min(existing.min, column.position);
                existing.max = Math.max(existing.max, column.position);
            } else {
                map.set(y, { min: column.position, max: column.position });
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
