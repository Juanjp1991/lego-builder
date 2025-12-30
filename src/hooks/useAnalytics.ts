'use client';

import { usePostHog } from 'posthog-js/react';
import type { AnalyticsEventName, AnalyticsEventProperties } from '@/types/analytics';

export function useAnalytics() {
    const posthog = usePostHog();

    /**
     * Tracks a core application event with PostHog
     * @param event The name of the event to track
     * @param properties Type-safe properties for the specific event
     */
    const trackEvent = <T extends AnalyticsEventName>(
        event: T,
        properties?: AnalyticsEventProperties[T]
    ) => {
        if (posthog) {
            posthog.capture(event, properties);
        }
    };

    /**
     * Resets the current user session (useful for anonymous switching)
     */
    const reset = () => {
        if (posthog) {
            posthog.reset();
        }
    };

    return { trackEvent, reset };
}
