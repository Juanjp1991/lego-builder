import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getFirstBuildStatus,
    markFirstBuildComplete,
    setAdvancedPreference,
    resetFirstBuildStatus,
    FIRST_BUILD_KEY,
} from './first-build';

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
}));

import { get, set, del } from 'idb-keyval';

const mockGet = vi.mocked(get);
const mockSet = vi.mocked(set);
const mockDel = vi.mocked(del);

describe('first-build storage module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getFirstBuildStatus', () => {
        it('returns default status when no value stored', async () => {
            mockGet.mockResolvedValue(undefined);

            const status = await getFirstBuildStatus();

            expect(mockGet).toHaveBeenCalledWith(FIRST_BUILD_KEY);
            expect(status).toEqual({
                hasCompletedFirstBuild: false,
                prefersAdvanced: false,
            });
        });

        it('returns stored status when available', async () => {
            mockGet.mockResolvedValue({
                hasCompletedFirstBuild: true,
                prefersAdvanced: false,
            });

            const status = await getFirstBuildStatus();

            expect(status).toEqual({
                hasCompletedFirstBuild: true,
                prefersAdvanced: false,
            });
        });

        it('returns stored status with prefersAdvanced true', async () => {
            mockGet.mockResolvedValue({
                hasCompletedFirstBuild: false,
                prefersAdvanced: true,
            });

            const status = await getFirstBuildStatus();

            expect(status).toEqual({
                hasCompletedFirstBuild: false,
                prefersAdvanced: true,
            });
        });

        it('returns default status when storage throws error', async () => {
            mockGet.mockRejectedValue(new Error('Storage error'));

            const status = await getFirstBuildStatus();

            expect(status).toEqual({
                hasCompletedFirstBuild: false,
                prefersAdvanced: false,
            });
        });
    });

    describe('markFirstBuildComplete', () => {
        it('updates hasCompletedFirstBuild to true', async () => {
            mockGet.mockResolvedValue({
                hasCompletedFirstBuild: false,
                prefersAdvanced: false,
            });
            mockSet.mockResolvedValue(undefined);

            await markFirstBuildComplete();

            expect(mockSet).toHaveBeenCalledWith(FIRST_BUILD_KEY, {
                hasCompletedFirstBuild: true,
                prefersAdvanced: false,
            });
        });

        it('preserves prefersAdvanced value when marking complete', async () => {
            mockGet.mockResolvedValue({
                hasCompletedFirstBuild: false,
                prefersAdvanced: true,
            });
            mockSet.mockResolvedValue(undefined);

            await markFirstBuildComplete();

            expect(mockSet).toHaveBeenCalledWith(FIRST_BUILD_KEY, {
                hasCompletedFirstBuild: true,
                prefersAdvanced: true,
            });
        });

        it('handles missing existing data gracefully', async () => {
            mockGet.mockResolvedValue(undefined);
            mockSet.mockResolvedValue(undefined);

            await markFirstBuildComplete();

            expect(mockSet).toHaveBeenCalledWith(FIRST_BUILD_KEY, {
                hasCompletedFirstBuild: true,
                prefersAdvanced: false,
            });
        });
    });

    describe('setAdvancedPreference', () => {
        it('sets prefersAdvanced to true', async () => {
            mockGet.mockResolvedValue({
                hasCompletedFirstBuild: false,
                prefersAdvanced: false,
            });
            mockSet.mockResolvedValue(undefined);

            await setAdvancedPreference(true);

            expect(mockSet).toHaveBeenCalledWith(FIRST_BUILD_KEY, {
                hasCompletedFirstBuild: false,
                prefersAdvanced: true,
            });
        });

        it('sets prefersAdvanced to false', async () => {
            mockGet.mockResolvedValue({
                hasCompletedFirstBuild: false,
                prefersAdvanced: true,
            });
            mockSet.mockResolvedValue(undefined);

            await setAdvancedPreference(false);

            expect(mockSet).toHaveBeenCalledWith(FIRST_BUILD_KEY, {
                hasCompletedFirstBuild: false,
                prefersAdvanced: false,
            });
        });

        it('preserves hasCompletedFirstBuild value when setting preference', async () => {
            mockGet.mockResolvedValue({
                hasCompletedFirstBuild: true,
                prefersAdvanced: false,
            });
            mockSet.mockResolvedValue(undefined);

            await setAdvancedPreference(true);

            expect(mockSet).toHaveBeenCalledWith(FIRST_BUILD_KEY, {
                hasCompletedFirstBuild: true,
                prefersAdvanced: true,
            });
        });

        it('handles missing existing data gracefully', async () => {
            mockGet.mockResolvedValue(undefined);
            mockSet.mockResolvedValue(undefined);

            await setAdvancedPreference(true);

            expect(mockSet).toHaveBeenCalledWith(FIRST_BUILD_KEY, {
                hasCompletedFirstBuild: false,
                prefersAdvanced: true,
            });
        });
    });

    describe('resetFirstBuildStatus', () => {
        it('deletes the stored status', async () => {
            mockDel.mockResolvedValue(undefined);

            await resetFirstBuildStatus();

            expect(mockDel).toHaveBeenCalledWith(FIRST_BUILD_KEY);
        });
    });

    describe('FIRST_BUILD_KEY', () => {
        it('has the correct storage key', () => {
            expect(FIRST_BUILD_KEY).toBe('lego-builder:first-build-status');
        });
    });
});
