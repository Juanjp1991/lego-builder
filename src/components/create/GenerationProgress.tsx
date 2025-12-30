'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { LoadingPhase } from '@/types/loading';

/**
 * Generation progress stages with timing
 */
const GENERATION_STAGES: ReadonlyArray<{
    key: LoadingPhase;
    label: string;
    duration: number | null;
}> = [
        { key: 'imagining', label: 'Imagining your creation...', duration: 3000 },
        { key: 'finding', label: 'Finding the perfect bricks...', duration: 5000 },
        { key: 'building', label: 'Building your model...', duration: null }, // Until done
    ];

interface GenerationProgressProps {
    /** Current progress phase/stage */
    phase: LoadingPhase;
    /** Additional CSS classes */
    className?: string;
}

/**
 * GenerationProgress Component
 * 
 * Displays progress storytelling during model generation.
 * Shows current phase with animated skeleton background.
 * Uses the established LoadingState pattern from Story 1-4.
 * 
 * @example
 * ```tsx
 * <GenerationProgress phase="imagining" />
 * ```
 */
export function GenerationProgress({ phase, className }: GenerationProgressProps) {
    const announceRef = useRef<HTMLDivElement>(null);

    // Get the current stage label
    const currentStage = GENERATION_STAGES.find((stage) => stage.key === phase);
    const message = currentStage?.label ?? 'Loading...';

    // Announce phase changes to screen readers
    useEffect(() => {
        if (announceRef.current) {
            announceRef.current.textContent = message;
        }
    }, [message]);

    return (
        <div
            className={cn('relative w-full aspect-video', className)}
            role="status"
            aria-busy="true"
            data-testid="generation-progress"
        >
            {/* Skeleton background with animation */}
            <div
                className="absolute inset-0 bg-muted rounded-lg overflow-hidden"
                data-testid="progress-skeleton"
            >
                {/* Shimmer effect */}
                <div
                    className="absolute inset-0 motion-safe:animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    data-testid="shimmer-effect"
                />
            </div>

            {/* Phase message centered */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center px-4">
                    {/* Animated spinner */}
                    <div
                        className="inline-block w-8 h-8 mb-4 border-2 border-primary border-t-transparent rounded-full motion-safe:animate-spin"
                        data-testid="progress-spinner"
                        aria-hidden="true"
                    />

                    <p
                        className={cn(
                            'text-lg font-medium text-muted-foreground',
                            'motion-safe:animate-fade-in'
                        )}
                        data-testid="progress-message"
                    >
                        {message}
                    </p>

                    {/* Phase indicators */}
                    <div
                        className="flex justify-center gap-2 mt-4"
                        data-testid="phase-indicators"
                    >
                        {GENERATION_STAGES.map((stage) => (
                            <div
                                key={stage.key}
                                className={cn(
                                    'w-2 h-2 rounded-full transition-colors duration-300',
                                    phase === stage.key
                                        ? 'bg-primary'
                                        : GENERATION_STAGES.findIndex((s) => s.key === phase) >
                                            GENERATION_STAGES.findIndex((s) => s.key === stage.key)
                                            ? 'bg-primary/50'
                                            : 'bg-muted-foreground/30'
                                )}
                                aria-hidden="true"
                                data-testid={`indicator-${stage.key}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Screen reader announcements (visually hidden) */}
            <div
                ref={announceRef}
                className="sr-only"
                aria-live="polite"
                aria-atomic="true"
                data-testid="sr-announcement"
            >
                {message}
            </div>
        </div>
    );
}

// Export for testing
export { GENERATION_STAGES };
