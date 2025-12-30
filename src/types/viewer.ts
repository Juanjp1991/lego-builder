/**
 * Types for the 3D Model Viewer component
 * @module types/viewer
 */

/**
 * State of the viewer component
 * - 'loading': Scene is being loaded in iframe
 * - 'ready': Scene has loaded and is interactive
 * - 'error': Scene failed to load
 */
export type ViewerState = 'loading' | 'ready' | 'error';

/**
 * Props for the ModelViewer component
 */
export interface ViewerProps {
    /** Complete Three.js HTML scene to render in iframe */
    htmlScene: string;
    /** Callback when viewer encounters an error */
    onError?: () => void;
    /** Callback when viewer loads successfully */
    onLoad?: () => void;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Props for the ViewerError component
 */
export interface ViewerErrorProps {
    /** Callback when retry button is clicked */
    onRetry: () => void;
    /** Error message to display (optional, defaults to friendly message) */
    message?: string;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Props for keyboard/touch control handlers
 */
export interface ViewerControlsProps {
    /** Callback to send control commands to the iframe */
    onControlMessage: (action: ControlAction) => void;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Control actions that can be sent to the iframe
 */
export type ControlAction =
    | { type: 'rotate'; direction: 'left' | 'right' | 'up' | 'down' }
    | { type: 'zoom'; direction: 'in' | 'out' }
    | { type: 'reset' };
