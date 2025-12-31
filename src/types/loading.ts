/**
 * Loading phases for generation progress.
 * Standard phases: imagining, finding, building
 * Voxel pipeline phases: imagining-voxel, imagining-lego, finding-bricks
 */
export type LoadingPhase =
    | 'imagining'
    | 'finding'
    | 'building'
    // Voxel pipeline phases
    | 'imagining-voxel'
    | 'imagining-lego'
    | 'finding-bricks';

export interface LoadingStateProps {
    /** Initial phase to display */
    initialPhase?: LoadingPhase;
    /** Additional CSS classes */
    className?: string;
    /** Callback when loading times out (optional) */
    onTimeout?: () => void;
    /** Timeout duration in ms (default: 60000) */
    timeoutMs?: number;
}
