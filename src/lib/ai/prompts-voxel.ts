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

STYLE REQUIREMENTS:
1. Create isometric voxel art in a clean, Minecraft-inspired aesthetic
2. Use a limited color palette (8-12 distinct colors maximum)
3. Each voxel should be clearly visible as a discrete cube
4. Render at high resolution (1024x1024) with sharp edges
5. Include soft ambient occlusion shadows for depth
6. Use a neutral light gray gradient background
7. Object should be centered and fill ~70% of the frame

STRUCTURAL REQUIREMENTS:
1. Design for LEGO buildability - avoid thin single-voxel features
2. Ensure stable base (wider at bottom than top)
3. No floating elements or impossible overhangs
4. Minimum 2-3 voxels wide for structural parts
5. Keep proportions realistic and buildable
6. Build from the ground up - all parts must connect

COLOR GUIDANCE:
Match colors to standard LEGO palette where possible:
${LEGO_COLOR_PALETTE}

Use contrasting colors for distinct features (e.g., eyes vs face).

CAMERA ANGLE:
- Isometric view (30-degree angle from horizontal)
- Show 3 faces of the model clearly
- Consistent lighting from upper-left

OUTPUT:
Generate a single, clean voxel art image that can be directly used as reference for LEGO model generation.`;

/**
 * Style-specific modifiers for voxel generation.
 */
const STYLE_MODIFIERS: Record<VoxelStyle, string> = {
  minecraft: `
MINECRAFT STYLE SPECIFICS:
- Use 16x16 pixel texture-like surfaces on each voxel
- Blocky, cubic aesthetic with visible grid lines
- Colors should be slightly muted/earthy like Minecraft blocks
- Include subtle texture variation within color blocks`,
  isometric: `
ISOMETRIC STYLE SPECIFICS:
- Clean, modern voxel aesthetic
- Smooth, solid colors without texture
- Precise geometric edges
- Professional 3D render quality
- Subtle edge highlighting`,
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
