/**
 * AdvancedModeToggle Component
 *
 * Toggle switch allowing users to opt out of First-Build Guarantee (simple mode)
 * and request advanced designs instead.
 *
 * @see Story 2.5: Implement First-Build Guarantee
 */

'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface AdvancedModeToggleProps {
    /** Whether advanced mode is enabled */
    checked: boolean;
    /** Callback when toggle state changes */
    onCheckedChange: (checked: boolean) => void;
    /** Whether the toggle is disabled */
    disabled?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Toggle component for opting out of First-Build Guarantee.
 *
 * Allows first-time users to skip simple mode and request advanced designs.
 * The preference is persisted and survives page refreshes.
 *
 * @example
 * ```tsx
 * <AdvancedModeToggle
 *   checked={prefersAdvanced}
 *   onCheckedChange={toggleAdvanced}
 * />
 * ```
 */
export function AdvancedModeToggle({
    checked,
    onCheckedChange,
    disabled = false,
    className = '',
}: AdvancedModeToggleProps) {
    return (
        <div
            className={`flex items-center space-x-3 ${className}`}
            data-testid="advanced-mode-toggle-container"
        >
            <Switch
                id="advanced-mode"
                checked={checked}
                onCheckedChange={onCheckedChange}
                disabled={disabled}
                aria-describedby="advanced-mode-description"
                data-testid="advanced-mode-switch"
            />
            <div className="flex flex-col">
                <Label
                    htmlFor="advanced-mode"
                    className={`cursor-pointer text-sm font-medium ${disabled ? 'opacity-50' : ''}`}
                >
                    Show me advanced designs
                </Label>
                <p
                    id="advanced-mode-description"
                    className="text-xs text-muted-foreground"
                >
                    Skip simple mode for your first creation
                </p>
            </div>
        </div>
    );
}
