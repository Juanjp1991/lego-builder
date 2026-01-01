'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { PrePermissionScreen } from './PrePermissionScreen';
import { PermissionDeniedScreen } from './PermissionDeniedScreen';
import { LoadingState } from '@/components/shared/LoadingState';
import { usePostHog } from 'posthog-js/react';

interface CameraPermissionFlowProps {
  /** Callback when camera permission is granted */
  onPermissionGranted: () => void;
  /** Callback when user cancels/goes back */
  onCancel: () => void;
}

/**
 * Orchestrates the complete camera permission flow.
 *
 * States:
 * - checking: Initial state while querying permission status
 * - prompt: Show pre-permission explanation screen
 * - requesting: Browser permission dialog is open
 * - granted: Permission granted, triggers callback
 * - denied: Permission denied, show recovery options
 *
 * @example
 * ```tsx
 * <CameraPermissionFlow
 *   onPermissionGranted={() => router.push('/scan/camera')}
 *   onCancel={() => router.back()}
 * />
 * ```
 */
export function CameraPermissionFlow({
  onPermissionGranted,
  onCancel,
}: CameraPermissionFlowProps) {
  const posthog = usePostHog();
  const { state, error, isChecking, requestPermission } = useCameraPermission();
  const [isRequesting, setIsRequesting] = useState(false);
  // Use ref instead of state to prevent re-renders and ensure single invocation
  const hasCalledGrantedRef = useRef(false);

  // Handle permission request
  const handleRequestPermission = useCallback(async () => {
    setIsRequesting(true);
    try {
      posthog?.capture('camera_permission_requested');
    } catch {
      // Silently ignore PostHog errors
    }

    const granted = await requestPermission();

    try {
      if (granted) {
        posthog?.capture('camera_permission_granted');
      } else {
        posthog?.capture('camera_permission_denied');
      }
    } catch {
      // Silently ignore PostHog errors
    }

    setIsRequesting(false);
  }, [requestPermission, posthog]);

  // Handle learn more click - removed as per F9 fix
  // The button is removed from PrePermissionScreen

  // Handle when permission is granted (either initially or after request)
  useEffect(() => {
    if (state === 'granted' && !isChecking && !hasCalledGrantedRef.current) {
      hasCalledGrantedRef.current = true;
      onPermissionGranted();
    }
  }, [state, isChecking, onPermissionGranted]);

  // Loading state while checking permission
  if (isChecking) {
    return (
      <div
        className="flex items-center justify-center min-h-[400px]"
        data-testid="permission-checking"
      >
        <LoadingState />
      </div>
    );
  }

  // Already granted - show loading while callback is triggered
  if (state === 'granted') {
    return (
      <div
        className="flex items-center justify-center min-h-[400px]"
        data-testid="permission-granted"
      >
        <LoadingState />
      </div>
    );
  }

  // Permission denied - show recovery screen
  if (state === 'denied') {
    return (
      <div
        className="flex items-center justify-center min-h-[400px] p-4"
        data-testid="permission-denied"
      >
        <PermissionDeniedScreen
          error={error}
          onRetry={handleRequestPermission}
          onGoBack={onCancel}
          isRetrying={isRequesting}
        />
      </div>
    );
  }

  // Default: prompt state - show pre-permission screen
  return (
    <div
      className="flex items-center justify-center min-h-[400px] p-4"
      data-testid="permission-prompt"
    >
      <PrePermissionScreen
        onRequestPermission={handleRequestPermission}
        isLoading={isRequesting}
      />
    </div>
  );
}
