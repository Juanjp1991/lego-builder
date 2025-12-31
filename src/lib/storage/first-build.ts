/**
 * First-Build Storage Module
 *
 * Manages first-build status and preferences using IndexedDB via idb-keyval.
 * Used for First-Build Guarantee feature (FR6) - ensuring first-time users
 * get simple, buildable designs.
 *
 * @see Story 2.5: Implement First-Build Guarantee
 */

import { get, set, del } from 'idb-keyval';

/** Storage key for first-build status */
export const FIRST_BUILD_KEY = 'lego-builder:first-build-status';

/**
 * Status of the first-build guarantee for a user.
 */
export interface FirstBuildStatus {
    /** Whether the user has completed their first build */
    hasCompletedFirstBuild: boolean;
    /** Whether the user has opted out of simple mode */
    prefersAdvanced: boolean;
}

/**
 * Default first-build status for new users.
 */
const DEFAULT_STATUS: FirstBuildStatus = {
    hasCompletedFirstBuild: false,
    prefersAdvanced: false,
};

/**
 * Retrieves the current first-build status from storage.
 * Returns default status if no value is stored or on error.
 *
 * @returns Promise resolving to the first-build status
 */
export async function getFirstBuildStatus(): Promise<FirstBuildStatus> {
    try {
        const status = await get<FirstBuildStatus>(FIRST_BUILD_KEY);
        return status ?? DEFAULT_STATUS;
    } catch {
        // Return default status on error (e.g., IndexedDB not available)
        return DEFAULT_STATUS;
    }
}

/**
 * Marks the first build as complete.
 * Preserves other preferences when updating.
 *
 * @returns Promise that resolves when the status is updated
 */
export async function markFirstBuildComplete(): Promise<void> {
    const current = await getFirstBuildStatus();
    await set(FIRST_BUILD_KEY, {
        ...current,
        hasCompletedFirstBuild: true,
    });
}

/**
 * Sets the user's preference for advanced designs.
 * Allows users to opt out of simple mode before completing their first build.
 *
 * @param value - True to prefer advanced designs, false for simple mode
 * @returns Promise that resolves when the preference is saved
 */
export async function setAdvancedPreference(value: boolean): Promise<void> {
    const current = await getFirstBuildStatus();
    await set(FIRST_BUILD_KEY, {
        ...current,
        prefersAdvanced: value,
    });
}

/**
 * Resets the first-build status.
 * Used for testing and development purposes.
 *
 * @returns Promise that resolves when the status is deleted
 */
export async function resetFirstBuildStatus(): Promise<void> {
    await del(FIRST_BUILD_KEY);
}
