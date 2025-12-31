/**
 * useFirstBuild Hook
 *
 * React hook for managing first-build status and preferences.
 * Provides a clean interface for components to check and update first-build state.
 *
 * @see Story 2.5: Implement First-Build Guarantee
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    getFirstBuildStatus,
    markFirstBuildComplete,
    setAdvancedPreference,
    type FirstBuildStatus,
} from '@/lib/storage/first-build';

/**
 * Internal state for the useFirstBuild hook.
 */
interface FirstBuildState {
    isLoading: boolean;
    hasCompletedFirstBuild: boolean;
    prefersAdvanced: boolean;
}

/**
 * Return type for the useFirstBuild hook.
 */
interface UseFirstBuildReturn {
    /** Whether the hook is still loading from storage */
    isLoading: boolean;
    /** Whether the user has completed their first build */
    hasCompletedFirstBuild: boolean;
    /** Whether the user prefers advanced (non-simple) designs */
    prefersAdvanced: boolean;
    /** Computed: whether first-build mode is currently active */
    isFirstBuildMode: boolean;
    /** Mark the first build as complete */
    markComplete: () => Promise<void>;
    /** Toggle advanced design preference */
    toggleAdvanced: (value: boolean) => Promise<void>;
}

/**
 * Hook for managing first-build guarantee state.
 *
 * Loads the first-build status from IndexedDB on mount and provides
 * callbacks to update the status. The `isFirstBuildMode` computed value
 * is true when the user hasn't completed their first build AND hasn't
 * opted for advanced designs.
 *
 * @returns Object containing first-build state and callbacks
 *
 * @example
 * ```tsx
 * const { isFirstBuildMode, isLoading, markComplete, toggleAdvanced } = useFirstBuild();
 *
 * if (isLoading) return <Loading />;
 *
 * if (isFirstBuildMode) {
 *   // Show simple mode UI
 * }
 * ```
 */
export function useFirstBuild(): UseFirstBuildReturn {
    const [state, setState] = useState<FirstBuildState>({
        isLoading: true,
        hasCompletedFirstBuild: false,
        prefersAdvanced: false,
    });

    // Load status from storage on mount
    useEffect(() => {
        let isMounted = true;

        async function loadStatus() {
            try {
                const status: FirstBuildStatus = await getFirstBuildStatus();
                if (isMounted) {
                    setState({
                        isLoading: false,
                        hasCompletedFirstBuild: status.hasCompletedFirstBuild,
                        prefersAdvanced: status.prefersAdvanced,
                    });
                }
            } catch {
                // Default to allowing first-build mode if storage fails
                if (isMounted) {
                    setState((prev) => ({ ...prev, isLoading: false }));
                }
            }
        }

        loadStatus();

        // Cleanup to prevent state updates on unmounted component
        return () => {
            isMounted = false;
        };
    }, []);

    /**
     * Mark the first build as complete.
     * Updates both storage and local state.
     */
    const markComplete = useCallback(async () => {
        await markFirstBuildComplete();
        setState((prev) => ({ ...prev, hasCompletedFirstBuild: true }));
    }, []);

    /**
     * Toggle the advanced design preference.
     * Updates both storage and local state.
     *
     * @param value - True to prefer advanced designs
     */
    const toggleAdvanced = useCallback(async (value: boolean) => {
        await setAdvancedPreference(value);
        setState((prev) => ({ ...prev, prefersAdvanced: value }));
    }, []);

    // Computed: is first-build mode active?
    // First-build mode is active when:
    // 1. User has NOT completed their first build
    // 2. User has NOT opted for advanced designs
    const isFirstBuildMode = !state.hasCompletedFirstBuild && !state.prefersAdvanced;

    return {
        isLoading: state.isLoading,
        hasCompletedFirstBuild: state.hasCompletedFirstBuild,
        prefersAdvanced: state.prefersAdvanced,
        isFirstBuildMode,
        markComplete,
        toggleAdvanced,
    };
}
