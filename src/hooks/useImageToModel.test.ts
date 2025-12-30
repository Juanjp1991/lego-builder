/**
 * useImageToModel Hook Tests
 *
 * @see Story 2.3: Implement Image-to-Lego Model Generation
 * Tests state management, API calls, progress phases, and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useImageToModel } from './useImageToModel';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create mock file
const createMockFile = (name: string = 'test.png', type: string = 'image/png'): File => {
    return new File(['mock image data'], name, { type });
};

// Helper to create mock streaming response
const createStreamResponse = (content: string): Response => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode(content));
            controller.close();
        },
    });

    return new Response(stream, { status: 200 });
};

// Helper to create error response
const createErrorResponse = (code: string, message: string, status: number = 500): Response => {
    return new Response(
        JSON.stringify({ success: false, error: { code, message } }),
        { status, headers: { 'Content-Type': 'application/json' } }
    );
};

describe('useImageToModel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Initial State', () => {
        it('starts with idle status', () => {
            const { result } = renderHook(() => useImageToModel());

            expect(result.current.status).toBe('idle');
        });

        it('starts with null phase', () => {
            const { result } = renderHook(() => useImageToModel());

            expect(result.current.phase).toBeNull();
        });

        it('starts with null generatedHtml', () => {
            const { result } = renderHook(() => useImageToModel());

            expect(result.current.generatedHtml).toBeNull();
        });

        it('starts with null error', () => {
            const { result } = renderHook(() => useImageToModel());

            expect(result.current.error).toBeNull();
        });

        it('starts with null duration', () => {
            const { result } = renderHook(() => useImageToModel());

            expect(result.current.duration).toBeNull();
        });
    });

    describe('Generation Flow', () => {
        it('sets status to generating when generate is called', async () => {
            mockFetch.mockResolvedValueOnce(createStreamResponse('<html>test</html>'));
            const { result } = renderHook(() => useImageToModel());

            act(() => {
                result.current.generate(createMockFile());
            });

            expect(result.current.status).toBe('generating');
        });

        it('sets initial phase to imagining', async () => {
            mockFetch.mockResolvedValueOnce(createStreamResponse('<html>test</html>'));
            const { result } = renderHook(() => useImageToModel());

            act(() => {
                result.current.generate(createMockFile());
            });

            expect(result.current.phase).toBe('imagining');
        });

        it('transitions phase from imagining to finding', async () => {
            mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
            const { result } = renderHook(() => useImageToModel());

            act(() => {
                result.current.generate(createMockFile());
            });

            expect(result.current.phase).toBe('imagining');

            // Advance timers to trigger phase transition
            act(() => {
                vi.advanceTimersByTime(3000);
            });

            expect(result.current.phase).toBe('finding');
        });

        it('transitions phase from finding to building', async () => {
            mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
            const { result } = renderHook(() => useImageToModel());

            act(() => {
                result.current.generate(createMockFile());
            });

            // Advance to finding phase
            act(() => {
                vi.advanceTimersByTime(3000);
            });

            expect(result.current.phase).toBe('finding');

            // Advance to building phase
            act(() => {
                vi.advanceTimersByTime(5000);
            });

            expect(result.current.phase).toBe('building');
        });

        it('sets status to success on successful generation', async () => {
            mockFetch.mockResolvedValueOnce(createStreamResponse('<html>generated</html>'));
            const { result } = renderHook(() => useImageToModel());

            await act(async () => {
                await result.current.generate(createMockFile());
            });

            await waitFor(() => {
                expect(result.current.status).toBe('success');
            });
        });

        it('stores generated HTML on success', async () => {
            const expectedHtml = '<html>generated lego model</html>';
            mockFetch.mockResolvedValueOnce(createStreamResponse(expectedHtml));
            const { result } = renderHook(() => useImageToModel());

            await act(async () => {
                await result.current.generate(createMockFile());
            });

            await waitFor(() => {
                expect(result.current.generatedHtml).toBe(expectedHtml);
            });
        });

        it('clears phase on success', async () => {
            mockFetch.mockResolvedValueOnce(createStreamResponse('<html>test</html>'));
            const { result } = renderHook(() => useImageToModel());

            await act(async () => {
                await result.current.generate(createMockFile());
            });

            await waitFor(() => {
                expect(result.current.phase).toBeNull();
            });
        });

        it('tracks generation duration', async () => {
            mockFetch.mockResolvedValueOnce(createStreamResponse('<html>test</html>'));
            const { result } = renderHook(() => useImageToModel());

            await act(async () => {
                await result.current.generate(createMockFile());
            });

            await waitFor(() => {
                expect(result.current.duration).toBeGreaterThanOrEqual(0);
            });
        });
    });

    describe('API Call', () => {
        it('calls /api/generate endpoint', async () => {
            mockFetch.mockResolvedValueOnce(createStreamResponse('<html>test</html>'));
            const { result } = renderHook(() => useImageToModel());

            await act(async () => {
                await result.current.generate(createMockFile());
            });

            expect(mockFetch).toHaveBeenCalledWith(
                '/api/generate',
                expect.objectContaining({
                    method: 'POST',
                })
            );
        });

        it('sends image data as base64', async () => {
            mockFetch.mockResolvedValueOnce(createStreamResponse('<html>test</html>'));
            const { result } = renderHook(() => useImageToModel());

            const file = createMockFile('test.png', 'image/png');
            await act(async () => {
                await result.current.generate(file);
            });

            const fetchCall = mockFetch.mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);

            expect(body).toHaveProperty('imageData');
            expect(body.imageData).toBeTruthy();
        });

        it('sends mimeType with request', async () => {
            mockFetch.mockResolvedValueOnce(createStreamResponse('<html>test</html>'));
            const { result } = renderHook(() => useImageToModel());

            const file = createMockFile('test.jpeg', 'image/jpeg');
            await act(async () => {
                await result.current.generate(file);
            });

            const fetchCall = mockFetch.mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);

            expect(body.mimeType).toBe('image/jpeg');
        });

        it('sends default prompt for image generation', async () => {
            mockFetch.mockResolvedValueOnce(createStreamResponse('<html>test</html>'));
            const { result } = renderHook(() => useImageToModel());

            await act(async () => {
                await result.current.generate(createMockFile());
            });

            const fetchCall = mockFetch.mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);

            expect(body.prompt).toBeTruthy();
            expect(typeof body.prompt).toBe('string');
        });
    });

    describe('Error Handling', () => {
        it('sets status to error on API failure', async () => {
            mockFetch.mockResolvedValueOnce(createErrorResponse('GENERATION_FAILED', 'Generation failed'));
            const { result } = renderHook(() => useImageToModel());

            await act(async () => {
                await result.current.generate(createMockFile());
            });

            await waitFor(() => {
                expect(result.current.status).toBe('error');
            });
        });

        it('stores error message on failure', async () => {
            mockFetch.mockResolvedValueOnce(createErrorResponse('GENERATION_FAILED', 'Unable to process image'));
            const { result } = renderHook(() => useImageToModel());

            await act(async () => {
                await result.current.generate(createMockFile());
            });

            await waitFor(() => {
                expect(result.current.error).toBeTruthy();
            });
        });

        it('clears phase on error', async () => {
            mockFetch.mockResolvedValueOnce(createErrorResponse('GENERATION_FAILED', 'Error'));
            const { result } = renderHook(() => useImageToModel());

            await act(async () => {
                await result.current.generate(createMockFile());
            });

            await waitFor(() => {
                expect(result.current.phase).toBeNull();
            });
        });

        it('handles rate limiting error', async () => {
            mockFetch.mockResolvedValueOnce(createErrorResponse('RATE_LIMITED', 'Too many requests', 429));
            const { result } = renderHook(() => useImageToModel());

            await act(async () => {
                await result.current.generate(createMockFile());
            });

            await waitFor(() => {
                expect(result.current.status).toBe('error');
                expect(result.current.error).toContain('fast');
            });
        });

        it('handles network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));
            const { result } = renderHook(() => useImageToModel());

            await act(async () => {
                await result.current.generate(createMockFile());
            });

            await waitFor(() => {
                expect(result.current.status).toBe('error');
            });
        });
    });

    describe('Reset', () => {
        it('resets status to idle', async () => {
            mockFetch.mockResolvedValueOnce(createStreamResponse('<html>test</html>'));
            const { result } = renderHook(() => useImageToModel());

            await act(async () => {
                await result.current.generate(createMockFile());
            });

            await waitFor(() => {
                expect(result.current.status).toBe('success');
            });

            act(() => {
                result.current.reset();
            });

            expect(result.current.status).toBe('idle');
        });

        it('clears generatedHtml on reset', async () => {
            mockFetch.mockResolvedValueOnce(createStreamResponse('<html>test</html>'));
            const { result } = renderHook(() => useImageToModel());

            await act(async () => {
                await result.current.generate(createMockFile());
            });

            await waitFor(() => {
                expect(result.current.generatedHtml).toBeTruthy();
            });

            act(() => {
                result.current.reset();
            });

            expect(result.current.generatedHtml).toBeNull();
        });

        it('clears error on reset', async () => {
            mockFetch.mockResolvedValueOnce(createErrorResponse('GENERATION_FAILED', 'Error'));
            const { result } = renderHook(() => useImageToModel());

            await act(async () => {
                await result.current.generate(createMockFile());
            });

            await waitFor(() => {
                expect(result.current.error).toBeTruthy();
            });

            act(() => {
                result.current.reset();
            });

            expect(result.current.error).toBeNull();
        });

        it('clears duration on reset', async () => {
            mockFetch.mockResolvedValueOnce(createStreamResponse('<html>test</html>'));
            const { result } = renderHook(() => useImageToModel());

            await act(async () => {
                await result.current.generate(createMockFile());
            });

            await waitFor(() => {
                expect(result.current.duration).not.toBeNull();
            });

            act(() => {
                result.current.reset();
            });

            expect(result.current.duration).toBeNull();
        });
    });

    describe('HTML Cleanup', () => {
        it('removes markdown code block wrappers from response', async () => {
            mockFetch.mockResolvedValueOnce(createStreamResponse('```html\n<html>test</html>\n```'));
            const { result } = renderHook(() => useImageToModel());

            await act(async () => {
                await result.current.generate(createMockFile());
            });

            await waitFor(() => {
                expect(result.current.generatedHtml).toBe('<html>test</html>');
            });
        });
    });
});
