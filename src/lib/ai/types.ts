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
