'use client';

import { Button } from '@/components/ui/button';
import { RotateCw } from 'lucide-react';

/**
 * Props for RetryButton component
 */
export interface RetryButtonProps {
    /** Callback when retry button is clicked */
    onRetry: () => void;
    /** Current retry count (0 = first attempt, 1 = first retry, etc.) */
    retryCount: number;
    /** Maximum number of retries allowed */
    maxRetries: number;
    /** Whether the button should be disabled */
    disabled?: boolean;
}

/**
 * RetryButton Component
 *
 * Displays a "Try Again" button with remaining retry count.
 * Disables when retry limit is reached.
 *
 * @see Story 2.4: Add Free Retry Mechanism
 * @see FR3: Users can regenerate a model with the same prompt (free retry, up to 3x)
 *
 * @example
 * ```tsx
 * <RetryButton
 *   onRetry={handleRetry}
 *   retryCount={1}
 *   maxRetries={3}
 * />
 * ```
 */
export function RetryButton({
    onRetry,
    retryCount,
    maxRetries,
    disabled = false,
}: RetryButtonProps) {
    const remaining = maxRetries - retryCount;
    const isExhausted = remaining <= 0;

    return (
        <Button
            variant="secondary"
            onClick={onRetry}
            disabled={disabled || isExhausted}
            className="gap-2"
            data-testid="retry-button"
        >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            {isExhausted ? 'No retries left' : `Try Again (${remaining} left)`}
        </Button>
    );
}
