/**
 * POST /api/generate
 *
 * Generates a LEGO model from text description and/or image.
 * Supports multiple AI models and handles streaming responses.
 */

import { streamText } from 'ai';
import {
  geminiFlash,
  geminiFlashImage,
  geminiPro,
} from '@/lib/ai/provider';
import { getImageSystemPrompt, getSystemPrompt } from '@/lib/ai/prompts';
import { generateContentStreamV3 } from '@/lib/ai/gemini-v3';
import {
  checkRateLimit,
  getClientIP,
  getRetryAfterSeconds,
} from '@/lib/ai/rate-limiter';
import type {
  APIErrorResponse,
  GenerateRequestBody,
} from '@/lib/ai/types';

/** Allow up to 60 seconds for complex model generation */
export const maxDuration = 60;

/** Use Node.js runtime for image processing and AI SDK */
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

    // Validate body structure
    if (!body || typeof body !== 'object') {
      return createErrorResponse(
        'INVALID_INPUT',
        'Request body is required',
        400
      );
    }

    const {
      prompt,
      imageData,
      mimeType,
      model = 'flash',
      isFirstBuild = false,
    } = body as GenerateRequestBody;

    // Validate prompt
    if (!prompt || typeof prompt !== 'string') {
      return createErrorResponse(
        'INVALID_INPUT',
        'Prompt is required and must be a string',
        400
      );
    }

    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length === 0) {
      return createErrorResponse(
        'INVALID_INPUT',
        'Prompt cannot be empty',
        400
      );
    }

    // Build system prompt based on whether image is provided
    const { systemPrompt, category } = imageData && mimeType
      ? getImageSystemPrompt({ isFirstBuild, userPrompt: trimmedPrompt })
      : getSystemPrompt({ isFirstBuild, userPrompt: trimmedPrompt });

    // Log detected category for analytics/debugging
    console.log(`[generate] Detected category: ${category}`);

    // Generate with hybrid algorithm for pro-3 with image
    if (model === 'pro-3' && imageData) {
      console.log('[generate] Using hybrid voxel-to-brick algorithm');

      // Import algorithm functions
      const { convertVoxelsToBricks } = await import('@/lib/lego/voxel-to-brick');
      const { generateHTMLFromBricks, parseVoxelJSON } = await import('@/lib/lego/brick-to-html');

      // Step 1: Get JSON voxel grid from Gemini 3.0
      const jsonResponse = await generateContentStreamV3(trimmedPrompt, systemPrompt, imageData, mimeType);

      // Read entire JSON stream
      const reader = jsonResponse.getReader();
      const decoder = new TextDecoder();
      let jsonString = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        jsonString += decoder.decode(value, { stream: true });
      }
      jsonString += decoder.decode();

      console.log('[generate] Received JSON (length):', jsonString.length);

      // Step 2: Parse JSON to voxels
      const voxelData = parseVoxelJSON(jsonString);
      if (!voxelData || !voxelData.voxels || voxelData.voxels.length === 0) {
        console.error('[generate] Parsing failed');
        throw new Error('Could not parse voxel data');
      }

      console.log(`[generate] Parsed ${voxelData.voxels.length} voxels`);

      // Step 3: Convert voxels to bricks
      const bricks = convertVoxelsToBricks(voxelData.voxels);
      console.log(`[generate] Generated ${bricks.length} bricks`);

      // Step 4: Generate HTML
      const html = generateHTMLFromBricks(bricks);

      // Return as stream
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(html));
          controller.close();
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Vercel-AI-Data-Stream': 'v1'
        }
      });
    } else if (model === 'pro-3') {
      const stream = await generateContentStreamV3(trimmedPrompt, systemPrompt, imageData, mimeType);
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Vercel-AI-Data-Stream': 'v1'
        }
      });
    } else {
      // Use Vercel AI SDK for other models
      const models: Record<string, typeof geminiFlash> = {
        flash: geminiFlash,
        'flash-image': geminiFlashImage,
        pro: geminiPro,
        'pro-3': geminiPro,
      };

      const selectedModel = models[model] || geminiFlash;

      const messages: Array<{ role: 'user'; content: any }> = [
        {
          role: 'user',
          content: imageData && mimeType
            ? [
              { type: 'text', text: trimmedPrompt },
              { type: 'image', image: imageData, mimeType },
            ]
            : trimmedPrompt,
        },
      ];

      const result = await streamText({
        model: selectedModel,
        system: systemPrompt,
        messages,
      });

      return result.toTextStreamResponse();
    }
  } catch (error) {
    console.error('[generate] Generation failed:', error);

    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes('rate limit') || errorMsg.includes('quota') || errorMsg.includes('resource_exhausted')) {
        return createErrorResponse(
          'RATE_LIMITED',
          'AI service is busy. Please wait a moment and try again.',
          429
        );
      }
    }

    return createErrorResponse(
      'GENERATION_FAILED',
      'Unable to generate model. Please try again.',
      500
    );
  }
}
