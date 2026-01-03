/**
 * SizeSelector Component
 *
 * Allows users to select model size via presets or custom mm input.
 * Shows real-world dimensions for context.
 */

'use client';

import { useState } from 'react';
import {
    SIZE_PRESETS,
    DEFAULT_SIZE_PRESET,
    formatDimensions,
    configFromMm,
    type SizePreset,
    type ResolutionConfig,
} from '@/lib/lego/resolution-config';
import { cn } from '@/lib/utils';

interface SizeSelectorProps {
    /** Currently selected preset (controlled) */
    value: SizePreset | 'custom';
    /** Callback when selection changes */
    onChange: (preset: SizePreset | 'custom', config: ResolutionConfig) => void;
    /** Whether the selector is disabled */
    disabled?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Size selector with preset buttons and optional custom input.
 */
export function SizeSelector({
    value,
    onChange,
    disabled = false,
    className = '',
}: SizeSelectorProps) {
    const [showCustom, setShowCustom] = useState(false);
    const [customWidth, setCustomWidth] = useState(100);
    const [customDepth, setCustomDepth] = useState(100);
    const [customHeight, setCustomHeight] = useState(80);

    const handlePresetClick = (preset: SizePreset) => {
        setShowCustom(false);
        onChange(preset, SIZE_PRESETS[preset].config);
    };

    const handleCustomToggle = () => {
        setShowCustom(!showCustom);
        if (!showCustom) {
            // Switching to custom - generate config from current custom values
            onChange('custom', configFromMm(customWidth, customDepth, customHeight));
        }
    };

    const handleCustomChange = (width: number, depth: number, height: number) => {
        setCustomWidth(width);
        setCustomDepth(depth);
        setCustomHeight(height);
        onChange('custom', configFromMm(width, depth, height));
    };

    return (
        <div className={cn('space-y-3', className)} data-testid="size-selector">
            {/* Preset Buttons */}
            <div className="flex flex-wrap justify-center gap-2">
                {(Object.keys(SIZE_PRESETS) as SizePreset[]).map((preset) => {
                    const info = SIZE_PRESETS[preset];
                    const isSelected = value === preset && !showCustom;

                    return (
                        <button
                            key={preset}
                            type="button"
                            onClick={() => handlePresetClick(preset)}
                            disabled={disabled}
                            className={cn(
                                'flex flex-col items-center px-4 py-2 rounded-lg border transition-all',
                                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
                                isSelected
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border hover:border-primary/50 hover:bg-muted/50',
                                disabled && 'opacity-50 cursor-not-allowed'
                            )}
                            data-testid={`size-preset-${preset}`}
                        >
                            <span className="font-medium">{info.label}</span>
                            <span className="text-xs text-muted-foreground">
                                {formatDimensions(info.realSize.width, info.realSize.depth, info.realSize.height)}
                            </span>
                            <span className="text-[10px] text-muted-foreground/70">
                                {info.brickCount} bricks
                            </span>
                        </button>
                    );
                })}

                {/* Custom Button */}
                <button
                    type="button"
                    onClick={handleCustomToggle}
                    disabled={disabled}
                    className={cn(
                        'flex flex-col items-center px-4 py-2 rounded-lg border transition-all',
                        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
                        showCustom
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50',
                        disabled && 'opacity-50 cursor-not-allowed'
                    )}
                    data-testid="size-preset-custom"
                >
                    <span className="font-medium">Custom</span>
                    <span className="text-xs text-muted-foreground">Set exact size</span>
                </button>
            </div>

            {/* Custom Size Inputs */}
            {showCustom && (
                <div
                    className="flex flex-wrap justify-center gap-4 p-4 rounded-lg bg-muted/30 border border-border"
                    data-testid="custom-size-inputs"
                >
                    <div className="flex flex-col items-center">
                        <label htmlFor="custom-width" className="text-xs text-muted-foreground mb-1">
                            Width (mm)
                        </label>
                        <input
                            id="custom-width"
                            type="number"
                            value={customWidth}
                            onChange={(e) => handleCustomChange(parseInt(e.target.value) || 50, customDepth, customHeight)}
                            min={40}
                            max={400}
                            step={10}
                            disabled={disabled}
                            className="w-20 px-2 py-1 text-center rounded border border-border bg-background"
                        />
                    </div>
                    <div className="flex flex-col items-center">
                        <label htmlFor="custom-depth" className="text-xs text-muted-foreground mb-1">
                            Depth (mm)
                        </label>
                        <input
                            id="custom-depth"
                            type="number"
                            value={customDepth}
                            onChange={(e) => handleCustomChange(customWidth, parseInt(e.target.value) || 50, customHeight)}
                            min={40}
                            max={400}
                            step={10}
                            disabled={disabled}
                            className="w-20 px-2 py-1 text-center rounded border border-border bg-background"
                        />
                    </div>
                    <div className="flex flex-col items-center">
                        <label htmlFor="custom-height" className="text-xs text-muted-foreground mb-1">
                            Height (mm)
                        </label>
                        <input
                            id="custom-height"
                            type="number"
                            value={customHeight}
                            onChange={(e) => handleCustomChange(customWidth, customDepth, parseInt(e.target.value) || 30)}
                            min={30}
                            max={300}
                            step={10}
                            disabled={disabled}
                            className="w-20 px-2 py-1 text-center rounded border border-border bg-background"
                        />
                    </div>

                    {/* Reference */}
                    <div className="w-full text-center text-xs text-muted-foreground mt-2">
                        <span className="font-medium">Reference:</span> A 2×4 brick is 32mm × 16mm × 9.6mm
                    </div>
                </div>
            )}

            {/* Selected Size Summary */}
            {!showCustom && value !== 'custom' && (
                <p className="text-center text-sm text-muted-foreground">
                    {SIZE_PRESETS[value as SizePreset].description}
                </p>
            )}
        </div>
    );
}
