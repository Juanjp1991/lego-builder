/**
 * RetryButton Component Tests
 *
 * @see Story 2.4: Add Free Retry Mechanism
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RetryButton } from './RetryButton';

describe('RetryButton', () => {
    describe('Rendering', () => {
        it('renders with correct text when retries available', () => {
            render(
                <RetryButton
                    onRetry={() => {}}
                    retryCount={0}
                    maxRetries={3}
                />
            );

            expect(screen.getByText('Try Again (3 left)')).toBeInTheDocument();
        });

        it('shows correct remaining count after first retry', () => {
            render(
                <RetryButton
                    onRetry={() => {}}
                    retryCount={1}
                    maxRetries={3}
                />
            );

            expect(screen.getByText('Try Again (2 left)')).toBeInTheDocument();
        });

        it('shows correct remaining count after second retry', () => {
            render(
                <RetryButton
                    onRetry={() => {}}
                    retryCount={2}
                    maxRetries={3}
                />
            );

            expect(screen.getByText('Try Again (1 left)')).toBeInTheDocument();
        });

        it('shows "No retries left" when exhausted', () => {
            render(
                <RetryButton
                    onRetry={() => {}}
                    retryCount={3}
                    maxRetries={3}
                />
            );

            expect(screen.getByText('No retries left')).toBeInTheDocument();
        });

        it('has rotate icon', () => {
            render(
                <RetryButton
                    onRetry={() => {}}
                    retryCount={0}
                    maxRetries={3}
                />
            );

            const button = screen.getByTestId('retry-button');
            const svg = button.querySelector('svg');
            expect(svg).toBeInTheDocument();
        });
    });

    describe('Interaction', () => {
        it('calls onRetry when clicked', () => {
            const handleRetry = vi.fn();
            render(
                <RetryButton
                    onRetry={handleRetry}
                    retryCount={0}
                    maxRetries={3}
                />
            );

            fireEvent.click(screen.getByTestId('retry-button'));

            expect(handleRetry).toHaveBeenCalledTimes(1);
        });

        it('does not call onRetry when disabled', () => {
            const handleRetry = vi.fn();
            render(
                <RetryButton
                    onRetry={handleRetry}
                    retryCount={0}
                    maxRetries={3}
                    disabled={true}
                />
            );

            fireEvent.click(screen.getByTestId('retry-button'));

            expect(handleRetry).not.toHaveBeenCalled();
        });

        it('does not call onRetry when retries exhausted', () => {
            const handleRetry = vi.fn();
            render(
                <RetryButton
                    onRetry={handleRetry}
                    retryCount={3}
                    maxRetries={3}
                />
            );

            fireEvent.click(screen.getByTestId('retry-button'));

            expect(handleRetry).not.toHaveBeenCalled();
        });
    });

    describe('Disabled State', () => {
        it('is disabled when disabled prop is true', () => {
            render(
                <RetryButton
                    onRetry={() => {}}
                    retryCount={0}
                    maxRetries={3}
                    disabled={true}
                />
            );

            expect(screen.getByTestId('retry-button')).toBeDisabled();
        });

        it('is disabled when retries exhausted', () => {
            render(
                <RetryButton
                    onRetry={() => {}}
                    retryCount={3}
                    maxRetries={3}
                />
            );

            expect(screen.getByTestId('retry-button')).toBeDisabled();
        });

        it('is enabled when retries available and not disabled', () => {
            render(
                <RetryButton
                    onRetry={() => {}}
                    retryCount={0}
                    maxRetries={3}
                />
            );

            expect(screen.getByTestId('retry-button')).toBeEnabled();
        });
    });

    describe('Edge Cases', () => {
        it('handles maxRetries of 0', () => {
            render(
                <RetryButton
                    onRetry={() => {}}
                    retryCount={0}
                    maxRetries={0}
                />
            );

            expect(screen.getByText('No retries left')).toBeInTheDocument();
            expect(screen.getByTestId('retry-button')).toBeDisabled();
        });

        it('handles retryCount exceeding maxRetries', () => {
            render(
                <RetryButton
                    onRetry={() => {}}
                    retryCount={5}
                    maxRetries={3}
                />
            );

            expect(screen.getByText('No retries left')).toBeInTheDocument();
            expect(screen.getByTestId('retry-button')).toBeDisabled();
        });
    });
});
