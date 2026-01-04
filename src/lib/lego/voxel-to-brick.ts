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

    let bricks: LegoBrick[] = [];

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

    // Post-processing: Remove floating bricks not connected to ground
    bricks = removeFloatingBricks(bricks);

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
 * Brick priority: 2x4 > 4x2 > 2x2 > 1x4 > 4x1 > 1x2 > 2x1 > 1x1
 */
function fillLayerSimple(grid: OccupancyGrid, y: number): LegoBrick[] {
    const bricks: LegoBrick[] = [];
    const used = new Set<string>();

    const positions = getSortedPositions(grid);

    for (const pos of positions) {
        if (used.has(pos.key)) continue;

        const color = grid.get(pos.key)!;
        let placed = false;

        // Try 2x4 horizontal (largest, preferred)
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
        // Try 1x4 (detail brick - used sparingly)
        else if (canPlaceBrick(grid, used, pos.x, pos.z, 1, 4, color)) {
            bricks.push({ width: 1, depth: 4, x: pos.x, y, z: pos.z, color });
            markUsed(used, pos.x, pos.z, 1, 4);
            placed = true;
        }
        // Try 4x1 
        else if (canPlaceBrick(grid, used, pos.x, pos.z, 4, 1, color)) {
            bricks.push({ width: 4, depth: 1, x: pos.x, y, z: pos.z, color });
            markUsed(used, pos.x, pos.z, 4, 1);
            placed = true;
        }
        // Try 1x2
        else if (canPlaceBrick(grid, used, pos.x, pos.z, 1, 2, color)) {
            bricks.push({ width: 1, depth: 2, x: pos.x, y, z: pos.z, color });
            markUsed(used, pos.x, pos.z, 1, 2);
            placed = true;
        }
        // Try 2x1
        else if (canPlaceBrick(grid, used, pos.x, pos.z, 2, 1, color)) {
            bricks.push({ width: 2, depth: 1, x: pos.x, y, z: pos.z, color });
            markUsed(used, pos.x, pos.z, 2, 1);
            placed = true;
        }
        // Last resort: 1x1
        else if (canPlaceBrick(grid, used, pos.x, pos.z, 1, 1, color)) {
            bricks.push({ width: 1, depth: 1, x: pos.x, y, z: pos.z, color });
            markUsed(used, pos.x, pos.z, 1, 1);
            placed = true;
        }
    }

    return bricks;
}

/**
 * Fill layer with seam-aware interlocking
 * Brick priority: larger bricks preferred, smaller bricks as fallback for detail
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

        // Prioritize placements that cross seams - include smaller bricks as fallback
        const candidates = [
            { w: 2, d: 4, score: 0 },
            { w: 4, d: 2, score: 0 },
            { w: 2, d: 2, score: 0 },
            { w: 1, d: 4, score: 0 },  // Detail bricks
            { w: 4, d: 1, score: 0 },
            { w: 1, d: 2, score: 0 },
            { w: 2, d: 1, score: 0 },
            { w: 1, d: 1, score: 0 },  // Last resort
        ];

        // Score each candidate by how many seams it crosses
        // Give bonus points to larger bricks to prefer them when tie
        for (const cand of candidates) {
            if (canPlaceBrickVoxelAligned(grid, used, pos.x, pos.z, cand.w, cand.d, color, y, voxelSet)) {
                const seamsCrossed = countSeamsCrossed(pos.x, pos.z, cand.w, cand.d, seams);
                const sizeBonus = (cand.w * cand.d) * 0.1; // Small bonus for larger bricks
                cand.score = seamsCrossed + sizeBonus;
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

// ============================================================================
// Connectivity Validation - Remove Floating Bricks
// ============================================================================

/**
 * Get all stud positions occupied by a brick
 */
function getBrickStudPositions(brick: LegoBrick): Set<string> {
    const positions = new Set<string>();
    for (let dx = 0; dx < brick.width; dx++) {
        for (let dz = 0; dz < brick.depth; dz++) {
            positions.add(`${brick.x + dx},${brick.z + dz}`);
        }
    }
    return positions;
}

/**
 * Check if two bricks share at least one stud position (vertically adjacent)
 */
function bricksShareStuds(a: LegoBrick, b: LegoBrick): boolean {
    // Must be on adjacent layers (Y difference of 1)
    if (Math.abs(a.y - b.y) !== 1) return false;

    const aPositions = getBrickStudPositions(a);
    const bPositions = getBrickStudPositions(b);

    // Check for any overlap
    for (const pos of aPositions) {
        if (bPositions.has(pos)) return true;
    }
    return false;
}

/**
 * Remove floating bricks that aren't connected to ground.
 * Uses bidirectional connectivity - bricks can be held from above or below.
 * 
 * Algorithm:
 * 1. Build adjacency graph based on stud overlap
 * 2. Flood fill from ground layer (Y=0) to find all connected bricks
 * 3. Remove any bricks not in the connected component
 */
function removeFloatingBricks(bricks: LegoBrick[]): LegoBrick[] {
    if (bricks.length === 0) return bricks;

    // Build adjacency list
    const adjacency = new Map<number, Set<number>>();
    for (let i = 0; i < bricks.length; i++) {
        adjacency.set(i, new Set());
    }

    // Check all pairs for stud connections
    for (let i = 0; i < bricks.length; i++) {
        for (let j = i + 1; j < bricks.length; j++) {
            if (bricksShareStuds(bricks[i], bricks[j])) {
                adjacency.get(i)!.add(j);
                adjacency.get(j)!.add(i);
            }
        }
    }

    // Find all bricks on ground layer (Y=0) - these are automatically stable
    const groundBricks = bricks
        .map((b, i) => ({ brick: b, index: i }))
        .filter(({ brick }) => brick.y === 0)
        .map(({ index }) => index);

    // Flood fill from ground to find all connected bricks
    const connected = new Set<number>(groundBricks);
    const queue = [...groundBricks];

    while (queue.length > 0) {
        const current = queue.shift()!;
        const neighbors = adjacency.get(current) || new Set();

        for (const neighbor of neighbors) {
            if (!connected.has(neighbor)) {
                connected.add(neighbor);
                queue.push(neighbor);
            }
        }
    }

    // Filter to only connected bricks
    const stableBricks = bricks.filter((_, i) => connected.has(i));

    const removedCount = bricks.length - stableBricks.length;
    if (removedCount > 0 || groundBricks.length === 0) {
        const minY = Math.min(...bricks.map(b => b.y));
        const maxY = Math.max(...bricks.map(b => b.y));
        console.log(`[voxel-to-brick] Connectivity check: groundBricks=${groundBricks.length}, minY=${minY}, maxY=${maxY}, removed=${removedCount}`);
    }

    return stableBricks;
}
