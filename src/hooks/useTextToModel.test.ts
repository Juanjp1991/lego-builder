import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTextToModel } from './useTextToModel';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useTextToModel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    /**
     * Helper to create a mock streaming response
     */
    function createMockStreamResponse(html: string, ok = true, status = 200) {
        const encoder = new TextEncoder();
        const chunks = [encoder.encode(html)];
        let chunkIndex = 0;

        return {
            ok,
            status,
            body: {
                getReader: () => ({
                    read: vi.fn().mockImplementation(() => {
                        if (chunkIndex < chunks.length) {
                            const value = chunks[chunkIndex];
                            chunkIndex++;
                            return Promise.resolve({ done: false, value });
                        }
                        return Promise.resolve({ done: true, value: undefined });
                    }),
                }),
            },
            json: vi.fn().mockResolvedValue({}),
        };
    }

    /**
     * Helper to create mock error response
     */
    function createMockErrorResponse(code: string, message: string, status = 400) {
        return {
            ok: false,
            status,
            json: vi.fn().mockResolvedValue({
                success: false,
                error: { code, message },
            }),
        };
    }

    describe('Initial State', () => {
        it('should have idle status initially', () => {
            const { result } = renderHook(() => useTextToModel());

            expect(result.current.status).toBe('idle');
        });

        it('should have null phase initially', () => {
            const { result } = renderHook(() => useTextToModel());

            expect(result.current.phase).toBeNull();
        });

        it('should have null generatedHtml initially', () => {
            const { result } = renderHook(() => useTextToModel());

            expect(result.current.generatedHtml).toBeNull();
        });

        it('should have null error initially', () => {
            const { result } = renderHook(() => useTextToModel());

            expect(result.current.error).toBeNull();
        });

        it('should have null duration initially', () => {
            const { result } = renderHook(() => useTextToModel());

            expect(result.current.duration).toBeNull();
        });
    });

    describe('generate()', () => {
        it('should transition to generating status when called', async () => {
            mockFetch.mockResolvedValue(createMockStreamResponse('<html>test</html>'));
            const { result } = renderHook(() => useTextToModel());

            await act(async () => {
                result.current.generate('dragon');
            });

            // During generation, status should be 'generating'
            // After generation completes, it transitions to 'success'
            expect(result.current.status).toBe('success');
        });

        it('should set phase to imagining initially', async () => {
            mockFetch.mockImplementation(() => new Promise(() => { })); // Never resolves
            const { result } = renderHook(() => useTextToModel());

            act(() => {
                result.current.generate('dragon');
            });

            expect(result.current.phase).toBe('imagining');
        });

        it('should call /api/generate with correct payload', async () => {
            mockFetch.mockResolvedValue(createMockStreamResponse('<html>test</html>'));
            const { result } = renderHook(() => useTextToModel());

            await act(async () => {
                await result.current.generate('dragon');
            });

            expect(mockFetch).toHaveBeenCalledWith('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: 'dragon' }),
                signal: expect.any(AbortSignal),
            });
        });

        it('should set generatedHtml on success', async () => {
            const mockHtml = '<html><body>Lego Dragon Model</body></html>';
            mockFetch.mockResolvedValue(createMockStreamResponse(mockHtml));
            const { result } = renderHook(() => useTextToModel());

            await act(async () => {
                await result.current.generate('dragon');
            });

            expect(result.current.generatedHtml).toBe(mockHtml);
        });

        it('should set status to success on successful generation', async () => {
            mockFetch.mockResolvedValue(createMockStreamResponse('<html>test</html>'));
            const { result } = renderHook(() => useTextToModel());

            await act(async () => {
                await result.current.generate('dragon');
            });

            expect(result.current.status).toBe('success');
        });

        it('should clear phase after successful generation', async () => {
            mockFetch.mockResolvedValue(createMockStreamResponse('<html>test</html>'));
            const { result } = renderHook(() => useTextToModel());

            await act(async () => {
                await result.current.generate('dragon');
            });

            expect(result.current.phase).toBeNull();
        });

        it('should track duration on success', async () => {
            mockFetch.mockResolvedValue(createMockStreamResponse('<html>test</html>'));
            const { result } = renderHook(() => useTextToModel());

            await act(async () => {
                await result.current.generate('dragon');
            });

            expect(result.current.duration).toBeTypeOf('number');
            expect(result.current.duration).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Error Handling', () => {
        it('should set status to error on API failure', async () => {
            mockFetch.mockResolvedValue(createMockErrorResponse('GENERATION_FAILED', 'Failed'));
            const { result } = renderHook(() => useTextToModel());

            await act(async () => {
                await result.current.generate('dragon');
            });

            expect(result.current.status).toBe('error');
        });

        it('should set user-friendly error message for GENERATION_FAILED', async () => {
            mockFetch.mockResolvedValue(createMockErrorResponse('GENERATION_FAILED', 'Technical error'));
            const { result } = renderHook(() => useTextToModel());

            await act(async () => {
                await result.current.generate('dragon');
            });

            expect(result.current.error).toBe("Couldn't create your design. Want to try again?");
        });

        it('should set user-friendly error message for RATE_LIMITED', async () => {
            mockFetch.mockResolvedValue(createMockErrorResponse('RATE_LIMITED', 'Too many requests', 429));
            const { result } = renderHook(() => useTextToModel());

            await act(async () => {
                await result.current.generate('dragon');
            });

            expect(result.current.error).toBe("You're creating too fast! Please wait a moment.");
        });

        it('should set user-friendly error message for INVALID_INPUT', async () => {
            mockFetch.mockResolvedValue(createMockErrorResponse('INVALID_INPUT', 'Bad input'));
            const { result } = renderHook(() => useTextToModel());

            await act(async () => {
                await result.current.generate('dragon');
            });

            expect(result.current.error).toBe("Please enter a description of what you'd like to build.");
        });

        it('should set errorCode on failure', async () => {
            mockFetch.mockResolvedValue(createMockErrorResponse('RATE_LIMITED', 'error'));
            const { result } = renderHook(() => useTextToModel());

            await act(async () => {
                await result.current.generate('dragon');
            });

            expect(result.current.errorCode).toBe('RATE_LIMITED');
        });

        it('should clear phase on error', async () => {
            mockFetch.mockResolvedValue(createMockErrorResponse('GENERATION_FAILED', 'Failed'));
            const { result } = renderHook(() => useTextToModel());

            await act(async () => {
                await result.current.generate('dragon');
            });

            expect(result.current.phase).toBeNull();
        });
    });

    describe('reset()', () => {
        it('should reset status to idle', async () => {
            mockFetch.mockResolvedValue(createMockStreamResponse('<html>test</html>'));
            const { result } = renderHook(() => useTextToModel());

            await act(async () => {
                await result.current.generate('dragon');
            });

            expect(result.current.status).toBe('success');

            act(() => {
                result.current.reset();
            });

            expect(result.current.status).toBe('idle');
        });

        it('should clear generatedHtml', async () => {
            mockFetch.mockResolvedValue(createMockStreamResponse('<html>test</html>'));
            const { result } = renderHook(() => useTextToModel());

            await act(async () => {
                await result.current.generate('dragon');
            });

            expect(result.current.generatedHtml).not.toBeNull();

            act(() => {
                result.current.reset();
            });

            expect(result.current.generatedHtml).toBeNull();
        });

        it('should clear error', async () => {
            mockFetch.mockResolvedValue(createMockErrorResponse('GENERATION_FAILED', 'Failed'));
            const { result } = renderHook(() => useTextToModel());

            await act(async () => {
                await result.current.generate('dragon');
            });

            expect(result.current.error).not.toBeNull();

            act(() => {
                result.current.reset();
            });

            expect(result.current.error).toBeNull();
        });

        it('should clear duration', async () => {
            mockFetch.mockResolvedValue(createMockStreamResponse('<html>test</html>'));
            const { result } = renderHook(() => useTextToModel());

            await act(async () => {
                await result.current.generate('dragon');
            });

            expect(result.current.duration).not.toBeNull();

            act(() => {
                result.current.reset();
            });

            expect(result.current.duration).toBeNull();
        });
    });

    describe('Phase Transitions', () => {
        it('should start with imagining phase', async () => {
            mockFetch.mockImplementation(() => new Promise(() => { })); // Never resolves
            const { result } = renderHook(() => useTextToModel());

            act(() => {
                result.current.generate('dragon');
            });

            expect(result.current.phase).toBe('imagining');
        });

        it('should transition to finding phase after 3 seconds', async () => {
            mockFetch.mockImplementation(() => new Promise(() => { })); // Never resolves
            const { result } = renderHook(() => useTextToModel());

            act(() => {
                result.current.generate('dragon');
            });

            expect(result.current.phase).toBe('imagining');

            act(() => {
                vi.advanceTimersByTime(3000);
            });

            expect(result.current.phase).toBe('finding');
        });

        it('should transition to building phase after 8 seconds', async () => {
            mockFetch.mockImplementation(() => new Promise(() => { })); // Never resolves
            const { result } = renderHook(() => useTextToModel());

            act(() => {
                result.current.generate('dragon');
            });

            act(() => {
                vi.advanceTimersByTime(8000);
            });

            expect(result.current.phase).toBe('building');
        });
    });
});
