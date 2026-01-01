import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PermissionDeniedScreen } from './PermissionDeniedScreen';
import type { CameraError } from '@/lib/camera/types';

describe('PermissionDeniedScreen', () => {
  const defaultProps = {
    error: null,
    onRetry: vi.fn(),
    onGoBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the title', () => {
      render(<PermissionDeniedScreen {...defaultProps} />);

      expect(screen.getByText('Camera Access Needed')).toBeInTheDocument();
    });

    it('should render default error message when no error provided', () => {
      render(<PermissionDeniedScreen {...defaultProps} />);

      expect(
        screen.getByText('Camera permission was denied')
      ).toBeInTheDocument();
    });

    it('should render custom error message from error prop', () => {
      const error: CameraError = {
        code: 'DEVICE_NOT_FOUND',
        message: 'No camera found on this device',
        recoveryHint: 'Connect a camera and try again',
      };
      render(<PermissionDeniedScreen {...defaultProps} error={error} />);

      expect(
        screen.getByText('No camera found on this device')
      ).toBeInTheDocument();
    });

    it('should render recovery hint from error prop', () => {
      const error: CameraError = {
        code: 'PERMISSION_DENIED',
        message: 'Permission denied',
        recoveryHint: 'Enable camera in your browser settings',
      };
      render(<PermissionDeniedScreen {...defaultProps} error={error} />);

      expect(
        screen.getByText('Enable camera in your browser settings')
      ).toBeInTheDocument();
    });

    it('should render Try Again button', () => {
      render(<PermissionDeniedScreen {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /Try Again/i })
      ).toBeInTheDocument();
    });

    it('should render Not Now button', () => {
      render(<PermissionDeniedScreen {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /Not Now/i })
      ).toBeInTheDocument();
    });

    it('should render How to enable camera section', () => {
      render(<PermissionDeniedScreen {...defaultProps} />);

      expect(screen.getByText('How to enable camera')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have alert role from Alert component', () => {
      render(<PermissionDeniedScreen {...defaultProps} />);

      // Alert component has role="alert"
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-live polite on the container', () => {
      render(<PermissionDeniedScreen {...defaultProps} />);

      // The card container has aria-live="polite"
      const container = screen.getByText('Camera Access Needed').closest('[aria-live]');
      expect(container).toHaveAttribute('aria-live', 'polite');
    });

    it('should have proper button test ids', () => {
      render(<PermissionDeniedScreen {...defaultProps} />);

      expect(screen.getByTestId('retry-permission-button')).toBeInTheDocument();
      expect(screen.getByTestId('go-back-button')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onRetry when Try Again is clicked', () => {
      const onRetry = vi.fn();
      render(<PermissionDeniedScreen {...defaultProps} onRetry={onRetry} />);

      fireEvent.click(screen.getByTestId('retry-permission-button'));

      expect(onRetry).toHaveBeenCalledOnce();
    });

    it('should call onGoBack when Not Now is clicked', () => {
      const onGoBack = vi.fn();
      render(<PermissionDeniedScreen {...defaultProps} onGoBack={onGoBack} />);

      fireEvent.click(screen.getByTestId('go-back-button'));

      expect(onGoBack).toHaveBeenCalledOnce();
    });
  });

  describe('loading state', () => {
    it('should disable Try Again button when retrying', () => {
      render(<PermissionDeniedScreen {...defaultProps} isRetrying={true} />);

      expect(screen.getByTestId('retry-permission-button')).toBeDisabled();
    });

    it('should show loading text when retrying', () => {
      render(<PermissionDeniedScreen {...defaultProps} isRetrying={true} />);

      expect(screen.getByText(/Requesting camera access/i)).toBeInTheDocument();
    });

    it('should disable Not Now button when retrying', () => {
      render(<PermissionDeniedScreen {...defaultProps} isRetrying={true} />);

      expect(screen.getByTestId('go-back-button')).toBeDisabled();
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(
        <PermissionDeniedScreen {...defaultProps} className="custom-class" />
      );

      // Find the card with aria-live (the main container)
      const container = screen.getByText('Camera Access Needed').closest('[aria-live]');
      expect(container).toHaveClass('custom-class');
    });

    it('should have min-h-[44px] for touch targets on buttons', () => {
      render(<PermissionDeniedScreen {...defaultProps} />);

      const retryButton = screen.getByTestId('retry-permission-button');
      const goBackButton = screen.getByTestId('go-back-button');

      expect(retryButton).toHaveClass('min-h-[44px]');
      expect(goBackButton).toHaveClass('min-h-[44px]');
    });
  });

  describe('browser detection', () => {
    it('should show default instructions when error has no recovery hint', () => {
      render(<PermissionDeniedScreen {...defaultProps} error={null} />);

      // Should show browser instructions in the alert (varies by test environment)
      // Look for "How to enable camera" heading which contains instructions
      expect(screen.getByText('How to enable camera')).toBeInTheDocument();
      // The instructions should mention settings or similar
      expect(
        screen.getByText(/settings|address bar/i)
      ).toBeInTheDocument();
    });
  });
});
