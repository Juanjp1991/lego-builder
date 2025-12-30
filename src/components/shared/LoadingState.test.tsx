import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LoadingState, PHASE_MESSAGES, PHASE_SEQUENCE, PHASE_DURATION_MS } from './LoadingState';

describe('LoadingState', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('rendering', () => {
        it('renders with default phase', () => {
            render(<LoadingState />);
            expect(screen.getByTestId('loading-state')).toBeInTheDocument();
            expect(screen.getByTestId('loading-message')).toHaveTextContent(PHASE_MESSAGES.imagining);
        });

        it('renders with specified initial phase', () => {
            render(<LoadingState initialPhase="finding" />);
            expect(screen.getByTestId('loading-message')).toHaveTextContent(PHASE_MESSAGES.finding);
        });

        it('renders skeleton shimmer background', () => {
            render(<LoadingState />);
            expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
        });

        it('applies custom className', () => {
            render(<LoadingState className="custom-class" />);
            expect(screen.getByTestId('loading-state')).toHaveClass('custom-class');
        });
    });

    describe('phase transitions', () => {
        it('transitions from imagining to finding after duration', async () => {
            render(<LoadingState />);
            expect(screen.getByTestId('loading-message')).toHaveTextContent(PHASE_MESSAGES.imagining);

            act(() => {
                vi.advanceTimersByTime(PHASE_DURATION_MS);
            });

            expect(screen.getByTestId('loading-message')).toHaveTextContent(PHASE_MESSAGES.finding);
        });

        it('transitions through all phases in sequence', async () => {
            render(<LoadingState />);

            // Initial phase: imagining
            expect(screen.getByTestId('loading-message')).toHaveTextContent(PHASE_MESSAGES.imagining);

            // After first duration: finding
            act(() => {
                vi.advanceTimersByTime(PHASE_DURATION_MS);
            });
            expect(screen.getByTestId('loading-message')).toHaveTextContent(PHASE_MESSAGES.finding);

            // After second duration: building
            act(() => {
                vi.advanceTimersByTime(PHASE_DURATION_MS);
            });
            expect(screen.getByTestId('loading-message')).toHaveTextContent(PHASE_MESSAGES.building);
        });

        it('stays on building phase (does not cycle back)', async () => {
            render(<LoadingState />);

            // First transition: imagining → finding
            act(() => {
                vi.advanceTimersByTime(PHASE_DURATION_MS);
            });
            expect(screen.getByTestId('loading-message')).toHaveTextContent(PHASE_MESSAGES.finding);

            // Second transition: finding → building
            act(() => {
                vi.advanceTimersByTime(PHASE_DURATION_MS);
            });
            expect(screen.getByTestId('loading-message')).toHaveTextContent(PHASE_MESSAGES.building);

            // Advance more time - should still be building (no cycling)
            act(() => {
                vi.advanceTimersByTime(PHASE_DURATION_MS);
            });
            expect(screen.getByTestId('loading-message')).toHaveTextContent(PHASE_MESSAGES.building);
        });
    });

    describe('accessibility', () => {
        it('has role="status" for screen readers', () => {
            render(<LoadingState />);
            expect(screen.getByTestId('loading-state')).toHaveAttribute('role', 'status');
        });

        it('has aria-live="polite" for announcements', () => {
            render(<LoadingState />);
            expect(screen.getByTestId('loading-state')).toHaveAttribute('aria-live', 'polite');
        });

        it('has aria-busy="true" to indicate loading', () => {
            render(<LoadingState />);
            expect(screen.getByTestId('loading-state')).toHaveAttribute('aria-busy', 'true');
        });

        it('updates announced content when phase changes', async () => {
            render(<LoadingState />);

            // Initial phase
            expect(screen.getByTestId('loading-message')).toHaveTextContent(PHASE_MESSAGES.imagining);

            act(() => {
                vi.advanceTimersByTime(PHASE_DURATION_MS);
            });

            // aria-live will announce the new content
            expect(screen.getByTestId('loading-message')).toHaveTextContent(PHASE_MESSAGES.finding);
        });
    });

    describe('reduced motion support', () => {
        it('has motion-safe animation class on skeleton', () => {
            render(<LoadingState />);
            expect(screen.getByTestId('loading-skeleton')).toHaveClass('motion-safe:animate-pulse');
        });

        it('has motion-safe animation class on message', () => {
            render(<LoadingState />);
            expect(screen.getByTestId('loading-message')).toHaveClass('motion-safe:animate-fade-in');
        });
    });

    describe('timeout handling', () => {
        it('calls onTimeout after timeoutMs', async () => {
            const onTimeout = vi.fn();
            render(<LoadingState onTimeout={onTimeout} timeoutMs={5000} />);

            act(() => {
                vi.advanceTimersByTime(5000);
            });

            expect(onTimeout).toHaveBeenCalledTimes(1);
        });

        it('does not call onTimeout if not provided', async () => {
            // This test verifies no error is thrown
            render(<LoadingState timeoutMs={1000} />);

            act(() => {
                vi.advanceTimersByTime(1000);
            });

            // Should complete without error
            expect(screen.getByTestId('loading-state')).toBeInTheDocument();
        });

        it('uses default timeout of 60000ms', async () => {
            const onTimeout = vi.fn();
            render(<LoadingState onTimeout={onTimeout} />);

            // Not called before 60000ms
            act(() => {
                vi.advanceTimersByTime(59999);
            });
            expect(onTimeout).not.toHaveBeenCalled();

            // Called at 60000ms
            act(() => {
                vi.advanceTimersByTime(1);
            });
            expect(onTimeout).toHaveBeenCalledTimes(1);
        });
    });

    describe('phase constants', () => {
        it('exports correct phase messages', () => {
            expect(PHASE_MESSAGES.imagining).toBe('Imagining your creation...');
            expect(PHASE_MESSAGES.finding).toBe('Finding the perfect bricks...');
            expect(PHASE_MESSAGES.building).toBe('Building your model...');
        });

        it('exports correct phase sequence', () => {
            expect(PHASE_SEQUENCE).toEqual(['imagining', 'finding', 'building']);
        });

        it('exports phase duration constant', () => {
            expect(PHASE_DURATION_MS).toBe(3000);
        });
    });
});
