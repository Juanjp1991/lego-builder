'use client';

/**
 * RegeneratePrompt Component
 *
 * Displays action buttons for handling unstable model feedback.
 * Allows user to regenerate for stability or proceed anyway.
 *
 * @see Story 2.6: Add Structural Feedback for Generated Models
 */

import { Button } from '@/components/ui/button';
import { RefreshCw, ChevronRight, Loader2 } from 'lucide-react';

export interface RegeneratePromptProps {
    /** Callback when user wants to regenerate with stability focus */
    onRegenerateForStability: () => void;
    /** Callback when user wants to proceed despite warnings */
    onProceedAnyway: () => void;
    /** Whether buttons should be disabled (e.g., during generation) */
    disabled?: boolean;
    /** Whether to show loading state on regenerate button */
    isLoading?: boolean;
}

/**
 * RegeneratePrompt shows action buttons when a model has structural issues.
 *
 * - "Regenerate for Stability" triggers a new generation with stability hints
 * - "Build Anyway" allows the user to proceed despite warnings
 * - Shows loading spinner during regeneration
 *
 * @example
 * ```tsx
 * <RegeneratePrompt
 *   onRegenerateForStability={handleRegenerate}
 *   onProceedAnyway={handleProceed}
 *   isLoading={isGenerating}
 * />
 * ```
 */
export function RegeneratePrompt({
    onRegenerateForStability,
    onProceedAnyway,
    disabled = false,
    isLoading = false,
}: RegeneratePromptProps) {
    const isButtonDisabled = disabled || isLoading;

    return (
        <div
            className="flex flex-col sm:flex-row gap-2 mt-4"
            data-testid="regenerate-prompt-section"
        >
            <Button
                onClick={onRegenerateForStability}
                disabled={isButtonDisabled}
                variant="default"
                className="flex-1"
                data-testid="regenerate-stability-button"
            >
                {isLoading ? (
                    <Loader2
                        className="h-4 w-4 mr-2 animate-spin"
                        aria-hidden="true"
                        data-testid="loading-spinner"
                    />
                ) : (
                    <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                )}
                {isLoading ? 'Regenerating...' : 'Regenerate for Stability'}
            </Button>
            <Button
                onClick={onProceedAnyway}
                disabled={isButtonDisabled}
                variant="outline"
                className="flex-1"
                data-testid="build-anyway-button"
            >
                Build Anyway
                <ChevronRight className="h-4 w-4 ml-2" aria-hidden="true" />
            </Button>
        </div>
    );
}
