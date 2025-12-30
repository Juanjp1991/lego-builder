'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

const DEFAULT_POSTHOG_HOST = 'https://app.posthog.com';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('[PostHog] NEXT_PUBLIC_POSTHOG_KEY is missing. Analytics will be disabled.');
                }
                return;
            }

            posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
                api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_POSTHOG_HOST,
                capture_pageview: true,
                capture_pageleave: true,
                // Privacy settings
                disable_session_recording: true,
                persistence: 'localStorage',
                autocapture: false, // Explicitly disable to avoid capturing sensitive clicks
                mask_all_text: true, // Privacy first
                mask_all_element_attributes: true,
            });
        }
    }, []);

    return <PHProvider client={posthog}>{children}</PHProvider>;
}
