import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FirstBuildBadge } from './FirstBuildBadge';

describe('FirstBuildBadge', () => {
    it('renders the badge with Simple Mode text', () => {
        render(<FirstBuildBadge />);

        expect(screen.getByText('Simple Mode')).toBeInTheDocument();
    });

    it('has a testid for E2E testing', () => {
        render(<FirstBuildBadge />);

        expect(screen.getByTestId('first-build-badge')).toBeInTheDocument();
    });

    it('includes sparkles icon', () => {
        render(<FirstBuildBadge />);

        // The sparkles icon should be present but hidden from screen readers
        const badge = screen.getByTestId('first-build-badge');
        const svg = badge.querySelector('svg');
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('applies custom className', () => {
        render(<FirstBuildBadge className="mt-4 ml-2" />);

        const badge = screen.getByTestId('first-build-badge');
        expect(badge).toHaveClass('mt-4');
        expect(badge).toHaveClass('ml-2');
    });

    it('has accessibility-friendly styling', () => {
        render(<FirstBuildBadge />);

        const badge = screen.getByTestId('first-build-badge');
        // Badge should be styled as secondary variant
        expect(badge).toHaveClass('bg-accent/20');
    });

    it('has cursor-help style to indicate interactive tooltip', () => {
        render(<FirstBuildBadge />);

        const badge = screen.getByTestId('first-build-badge');
        expect(badge).toHaveClass('cursor-help');
    });

    it('renders with tooltip trigger structure', () => {
        render(<FirstBuildBadge />);

        // The badge should be wrapped in a tooltip trigger (role="button" or similar)
        const badge = screen.getByTestId('first-build-badge');
        // Radix TooltipTrigger wraps the child with no additional role when asChild is used
        // The tooltip content is rendered in a portal, so we just verify the badge structure
        expect(badge).toBeInTheDocument();
        expect(badge.tagName.toLowerCase()).toBe('span'); // Badge is a span
    });
});
