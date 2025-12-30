/**
 * POST /api/generate
 *
 * Secure API route that proxies Gemini requests.
 * The API key is never exposed to the client.
 *
 * @see Story 2.1: Create Gemini API Proxy Route
 */

import { streamText } from 'ai';
import { geminiFlash } from '@/lib/ai/provider';
import { LEGO_GENERATION_SYSTEM_PROMPT, IMAGE_TO_LEGO_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import {
  checkRateLimit,
  getClientIP,
  getRetryAfterSeconds,
} from '@/lib/ai/rate-limiter';
import {
  type APIErrorResponse,
  type GenerateRequestBody,
  VALIDATION_CONSTRAINTS,
  SUPPORTED_IMAGE_TYPES,
} from '@/lib/ai/types';

/** Allow up to 60 seconds for AI generation (NFR1: <1 min) */
export const maxDuration = 60;

/** Use Node.js runtime for streaming support */
export const runtime = 'nodejs';

/**
 * Creates a standardized error response.
 */
function createErrorResponse(
  code: APIErrorResponse['error']['code'],
  message: string,
  status: number,
  headers?: HeadersInit
): Response {
  const body: APIErrorResponse = {
    success: false,
    error: { code, message },
  };
  return Response.json(body, { status, headers });
}

/**
 * Validates the request body.
 * Returns null if valid, or an error Response if invalid.
 */
function validateRequest(body: unknown): Response | null {
  // Check if body exists and is an object
  if (!body || typeof body !== 'object') {
    return createErrorResponse(
      'INVALID_INPUT',
      'Request body is required',
      400
    );
  }

  const { prompt } = body as GenerateRequestBody;

  // Check if prompt exists
  if (prompt === undefined || prompt === null) {
    return createErrorResponse(
      'INVALID_INPUT',
      'Prompt is required',
      400
    );
  }

  // Check if prompt is a string
  if (typeof prompt !== 'string') {
    return createErrorResponse(
      'INVALID_INPUT',
      'Prompt must be a string',
      400
    );
  }

  // Check for empty or whitespace-only prompt
  const trimmedPrompt = prompt.trim();
  if (trimmedPrompt.length < VALIDATION_CONSTRAINTS.MIN_PROMPT_LENGTH) {
    return createErrorResponse(
      'INVALID_INPUT',
      'Prompt cannot be empty',
      400
    );
  }

  // Check prompt length
  if (trimmedPrompt.length > VALIDATION_CONSTRAINTS.MAX_PROMPT_LENGTH) {
    return createErrorResponse(
      'INVALID_INPUT',
      `Prompt too long (max ${VALIDATION_CONSTRAINTS.MAX_PROMPT_LENGTH} characters)`,
      400
    );
  }

  return null;
}

/**
 * POST handler for model generation.
 */
export async function POST(req: Request): Promise<Response> {
  // Rate limiting check
  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP)) {
    const retryAfter = getRetryAfterSeconds(clientIP);
    return createErrorResponse(
      'RATE_LIMITED',
      'Too many requests. Please try again later.',
      429,
      { 'Retry-After': String(retryAfter || 60) }
    );
  }

  try {
    // Parse request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse(
        'INVALID_INPUT',
        'Invalid JSON in request body',
        400
      );
    }

    // Validate request
    const validationError = validateRequest(body);
    if (validationError) {
      return validationError;
    }

    const { prompt, imageData, mimeType } = body as GenerateRequestBody;
    const trimmedPrompt = prompt.trim();

    // Validate image data if provided
    if (imageData) {
      // Validate mimeType is provided and supported
      if (!mimeType) {
        return createErrorResponse(
          'INVALID_INPUT',
          'mimeType is required when imageData is provided',
          400
        );
      }
      if (!SUPPORTED_IMAGE_TYPES.includes(mimeType as typeof SUPPORTED_IMAGE_TYPES[number])) {
        return createErrorResponse(
          'INVALID_INPUT',
          'Unsupported image type. Please use PNG, JPEG, WEBP, or HEIC.',
          400
        );
      }
      // Validate imageData size (max ~13.3MB base64 = 10MB raw)
      const MAX_IMAGE_DATA_SIZE = 14 * 1024 * 1024; // ~14MB base64
      if (imageData.length > MAX_IMAGE_DATA_SIZE) {
        return createErrorResponse(
          'INVALID_INPUT',
          'Image too large. Please use an image smaller than 10MB.',
          400
        );
      }
    }

    // Determine if this is image-based generation
    const isImageGeneration = Boolean(imageData);

    // Build messages array for streamText
    // Supports both text-only and text+image inputs (AC #5)
    const messages: Array<{ role: 'user'; content: Array<{ type: 'text'; text: string } | { type: 'image'; image: string; mimeType?: string }> }> = [
      {
        role: 'user',
        content: imageData
          ? [
              { type: 'image', image: imageData, ...(mimeType && { mimeType }) },
              { type: 'text', text: trimmedPrompt },
            ]
          : [{ type: 'text', text: trimmedPrompt }],
      },
    ];

    // Use IMAGE_TO_LEGO prompt for image-based generation (Story 2.3)
    const systemPrompt = isImageGeneration
      ? IMAGE_TO_LEGO_SYSTEM_PROMPT
      : LEGO_GENERATION_SYSTEM_PROMPT;

    // Generate with streaming using Vercel AI SDK
    const result = await streamText({
      model: geminiFlash,
      system: systemPrompt,
      messages,
    });

    // Return streaming response
    return result.toTextStreamResponse();
  } catch (error) {
    // Log detailed error server-side only
    console.error('Generation failed:', error);

    // Return user-friendly error message
    return createErrorResponse(
      'GENERATION_FAILED',
      'Unable to generate model. Please try again.',
      500
    );
  }
}
