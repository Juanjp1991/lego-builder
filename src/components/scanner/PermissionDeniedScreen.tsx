'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CameraOff, Settings, RefreshCw, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CameraError } from '@/lib/camera/types';

interface PermissionDeniedScreenProps {
  /** Camera error with details and recovery hint */
  error: CameraError | null;
  /** Callback when user clicks "Try Again" */
  onRetry: () => void;
  /** Callback when user clicks "Not Now" to go back */
  onGoBack: () => void;
  /** Show loading state during retry */
  isRetrying?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get browser-specific instructions for re-enabling camera permission.
 */
function getBrowserInstructions(): string {
  if (typeof navigator === 'undefined') {
    return 'Open your browser settings and allow camera access for this site';
  }

  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes('chrome') && !ua.includes('edge')) {
    return 'Click the lock icon in the address bar → Site settings → Camera → Allow';
  }
  if (ua.includes('safari') && !ua.includes('chrome')) {
    return 'Safari → Settings → Websites → Camera → Allow for this site';
  }
  if (ua.includes('firefox')) {
    return 'Click the camera icon in the address bar → Clear permission → Refresh page';
  }
  if (ua.includes('edge')) {
    return 'Click the lock icon → Site permissions → Camera → Allow';
  }

  return 'Open your browser settings and allow camera access for this site';
}

/**
 * Screen shown when camera permission is denied.
 * Provides browser-specific instructions for re-enabling and retry options.
 *
 * @example
 * ```tsx
 * <PermissionDeniedScreen
 *   error={cameraError}
 *   onRetry={handleRetry}
 *   onGoBack={handleGoBack}
 *   isRetrying={isRetrying}
 * />
 * ```
 */
export function PermissionDeniedScreen({
  error,
  onRetry,
  onGoBack,
  isRetrying = false,
  className,
}: PermissionDeniedScreenProps) {
  const browserInstructions = getBrowserInstructions();

  return (
    <Card
      className={cn('max-w-md mx-auto', className)}
      aria-live="polite"
    >
      <CardHeader className="text-center">
        {/* Denied Icon */}
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <CameraOff
            className="h-10 w-10 text-destructive"
            aria-hidden="true"
          />
        </div>

        <CardTitle className="text-2xl">Camera Access Needed</CardTitle>

        <CardDescription className="text-base mt-2">
          {error?.message || 'Camera permission was denied'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Recovery Instructions */}
        <Alert>
          <Settings className="h-4 w-4" />
          <AlertTitle>How to enable camera</AlertTitle>
          <AlertDescription className="mt-2">
            {error?.recoveryHint || browserInstructions}
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            size="lg"
            className="w-full min-h-[44px]"
            data-testid="retry-permission-button"
          >
            {isRetrying ? (
              <>
                <Loader2
                  className="mr-2 h-5 w-5 animate-spin"
                  aria-hidden="true"
                />
                <span>Requesting camera access...</span>
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-5 w-5" aria-hidden="true" />
                Try Again
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={onGoBack}
            disabled={isRetrying}
            className="w-full min-h-[44px]"
            data-testid="go-back-button"
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Not Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
