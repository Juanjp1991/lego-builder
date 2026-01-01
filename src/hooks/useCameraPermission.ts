'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  CameraPermissionState,
  CameraError,
  CameraErrorCode,
} from '@/lib/camera/types';
import { createCameraError } from '@/lib/camera/types';

/**
 * Return type for the useCameraPermission hook.
 */
export interface UseCameraPermissionReturn {
  /** Current permission state: 'prompt' | 'granted' | 'denied' */
  state: CameraPermissionState;
  /** Error details if permission check/request failed */
  error: CameraError | null;
  /** True while checking initial permission state */
  isChecking: boolean;
  /** Request camera permission from user */
  requestPermission: () => Promise<boolean>;
  /** Retry permission request after denial */
  retryPermission: () => Promise<boolean>;
}

/**
 * Hook for managing camera permission state and requests.
 *
 * Features:
 * - Checks initial permission state on mount
 * - Handles all error cases with user-friendly messages
 * - Stops camera stream after permission check
 * - Listens for permission state changes
 *
 * @example
 * ```tsx
 * const { state, error, isChecking, requestPermission } = useCameraPermission();
 *
 * if (isChecking) return <Loading />;
 * if (state === 'denied') return <PermissionDenied error={error} />;
 * if (state === 'prompt') return <RequestPermission onRequest={requestPermission} />;
 * return <CameraView />;
 * ```
 */
export function useCameraPermission(): UseCameraPermissionReturn {
  const [state, setState] = useState<CameraPermissionState>('prompt');
  const [error, setError] = useState<CameraError | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Track if component is mounted to avoid state updates after unmount
  const isMountedRef = useRef(true);
  // Store cleanup function for permission change listener
  const cleanupRef = useRef<(() => void) | null>(null);

  /**
   * Validate and convert permission state string to our type.
   * Returns 'prompt' for any unrecognized state (safe default).
   */
  const validatePermissionState = (state: string): CameraPermissionState => {
    if (state === 'granted' || state === 'denied' || state === 'prompt') {
      return state;
    }
    // Unknown state - default to prompt (safest option)
    console.warn(`Unknown permission state: ${state}, defaulting to 'prompt'`);
    return 'prompt';
  };

  // Check initial permission state on mount
  useEffect(() => {
    isMountedRef.current = true;

    const checkPermission = async () => {
      try {
        // Feature detection - check if mediaDevices API exists
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          if (isMountedRef.current) {
            setError(createCameraError('NOT_SUPPORTED'));
            setState('denied');
            setIsChecking(false);
          }
          return;
        }

        // Check secure context (HTTPS or localhost required)
        if (typeof window !== 'undefined' && !window.isSecureContext) {
          if (isMountedRef.current) {
            setError(createCameraError('NOT_SECURE_CONTEXT'));
            setState('denied');
            setIsChecking(false);
          }
          return;
        }

        // Query permission state if Permissions API is supported
        if (navigator.permissions?.query) {
          try {
            const result = await navigator.permissions.query({
              name: 'camera' as PermissionName,
            });

            if (isMountedRef.current) {
              setState(validatePermissionState(result.state));
            }

            // Listen for permission changes
            const handleChange = () => {
              if (isMountedRef.current) {
                setState(validatePermissionState(result.state));
                // Clear error if permission is now granted
                if (result.state === 'granted') {
                  setError(null);
                }
              }
            };

            result.addEventListener('change', handleChange);

            // Store cleanup function in ref so useEffect cleanup can access it
            cleanupRef.current = () => {
              result.removeEventListener('change', handleChange);
            };
          } catch {
            // Permissions API query failed (e.g., Firefox doesn't support camera query)
            // Fall through to 'prompt' state - will check on actual request
            console.warn('Permissions API query not supported, will check on request');
          }
        }
      } catch (err) {
        console.error('Error checking camera permission:', err);
      } finally {
        if (isMountedRef.current) {
          setIsChecking(false);
        }
      }
    };

    checkPermission();

    // Cleanup function - runs on unmount
    return () => {
      isMountedRef.current = false;
      // Call stored cleanup if it exists
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  /**
   * Request camera permission by calling getUserMedia.
   * Stops the stream immediately after permission is granted.
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    // Clear previous error
    setError(null);

    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera for scanning
        },
      });

      // CRITICAL: Stop all tracks immediately - we just needed permission
      stream.getTracks().forEach((track) => track.stop());

      if (isMountedRef.current) {
        setState('granted');
      }

      return true;
    } catch (err) {
      const error = err as DOMException;
      let errorCode: CameraErrorCode = 'UNKNOWN_ERROR';

      // Map DOMException to our error codes
      switch (error.name) {
        case 'NotAllowedError':
          errorCode = 'PERMISSION_DENIED';
          break;
        case 'NotFoundError':
          errorCode = 'DEVICE_NOT_FOUND';
          break;
        case 'NotReadableError':
        case 'AbortError':
          errorCode = 'DEVICE_IN_USE';
          break;
        case 'OverconstrainedError':
          // Fallback to any camera if environment camera not found
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              video: true,
            });
            fallbackStream.getTracks().forEach((track) => track.stop());

            if (isMountedRef.current) {
              setState('granted');
            }
            return true;
          } catch {
            errorCode = 'DEVICE_NOT_FOUND';
          }
          break;
        case 'SecurityError':
          errorCode = 'NOT_SECURE_CONTEXT';
          break;
        default:
          errorCode = 'UNKNOWN_ERROR';
      }

      console.error('Camera permission error:', error.name, error.message);

      if (isMountedRef.current) {
        setError(createCameraError(errorCode));
        setState('denied');
      }

      return false;
    }
  }, []);

  return {
    state,
    error,
    isChecking,
    requestPermission,
    retryPermission: requestPermission, // Retry uses same logic
  };
}
