/**
 * Image Dimension Extraction Utility
 *
 * Extracts width/height from base64-encoded image data by parsing
 * the image header bytes. Supports JPEG, PNG, and WebP formats.
 */

export interface ImageDimensions {
    width: number;
    height: number;
    aspectRatio: number;
}

/**
 * Extract dimensions from a base64-encoded image.
 * @param base64Data - Base64 image data (with or without data URI prefix)
 * @param mimeType - MIME type of the image (e.g., 'image/jpeg', 'image/png')
 * @returns Image dimensions or null if extraction fails
 */
export function extractImageDimensions(
    base64Data: string,
    mimeType: string
): ImageDimensions | null {
    try {
        // Remove data URI prefix if present
        const cleanBase64 = base64Data.includes(',')
            ? base64Data.split(',')[1]
            : base64Data;

        // Decode base64 to buffer
        const buffer = Buffer.from(cleanBase64, 'base64');

        const normalizedMime = mimeType.toLowerCase();

        if (normalizedMime.includes('png')) {
            return extractPNGDimensions(buffer);
        } else if (
            normalizedMime.includes('jpeg') ||
            normalizedMime.includes('jpg')
        ) {
            return extractJPEGDimensions(buffer);
        } else if (normalizedMime.includes('webp')) {
            return extractWebPDimensions(buffer);
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Extract dimensions from PNG image buffer.
 * PNG stores width/height at bytes 16-23 in the IHDR chunk.
 */
function extractPNGDimensions(buffer: Buffer): ImageDimensions | null {
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (buffer.length < 24) return null;

    // Check PNG signature
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    for (let i = 0; i < 8; i++) {
        if (buffer[i] !== pngSignature[i]) return null;
    }

    // IHDR chunk: width at offset 16 (4 bytes), height at offset 20 (4 bytes)
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);

    return createDimensions(width, height);
}

/**
 * Extract dimensions from JPEG image buffer.
 * JPEG dimensions are in SOF0/SOF2 markers (FFCn).
 */
function extractJPEGDimensions(buffer: Buffer): ImageDimensions | null {
    if (buffer.length < 4) return null;

    // Check JPEG signature (SOI marker)
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

    let offset = 2;

    while (offset < buffer.length - 8) {
        // Find marker
        if (buffer[offset] !== 0xff) {
            offset++;
            continue;
        }

        const marker = buffer[offset + 1];

        // Skip padding bytes
        if (marker === 0xff) {
            offset++;
            continue;
        }

        // SOF markers (SOF0 = C0, SOF2 = C2, etc.) contain dimensions
        if (
            marker === 0xc0 ||
            marker === 0xc1 ||
            marker === 0xc2 ||
            marker === 0xc3
        ) {
            // SOF segment: length (2), precision (1), height (2), width (2)
            const height = buffer.readUInt16BE(offset + 5);
            const width = buffer.readUInt16BE(offset + 7);
            return createDimensions(width, height);
        }

        // Skip to next marker
        if (offset + 3 >= buffer.length) break;
        const segmentLength = buffer.readUInt16BE(offset + 2);
        offset += 2 + segmentLength;
    }

    return null;
}

/**
 * Extract dimensions from WebP image buffer.
 * WebP has different chunk types (VP8, VP8L, VP8X).
 */
function extractWebPDimensions(buffer: Buffer): ImageDimensions | null {
    if (buffer.length < 30) return null;

    // Check RIFF header
    if (
        buffer.slice(0, 4).toString() !== 'RIFF' ||
        buffer.slice(8, 12).toString() !== 'WEBP'
    ) {
        return null;
    }

    const chunkType = buffer.slice(12, 16).toString();

    // VP8 (lossy) format
    if (chunkType === 'VP8 ') {
        // VP8 bitstream starts at offset 20
        // Frame tag at offset 23, dimensions follow
        if (buffer.length < 30) return null;
        const width = buffer.readUInt16LE(26) & 0x3fff;
        const height = buffer.readUInt16LE(28) & 0x3fff;
        return createDimensions(width, height);
    }

    // VP8L (lossless) format
    if (chunkType === 'VP8L') {
        // Signature byte at offset 21, followed by 4-byte packed dimensions
        if (buffer.length < 25) return null;
        const signature = buffer[21];
        if (signature !== 0x2f) return null;

        const bits = buffer.readUInt32LE(21);
        const width = (bits >> 8) & 0x3fff;
        const height = (bits >> 22) & 0x3fff;
        return createDimensions(width + 1, height + 1);
    }

    // VP8X (extended) format
    if (chunkType === 'VP8X') {
        // Canvas width/height at bytes 24-29 (24-bit values)
        if (buffer.length < 30) return null;
        const width =
            (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)) + 1;
        const height =
            (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)) + 1;
        return createDimensions(width, height);
    }

    return null;
}

/**
 * Create ImageDimensions object with aspect ratio.
 */
function createDimensions(width: number, height: number): ImageDimensions {
    return {
        width,
        height,
        aspectRatio: width / height,
    };
}

/**
 * LEGO physical unit constants
 */
export const MM_PER_STUD = 8; // 1 stud = 8mm width
export const MM_PER_PLATE = 3.2; // 1 plate = 3.2mm height
export const STUD_TO_PLATE_RATIO = MM_PER_STUD / MM_PER_PLATE; // 2.5

/**
 * Calculate expected height in plates based on image aspect ratio and width in studs.
 * 
 * Formula: height_plates = (image_height / image_width) × width_studs × 2.5
 * 
 * @param imageDimensions - Image width and height
 * @param widthStuds - Width of the LEGO model in studs
 * @returns Expected height in plates
 */
export function calculateExpectedHeightPlates(
    imageDimensions: ImageDimensions,
    widthStuds: number
): number {
    const imageAspectRatio = imageDimensions.height / imageDimensions.width;
    return Math.round(imageAspectRatio * widthStuds * STUD_TO_PLATE_RATIO);
}

/**
 * Adjust bounding box height to match image aspect ratio.
 * Only adjusts if deviation exceeds tolerance threshold.
 * 
 * @param boundingBox - Current bounding box from AI
 * @param imageDimensions - Original image dimensions
 * @param tolerancePercent - Maximum allowed deviation (default: 20%)
 * @returns Adjusted bounding box
 */
export function adjustBoundingBoxAspectRatio(
    boundingBox: { width: number; depth: number; height_plates: number },
    imageDimensions: ImageDimensions,
    tolerancePercent: number = 20
): { width: number; depth: number; height_plates: number } {
    const expectedHeight = calculateExpectedHeightPlates(
        imageDimensions,
        boundingBox.width
    );

    const currentHeight = boundingBox.height_plates;
    const deviation = Math.abs(currentHeight - expectedHeight) / expectedHeight;

    // If deviation is within tolerance, keep original
    if (deviation <= tolerancePercent / 100) {
        return boundingBox;
    }

    // Adjust height to match expected aspect ratio
    return {
        ...boundingBox,
        height_plates: expectedHeight,
    };
}
