'use client';

import { useTextToModel } from '@/hooks/useTextToModel';
import { PromptInput } from '@/components/create/PromptInput';
import { GenerationProgress } from '@/components/create/GenerationProgress';
import { ModelViewer } from '@/components/viewer/ModelViewer';
import { cn } from '@/lib/utils';

/**
 * CreateContent Component
 * 
 * Client-side component handling the generation flow:
 * 1. User enters prompt in PromptInput
 * 2. Progress storytelling shows during generation
 * 3. Generated model displays in ModelViewer
 * 
 * @see Story 2.2: Implement Text-to-Lego Model Generation
 */
export function CreateContent() {
    const {
        status,
        phase,
        generatedHtml,
        error,
        generate,
        reset,
        duration,
    } = useTextToModel();

    const isGenerating = status === 'generating';
    const hasResult = status === 'success' && generatedHtml;
    const hasError = status === 'error';

    /**
     * Handle form submission
     */
    const handleSubmit = async (prompt: string) => {
        await generate(prompt);
    };

    /**
     * Handle retry from error state
     */
    const handleRetry = () => {
        reset();
    };

    /**
     * Handle creating a new design
     */
    const handleNewDesign = () => {
        reset();
    };

    return (
        <div className="space-y-8" data-testid="create-content">
            {/* Prompt Input - Hidden when generating or showing result */}
            {!isGenerating && !hasResult && (
                <section aria-labelledby="prompt-section">
                    <h2 id="prompt-section" className="sr-only">
                        Enter your design description
                    </h2>
                    <PromptInput
                        onSubmit={handleSubmit}
                        isLoading={isGenerating}
                    />
                </section>
            )}

            {/* Generation Progress */}
            {isGenerating && phase && (
                <section aria-labelledby="progress-section">
                    <h2 id="progress-section" className="sr-only">
                        Generation in progress
                    </h2>
                    <GenerationProgress phase={phase} />
                </section>
            )}

            {/* Error State */}
            {hasError && (
                <section
                    aria-labelledby="error-section"
                    className="space-y-4"
                    data-testid="error-section"
                >
                    <h2 id="error-section" className="sr-only">
                        Error occurred
                    </h2>

                    {/* Error message card */}
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
                        <p
                            className="text-lg text-destructive mb-4"
                            role="alert"
                            data-testid="error-message"
                        >
                            {error}
                        </p>
                        <button
                            onClick={handleRetry}
                            className={cn(
                                'py-2 px-6 rounded-lg font-semibold',
                                'bg-[#FFB800] hover:bg-[#E6A600] text-black',
                                'transition-colors duration-200',
                                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFB800]'
                            )}
                            data-testid="retry-button"
                        >
                            Try Again
                        </button>
                    </div>
                </section>
            )}

            {/* Success State - Model Viewer */}
            {hasResult && (
                <section
                    aria-labelledby="result-section"
                    className="space-y-6"
                    data-testid="result-section"
                >
                    <h2 id="result-section" className="sr-only">
                        Your generated model
                    </h2>

                    {/* Duration badge */}
                    {duration !== null && (
                        <div className="flex justify-center">
                            <span
                                className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full"
                                data-testid="duration-badge"
                            >
                                Generated in {(duration / 1000).toFixed(1)}s
                            </span>
                        </div>
                    )}

                    {/* 3D Model Viewer */}
                    <ModelViewer
                        htmlScene={generatedHtml}
                        onError={() => {
                            console.error('[CreateContent] ModelViewer error - scene may be invalid');
                        }}
                    />

                    {/* Action buttons */}
                    <div className="flex justify-center gap-4">
                        <button
                            onClick={handleNewDesign}
                            className={cn(
                                'py-3 px-6 rounded-lg font-semibold',
                                'bg-[#FFB800] hover:bg-[#E6A600] text-black',
                                'transition-colors duration-200',
                                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFB800]'
                            )}
                            data-testid="new-design-button"
                        >
                            Create New Design
                        </button>
                    </div>
                </section>
            )}
        </div>
    );
}
