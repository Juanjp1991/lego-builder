'use client';

import { useState } from 'react';
import { useTextToModel } from '@/hooks/useTextToModel';
import { useImageToModel } from '@/hooks/useImageToModel';
import { PromptInput } from '@/components/create/PromptInput';
import { ImageUpload } from '@/components/create/ImageUpload';
import { GenerationProgress } from '@/components/create/GenerationProgress';
import { ModelViewer } from '@/components/viewer/ModelViewer';
import { cn } from '@/lib/utils';

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

    // Text-to-model generation state
    const textGeneration = useTextToModel();

    // Image-to-model generation state
    const imageGeneration = useImageToModel();

    // Get active generation state based on mode
    const activeGeneration = mode === 'text' ? textGeneration : imageGeneration;

    const {
        status,
        phase,
        generatedHtml,
        error,
        reset,
        duration,
    } = activeGeneration;

    const isGenerating = status === 'generating';
    const hasResult = status === 'success' && generatedHtml;
    const hasError = status === 'error';
    const isIdle = status === 'idle';

    /**
     * Handle text prompt submission
     */
    const handleTextSubmit = async (prompt: string) => {
        await textGeneration.generate(prompt);
    };

    /**
     * Handle image selection
     */
    const handleImageSelect = async (file: File) => {
        await imageGeneration.generate(file);
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
                <div className="flex justify-center" data-testid="mode-toggle">
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
