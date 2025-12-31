/**
 * Tests for RegeneratePrompt Component
 *
 * @see Story 2.6: Add Structural Feedback for Generated Models
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RegeneratePrompt } from './RegeneratePrompt';

describe('RegeneratePrompt', () => {
    describe('rendering', () => {
        it('renders the component container', () => {
            render(
                <RegeneratePrompt
                    onRegenerateForStability={() => { }}
                    onProceedAnyway={() => { }}
                />
            );
            expect(screen.getByTestId('regenerate-prompt-section')).toBeInTheDocument();
        });

        it('renders regenerate button', () => {
            render(
                <RegeneratePrompt
                    onRegenerateForStability={() => { }}
                    onProceedAnyway={() => { }}
                />
            );
            expect(screen.getByTestId('regenerate-stability-button')).toBeInTheDocument();
            expect(screen.getByText('Regenerate for Stability')).toBeInTheDocument();
        });

        it('renders build anyway button', () => {
            render(
                <RegeneratePrompt
                    onRegenerateForStability={() => { }}
                    onProceedAnyway={() => { }}
                />
            );
            expect(screen.getByTestId('build-anyway-button')).toBeInTheDocument();
            expect(screen.getByText('Build Anyway')).toBeInTheDocument();
        });
    });

    describe('button interactions', () => {
        it('calls onRegenerateForStability when regenerate button clicked', () => {
            const onRegenerate = vi.fn();
            render(
                <RegeneratePrompt
                    onRegenerateForStability={onRegenerate}
                    onProceedAnyway={() => { }}
                />
            );
            fireEvent.click(screen.getByTestId('regenerate-stability-button'));
            expect(onRegenerate).toHaveBeenCalledTimes(1);
        });

        it('calls onProceedAnyway when build anyway button clicked', () => {
            const onProceed = vi.fn();
            render(
                <RegeneratePrompt
                    onRegenerateForStability={() => { }}
                    onProceedAnyway={onProceed}
                />
            );
            fireEvent.click(screen.getByTestId('build-anyway-button'));
            expect(onProceed).toHaveBeenCalledTimes(1);
        });
    });

    describe('disabled state', () => {
        it('disables both buttons when disabled prop is true', () => {
            render(
                <RegeneratePrompt
                    onRegenerateForStability={() => { }}
                    onProceedAnyway={() => { }}
                    disabled={true}
                />
            );
            expect(screen.getByTestId('regenerate-stability-button')).toBeDisabled();
            expect(screen.getByTestId('build-anyway-button')).toBeDisabled();
        });

        it('does not call callbacks when buttons are disabled', () => {
            const onRegenerate = vi.fn();
            const onProceed = vi.fn();
            render(
                <RegeneratePrompt
                    onRegenerateForStability={onRegenerate}
                    onProceedAnyway={onProceed}
                    disabled={true}
                />
            );
            fireEvent.click(screen.getByTestId('regenerate-stability-button'));
            fireEvent.click(screen.getByTestId('build-anyway-button'));
            expect(onRegenerate).not.toHaveBeenCalled();
            expect(onProceed).not.toHaveBeenCalled();
        });
    });

    describe('loading state', () => {
        it('shows loading spinner when isLoading is true', () => {
            render(
                <RegeneratePrompt
                    onRegenerateForStability={() => { }}
                    onProceedAnyway={() => { }}
                    isLoading={true}
                />
            );
            expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
        });

        it('changes button text to "Regenerating..." when loading', () => {
            render(
                <RegeneratePrompt
                    onRegenerateForStability={() => { }}
                    onProceedAnyway={() => { }}
                    isLoading={true}
                />
            );
            expect(screen.getByText('Regenerating...')).toBeInTheDocument();
            expect(
                screen.queryByText('Regenerate for Stability')
            ).not.toBeInTheDocument();
        });

        it('disables both buttons when loading', () => {
            render(
                <RegeneratePrompt
                    onRegenerateForStability={() => { }}
                    onProceedAnyway={() => { }}
                    isLoading={true}
                />
            );
            expect(screen.getByTestId('regenerate-stability-button')).toBeDisabled();
            expect(screen.getByTestId('build-anyway-button')).toBeDisabled();
        });

        it('does not show spinner when not loading', () => {
            render(
                <RegeneratePrompt
                    onRegenerateForStability={() => { }}
                    onProceedAnyway={() => { }}
                    isLoading={false}
                />
            );
            expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
        });
    });

    describe('button styling', () => {
        it('regenerate button has primary variant', () => {
            render(
                <RegeneratePrompt
                    onRegenerateForStability={() => { }}
                    onProceedAnyway={() => { }}
                />
            );
            const button = screen.getByTestId('regenerate-stability-button');
            // Button should NOT have outline class (which indicates primary variant)
            expect(button.className).not.toContain('border-input');
        });

        it('build anyway button has outline variant', () => {
            render(
                <RegeneratePrompt
                    onRegenerateForStability={() => { }}
                    onProceedAnyway={() => { }}
                />
            );
            const button = screen.getByTestId('build-anyway-button');
            expect(button.className).toContain('border');
        });
    });

    describe('default props', () => {
        it('defaults disabled to false', () => {
            render(
                <RegeneratePrompt
                    onRegenerateForStability={() => { }}
                    onProceedAnyway={() => { }}
                />
            );
            expect(screen.getByTestId('regenerate-stability-button')).not.toBeDisabled();
            expect(screen.getByTestId('build-anyway-button')).not.toBeDisabled();
        });

        it('defaults isLoading to false', () => {
            render(
                <RegeneratePrompt
                    onRegenerateForStability={() => { }}
                    onProceedAnyway={() => { }}
                />
            );
            expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
            expect(screen.getByText('Regenerate for Stability')).toBeInTheDocument();
        });
    });
});
