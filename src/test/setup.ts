import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// Mock ResizeObserver for Radix UI components (Tooltip, etc.)
class ResizeObserverMock {
    observe() { }
    unobserve() { }
    disconnect() { }
}
global.ResizeObserver = ResizeObserverMock;

// Cleanup after each test to prevent DOM pollution
afterEach(() => {
    cleanup();
});
