import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrePermissionScreen } from './PrePermissionScreen';

describe('PrePermissionScreen', () => {
  const defaultProps = {
    onRequestPermission: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the title and description', () => {
      render(<PrePermissionScreen {...defaultProps} />);

      expect(screen.getByText("Let's scan your bricks!")).toBeInTheDocument();
      expect(
        screen.getByText(/To identify your LEGO pieces, we need to use your camera/)
      ).toBeInTheDocument();
    });

    it('should render privacy assurance message', () => {
      render(<PrePermissionScreen {...defaultProps} />);

      expect(screen.getByText('Your privacy is protected')).toBeInTheDocument();
      expect(
        screen.getByText(/Photos stay on your device/)
      ).toBeInTheDocument();
    });

    it('should render Allow Camera button', () => {
      render(<PrePermissionScreen {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /Allow Camera/i })
      ).toBeInTheDocument();
    });

  });

  describe('accessibility', () => {
    it('should have dialog role', () => {
      render(<PrePermissionScreen {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-labelledby pointing to title', () => {
      render(<PrePermissionScreen {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'permission-title');
    });

    it('should have aria-describedby pointing to description', () => {
      render(<PrePermissionScreen {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-describedby', 'permission-description');
    });

    it('should have proper button test ids', () => {
      render(<PrePermissionScreen {...defaultProps} />);

      expect(screen.getByTestId('allow-camera-button')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onRequestPermission when Allow Camera is clicked', () => {
      const onRequestPermission = vi.fn();
      render(<PrePermissionScreen onRequestPermission={onRequestPermission} />);

      fireEvent.click(screen.getByTestId('allow-camera-button'));

      expect(onRequestPermission).toHaveBeenCalledOnce();
    });

  });

  describe('loading state', () => {
    it('should disable Allow Camera button when loading', () => {
      render(<PrePermissionScreen {...defaultProps} isLoading={true} />);

      expect(screen.getByTestId('allow-camera-button')).toBeDisabled();
    });

    it('should show loading text when loading', () => {
      render(<PrePermissionScreen {...defaultProps} isLoading={true} />);

      expect(screen.getByText(/Requesting camera access/i)).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(
        <PrePermissionScreen {...defaultProps} className="custom-class" />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('custom-class');
    });

    it('should have min-h-[44px] for touch targets on buttons', () => {
      render(<PrePermissionScreen {...defaultProps} />);

      const allowButton = screen.getByTestId('allow-camera-button');
      expect(allowButton).toHaveClass('min-h-[44px]');
    });
  });
});
