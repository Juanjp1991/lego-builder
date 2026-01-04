/**
 * POST /api/generate-silhouette
 *
 * Generates a LEGO model from image using layered silhouette extraction.
 * This is an alternative pipeline to /api/generate.
 *
 * Pipeline: Image → Gemini → Silhouette JSON → Voxels → Bricks → HTML
 * 
 * Supports multi-view images (front + side) for accurate 3D reconstruction.
 */

import { GoogleGenAI } from '@google/genai';
import {
    checkRateLimit,
    getClientIP,
    getRetryAfterSeconds,
} from '@/lib/ai/rate-limiter';
import type {
    APIErrorResponse,
    GenerateSilhouetteRequestBody,
    SymmetryAxis,
} from '@/lib/ai/types';
import type { SymmetryOptions } from '@/lib/lego/layer-to-voxel';
import {
    validateSilhouetteModel,
    validateAnyViewModel,
    hasValidBaseLayer,
    estimateVoxelCount,
    type SilhouetteModel,
    type MultiViewSilhouetteModel,
    type TriViewSilhouetteModel,
    type ViewMode,
} from '@/lib/ai/silhouette-schemas';
import {
    getSilhouettePrompt,
    getSilhouettePromptWithMultiView,
    JSON_REPAIR_PROMPT,
    SIMPLIFY_PROMPT,
    type DetailLevel,
} from '@/lib/ai/prompts-silhouette';
import type { ResolutionConfig } from '@/lib/lego/resolution-config';
import { rasterizeLayers } from '@/lib/lego/layer-to-voxel';
import { rasterizeMultiView, rasterizeTriView, estimateMultiViewVoxelCount, scaleMultiViewHeights, smoothVoxelEdges } from '@/lib/lego/multi-view-voxel';
import { convertVoxelsToBricks } from '@/lib/lego/voxel-to-brick';
import { generateHTMLFromBricks } from '@/lib/lego/brick-to-html';
import type { LegoColor } from '@/lib/ai/silhouette-schemas';
import {
    extractImageDimensions,
    adjustBoundingBoxAspectRatio,
    type ImageDimensions,
} from '@/lib/utils/image-dimensions';

export const maxDuration = 90; // Allow longer for multiple candidates
export const runtime = 'nodejs';


const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

/**
 * Standardized error response
 */
function createErrorResponse(
    code: APIErrorResponse['error']['code'],
    message: string,
    status: number,
    headers?: HeadersInit
): Response {
    const body: APIErrorResponse = {
        success: false,
        error: { code, message },
    };
    return Response.json(body, { status, headers });
}

/**
 * Generate silhouette JSON from image using Gemini
 */
async function generateSilhouetteJSON(
    imageData: string,
    mimeType: string,
    prompt: string,
    systemPrompt: string
): Promise<string> {
    const cleanBase64 = imageData.split(',')[1] || imageData;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                {
                    inlineData: {
                        mimeType,
                        data: cleanBase64,
                    },
                },
                { text: prompt },
            ],
        },
        config: {
            systemInstruction: {
                parts: [{ text: systemPrompt }],
            },
        },
    });

    return response.text || '';
}

/**
 * Parse JSON from AI response, handling common issues
 */
function parseAIJSON(text: string): unknown {
    let cleaned = text.trim();

    // Remove markdown code fences
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');

    // Remove any leading/trailing whitespace or newlines
    cleaned = cleaned.trim();

    return JSON.parse(cleaned);
}

/**
 * Color name to hex mapping for LEGO colors
 */
const COLOR_TO_HEX: Record<LegoColor, number> = {
    'red': 0xB40000,
    'blue': 0x0055BF,
    'yellow': 0xF2CD37,
    'green': 0x237841,
    'white': 0xFFFFFF,
    'black': 0x05131D,
    'gray': 0xA0A5A9,
    'light-gray': 0xE0E0E0,
    'dark-gray': 0x6C6E68,
    'orange': 0xFE8A18,
    'brown': 0x583927,
    'tan': 0xE4CD9E,
    'pink': 0xFC97AC,
    'purple': 0x9B5FC0,
    'lime': 0xBBE90B,
    'cyan': 0x36AEBF,
    'dark-blue': 0x0A3463,
    'dark-red': 0x720E0F,
    'dark-green': 0x184632,
};

function colorNameToHex(colorName: string): string {
    const normalized = colorName.toLowerCase().replace(' ', '-') as LegoColor;
    const hex = COLOR_TO_HEX[normalized] ?? 0xA0A5A9; // Default to gray
    return `0x${hex.toString(16).padStart(6, '0').toUpperCase()}`;
}

/**
 * Convert SymmetryAxis setting to SymmetryOptions for rasterization
 */
function getSymmetryOptions(
    userSetting: SymmetryAxis | undefined,
    aiRecommendation: string | undefined
): SymmetryOptions {
    // If user specified a setting (not 'auto'), use it
    const setting = userSetting === 'auto' || !userSetting
        ? aiRecommendation || 'x'  // Default to 'x' if AI didn't recommend
        : userSetting;

    switch (setting) {
        case 'x':
            return { x: true, z: false };
        case 'z':
            return { x: false, z: true };
        case 'both':
            return { x: true, z: true };
        case 'none':
            return { x: false, z: false };
        default:
            return { x: true, z: false }; // Default to X-axis
    }
}

/**
 * Candidate result from generation
 */
interface CandidateResult {
    model: SilhouetteModel | null;
    multiViewModel: MultiViewSilhouetteModel | null;
    triViewModel: TriViewSilhouetteModel | null;
    viewMode: ViewMode;
    isMultiView: boolean;  // true for both multi and tri
    voxelCount: number;
    hasValidBase: boolean;
    error?: string;
    detailLevel: DetailLevel;
}

/**
 * Generate and validate a single candidate
 * Supports single-view, multi-view (2), and tri-view (3) silhouette extraction
 */
async function generateCandidate(
    imageData: string,
    mimeType: string,
    userPrompt: string,
    detailLevel: DetailLevel,
    resolutionConfig?: ResolutionConfig,
    imageDimensions?: ImageDimensions
): Promise<CandidateResult> {
    const result: CandidateResult = {
        model: null,
        multiViewModel: null,
        triViewModel: null,
        viewMode: 'single',
        isMultiView: false,
        voxelCount: 0,
        hasValidBase: false,
        detailLevel,
    };

    try {
        // Use multi-view prompt that auto-detects multiple silhouettes
        const systemPrompt = getSilhouettePromptWithMultiView(detailLevel, resolutionConfig, imageDimensions);
        const prompt = `Analyze this image and create a silhouette JSON. If you see multiple views (front and side), use multi-view mode: ${userPrompt}`;

        const jsonText = await generateSilhouetteJSON(imageData, mimeType, prompt, systemPrompt);
        const parsed = parseAIJSON(jsonText);

        // Try to validate as either multi-view or single-view
        const validation = validateAnyViewModel(parsed);

        if (!validation.success) {
            result.error = `Validation failed: ${validation.error.issues[0]?.message}`;
            return result;
        }

        result.isMultiView = validation.isMultiView;
        result.viewMode = validation.viewMode;

        if (validation.viewMode === 'tri') {
            // Tri-view model detected (front + side + top)
            const rawTriModel = validation.data as TriViewSilhouetteModel;

            // Apply height scaling to correct for LEGO unit differences
            const scaledModel = scaleMultiViewHeights({
                view_mode: 'multi',
                bounding_box: rawTriModel.bounding_box,
                front_view: rawTriModel.front_view,
                side_view: rawTriModel.side_view,
                recommended_symmetry: rawTriModel.recommended_symmetry,
            });

            result.triViewModel = rawTriModel;
            result.voxelCount = estimateMultiViewVoxelCount(scaledModel);
            result.hasValidBase = true;

            console.log('[generate-silhouette] Detected TRI-VIEW model:', {
                originalHeight: rawTriModel.bounding_box.height_plates,
                scaledHeight: scaledModel.bounding_box.height_plates,
                width: scaledModel.bounding_box.width,
                depth: scaledModel.bounding_box.depth,
                frontColumns: rawTriModel.front_view.columns.length,
                sideColumns: rawTriModel.side_view.columns.length,
                topCells: rawTriModel.top_view.cells.length,
            });
        } else if (validation.viewMode === 'multi') {
            // Multi-view model detected (front + side)
            const rawMultiModel = validation.data as MultiViewSilhouetteModel;

            // Apply height scaling to correct for LEGO unit differences
            const scaledModel = scaleMultiViewHeights({
                view_mode: 'multi',
                bounding_box: rawMultiModel.bounding_box,
                front_view: rawMultiModel.front_view,
                side_view: rawMultiModel.side_view,
                recommended_symmetry: rawMultiModel.recommended_symmetry,
            });

            result.multiViewModel = rawMultiModel;
            result.voxelCount = estimateMultiViewVoxelCount(scaledModel);
            result.hasValidBase = true;

            console.log('[generate-silhouette] Detected MULTI-VIEW model (scaled):', {
                originalHeight: rawMultiModel.bounding_box.height_plates,
                scaledHeight: scaledModel.bounding_box.height_plates,
                width: scaledModel.bounding_box.width,
                depth: scaledModel.bounding_box.depth,
                frontColumns: scaledModel.front_view.columns.length,
                sideColumns: scaledModel.side_view.columns.length,
            });
        } else {
            // Single-view model (layer-based)
            let model = validation.data as SilhouetteModel;

            // Post-processing: Adjust bounding box aspect ratio if image dimensions available
            if (imageDimensions) {
                const adjustedBoundingBox = adjustBoundingBoxAspectRatio(
                    model.bounding_box,
                    imageDimensions,
                    20 // 20% tolerance
                );

                if (adjustedBoundingBox.height_plates !== model.bounding_box.height_plates) {
                    console.log('[generate-silhouette] Adjusted bounding box height:', {
                        original: model.bounding_box.height_plates,
                        adjusted: adjustedBoundingBox.height_plates,
                        imageAspect: imageDimensions.aspectRatio.toFixed(2),
                    });
                    model = {
                        ...model,
                        bounding_box: adjustedBoundingBox,
                    };
                }
            }

            result.model = model;
            result.voxelCount = estimateVoxelCount(model);
            result.hasValidBase = hasValidBaseLayer(model, 0.5);
        }

        return result;
    } catch (error) {
        result.error = error instanceof Error ? error.message : 'Unknown error';
        return result;
    }
}

/**
 * Rank and select best candidate
 * Prefers tri-view > multi-view > single-view for maximum accuracy
 */
function selectBestCandidate(candidates: CandidateResult[]): CandidateResult | null {
    // A candidate is valid if it has any type of model
    const hasModel = (c: CandidateResult) =>
        c.model !== null || c.multiViewModel !== null || c.triViewModel !== null;

    // Filter to valid candidates
    const valid = candidates.filter(
        (c) => hasModel(c) && c.hasValidBase && c.voxelCount > 0
    );

    if (valid.length === 0) {
        // Return any candidate with a model, even without valid base
        const anyValid = candidates.filter((c) => hasModel(c));
        return anyValid[0] ?? null;
    }

    // View mode priority: tri > multi > single
    const viewModePriority: Record<ViewMode, number> = { 'tri': 0, 'multi': 1, 'single': 2 };
    const TARGET_VOXELS = 500;

    valid.sort((a, b) => {
        // First, prefer better view modes (tri > multi > single)
        const aModeScore = viewModePriority[a.viewMode];
        const bModeScore = viewModePriority[b.viewMode];
        if (aModeScore !== bModeScore) {
            return aModeScore - bModeScore;
        }
        // Then prefer candidates with valid base
        if (a.hasValidBase !== b.hasValidBase) {
            return a.hasValidBase ? -1 : 1;
        }
        // Then by closeness to target voxel count
        const aDist = Math.abs(a.voxelCount - TARGET_VOXELS);
        const bDist = Math.abs(b.voxelCount - TARGET_VOXELS);
        return aDist - bDist;
    });

    return valid[0];
}

/**
 * POST handler
 */
export async function POST(req: Request): Promise<Response> {
    // Rate limiting
    const clientIP = getClientIP(req);
    if (!checkRateLimit(clientIP)) {
        const retryAfter = getRetryAfterSeconds(clientIP);
        return createErrorResponse(
            'RATE_LIMITED',
            'Too many requests. Please try again later.',
            429,
            { 'Retry-After': String(retryAfter || 60) }
        );
    }

    try {
        // Parse request
        let body: GenerateSilhouetteRequestBody;
        try {
            body = await req.json();
        } catch {
            return createErrorResponse('INVALID_INPUT', 'Invalid JSON in request body', 400);
        }

        const { prompt, imageData, mimeType, candidateCount = 3, resolutionConfig, symmetryAxis = 'auto' } = body;

        // Validate required fields
        if (!prompt || !imageData || !mimeType) {
            return createErrorResponse(
                'INVALID_INPUT',
                'prompt, imageData, and mimeType are required',
                400
            );
        }

        console.log('[generate-silhouette] Starting generation with', candidateCount, 'candidates');
        if (resolutionConfig) {
            console.log('[generate-silhouette] Size config:', {
                width: resolutionConfig.maxWidth,
                depth: resolutionConfig.maxDepth,
                height: resolutionConfig.maxHeight,
            });
        }

        // Extract image dimensions for aspect ratio compensation
        const imageDimensions = extractImageDimensions(imageData, mimeType);
        if (imageDimensions) {
            console.log('[generate-silhouette] Image dimensions:', {
                width: imageDimensions.width,
                height: imageDimensions.height,
                aspectRatio: imageDimensions.aspectRatio.toFixed(2),
            });
        } else {
            console.warn('[generate-silhouette] Could not extract image dimensions');
        }

        // Generate candidates in parallel with different detail levels
        const detailLevels: DetailLevel[] = ['low', 'medium', 'high'];
        const candidatePromises = detailLevels.slice(0, candidateCount).map((level) =>
            generateCandidate(imageData, mimeType, prompt, level, resolutionConfig, imageDimensions ?? undefined)
        );

        const candidates = await Promise.all(candidatePromises);

        // Log candidate results
        candidates.forEach((c, i) => {
            const hasAnyModel = c.model !== null || c.multiViewModel !== null || c.triViewModel !== null;
            console.log(`[generate-silhouette] Candidate ${i} (${c.detailLevel}):`, {
                viewMode: c.viewMode,
                hasModel: hasAnyModel,
                voxels: c.voxelCount,
                hasBase: c.hasValidBase,
                error: c.error,
            });
        });

        // Select best candidate
        const best = selectBestCandidate(candidates);

        // Check if we have any valid model (single, multi, or tri-view)
        const hasValidModel = best && (best.model !== null || best.multiViewModel !== null || best.triViewModel !== null);

        if (!hasValidModel) {
            // All candidates failed - try JSON repair on first candidate
            console.log('[generate-silhouette] All candidates failed, attempting repair');

            // TODO: Implement repair logic with JSON_REPAIR_PROMPT
            // For now, return error
            return createErrorResponse(
                'GENERATION_FAILED',
                'Unable to extract valid silhouette from image. Try a simpler image.',
                500
            );
        }

        let voxels: { x: number; y: number; z: number; color: string }[];

        if (best.viewMode === 'tri' && best.triViewModel) {
            // Tri-view model: use 3-way visual hull carving (most accurate)
            const triModel = best.triViewModel;

            // Scale front/side views for LEGO unit ratio
            const scaledModel = scaleMultiViewHeights({
                view_mode: 'multi',
                bounding_box: triModel.bounding_box,
                front_view: triModel.front_view,
                side_view: triModel.side_view,
                recommended_symmetry: triModel.recommended_symmetry,
            });

            console.log('[generate-silhouette] Selected TRI-VIEW candidate:', {
                detailLevel: best.detailLevel,
                originalHeight: triModel.bounding_box.height_plates,
                scaledHeight: scaledModel.bounding_box.height_plates,
                width: scaledModel.bounding_box.width,
                depth: scaledModel.bounding_box.depth,
                topCells: triModel.top_view.cells.length,
            });

            // Use tri-view rasterization with all 3 views
            voxels = rasterizeTriView({
                view_mode: 'tri',
                bounding_box: scaledModel.bounding_box,
                front_view: scaledModel.front_view,
                side_view: scaledModel.side_view,
                top_view: triModel.top_view,
                recommended_symmetry: triModel.recommended_symmetry,
            });

            console.log('[generate-silhouette] Tri-view rasterized to', voxels.length, 'voxels');
        } else if (best.viewMode === 'multi' && best.multiViewModel) {
            // Multi-view model: use 2-way visual hull carving
            const scaledModel = scaleMultiViewHeights({
                view_mode: 'multi',
                bounding_box: best.multiViewModel.bounding_box,
                front_view: best.multiViewModel.front_view,
                side_view: best.multiViewModel.side_view,
                recommended_symmetry: best.multiViewModel.recommended_symmetry,
            });

            console.log('[generate-silhouette] Selected MULTI-VIEW candidate:', {
                detailLevel: best.detailLevel,
                originalHeight: best.multiViewModel.bounding_box.height_plates,
                scaledHeight: scaledModel.bounding_box.height_plates,
                width: scaledModel.bounding_box.width,
                depth: scaledModel.bounding_box.depth,
            });

            voxels = rasterizeMultiView(scaledModel);

            console.log('[generate-silhouette] Multi-view rasterized to', voxels.length, 'voxels');
        } else if (best.model) {
            // Single-view model: use layer rasterization
            console.log('[generate-silhouette] Selected single-view candidate:', {
                detailLevel: best.detailLevel,
                voxels: best.voxelCount,
                layers: best.model.layers.length,
            });

            // Determine symmetry options from user setting or AI recommendation
            const symmetryOpts = getSymmetryOptions(symmetryAxis, best.model.recommended_symmetry);
            console.log('[generate-silhouette] Symmetry:', {
                userSetting: symmetryAxis,
                aiRecommendation: best.model.recommended_symmetry,
                applied: symmetryOpts,
            });

            // Convert silhouette to voxels
            voxels = rasterizeLayers(best.model, symmetryOpts);

            console.log('[generate-silhouette] Single-view rasterized to', voxels.length, 'voxels');
        } else {
            return createErrorResponse(
                'GENERATION_FAILED',
                'No valid model produced.',
                500
            );
        }

        if (voxels.length === 0) {
            return createErrorResponse(
                'GENERATION_FAILED',
                'Generated silhouette produced no voxels. Try a different image.',
                500
            );
        }

        // Edge smoothing disabled - was too aggressive and creating holes
        // TODO: Implement gentler smoothing that only removes true corner voxels
        // const beforeSmooth = voxels.length;
        // voxels = smoothVoxelEdges(voxels);
        // if (voxels.length !== beforeSmooth) {
        //     console.log('[generate-silhouette] Edge smoothing:', beforeSmooth, '->', voxels.length, 'voxels');
        // }

        console.log('[generate-silhouette] Total voxels:', voxels.length);

        // Convert color names to hex values in voxels
        const voxelsWithHex = voxels.map((v) => ({
            ...v,
            color: colorNameToHex(v.color),
        }));

        // Convert voxels to bricks
        const bricks = convertVoxelsToBricks(voxelsWithHex);

        console.log('[generate-silhouette] Converted to', bricks.length, 'bricks');

        // Generate HTML
        const html = generateHTMLFromBricks(bricks);

        // Return with brick count in headers for debugging
        return new Response(html, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Brick-Count': String(bricks.length),
                'X-Voxel-Count': String(voxels.length),
            },
        });
    } catch (error) {
        console.error('[generate-silhouette] Generation failed:', error);

        if (error instanceof Error) {
            const msg = error.message.toLowerCase();
            if (msg.includes('rate limit') || msg.includes('quota')) {
                return createErrorResponse(
                    'RATE_LIMITED',
                    'AI service is busy. Please wait and try again.',
                    429
                );
            }
        }

        return createErrorResponse(
            'GENERATION_FAILED',
            'Unable to generate model. Please try again.',
            500
        );
    }
}
