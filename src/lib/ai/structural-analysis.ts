/**
 * Structural Analysis Types and Constants
 *
 * Defines types for analyzing LEGO model structural stability.
 * Used to provide user feedback about buildability concerns.
 *
 * @see Story 2.6: Add Structural Feedback for Generated Models
 */

/**
 * Types of structural issues that can be detected in a LEGO model.
 */
export type StructuralIssueType =
    | 'cantilever' // Unsupported horizontal extension
    | 'floating' // Bricks with no support
    | 'too-tall' // Height-to-base ratio too high
    | 'narrow-base' // Base too small for height
    | 'unbalanced'; // Center of mass off-center

/**
 * Severity level of a structural issue.
 * - warning: May cause minor instability, but buildable
 * - critical: High risk of collapse or unbuildable
 */
export type IssueSeverity = 'warning' | 'critical';

/**
 * A single structural issue detected in the model.
 */
export interface StructuralIssue {
    /** Type of structural problem */
    type: StructuralIssueType;
    /** How severe this issue is */
    severity: IssueSeverity;
    /** Human-readable description of the issue */
    message: string;
    /** Actionable suggestion to fix the issue */
    suggestion: string;
}

/**
 * Complete structural analysis result for a model.
 */
export interface StructuralAnalysisResult {
    /** Whether the model is considered stable overall */
    isStable: boolean;
    /** List of detected issues (empty if stable) */
    issues: StructuralIssue[];
    /** Stability score from 0-100 (100 = perfectly stable) */
    overallScore: number;
    /** Human-readable summary of the analysis */
    summary: string;
}

/**
 * Score threshold below which a model is considered unstable.
 * Models scoring below this will show a warning.
 */
export const STABILITY_THRESHOLD = 70;

/**
 * All possible structural issue types.
 * Useful for validation and iteration.
 */
export const STRUCTURAL_ISSUE_TYPES: StructuralIssueType[] = [
    'cantilever',
    'floating',
    'too-tall',
    'narrow-base',
    'unbalanced',
];

/**
 * Default messages and suggestions for each issue type.
 * Used as fallbacks when AI doesn't provide specific messages.
 */
export const STRUCTURAL_ISSUE_MESSAGES: Record<
    StructuralIssueType,
    { message: string; suggestion: string }
> = {
    cantilever: {
        message: 'Model has unsupported horizontal extensions',
        suggestion: 'Add support columns or reduce overhang length',
    },
    floating: {
        message: 'Some bricks appear to float without support',
        suggestion: 'Ensure all bricks connect to the structure below',
    },
    'too-tall': {
        message: 'Model is very tall relative to its base',
        suggestion: 'Widen the base or reduce height for stability',
    },
    'narrow-base': {
        message: 'Base is narrow for the model size',
        suggestion: 'Use a larger baseplate or wider foundation',
    },
    unbalanced: {
        message: 'Model weight distribution is uneven',
        suggestion: 'Balance the design or add counterweight bricks',
    },
};

/**
 * Default result for a stable model.
 * Used when analysis succeeds with no issues.
 */
export const DEFAULT_STABLE_RESULT: StructuralAnalysisResult = {
    isStable: true,
    issues: [],
    overallScore: 100,
    summary: 'Model looks stable and buildable!',
};

/**
 * Default result when analysis cannot be performed.
 * Used when parsing fails or analysis is unavailable.
 */
export const DEFAULT_UNKNOWN_RESULT: StructuralAnalysisResult = {
    isStable: true,
    issues: [],
    overallScore: 75,
    summary: 'Unable to analyze structure. Model may be buildable.',
};
