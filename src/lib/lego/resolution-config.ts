/**
 * Resolution Configuration
 *
 * Defines size/resolution settings for LEGO model generation.
 * Designed to support both user presets and future inventory-driven constraints.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Resolution configuration for silhouette generation.
 * All spatial units in studs (horizontal) and plates (vertical).
 */
export interface ResolutionConfig {
    /** Maximum width in studs (X axis) */
    maxWidth: number;
    /** Maximum depth in studs (Z axis) */
    maxDepth: number;
    /** Maximum height in plates (Y axis) */
    maxHeight: number;
    /** Target voxel count for complexity guidance */
    targetVoxelCount: number;
    /** Maximum layer count for AI */
    maxLayers: number;
    /** Available colors (optional, for inventory mode) */
    availableColors?: string[];
}

/**
 * Preset identifiers for size selection
 */
export type SizePreset = 'pocket' | 'palm' | 'desktop' | 'display';

/**
 * Display information for a preset
 */
export interface PresetInfo {
    id: SizePreset;
    label: string;
    description: string;
    /** Approximate real-world dimensions in mm */
    realSize: {
        width: number;
        depth: number;
        height: number;
    };
    /** Approximate brick count */
    brickCount: string;
    config: ResolutionConfig;
}

// ============================================================================
// Constants - Unit Conversions
// ============================================================================

/** 1 stud = 8mm (center-to-center pitch) */
export const MM_PER_STUD = 8;

/** 1 plate = 3.2mm height */
export const MM_PER_PLATE = 3.2;

/** 1 brick = 3 plates = 9.6mm height */
export const PLATES_PER_BRICK = 3;

/** 2x4 brick dimensions for reference */
export const BRICK_2X4 = {
    widthMm: 16,  // 2 studs
    lengthMm: 32, // 4 studs
    heightMm: 9.6, // 1 brick
};

// ============================================================================
// Presets
// ============================================================================

/**
 * Resolution presets with real-world size context
 */
export const SIZE_PRESETS: Record<SizePreset, PresetInfo> = {
    pocket: {
        id: 'pocket',
        label: 'Pocket',
        description: 'Keychain or ornament size',
        realSize: { width: 48, depth: 48, height: 38 },
        brickCount: '~50-100',
        config: {
            maxWidth: 6,
            maxDepth: 6,
            maxHeight: 12,
            targetVoxelCount: 150,
            maxLayers: 8,
        },
    },
    palm: {
        id: 'palm',
        label: 'Palm',
        description: 'Fits in your hand',
        realSize: { width: 96, depth: 96, height: 77 },
        brickCount: '~150-300',
        config: {
            maxWidth: 12,
            maxDepth: 12,
            maxHeight: 24,
            targetVoxelCount: 500,
            maxLayers: 15,
        },
    },
    desktop: {
        id: 'desktop',
        label: 'Desktop',
        description: 'Desk decoration size',
        realSize: { width: 160, depth: 160, height: 128 },
        brickCount: '~400-800',
        config: {
            maxWidth: 20,
            maxDepth: 20,
            maxHeight: 40,
            targetVoxelCount: 1200,
            maxLayers: 25,
        },
    },
    display: {
        id: 'display',
        label: 'Display',
        description: 'Showcase model',
        realSize: { width: 256, depth: 256, height: 192 },
        brickCount: '~1000-2000',
        config: {
            maxWidth: 32,
            maxDepth: 32,
            maxHeight: 60,
            targetVoxelCount: 2500,
            maxLayers: 40,
        },
    },
};

/** Default preset */
export const DEFAULT_SIZE_PRESET: SizePreset = 'palm';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get preset info by ID
 */
export function getPresetInfo(preset: SizePreset): PresetInfo {
    return SIZE_PRESETS[preset];
}

/**
 * Convert studs to millimeters
 */
export function studsToMm(studs: number): number {
    return studs * MM_PER_STUD;
}

/**
 * Convert plates to millimeters
 */
export function platesToMm(plates: number): number {
    return plates * MM_PER_PLATE;
}

/**
 * Convert millimeters to studs (rounded)
 */
export function mmToStuds(mm: number): number {
    return Math.round(mm / MM_PER_STUD);
}

/**
 * Convert millimeters to plates (rounded)
 */
export function mmToPlates(mm: number): number {
    return Math.round(mm / MM_PER_PLATE);
}

/**
 * Format dimensions for display (e.g., "~10cm × 10cm × 8cm")
 */
export function formatDimensions(widthMm: number, depthMm: number, heightMm: number): string {
    const format = (mm: number) => {
        if (mm >= 100) {
            return `${Math.round(mm / 10)}cm`;
        }
        return `${Math.round(mm)}mm`;
    };
    return `~${format(widthMm)} × ${format(depthMm)} × ${format(heightMm)}`;
}

/**
 * Create custom resolution config from mm dimensions
 */
export function configFromMm(widthMm: number, depthMm: number, heightMm: number): ResolutionConfig {
    const maxWidth = mmToStuds(widthMm);
    const maxDepth = mmToStuds(depthMm);
    const maxHeight = mmToPlates(heightMm);

    // Estimate target voxels and layers from dimensions
    const baseArea = maxWidth * maxDepth;
    const targetVoxelCount = Math.round(baseArea * maxHeight * 0.4); // ~40% fill
    const maxLayers = Math.min(50, Math.round(maxHeight / 2));

    return {
        maxWidth,
        maxDepth,
        maxHeight,
        targetVoxelCount,
        maxLayers,
    };
}
