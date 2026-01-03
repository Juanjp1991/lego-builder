/**
 * GenerationModeToggle Component
 *
 * Toggle switch allowing users to choose between standard and
 * experimental silhouette-based generation mode.
 */

'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Beaker } from 'lucide-react';

import type { GenerationMode } from '@/lib/ai/types';

interface GenerationModeToggleProps {
    /** Current generation mode */
    mode: GenerationMode;
    /** Callback when mode changes */
    onModeChange: (mode: GenerationMode) => void;
    /** Whether the toggle is disabled */
    disabled?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Toggle component for selecting generation mode.
 *
 * - Standard: Existing hybrid LLM + algorithm approach
 * - Silhouette: Experimental layered silhouette approach
 *
 * @example
 * ```tsx
 * <GenerationModeToggle
 *   mode={generationMode}
 *   onModeChange={setGenerationMode}
 * />
 * ```
 */
export function GenerationModeToggle({
    mode,
    onModeChange,
    disabled = false,
    className = '',
}: GenerationModeToggleProps) {
    const isSilhouette = mode === 'silhouette';

    const handleChange = (checked: boolean) => {
        onModeChange(checked ? 'silhouette' : 'standard');
    };

    return (
        <div
            className={`flex items-center space-x-3 ${className}`}
            data-testid="generation-mode-toggle-container"
        >
            <Switch
                id="generation-mode"
                checked={isSilhouette}
                onCheckedChange={handleChange}
                disabled={disabled}
                aria-describedby="generation-mode-description"
                data-testid="generation-mode-switch"
            />
            <div className="flex flex-col">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Label
                            htmlFor="generation-mode"
                            className={`flex cursor-pointer items-center gap-1.5 text-sm font-medium ${disabled ? 'opacity-50' : ''}`}
                        >
                            <Beaker className="h-3.5 w-3.5 text-purple-500" />
                            Silhouette Mode
                            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                                Beta
                            </span>
                        </Label>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                        <p className="text-sm">
                            Experimental generation using layered 2D silhouettes.
                            May produce more accurate and buildable models for some images.
                        </p>
                    </TooltipContent>
                </Tooltip>
                <p
                    id="generation-mode-description"
                    className="text-xs text-muted-foreground"
                >
                    {isSilhouette
                        ? 'Uses structured layer extraction'
                        : 'Uses standard AI generation'}
                </p>
            </div>
        </div>
    );
}
