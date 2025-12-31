'use client';

/**
 * StructuralFeedback Component
 *
 * Displays structural analysis feedback for generated LEGO models.
 * Shows warning/success state based on model stability analysis.
 *
 * @see Story 2.6: Add Structural Feedback for Generated Models
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StructuralAnalysisResult } from '@/lib/ai/structural-analysis';

export interface StructuralFeedbackProps {
    /** The structural analysis result to display */
    analysis: StructuralAnalysisResult | null;
    /** Callback when user dismisses the feedback */
    onDismiss: () => void;
    /** Additional CSS classes */
    className?: string;
}

/**
 * StructuralFeedback displays buildability analysis for generated models.
 *
 * - Shows green "Looks stable!" message for stable models
 * - Shows amber warning with issue list for unstable models
 * - Displays stability score badge
 * - Allows dismissal via X button
 *
 * @example
 * ```tsx
 * <StructuralFeedback
 *   analysis={structuralAnalysis}
 *   onDismiss={() => setShowFeedback(false)}
 * />
 * ```
 */
export function StructuralFeedback({
    analysis,
    onDismiss,
    className = '',
}: StructuralFeedbackProps) {
    // Don't render if no analysis available
    if (!analysis) return null;

    const isStable = analysis.isStable;
    const Icon = isStable ? CheckCircle2 : AlertTriangle;

    return (
        <Alert
            // CRITICAL: Use custom className for success state
            // Shadcn Alert 'default' is neutral gray, not green
            // Warning uses 'destructive' variant, success uses custom green styling
            variant={isStable ? 'default' : 'destructive'}
            className={cn(
                'relative animate-in fade-in slide-in-from-top-2 duration-300',
                // Custom success styling (green) since Shadcn Alert doesn't have success variant
                isStable &&
                'border-green-500/50 bg-green-50 text-green-900 dark:bg-green-950/20 dark:text-green-100 [&>svg]:text-green-600',
                className
            )}
            role="status"
            aria-live="polite"
            data-testid="structural-feedback"
        >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <AlertTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                    {isStable ? 'Looks stable!' : 'Structural concerns detected'}
                    {/* Score Badge - shows stability percentage */}
                    <Badge
                        variant="outline"
                        className="text-xs font-mono"
                        data-testid="stability-score-badge"
                    >
                        {analysis.overallScore}/100
                    </Badge>
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDismiss}
                    className="h-6 w-6 rounded-full -mr-2"
                    aria-label="Dismiss feedback"
                    data-testid="dismiss-feedback-button"
                >
                    <X className="h-4 w-4" />
                </Button>
            </AlertTitle>
            <AlertDescription>
                <p className="mb-2">{analysis.summary}</p>
                {!isStable && analysis.issues.length > 0 && (
                    <ul
                        className="list-disc list-inside space-y-1 text-sm"
                        data-testid="issues-list"
                    >
                        {analysis.issues.map((issue, idx) => (
                            <li key={idx} data-testid={`issue-${idx}`}>
                                <span className="font-medium">{issue.message}</span>
                                {issue.suggestion && (
                                    <span className="text-muted-foreground">
                                        {' '}
                                        — {issue.suggestion}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </AlertDescription>
        </Alert>
    );
}
