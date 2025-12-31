'use client';

import { Card, CardContent } from '@/components/ui/card';

/**
 * Template suggestion item
 */
export interface TemplateSuggestion {
    name: string;
    prompt: string;
}

/**
 * Pre-defined simple templates for when retries are exhausted
 * These are proven-buildable simple designs that work well with AI generation
 */
export const TEMPLATE_SUGGESTIONS: TemplateSuggestion[] = [
    { name: 'Simple House', prompt: 'a simple house with a door and two windows' },
    { name: 'Car', prompt: 'a simple car with four wheels' },
    { name: 'Tree', prompt: 'a tree with a brown trunk and green leaves' },
    { name: 'Robot', prompt: 'a friendly robot with a boxy body' },
];

/**
 * Props for TemplateSuggestions component
 */
export interface TemplateSuggestionsProps {
    /** Callback when a template is selected */
    onSelectTemplate: (prompt: string) => void;
}

/**
 * TemplateSuggestions Component
 *
 * Displays simple template suggestions when retry limit is exhausted.
 * Provides a fallback for users who couldn't get satisfactory results.
 *
 * @see Story 2.4: Add Free Retry Mechanism
 * @see FR37: After exhausting retries, template suggestions are offered
 *
 * @example
 * ```tsx
 * <TemplateSuggestions
 *   onSelectTemplate={(prompt) => {
 *     reset();
 *     generate(prompt);
 *   }}
 * />
 * ```
 */
export function TemplateSuggestions({ onSelectTemplate }: TemplateSuggestionsProps) {
    /**
     * Handle keyboard activation (Enter or Space)
     */
    const handleKeyDown = (event: React.KeyboardEvent, prompt: string) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelectTemplate(prompt);
        }
    };

    return (
        <div className="space-y-4" data-testid="template-suggestions">
            <p className="text-center text-muted-foreground">
                Not quite right? Try one of these simple templates:
            </p>
            <div className="grid grid-cols-2 gap-3">
                {TEMPLATE_SUGGESTIONS.map((template) => (
                    <Card
                        key={template.name}
                        className="cursor-pointer hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        onClick={() => onSelectTemplate(template.prompt)}
                        onKeyDown={(e) => handleKeyDown(e, template.prompt)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Select ${template.name} template`}
                        data-testid={`template-${template.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                        <CardContent className="p-4 text-center">
                            <p className="font-medium">{template.name}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
