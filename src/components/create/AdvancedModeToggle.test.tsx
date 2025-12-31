import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdvancedModeToggle } from './AdvancedModeToggle';

describe('AdvancedModeToggle', () => {
    it('renders the toggle with label text', () => {
        render(<AdvancedModeToggle checked={false} onCheckedChange={() => { }} />);

        expect(screen.getByText('Show me advanced designs')).toBeInTheDocument();
    });

    it('has a testid for E2E testing', () => {
        render(<AdvancedModeToggle checked={false} onCheckedChange={() => { }} />);

        expect(screen.getByTestId('advanced-mode-toggle-container')).toBeInTheDocument();
        expect(screen.getByTestId('advanced-mode-switch')).toBeInTheDocument();
    });

    it('shows description text', () => {
        render(<AdvancedModeToggle checked={false} onCheckedChange={() => { }} />);

        expect(screen.getByText('Skip simple mode for your first creation')).toBeInTheDocument();
    });

    it('calls onCheckedChange when toggled', () => {
        const handleChange = vi.fn();
        render(<AdvancedModeToggle checked={false} onCheckedChange={handleChange} />);

        const switchElement = screen.getByTestId('advanced-mode-switch');
        fireEvent.click(switchElement);

        expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('calls onCheckedChange with false when toggling off', () => {
        const handleChange = vi.fn();
        render(<AdvancedModeToggle checked={true} onCheckedChange={handleChange} />);

        const switchElement = screen.getByTestId('advanced-mode-switch');
        fireEvent.click(switchElement);

        expect(handleChange).toHaveBeenCalledWith(false);
    });

    it('reflects checked state correctly when false', () => {
        render(<AdvancedModeToggle checked={false} onCheckedChange={() => { }} />);

        const switchElement = screen.getByTestId('advanced-mode-switch');
        expect(switchElement).toHaveAttribute('data-state', 'unchecked');
    });

    it('reflects checked state correctly when true', () => {
        render(<AdvancedModeToggle checked={true} onCheckedChange={() => { }} />);

        const switchElement = screen.getByTestId('advanced-mode-switch');
        expect(switchElement).toHaveAttribute('data-state', 'checked');
    });

    it('disables the switch when disabled prop is true', () => {
        render(
            <AdvancedModeToggle
                checked={false}
                onCheckedChange={() => { }}
                disabled={true}
            />
        );

        const switchElement = screen.getByTestId('advanced-mode-switch');
        expect(switchElement).toHaveAttribute('data-disabled', '');
    });

    it('does not call onCheckedChange when disabled', () => {
        const handleChange = vi.fn();
        render(
            <AdvancedModeToggle
                checked={false}
                onCheckedChange={handleChange}
                disabled={true}
            />
        );

        const switchElement = screen.getByTestId('advanced-mode-switch');
        fireEvent.click(switchElement);

        expect(handleChange).not.toHaveBeenCalled();
    });

    it('applies custom className', () => {
        render(
            <AdvancedModeToggle
                checked={false}
                onCheckedChange={() => { }}
                className="mt-4 ml-2"
            />
        );

        const container = screen.getByTestId('advanced-mode-toggle-container');
        expect(container).toHaveClass('mt-4');
        expect(container).toHaveClass('ml-2');
    });

    it('has proper label association with switch', () => {
        render(<AdvancedModeToggle checked={false} onCheckedChange={() => { }} />);

        const label = screen.getByText('Show me advanced designs');
        expect(label).toHaveAttribute('for', 'advanced-mode');

        const switchElement = screen.getByTestId('advanced-mode-switch');
        expect(switchElement).toHaveAttribute('id', 'advanced-mode');
    });

    it('has aria-describedby for accessibility', () => {
        render(<AdvancedModeToggle checked={false} onCheckedChange={() => { }} />);

        const switchElement = screen.getByTestId('advanced-mode-switch');
        expect(switchElement).toHaveAttribute('aria-describedby', 'advanced-mode-description');
    });
});
