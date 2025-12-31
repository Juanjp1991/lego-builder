/**
 * FirstBuildBadge Component
 *
 * Displays a visual indicator when First-Build Guarantee mode is active.
 * Shows "Simple Mode" badge with tooltip explaining the feature.
 *
 * @see Story 2.5: Implement First-Build Guarantee
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface FirstBuildBadgeProps {
    /** Additional CSS classes */
    className?: string;
}

/**
 * Badge component that indicates First-Build Guarantee mode is active.
 *
 * Displays a "Simple Mode" badge with a sparkles icon. Includes a tooltip
 * explaining that the user's first design will be simple and easy to build.
 *
 * @example
 * ```tsx
 * {isFirstBuildMode && <FirstBuildBadge className="mb-4" />}
 * ```
 */
export function FirstBuildBadge({ className = '' }: FirstBuildBadgeProps) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge
                        variant="secondary"
                        className={`gap-1 bg-accent/20 text-accent-foreground hover:bg-accent/30 cursor-help ${className}`}
                        data-testid="first-build-badge"
                    >
                        <Sparkles className="h-3 w-3" aria-hidden="true" />
                        Simple Mode
                    </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                    <p className="font-medium">Your first design will be simple and easy to build!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Complete a build to unlock advanced designs.
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
