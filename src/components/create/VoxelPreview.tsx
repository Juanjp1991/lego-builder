'use client';

/**
 * VoxelPreview Component
 *
 * Displays the generated voxel image for user approval
 * before proceeding to LEGO model generation.
 *
 * Part of the two-step text-to-voxel-to-LEGO pipeline.
 */

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Blocks, RefreshCw, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VoxelPreviewProps {
  /** Blob URL for the voxel image preview */
  imageUrl: string;
  /** Original prompt used to generate the image */
  originalPrompt: string;
  /** Callback when user approves and wants to proceed */
  onApprove: () => void;
  /** Callback when user wants to regenerate with same prompt */
  onRegenerate: () => void;
  /** Callback when user wants to cancel and start over */
  onCancel: () => void;
  /** Whether LEGO generation is in progress */
  isLoading?: boolean;
  /** Whether regeneration is in progress */
  isRegenerating?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * VoxelPreview displays the generated voxel concept image and provides
 * options to approve, regenerate, or cancel.
 *
 * @example
 * ```tsx
 * <VoxelPreview
 *   imageUrl={voxelImage.previewUrl}
 *   originalPrompt={voxelImage.prompt}
 *   onApprove={handleApprove}
 *   onRegenerate={handleRegenerate}
 *   onCancel={handleCancel}
 *   isLoading={status === 'generating-lego'}
 * />
 * ```
 */
export function VoxelPreview({
  imageUrl,
  originalPrompt,
  onApprove,
  onRegenerate,
  onCancel,
  isLoading = false,
  isRegenerating = false,
  className = '',
}: VoxelPreviewProps) {
  const isDisabled = isLoading || isRegenerating;

  return (
    <Card
      className={cn(
        'w-full animate-in fade-in slide-in-from-bottom-4 duration-300',
        className
      )}
      data-testid="voxel-preview"
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Blocks className="h-5 w-5 text-primary" aria-hidden="true" />
            Voxel Concept
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            Step 1 of 2
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Review your voxel concept below. Click &quot;Build LEGO Model&quot; to convert it to bricks.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Voxel Image Preview */}
        <div
          className="relative aspect-square w-full max-w-md mx-auto rounded-lg overflow-hidden border bg-muted"
          data-testid="voxel-image-container"
        >
          <Image
            src={imageUrl}
            alt={`Voxel art concept for: ${originalPrompt}`}
            fill
            className="object-contain"
            priority
            unoptimized // Blob URLs don't need optimization
          />
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Converting to LEGO...</span>
              </div>
            </div>
          )}
        </div>

        {/* Original Prompt Display */}
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Original prompt:</p>
          <p className="text-sm font-medium">&quot;{originalPrompt}&quot;</p>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row gap-2 pt-2">
        {/* Primary Action: Build LEGO Model */}
        <Button
          onClick={onApprove}
          disabled={isDisabled}
          className="flex-1 w-full sm:w-auto"
          data-testid="approve-voxel-button"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
              Building...
            </>
          ) : (
            <>
              <Blocks className="h-4 w-4 mr-2" aria-hidden="true" />
              Build LEGO Model
            </>
          )}
        </Button>

        {/* Secondary Action: Regenerate */}
        <Button
          variant="outline"
          onClick={onRegenerate}
          disabled={isDisabled}
          className="flex-1 w-full sm:w-auto"
          data-testid="regenerate-voxel-button"
        >
          {isRegenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
              Regenerating...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Try Different Style
            </>
          )}
        </Button>

        {/* Tertiary Action: Cancel */}
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={isDisabled}
          className="w-full sm:w-auto"
          data-testid="cancel-voxel-button"
        >
          <X className="h-4 w-4 mr-2" aria-hidden="true" />
          Start Over
        </Button>
      </CardFooter>
    </Card>
  );
}
