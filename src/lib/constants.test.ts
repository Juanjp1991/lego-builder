import { describe, it, expect } from 'vitest';
import { MAX_RETRIES } from './constants';

describe('constants', () => {
    describe('MAX_RETRIES', () => {
        it('should be defined', () => {
            expect(MAX_RETRIES).toBeDefined();
        });

        it('should be 3 per FR3 requirement', () => {
            expect(MAX_RETRIES).toBe(3);
        });

        it('should be a positive number', () => {
            expect(MAX_RETRIES).toBeGreaterThan(0);
        });
    });
});
