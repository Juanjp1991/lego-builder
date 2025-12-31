/**
 * Tests for StructuralFeedback Component
 *
 * @see Story 2.6: Add Structural Feedback for Generated Models
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StructuralFeedback } from './StructuralFeedback';
import type { StructuralAnalysisResult } from '@/lib/ai/structural-analysis';

const stableAnalysis: StructuralAnalysisResult = {
    isStable: true,
    issues: [],
    overallScore: 95,
    summary: 'Solid base, staggered joints, well-balanced structure.',
};

const unstableAnalysis: StructuralAnalysisResult = {
    isStable: false,
    issues: [
        {
            type: 'cantilever',
            severity: 'warning',
            message: 'Wing extends 4 studs without support',
            suggestion: 'Add pillar at position (5,0,2)',
        },
        {
            type: 'narrow-base',
            severity: 'critical',
            message: 'Base is too narrow for the height',
            suggestion: 'Widen the foundation',
        },
    ],
    overallScore: 45,
    summary: 'Model has stability concerns.',
};

describe('StructuralFeedback', () => {
    describe('when analysis is null', () => {
        it('renders nothing', () => {
            const { container } = render(
                <StructuralFeedback analysis={null} onDismiss={() => { }} />
            );
            expect(container.firstChild).toBeNull();
        });
    });

    describe('when analysis shows stable model', () => {
        it('renders the feedback alert', () => {
            render(
                <StructuralFeedback analysis={stableAnalysis} onDismiss={() => { }} />
            );
            expect(screen.getByTestId('structural-feedback')).toBeInTheDocument();
        });

        it('displays "Looks stable!" message', () => {
            render(
                <StructuralFeedback analysis={stableAnalysis} onDismiss={() => { }} />
            );
            expect(screen.getByText('Looks stable!')).toBeInTheDocument();
        });

        it('displays the stability score', () => {
            render(
                <StructuralFeedback analysis={stableAnalysis} onDismiss={() => { }} />
            );
            expect(screen.getByTestId('stability-score-badge')).toHaveTextContent(
                '95/100'
            );
        });

        it('displays the summary', () => {
            render(
                <StructuralFeedback analysis={stableAnalysis} onDismiss={() => { }} />
            );
            expect(screen.getByText(stableAnalysis.summary)).toBeInTheDocument();
        });

        it('does not display an issues list', () => {
            render(
                <StructuralFeedback analysis={stableAnalysis} onDismiss={() => { }} />
            );
            expect(screen.queryByTestId('issues-list')).not.toBeInTheDocument();
        });

        it('has green success styling', () => {
            render(
                <StructuralFeedback analysis={stableAnalysis} onDismiss={() => { }} />
            );
            const alert = screen.getByTestId('structural-feedback');
            expect(alert.className).toContain('bg-green-50');
        });
    });

    describe('when analysis shows unstable model', () => {
        it('displays "Structural concerns detected" message', () => {
            render(
                <StructuralFeedback analysis={unstableAnalysis} onDismiss={() => { }} />
            );
            expect(
                screen.getByText('Structural concerns detected')
            ).toBeInTheDocument();
        });

        it('displays the stability score', () => {
            render(
                <StructuralFeedback analysis={unstableAnalysis} onDismiss={() => { }} />
            );
            expect(screen.getByTestId('stability-score-badge')).toHaveTextContent(
                '45/100'
            );
        });

        it('displays the summary', () => {
            render(
                <StructuralFeedback analysis={unstableAnalysis} onDismiss={() => { }} />
            );
            expect(screen.getByText(unstableAnalysis.summary)).toBeInTheDocument();
        });

        it('displays the issues list', () => {
            render(
                <StructuralFeedback analysis={unstableAnalysis} onDismiss={() => { }} />
            );
            expect(screen.getByTestId('issues-list')).toBeInTheDocument();
        });

        it('displays each issue with message and suggestion', () => {
            render(
                <StructuralFeedback analysis={unstableAnalysis} onDismiss={() => { }} />
            );
            expect(screen.getByTestId('issue-0')).toBeInTheDocument();
            expect(screen.getByTestId('issue-1')).toBeInTheDocument();
            expect(
                screen.getByText('Wing extends 4 studs without support')
            ).toBeInTheDocument();
            expect(
                screen.getByText(/Add pillar at position/)
            ).toBeInTheDocument();
        });

        it('uses destructive variant for warning styling', () => {
            render(
                <StructuralFeedback analysis={unstableAnalysis} onDismiss={() => { }} />
            );
            const alert = screen.getByTestId('structural-feedback');
            // Should NOT have green styling
            expect(alert.className).not.toContain('bg-green-50');
        });
    });

    describe('dismiss button', () => {
        it('renders a dismiss button', () => {
            render(
                <StructuralFeedback analysis={stableAnalysis} onDismiss={() => { }} />
            );
            expect(screen.getByTestId('dismiss-feedback-button')).toBeInTheDocument();
        });

        it('calls onDismiss when clicked', () => {
            const onDismiss = vi.fn();
            render(
                <StructuralFeedback analysis={stableAnalysis} onDismiss={onDismiss} />
            );
            fireEvent.click(screen.getByTestId('dismiss-feedback-button'));
            expect(onDismiss).toHaveBeenCalledTimes(1);
        });

        it('has accessible aria-label', () => {
            render(
                <StructuralFeedback analysis={stableAnalysis} onDismiss={() => { }} />
            );
            expect(screen.getByTestId('dismiss-feedback-button')).toHaveAttribute(
                'aria-label',
                'Dismiss feedback'
            );
        });
    });

    describe('accessibility', () => {
        it('has role="status"', () => {
            render(
                <StructuralFeedback analysis={stableAnalysis} onDismiss={() => { }} />
            );
            expect(screen.getByTestId('structural-feedback')).toHaveAttribute(
                'role',
                'status'
            );
        });

        it('has aria-live="polite"', () => {
            render(
                <StructuralFeedback analysis={stableAnalysis} onDismiss={() => { }} />
            );
            expect(screen.getByTestId('structural-feedback')).toHaveAttribute(
                'aria-live',
                'polite'
            );
        });
    });

    describe('custom className', () => {
        it('applies additional className', () => {
            render(
                <StructuralFeedback
                    analysis={stableAnalysis}
                    onDismiss={() => { }}
                    className="mt-4 custom-class"
                />
            );
            expect(screen.getByTestId('structural-feedback')).toHaveClass(
                'mt-4',
                'custom-class'
            );
        });
    });
});
