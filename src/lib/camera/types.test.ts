import { describe, it, expect } from 'vitest';
import {
  CAMERA_ERROR_CODES,
  CAMERA_ERROR_MESSAGES,
  createCameraError,
  type CameraPermissionState,
  type CameraError,
  type CameraErrorCode,
} from './types';

describe('Camera Types', () => {
  describe('CameraPermissionState', () => {
    it('should allow valid permission states', () => {
      const states: CameraPermissionState[] = ['prompt', 'granted', 'denied'];
      expect(states).toHaveLength(3);
    });
  });

  describe('CAMERA_ERROR_CODES', () => {
    it('should have all required error codes', () => {
      expect(CAMERA_ERROR_CODES.PERMISSION_DENIED).toBe('PERMISSION_DENIED');
      expect(CAMERA_ERROR_CODES.NOT_SUPPORTED).toBe('NOT_SUPPORTED');
      expect(CAMERA_ERROR_CODES.NOT_SECURE_CONTEXT).toBe('NOT_SECURE_CONTEXT');
      expect(CAMERA_ERROR_CODES.DEVICE_NOT_FOUND).toBe('DEVICE_NOT_FOUND');
      expect(CAMERA_ERROR_CODES.DEVICE_IN_USE).toBe('DEVICE_IN_USE');
      expect(CAMERA_ERROR_CODES.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
    });
  });

  describe('CAMERA_ERROR_MESSAGES', () => {
    it('should have messages for all error codes', () => {
      const codes: CameraErrorCode[] = [
        'PERMISSION_DENIED',
        'NOT_SUPPORTED',
        'NOT_SECURE_CONTEXT',
        'DEVICE_NOT_FOUND',
        'DEVICE_IN_USE',
        'UNKNOWN_ERROR',
      ];

      codes.forEach((code) => {
        expect(CAMERA_ERROR_MESSAGES[code]).toBeDefined();
        expect(CAMERA_ERROR_MESSAGES[code].message).toBeTruthy();
        expect(CAMERA_ERROR_MESSAGES[code].recoveryHint).toBeTruthy();
      });
    });

    it('should have user-friendly messages', () => {
      // Messages should not contain technical jargon
      expect(CAMERA_ERROR_MESSAGES.PERMISSION_DENIED.message).not.toContain(
        'NotAllowedError'
      );
      expect(CAMERA_ERROR_MESSAGES.NOT_SUPPORTED.message).not.toContain(
        'getUserMedia'
      );
    });
  });

  describe('createCameraError', () => {
    it('should create error with correct code, message, and hint', () => {
      const error: CameraError = createCameraError('PERMISSION_DENIED');

      expect(error.code).toBe('PERMISSION_DENIED');
      expect(error.message).toBe(CAMERA_ERROR_MESSAGES.PERMISSION_DENIED.message);
      expect(error.recoveryHint).toBe(
        CAMERA_ERROR_MESSAGES.PERMISSION_DENIED.recoveryHint
      );
    });

    it('should create errors for all error codes', () => {
      const codes: CameraErrorCode[] = [
        'PERMISSION_DENIED',
        'NOT_SUPPORTED',
        'NOT_SECURE_CONTEXT',
        'DEVICE_NOT_FOUND',
        'DEVICE_IN_USE',
        'UNKNOWN_ERROR',
      ];

      codes.forEach((code) => {
        const error = createCameraError(code);
        expect(error.code).toBe(code);
        expect(error.message).toBeTruthy();
        expect(error.recoveryHint).toBeTruthy();
      });
    });
  });
});
