import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptInput, MAX_PROMPT_LENGTH } from './PromptInput';

describe('PromptInput', () => {
    const defaultProps = {
        onSubmit: vi.fn(),
        isLoading: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render textarea with correct placeholder', () => {
            render(<PromptInput {...defaultProps} />);

            const textarea = screen.getByTestId('prompt-input');
            expect(textarea).toBeInTheDocument();
            expect(textarea).toHaveAttribute('placeholder', 'What do you feel like building today?');
        });

        it('should render submit button with default text', () => {
            render(<PromptInput {...defaultProps} />);

            const button = screen.getByTestId('submit-button');
            expect(button).toBeInTheDocument();
            expect(button).toHaveTextContent('Create My Design');
        });

        it('should render character counter showing 0/{MAX}', () => {
            render(<PromptInput {...defaultProps} />);

            const counter = screen.getByTestId('char-count');
            expect(counter).toHaveTextContent(`0/${MAX_PROMPT_LENGTH}`);
        });
    });

    describe('Character Counter', () => {
        it('should update character count as user types', () => {
            render(<PromptInput {...defaultProps} />);

            const textarea = screen.getByTestId('prompt-input');
            fireEvent.change(textarea, { target: { value: 'dragon' } });

            const counter = screen.getByTestId('char-count');
            expect(counter).toHaveTextContent(`6/${MAX_PROMPT_LENGTH}`);
        });

        it('should show error styling when over character limit', () => {
            render(<PromptInput {...defaultProps} />);

            const textarea = screen.getByTestId('prompt-input');
            const longText = 'a'.repeat(MAX_PROMPT_LENGTH + 1);
            fireEvent.change(textarea, { target: { value: longText } });

            const counter = screen.getByTestId('char-count');
            expect(counter).toHaveClass('text-destructive');
        });

        it('should show validation error message when over limit', () => {
            render(<PromptInput {...defaultProps} />);

            const textarea = screen.getByTestId('prompt-input');
            const longText = 'a'.repeat(MAX_PROMPT_LENGTH + 1);
            fireEvent.change(textarea, { target: { value: longText } });

            const error = screen.getByTestId('validation-error');
            expect(error).toBeInTheDocument();
        });
    });

    describe('Form Submission', () => {
        it('should call onSubmit with trimmed prompt when form is submitted', () => {
            const onSubmit = vi.fn();
            render(<PromptInput {...defaultProps} onSubmit={onSubmit} />);

            const textarea = screen.getByTestId('prompt-input');
            fireEvent.change(textarea, { target: { value: '  dragon  ' } });

            const button = screen.getByTestId('submit-button');
            fireEvent.click(button);

            expect(onSubmit).toHaveBeenCalledWith('dragon');
        });

        it('should not submit when prompt is empty', () => {
            const onSubmit = vi.fn();
            render(<PromptInput {...defaultProps} onSubmit={onSubmit} />);

            const button = screen.getByTestId('submit-button');
            fireEvent.click(button);

            expect(onSubmit).not.toHaveBeenCalled();
        });

        it('should not submit when prompt is only whitespace', () => {
            const onSubmit = vi.fn();
            render(<PromptInput {...defaultProps} onSubmit={onSubmit} />);

            const textarea = screen.getByTestId('prompt-input');
            fireEvent.change(textarea, { target: { value: '    ' } });

            const form = screen.getByTestId('prompt-form');
            fireEvent.submit(form);

            expect(onSubmit).not.toHaveBeenCalled();
        });

        it('should not submit when over character limit', () => {
            const onSubmit = vi.fn();
            render(<PromptInput {...defaultProps} onSubmit={onSubmit} />);

            const textarea = screen.getByTestId('prompt-input');
            const longText = 'a'.repeat(MAX_PROMPT_LENGTH + 1);
            fireEvent.change(textarea, { target: { value: longText } });

            const form = screen.getByTestId('prompt-form');
            fireEvent.submit(form);

            expect(onSubmit).not.toHaveBeenCalled();
        });
    });

    describe('Loading State', () => {
        it('should disable textarea when loading', () => {
            render(<PromptInput {...defaultProps} isLoading={true} />);

            const textarea = screen.getByTestId('prompt-input');
            expect(textarea).toBeDisabled();
        });

        it('should disable button when loading', () => {
            render(<PromptInput {...defaultProps} isLoading={true} />);

            const button = screen.getByTestId('submit-button');
            expect(button).toBeDisabled();
        });

        it('should show "Creating..." text when loading', () => {
            render(<PromptInput {...defaultProps} isLoading={true} />);

            const button = screen.getByTestId('submit-button');
            expect(button).toHaveTextContent('Creating...');
        });

        it('should not submit when loading', () => {
            const onSubmit = vi.fn();
            render(<PromptInput {...defaultProps} onSubmit={onSubmit} isLoading={true} />);

            const form = screen.getByTestId('prompt-form');
            fireEvent.submit(form);

            expect(onSubmit).not.toHaveBeenCalled();
        });
    });

    describe('Button State', () => {
        it('should disable button when prompt is empty', () => {
            render(<PromptInput {...defaultProps} />);

            const button = screen.getByTestId('submit-button');
            expect(button).toBeDisabled();
        });

        it('should enable button when prompt is valid', () => {
            render(<PromptInput {...defaultProps} />);

            const textarea = screen.getByTestId('prompt-input');
            fireEvent.change(textarea, { target: { value: 'dragon' } });

            const button = screen.getByTestId('submit-button');
            expect(button).not.toBeDisabled();
        });

        it('should disable button when over character limit', () => {
            render(<PromptInput {...defaultProps} />);

            const textarea = screen.getByTestId('prompt-input');
            const longText = 'a'.repeat(MAX_PROMPT_LENGTH + 1);
            fireEvent.change(textarea, { target: { value: longText } });

            const button = screen.getByTestId('submit-button');
            expect(button).toBeDisabled();
        });
    });

    describe('Accessibility', () => {
        it('should have accessible label for textarea', () => {
            render(<PromptInput {...defaultProps} />);

            const textarea = screen.getByLabelText(/describe what you want to build/i);
            expect(textarea).toBeInTheDocument();
        });

        it('should announce character count to screen readers', () => {
            render(<PromptInput {...defaultProps} />);

            const counter = screen.getByTestId('char-count');
            expect(counter).toHaveAttribute('aria-live', 'polite');
        });

        it('should mark validation error as alert', () => {
            render(<PromptInput {...defaultProps} />);

            const textarea = screen.getByTestId('prompt-input');
            const longText = 'a'.repeat(MAX_PROMPT_LENGTH + 1);
            fireEvent.change(textarea, { target: { value: longText } });

            const error = screen.getByTestId('validation-error');
            expect(error).toHaveAttribute('role', 'alert');
        });
    });
});
