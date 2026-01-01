/**
 * AI Module Type Definitions
 */

/**
 * Error codes used by AI-related API routes.
 * Must match the project's standardized error response format.
 */
export type AIErrorCode =
  | 'GENERATION_FAILED'
  | 'INVALID_INPUT'
  | 'RATE_LIMITED';

/**
 * Standardized API error response format.
 */
export interface APIErrorResponse {
  success: false;
  error: {
    code: AIErrorCode;
    message: string;
  };
}

/**
 * Supported image MIME types for image-to-Lego generation.
 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
] as const;

export type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

/**
 * Available AI models for generation.
 * - flash: Fast, cost-effective (gemini-2.5-flash)
 * - pro: More capable, slower (gemini-2.5-pro)
 * - pro-3: Top-tier model with thinking capabilities (gemini-2.5-pro)
 * - flash-image: Image generation (gemini-2.5-flash-image)
 */
export type AIModel = 'flash' | 'pro' | 'pro-3' | 'flash-image';

/**
 * Voxel art style options for image generation.
 * - minecraft: Blocky Minecraft-style with 16x16 textures
 * - isometric: Clean isometric voxel art (default)
 */
export type VoxelStyle = 'minecraft' | 'isometric';

/**
 * Pipeline step identifier for error tracking in two-step generation.
 */
export type PipelineStep = 'voxel-generation' | 'lego-generation';

/**
 * Request body for the /api/generate endpoint.
 */
export interface GenerateRequestBody {
  /** Text prompt describing what to build (required for text mode, optional for image mode) */
  prompt: string;
  /** Optional: image data as base64 string (for image-to-model) */
  imageData?: string;
  /** Optional: MIME type of the image (required when imageData is provided) */
  mimeType?: SupportedImageType;
  /** Optional: Whether this is a first-build (simple mode) generation. Default: false */
  isFirstBuild?: boolean;
  /** Optional: Which AI model to use. Default: 'flash' */
  model?: AIModel;
}


/**
 * Input validation constraints.
 */
export const VALIDATION_CONSTRAINTS = {
  /** Maximum prompt length in characters */
  MAX_PROMPT_LENGTH: 1000,
  /** Minimum prompt length in characters */
  MIN_PROMPT_LENGTH: 1,
} as const;

/**
 * Request body for the /api/generate-voxel-image endpoint.
 */
export interface GenerateVoxelImageRequestBody {
  /** Text prompt describing what to create as voxel art */
  prompt: string;
  /** Optional: Voxel art style preference. Default: 'isometric' */
  style?: VoxelStyle;
  /** Optional: Which AI model to use. Default: 'flash-image' */
  model?: AIModel;
}

/**
 * Success response from voxel image generation.
 */
export interface GenerateVoxelImageResponse {
  success: true;
  /** Base64 encoded PNG image data */
  imageData: string;
  /** MIME type of the generated image */
  mimeType: 'image/png';
  /** Echo of the original prompt for UI display */
  prompt: string;
}

/**
 * LEGO build categories for specialized guidelines.
 * Re-exported from categories module for convenience.
 */
export type { LegoCategory } from './categories';
