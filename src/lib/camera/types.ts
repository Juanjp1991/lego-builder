/**
 * Camera permission types and constants for brick scanning feature.
 * @module lib/camera/types
 */

/**
 * Camera permission states matching the Permissions API.
 * - 'prompt': User hasn't been asked yet
 * - 'granted': User allowed camera access
 * - 'denied': User denied camera access
 */
export type CameraPermissionState = 'prompt' | 'granted' | 'denied';

/**
 * Camera error with user-friendly message and recovery hint.
 */
export interface CameraError {
  /** Machine-readable error code */
  code: CameraErrorCode;
  /** User-friendly error message */
  message: string;
  /** Actionable hint for recovery */
  recoveryHint: string;
}

/**
 * Standard camera error codes.
 */
export type CameraErrorCode =
  | 'PERMISSION_DENIED'
  | 'NOT_SUPPORTED'
  | 'NOT_SECURE_CONTEXT'
  | 'DEVICE_NOT_FOUND'
  | 'DEVICE_IN_USE'
  | 'UNKNOWN_ERROR';

/**
 * Error code constants for consistent error handling.
 */
export const CAMERA_ERROR_CODES = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_SUPPORTED: 'NOT_SUPPORTED',
  NOT_SECURE_CONTEXT: 'NOT_SECURE_CONTEXT',
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  DEVICE_IN_USE: 'DEVICE_IN_USE',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Default error messages and recovery hints for each error type.
 */
export const CAMERA_ERROR_MESSAGES: Record<
  CameraErrorCode,
  { message: string; recoveryHint: string }
> = {
  PERMISSION_DENIED: {
    message: 'Camera permission was denied',
    recoveryHint: 'You can enable camera access in your browser settings',
  },
  NOT_SUPPORTED: {
    message: 'Camera not supported on this device',
    recoveryHint: 'Try using a different browser like Chrome or Safari',
  },
  NOT_SECURE_CONTEXT: {
    message: 'Camera requires a secure connection',
    recoveryHint: 'Make sure you are accessing the app via HTTPS',
  },
  DEVICE_NOT_FOUND: {
    message: 'No camera found on this device',
    recoveryHint: 'Make sure your camera is connected and not in use by another app',
  },
  DEVICE_IN_USE: {
    message: 'Camera is being used by another application',
    recoveryHint: 'Close other apps using the camera and try again',
  },
  UNKNOWN_ERROR: {
    message: 'Unable to access camera',
    recoveryHint: 'Please try again or restart your browser',
  },
};

/**
 * Create a CameraError from an error code.
 */
export function createCameraError(code: CameraErrorCode): CameraError {
  const { message, recoveryHint } = CAMERA_ERROR_MESSAGES[code];
  return { code, message, recoveryHint };
}
