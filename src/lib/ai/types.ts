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
 * Request body for the /api/generate endpoint.
 */
export interface GenerateRequestBody {
  prompt: string;
  /** Optional: image data as base64 string (for future image-to-model) */
  imageData?: string;
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
