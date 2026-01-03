'use client';

import { useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { ViewerControlsProps, ControlAction } from '@/types/viewer';

/**
 * Keyboard, touch, and button controls for the 3D viewer
 */
export function ViewerControls({
    onControlMessage,
    className,
}: ViewerControlsProps) {
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });
    const initialPinchDist = useRef<number | null>(null);

    // --- Interaction Logic ---

    const handleRotate = useCallback((deltaX: number, deltaY: number) => {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            onControlMessage({
                type: 'rotate',
                direction: deltaX > 0 ? 'right' : 'left'
            });
        } else {
            onControlMessage({
                type: 'rotate',
                direction: deltaY > 0 ? 'down' : 'up'
            });
        }
    }, [onControlMessage]);

    const handleZoom = useCallback((delta: number) => {
        onControlMessage({
            type: 'zoom',
            direction: delta > 0 ? 'out' : 'in'
        });
    }, [onControlMessage]);

    // --- Mouse Event Handlers ---

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging.current) return;

        const deltaX = e.clientX - lastPos.current.x;
        const deltaY = e.clientY - lastPos.current.y;

        // Threshold for rotation to avoid jitter
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            handleRotate(deltaX, deltaY);
            lastPos.current = { x: e.clientX, y: e.clientY };
        }
    }, [handleRotate]);

    const handleMouseUp = useCallback(() => {
        isDragging.current = false;
    }, []);

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        handleZoom(e.deltaY);
    }, [handleZoom]);

    // --- Touch Event Handlers ---

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            isDragging.current = true;
            lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            isDragging.current = false;
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialPinchDist.current = dist;
        }
    };

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (e.touches.length === 1 && isDragging.current) {
            const deltaX = e.touches[0].clientX - lastPos.current.x;
            const deltaY = e.touches[0].clientY - lastPos.current.y;

            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                handleRotate(deltaX, deltaY);
                lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        } else if (e.touches.length === 2 && initialPinchDist.current !== null) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );

            const delta = initialPinchDist.current - dist;
            if (Math.abs(delta) > 10) {
                handleZoom(delta);
                initialPinchDist.current = dist;
            }
        }
    }, [handleRotate, handleZoom]);

    const handleTouchEnd = useCallback(() => {
        isDragging.current = false;
        initialPinchDist.current = null;
    }, []);

    // --- Keyboard Event Handlers ---

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        let action: ControlAction | null = null;

        switch (event.key) {
            case 'ArrowLeft': action = { type: 'rotate', direction: 'left' }; break;
            case 'ArrowRight': action = { type: 'rotate', direction: 'right' }; break;
            case 'ArrowUp': action = { type: 'rotate', direction: 'up' }; break;
            case 'ArrowDown': action = { type: 'rotate', direction: 'down' }; break;
            case '+':
            case '=': action = { type: 'zoom', direction: 'in' }; break;
            case '-':
            case '_': action = { type: 'zoom', direction: 'out' }; break;
            case 'r':
            case 'R': action = { type: 'reset' }; break;
            case 'c':
            case 'C': action = { type: 'center' }; break;
            default: return;
        }

        if (action) {
            event.preventDefault();
            onControlMessage(action);
        }
    }, [onControlMessage]);

    // --- Effect Hooks ---

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleKeyDown, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

    return (
        <div
            className={cn(
                'flex flex-col gap-2 select-none',
                className
            )}
            role="toolbar"
            aria-label="3D Model Controls"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onWheel={(e) => handleZoom(e.deltaY)} // Simple wheel direct bind
        >
            <div className="flex items-center justify-center gap-2">
                {/* Rotation controls */}
                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                    <button
                        onClick={() => onControlMessage({ type: 'rotate', direction: 'left' })}
                        className="p-2 min-h-[44px] min-w-[44px] rounded-md hover:bg-muted focus:ring-2 focus:ring-primary transition-colors"
                        aria-label="Rotate left"
                        type="button"
                    >
                        <span className="text-xl" aria-hidden="true">←</span>
                    </button>
                    <button
                        onClick={() => onControlMessage({ type: 'rotate', direction: 'right' })}
                        className="p-2 min-h-[44px] min-w-[44px] rounded-md hover:bg-muted focus:ring-2 focus:ring-primary transition-colors"
                        aria-label="Rotate right"
                        type="button"
                    >
                        <span className="text-xl" aria-hidden="true">→</span>
                    </button>
                </div>

                {/* Zoom controls */}
                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                    <button
                        onClick={() => onControlMessage({ type: 'zoom', direction: 'in' })}
                        className="p-2 min-h-[44px] min-w-[44px] rounded-md hover:bg-muted focus:ring-2 focus:ring-primary transition-colors"
                        aria-label="Zoom in"
                        type="button"
                    >
                        <span className="text-xl" aria-hidden="true">+</span>
                    </button>
                    <button
                        onClick={() => onControlMessage({ type: 'zoom', direction: 'out' })}
                        className="p-2 min-h-[44px] min-w-[44px] rounded-md hover:bg-muted focus:ring-2 focus:ring-primary transition-colors"
                        aria-label="Zoom out"
                        type="button"
                    >
                        <span className="text-xl" aria-hidden="true">−</span>
                    </button>
                </div>

                {/* Reset and Center buttons */}
                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                    <button
                        onClick={() => onControlMessage({ type: 'center' })}
                        className="p-2 min-h-[44px] px-3 rounded-md bg-primary text-primary-foreground hover:opacity-90 focus:ring-2 focus:ring-primary transition-colors font-medium text-sm"
                        aria-label="Center model"
                        type="button"
                        title="Center camera on model"
                    >
                        ⊙ Center
                    </button>
                    <button
                        onClick={() => onControlMessage({ type: 'reset' })}
                        className="p-2 min-h-[44px] min-w-[44px] rounded-md hover:bg-muted focus:ring-2 focus:ring-primary transition-colors"
                        aria-label="Reset view"
                        type="button"
                        title="Reset camera to default view"
                    >
                        <span className="text-xl" aria-hidden="true">↺</span>
                    </button>
                </div>
            </div>

            <p className="text-xs text-center text-muted-foreground hidden sm:block">
                Drag to rotate • Pinch/Scroll to zoom • Arrows/Keys support
            </p>
        </div>
    );
}
