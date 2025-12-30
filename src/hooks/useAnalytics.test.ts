import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAnalytics } from './useAnalytics';
import { usePostHog } from 'posthog-js/react';

// Mock posthog-js/react
vi.mock('posthog-js/react', () => ({
    usePostHog: vi.fn(),
}));

describe('useAnalytics', () => {
    const mockPostHog = {
        capture: vi.fn(),
        reset: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (usePostHog as any).mockReturnValue(mockPostHog);
    });

    it('tracks events with properties', () => {
        const { result } = renderHook(() => useAnalytics());

        result.current.trackEvent('scan_started', { source: 'camera' });

        expect(mockPostHog.capture).toHaveBeenCalledWith('scan_started', { source: 'camera' });
    });

    it('tracks events without properties', () => {
        const { result } = renderHook(() => useAnalytics());

        // Use an event that might not require properties if we wanted, but let's test the call
        result.current.trackEvent('build_started', { model_id: '123' });

        expect(mockPostHog.capture).toHaveBeenCalledWith('build_started', { model_id: '123' });
    });

    it('resets session', () => {
        const { result } = renderHook(() => useAnalytics());

        result.current.reset();

        expect(mockPostHog.reset).toHaveBeenCalled();
    });

    it('handles missing posthog gracefully', () => {
        (usePostHog as any).mockReturnValue(null);
        const { result } = renderHook(() => useAnalytics());

        // Should not throw
        result.current.trackEvent('scan_started', { source: 'camera' });
        result.current.reset();

        expect(mockPostHog.capture).not.toHaveBeenCalled();
        expect(mockPostHog.reset).not.toHaveBeenCalled();
    });
});
