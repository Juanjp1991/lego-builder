'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { ViewerProps, ViewerState, ControlAction } from '@/types/viewer';
import { ViewerError } from './ViewerError';
import { ViewerControls } from './ViewerControls';

/**
 * 3D Model Viewer Component
 * Renders a Three.js HTML scene in an isolated iframe
 * 
 * @example
 * ```tsx
 * <ModelViewer htmlScene={generatedHtmlScene} />
 * ```
 */
export function ModelViewer({
    htmlScene,
    onError,
    onLoad,
    className,
}: ViewerProps) {
    const [state, setState] = useState<ViewerState>('loading');
    const [key, setKey] = useState(0); // Used to force iframe reload on retry
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Communicate with iframe
    const handleControlMessage = useCallback((action: ControlAction) => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(action, '*');
        }
    }, []);

    // Handle signals from iframe (errors, custom events)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Basic security check could go here if origin was known
            // Since it's a srcDoc iframe, origin is 'null'

            if (event.data?.type === 'error' || event.data?.type === 'runtime_error') {
                console.error('[ModelViewer] Iframe reported error:', event.data.message);
                setState('error');
                onError?.();
            }

            if (event.data?.type === 'ready') {
                setState('ready');
                onLoad?.();
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onError, onLoad]);

    const handleLoad = useCallback(() => {
        // We still keep the iframe's onLoad as a backup for the skeleton removal
        // but prefer the 'ready' signal from the Three.js scene for "Interactive" state
        if (state === 'loading') {
            setState('ready');
            onLoad?.();
        }
    }, [onLoad, state]);

    const handleError = useCallback(() => {
        setState('error');
        console.error('[ModelViewer] Iframe load failed');
        onError?.();
    }, [onError]);

    const handleRetry = useCallback(() => {
        setState('loading');
        setKey((prev) => prev + 1);
    }, []);

    return (
        <div
            className={cn('flex flex-col gap-4', className)}
            data-testid="model-viewer"
        >
            <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden border border-border">
                {/* Loading skeleton */}
                {state === 'loading' && (
                    <div
                        className="absolute inset-0 animate-pulse bg-muted z-10"
                        data-testid="viewer-skeleton"
                        aria-label="Loading 3D model..."
                    />
                )}

                {state === 'error' ? (
                    <ViewerError
                        onRetry={handleRetry}
                        className="h-full w-full"
                    />
                ) : (
                    <iframe
                        key={key}
                        ref={iframeRef}
                        title="3D Lego Model Viewer"
                        srcDoc={htmlScene}
                        className={cn(
                            'w-full h-full border-0',
                            state === 'loading' && 'invisible'
                        )}
                        onLoad={handleLoad}
                        onError={handleError}
                        sandbox="allow-scripts"
                        data-testid="viewer-iframe"
                    />
                )}
            </div>

            {/* Viewer Controls - Connected via onControlMessage */}
            <ViewerControls
                onControlMessage={handleControlMessage}
                className={cn(state !== 'ready' && 'opacity-50 pointer-events-none')}
            />
        </div>
    );
}
