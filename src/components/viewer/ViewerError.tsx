'use client';

import { cn } from '@/lib/utils';
import type { ViewerErrorProps } from '@/types/viewer';

/**
 * Error display component for the 3D viewer
 * Shows a friendly error message with a retry button
 */
export function ViewerError({
    onRetry,
    message = 'Loading issue, please try again',
    className,
}: ViewerErrorProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center gap-4 p-8 bg-muted rounded-lg',
                className
            )}
            role="alert"
            aria-live="polite"
        >
            <div className="text-4xl" aria-hidden="true">
                😕
            </div>
            <p className="text-center text-muted-foreground">{message}</p>
            <button
                onClick={onRetry}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors min-h-[44px] min-w-[44px]"
                type="button"
            >
                Try Again
            </button>
        </div>
    );
}
