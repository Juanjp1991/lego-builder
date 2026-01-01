/**
 * POST /api/generate-voxel-image
 *
 * Generates a voxel-style image from text description using Gemini 2.5 Flash Image.
 * This is the first step in the two-step voxel-to-LEGO pipeline.
 *
 * @see https://ai-sdk.dev/cookbook/guides/google-gemini-image-generation
 */

import { generateText } from 'ai';
import { geminiFlashImage, geminiWithThinking } from '@/lib/ai/provider';
import {
  VOXEL_IMAGE_GENERATION_PROMPT,
  getVoxelUserPrompt,
  validateVoxelPrompt,
} from '@/lib/ai/prompts-voxel';
import {
  checkRateLimit,
  getClientIP,
  getRetryAfterSeconds,
} from '@/lib/ai/rate-limiter';
import type {
  APIErrorResponse,
  GenerateVoxelImageRequestBody,
  GenerateVoxelImageResponse,
  VoxelStyle,
} from '@/lib/ai/types';

/** Allow up to 30 seconds for image generation */
export const maxDuration = 30;

/** Use Node.js runtime */
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
 * POST handler for voxel image generation.
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

    // Validate body structure
    if (!body || typeof body !== 'object') {
      return createErrorResponse(
        'INVALID_INPUT',
        'Request body is required',
        400
      );
    }

    const { prompt, style = 'isometric', model = 'flash-image' } = body as GenerateVoxelImageRequestBody;

    // Validate prompt
    if (!prompt || typeof prompt !== 'string') {
      return createErrorResponse(
        'INVALID_INPUT',
        'Prompt is required and must be a string',
        400
      );
    }

    const promptValidation = validateVoxelPrompt(prompt);
    if (!promptValidation.isValid) {
      return createErrorResponse(
        'INVALID_INPUT',
        promptValidation.error || 'Invalid prompt',
        400
      );
    }

    // Validate style
    const validStyles: VoxelStyle[] = ['minecraft', 'isometric'];
    if (!validStyles.includes(style)) {
      return createErrorResponse(
        'INVALID_INPUT',
        'Style must be "minecraft" or "isometric"',
        400
      );
    }

    // Build the user prompt with style modifications
    const userPrompt = getVoxelUserPrompt(prompt.trim(), style);

    console.log(`[generate-voxel-image] Generating voxel image for: "${prompt.trim()}" (style: ${style})`);

    // Generate image using requested model (defaults to Gemini 2.5 Flash Image)
    // The model returns images in result.files as Uint8Array
    const selectedModel = model === 'pro-3' ? geminiWithThinking : geminiFlashImage;

    const result = await generateText({
      model: selectedModel,
      system: VOXEL_IMAGE_GENERATION_PROMPT,
      prompt: userPrompt,
    });

    // Check if image was generated
    if (!result.files || result.files.length === 0) {
      console.error('[generate-voxel-image] No image generated in response');
      return createErrorResponse(
        'GENERATION_FAILED',
        'No image was generated. Please try a different prompt.',
        500
      );
    }

    // Find the first image file
    // GeneratedFile has: base64, uint8Array, mediaType
    const imageFile = result.files.find(file =>
      file.mediaType?.startsWith('image/')
    );

    if (!imageFile) {
      console.error('[generate-voxel-image] No image file in response files');
      return createErrorResponse(
        'GENERATION_FAILED',
        'No image was generated. Please try a different prompt.',
        500
      );
    }

    // Use the base64 property directly from GeneratedFile
    const base64Data = imageFile.base64;

    console.log(`[generate-voxel-image] Successfully generated voxel image (${Math.round(base64Data.length / 1024)}KB)`);

    // Return success response
    const response: GenerateVoxelImageResponse = {
      success: true,
      imageData: base64Data,
      mimeType: 'image/png',
      prompt: prompt.trim(),
    };

    return Response.json(response);
  } catch (error) {
    // Log detailed error server-side only
    console.error('[generate-voxel-image] Generation failed:', error);

    // Check for specific error types
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes('rate limit') || errorMsg.includes('quota') || errorMsg.includes('resource_exhausted')) {
        return createErrorResponse(
          'RATE_LIMITED',
          'Gemini API free tier limit reached. Wait 15 seconds or use regular "Text" mode.',
          429
        );
      }
    }

    // Return user-friendly error message
    return createErrorResponse(
      'GENERATION_FAILED',
      'Unable to generate voxel image. Please try again.',
      500
    );
  }
}
