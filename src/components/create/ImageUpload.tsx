'use client';

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react';
import { cn } from '@/lib/utils';

/** Maximum file size: 10MB */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Accepted image MIME types */
export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/heic'];

interface ImageUploadProps {
    /** Callback when user selects a valid image */
    onImageSelect: (file: File) => void;
    /** Whether a generation is currently in progress */
    isLoading: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * ImageUpload Component
 *
 * Drag-and-drop image upload zone with file input fallback.
 * Supports PNG, JPEG, WEBP, and HEIC images up to 10MB.
 * Displays image preview after selection.
 *
 * @see Story 2.3: Implement Image-to-Lego Model Generation
 *
 * @example
 * ```tsx
 * <ImageUpload onImageSelect={handleSelect} isLoading={false} />
 * ```
 */
export function ImageUpload({ onImageSelect, isLoading, className }: ImageUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    /**
     * Cleanup blob URL on unmount or when preview changes
     * Prevents memory leaks from URL.createObjectURL
     */
    useEffect(() => {
        return () => {
            if (preview) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

    /**
     * Validates the selected file
     * Returns error message if invalid, null if valid
     */
    const validateFile = (file: File): string | null => {
        if (!ACCEPTED_TYPES.includes(file.type)) {
            return 'Please upload a PNG, JPEG, WEBP, or HEIC image.';
        }
        if (file.size > MAX_FILE_SIZE) {
            return 'Image must be smaller than 10MB.';
        }
        return null;
    };

    /**
     * Handles file selection (from input or drop)
     */
    const handleFile = (file: File) => {
        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            setPreview(null);
            return;
        }

        setError(null);

        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setPreview(previewUrl);

        // Notify parent
        onImageSelect(file);
    };

    /**
     * Handle drag over event
     */
    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    /**
     * Handle drag leave event
     */
    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    /**
     * Handle file drop
     */
    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFile(file);
        }
    };

    /**
     * Handle file input change
     */
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    /**
     * Click on browse button triggers file input
     */
    const handleBrowseClick = () => {
        inputRef.current?.click();
    };

    /**
     * Clear the selected image and return to upload state
     */
    const handleClearImage = () => {
        // Revoke blob URL to prevent memory leak
        if (preview) {
            URL.revokeObjectURL(preview);
        }
        setPreview(null);
        setError(null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    /**
     * Handle keyboard interaction for the drop zone
     */
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleBrowseClick();
        }
    };

    return (
        <div className={cn('space-y-4', className)}>
            {/* Drop Zone */}
            <div
                data-testid="image-upload-zone"
                role="button"
                tabIndex={0}
                aria-label="Upload image by dragging and dropping or clicking to browse"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={!preview ? handleBrowseClick : undefined}
                onKeyDown={!preview ? handleKeyDown : undefined}
                className={cn(
                    'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                    isDragging
                        ? 'border-primary bg-primary/10'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                    isLoading && 'opacity-50 pointer-events-none',
                    !preview && 'cursor-pointer'
                )}
            >
                {/* Hidden file input */}
                <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED_TYPES.join(',')}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="sr-only"
                    data-testid="file-input"
                    aria-hidden="true"
                />

                {/* Preview State */}
                {preview && (
                    <div className="space-y-4">
                        <img
                            src={preview}
                            alt="Selected image preview"
                            data-testid="image-preview"
                            className="mx-auto max-h-48 rounded-lg object-contain"
                        />
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClearImage();
                            }}
                            className={cn(
                                'px-4 py-2 text-sm font-medium rounded-lg',
                                'bg-muted hover:bg-muted/80 text-foreground',
                                'transition-colors duration-200',
                                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary'
                            )}
                        >
                            Change Image
                        </button>
                    </div>
                )}

                {/* Upload State */}
                {!preview && (
                    <div className="space-y-3">
                        {/* Upload Icon */}
                        <div className="flex justify-center">
                            <svg
                                className="h-12 w-12 text-muted-foreground"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                        </div>

                        {/* Instructions */}
                        <div>
                            <p className="text-base font-medium text-foreground">
                                Drag & drop an image here
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                or{' '}
                                <button
                                    type="button"
                                    className="text-primary hover:text-primary/80 font-medium underline-offset-4 hover:underline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleBrowseClick();
                                    }}
                                >
                                    browse files
                                </button>
                            </p>
                        </div>

                        {/* Supported formats */}
                        <p className="text-xs text-muted-foreground">
                            PNG, JPEG, WEBP, HEIC (max 10MB)
                        </p>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <p
                    data-testid="upload-error"
                    role="alert"
                    className="text-sm text-destructive text-center"
                >
                    {error}
                </p>
            )}
        </div>
    );
}
