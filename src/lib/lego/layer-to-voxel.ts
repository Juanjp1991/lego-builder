/**
 * Layer to Voxel Rasterization
 *
 * Converts layered silhouette models to 3D voxel grids.
 * Each shape is rasterized to a 2D grid, then extruded vertically.
 *
 * Coordinate system:
 * - X/Z = horizontal plane (studs)
 * - Y = vertical height (plates)
 */

import type {
    SilhouetteModel,
    LayerShape,
    Hole,
    Point,
} from '@/lib/ai/silhouette-schemas';
import type { Voxel } from './voxel-to-brick';

// ============================================================================
// Main Export
// ============================================================================

/**
 * Symmetry options for rasterization
 */
export interface SymmetryOptions {
    /** Enforce X-axis (left-right) symmetry */
    x: boolean;
    /** Enforce Z-axis (front-back) symmetry */
    z: boolean;
}

/**
 * Rasterizes a silhouette model to voxels.
 * @param model - Validated silhouette model
 * @param enforceSymmetry - Symmetry enforcement options.
 *        Can be a boolean (true = X-axis only, for backwards compatibility)
 *        or a SymmetryOptions object to specify which axes to enforce.
 * @returns Array of voxels compatible with voxel-to-brick.ts
 */
export function rasterizeLayers(
    model: SilhouetteModel,
    enforceSymmetry: boolean | SymmetryOptions = true
): Voxel[] {
    const voxels: Voxel[] = [];
    const bbox = model.bounding_box;

    // Normalize symmetry options
    // Default: X-axis only (left-right) - appropriate for humans, animals, vehicles
    // Z-axis (front-back) would make faces look like backs - wrong for most objects
    const symmetryOpts: SymmetryOptions = typeof enforceSymmetry === 'boolean'
        ? { x: enforceSymmetry, z: false }  // X-axis only by default
        : enforceSymmetry;

    // Create a 2D grid for rasterization
    const gridWidth = bbox.width;
    const gridDepth = bbox.depth;

    for (const layer of model.layers) {
        // Create boolean grid for this layer's X/Z slice
        const grid = create2DGrid(gridWidth, gridDepth);

        // Rasterize all shapes (additive)
        for (const shape of layer.shapes) {
            rasterizeShape(grid, shape, gridWidth, gridDepth);
        }

        // Subtract holes
        if (layer.holes) {
            for (const hole of layer.holes) {
                subtractHole(grid, hole, gridWidth, gridDepth);
            }
        }

        // Enforce symmetry if enabled
        if (symmetryOpts.x || symmetryOpts.z) {
            enforceGridSymmetry(grid, gridWidth, gridDepth, symmetryOpts);
        }

        // Extrude to voxels for each Y level in this layer
        for (let y = layer.y_min_plates; y < layer.y_max_plates; y++) {
            for (let x = 0; x < gridWidth; x++) {
                for (let z = 0; z < gridDepth; z++) {
                    const cell = grid[x][z];
                    if (cell.filled) {
                        voxels.push({ x, y, z, color: cell.color });
                    }
                }
            }
        }
    }

    return voxels;
}

/**
 * Enforces bilateral symmetry on a 2D grid.
 * Centers the filled region, then mirrors along the specified axes.
 * @param grid - The 2D grid to modify
 * @param width - Grid width
 * @param depth - Grid depth
 * @param opts - Which axes to enforce symmetry on
 */
function enforceGridSymmetry(
    grid: Grid2D,
    width: number,
    depth: number,
    opts: SymmetryOptions
): void {
    // Step 1: Find the bounds of filled cells
    let minX = width, maxX = -1;
    let minZ = depth, maxZ = -1;
    for (let x = 0; x < width; x++) {
        for (let z = 0; z < depth; z++) {
            if (grid[x][z].filled) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minZ = Math.min(minZ, z);
                maxZ = Math.max(maxZ, z);
            }
        }
    }

    // If nothing is filled, nothing to do
    if (maxX < 0) return;

    // Step 2: Calculate centering shifts
    const shapeWidth = maxX - minX + 1;
    const shapeDepth = maxZ - minZ + 1;
    const targetMinX = opts.x ? Math.floor((width - shapeWidth) / 2) : minX;
    const targetMinZ = opts.z ? Math.floor((depth - shapeDepth) / 2) : minZ;
    const shiftX = targetMinX - minX;
    const shiftZ = targetMinZ - minZ;

    // Step 3: Shift grid to center
    if (shiftX !== 0 || shiftZ !== 0) {
        const tempGrid: GridCell[][] = [];
        for (let x = 0; x < width; x++) {
            tempGrid[x] = [];
            for (let z = 0; z < depth; z++) {
                tempGrid[x][z] = { filled: false, color: 'gray' };
            }
        }

        // Copy with shift
        for (let x = 0; x < width; x++) {
            for (let z = 0; z < depth; z++) {
                if (grid[x][z].filled) {
                    const newX = x + shiftX;
                    const newZ = z + shiftZ;
                    if (newX >= 0 && newX < width && newZ >= 0 && newZ < depth) {
                        tempGrid[newX][newZ] = { ...grid[x][z] };
                    }
                }
            }
        }

        // Copy back to original grid
        for (let x = 0; x < width; x++) {
            for (let z = 0; z < depth; z++) {
                grid[x][z] = tempGrid[x][z];
            }
        }
    }

    // Step 4: Mirror along X-axis (left-right symmetry)
    if (opts.x) {
        const centerX = width / 2;
        for (let z = 0; z < depth; z++) {
            for (let x = 0; x < Math.floor(centerX); x++) {
                const mirrorX = width - 1 - x;
                const leftCell = grid[x][z];
                const rightCell = grid[mirrorX][z];

                // If either side is filled, fill both (union approach)
                if (leftCell.filled || rightCell.filled) {
                    const color = leftCell.filled ? leftCell.color : rightCell.color;
                    grid[x][z] = { filled: true, color };
                    grid[mirrorX][z] = { filled: true, color };
                }
            }
        }
    }

    // Step 5: Mirror along Z-axis (front-back symmetry)
    if (opts.z) {
        const centerZ = depth / 2;
        for (let x = 0; x < width; x++) {
            for (let z = 0; z < Math.floor(centerZ); z++) {
                const mirrorZ = depth - 1 - z;
                const frontCell = grid[x][z];
                const backCell = grid[x][mirrorZ];

                // If either side is filled, fill both (union approach)
                if (frontCell.filled || backCell.filled) {
                    const color = frontCell.filled ? frontCell.color : backCell.color;
                    grid[x][z] = { filled: true, color };
                    grid[x][mirrorZ] = { filled: true, color };
                }
            }
        }
    }
}

// ============================================================================
// Grid Types
// ============================================================================

interface GridCell {
    filled: boolean;
    color: string;
}

type Grid2D = GridCell[][];

function create2DGrid(width: number, depth: number): Grid2D {
    const grid: Grid2D = [];
    for (let x = 0; x < width; x++) {
        grid[x] = [];
        for (let z = 0; z < depth; z++) {
            grid[x][z] = { filled: false, color: 'gray' };
        }
    }
    return grid;
}

// ============================================================================
// Shape Rasterization
// ============================================================================

function rasterizeShape(
    grid: Grid2D,
    shape: LayerShape,
    gridWidth: number,
    gridDepth: number
): void {
    switch (shape.type) {
        case 'rect':
            rasterizeRect(grid, shape.x, shape.z, shape.width, shape.depth, shape.color);
            break;
        case 'rounded_rect':
            rasterizeRoundedRect(
                grid,
                shape.x,
                shape.z,
                shape.width,
                shape.depth,
                shape.radius,
                shape.color
            );
            break;
        case 'circle':
            rasterizeCircle(grid, shape.center_x, shape.center_z, shape.radius, shape.color, gridWidth, gridDepth);
            break;
        case 'oval':
            rasterizeOval(grid, shape.center_x, shape.center_z, shape.radius_x, shape.radius_z, shape.color, gridWidth, gridDepth);
            break;
        case 'polygon':
            rasterizePolygon(grid, shape.points, shape.color, gridWidth, gridDepth);
            break;
    }
}

/**
 * Rasterize rectangle
 */
function rasterizeRect(
    grid: Grid2D,
    x: number,
    z: number,
    width: number,
    depth: number,
    color: string
): void {
    const gridWidth = grid.length;
    const gridDepth = grid[0]?.length ?? 0;

    for (let dx = 0; dx < width; dx++) {
        for (let dz = 0; dz < depth; dz++) {
            const px = x + dx;
            const pz = z + dz;
            if (px >= 0 && px < gridWidth && pz >= 0 && pz < gridDepth) {
                grid[px][pz] = { filled: true, color };
            }
        }
    }
}

/**
 * Rasterize rounded rectangle (simplified: just use rect, rounded corners at stud scale are negligible)
 */
function rasterizeRoundedRect(
    grid: Grid2D,
    x: number,
    z: number,
    width: number,
    depth: number,
    radius: number,
    color: string
): void {
    // For LEGO-scale rasterization, rounded corners are typically < 1 stud
    // Just use rectangle for simplicity (corners are negligible at this resolution)
    rasterizeRect(grid, x, z, width, depth, color);
}

/**
 * Rasterize circle using Bresenham-style algorithm
 */
function rasterizeCircle(
    grid: Grid2D,
    centerX: number,
    centerZ: number,
    radius: number,
    color: string,
    gridWidth: number,
    gridDepth: number
): void {
    const r2 = radius * radius;

    for (let x = centerX - radius; x <= centerX + radius; x++) {
        for (let z = centerZ - radius; z <= centerZ + radius; z++) {
            const dx = x - centerX;
            const dz = z - centerZ;
            // Point-in-circle test (using center of voxel)
            if (dx * dx + dz * dz <= r2) {
                if (x >= 0 && x < gridWidth && z >= 0 && z < gridDepth) {
                    grid[x][z] = { filled: true, color };
                }
            }
        }
    }
}

/**
 * Rasterize oval/ellipse
 */
function rasterizeOval(
    grid: Grid2D,
    centerX: number,
    centerZ: number,
    radiusX: number,
    radiusZ: number,
    color: string,
    gridWidth: number,
    gridDepth: number
): void {
    for (let x = centerX - radiusX; x <= centerX + radiusX; x++) {
        for (let z = centerZ - radiusZ; z <= centerZ + radiusZ; z++) {
            const dx = x - centerX;
            const dz = z - centerZ;
            // Point-in-ellipse test: (dx/rx)^2 + (dz/rz)^2 <= 1
            const normalized = (dx * dx) / (radiusX * radiusX) + (dz * dz) / (radiusZ * radiusZ);
            if (normalized <= 1) {
                if (x >= 0 && x < gridWidth && z >= 0 && z < gridDepth) {
                    grid[x][z] = { filled: true, color };
                }
            }
        }
    }
}

/**
 * Rasterize polygon using ray-casting point-in-polygon test
 */
function rasterizePolygon(
    grid: Grid2D,
    points: Point[],
    color: string,
    gridWidth: number,
    gridDepth: number
): void {
    // Find bounding box of polygon
    const minX = Math.max(0, Math.floor(Math.min(...points.map((p) => p.x))));
    const maxX = Math.min(gridWidth - 1, Math.ceil(Math.max(...points.map((p) => p.x))));
    const minZ = Math.max(0, Math.floor(Math.min(...points.map((p) => p.z))));
    const maxZ = Math.min(gridDepth - 1, Math.ceil(Math.max(...points.map((p) => p.z))));

    for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
            // Test center of voxel
            if (pointInPolygon(x + 0.5, z + 0.5, points)) {
                grid[x][z] = { filled: true, color };
            }
        }
    }
}

/**
 * Ray-casting algorithm for point-in-polygon test
 */
function pointInPolygon(x: number, z: number, polygon: Point[]): boolean {
    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = polygon[i].x;
        const zi = polygon[i].z;
        const xj = polygon[j].x;
        const zj = polygon[j].z;

        const intersect =
            zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;

        if (intersect) {
            inside = !inside;
        }
    }

    return inside;
}

// ============================================================================
// Hole Subtraction
// ============================================================================

function subtractHole(
    grid: Grid2D,
    hole: Hole,
    gridWidth: number,
    gridDepth: number
): void {
    switch (hole.type) {
        case 'rect':
            subtractRect(grid, hole.x, hole.z, hole.width, hole.depth);
            break;
        case 'circle':
            subtractCircle(grid, hole.center_x, hole.center_z, hole.radius, gridWidth, gridDepth);
            break;
        case 'polygon':
            subtractPolygon(grid, hole.points, gridWidth, gridDepth);
            break;
    }
}

function subtractRect(
    grid: Grid2D,
    x: number,
    z: number,
    width: number,
    depth: number
): void {
    const gridWidth = grid.length;
    const gridDepth = grid[0]?.length ?? 0;

    for (let dx = 0; dx < width; dx++) {
        for (let dz = 0; dz < depth; dz++) {
            const px = x + dx;
            const pz = z + dz;
            if (px >= 0 && px < gridWidth && pz >= 0 && pz < gridDepth) {
                grid[px][pz].filled = false;
            }
        }
    }
}

function subtractCircle(
    grid: Grid2D,
    centerX: number,
    centerZ: number,
    radius: number,
    gridWidth: number,
    gridDepth: number
): void {
    const r2 = radius * radius;

    for (let x = centerX - radius; x <= centerX + radius; x++) {
        for (let z = centerZ - radius; z <= centerZ + radius; z++) {
            const dx = x - centerX;
            const dz = z - centerZ;
            if (dx * dx + dz * dz <= r2) {
                if (x >= 0 && x < gridWidth && z >= 0 && z < gridDepth) {
                    grid[x][z].filled = false;
                }
            }
        }
    }
}

function subtractPolygon(
    grid: Grid2D,
    points: Point[],
    gridWidth: number,
    gridDepth: number
): void {
    const minX = Math.max(0, Math.floor(Math.min(...points.map((p) => p.x))));
    const maxX = Math.min(gridWidth - 1, Math.ceil(Math.max(...points.map((p) => p.x))));
    const minZ = Math.max(0, Math.floor(Math.min(...points.map((p) => p.z))));
    const maxZ = Math.min(gridDepth - 1, Math.ceil(Math.max(...points.map((p) => p.z))));

    for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
            if (pointInPolygon(x + 0.5, z + 0.5, points)) {
                grid[x][z].filled = false;
            }
        }
    }
}
