/**
 * Voxel Image Generation Prompts
 *
 * System prompts for generating voxel art images that can be
 * converted to LEGO models in the two-step pipeline.
 */

import type { VoxelStyle } from './types';
import { LEGO_COLOR_PALETTE } from './prompts';

/**
 * System prompt for voxel image generation.
 * Instructs Gemini 2.5 Flash Image to create LEGO-compatible voxel art.
 */
export const VOXEL_IMAGE_GENERATION_PROMPT = `You are a voxel art generator creating LEGO-compatible 3D concept images.

STYLE REQUIREMENTS (CRITICAL: CHUNKY & LOW-RES):
1. **LOW RESOLUTION GRID**: Imagine a coarse 32x32x32 grid. Do NOT create high-res details.
2. **BIG BLOCKS**: Use "Duplo-style" or "Chunky" voxels. Each block should be large and distinct.
3. **MINIMALISM**: Use the fewest number of blocks possible to convey the shape.
4. **CLEAN SURFACES**: Flat, solid colors. No noise, no gradients, no fine textures.
5. Render with sharp edges and clear ambient occlusion shadows to define block separation.
6. Object centered on light gray background.

STRUCTURAL REQUIREMENTS:
1. SOLID & HEAVY: Avoid thin, fragile parts. Use 2x2 or 3x3 block thickness minimum.
2. WIDE BASE: Ensure the object sits firmly on the ground.
3. CONNECTED: All parts must be physically attached (no floating pixels).

COLOR GUIDANCE:
Match colors to standard LEGO palette where possible:
${LEGO_COLOR_PALETTE}

Use contrasting colors for distinct features (e.g., eyes vs face).

CAMERA ANGLE:
- Isometric view (30-degree angle from horizontal)
- Show 3 faces of the model clearly
- Consistent lighting from upper-left

OUTPUT:
Generate a single, clean, low-resolution voxel art image. It should look like it was built with large plastic blocks.`;

/**
 * Style-specific modifiers for voxel generation.
 */
const STYLE_MODIFIERS: Record<VoxelStyle, string> = {
  minecraft: `
MINECRAFT STYLE SPECIFICS:
- "Big Block" aesthetic
- Visible grid lines between blocks
- Simple, solid colors (avoid noisy textures)
- Focus on the overall silhouette`,
  isometric: `
ISOMETRIC STYLE SPECIFICS:
- "Low Poly" / "MagicaVoxel" style
- Large, clean cubes
- Sharp geometric edges
- No micro-details
- Focus on clear readability of every single block`,
};

/**
 * Generates the complete user prompt for voxel image generation.
 *
 * @param userPrompt - The user's description of what to create
 * @param style - The voxel art style to use (default: 'isometric')
 * @returns Formatted prompt for image generation
 */
export function getVoxelUserPrompt(
  userPrompt: string,
  style: VoxelStyle = 'isometric'
): string {
  const styleModifier = STYLE_MODIFIERS[style];

  return `Create a voxel art image of: ${userPrompt}
${styleModifier}

IMPORTANT REMINDERS:
- Clear voxel/block structure must be visible
- LEGO-compatible proportions and stability
- Buildable design (no floating parts)
- Clean, professional render
- Centered composition on light gray background`;
}

/**
 * Validates if a prompt is suitable for voxel generation.
 *
 * @param prompt - The user prompt to validate
 * @returns Object with isValid boolean and optional error message
 */
export function validateVoxelPrompt(prompt: string): {
  isValid: boolean;
  error?: string;
} {
  const trimmed = prompt.trim();

  if (trimmed.length === 0) {
    return { isValid: false, error: 'Prompt cannot be empty' };
  }

  if (trimmed.length < 3) {
    return { isValid: false, error: 'Prompt is too short. Please describe what you want to build.' };
  }

  if (trimmed.length > 500) {
    return { isValid: false, error: 'Prompt is too long. Please keep it under 500 characters.' };
  }

  return { isValid: true };
}
