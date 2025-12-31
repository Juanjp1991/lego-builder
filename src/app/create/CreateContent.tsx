'use client';

import { useState, useEffect } from 'react';
import { useTextToModel } from '@/hooks/useTextToModel';
import { useImageToModel } from '@/hooks/useImageToModel';
import { useFirstBuild } from '@/hooks/useFirstBuild';
import { PromptInput } from '@/components/create/PromptInput';
import { ImageUpload } from '@/components/create/ImageUpload';
import { GenerationProgress } from '@/components/create/GenerationProgress';
import { RetryButton } from '@/components/create/RetryButton';
import { TemplateSuggestions } from '@/components/create/TemplateSuggestions';
import { FirstBuildBadge } from '@/components/create/FirstBuildBadge';
import { AdvancedModeToggle } from '@/components/create/AdvancedModeToggle';
import { StructuralFeedback } from '@/components/create/StructuralFeedback';
import { RegeneratePrompt } from '@/components/create/RegeneratePrompt';
import { ModelViewer } from '@/components/viewer/ModelViewer';
import { cn } from '@/lib/utils';
import { MAX_RETRIES } from '@/lib/constants';
import { STABILITY_REGENERATION_SUFFIX } from '@/lib/ai/prompts';
import type { AIModel } from '@/lib/ai/types';

/**
 * Input mode for model generation
 */
type InputMode = 'text' | 'image';

/**
 * CreateContent Component
 *
 * Client-side component handling the generation flow:
 * 1. User selects input mode (Text or Image)
 * 2. User enters prompt OR uploads image
 * 3. Progress storytelling shows during generation
 * 4. Generated model displays in ModelViewer
 *
 * @see Story 2.2: Implement Text-to-Lego Model Generation
 * @see Story 2.3: Implement Image-to-Lego Model Generation
 */
export function CreateContent() {
    // Input mode state
    const [mode, setMode] = useState<InputMode>('text');

    // AI model selection state
    const [selectedModel, setSelectedModel] = useState<AIModel>('flash');

    // Controls visibility of structural feedback (Story 2.6)
    const [showStructuralFeedback, setShowStructuralFeedback] = useState(true);

    // Text-to-model generation state
    const textGeneration = useTextToModel();

    // Image-to-model generation state
    const imageGeneration = useImageToModel();

    // First-build guarantee state
    const {
        isLoading: isFirstBuildLoading,
        isFirstBuildMode,
        hasCompletedFirstBuild,
        prefersAdvanced,
        toggleAdvanced,
    } = useFirstBuild();

    // Get active generation state based on mode
    const activeGeneration = mode === 'text' ? textGeneration : imageGeneration;

    const {
        status,
        phase,
        generatedHtml,
        error,
        reset,
        duration,
        retryCount,
        isRetryAvailable,
        isRetryExhausted,
        retry,
        structuralAnalysis,
    } = activeGeneration;

    // TRACK STRUCTURAL FEEDBACK SHOWN (Story 2.6)
    useEffect(() => {
        if (status === 'success' && structuralAnalysis && typeof window !== 'undefined' && (window as any).posthog) {
            (window as any).posthog.capture('structural_feedback_shown', {
                isStable: structuralAnalysis.isStable,
                overallScore: structuralAnalysis.overallScore,
                issueCount: structuralAnalysis.issues.length,
                mode,
            });
        }
    }, [status, structuralAnalysis, mode]);

    // Hook-specific properties needed for stability regeneration
    const lastPrompt = mode === 'text' ? textGeneration.lastPrompt : null;

    const isGenerating = status === 'generating';
    const hasResult = status === 'success' && generatedHtml;
    const hasError = status === 'error';
    const isIdle = status === 'idle';

    /**
     * Handle text prompt submission
     */
    const handleTextSubmit = async (prompt: string) => {
        setShowStructuralFeedback(true); // Reset feedback visibility for new generation
        await textGeneration.generate(prompt, isFirstBuildMode, selectedModel);
    };

    /**
     * Handle image selection
     */
    const handleImageSelect = async (file: File) => {
        setShowStructuralFeedback(true); // Reset feedback visibility for new generation
        await imageGeneration.generate(file, isFirstBuildMode, undefined, selectedModel);
    };

    /**
     * Handle retry from error state
     */
    const handleRetry = () => {
        setShowStructuralFeedback(true);
        reset();
    };

    /**
     * Handle creating a new design
     */
    const handleNewDesign = () => {
        reset();
    };

    /**
     * Handle template selection (from TemplateSuggestions)
     * Resets state and generates with the template prompt
     */
    const handleTemplateSelect = async (prompt: string) => {
        setMode('text'); // Switch to text mode first
        setShowStructuralFeedback(true);
        reset(); // Reset to clear retry count
        await textGeneration.generate(prompt, isFirstBuildMode, selectedModel); // Generate with template prompt
    };

    /**
     * Handle "Regenerate for Stability" action (Story 2.6)
     */
    const handleRegenerateForStability = async () => {
        // Tracker (Story 2.6)
        if (typeof window !== 'undefined' && (window as any).posthog) {
            (window as any).posthog.capture('regenerate_for_stability_clicked', {
                mode,
                previousScore: structuralAnalysis?.overallScore,
            });
        }

        setShowStructuralFeedback(true);
        if (mode === 'text' && lastPrompt) {
            await textGeneration.generate(
                lastPrompt + STABILITY_REGENERATION_SUFFIX,
                isFirstBuildMode,
                selectedModel
            );
        } else if (mode === 'image' && imageGeneration.status === 'success') {
            // For image mode, we call retry with the stability prompt override
            imageGeneration.retry(STABILITY_REGENERATION_SUFFIX);
        }
    };

    /**
     * Handle "Build Anyway" action - just hide the warnings (Story 2.6)
     */
    const handleProceedAnyway = () => {
        // Tracker (Story 2.6)
        if (typeof window !== 'undefined' && (window as any).posthog) {
            (window as any).posthog.capture('build_anyway_clicked', {
                score: structuralAnalysis?.overallScore,
            });
        }

        setShowStructuralFeedback(false);
    };

    /**
     * Handle mode switch
     * Only allow switching when idle (not generating or showing result)
     */
    const handleModeSwitch = (newMode: InputMode) => {
        if (isIdle) {
            setMode(newMode);
        }
    };

    return (
        <div className="space-y-8" data-testid="create-content">
            {/* Mode Toggle - Only shown when idle */}
            {isIdle && (
                <div className="flex flex-col items-center gap-4" data-testid="mode-toggle">
                    {/* First-Build Badge - Shown when in simple mode */}
                    {isFirstBuildMode && !isFirstBuildLoading && (
                        <FirstBuildBadge />
                    )}

                    {/* Advanced Mode Toggle - Shown for first-time users */}
                    {!hasCompletedFirstBuild && !isFirstBuildLoading && (
                        <AdvancedModeToggle
                            checked={prefersAdvanced}
                            onCheckedChange={toggleAdvanced}
                        />
                    )}

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        {/* Input Mode Toggle */}
                        <div className="inline-flex rounded-lg border border-border p-1 bg-muted/30">
                            <button
                                type="button"
                                onClick={() => handleModeSwitch('text')}
                                className={cn(
                                    'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
                                    mode === 'text'
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                                data-testid="mode-text-button"
                                aria-pressed={mode === 'text'}
                            >
                                Text
                            </button>
                            <button
                                type="button"
                                onClick={() => handleModeSwitch('image')}
                                className={cn(
                                    'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
                                    mode === 'image'
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                                data-testid="mode-image-button"
                                aria-pressed={mode === 'image'}
                            >
                                Image
                            </button>
                        </div>

                        {/* AI Model Toggle */}
                        <div className="inline-flex rounded-lg border border-border p-1 bg-muted/30">
                            <button
                                type="button"
                                onClick={() => setSelectedModel('flash')}
                                className={cn(
                                    'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
                                    selectedModel === 'flash'
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                                data-testid="model-flash-button"
                                aria-pressed={selectedModel === 'flash'}
                                title="Fast generation (Gemini 2.5 Flash)"
                            >
                                ⚡ Flash
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedModel('pro')}
                                className={cn(
                                    'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
                                    selectedModel === 'pro'
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                                data-testid="model-pro-button"
                                aria-pressed={selectedModel === 'pro'}
                                title="Higher quality (Gemini 2.5 Pro)"
                            >
                                ✨ Pro
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Text Input - Shown when in text mode and idle */}
            {mode === 'text' && isIdle && (
                <section aria-labelledby="prompt-section">
                    <h2 id="prompt-section" className="sr-only">
                        Enter your design description
                    </h2>
                    <PromptInput
                        onSubmit={handleTextSubmit}
                        isLoading={isGenerating}
                    />
                </section>
            )}

            {/* Image Upload - Shown when in image mode and idle */}
            {mode === 'image' && isIdle && (
                <section aria-labelledby="upload-section">
                    <h2 id="upload-section" className="sr-only">
                        Upload an image
                    </h2>
                    <ImageUpload
                        onImageSelect={handleImageSelect}
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

                    {/* Structural Feedback Alert (Story 2.6) */}
                    {showStructuralFeedback && structuralAnalysis && (
                        <div className="space-y-4">
                            <StructuralFeedback
                                analysis={structuralAnalysis}
                                onDismiss={() => setShowStructuralFeedback(false)}
                            />

                            {/* Regeneration Options for Unstable Models */}
                            {!structuralAnalysis.isStable && (
                                <RegeneratePrompt
                                    onRegenerateForStability={handleRegenerateForStability}
                                    onProceedAnyway={handleProceedAnyway}
                                    isLoading={isGenerating}
                                />
                            )}
                        </div>
                    )}

                    {/* 3D Model Viewer */}
                    <ModelViewer
                        htmlScene={generatedHtml}
                        onError={() => {
                            console.error(
                                '[CreateContent] ModelViewer error - scene may be invalid'
                            );
                        }}
                    />

                    {/* Retry Section */}
                    <div className="flex flex-col items-center gap-4">
                        {/* Show retry count when retries have been used */}
                        {retryCount > 0 && !isRetryExhausted && (
                            <p
                                className="text-sm text-muted-foreground"
                                data-testid="retry-count-display"
                            >
                                Attempt {retryCount + 1} of {MAX_RETRIES + 1}
                            </p>
                        )}

                        {/* Retry Button - Only shown when retry is available */}
                        {isRetryAvailable && (
                            <RetryButton
                                onRetry={retry}
                                retryCount={retryCount}
                                maxRetries={MAX_RETRIES}
                            />
                        )}

                        {/* Template Suggestions - Shown when retries exhausted */}
                        {isRetryExhausted && (
                            <TemplateSuggestions onSelectTemplate={handleTemplateSelect} />
                        )}

                        {/* New Design Button */}
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
