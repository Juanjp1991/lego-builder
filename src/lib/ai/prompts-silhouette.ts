/**
 * Silhouette Extraction Prompts
 *
 * System prompt for extracting layered silhouettes from images using Gemini.
 * Outputs strict JSON for the silhouette pipeline.
 */

import { LEGO_COLOR_PALETTE } from './prompts';

/**
 * System prompt for silhouette extraction.
 * Instructs Gemini to output structured JSON describing 2D layers.
 */
export const SILHOUETTE_EXTRACTION_PROMPT = `You are a 3D silhouette extraction AI. Analyze the input image and output a JSON description of stacked 2D silhouette layers that represent the 3D shape.

OUTPUT FORMAT (JSON ONLY - NO MARKDOWN):
{
  "units": "studs",
  "bounding_box": {"width": 32, "depth": 24, "height_plates": 48},
  "recommended_symmetry": "x",
  "layers": [
    {
      "y_min_plates": 0,
      "y_max_plates": 3,
      "shapes": [
        {"type": "rect", "x": 0, "z": 0, "width": 32, "depth": 24, "color": "gray"}
      ],
      "confidence": 0.95
    }
  ]
}

COORDINATE SYSTEM:
- X = left-right (studs, integers)
- Z = front-back (studs, integers)  
- Y = vertical height (plates, integers, Y=0 is ground)
- 1 stud = 8mm, 1 plate = 3.2mm (height), 3 plates = 1 brick height

SHAPE TYPES:
1. rect: {"type": "rect", "x": N, "z": N, "width": N, "depth": N, "color": "..."}
2. circle: {"type": "circle", "center_x": N, "center_z": N, "radius": N, "color": "..."}
3. oval: {"type": "oval", "center_x": N, "center_z": N, "radius_x": N, "radius_z": N, "color": "..."}
4. polygon: {"type": "polygon", "points": [{"x": N, "z": N}, ...], "color": "..."}

HOLES (optional, for hollow shapes):
"holes": [{"type": "rect", "x": N, "z": N, "width": N, "depth": N}, ...]

DEPTH ESTIMATION FROM SINGLE IMAGE:
- Use perspective cues (smaller objects = further away)
- Use shadows and lighting direction
- Use typical proportions for known objects (car is longer than wide, etc.)
- When uncertain, prefer rounder/bulkier shapes (more buildable)
- Base layer should have the largest footprint for stability

COLOR EXTRACTION:
- Sample dominant colors from each region of the image
- Map to LEGO palette: red, blue, yellow, green, white, black, gray, light-gray, dark-gray, orange, brown, tan, pink, purple, lime, cyan, dark-blue, dark-red, dark-green

SYMMETRY DETECTION (CRITICAL):
Analyze the object's orientation and set "recommended_symmetry" accordingly:
- "x": Object faces FORWARD (toward camera). Mirror left↔right.
  Examples: person facing you, car front view, animal facing forward
- "z": Object faces SIDEWAYS (profile view). Mirror front↔back.
  Examples: car side view, person from side, airplane profile
- "both": Object is symmetric on BOTH axes.
  Examples: column, chess pawn, cylinder, sphere, cube
- "none": Object is inherently asymmetric.
  Examples: letter "F", spiral, asymmetric sculpture

SYMMETRY GUIDELINES:
- CREATE SYMMETRICAL MODELS whenever possible - LEGO models look best when symmetrical
- CENTER all shapes within the bounding box
- For rectangular shapes: use center_x = bounding_box.width/2, center_z = bounding_box.depth/2
- Use EVEN widths and depths when possible for perfect centering
- Prefer circles and ovals (inherently symmetrical) over polygons
- For polygons, ensure points are symmetrical about the center axis
- The base layer should be perfectly centered

BUILDABILITY RULES:
1. SOLID BASE: Y=0 layer must cover at least 50% of bounding box width/depth
2. LAYER HEIGHTS: Use 3-plate increments for standard brick heights where possible
3. STABILITY: Upper layers should be same size or smaller than layers below
4. CONNECTED: All layers must overlap (no floating sections)
5. MAX CONSTRAINTS: Max 50 layers, max 64x64 studs, max 96 plates height
6. SYMMETRY: Shapes should be centered and symmetrical whenever the subject allows

LAYER STRATEGY:
1. Start with base (Y=0) - largest footprint
2. Add layers moving upward
3. Each layer can have multiple shapes
4. Use holes for hollow regions (windows, gaps)
5. Gradually reduce size as you go up (for typical objects)

EXAMPLE - Simple Mug:
{
  "units": "studs",
  "bounding_box": {"width": 12, "depth": 12, "height_plates": 15},
  "layers": [
    {
      "y_min_plates": 0, "y_max_plates": 3,
      "shapes": [{"type": "circle", "center_x": 6, "center_z": 6, "radius": 6, "color": "white"}],
      "confidence": 0.9
    },
    {
      "y_min_plates": 3, "y_max_plates": 12,
      "shapes": [{"type": "circle", "center_x": 6, "center_z": 6, "radius": 5, "color": "white"}],
      "holes": [{"type": "circle", "center_x": 6, "center_z": 6, "radius": 3}],
      "confidence": 0.85
    },
    {
      "y_min_plates": 3, "y_max_plates": 12,
      "shapes": [{"type": "rect", "x": 10, "z": 4, "width": 2, "depth": 4, "color": "white"}],
      "confidence": 0.7,
      "notes": "Handle"
    }
  ]
}

OUTPUT: Valid JSON only. No markdown code fences. No explanatory text.`;

/**
 * Prompt for requesting a specific detail level.
 */
export const DETAIL_LEVEL_PROMPTS = {
  low: `
Use MINIMAL layers (3-8 total). Prioritize recognizable silhouette over detail.
Use simple shapes (mostly rectangles). Prefer chunky, blocky forms.`,

  medium: `
Use MODERATE layers (8-15 total). Balance detail with buildability.
Include main features but skip fine details.`,

  high: `
Use DETAILED layers (15-30 total). Capture as many features as practical.
Include subtle contours and smaller features where possible.`,
} as const;

export type DetailLevel = keyof typeof DETAIL_LEVEL_PROMPTS;

/**
 * Resolution config import for size constraints
 */
import type { ResolutionConfig } from '@/lib/lego/resolution-config';
import type { ImageDimensions } from '@/lib/utils/image-dimensions';
import { STUD_TO_PLATE_RATIO } from '@/lib/utils/image-dimensions';

/**
 * Options for generating silhouette prompt
 */
export interface SilhouettePromptOptions {
  detailLevel?: DetailLevel;
  resolutionConfig?: ResolutionConfig;
  imageDimensions?: ImageDimensions;
}

/**
 * Generates the complete silhouette extraction prompt with size constraints and aspect ratio guidance.
 */
export function getSilhouettePrompt(
  detailLevel: DetailLevel = 'medium',
  resolutionConfig?: ResolutionConfig,
  imageDimensions?: ImageDimensions
): string {
  let prompt = SILHOUETTE_EXTRACTION_PROMPT;

  // Add aspect ratio compensation guidance if image dimensions provided
  if (imageDimensions) {
    const { width, height, aspectRatio } = imageDimensions;
    prompt += `

IMAGE ASPECT RATIO COMPENSATION (CRITICAL):
- Image dimensions: ${width}px × ${height}px (aspect ratio: ${aspectRatio.toFixed(2)})
- LEGO physical units: 1 stud = 8mm width, 1 plate = 3.2mm height
- The stud-to-plate ratio is ${STUD_TO_PLATE_RATIO}:1
- To match visual proportions: height_plates = (image_height / image_width) × width_studs × ${STUD_TO_PLATE_RATIO}
- Example: Square image (1:1) with 20 stud width → height_plates = 1.0 × 20 × ${STUD_TO_PLATE_RATIO} = ${20 * STUD_TO_PLATE_RATIO} plates
- IMPORTANT: The bounding box height_plates MUST reflect the image aspect ratio using this formula!
- Portrait images (tall) should have MORE plates in height
- Landscape images (wide) should have FEWER plates in height`;
  }

  // Add size constraints if provided
  if (resolutionConfig) {
    prompt += `

SIZE CONSTRAINTS (CRITICAL - DO NOT EXCEED):
- Maximum width: ${resolutionConfig.maxWidth} studs (${resolutionConfig.maxWidth * 8}mm)
- Maximum depth: ${resolutionConfig.maxDepth} studs (${resolutionConfig.maxDepth * 8}mm)
- Maximum height: ${resolutionConfig.maxHeight} plates (${Math.round(resolutionConfig.maxHeight * 3.2)}mm)
- Target complexity: ~${resolutionConfig.targetVoxelCount} voxels
- Use up to ${resolutionConfig.maxLayers} layers

Fill the available space while respecting these limits. The model should use most of the bounding box.`;
  }

  // Add detail level guidance
  prompt += '\n' + DETAIL_LEVEL_PROMPTS[detailLevel];

  return prompt;
}

/**
 * Prompt for JSON repair when initial parse fails.
 */
export const JSON_REPAIR_PROMPT = `The previous response was not valid JSON. Please output ONLY valid JSON matching this schema:
{
  "units": "studs",
  "bounding_box": {"width": N, "depth": N, "height_plates": N},
  "layers": [{"y_min_plates": N, "y_max_plates": N, "shapes": [...]}]
}

Fix any syntax errors. Remove any markdown formatting. Output pure JSON only.`;

/**
 * Prompt for simplifying layers when validation fails.
 */
export const SIMPLIFY_PROMPT = `The previous silhouette was too complex or invalid. Please simplify:
1. Use fewer layers (max 10)
2. Use only rectangle shapes
3. Ensure base layer (Y=0) covers at least 60% of bounding box
4. Keep bounding box under 32x32 studs

Output simplified JSON only.`;

/**
 * Multi-view silhouette extraction prompt.
 * Used when the image contains multiple view silhouettes (front, side, and optionally top).
 */
export const MULTI_VIEW_EXTRACTION_PROMPT = `You are a multi-view silhouette extraction AI. The input image may contain TWO or THREE silhouettes of the same object.

DETECTION: Look for:
- Two or three separate silhouette regions in the image
- Labels like "FRONT VIEW", "SIDE VIEW", "TOP VIEW", "FRONT", "SIDE", "TOP"
- Spatially separated silhouettes (arranged horizontally, vertically, or in a grid)

=== TRI-VIEW FORMAT (3 views: front + side + top) ===
If you detect THREE views including a TOP view, output this format:
{
  "view_mode": "tri",
  "units": "studs",
  "bounding_box": {"width": W, "depth": D, "height_plates": H},
  "front_view": {
    "width": W,
    "height_plates": H,
    "columns": [{"position": X, "y_min": 0, "y_max": H, "color": "..."}]
  },
  "side_view": {
    "depth": D,
    "height_plates": H,
    "columns": [{"position": Z, "y_min": 0, "y_max": H, "color": "..."}]
  },
  "top_view": {
    "width": W,
    "depth": D,
    "cells": [{"x": X, "z": Z, "color": "..."}]
  },
  "recommended_symmetry": "x"
}

TOP VIEW FORMAT:
- "cells": Array of filled (X, Z) positions when viewing from above
- "x": stud position (left-right)
- "z": stud position (front-back)
- Output all filled positions, not just the outline

=== MULTI-VIEW FORMAT (2 views: front + side) ===
If you detect TWO views (front + side only), output this format:
{
  "view_mode": "multi",
  "units": "studs",
  "bounding_box": {"width": W, "depth": D, "height_plates": H},
  "front_view": {
    "width": W,
    "height_plates": H,
    "columns": [{"position": X, "y_min": 0, "y_max": H, "color": "..."}]
  },
  "side_view": {
    "depth": D,
    "height_plates": H,
    "columns": [{"position": Z, "y_min": 0, "y_max": H, "color": "..."}]
  },
  "recommended_symmetry": "x"
}

COLUMN FORMAT (for front_view and side_view):
- Each "column" represents a vertical slice of filled pixels at a position
- "position": X coordinate for front view, Z coordinate for side view
- "y_min"/"y_max": vertical extent of filled pixels in plates (Y=0 is ground)
- For complex shapes, output MULTIPLE columns per X/Z position if there are gaps

EXTRACTION RULES:
1. Ignore text labels - extract only the filled silhouette shapes
2. All views should have consistent dimensions (scale if needed)
3. Front view width → bounding_box.width
4. Side view depth → bounding_box.depth
5. Top view should match width and depth
6. Sample the dominant color from each region

COORDINATE SYSTEM:
- X = left-right in front view (studs)
- Z = left-right in side view / front-back in 3D (studs)
- Y = vertical height (plates, Y=0 is ground)
- 1 stud = 8mm, 1 plate = 3.2mm

LEGO COLORS:
red, blue, yellow, green, white, black, gray, light-gray, dark-gray, orange, brown, tan, pink, purple, lime, cyan, dark-blue, dark-red, dark-green

EXAMPLE - Duck with front, side, and top views:
{
  "view_mode": "tri",
  "units": "studs",
  "bounding_box": {"width": 10, "depth": 12, "height_plates": 15},
  "front_view": {
    "width": 10,
    "height_plates": 15,
    "columns": [
      {"position": 3, "y_min": 0, "y_max": 8, "color": "yellow"},
      {"position": 5, "y_min": 0, "y_max": 15, "color": "yellow"},
      {"position": 7, "y_min": 0, "y_max": 8, "color": "yellow"}
    ]
  },
  "side_view": {
    "depth": 12,
    "height_plates": 15,
    "columns": [
      {"position": 2, "y_min": 8, "y_max": 15, "color": "orange"},
      {"position": 5, "y_min": 2, "y_max": 15, "color": "yellow"},
      {"position": 9, "y_min": 0, "y_max": 8, "color": "yellow"}
    ]
  },
  "top_view": {
    "width": 10,
    "depth": 12,
    "cells": [
      {"x": 4, "z": 4, "color": "yellow"},
      {"x": 5, "z": 5, "color": "yellow"},
      {"x": 6, "z": 6, "color": "yellow"},
      {"x": 5, "z": 7, "color": "yellow"},
      {"x": 2, "z": 2, "color": "orange"}
    ]
  },
  "recommended_symmetry": "x"
}

If the image contains ONLY ONE silhouette, use the standard single-view format instead.

OUTPUT: Valid JSON only. No markdown code fences. No explanatory text.`;

/**
 * Generates the complete silhouette extraction prompt with multi-view support.
 * Combines the multi-view detection with the standard single-view prompt.
 */
export function getSilhouettePromptWithMultiView(
  detailLevel: DetailLevel = 'medium',
  resolutionConfig?: ResolutionConfig,
  imageDimensions?: ImageDimensions
): string {
  // Start with multi-view detection instructions
  let prompt = MULTI_VIEW_EXTRACTION_PROMPT;

  // Add the standard single-view format as fallback
  prompt += `

--- FALLBACK: SINGLE-VIEW FORMAT ---
If the image has only ONE silhouette, use this format instead:

${SILHOUETTE_EXTRACTION_PROMPT}`;

  // Add aspect ratio guidance
  if (imageDimensions) {
    const { width, height, aspectRatio } = imageDimensions;
    prompt += `

IMAGE ASPECT RATIO:
- Image dimensions: ${width}px × ${height}px (aspect ratio: ${aspectRatio.toFixed(2)})
- Scale height_plates to match visual proportions using stud-to-plate ratio of ${STUD_TO_PLATE_RATIO}`;
  }

  // Add size constraints - specify as TARGET to ensure AI uses the full size
  if (resolutionConfig) {
    prompt += `

TARGET SIZE (IMPORTANT - scale the model to fit these dimensions):
- Target width: ${resolutionConfig.maxWidth} studs (scale front view width to this)
- Target depth: ${resolutionConfig.maxDepth} studs (scale side view depth to this)
- Target height: ${resolutionConfig.maxHeight} plates (scale all views height to this)
- The silhouette should fill most of the target dimensions
- Position values should range from 0 to width-1 for front view, 0 to depth-1 for side view`;
  }

  // Add detail level
  prompt += '\n' + DETAIL_LEVEL_PROMPTS[detailLevel];

  return prompt;
}

