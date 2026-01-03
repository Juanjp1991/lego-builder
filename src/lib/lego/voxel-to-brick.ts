/**
 * Voxel to Brick Conversion Algorithm v2
 * 
 * Enhanced with:
 * - 2-layer solid base for buildability
 * - Seam-aware interlocking
 * - Voxel-boundary constraints for accuracy
 */

/**
 * Represents a single voxel in 3D space
 */
export interface Voxel {
    x: number;
    y: number;
    z: number;
    color: string;
}

/**
 * Represents a placed LEGO brick
 */
export interface LegoBrick {
    width: number;
    depth: number;
    x: number;
    y: number;
    z: number;
    color: string;
}

interface GridDimensions {
    x: number;
    y: number;
    z: number;
}

type OccupancyGrid = Map<string, string>;

interface BrickSeam {
    x: number;
    z: number;
    orientation: 'horizontal' | 'vertical';
}

/**
 * Main conversion function with enhanced buildability
 */
export function convertVoxelsToBricks(voxels: Voxel[]): LegoBrick[] {
    if (!voxels || voxels.length === 0) {
        return [];
    }

    const dims = calculateDimensions(voxels);
    const layers = organizeByLayers(voxels, dims);
    const voxelSet = createVoxelSet(voxels);

    const bricks: LegoBrick[] = [];

    // Build solid 2-layer foundation
    if (layers.has(0) || layers.has(1)) {
        const baseBricks = buildSolidBase(
            layers.get(0) || new Map(),
            layers.get(1) || new Map(),
            voxelSet
        );
        bricks.push(...baseBricks);
    }

    // Build upper layers with interlocking
    // Track bricks from the previous layer for seam detection
    let previousLayerBricks: LegoBrick[] = bricks.filter(b => b.y === 1);
    if (previousLayerBricks.length === 0) {
        previousLayerBricks = bricks.filter(b => b.y === 0);
    }

    for (let y = 2; y <= dims.y; y++) {
        if (!layers.has(y)) continue;

        // Use interlocking algorithm to cross seams from previous layer
        const layerBricks = fillLayerWithInterlocking(
            layers.get(y)!,
            y,
            previousLayerBricks,
            voxelSet
        );
        bricks.push(...layerBricks);

        // Update previous layer for next iteration
        previousLayerBricks = layerBricks;
    }

    return bricks;
}

/**
 * Build solid 2-layer base with interlocking
 */
function buildSolidBase(
    layer0: OccupancyGrid,
    layer1: OccupancyGrid,
    voxelSet: Set<string>
): LegoBrick[] {
    const bricks: LegoBrick[] = [];

    // Process Y=0 - simple placement for ground layer
    let base0Bricks: LegoBrick[] = [];
    if (layer0.size > 0) {
        base0Bricks = fillLayerSimple(layer0, 0);
        bricks.push(...base0Bricks);
    }

    // Process Y=1 - use interlocking to cross Y=0 seams
    if (layer1.size > 0) {
        if (base0Bricks.length > 0) {
            // Use interlocking with Y=0 bricks
            const base1 = fillLayerWithInterlocking(layer1, 1, base0Bricks, voxelSet);
            bricks.push(...base1);
        } else {
            // No Y=0 layer, use simple placement
            const base1 = fillLayerSimple(layer1, 1);
            bricks.push(...base1);
        }
    }

    return bricks;
}

/**
 * Fill layer with simple brick placement (no interlocking or voxel alignment)
 */
function fillLayerSimple(grid: OccupancyGrid, y: number): LegoBrick[] {
    const bricks: LegoBrick[] = [];
    const used = new Set<string>();

    const positions = getSortedPositions(grid);

    for (const pos of positions) {
        if (used.has(pos.key)) continue;

        const color = grid.get(pos.key)!;
        let placed = false;

        // Try 2x4 horizontal
        if (canPlaceBrick(grid, used, pos.x, pos.z, 2, 4, color)) {
            bricks.push({ width: 2, depth: 4, x: pos.x, y, z: pos.z, color });
            markUsed(used, pos.x, pos.z, 2, 4);
            placed = true;
        }
        // Try 2x4 vertical
        else if (canPlaceBrick(grid, used, pos.x, pos.z, 4, 2, color)) {
            bricks.push({ width: 4, depth: 2, x: pos.x, y, z: pos.z, color });
            markUsed(used, pos.x, pos.z, 4, 2);
            placed = true;
        }
        // Try 2x2
        else if (canPlaceBrick(grid, used, pos.x, pos.z, 2, 2, color)) {
            bricks.push({ width: 2, depth: 2, x: pos.x, y, z: pos.z, color });
            markUsed(used, pos.x, pos.z, 2, 2);
            placed = true;
        }
    }

    return bricks;
}

/**
 * Fill layer with seam-aware interlocking
 */
function fillLayerWithInterlocking(
    grid: OccupancyGrid,
    y: number,
    previousBricks: LegoBrick[],
    voxelSet: Set<string>
): LegoBrick[] {
    const bricks: LegoBrick[] = [];
    const used = new Set<string>();

    // Extract seams from previous layer
    const seams = extractSeams(previousBricks);

    const positions = getSortedPositions(grid);

    // First pass: Place bricks that cross seams
    for (const pos of positions) {
        if (used.has(pos.key)) continue;

        const color = grid.get(pos.key)!;

        // Prioritize placements that cross seams
        const candidates = [
            { w: 2, d: 4, score: 0 },
            { w: 4, d: 2, score: 0 },
            { w: 2, d: 2, score: 0 }
        ];

        // Score each candidate by how many seams it crosses
        for (const cand of candidates) {
            if (canPlaceBrickVoxelAligned(grid, used, pos.x, pos.z, cand.w, cand.d, color, y, voxelSet)) {
                cand.score = countSeamsCrossed(pos.x, pos.z, cand.w, cand.d, seams);
            } else {
                cand.score = -1;
            }
        }

        // Pick best candidate (highest seam crossing score)
        candidates.sort((a, b) => b.score - a.score);
        const best = candidates[0];

        if (best.score >= 0) {
            bricks.push({ width: best.w, depth: best.d, x: pos.x, y, z: pos.z, color });
            markUsed(used, pos.x, pos.z, best.w, best.d);
        }
    }

    return bricks;
}

/**
 * Extract seam positions from brick array
 */
function extractSeams(bricks: LegoBrick[]): BrickSeam[] {
    const seams: BrickSeam[] = [];

    for (const brick of bricks) {
        // Horizontal seams (width edges)
        for (let dz = 0; dz < brick.depth; dz++) {
            seams.push({
                x: brick.x + brick.width,
                z: brick.z + dz,
                orientation: 'vertical'
            });
        }

        // Vertical seams (depth edges)
        for (let dx = 0; dx < brick.width; dx++) {
            seams.push({
                x: brick.x + dx,
                z: brick.z + brick.depth,
                orientation: 'horizontal'
            });
        }
    }

    return seams;
}

/**
 * Count how many seams this brick placement would cross
 */
function countSeamsCrossed(
    x: number,
    z: number,
    width: number,
    depth: number,
    seams: BrickSeam[]
): number {
    let count = 0;

    for (const seam of seams) {
        // Check if brick spans this seam
        if (seam.x >= x && seam.x < x + width &&
            seam.z >= z && seam.z < z + depth) {
            count++;
        }
    }

    return count;
}

/**
 * Check if brick can be placed (without voxel constraint) - fallback
 */
function canPlaceBrick(
    grid: OccupancyGrid,
    used: Set<string>,
    x: number,
    z: number,
    width: number,
    depth: number,
    color: string
): boolean {
    for (let dx = 0; dx < width; dx++) {
        for (let dz = 0; dz < depth; dz++) {
            const key = `${x + dx},${z + dz}`;
            if (used.has(key)) return false;
            if (grid.get(key) !== color) return false;
        }
    }
    return true;
}

/**
 * Check if brick can be placed with voxel-boundary constraints
 */
function canPlaceBrickVoxelAligned(
    grid: OccupancyGrid,
    used: Set<string>,
    x: number,
    z: number,
    width: number,
    depth: number,
    color: string,
    y: number,
    voxelSet: Set<string>
): boolean {
    // Check all positions the brick would occupy
    for (let dx = 0; dx < width; dx++) {
        for (let dz = 0; dz < depth; dz++) {
            const key = `${x + dx},${z + dz}`;
            const voxelKey = `${x + dx},${y},${z + dz}`;

            // Must not be used
            if (used.has(key)) return false;

            // Must exist in grid with same color
            if (grid.get(key) !== color) return false;

            // Must have corresponding voxel (voxel-boundary constraint)
            if (!voxelSet.has(voxelKey)) return false;
        }
    }

    return true;
}

/**
 * Create set of voxel positions for fast lookup
 */
function createVoxelSet(voxels: Voxel[]): Set<string> {
    const set = new Set<string>();
    for (const v of voxels) {
        set.add(`${v.x},${v.y},${v.z}`);
    }
    return set;
}

function getSortedPositions(grid: OccupancyGrid) {
    const positions = Array.from(grid.keys()).map(key => {
        const [x, z] = key.split(',').map(Number);
        return { x, z, key };
    });
    positions.sort((a, b) => a.x !== b.x ? a.x - b.x : a.z - b.z);
    return positions;
}

function calculateDimensions(voxels: Voxel[]): GridDimensions {
    let maxX = 0, maxY = 0, maxZ = 0;
    for (const voxel of voxels) {
        maxX = Math.max(maxX, voxel.x);
        maxY = Math.max(maxY, voxel.y);
        maxZ = Math.max(maxZ, voxel.z);
    }
    return { x: maxX, y: maxY, z: maxZ };
}

function organizeByLayers(voxels: Voxel[], dims: GridDimensions): Map<number, OccupancyGrid> {
    const layers = new Map<number, OccupancyGrid>();
    for (const voxel of voxels) {
        if (!layers.has(voxel.y)) {
            layers.set(voxel.y, new Map());
        }
        const key = `${voxel.x},${voxel.z}`;
        layers.get(voxel.y)!.set(key, voxel.color);
    }
    return layers;
}

function markUsed(used: Set<string>, x: number, z: number, width: number, depth: number): void {
    for (let dx = 0; dx < width; dx++) {
        for (let dz = 0; dz < depth; dz++) {
            used.add(`${x + dx},${z + dz}`);
        }
    }
}
