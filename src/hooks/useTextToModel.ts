'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { LoadingPhase } from '@/types/loading';
import { MAX_RETRIES } from '@/lib/constants';
import {
    parseStructuralAnalysis,
    extractCleanHtml,
} from '@/lib/ai/parse-structural-analysis';
import type { StructuralAnalysisResult } from '@/lib/ai/structural-analysis';
import type { AIModel } from '@/lib/ai/types';

/**
 * Generation status state machine
 */
export type GenerationStatus = 'idle' | 'generating' | 'success' | 'error';

/**
 * User-friendly error messages for different error codes
 */
const ERROR_MESSAGES: Record<string, string> = {
    GENERATION_FAILED: "Couldn't create your design. Want to try again?",
    INVALID_INPUT: 'Please enter a description of what you\'d like to build.',
    RATE_LIMITED: "You're creating too fast! Please wait a moment.",
    NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
    DEFAULT: 'Something went wrong. Please try again.',
};

/**
 * Phase transition timing (matches GENERATION_STAGES)
 */
const PHASE_TIMINGS = {
    imaginingToFinding: 3000,
    findingToBuilding: 5000,
} as const;

/**
 * Return type for useTextToModel hook
 */
export interface UseTextToModelReturn {
    /** Current generation status */
    status: GenerationStatus;
    /** Current progress phase (for storytelling) */
    phase: LoadingPhase | null;
    /** Generated HTML scene (when successful) */
    generatedHtml: string | null;
    /** Error message (when failed) */
    error: string | null;
    /** Error code for programmatic handling */
    errorCode: string | null;
    /** Start generation from prompt */
    generate: (prompt: string, isFirstBuild?: boolean, model?: AIModel) => Promise<void>;
    /** Reset to idle state (clears retry count) */
    reset: () => void;
    /** Generation duration in ms (for NFR1 tracking) */
    duration: number | null;
    /** Current retry count (0 = first attempt, 1 = first retry, etc.) */
    retryCount: number;
    /** Whether retry is available (success state and retries not exhausted) */
    isRetryAvailable: boolean;
    /** Whether retry limit has been reached */
    isRetryExhausted: boolean;
    /** Retry with the same prompt */
    retry: () => void;
    /** Structural analysis result from AI (Story 2.6) */
    structuralAnalysis: StructuralAnalysisResult | null;
    /** Last prompt used for generation (for stability regeneration) */
    lastPrompt: string | null;
}

/**
 * useTextToModel Hook
 * 
 * Manages text-to-Lego model generation lifecycle.
 * Uses state machine pattern: idle → generating → success | error
 * 
 * @example
 * ```tsx
 * const { status, phase, generatedHtml, error, generate, reset } = useTextToModel();
 * 
 * // Start generation
 * await generate("dragon");
 * 
 * // Check status
 * if (status === 'success') {
 *   // Use generatedHtml in ModelViewer
 * }
 * ```
 */
export function useTextToModel(): UseTextToModelReturn {
    const [status, setStatus] = useState<GenerationStatus>('idle');
    const [phase, setPhase] = useState<LoadingPhase | null>(null);
    const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const [duration, setDuration] = useState<number | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [structuralAnalysis, setStructuralAnalysis] = useState<StructuralAnalysisResult | null>(null);

    // Refs for cleanup
    const phaseTimersRef = useRef<NodeJS.Timeout[]>([]);
    const abortControllerRef = useRef<AbortController | null>(null);
    const startTimeRef = useRef<number | null>(null);
    // Store last prompt and first-build state for retry capability
    const lastPromptRef = useRef<string | null>(null);
    const lastIsFirstBuildRef = useRef<boolean>(false);
    const lastModelRef = useRef<AIModel>('flash');

    /**
     * Cleanup on unmount - abort any pending requests and clear timers
     */
    useEffect(() => {
        return () => {
            // Abort any in-progress request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            // Clear any pending phase timers
            phaseTimersRef.current.forEach((timer) => clearTimeout(timer));
            phaseTimersRef.current = [];
        };
    }, []);

    /**
     * Clear all phase transition timers
     */
    const clearPhaseTimers = useCallback(() => {
        phaseTimersRef.current.forEach((timer) => clearTimeout(timer));
        phaseTimersRef.current = [];
    }, []);

    /**
     * Start phase transitions for progress storytelling
     */
    const startPhaseTransitions = useCallback(() => {
        setPhase('imagining');

        const findingTimer = setTimeout(() => {
            setPhase('finding');
        }, PHASE_TIMINGS.imaginingToFinding);

        const buildingTimer = setTimeout(() => {
            setPhase('building');
        }, PHASE_TIMINGS.imaginingToFinding + PHASE_TIMINGS.findingToBuilding);

        phaseTimersRef.current = [findingTimer, buildingTimer];
    }, []);

    /**
     * Parse error response and return user-friendly message
     */
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
     * Internal generate function that handles both new prompts and retries
     */
    const generateInternal = useCallback(async (prompt: string, isFirstBuild: boolean, isRetry: boolean, model: AIModel = 'flash'): Promise<void> => {
        // Cancel any in-progress generation
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // If this is a NEW prompt (not retry), reset counter and store prompt
        if (!isRetry) {
            setRetryCount(0);
            lastPromptRef.current = prompt;
            lastIsFirstBuildRef.current = isFirstBuild;
            lastModelRef.current = model;
        } else {
            // For retries, increment the count
            setRetryCount((prev) => prev + 1);
        }

        // Clear previous state
        clearPhaseTimers();
        setError(null);
        setErrorCode(null);
        setGeneratedHtml(null);
        setDuration(null);

        // Start generation
        setStatus('generating');
        startPhaseTransitions();
        startTimeRef.current = Date.now();

        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, isFirstBuild, model }),
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

            // Finalize decoder
            html += decoder.decode();

            // Clean up markdown code blocks if present (fixes "'''html" artifacts)
            // Remove ```html at start and ``` at end
            const cleanHtml = html.replace(/^```html\s*/i, '').replace(/```\s*$/, '').trim();

            // Calculate duration
            const endTime = Date.now();
            const generationDuration = startTimeRef.current ? endTime - startTimeRef.current : null;

            // Clear phase timers before setting success state
            clearPhaseTimers();

            // Parse structural analysis from AI response (Story 2.6)
            const analysis = parseStructuralAnalysis(cleanHtml);
            setStructuralAnalysis(analysis);

            // Strip analysis comment for rendering to avoid script errors
            const finalHtml = extractCleanHtml(cleanHtml);

            // Success
            setGeneratedHtml(finalHtml);
            setDuration(generationDuration);
            setStatus('success');
            setPhase(null);

        } catch (err) {
            // Clear phase timers on error
            clearPhaseTimers();

            // Handle abort
            if (err instanceof Error && err.name === 'AbortError') {
                // Request was cancelled, don't set error state
                setStatus('idle');
                setPhase(null);
                return;
            }

            // Handle other errors
            const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.DEFAULT;
            const code = (err instanceof Error && err.cause) ? String(err.cause) : 'UNKNOWN';

            // Log technical details for debugging
            console.error('[useTextToModel] Generation failed:', err);

            setError(errorMessage);
            setErrorCode(code);
            setStatus('error');
            setPhase(null);
        }
    }, [clearPhaseTimers, startPhaseTransitions, parseError]);

    /**
     * Generate model from text prompt (public API)
     * Resets retry count for new prompts
     * @param prompt - Text description of what to build
     * @param isFirstBuild - Whether to use simple mode (First-Build Guarantee)
     * @param model - Which AI model to use (flash or pro)
     */
    const generate = useCallback(async (prompt: string, isFirstBuild: boolean = false, model: AIModel = 'flash'): Promise<void> => {
        await generateInternal(prompt, isFirstBuild, false, model);
    }, [generateInternal]);

    /**
     * Retry with the same prompt
     * Only works if a previous prompt was stored and retries are available
     */
    const retry = useCallback(() => {
        if (lastPromptRef.current && retryCount < MAX_RETRIES) {
            generateInternal(lastPromptRef.current, lastIsFirstBuildRef.current, true, lastModelRef.current);
        }
    }, [generateInternal, retryCount]);

    /**
     * Reset to idle state (clears retry count)
     */
    const reset = useCallback(() => {
        // Abort any in-progress request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        clearPhaseTimers();
        setStatus('idle');
        setPhase(null);
        setGeneratedHtml(null);
        setError(null);
        setErrorCode(null);
        setDuration(null);
        setRetryCount(0);
        setStructuralAnalysis(null);
        startTimeRef.current = null;
        lastPromptRef.current = null;
    }, [clearPhaseTimers]);

    // Computed values for retry availability
    const isRetryAvailable = status === 'success' && retryCount < MAX_RETRIES;
    const isRetryExhausted = retryCount >= MAX_RETRIES;

    return {
        status,
        phase,
        generatedHtml,
        error,
        errorCode,
        generate,
        reset,
        duration,
        retryCount,
        isRetryAvailable,
        isRetryExhausted,
        retry,
        structuralAnalysis,
        lastPrompt: lastPromptRef.current,
    };
}
