import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCameraPermission } from './useCameraPermission';

// Store original values
const originalMediaDevices = navigator.mediaDevices;
const originalPermissions = navigator.permissions;

// Mock functions
const mockGetUserMedia = vi.fn();
const mockQuery = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

describe('useCameraPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mocks
    mockQuery.mockResolvedValue({
      state: 'prompt',
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    });

    // Mock mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
      },
      configurable: true,
    });

    // Mock permissions
    Object.defineProperty(navigator, 'permissions', {
      value: {
        query: mockQuery,
      },
      configurable: true,
    });

    // Mock secure context
    vi.stubGlobal('isSecureContext', true);
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
    });
    Object.defineProperty(navigator, 'permissions', {
      value: originalPermissions,
      configurable: true,
    });
    vi.unstubAllGlobals();
  });

  describe('initial state', () => {
    it('should start with isChecking true', () => {
      const { result } = renderHook(() => useCameraPermission());
      expect(result.current.isChecking).toBe(true);
    });

    it('should set state from permissions query', async () => {
      mockQuery.mockResolvedValue({
        state: 'granted',
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      });

      const { result } = renderHook(() => useCameraPermission());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(result.current.state).toBe('granted');
      expect(result.current.error).toBeNull();
    });

    it('should handle denied state from permissions query', async () => {
      mockQuery.mockResolvedValue({
        state: 'denied',
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      });

      const { result } = renderHook(() => useCameraPermission());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(result.current.state).toBe('denied');
    });
  });

  describe('feature detection', () => {
    it('should handle missing mediaDevices API', async () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        configurable: true,
      });

      const { result } = renderHook(() => useCameraPermission());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(result.current.state).toBe('denied');
      expect(result.current.error?.code).toBe('NOT_SUPPORTED');
    });

    it('should handle insecure context', async () => {
      vi.stubGlobal('isSecureContext', false);

      const { result } = renderHook(() => useCameraPermission());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(result.current.state).toBe('denied');
      expect(result.current.error?.code).toBe('NOT_SECURE_CONTEXT');
    });
  });

  describe('requestPermission', () => {
    it('should grant permission on successful getUserMedia', async () => {
      const mockStream = {
        getTracks: () => [{ stop: vi.fn() }],
      };
      mockGetUserMedia.mockResolvedValue(mockStream);

      const { result } = renderHook(() => useCameraPermission());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      let granted: boolean = false;
      await act(async () => {
        granted = await result.current.requestPermission();
      });

      expect(granted).toBe(true);
      expect(result.current.state).toBe('granted');
      expect(result.current.error).toBeNull();
    });

    it('should stop all tracks after permission is granted', async () => {
      const mockStop = vi.fn();
      const mockStream = {
        getTracks: () => [{ stop: mockStop }, { stop: mockStop }],
      };
      mockGetUserMedia.mockResolvedValue(mockStream);

      const { result } = renderHook(() => useCameraPermission());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(mockStop).toHaveBeenCalledTimes(2);
    });

    it('should handle NotAllowedError', async () => {
      const error = new DOMException('Permission denied', 'NotAllowedError');
      mockGetUserMedia.mockRejectedValue(error);

      const { result } = renderHook(() => useCameraPermission());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      let granted: boolean = true;
      await act(async () => {
        granted = await result.current.requestPermission();
      });

      expect(granted).toBe(false);
      expect(result.current.state).toBe('denied');
      expect(result.current.error?.code).toBe('PERMISSION_DENIED');
    });

    it('should handle NotFoundError', async () => {
      const error = new DOMException('No camera', 'NotFoundError');
      mockGetUserMedia.mockRejectedValue(error);

      const { result } = renderHook(() => useCameraPermission());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.error?.code).toBe('DEVICE_NOT_FOUND');
    });

    it('should handle NotReadableError', async () => {
      const error = new DOMException('Camera in use', 'NotReadableError');
      mockGetUserMedia.mockRejectedValue(error);

      const { result } = renderHook(() => useCameraPermission());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.error?.code).toBe('DEVICE_IN_USE');
    });

    it('should request camera with environment facing mode', async () => {
      const mockStream = {
        getTracks: () => [{ stop: vi.fn() }],
      };
      mockGetUserMedia.mockResolvedValue(mockStream);

      const { result } = renderHook(() => useCameraPermission());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: {
          facingMode: 'environment',
        },
      });
    });
  });

  describe('retryPermission', () => {
    it('should be same function as requestPermission', async () => {
      const { result } = renderHook(() => useCameraPermission());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(result.current.retryPermission).toBe(result.current.requestPermission);
    });

    it('should clear previous error on retry', async () => {
      const error = new DOMException('Permission denied', 'NotAllowedError');
      mockGetUserMedia.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useCameraPermission());

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      // First request fails
      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.error).not.toBeNull();

      // Set up success for retry
      const mockStream = {
        getTracks: () => [{ stop: vi.fn() }],
      };
      mockGetUserMedia.mockResolvedValue(mockStream);

      // Retry succeeds
      await act(async () => {
        await result.current.retryPermission();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.state).toBe('granted');
    });
  });
});
