import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CameraPermissionFlow } from './CameraPermissionFlow';

// Store original values
const originalMediaDevices = navigator.mediaDevices;
const originalPermissions = navigator.permissions;

// Mock PostHog
vi.mock('posthog-js/react', () => ({
  usePostHog: () => ({
    capture: vi.fn(),
  }),
}));

// Mock functions
const mockGetUserMedia = vi.fn();
const mockQuery = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

describe('CameraPermissionFlow', () => {
  const defaultProps = {
    onPermissionGranted: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: prompt state
    mockQuery.mockResolvedValue({
      state: 'prompt',
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
      },
      configurable: true,
    });

    Object.defineProperty(navigator, 'permissions', {
      value: {
        query: mockQuery,
      },
      configurable: true,
    });

    vi.stubGlobal('isSecureContext', true);
  });

  afterEach(() => {
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

  describe('checking state', () => {
    it('should show loading state initially', () => {
      // Make query never resolve to keep in checking state
      mockQuery.mockImplementation(() => new Promise(() => {}));

      render(<CameraPermissionFlow {...defaultProps} />);

      expect(screen.getByTestId('permission-checking')).toBeInTheDocument();
      // LoadingState shows default phase message
      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    });
  });

  describe('prompt state', () => {
    it('should show PrePermissionScreen when permission is prompt', async () => {
      render(<CameraPermissionFlow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('permission-prompt')).toBeInTheDocument();
      });

      expect(screen.getByText("Let's scan your bricks!")).toBeInTheDocument();
    });

    it('should call requestPermission when Allow Camera is clicked', async () => {
      const mockStream = {
        getTracks: () => [{ stop: vi.fn() }],
      };
      mockGetUserMedia.mockResolvedValue(mockStream);

      render(<CameraPermissionFlow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('permission-prompt')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('allow-camera-button'));

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
    });
  });

  describe('granted state', () => {
    it('should call onPermissionGranted when permission is already granted', async () => {
      mockQuery.mockResolvedValue({
        state: 'granted',
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      });

      const onPermissionGranted = vi.fn();
      render(
        <CameraPermissionFlow
          {...defaultProps}
          onPermissionGranted={onPermissionGranted}
        />
      );

      await waitFor(() => {
        expect(onPermissionGranted).toHaveBeenCalledOnce();
      });
    });

    it('should show loading state when granted', async () => {
      mockQuery.mockResolvedValue({
        state: 'granted',
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      });

      render(<CameraPermissionFlow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('permission-granted')).toBeInTheDocument();
      });

      // LoadingState shows default phase message
      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    });
  });

  describe('denied state', () => {
    it('should show PermissionDeniedScreen when permission is denied', async () => {
      mockQuery.mockResolvedValue({
        state: 'denied',
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      });

      render(<CameraPermissionFlow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('permission-denied')).toBeInTheDocument();
      });

      expect(screen.getByText('Camera Access Needed')).toBeInTheDocument();
    });

    it('should call onCancel when Not Now is clicked', async () => {
      mockQuery.mockResolvedValue({
        state: 'denied',
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      });

      const onCancel = vi.fn();
      render(<CameraPermissionFlow {...defaultProps} onCancel={onCancel} />);

      await waitFor(() => {
        expect(screen.getByTestId('permission-denied')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('go-back-button'));

      expect(onCancel).toHaveBeenCalledOnce();
    });

    it('should allow retry when Try Again is clicked', async () => {
      mockQuery.mockResolvedValue({
        state: 'denied',
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      });

      const mockStream = {
        getTracks: () => [{ stop: vi.fn() }],
      };
      mockGetUserMedia.mockResolvedValue(mockStream);

      render(<CameraPermissionFlow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('permission-denied')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('retry-permission-button'));

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
    });
  });

  describe('permission flow', () => {
    it('should transition from prompt to granted after successful request', async () => {
      const mockStream = {
        getTracks: () => [{ stop: vi.fn() }],
      };
      mockGetUserMedia.mockResolvedValue(mockStream);

      const onPermissionGranted = vi.fn();
      render(
        <CameraPermissionFlow
          {...defaultProps}
          onPermissionGranted={onPermissionGranted}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('permission-prompt')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('allow-camera-button'));

      await waitFor(() => {
        expect(onPermissionGranted).toHaveBeenCalledOnce();
      });
    });

    it('should transition from prompt to denied after rejected request', async () => {
      const error = new DOMException('Permission denied', 'NotAllowedError');
      mockGetUserMedia.mockRejectedValue(error);

      render(<CameraPermissionFlow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('permission-prompt')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('allow-camera-button'));

      await waitFor(() => {
        expect(screen.getByTestId('permission-denied')).toBeInTheDocument();
      });
    });
  });
});
