'use client';

import { useState, useEffect } from 'react';
import { useTextToModel } from '@/hooks/useTextToModel';
import { useImageToModel } from '@/hooks/useImageToModel';
import { useTextToVoxelModel } from '@/hooks/useTextToVoxelModel';
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
import { VoxelPreview } from '@/components/create/VoxelPreview';
import { ModelViewer } from '@/components/viewer/ModelViewer';
import { cn } from '@/lib/utils';
import { MAX_RETRIES } from '@/lib/constants';
import { STABILITY_REGENERATION_SUFFIX } from '@/lib/ai/prompts';
import { detectCategory } from '@/lib/ai/categories';
import type { AIModel } from '@/lib/ai/types';

/** Complex categories that benefit from the Pro model */
const COMPLEX_CATEGORIES = ['vehicles', 'buildings', 'animals', 'characters'];

/**
 * Input mode for model generation
 * - text: Direct text-to-LEGO (fast)
 * - image: Image-to-LEGO (from uploaded image)
 * - text-to-voxel: Two-step pipeline (text → voxel → LEGO, higher quality)
 */
type InputMode = 'text' | 'image' | 'text-to-voxel';

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

    // Two-step voxel pipeline state
    const voxelGeneration = useTextToVoxelModel();

    // First-build guarantee state
    const {
        isLoading: isFirstBuildLoading,
        isFirstBuildMode,
        hasCompletedFirstBuild,
        prefersAdvanced,
        toggleAdvanced,
    } = useFirstBuild();

    // Get active generation state based on mode
    // For text-to-voxel mode, we use the voxelGeneration hook
    const activeGeneration = mode === 'text'
        ? textGeneration
        : mode === 'image'
            ? imageGeneration
            : null; // voxel mode has different state structure

    // For standard modes (text/image)
    const {
        status: standardStatus,
        phase: standardPhase,
        generatedHtml: standardHtml,
        error: standardError,
        reset: standardReset,
        duration: standardDuration,
        retryCount: standardRetryCount,
        isRetryAvailable: standardRetryAvailable,
        isRetryExhausted: standardRetryExhausted,
        retry: standardRetry,
        structuralAnalysis: standardStructuralAnalysis,
    } = activeGeneration || {
        status: 'idle' as const,
        phase: null,
        generatedHtml: null,
        error: null,
        reset: () => { },
        duration: null,
        retryCount: 0,
        isRetryAvailable: false,
        isRetryExhausted: false,
        retry: () => { },
        structuralAnalysis: null,
    };

    // Unified state for all modes
    const status = mode === 'text-to-voxel' ? voxelGeneration.status : standardStatus;
    const phase = mode === 'text-to-voxel' ? voxelGeneration.phase : standardPhase;
    const generatedHtml = mode === 'text-to-voxel' ? voxelGeneration.generatedHtml : standardHtml;
    const error = mode === 'text-to-voxel' ? voxelGeneration.error : standardError;
    const duration = mode === 'text-to-voxel' ? voxelGeneration.duration : standardDuration;
    const structuralAnalysis = mode === 'text-to-voxel' ? voxelGeneration.structuralAnalysis : standardStructuralAnalysis;

    const reset = mode === 'text-to-voxel' ? voxelGeneration.reset : standardReset;
    const retryCount = mode === 'text-to-voxel' ? voxelGeneration.legoRetryCount : standardRetryCount;
    const isRetryAvailable = mode === 'text-to-voxel' ? voxelGeneration.isLegoRetryAvailable : standardRetryAvailable;
    const isRetryExhausted = mode === 'text-to-voxel' ? !voxelGeneration.isLegoRetryAvailable && voxelGeneration.legoRetryCount >= MAX_RETRIES : standardRetryExhausted;
    const retry = mode === 'text-to-voxel' ? voxelGeneration.retryLego : standardRetry;

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
    const lastPrompt = mode === 'text'
        ? textGeneration.lastPrompt
        : mode === 'text-to-voxel'
            ? voxelGeneration.lastPrompt
            : null;

    // Status checks - account for voxel pipeline statuses
    const isGenerating = status === 'generating' ||
        status === 'generating-voxel' ||
        status === 'generating-lego';
    const hasResult = status === 'success' && generatedHtml;
    const hasError = status === 'error';
    const isIdle = status === 'idle';
    const isAwaitingApproval = status === 'awaiting-approval';

    /**
     * Handle text prompt submission (direct text-to-LEGO)
     * Auto-upgrades to Pro model for complex categories (vehicles, buildings, animals, characters)
     */
    const handleTextSubmit = async (prompt: string) => {
        setShowStructuralFeedback(true); // Reset feedback visibility for new generation

        // Auto-select Pro model for complex categories
        const category = detectCategory(prompt);
        const modelToUse = COMPLEX_CATEGORIES.includes(category) ? 'pro' : selectedModel;

        await textGeneration.generate(prompt, isFirstBuildMode, modelToUse);
    };

    /**
     * Handle voxel prompt submission (two-step pipeline)
     * Auto-upgrades to Pro model for complex categories
     */
    const handleVoxelSubmit = async (prompt: string) => {
        setShowStructuralFeedback(true);

        // Auto-select Pro model for complex categories
        const category = detectCategory(prompt);
        const modelToUse = COMPLEX_CATEGORIES.includes(category) ? 'pro' : selectedModel;

        await voxelGeneration.generateVoxel(prompt, 'isometric', modelToUse);
    };

    /**
     * Handle voxel approval - proceed to LEGO generation
     */
    const handleVoxelApprove = async () => {
        setShowStructuralFeedback(true);
        await voxelGeneration.approveVoxel(isFirstBuildMode);
    };

    /**
     * Handle voxel regeneration
     */
    const handleVoxelRegenerate = async () => {
        await voxelGeneration.regenerateVoxel();
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
     * Auto-upgrades to Pro model for complex categories
     */
    const handleTemplateSelect = async (prompt: string) => {
        // Auto-select Pro model for complex categories
        const category = detectCategory(prompt);
        const modelToUse = COMPLEX_CATEGORIES.includes(category) ? 'pro' : selectedModel;

        // Use voxel mode for templates if currently in voxel mode, otherwise text mode
        if (mode === 'text-to-voxel') {
            setShowStructuralFeedback(true);
            voxelGeneration.reset();
            await voxelGeneration.generateVoxel(prompt, 'isometric', modelToUse);
        } else {
            setMode('text'); // Switch to text mode first
            setShowStructuralFeedback(true);
            reset(); // Reset to clear retry count
            await textGeneration.generate(prompt, isFirstBuildMode, modelToUse);
        }
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
                                    'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
                                    mode === 'text'
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                                data-testid="mode-text-button"
                                aria-pressed={mode === 'text'}
                                title="Fast text-to-LEGO generation"
                            >
                                Text
                            </button>
                            <button
                                type="button"
                                onClick={() => handleModeSwitch('text-to-voxel')}
                                className={cn(
                                    'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
                                    mode === 'text-to-voxel'
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                                data-testid="mode-voxel-button"
                                aria-pressed={mode === 'text-to-voxel'}
                                title="Two-step: Text → Voxel preview → LEGO (higher quality)"
                            >
                                Text (HD)
                            </button>
                            <button
                                type="button"
                                onClick={() => handleModeSwitch('image')}
                                className={cn(
                                    'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
                                    mode === 'image'
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                                data-testid="mode-image-button"
                                aria-pressed={mode === 'image'}
                                title="Upload an image to convert to LEGO"
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
                                ⚡ 2.5 Flash
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
                                ✨ 2.5 Pro
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedModel('pro-3')}
                                className={cn(
                                    'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
                                    selectedModel === 'pro-3'
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                                data-testid="model-pro3-button"
                                aria-pressed={selectedModel === 'pro-3'}
                                title="Advanced reasoning (Gemini 2.5 Pro with thinking)"
                            >
                                🧠 2.5 Pro+
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

            {/* Voxel Input - Shown when in text-to-voxel mode and idle */}
            {mode === 'text-to-voxel' && isIdle && (
                <section aria-labelledby="voxel-prompt-section">
                    <h2 id="voxel-prompt-section" className="sr-only">
                        Enter your design description (HD mode)
                    </h2>
                    <div className="text-center mb-4">
                        <p className="text-sm text-muted-foreground">
                            HD mode creates a voxel preview first for better quality results
                        </p>
                    </div>
                    <PromptInput
                        onSubmit={handleVoxelSubmit}
                        isLoading={isGenerating}
                    />
                </section>
            )}

            {/* Voxel Preview - Shown when awaiting approval */}
            {mode === 'text-to-voxel' && isAwaitingApproval && voxelGeneration.voxelImage && (
                <section aria-labelledby="voxel-preview-section">
                    <h2 id="voxel-preview-section" className="sr-only">
                        Review your voxel concept
                    </h2>
                    <VoxelPreview
                        imageUrl={voxelGeneration.voxelImage.previewUrl}
                        originalPrompt={voxelGeneration.voxelImage.prompt}
                        onApprove={handleVoxelApprove}
                        onRegenerate={handleVoxelRegenerate}
                        onCancel={voxelGeneration.reset}
                        isLoading={voxelGeneration.status === 'generating-lego'}
                        isRegenerating={voxelGeneration.status === 'generating-voxel'}
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
