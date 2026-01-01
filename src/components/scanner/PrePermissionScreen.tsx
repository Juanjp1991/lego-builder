'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Camera, Shield, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrePermissionScreenProps {
  /** Callback when user clicks "Allow Camera" */
  onRequestPermission: () => void;
  /** Show loading state during permission request */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Pre-permission explanation screen shown before requesting camera access.
 * Explains why camera is needed and provides privacy assurance.
 *
 * @example
 * ```tsx
 * <PrePermissionScreen
 *   onRequestPermission={handleRequest}
 *   onLearnMore={handleLearnMore}
 *   isLoading={isRequesting}
 * />
 * ```
 */
export function PrePermissionScreen({
  onRequestPermission,
  isLoading = false,
  className,
}: PrePermissionScreenProps) {
  return (
    <Card
      className={cn('max-w-md mx-auto', className)}
      role="dialog"
      aria-labelledby="permission-title"
      aria-describedby="permission-description"
    >
      <CardHeader className="text-center">
        {/* Camera Icon */}
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Camera
            className="h-10 w-10 text-primary"
            aria-hidden="true"
          />
        </div>

        <CardTitle id="permission-title" className="text-2xl">
          Let&apos;s scan your bricks!
        </CardTitle>

        <CardDescription id="permission-description" className="text-base mt-2">
          To identify your LEGO pieces, we need to use your camera.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Privacy Assurance */}
        <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
          <Shield
            className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium">Your privacy is protected</p>
            <p className="text-sm text-muted-foreground">
              Photos stay on your device — we never store them on our servers.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={onRequestPermission}
            disabled={isLoading}
            size="lg"
            className="w-full min-h-[44px]"
            data-testid="allow-camera-button"
          >
            {isLoading ? (
              <>
                <Loader2
                  className="mr-2 h-5 w-5 animate-spin"
                  aria-hidden="true"
                />
                <span>Requesting camera access...</span>
              </>
            ) : (
              <>
                <Camera className="mr-2 h-5 w-5" aria-hidden="true" />
                Allow Camera
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
