import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFirstBuild } from './useFirstBuild';

// Mock the storage module
vi.mock('@/lib/storage/first-build', () => ({
    getFirstBuildStatus: vi.fn(),
    markFirstBuildComplete: vi.fn(),
    setAdvancedPreference: vi.fn(),
}));

import {
    getFirstBuildStatus,
    markFirstBuildComplete,
    setAdvancedPreference,
} from '@/lib/storage/first-build';

const mockGetFirstBuildStatus = vi.mocked(getFirstBuildStatus);
const mockMarkFirstBuildComplete = vi.mocked(markFirstBuildComplete);
const mockSetAdvancedPreference = vi.mocked(setAdvancedPreference);

describe('useFirstBuild', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('initial loading', () => {
        it('starts in loading state', () => {
            mockGetFirstBuildStatus.mockImplementation(
                () => new Promise(() => { }) // Never resolves
            );

            const { result } = renderHook(() => useFirstBuild());

            expect(result.current.isLoading).toBe(true);
        });

        it('loads status from storage on mount', async () => {
            mockGetFirstBuildStatus.mockResolvedValue({
                hasCompletedFirstBuild: false,
                prefersAdvanced: false,
            });

            const { result } = renderHook(() => useFirstBuild());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(mockGetFirstBuildStatus).toHaveBeenCalledOnce();
        });

        it('uses default values when storage is empty', async () => {
            mockGetFirstBuildStatus.mockResolvedValue({
                hasCompletedFirstBuild: false,
                prefersAdvanced: false,
            });

            const { result } = renderHook(() => useFirstBuild());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.hasCompletedFirstBuild).toBe(false);
            expect(result.current.prefersAdvanced).toBe(false);
        });

        it('loads existing status from storage', async () => {
            mockGetFirstBuildStatus.mockResolvedValue({
                hasCompletedFirstBuild: true,
                prefersAdvanced: true,
            });

            const { result } = renderHook(() => useFirstBuild());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.hasCompletedFirstBuild).toBe(true);
            expect(result.current.prefersAdvanced).toBe(true);
        });

        it('handles storage errors gracefully', async () => {
            mockGetFirstBuildStatus.mockRejectedValue(new Error('Storage error'));

            const { result } = renderHook(() => useFirstBuild());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            // Should default to first-build mode
            expect(result.current.hasCompletedFirstBuild).toBe(false);
            expect(result.current.prefersAdvanced).toBe(false);
        });
    });

    describe('isFirstBuildMode computed property', () => {
        it('returns true for new users (no build, no advanced preference)', async () => {
            mockGetFirstBuildStatus.mockResolvedValue({
                hasCompletedFirstBuild: false,
                prefersAdvanced: false,
            });

            const { result } = renderHook(() => useFirstBuild());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.isFirstBuildMode).toBe(true);
        });

        it('returns false when user has completed first build', async () => {
            mockGetFirstBuildStatus.mockResolvedValue({
                hasCompletedFirstBuild: true,
                prefersAdvanced: false,
            });

            const { result } = renderHook(() => useFirstBuild());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.isFirstBuildMode).toBe(false);
        });

        it('returns false when user prefers advanced designs', async () => {
            mockGetFirstBuildStatus.mockResolvedValue({
                hasCompletedFirstBuild: false,
                prefersAdvanced: true,
            });

            const { result } = renderHook(() => useFirstBuild());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.isFirstBuildMode).toBe(false);
        });

        it('returns false when both conditions are true', async () => {
            mockGetFirstBuildStatus.mockResolvedValue({
                hasCompletedFirstBuild: true,
                prefersAdvanced: true,
            });

            const { result } = renderHook(() => useFirstBuild());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.isFirstBuildMode).toBe(false);
        });
    });

    describe('markComplete', () => {
        it('calls storage function and updates local state', async () => {
            mockGetFirstBuildStatus.mockResolvedValue({
                hasCompletedFirstBuild: false,
                prefersAdvanced: false,
            });
            mockMarkFirstBuildComplete.mockResolvedValue(undefined);

            const { result } = renderHook(() => useFirstBuild());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            await act(async () => {
                await result.current.markComplete();
            });

            expect(mockMarkFirstBuildComplete).toHaveBeenCalledOnce();
            expect(result.current.hasCompletedFirstBuild).toBe(true);
        });

        it('updates isFirstBuildMode after marking complete', async () => {
            mockGetFirstBuildStatus.mockResolvedValue({
                hasCompletedFirstBuild: false,
                prefersAdvanced: false,
            });
            mockMarkFirstBuildComplete.mockResolvedValue(undefined);

            const { result } = renderHook(() => useFirstBuild());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.isFirstBuildMode).toBe(true);

            await act(async () => {
                await result.current.markComplete();
            });

            expect(result.current.isFirstBuildMode).toBe(false);
        });
    });

    describe('toggleAdvanced', () => {
        it('sets advanced preference to true', async () => {
            mockGetFirstBuildStatus.mockResolvedValue({
                hasCompletedFirstBuild: false,
                prefersAdvanced: false,
            });
            mockSetAdvancedPreference.mockResolvedValue(undefined);

            const { result } = renderHook(() => useFirstBuild());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            await act(async () => {
                await result.current.toggleAdvanced(true);
            });

            expect(mockSetAdvancedPreference).toHaveBeenCalledWith(true);
            expect(result.current.prefersAdvanced).toBe(true);
        });

        it('sets advanced preference to false', async () => {
            mockGetFirstBuildStatus.mockResolvedValue({
                hasCompletedFirstBuild: false,
                prefersAdvanced: true,
            });
            mockSetAdvancedPreference.mockResolvedValue(undefined);

            const { result } = renderHook(() => useFirstBuild());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            await act(async () => {
                await result.current.toggleAdvanced(false);
            });

            expect(mockSetAdvancedPreference).toHaveBeenCalledWith(false);
            expect(result.current.prefersAdvanced).toBe(false);
        });

        it('updates isFirstBuildMode when toggling advanced on', async () => {
            mockGetFirstBuildStatus.mockResolvedValue({
                hasCompletedFirstBuild: false,
                prefersAdvanced: false,
            });
            mockSetAdvancedPreference.mockResolvedValue(undefined);

            const { result } = renderHook(() => useFirstBuild());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.isFirstBuildMode).toBe(true);

            await act(async () => {
                await result.current.toggleAdvanced(true);
            });

            expect(result.current.isFirstBuildMode).toBe(false);
        });

        it('updates isFirstBuildMode when toggling advanced off', async () => {
            mockGetFirstBuildStatus.mockResolvedValue({
                hasCompletedFirstBuild: false,
                prefersAdvanced: true,
            });
            mockSetAdvancedPreference.mockResolvedValue(undefined);

            const { result } = renderHook(() => useFirstBuild());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.isFirstBuildMode).toBe(false);

            await act(async () => {
                await result.current.toggleAdvanced(false);
            });

            expect(result.current.isFirstBuildMode).toBe(true);
        });
    });

    describe('callback stability', () => {
        it('markComplete callback is stable across re-renders', async () => {
            mockGetFirstBuildStatus.mockResolvedValue({
                hasCompletedFirstBuild: false,
                prefersAdvanced: false,
            });

            const { result, rerender } = renderHook(() => useFirstBuild());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            const firstMarkComplete = result.current.markComplete;
            rerender();

            expect(result.current.markComplete).toBe(firstMarkComplete);
        });

        it('toggleAdvanced callback is stable across re-renders', async () => {
            mockGetFirstBuildStatus.mockResolvedValue({
                hasCompletedFirstBuild: false,
                prefersAdvanced: false,
            });

            const { result, rerender } = renderHook(() => useFirstBuild());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            const firstToggleAdvanced = result.current.toggleAdvanced;
            rerender();

            expect(result.current.toggleAdvanced).toBe(firstToggleAdvanced);
        });
    });
});
