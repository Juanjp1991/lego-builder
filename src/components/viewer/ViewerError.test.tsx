import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewerError } from './ViewerError';

describe('ViewerError', () => {
    it('renders with default error message', () => {
        const onRetry = vi.fn();
        render(<ViewerError onRetry={onRetry} />);

        expect(screen.getByText('Loading issue, please try again')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('renders with custom error message', () => {
        const onRetry = vi.fn();
        render(<ViewerError onRetry={onRetry} message="Custom error message" />);

        expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('calls onRetry when button is clicked', () => {
        const onRetry = vi.fn();
        render(<ViewerError onRetry={onRetry} />);

        const button = screen.getByRole('button', { name: /try again/i });
        fireEvent.click(button);

        expect(onRetry).toHaveBeenCalled();
    });

    it('has accessible alert role', () => {
        const onRetry = vi.fn();
        render(<ViewerError onRetry={onRetry} />);

        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
    });

    it('applies custom className', () => {
        const onRetry = vi.fn();
        const { container } = render(
            <ViewerError onRetry={onRetry} className="custom-class" />
        );

        expect(container.firstChild).toHaveClass('custom-class');
    });

    it('button has minimum touch target size classes', () => {
        const onRetry = vi.fn();
        render(<ViewerError onRetry={onRetry} />);

        const button = screen.getByRole('button', { name: /try again/i });
        // Check for minimum touch target class
        expect(button.className).toContain('min-h-[44px]');
    });
});
