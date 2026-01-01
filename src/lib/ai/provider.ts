/**
 * AI Provider Configuration
 *
 * Centralizes AI model configuration using Vercel AI SDK with Google AI Studio.
 * Uses the latest stable Gemini 2.5 models (June 2025).
 *
 * Required environment variables:
 * - GOOGLE_GENERATIVE_AI_API_KEY: Your Google AI Studio API key
 *
 * Get your API key from: https://aistudio.google.com/apikey
 *
 * @see https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai
 */

import { google } from '@ai-sdk/google';

/**
 * Default model for text-to-model generation.
 * Gemini 2.5 Flash - latest stable mid-size multimodal model (June 2025).
 * Supports up to 1 million tokens with thinking capabilities.
 */
export const geminiFlash = google('gemini-2.5-flash');

/**
 * More capable model for complex operations.
 * Gemini 2.5 Pro - latest stable large multimodal model (June 2025).
 */
export const geminiPro = google('gemini-2.5-pro');

/**
 * Model with thinking capabilities for complex code generation.
 * Uses Gemini 2.5 Pro for advanced reasoning.
 */
export const geminiWithThinking = google('gemini-2.5-pro');

/**
 * Image generation model for creating voxel concept images.
 * Uses Gemini 2.5 Flash Image for high-quality image generation.
 */
export const geminiFlashImage = google('gemini-2.5-flash-image');

