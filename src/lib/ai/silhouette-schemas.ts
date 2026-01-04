/**
 * Silhouette Schemas
 *
 * Zod schemas for validating layered silhouette JSON from Gemini.
 * Used in the silhouette-based LEGO generation pipeline.
 *
 * Coordinate system:
 * - X/Z = horizontal plane (studs, integers)
 * - Y = vertical height (plates, integers)
 * - 1 stud = 8mm, 1 plate = 3.2mm, 1 brick = 3 plates
 */

import { z } from 'zod';

// ============================================================================
// Constants
// ============================================================================

/** Maximum number of layers allowed */
export const MAX_LAYERS = 50;

/** Maximum points in a polygon */
export const MAX_POLYGON_POINTS = 20;

/** Maximum bounding box dimensions (studs) */
export const MAX_BBOX_STUDS = 64;

/** Maximum height (plates) */
export const MAX_HEIGHT_PLATES = 96;

/** Minimum layer height (plates) */
export const MIN_LAYER_HEIGHT = 1;

/** Valid LEGO colors */
export const LEGO_COLORS = [
    'red',
    'blue',
    'yellow',
    'green',
    'white',
    'black',
    'gray',
    'light-gray',
    'dark-gray',
    'orange',
    'brown',
    'tan',
    'pink',
    'purple',
    'lime',
    'cyan',
    'dark-blue',
    'dark-red',
    'dark-green',
] as const;

export type LegoColor = (typeof LEGO_COLORS)[number];

// ============================================================================
// Point Schema
// ============================================================================

/** 2D point in stud coordinates */
export const PointSchema = z.object({
    x: z.number().int(),
    z: z.number().int(),
});

export type Point = z.infer<typeof PointSchema>;

// ============================================================================
// Shape Schemas
// ============================================================================

/** Base shape properties */
const BaseShapeSchema = z.object({
    color: z.enum(LEGO_COLORS),
});

/** Rectangle shape */
export const RectShapeSchema = BaseShapeSchema.extend({
    type: z.literal('rect'),
    x: z.number().int(),
    z: z.number().int(),
    width: z.number().int().positive(),
    depth: z.number().int().positive(),
});

/** Rounded rectangle shape */
export const RoundedRectShapeSchema = BaseShapeSchema.extend({
    type: z.literal('rounded_rect'),
    x: z.number().int(),
    z: z.number().int(),
    width: z.number().int().positive(),
    depth: z.number().int().positive(),
    radius: z.number().int().nonnegative(),
});

/** Circle shape */
export const CircleShapeSchema = BaseShapeSchema.extend({
    type: z.literal('circle'),
    center_x: z.number().int(),
    center_z: z.number().int(),
    radius: z.number().int().positive(),
});

/** Oval/ellipse shape */
export const OvalShapeSchema = BaseShapeSchema.extend({
    type: z.literal('oval'),
    center_x: z.number().int(),
    center_z: z.number().int(),
    radius_x: z.number().int().positive(),
    radius_z: z.number().int().positive(),
});

/** Polygon shape */
export const PolygonShapeSchema = BaseShapeSchema.extend({
    type: z.literal('polygon'),
    points: z
        .array(PointSchema)
        .min(3)
        .max(MAX_POLYGON_POINTS),
});

/** Union of all shape types */
export const LayerShapeSchema = z.discriminatedUnion('type', [
    RectShapeSchema,
    RoundedRectShapeSchema,
    CircleShapeSchema,
    OvalShapeSchema,
    PolygonShapeSchema,
]);

export type LayerShape = z.infer<typeof LayerShapeSchema>;

// ============================================================================
// Hole Schemas (same shapes but for subtraction)
// ============================================================================

/** Hole rectangle */
export const RectHoleSchema = z.object({
    type: z.literal('rect'),
    x: z.number().int(),
    z: z.number().int(),
    width: z.number().int().positive(),
    depth: z.number().int().positive(),
});

/** Hole circle */
export const CircleHoleSchema = z.object({
    type: z.literal('circle'),
    center_x: z.number().int(),
    center_z: z.number().int(),
    radius: z.number().int().positive(),
});

/** Hole polygon */
export const PolygonHoleSchema = z.object({
    type: z.literal('polygon'),
    points: z.array(PointSchema).min(3).max(MAX_POLYGON_POINTS),
});

/** Union of hole types */
export const HoleSchema = z.discriminatedUnion('type', [
    RectHoleSchema,
    CircleHoleSchema,
    PolygonHoleSchema,
]);

export type Hole = z.infer<typeof HoleSchema>;

// ============================================================================
// Layer Schema
// ============================================================================

/** Single silhouette layer */
export const SilhouetteLayerSchema = z.object({
    /** Minimum Y position in plates (inclusive) */
    y_min_plates: z.number().int().nonnegative(),

    /** Maximum Y position in plates (exclusive) */
    y_max_plates: z.number().int().positive(),

    /** Shapes that make up this layer */
    shapes: z.array(LayerShapeSchema).min(1),

    /** Optional holes to subtract from shapes */
    holes: z.array(HoleSchema).optional(),

    /** AI confidence score (0-1) */
    confidence: z.number().min(0).max(1).optional(),

    /** Optional notes about this layer */
    notes: z.string().optional(),
}).refine(
    (layer) => layer.y_max_plates > layer.y_min_plates,
    { message: 'y_max_plates must be greater than y_min_plates' }
).refine(
    (layer) => (layer.y_max_plates - layer.y_min_plates) >= MIN_LAYER_HEIGHT,
    { message: `Layer height must be at least ${MIN_LAYER_HEIGHT} plate(s)` }
);

export type SilhouetteLayer = z.infer<typeof SilhouetteLayerSchema>;

// ============================================================================
// Bounding Box Schema
// ============================================================================

export const BoundingBoxSchema = z.object({
    width: z.number().int().positive().max(MAX_BBOX_STUDS),
    depth: z.number().int().positive().max(MAX_BBOX_STUDS),
    height_plates: z.number().int().positive().max(MAX_HEIGHT_PLATES),
});

export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

// ============================================================================
// Complete Model Schema
// ============================================================================

/** Symmetry axis recommendation from AI */
export const SymmetryAxisSchema = z.enum(['x', 'z', 'both', 'none']);
export type SymmetryAxisType = z.infer<typeof SymmetryAxisSchema>;

/** Complete silhouette model from AI */
export const SilhouetteModelSchema = z.object({
    /** Units indicator (always "studs") */
    units: z.literal('studs'),

    /** Bounding box of the model */
    bounding_box: BoundingBoxSchema,

    /** Array of silhouette layers, bottom to top */
    layers: z
        .array(SilhouetteLayerSchema)
        .min(1)
        .max(MAX_LAYERS),

    /** Overall model confidence */
    confidence: z.number().min(0).max(1).optional(),

    /** AI notes about the model */
    notes: z.string().optional(),

    /**
     * AI-recommended symmetry axis based on object orientation.
     * - 'x': Object faces forward, mirror left-right (humans, animals)
     * - 'z': Object faces sideways, mirror front-back (side profile views)
     * - 'both': Object is symmetric on both axes (columns, spheres)
     * - 'none': Object is inherently asymmetric
     */
    recommended_symmetry: SymmetryAxisSchema.optional(),
}).refine(
    (model) => {
        // Validate layers are in ascending order by y_min_plates
        for (let i = 1; i < model.layers.length; i++) {
            if (model.layers[i].y_min_plates < model.layers[i - 1].y_min_plates) {
                return false;
            }
        }
        return true;
    },
    { message: 'Layers must be ordered by ascending y_min_plates' }
).refine(
    (model) => {
        // Check max height doesn't exceed bounding box
        const maxY = Math.max(...model.layers.map((l) => l.y_max_plates));
        return maxY <= model.bounding_box.height_plates;
    },
    { message: 'Layer heights exceed bounding box height' }
);

export type SilhouetteModel = z.infer<typeof SilhouetteModelSchema>;

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validates a silhouette model JSON.
 * @param json - The JSON to validate
 * @returns Parsed and validated model, or error
 */
export function validateSilhouetteModel(json: unknown): {
    success: true;
    data: SilhouetteModel;
} | {
    success: false;
    error: z.ZodError;
} {
    const result = SilhouetteModelSchema.safeParse(json);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}

/**
 * Checks if model has a valid base layer (Y=0 with good coverage).
 * @param model - Validated silhouette model
 * @param minCoverageRatio - Minimum ratio of bbox covered (0-1)
 * @returns Whether base layer is adequate
 */
export function hasValidBaseLayer(
    model: SilhouetteModel,
    minCoverageRatio: number = 0.5
): boolean {
    // Find layers that include Y=0
    const baseLayers = model.layers.filter((l) => l.y_min_plates === 0);
    if (baseLayers.length === 0) return false;

    // Calculate approximate coverage (simplified: use rect areas)
    const bboxArea = model.bounding_box.width * model.bounding_box.depth;
    let coveredArea = 0;

    for (const layer of baseLayers) {
        for (const shape of layer.shapes) {
            if (shape.type === 'rect' || shape.type === 'rounded_rect') {
                coveredArea += shape.width * shape.depth;
            } else if (shape.type === 'circle') {
                coveredArea += Math.PI * shape.radius * shape.radius;
            } else if (shape.type === 'oval') {
                coveredArea += Math.PI * shape.radius_x * shape.radius_z;
            } else if (shape.type === 'polygon') {
                // Approximate polygon area using shoelace formula
                coveredArea += calculatePolygonArea(shape.points);
            }
        }
    }

    return coveredArea / bboxArea >= minCoverageRatio;
}

/**
 * Calculates polygon area using shoelace formula.
 */
function calculatePolygonArea(points: Point[]): number {
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points[i].x * points[j].z;
        area -= points[j].x * points[i].z;
    }
    return Math.abs(area) / 2;
}

/**
 * Counts total voxels that would be generated from a model.
 * Used for candidate ranking.
 */
export function estimateVoxelCount(model: SilhouetteModel): number {
    let count = 0;

    for (const layer of model.layers) {
        const layerHeight = layer.y_max_plates - layer.y_min_plates;

        for (const shape of layer.shapes) {
            let shapeArea = 0;

            if (shape.type === 'rect' || shape.type === 'rounded_rect') {
                shapeArea = shape.width * shape.depth;
            } else if (shape.type === 'circle') {
                shapeArea = Math.PI * shape.radius * shape.radius;
            } else if (shape.type === 'oval') {
                shapeArea = Math.PI * shape.radius_x * shape.radius_z;
            } else if (shape.type === 'polygon') {
                shapeArea = calculatePolygonArea(shape.points);
            }

            count += Math.floor(shapeArea) * layerHeight;
        }
    }

    return count;
}

// ============================================================================
// Multi-View Schemas
// ============================================================================

/**
 * A single filled column in a silhouette view.
 * Represents a vertical span of filled pixels at a given position.
 */
export const SilhouetteColumnSchema = z.object({
    /** Position (X for front view, Z for side view) */
    position: z.number().int().nonnegative(),
    /** Bottom of filled region in plates */
    y_min: z.number().int().nonnegative(),
    /** Top of filled region in plates (exclusive) */
    y_max: z.number().int().positive(),
    /** Color of this column */
    color: z.enum(LEGO_COLORS),
});

export type SilhouetteColumn = z.infer<typeof SilhouetteColumnSchema>;

/**
 * Front view silhouette (looking at X-Y plane, from +Z direction).
 * Each column represents a vertical slice at a given X position.
 */
export const FrontViewSchema = z.object({
    /** Total width in studs */
    width: z.number().int().positive().max(MAX_BBOX_STUDS),
    /** Total height in plates */
    height_plates: z.number().int().positive().max(MAX_HEIGHT_PLATES),
    /** Filled columns (vertical slices) */
    columns: z.array(SilhouetteColumnSchema).min(1),
});

export type FrontView = z.infer<typeof FrontViewSchema>;

/**
 * Side view silhouette (looking at Z-Y plane, from +X direction).
 * Each column represents a vertical slice at a given Z position.
 */
export const SideViewSchema = z.object({
    /** Total depth in studs */
    depth: z.number().int().positive().max(MAX_BBOX_STUDS),
    /** Total height in plates */
    height_plates: z.number().int().positive().max(MAX_HEIGHT_PLATES),
    /** Filled columns (vertical slices) */
    columns: z.array(SilhouetteColumnSchema).min(1),
});

export type SideView = z.infer<typeof SideViewSchema>;

/**
 * A single filled cell in the top view (X-Z plane).
 * Used for sparse point-based top view (legacy format).
 */
export const TopViewCellSchema = z.object({
    /** X position (studs) */
    x: z.number().int().nonnegative(),
    /** Z position (studs) */
    z: z.number().int().nonnegative(),
    /** Color of this cell */
    color: z.enum(LEGO_COLORS),
});

export type TopViewCell = z.infer<typeof TopViewCellSchema>;

/**
 * A row span in the top view (X-Z plane).
 * Each row represents a continuous filled range at a specific Z position.
 * This format preserves curved/irregular shapes accurately.
 */
export const TopViewRowSchema = z.object({
    /** Z position (studs) - the row's depth position */
    z: z.number().int().nonnegative(),
    /** Minimum X position (studs) - left edge of filled region */
    x_min: z.number().int().nonnegative(),
    /** Maximum X position (studs) - right edge of filled region */
    x_max: z.number().int().nonnegative(),
    /** Color of this row span */
    color: z.enum(LEGO_COLORS),
});

export type TopViewRow = z.infer<typeof TopViewRowSchema>;

/**
 * Top view silhouette (looking at X-Z plane from above).
 * Supports two formats:
 * - "cells": Sparse point-based (legacy, filled by algorithm)
 * - "rows": Row-span based (preferred, accurate shapes)
 */
export const TopViewSchema = z.object({
    /** Total width in studs */
    width: z.number().int().positive().max(MAX_BBOX_STUDS),
    /** Total depth in studs */
    depth: z.number().int().positive().max(MAX_BBOX_STUDS),
    /** Filled cells (legacy format - sparse points) */
    cells: z.array(TopViewCellSchema).optional(),
    /** Filled rows (preferred format - accurate spans per Z row) */
    rows: z.array(TopViewRowSchema).optional(),
}).refine(
    (data) => (data.cells && data.cells.length > 0) || (data.rows && data.rows.length > 0),
    { message: "Top view must have either cells or rows" }
);

export type TopView = z.infer<typeof TopViewSchema>;


/**
 * Multi-view silhouette model with front and side views.
 * Used for visual hull carving to create accurate 3D models.
 */
export const MultiViewSilhouetteModelSchema = z.object({
    /** View mode indicator */
    view_mode: z.literal('multi'),

    /** Units indicator (always "studs") */
    units: z.literal('studs'),

    /** Bounding box of the model */
    bounding_box: BoundingBoxSchema,

    /** Front view silhouette (X-Y plane) */
    front_view: FrontViewSchema,

    /** Side view silhouette (Z-Y plane) */
    side_view: SideViewSchema,

    /** AI-recommended symmetry */
    recommended_symmetry: SymmetryAxisSchema.optional(),

    /** AI confidence score */
    confidence: z.number().min(0).max(1).optional(),
});

export type MultiViewSilhouetteModel = z.infer<typeof MultiViewSilhouetteModelSchema>;

/**
 * Tri-view silhouette model with front, side, AND top views.
 * Provides maximum accuracy by intersecting all three views.
 */
export const TriViewSilhouetteModelSchema = z.object({
    /** View mode indicator */
    view_mode: z.literal('tri'),

    /** Units indicator (always "studs") */
    units: z.literal('studs'),

    /** Bounding box of the model */
    bounding_box: BoundingBoxSchema,

    /** Front view silhouette (X-Y plane) */
    front_view: FrontViewSchema,

    /** Side view silhouette (Z-Y plane) */
    side_view: SideViewSchema,

    /** Top view silhouette (X-Z plane) */
    top_view: TopViewSchema,

    /** AI-recommended symmetry */
    recommended_symmetry: SymmetryAxisSchema.optional(),

    /** AI confidence score */
    confidence: z.number().min(0).max(1).optional(),
});

export type TriViewSilhouetteModel = z.infer<typeof TriViewSilhouetteModelSchema>;

/**
 * Single-view silhouette model (existing layer-based approach).
 * Added view_mode for discrimination.
 */
export const SingleViewSilhouetteModelSchema = SilhouetteModelSchema.extend({
    view_mode: z.literal('single').optional().default('single'),
});

export type SingleViewSilhouetteModel = z.infer<typeof SingleViewSilhouetteModelSchema>;

/**
 * Union schema that can be single-view, multi-view, or tri-view.
 * Use validateAnyViewModel to parse.
 */
export const AnyViewModelSchema = z.union([
    TriViewSilhouetteModelSchema,
    MultiViewSilhouetteModelSchema,
    SingleViewSilhouetteModelSchema,
]);

export type AnyViewModel = z.infer<typeof AnyViewModelSchema>;

/** View mode types for validation result */
export type ViewMode = 'single' | 'multi' | 'tri';

/**
 * Validates any silhouette model (single, multi-view, or tri-view).
 */
export function validateAnyViewModel(json: unknown): {
    success: true;
    data: SilhouetteModel | MultiViewSilhouetteModel | TriViewSilhouetteModel;
    viewMode: ViewMode;
    isMultiView: boolean;  // Kept for backward compatibility (true for both multi and tri)
} | {
    success: false;
    error: z.ZodError;
} {
    // Try tri-view first (look for view_mode: "tri")
    const triResult = TriViewSilhouetteModelSchema.safeParse(json);
    if (triResult.success) {
        return { success: true, data: triResult.data, viewMode: 'tri', isMultiView: true };
    }

    // Try multi-view (look for view_mode: "multi")
    const multiResult = MultiViewSilhouetteModelSchema.safeParse(json);
    if (multiResult.success) {
        return { success: true, data: multiResult.data, viewMode: 'multi', isMultiView: true };
    }

    // Fall back to single-view (original layer-based schema)
    const singleResult = SilhouetteModelSchema.safeParse(json);
    if (singleResult.success) {
        return { success: true, data: singleResult.data, viewMode: 'single', isMultiView: false };
    }

    return { success: false, error: singleResult.error };
}
