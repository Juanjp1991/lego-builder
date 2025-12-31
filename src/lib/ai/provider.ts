/**
 * AI Provider Configuration
 *
 * Centralizes AI model configuration using Vercel AI SDK.
 * ALWAYS use these exports - never call @google/genai directly.
 *
 * @see https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai
 */

import { google } from '@ai-sdk/google';

/**
 * Default model for text-to-model generation.
 * Gemini 2.5 Flash is fast and capable for MVP use cases.
 */
export const geminiFlash = google('gemini-2.5-flash');

/**
 * More capable model for complex operations (future use).
 */
export const geminiPro = google('gemini-2.5-pro');

/**
 * Model with thinking capabilities for complex code generation (future use).
 * Use for voxel scene generation where detailed reasoning is needed.
 */
export const geminiWithThinking = google('gemini-3-pro-preview');

/**
 * Image generation model for creating voxel concept images.
 * Uses Gemini 2.5 Flash Image - same API key, with image generation capability.
 * Cost: ~$0.04 per image (1290 output tokens at $30/million).
 *
 * @see https://developers.googleblog.com/en/introducing-gemini-2-5-flash-image/
 */
export const geminiFlashImage = google('gemini-2.5-flash-image');
