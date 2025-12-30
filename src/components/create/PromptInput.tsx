'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const MAX_PROMPT_LENGTH = 1000;
const MIN_PROMPT_LENGTH = 1;

interface PromptInputProps {
    /** Callback when user submits a valid prompt */
    onSubmit: (prompt: string) => void;
    /** Whether a generation is currently in progress */
    isLoading: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * PromptInput Component
 * 
 * Text input for describing what Lego model to build.
 * Includes character counter and validation feedback.
 * 
 * @example
 * ```tsx
 * <PromptInput onSubmit={handleSubmit} isLoading={false} />
 * ```
 */
export function PromptInput({ onSubmit, isLoading, className }: PromptInputProps) {
    const [prompt, setPrompt] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedPrompt = prompt.trim();
        if (trimmedPrompt.length >= MIN_PROMPT_LENGTH && trimmedPrompt.length <= MAX_PROMPT_LENGTH && !isLoading) {
            onSubmit(trimmedPrompt);
        }
    };

    const charCount = prompt.length;
    const isOverLimit = charCount > MAX_PROMPT_LENGTH;
    const isEmpty = prompt.trim().length < MIN_PROMPT_LENGTH;
    const isDisabled = isLoading || isEmpty || isOverLimit;

    return (
        <form
            onSubmit={handleSubmit}
            className={cn('space-y-4', className)}
            data-testid="prompt-form"
        >
            <div className="relative">
                <label
                    htmlFor="prompt-input"
                    className="sr-only"
                >
                    Describe what you want to build
                </label>
                <textarea
                    id="prompt-input"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="What do you feel like building today?"
                    className={cn(
                        'w-full min-h-[120px] resize-none rounded-lg border p-4 pr-16',
                        'text-base placeholder:text-muted-foreground',
                        'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        'bg-background border-border',
                        isOverLimit && 'border-destructive focus:ring-destructive'
                    )}
                    disabled={isLoading}
                    aria-describedby="char-count"
                    data-testid="prompt-input"
                />
                <span
                    id="char-count"
                    className={cn(
                        'absolute bottom-3 right-3 text-sm tabular-nums',
                        isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'
                    )}
                    aria-live="polite"
                    data-testid="char-count"
                >
                    {charCount}/{MAX_PROMPT_LENGTH}
                </span>
            </div>

            {/* Validation message */}
            {isOverLimit && (
                <p
                    className="text-sm text-destructive"
                    role="alert"
                    data-testid="validation-error"
                >
                    Your description is too long. Please shorten it to {MAX_PROMPT_LENGTH} characters.
                </p>
            )}

            <button
                type="submit"
                disabled={isDisabled}
                className={cn(
                    'w-full py-3 px-6 rounded-lg font-semibold text-base',
                    'transition-colors duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2',
                    // Primary action button - accent yellow
                    !isDisabled
                        ? 'bg-[#FFB800] hover:bg-[#E6A600] text-black focus:ring-[#FFB800]'
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
                data-testid="submit-button"
            >
                {isLoading ? 'Creating...' : 'Create My Design'}
            </button>
        </form>
    );
}

// Export constants for testing
export { MAX_PROMPT_LENGTH, MIN_PROMPT_LENGTH };
