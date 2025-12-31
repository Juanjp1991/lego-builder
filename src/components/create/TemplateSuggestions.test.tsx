/**
 * TemplateSuggestions Component Tests
 *
 * @see Story 2.4: Add Free Retry Mechanism
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateSuggestions, TEMPLATE_SUGGESTIONS } from './TemplateSuggestions';

describe('TemplateSuggestions', () => {
    describe('Rendering', () => {
        it('renders the heading text', () => {
            render(<TemplateSuggestions onSelectTemplate={() => {}} />);

            expect(
                screen.getByText('Not quite right? Try one of these simple templates:')
            ).toBeInTheDocument();
        });

        it('renders all template suggestions', () => {
            render(<TemplateSuggestions onSelectTemplate={() => {}} />);

            TEMPLATE_SUGGESTIONS.forEach((template) => {
                expect(screen.getByText(template.name)).toBeInTheDocument();
            });
        });

        it('renders 4 template options', () => {
            render(<TemplateSuggestions onSelectTemplate={() => {}} />);

            expect(TEMPLATE_SUGGESTIONS).toHaveLength(4);
            expect(screen.getByText('Simple House')).toBeInTheDocument();
            expect(screen.getByText('Car')).toBeInTheDocument();
            expect(screen.getByText('Tree')).toBeInTheDocument();
            expect(screen.getByText('Robot')).toBeInTheDocument();
        });

        it('has testid on container', () => {
            render(<TemplateSuggestions onSelectTemplate={() => {}} />);

            expect(screen.getByTestId('template-suggestions')).toBeInTheDocument();
        });
    });

    describe('Interaction', () => {
        it('calls onSelectTemplate with correct prompt when Simple House clicked', () => {
            const handleSelect = vi.fn();
            render(<TemplateSuggestions onSelectTemplate={handleSelect} />);

            fireEvent.click(screen.getByTestId('template-simple-house'));

            expect(handleSelect).toHaveBeenCalledTimes(1);
            expect(handleSelect).toHaveBeenCalledWith(
                'a simple house with a door and two windows'
            );
        });

        it('calls onSelectTemplate with correct prompt when Car clicked', () => {
            const handleSelect = vi.fn();
            render(<TemplateSuggestions onSelectTemplate={handleSelect} />);

            fireEvent.click(screen.getByTestId('template-car'));

            expect(handleSelect).toHaveBeenCalledWith('a simple car with four wheels');
        });

        it('calls onSelectTemplate with correct prompt when Tree clicked', () => {
            const handleSelect = vi.fn();
            render(<TemplateSuggestions onSelectTemplate={handleSelect} />);

            fireEvent.click(screen.getByTestId('template-tree'));

            expect(handleSelect).toHaveBeenCalledWith(
                'a tree with a brown trunk and green leaves'
            );
        });

        it('calls onSelectTemplate with correct prompt when Robot clicked', () => {
            const handleSelect = vi.fn();
            render(<TemplateSuggestions onSelectTemplate={handleSelect} />);

            fireEvent.click(screen.getByTestId('template-robot'));

            expect(handleSelect).toHaveBeenCalledWith('a friendly robot with a boxy body');
        });
    });

    describe('Template Content', () => {
        it('all templates have non-empty names', () => {
            TEMPLATE_SUGGESTIONS.forEach((template) => {
                expect(template.name).toBeTruthy();
                expect(template.name.length).toBeGreaterThan(0);
            });
        });

        it('all templates have non-empty prompts', () => {
            TEMPLATE_SUGGESTIONS.forEach((template) => {
                expect(template.prompt).toBeTruthy();
                expect(template.prompt.length).toBeGreaterThan(0);
            });
        });

        it('all templates have descriptive prompts', () => {
            TEMPLATE_SUGGESTIONS.forEach((template) => {
                // Prompts should be at least 10 characters (descriptive)
                expect(template.prompt.length).toBeGreaterThan(10);
            });
        });
    });

    describe('Accessibility', () => {
        it('cards are clickable with cursor-pointer class', () => {
            render(<TemplateSuggestions onSelectTemplate={() => {}} />);

            const card = screen.getByTestId('template-simple-house');
            expect(card).toHaveClass('cursor-pointer');
        });

        it('cards have button role for accessibility', () => {
            render(<TemplateSuggestions onSelectTemplate={() => {}} />);

            const card = screen.getByTestId('template-simple-house');
            expect(card).toHaveAttribute('role', 'button');
        });

        it('cards are keyboard focusable', () => {
            render(<TemplateSuggestions onSelectTemplate={() => {}} />);

            const card = screen.getByTestId('template-simple-house');
            expect(card).toHaveAttribute('tabIndex', '0');
        });

        it('cards have aria-label for screen readers', () => {
            render(<TemplateSuggestions onSelectTemplate={() => {}} />);

            const card = screen.getByTestId('template-simple-house');
            expect(card).toHaveAttribute('aria-label', 'Select Simple House template');
        });

        it('calls onSelectTemplate when Enter key is pressed', () => {
            const handleSelect = vi.fn();
            render(<TemplateSuggestions onSelectTemplate={handleSelect} />);

            const card = screen.getByTestId('template-simple-house');
            fireEvent.keyDown(card, { key: 'Enter' });

            expect(handleSelect).toHaveBeenCalledTimes(1);
            expect(handleSelect).toHaveBeenCalledWith(
                'a simple house with a door and two windows'
            );
        });

        it('calls onSelectTemplate when Space key is pressed', () => {
            const handleSelect = vi.fn();
            render(<TemplateSuggestions onSelectTemplate={handleSelect} />);

            const card = screen.getByTestId('template-car');
            fireEvent.keyDown(card, { key: ' ' });

            expect(handleSelect).toHaveBeenCalledTimes(1);
            expect(handleSelect).toHaveBeenCalledWith('a simple car with four wheels');
        });

        it('does not call onSelectTemplate for other keys', () => {
            const handleSelect = vi.fn();
            render(<TemplateSuggestions onSelectTemplate={handleSelect} />);

            const card = screen.getByTestId('template-simple-house');
            fireEvent.keyDown(card, { key: 'Tab' });
            fireEvent.keyDown(card, { key: 'Escape' });
            fireEvent.keyDown(card, { key: 'a' });

            expect(handleSelect).not.toHaveBeenCalled();
        });
    });
});
