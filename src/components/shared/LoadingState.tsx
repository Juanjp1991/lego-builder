'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { LoadingPhase, LoadingStateProps } from '@/types/loading';

const PHASE_MESSAGES: Record<LoadingPhase, string> = {
    imagining: 'Imagining your creation...',
    finding: 'Finding the perfect bricks...',
    building: 'Building your model...',
};

const PHASE_SEQUENCE: LoadingPhase[] = ['imagining', 'finding', 'building'];
const PHASE_DURATION_MS = 3000;
const DEFAULT_TIMEOUT_MS = 60000;

export function LoadingState({
    initialPhase = 'imagining',
    className,
    onTimeout,
    timeoutMs = DEFAULT_TIMEOUT_MS,
}: LoadingStateProps) {
    const [phase, setPhase] = useState<LoadingPhase>(initialPhase);

    // Phase transition effect
    useEffect(() => {
        const currentIndex = PHASE_SEQUENCE.indexOf(phase);
        if (currentIndex < PHASE_SEQUENCE.length - 1) {
            const timer = setTimeout(() => {
                setPhase(PHASE_SEQUENCE[currentIndex + 1]);
            }, PHASE_DURATION_MS);
            return () => clearTimeout(timer);
        }
    }, [phase]);

    // Timeout effect with unmount protection
    useEffect(() => {
        if (!onTimeout) return;

        let isMounted = true;
        const timer = setTimeout(() => {
            if (isMounted) {
                onTimeout();
            }
        }, timeoutMs);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [onTimeout, timeoutMs]);

    // Reset phase when initialPhase prop changes
    useEffect(() => {
        setPhase(initialPhase);
    }, [initialPhase]);

    return (
        <div
            className={cn('relative w-full aspect-video', className)}
            role="status"
            aria-live="polite"
            aria-busy="true"
            data-testid="loading-state"
        >
            {/* Skeleton background with reduced motion support */}
            <div
                className="absolute inset-0 bg-muted rounded-lg motion-safe:animate-pulse"
                data-testid="loading-skeleton"
            />

            {/* Phase message with transition animation - also serves as screen reader content via aria-live */}
            <div className="absolute inset-0 flex items-center justify-center">
                <p
                    className="text-lg font-medium text-muted-foreground motion-safe:animate-fade-in"
                    data-testid="loading-message"
                >
                    {PHASE_MESSAGES[phase]}
                </p>
            </div>
        </div>
    );
}

// Export phase constants for testing and integration
export { PHASE_MESSAGES, PHASE_SEQUENCE, PHASE_DURATION_MS, DEFAULT_TIMEOUT_MS };
