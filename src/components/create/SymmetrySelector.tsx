'use client';

import { cn } from '@/lib/utils';
import type { SymmetryAxis } from '@/lib/ai/types';

interface SymmetrySelectorProps {
    value: SymmetryAxis;
    onChange: (value: SymmetryAxis) => void;
    disabled?: boolean;
}

const SYMMETRY_OPTIONS: { value: SymmetryAxis; label: string; description: string }[] = [
    {
        value: 'auto',
        label: 'Auto',
        description: 'AI detects best axis',
    },
    {
        value: 'x',
        label: 'Left-Right',
        description: 'Mirror X axis (front view)',
    },
    {
        value: 'z',
        label: 'Front-Back',
        description: 'Mirror Z axis (side view)',
    },
    {
        value: 'both',
        label: 'Both',
        description: 'Mirror both axes',
    },
    {
        value: 'none',
        label: 'None',
        description: 'No mirroring',
    },
];

/**
 * SymmetrySelector Component
 *
 * Allows users to select which axis to enforce symmetry on for LEGO model generation.
 * This is an advanced option shown in silhouette mode.
 */
export function SymmetrySelector({ value, onChange, disabled }: SymmetrySelectorProps) {
    return (
        <div className="flex flex-col items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">
                Symmetry Axis
            </label>
            <div className="inline-flex rounded-lg border border-border p-1 bg-muted/30">
                {SYMMETRY_OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        disabled={disabled}
                        className={cn(
                            'px-2 py-1.5 text-xs font-medium rounded-md transition-colors',
                            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            value === option.value
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                        title={option.description}
                        aria-pressed={value === option.value}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
            <p className="text-xs text-muted-foreground">
                {SYMMETRY_OPTIONS.find(o => o.value === value)?.description}
            </p>
        </div>
    );
}
