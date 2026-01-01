'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { LoadingPhase } from '@/types/loading';
import { MAX_RETRIES } from '@/lib/constants';
import {
  parseStructuralAnalysis,
  extractCleanHtml,
} from '@/lib/ai/parse-structural-analysis';
import type { StructuralAnalysisResult } from '@/lib/ai/structural-analysis';
import type { VoxelStyle, GenerateVoxelImageResponse, AIModel } from '@/lib/ai/types';

/**
 * Two-step pipeline status
 */
export type VoxelPipelineStatus =
  | 'idle'
  | 'generating-voxel'
  | 'awaiting-approval'
  | 'generating-lego'
  | 'success'
  | 'error';

/**
 * Loading phases for two-step pipeline
 */
export type VoxelLoadingPhase =
  | 'imagining-voxel'
  | 'imagining-lego'
  | 'finding-bricks'
  | 'building';

/**
 * Voxel image data structure
 */
export interface VoxelImageData {
  /** Base64 encoded image data */
  data: string;
  /** MIME type of the image */
  mimeType: 'image/png';
  /** Blob URL for display */
  previewUrl: string;
  /** Original prompt used */
  prompt: string;
}

/**
 * Error messages for the two-step pipeline
 */
const ERROR_MESSAGES: Record<string, string> = {
  GENERATION_FAILED: "Couldn't create your design. Want to try again?",
  INVALID_INPUT: "Please enter a description of what you'd like to build.",
  RATE_LIMITED: "Gemini API limit reached. Wait 15 seconds or try 'Text' mode.",
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
  DEFAULT: 'Something went wrong. Please try again.',
};

/**
 * Phase transition timing for two-step pipeline
 */
const PHASE_TIMINGS = {
  voxelImagining: 5000, // Voxel generation takes longer
  legoImaginingToFinding: 3000,
  findingToBuilding: 5000,
} as const;

/**
 * Return type for useTextToVoxelModel hook
 */
export interface UseTextToVoxelModelReturn {
  /** Current pipeline status */
  status: VoxelPipelineStatus;
  /** Current loading phase */
  phase: VoxelLoadingPhase | LoadingPhase | null;
  /** Generated voxel image (after step 1) */
  voxelImage: VoxelImageData | null;
  /** Generated LEGO HTML (after step 2) */
  generatedHtml: string | null;
  /** Error message */
  error: string | null;
  /** Error code */
  errorCode: string | null;
  /** Which step failed ('voxel' or 'lego') */
  errorStep: 'voxel' | 'lego' | null;
  /** Start voxel generation */
  generateVoxel: (prompt: string, style?: VoxelStyle, model?: AIModel) => Promise<void>;
  /** Approve voxel and proceed to LEGO generation */
  approveVoxel: (isFirstBuild?: boolean) => Promise<void>;
  /** Regenerate voxel with same prompt */
  regenerateVoxel: () => Promise<void>;
  /** Regenerate voxel with new prompt */
  editVoxelPrompt: (newPrompt: string, style?: VoxelStyle, model?: AIModel) => Promise<void>;
  /** Reset to idle state */
  reset: () => void;
  /** Generation duration in ms */
  duration: number | null;
  /** Retry count for voxel step */
  voxelRetryCount: number;
  /** Retry count for LEGO step */
  legoRetryCount: number;
  /** Whether voxel retry is available */
  isVoxelRetryAvailable: boolean;
  /** Whether LEGO retry is available */
  isLegoRetryAvailable: boolean;
  /** Retry LEGO generation with same voxel */
  retryLego: () => Promise<void>;
  /** Structural analysis result */
  structuralAnalysis: StructuralAnalysisResult | null;
  /** Last prompt used */
  lastPrompt: string | null;
  /** Last style used */
  lastStyle: VoxelStyle;
}

/**
 * useTextToVoxelModel Hook
 *
 * Manages two-step text-to-voxel-to-LEGO generation pipeline.
 * Step 1: Generate voxel image from text
 * Step 2: Convert voxel image to LEGO model
 *
 * @example
 * ```tsx
 * const { status, voxelImage, generatedHtml, generateVoxel, approveVoxel } = useTextToVoxelModel();
 *
 * // Step 1: Generate voxel image
 * await generateVoxel("a red race car");
 *
 * // Wait for user approval (status === 'awaiting-approval')
 *
 * // Step 2: Approve and generate LEGO
 * await approveVoxel();
 * ```
 */
export function useTextToVoxelModel(): UseTextToVoxelModelReturn {
  const [status, setStatus] = useState<VoxelPipelineStatus>('idle');
  const [phase, setPhase] = useState<VoxelLoadingPhase | LoadingPhase | null>(null);
  const [voxelImage, setVoxelImage] = useState<VoxelImageData | null>(null);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorStep, setErrorStep] = useState<'voxel' | 'lego' | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [voxelRetryCount, setVoxelRetryCount] = useState(0);
  const [legoRetryCount, setLegoRetryCount] = useState(0);
  const [structuralAnalysis, setStructuralAnalysis] = useState<StructuralAnalysisResult | null>(null);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const phaseTimersRef = useRef<NodeJS.Timeout[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const lastPromptRef = useRef<string | null>(null);
  const lastStyleRef = useRef<VoxelStyle>('isometric');
  const lastModelRef = useRef<AIModel>('flash-image');
  const lastIsFirstBuildRef = useRef<boolean>(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      phaseTimersRef.current.forEach((timer) => clearTimeout(timer));
      // Revoke any blob URLs
      if (voxelImage?.previewUrl) {
        URL.revokeObjectURL(voxelImage.previewUrl);
      }
    };
  }, [voxelImage?.previewUrl]);

  const clearPhaseTimers = useCallback(() => {
    phaseTimersRef.current.forEach((timer) => clearTimeout(timer));
    phaseTimersRef.current = [];
  }, []);

  const parseError = useCallback(async (response: Response): Promise<{ code: string; message: string }> => {
    try {
      const data = await response.json();
      const code = data?.error?.code || 'DEFAULT';
      const message = ERROR_MESSAGES[code] || ERROR_MESSAGES.DEFAULT;
      return { code, message };
    } catch {
      return { code: 'DEFAULT', message: ERROR_MESSAGES.DEFAULT };
    }
  }, []);

  /**
   * Step 1: Generate voxel image from text
   */
  const generateVoxel = useCallback(async (prompt: string, style: VoxelStyle = 'isometric', model: AIModel = 'flash-image'): Promise<void> => {
    // Cancel any in-progress request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Revoke previous blob URL
    if (voxelImage?.previewUrl) {
      URL.revokeObjectURL(voxelImage.previewUrl);
    }

    // Store prompt, style, and model
    lastPromptRef.current = prompt;
    lastStyleRef.current = style;
    lastModelRef.current = model;
    setVoxelRetryCount(0);
    setLegoRetryCount(0);

    // Clear previous state
    clearPhaseTimers();
    setError(null);
    setErrorCode(null);
    setErrorStep(null);
    setVoxelImage(null);
    setGeneratedHtml(null);
    setStructuralAnalysis(null);
    setDuration(null);

    // Start voxel generation
    setStatus('generating-voxel');
    setPhase('imagining-voxel');
    startTimeRef.current = Date.now();

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/generate-voxel-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style, model }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const { code, message } = await parseError(response);
        throw new Error(message, { cause: code });
      }

      const data: GenerateVoxelImageResponse = await response.json();

      if (!data.success || !data.imageData) {
        throw new Error(ERROR_MESSAGES.GENERATION_FAILED, { cause: 'GENERATION_FAILED' });
      }

      // Create blob URL for preview
      const binaryData = Uint8Array.from(atob(data.imageData), c => c.charCodeAt(0));
      const blob = new Blob([binaryData], { type: 'image/png' });
      const previewUrl = URL.createObjectURL(blob);

      clearPhaseTimers();
      setVoxelImage({
        data: data.imageData,
        mimeType: 'image/png',
        previewUrl,
        prompt: data.prompt,
      });
      setStatus('awaiting-approval');
      setPhase(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled
      }

      clearPhaseTimers();
      setStatus('error');
      setPhase(null);
      setErrorStep('voxel');
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.DEFAULT);
      setErrorCode(err instanceof Error ? (err.cause as string) || 'DEFAULT' : 'DEFAULT');
    }
  }, [voxelImage?.previewUrl, clearPhaseTimers, parseError]);

  /**
   * Step 2: Approve voxel and generate LEGO model
   */
  const approveVoxel = useCallback(async (isFirstBuild: boolean = false): Promise<void> => {
    if (!voxelImage) {
      setError('No voxel image to approve');
      setStatus('error');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    lastIsFirstBuildRef.current = isFirstBuild;

    // Clear previous LEGO state
    clearPhaseTimers();
    setError(null);
    setErrorCode(null);
    setErrorStep(null);
    setGeneratedHtml(null);
    setStructuralAnalysis(null);

    // Start LEGO generation
    setStatus('generating-lego');
    setPhase('imagining-lego');

    // Set up phase transitions for LEGO generation
    const findingTimer = setTimeout(() => {
      setPhase('finding-bricks');
    }, PHASE_TIMINGS.legoImaginingToFinding);

    const buildingTimer = setTimeout(() => {
      setPhase('building');
    }, PHASE_TIMINGS.legoImaginingToFinding + PHASE_TIMINGS.findingToBuilding);

    phaseTimersRef.current = [findingTimer, buildingTimer];

    abortControllerRef.current = new AbortController();

    try {
      // Use the existing /api/generate endpoint with the voxel image
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Create a LEGO model based on this voxel art image of: ${voxelImage.prompt}`,
          imageData: voxelImage.data,
          mimeType: voxelImage.mimeType,
          isFirstBuild,
          model: 'pro-3', // Use Gemini 3.0 Pro for higher quality LEGO conversion
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const { code, message } = await parseError(response);
        throw new Error(message, { cause: code });
      }

      // Read streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error(ERROR_MESSAGES.DEFAULT, { cause: 'NO_BODY' });
      }

      const decoder = new TextDecoder();
      let html = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
      }
      html += decoder.decode();

      // Clean up markdown code blocks
      const cleanHtml = html.replace(/^```html\s*/i, '').replace(/```\s*$/, '').trim();

      // Calculate duration
      const endTime = Date.now();
      const generationDuration = startTimeRef.current ? endTime - startTimeRef.current : null;

      clearPhaseTimers();

      // Parse structural analysis
      const analysis = parseStructuralAnalysis(cleanHtml);
      setStructuralAnalysis(analysis);

      // Strip analysis comment for rendering
      const finalHtml = extractCleanHtml(cleanHtml);

      // Success
      setGeneratedHtml(finalHtml);
      setDuration(generationDuration);
      setStatus('success');
      setPhase(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      clearPhaseTimers();
      setStatus('error');
      setPhase(null);
      setErrorStep('lego');
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.DEFAULT);
      setErrorCode(err instanceof Error ? (err.cause as string) || 'DEFAULT' : 'DEFAULT');
    }
  }, [voxelImage, clearPhaseTimers, parseError]);

  /**
   * Regenerate voxel with same prompt
   */
  const regenerateVoxel = useCallback(async (): Promise<void> => {
    if (!lastPromptRef.current) return;
    setVoxelRetryCount((prev) => prev + 1);
    await generateVoxel(lastPromptRef.current, lastStyleRef.current, lastModelRef.current);
  }, [generateVoxel]);

  /**
   * Edit prompt and regenerate voxel
   */
  const editVoxelPrompt = useCallback(async (newPrompt: string, style?: VoxelStyle, model?: AIModel): Promise<void> => {
    await generateVoxel(newPrompt, style || lastStyleRef.current, model || lastModelRef.current);
  }, [generateVoxel]);

  /**
   * Retry LEGO generation with same voxel
   */
  const retryLego = useCallback(async (): Promise<void> => {
    if (!voxelImage) return;
    setLegoRetryCount((prev) => prev + 1);
    await approveVoxel(lastIsFirstBuildRef.current);
  }, [voxelImage, approveVoxel]);

  /**
   * Reset to idle state
   */
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    clearPhaseTimers();

    // Revoke blob URL
    if (voxelImage?.previewUrl) {
      URL.revokeObjectURL(voxelImage.previewUrl);
    }

    setStatus('idle');
    setPhase(null);
    setVoxelImage(null);
    setGeneratedHtml(null);
    setError(null);
    setErrorCode(null);
    setErrorStep(null);
    setDuration(null);
    setVoxelRetryCount(0);
    setLegoRetryCount(0);
    setStructuralAnalysis(null);
    lastPromptRef.current = null;
  }, [voxelImage?.previewUrl, clearPhaseTimers]);

  return {
    status,
    phase,
    voxelImage,
    generatedHtml,
    error,
    errorCode,
    errorStep,
    generateVoxel,
    approveVoxel,
    regenerateVoxel,
    editVoxelPrompt,
    reset,
    duration,
    voxelRetryCount,
    legoRetryCount,
    isVoxelRetryAvailable: voxelRetryCount < MAX_RETRIES,
    isLegoRetryAvailable: legoRetryCount < MAX_RETRIES && voxelImage !== null,
    retryLego,
    structuralAnalysis,
    lastPrompt: lastPromptRef.current,
    lastStyle: lastStyleRef.current,
  };
}
