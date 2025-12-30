import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GenerationProgress, GENERATION_STAGES } from './GenerationProgress';
import type { LoadingPhase } from '@/types/loading';

describe('GenerationProgress', () => {
    describe('Rendering', () => {
        it.each<LoadingPhase>(['imagining', 'finding', 'building'])(
            'should render with phase "%s"',
            (phase) => {
                render(<GenerationProgress phase={phase} />);

                const container = screen.getByTestId('generation-progress');
                expect(container).toBeInTheDocument();
            }
        );

        it('should render skeleton background', () => {
            render(<GenerationProgress phase="imagining" />);

            const skeleton = screen.getByTestId('progress-skeleton');
            expect(skeleton).toBeInTheDocument();
        });

        it('should render shimmer effect', () => {
            render(<GenerationProgress phase="imagining" />);

            const shimmer = screen.getByTestId('shimmer-effect');
            expect(shimmer).toBeInTheDocument();
        });

        it('should render progress spinner', () => {
            render(<GenerationProgress phase="imagining" />);

            const spinner = screen.getByTestId('progress-spinner');
            expect(spinner).toBeInTheDocument();
        });
    });

    describe('Phase Messages', () => {
        it('should display "Imagining your creation..." for imagining phase', () => {
            render(<GenerationProgress phase="imagining" />);

            const message = screen.getByTestId('progress-message');
            expect(message).toHaveTextContent('Imagining your creation...');
        });

        it('should display "Finding the perfect bricks..." for finding phase', () => {
            render(<GenerationProgress phase="finding" />);

            const message = screen.getByTestId('progress-message');
            expect(message).toHaveTextContent('Finding the perfect bricks...');
        });

        it('should display "Building your model..." for building phase', () => {
            render(<GenerationProgress phase="building" />);

            const message = screen.getByTestId('progress-message');
            expect(message).toHaveTextContent('Building your model...');
        });
    });

    describe('Phase Indicators', () => {
        it('should render phase indicators for all stages', () => {
            render(<GenerationProgress phase="imagining" />);

            const indicators = screen.getByTestId('phase-indicators');
            expect(indicators).toBeInTheDocument();
            expect(indicators.children).toHaveLength(GENERATION_STAGES.length);
        });

        it.each<LoadingPhase>(['imagining', 'finding', 'building'])(
            'should highlight current indicator for phase "%s"',
            (phase) => {
                render(<GenerationProgress phase={phase} />);

                const indicator = screen.getByTestId(`indicator-${phase}`);
                expect(indicator).toHaveClass('bg-primary');
            }
        );
    });

    describe('Accessibility', () => {
        it('should have role="status"', () => {
            render(<GenerationProgress phase="imagining" />);

            const container = screen.getByTestId('generation-progress');
            expect(container).toHaveAttribute('role', 'status');
        });

        it('should have aria-busy="true"', () => {
            render(<GenerationProgress phase="imagining" />);

            const container = screen.getByTestId('generation-progress');
            expect(container).toHaveAttribute('aria-busy', 'true');
        });

        it('should have screen reader announcement element', () => {
            render(<GenerationProgress phase="imagining" />);

            const srAnnouncement = screen.getByTestId('sr-announcement');
            expect(srAnnouncement).toBeInTheDocument();
            expect(srAnnouncement).toHaveAttribute('aria-live', 'polite');
            expect(srAnnouncement).toHaveAttribute('aria-atomic', 'true');
        });

        it('should announce phase changes to screen readers', () => {
            render(<GenerationProgress phase="finding" />);

            const srAnnouncement = screen.getByTestId('sr-announcement');
            expect(srAnnouncement).toHaveTextContent('Finding the perfect bricks...');
        });
    });

    describe('Custom className', () => {
        it('should apply custom className to container', () => {
            render(<GenerationProgress phase="imagining" className="custom-class" />);

            const container = screen.getByTestId('generation-progress');
            expect(container).toHaveClass('custom-class');
        });
    });

    describe('GENERATION_STAGES export', () => {
        it('should export stage configuration', () => {
            expect(GENERATION_STAGES).toBeDefined();
            expect(GENERATION_STAGES).toHaveLength(3);
        });

        it('should have correct stage order', () => {
            expect(GENERATION_STAGES[0].key).toBe('imagining');
            expect(GENERATION_STAGES[1].key).toBe('finding');
            expect(GENERATION_STAGES[2].key).toBe('building');
        });

        it('should have labels for all stages', () => {
            GENERATION_STAGES.forEach((stage) => {
                expect(stage.label).toBeDefined();
                expect(stage.label.length).toBeGreaterThan(0);
            });
        });
    });
});
