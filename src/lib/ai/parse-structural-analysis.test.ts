/**
 * Tests for Structural Analysis Parser
 *
 * @see Story 2.6: Add Structural Feedback for Generated Models
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    parseStructuralAnalysis,
    extractCleanHtml,
    hasStructuralAnalysis,
} from './parse-structural-analysis';

// Sample HTML scenes for testing
const createHtmlWithAnalysis = (analysisJson: string) => `
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
<script type="module">
addBrick(2, 4, 0, 0, 0, 0xff0000);
addBrick(2, 4, 2, 0, 0, 0x00ff00);
<!-- STRUCTURAL_ANALYSIS: ${analysisJson} -->
</script>
</body>
</html>
`;

const STABLE_ANALYSIS_JSON = JSON.stringify({
    isStable: true,
    issues: [],
    overallScore: 95,
    summary: 'Solid base, staggered joints, well-balanced structure.',
});

const UNSTABLE_ANALYSIS_JSON = JSON.stringify({
    isStable: false,
    issues: [
        {
            type: 'cantilever',
            severity: 'warning',
            message: 'Wing extends 4 studs without support',
            suggestion: 'Add pillar at stud position (5,0,2)',
        },
        {
            type: 'narrow-base',
            severity: 'critical',
            message: 'Base is too narrow',
            suggestion: 'Widen the foundation',
        },
    ],
    overallScore: 45,
    summary: 'Model has stability concerns.',
});

const HTML_WITHOUT_ANALYSIS = `
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
<script type="module">
addBrick(2, 4, 0, 0, 0, 0xff0000);
</script>
</body>
</html>
`;

describe('parseStructuralAnalysis', () => {
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        consoleWarnSpy.mockRestore();
    });

    it('parses a stable model analysis correctly', () => {
        const html = createHtmlWithAnalysis(STABLE_ANALYSIS_JSON);
        const result = parseStructuralAnalysis(html);

        expect(result).not.toBeNull();
        expect(result?.isStable).toBe(true);
        expect(result?.issues).toHaveLength(0);
        expect(result?.overallScore).toBe(95);
        expect(result?.summary).toContain('Solid base');
    });

    it('parses an unstable model analysis correctly', () => {
        const html = createHtmlWithAnalysis(UNSTABLE_ANALYSIS_JSON);
        const result = parseStructuralAnalysis(html);

        expect(result).not.toBeNull();
        expect(result?.isStable).toBe(false);
        expect(result?.issues).toHaveLength(2);
        expect(result?.overallScore).toBe(45);
        expect(result?.summary).toContain('stability concerns');
    });

    it('extracts all issue details correctly', () => {
        const html = createHtmlWithAnalysis(UNSTABLE_ANALYSIS_JSON);
        const result = parseStructuralAnalysis(html);

        expect(result?.issues[0]).toEqual({
            type: 'cantilever',
            severity: 'warning',
            message: 'Wing extends 4 studs without support',
            suggestion: 'Add pillar at stud position (5,0,2)',
        });

        expect(result?.issues[1]).toEqual({
            type: 'narrow-base',
            severity: 'critical',
            message: 'Base is too narrow',
            suggestion: 'Widen the foundation',
        });
    });

    it('returns null when no analysis is present', () => {
        const result = parseStructuralAnalysis(HTML_WITHOUT_ANALYSIS);
        expect(result).toBeNull();
    });

    it('returns null for empty string', () => {
        const result = parseStructuralAnalysis('');
        expect(result).toBeNull();
    });

    it('returns null for invalid JSON', () => {
        // Use JSON that matches regex pattern but is syntactically invalid
        const html = createHtmlWithAnalysis('{ invalid: json, }');
        const result = parseStructuralAnalysis(html);
        expect(result).toBeNull();
        expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('returns null when isStable is missing', () => {
        const html = createHtmlWithAnalysis(
            JSON.stringify({ issues: [], overallScore: 100 })
        );
        const result = parseStructuralAnalysis(html);
        expect(result).toBeNull();
        expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('provides default score of 100 for stable models without score', () => {
        const html = createHtmlWithAnalysis(
            JSON.stringify({ isStable: true, issues: [] })
        );
        const result = parseStructuralAnalysis(html);

        expect(result?.isStable).toBe(true);
        expect(result?.overallScore).toBe(100);
    });

    it('provides default score of 50 for unstable models without score', () => {
        const html = createHtmlWithAnalysis(
            JSON.stringify({ isStable: false, issues: [] })
        );
        const result = parseStructuralAnalysis(html);

        expect(result?.isStable).toBe(false);
        expect(result?.overallScore).toBe(50);
    });

    it('provides default summary for stable models without summary', () => {
        const html = createHtmlWithAnalysis(
            JSON.stringify({ isStable: true, issues: [], overallScore: 90 })
        );
        const result = parseStructuralAnalysis(html);

        expect(result?.summary).toBe('Model appears stable.');
    });

    it('provides default summary for unstable models without summary', () => {
        const html = createHtmlWithAnalysis(
            JSON.stringify({ isStable: false, issues: [], overallScore: 40 })
        );
        const result = parseStructuralAnalysis(html);

        expect(result?.summary).toBe('Model may have structural issues.');
    });

    it('clamps overallScore to 0-100 range', () => {
        const htmlHigh = createHtmlWithAnalysis(
            JSON.stringify({ isStable: true, issues: [], overallScore: 150 })
        );
        const resultHigh = parseStructuralAnalysis(htmlHigh);
        expect(resultHigh?.overallScore).toBe(100);

        const htmlLow = createHtmlWithAnalysis(
            JSON.stringify({ isStable: false, issues: [], overallScore: -20 })
        );
        const resultLow = parseStructuralAnalysis(htmlLow);
        expect(resultLow?.overallScore).toBe(0);
    });

    it('filters out invalid issues and keeps valid ones', () => {
        const mixedIssues = JSON.stringify({
            isStable: false,
            issues: [
                {
                    type: 'floating',
                    severity: 'critical',
                    message: 'Valid issue',
                    suggestion: 'Fix it',
                },
                { type: 'missing-fields' }, // Invalid - missing fields
                'not an object', // Invalid - not an object
                null, // Invalid - null
            ],
            overallScore: 60,
        });
        const html = createHtmlWithAnalysis(mixedIssues);
        const result = parseStructuralAnalysis(html);

        expect(result?.issues).toHaveLength(1);
        expect(result?.issues[0].type).toBe('floating');
    });

    it('handles multiline JSON in comment', () => {
        const multilineJson = `{
      "isStable": true,
      "issues": [],
      "overallScore": 88,
      "summary": "Good structure"
    }`;
        const html = createHtmlWithAnalysis(multilineJson);
        const result = parseStructuralAnalysis(html);

        expect(result?.isStable).toBe(true);
        expect(result?.overallScore).toBe(88);
    });
});

describe('extractCleanHtml', () => {
    it('removes the structural analysis comment', () => {
        const html = createHtmlWithAnalysis(STABLE_ANALYSIS_JSON);
        const clean = extractCleanHtml(html);

        expect(clean).not.toContain('STRUCTURAL_ANALYSIS');
        expect(clean).toContain('addBrick');
        expect(clean).toContain('<!DOCTYPE html>');
    });

    it('returns original HTML when no analysis present', () => {
        const clean = extractCleanHtml(HTML_WITHOUT_ANALYSIS);
        expect(clean.trim()).toBe(HTML_WITHOUT_ANALYSIS.trim());
    });

    it('returns empty string for empty input', () => {
        const clean = extractCleanHtml('');
        expect(clean).toBe('');
    });
});

describe('hasStructuralAnalysis', () => {
    it('returns true when analysis is present', () => {
        const html = createHtmlWithAnalysis(STABLE_ANALYSIS_JSON);
        expect(hasStructuralAnalysis(html)).toBe(true);
    });

    it('returns false when analysis is absent', () => {
        expect(hasStructuralAnalysis(HTML_WITHOUT_ANALYSIS)).toBe(false);
    });

    it('returns false for empty string', () => {
        expect(hasStructuralAnalysis('')).toBe(false);
    });

    it('returns false for partial match', () => {
        const partial = '<!-- STRUCTURAL_ANALYSIS: not closed';
        expect(hasStructuralAnalysis(partial)).toBe(false);
    });
});
