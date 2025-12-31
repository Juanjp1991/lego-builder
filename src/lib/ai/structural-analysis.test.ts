/**
 * Tests for Structural Analysis Types and Constants
 *
 * @see Story 2.6: Add Structural Feedback for Generated Models
 */

import { describe, it, expect } from 'vitest';
import {
    STABILITY_THRESHOLD,
    STRUCTURAL_ISSUE_TYPES,
    STRUCTURAL_ISSUE_MESSAGES,
    DEFAULT_STABLE_RESULT,
    DEFAULT_UNKNOWN_RESULT,
    type StructuralIssueType,
    type IssueSeverity,
    type StructuralIssue,
    type StructuralAnalysisResult,
} from './structural-analysis';

describe('structural-analysis types and constants', () => {
    describe('STABILITY_THRESHOLD', () => {
        it('should be a reasonable threshold value', () => {
            expect(STABILITY_THRESHOLD).toBeGreaterThan(0);
            expect(STABILITY_THRESHOLD).toBeLessThanOrEqual(100);
        });

        it('should be 70', () => {
            expect(STABILITY_THRESHOLD).toBe(70);
        });
    });

    describe('STRUCTURAL_ISSUE_TYPES', () => {
        it('should contain all expected issue types', () => {
            expect(STRUCTURAL_ISSUE_TYPES).toContain('cantilever');
            expect(STRUCTURAL_ISSUE_TYPES).toContain('floating');
            expect(STRUCTURAL_ISSUE_TYPES).toContain('too-tall');
            expect(STRUCTURAL_ISSUE_TYPES).toContain('narrow-base');
            expect(STRUCTURAL_ISSUE_TYPES).toContain('unbalanced');
        });

        it('should have exactly 5 issue types', () => {
            expect(STRUCTURAL_ISSUE_TYPES).toHaveLength(5);
        });
    });

    describe('STRUCTURAL_ISSUE_MESSAGES', () => {
        it('should have messages for all issue types', () => {
            for (const type of STRUCTURAL_ISSUE_TYPES) {
                expect(STRUCTURAL_ISSUE_MESSAGES[type]).toBeDefined();
                expect(STRUCTURAL_ISSUE_MESSAGES[type].message).toBeTruthy();
                expect(STRUCTURAL_ISSUE_MESSAGES[type].suggestion).toBeTruthy();
            }
        });

        it('should have non-empty messages and suggestions', () => {
            Object.values(STRUCTURAL_ISSUE_MESSAGES).forEach(({ message, suggestion }) => {
                expect(message.length).toBeGreaterThan(10);
                expect(suggestion.length).toBeGreaterThan(10);
            });
        });

        it('cantilever messages should mention support', () => {
            expect(STRUCTURAL_ISSUE_MESSAGES.cantilever.suggestion.toLowerCase()).toContain(
                'support'
            );
        });

        it('floating messages should mention connection', () => {
            expect(STRUCTURAL_ISSUE_MESSAGES.floating.suggestion.toLowerCase()).toContain(
                'connect'
            );
        });
    });

    describe('DEFAULT_STABLE_RESULT', () => {
        it('should be marked as stable', () => {
            expect(DEFAULT_STABLE_RESULT.isStable).toBe(true);
        });

        it('should have no issues', () => {
            expect(DEFAULT_STABLE_RESULT.issues).toHaveLength(0);
        });

        it('should have a perfect score', () => {
            expect(DEFAULT_STABLE_RESULT.overallScore).toBe(100);
        });

        it('should have a positive summary', () => {
            expect(DEFAULT_STABLE_RESULT.summary.toLowerCase()).toContain('stable');
        });
    });

    describe('DEFAULT_UNKNOWN_RESULT', () => {
        it('should be marked as stable (benefit of the doubt)', () => {
            expect(DEFAULT_UNKNOWN_RESULT.isStable).toBe(true);
        });

        it('should have a moderate score', () => {
            expect(DEFAULT_UNKNOWN_RESULT.overallScore).toBeGreaterThan(50);
            expect(DEFAULT_UNKNOWN_RESULT.overallScore).toBeLessThan(100);
        });

        it('should indicate uncertainty in summary', () => {
            expect(DEFAULT_UNKNOWN_RESULT.summary.toLowerCase()).toContain('unable');
        });
    });

    describe('Type usage', () => {
        it('should allow creating a valid StructuralIssue', () => {
            const issue: StructuralIssue = {
                type: 'cantilever',
                severity: 'warning',
                message: 'Test message',
                suggestion: 'Test suggestion',
            };

            expect(issue.type).toBe('cantilever');
            expect(issue.severity).toBe('warning');
        });

        it('should allow creating a valid StructuralAnalysisResult', () => {
            const result: StructuralAnalysisResult = {
                isStable: false,
                issues: [
                    {
                        type: 'floating',
                        severity: 'critical',
                        message: 'Floating bricks detected',
                        suggestion: 'Add support',
                    },
                ],
                overallScore: 45,
                summary: 'Model has issues',
            };

            expect(result.isStable).toBe(false);
            expect(result.issues).toHaveLength(1);
            expect(result.overallScore).toBe(45);
        });

        it('should allow all severity levels', () => {
            const warningSeverity: IssueSeverity = 'warning';
            const criticalSeverity: IssueSeverity = 'critical';

            expect(warningSeverity).toBe('warning');
            expect(criticalSeverity).toBe('critical');
        });

        it('should allow all issue types', () => {
            const types: StructuralIssueType[] = [
                'cantilever',
                'floating',
                'too-tall',
                'narrow-base',
                'unbalanced',
            ];

            types.forEach((type) => {
                expect(STRUCTURAL_ISSUE_TYPES).toContain(type);
            });
        });
    });
});
