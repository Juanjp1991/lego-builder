/**
 * AI Prompts Configuration
 *
 * System prompts for AI model generation.
 * Optimized for generating LEGO-style 3D scenes.
 */

import { getGuidelinesForPrompt, type LegoCategory } from './categories';

/**
 * Official LEGO color palette - compact format for token efficiency.
 * Format: Name=Hex pairs for easy AI parsing.
 */
export const LEGO_COLOR_PALETTE = `
LEGO COLORS: Red=0xB40000, BrightRed=0xC91A09, DarkRed=0x720E0F, Blue=0x0055BF, DarkBlue=0x0A3463, LightBlue=0x9FC3E9, Green=0x237841, BrightGreen=0x4B9F4A, DarkGreen=0x184632, Yellow=0xF2CD37, BrightYellow=0xFFF03A, Orange=0xFE8A18, White=0xFFFFFF, LightGray=0xA0A5A9, DarkGray=0x6C6E68, Black=0x05131D, Brown=0x583927, Tan=0xE4CD9E, DarkTan=0x958A73, Pink=0xFC97AC, Azure=0x36AEBF, Lime=0xBBE90B`;

/**
 * Building techniques for structural stability - condensed for token efficiency.
 */
export const BUILDING_TECHNIQUES = `
STABILITY RULES:
1. STAGGER JOINTS: Offset each layer by 1+ stud (never stack directly)
2. WIDE BASE: Base width ≥ 1/3 height, start with 6x6+ foundation
3. SUPPORT: Pillars every 4-6 studs for hollow structures, fill corners
4. CANTILEVER: Max 2 stud overhang unsupported, support longer extensions
5. BRICK SIZE: Max 4x2 bricks. Use 2x4 for structure, 1x1/1x2 for details. NO bricks larger than 4x2.
6. BALANCE: Distribute weight evenly, center gravity over base
7. BUILD LAYER BY LAYER: Complete Y=0 first, then Y=1, then Y=2, etc. Never place a brick at Y=N before completing Y=N-1.
8. COLOR ACCURACY: Match colors exactly to the source/description. Use the closest LEGO palette color. Color fidelity is critical.
9. SILHOUETTE FIRST: Build the accurate outline/silhouette before filling details. The shape must be instantly recognizable.`;

/**
 * Shared HTML template for LEGO model rendering.
 * Used by both text-to-LEGO and image-to-LEGO prompts.
 * Minified comments, kept essential structure.
 */
const SHARED_HTML_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <!-- GENERATION_METHOD: gemini_direct -->
  <style>body{margin:0;background:#e0e0e0;overflow:hidden}</style>
  <script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}</script>
</head>
<body>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe0e0e0);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(20, 20, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

const occupied = new Set();
function isOccupied(x,y,z){return occupied.has(\`\${x},\${y},\${z}\`)}
function markOccupied(w,d,x,y,z){for(let i=0;i<w;i++)for(let j=0;j<d;j++)occupied.add(\`\${x+i},\${y},\${z+j}\`)}

function addBrick(w,d,x,y,z,color){
  if(w>2&&d>2){if(w>=d){addBrick(2,d,x,y,z,color);addBrick(w-2,d,x+2,y,z,color)}else{addBrick(w,2,x,y,z,color);addBrick(w,d-2,x,y,z+2,color)}return}
  let safeY=Math.max(0,y);
  function hasSupport(checkY,bx,bz,bw,bd){if(checkY<=0)return true;for(let i=0;i<bw;i++)for(let j=0;j<bd;j++)if(isOccupied(bx+i,checkY-1,bz+j))return true;return false}
  while(safeY>0&&!hasSupport(safeY,x,z,w,d))safeY--;
  let hasCollision=true;
  while(hasCollision){hasCollision=false;for(let i=0;i<w;i++){for(let j=0;j<d;j++){if(isOccupied(x+i,safeY,z+j)){hasCollision=true;break}}if(hasCollision)break}if(hasCollision)safeY++}
  markOccupied(w,d,x,safeY,z);
  const gap=0.04,brickHeight=1.0,studRadius=0.3,studHeight=0.2;
  const geometry=new THREE.BoxGeometry(w-gap,brickHeight-gap,d-gap);
  const brick=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color}));
  brick.position.set(x+w/2,safeY*brickHeight+brickHeight/2,z+d/2);
  brick.castShadow=true;brick.receiveShadow=true;scene.add(brick);
  brick.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:0x333333})));
  const studGeo=new THREE.CylinderGeometry(studRadius,studRadius,studHeight,16);
  const studMat=new THREE.MeshLambertMaterial({color});
  for(let i=0;i<w;i++)for(let j=0;j<d;j++){const stud=new THREE.Mesh(studGeo,studMat);stud.position.set(i-w/2+0.5,brickHeight/2+studHeight/2,j-d/2+0.5);brick.add(stud)}
}

// --- BUILD HERE ---
// TODO: AI GENERATED CODE GOES HERE

// --- END BUILD ---

window.addEventListener('message',(e)=>{const d=e.data;if(!d||!d.type)return;if(d.type==='rotate'){const o=new THREE.Vector3().copy(camera.position).sub(controls.target);const a=Math.PI/8;o.applyAxisAngle(new THREE.Vector3(0,1,0),d.direction==='left'?a:-a);camera.position.copy(controls.target).add(o)}else if(d.type==='zoom'){camera.position.multiplyScalar(d.direction==='in'?0.8:1.25)}else if(d.type==='reset'){controls.reset();camera.position.set(20,20,20);camera.lookAt(0,0,0)}controls.update()});
window.parent.postMessage({type:'ready'},'*');
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)}animate();
window.addEventListener('resize',()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight)});
</script>
</body>
</html>`;

/**
 * Core instructions shared between text and image prompts.
 */
const CORE_INSTRUCTIONS = `
CRITICAL INSTRUCTIONS:
1. Output the FULL HTML template with addBrick() calls in the BUILD section
2. addBrick(width, depth, x, y, z, colorHex) - width=X-size, depth=Z-size, max 4x2

STEP-BY-STEP PROCESS (FOLLOW EXACTLY):
1. PLAN: Decide total dimensions (e.g., car = 12x6x5 studs)
2. LAYER 0: Build complete ground layer first (wheels, base)
3. LAYER 1-N: Build each layer completely before moving up
4. CHECK: Every brick at Y>0 must have support below it

COORDINATE SYSTEM:
- X = left-right (width)
- Y = bottom-top (height, 0=ground)
- Z = front-back (depth)
- Origin (0,0,0) = front-left-bottom corner

EXAMPLE - Simple 4x4x3 Red Cube:
// Layer 0 (Y=0) - complete base
addBrick(2,2, 0,0,0, 0xB40000); addBrick(2,2, 2,0,0, 0xB40000);
addBrick(2,2, 0,0,2, 0xB40000); addBrick(2,2, 2,0,2, 0xB40000);
// Layer 1 (Y=1) - offset for strength
addBrick(2,2, 1,1,0, 0xB40000); addBrick(2,2, 1,1,2, 0xB40000);
addBrick(2,1, 0,1,1, 0xB40000); addBrick(2,1, 2,1,1, 0xB40000);
// Layer 2 (Y=2) - top
addBrick(2,2, 0,2,0, 0xB40000); addBrick(2,2, 2,2,0, 0xB40000);
addBrick(2,2, 0,2,2, 0xB40000); addBrick(2,2, 2,2,2, 0xB40000);

REFERENCE SIZES (studs):
- Small car: 10x5x4 (LxWxH)
- House: 12x10x8
- Person: 3x2x6
- Tree: 4x4x8
- Animal: 8x4x5`;

/**
 * System prompt for LEGO model generation.
 * Instructs the AI to generate complete Three.js HTML scenes.
 */
export const LEGO_GENERATION_SYSTEM_PROMPT = `You are an expert LEGO Master Builder.

CRITICAL: Generate a COMPLETE HTML file using this exact template. Only add addBrick() calls in the BUILD section.

${SHARED_HTML_TEMPLATE}
${CORE_INSTRUCTIONS}`;

/**
 * Prompt suffix for simpler first-time user builds.
 * Used in conjunction with First-Build Guarantee (FR6).
 */
export const FIRST_BUILD_SUFFIX = `
Keep this design simple and beginner-friendly:
- Stick to standard brick sizes (2x4, 2x3, 2x2, 1x4, 1x2, 1x1) - max 4x2 allowed
- Make the shape recognizable but not overly detailed
- Prioritize structural stability over complexity. Adopt a Minecraft-like voxel aesthetic: Blocky, square, reliable structures.`;

/**
 * System prompt for image-to-LEGO model generation.
 * Uses shared template to reduce token usage.
 *
 * @see Story 2.3: Implement Image-to-Lego Model Generation
 */
export const IMAGE_TO_LEGO_SYSTEM_PROMPT = `You are a LEGO voxel designer. Analyze the image and create a 3D voxel grid.

OUTPUT FORMAT (JSON):
\`\`\`json
{
  "voxels": [
    {"x": 0, "y": 0, "z": 0, "color": "0xB40000"},
    {"x": 1, "y": 0, "z": 0, "color": "0xB40000"}
  ]
}
\`\`\`

RULES:
1. Each voxel represents a 2x2 LEGO stud unit
2. Use integer coordinates only
3. Y=0 is ground level
4. Colors must be hex format (0xRRGGBB)
5. Keep grid simple: 6-16 voxels per side maximum
6. Build stable structures (wide base, connected parts)

VOXEL IMAGE CONVERSION:
- Identify main shapes in the image
- Translate to blocky voxel form
- Use standard LEGO colors: ${LEGO_COLOR_PALETTE}

OUTPUT: JSON only, no explanation.`;

/**
 * Suffix for structural stability analysis - condensed format.
 * @see Story 2.6: Add Structural Feedback for Generated Models
 */
export const STRUCTURAL_ANALYSIS_SUFFIX = `
STRUCTURAL ANALYSIS (add before </script>):
Check: CANTILEVER (unsupported overhang), FLOATING (disconnected), TOO_TALL (height:base>3:1), NARROW_BASE (<1/3 width), UNBALANCED
Format: <!-- STRUCTURAL_ANALYSIS: {"isStable":bool,"issues":[{"type":"","severity":"warning|critical","message":"","suggestion":""}],"overallScore":0-100,"summary":""} -->`;

/**
 * Suffix appended to prompt when user clicks "Regenerate for Stability".
 * This instructs the AI to prioritize structural stability in the next generation.
 *
 * @see Story 2.6: Add Structural Feedback for Generated Models
 */
export const STABILITY_REGENERATION_SUFFIX =
  ' Please make this model more structurally stable with a wider base, better support columns, and avoid overhangs.';

/**
 * Options for system prompt generation.
 */
export interface SystemPromptOptions {
  /** Whether this is the user's first build (simple mode) */
  isFirstBuild: boolean;
  /** Optional user prompt for category detection */
  userPrompt?: string;
  /** Optional target brick count (±10 tolerance). When set, overrides category minimums. */
  targetBrickCount?: number;
}

/**
 * Returns the appropriate system prompt for text-to-LEGO generation.
 *
 * When isFirstBuild is true, the FIRST_BUILD_SUFFIX is appended to encourage
 * simpler, more buildable designs for first-time users.
 *
 * Always includes STRUCTURAL_ANALYSIS_SUFFIX for buildability feedback.
 *
 * @param options - Prompt generation options (or boolean for backwards compatibility)
 * @param userPrompt - Optional user prompt (only used if first param is boolean)
 * @returns Object with system prompt string and detected category
 *
 * @see Story 2.5: Implement First-Build Guarantee
 * @see Story 2.6: Add Structural Feedback for Generated Models
 */
export function getSystemPrompt(
  options: SystemPromptOptions | boolean,
  userPrompt?: string
): { systemPrompt: string; category: LegoCategory } {
  // Support both old signature (boolean, string?) and new signature (options object)
  const opts: SystemPromptOptions = typeof options === 'boolean'
    ? { isFirstBuild: options, userPrompt }
    : options;

  let prompt = LEGO_GENERATION_SYSTEM_PROMPT;

  // Add compact color palette and stability rules
  prompt += '\n' + LEGO_COLOR_PALETTE + '\n' + BUILDING_TECHNIQUES;

  // Detect category - only add specific guidelines for non-general categories
  let detectedCategory: LegoCategory = 'general';
  if (opts.userPrompt) {
    const { category, guidelines, brickCount } = getGuidelinesForPrompt(opts.userPrompt);
    detectedCategory = category;

    // Only add category guidelines if not general (saves ~800 tokens for generic prompts)
    if (category !== 'general') {
      prompt += '\n' + guidelines;
    }

    // Target brick count takes priority over category minimum
    if (opts.targetBrickCount) {
      prompt += `\nBRICKS: Target ~${opts.targetBrickCount} bricks (${opts.targetBrickCount - 10} to ${opts.targetBrickCount + 10} acceptable)`;
    } else {
      // Minimum brick range (no max - AI can use more for accuracy)
      prompt += `\nBRICKS: Use ${brickCount.minRange} bricks minimum for ${category}. More bricks = better accuracy.`;
    }
  } else if (opts.targetBrickCount) {
    // No category detected but target specified
    prompt += `\nBRICKS: Target ~${opts.targetBrickCount} bricks (${opts.targetBrickCount - 10} to ${opts.targetBrickCount + 10} acceptable)`;
  }

  if (opts.isFirstBuild) {
    prompt += '\n' + FIRST_BUILD_SUFFIX;
  }

  prompt += '\n' + STRUCTURAL_ANALYSIS_SUFFIX;

  return { systemPrompt: prompt, category: detectedCategory };
}

/**
 * Returns the appropriate system prompt for image-to-LEGO generation.
 *
 * When isFirstBuild is true, the FIRST_BUILD_SUFFIX is appended to encourage
 * simpler, more buildable designs for first-time users.
 *
 * Always includes STRUCTURAL_ANALYSIS_SUFFIX for buildability feedback.
 *
 * @param options - Prompt generation options (or boolean for backwards compatibility)
 * @param userPrompt - Optional user prompt (only used if first param is boolean)
 * @returns Object with system prompt string and detected category
 *
 * @see Story 2.5: Implement First-Build Guarantee
 * @see Story 2.6: Add Structural Feedback for Generated Models
 */
export function getImageSystemPrompt(
  options: SystemPromptOptions | boolean,
  userPrompt?: string
): { systemPrompt: string; category: LegoCategory } {
  // Support both old signature (boolean, string?) and new signature (options object)
  const opts: SystemPromptOptions = typeof options === 'boolean'
    ? { isFirstBuild: options, userPrompt }
    : options;

  let prompt = IMAGE_TO_LEGO_SYSTEM_PROMPT;

  // Add compact color palette and stability rules
  prompt += '\n' + LEGO_COLOR_PALETTE + '\n' + BUILDING_TECHNIQUES;

  // Detect category - only add specific guidelines for non-general categories
  let detectedCategory: LegoCategory = 'general';
  if (opts.userPrompt) {
    const { category, guidelines, brickCount } = getGuidelinesForPrompt(opts.userPrompt);
    detectedCategory = category;

    // Only add category guidelines if not general (saves ~800 tokens for generic prompts)
    if (category !== 'general') {
      prompt += '\n' + guidelines;
    }

    // Target brick count takes priority over category minimum
    if (opts.targetBrickCount) {
      prompt += `\nBRICKS: Target ~${opts.targetBrickCount} bricks (${opts.targetBrickCount - 10} to ${opts.targetBrickCount + 10} acceptable)`;
    } else {
      // Minimum brick range (no max - AI can use more for accuracy)
      prompt += `\nBRICKS: Use ${brickCount.minRange} bricks minimum for ${category}. More bricks = better accuracy.`;
    }
  } else if (opts.targetBrickCount) {
    // No category detected but target specified
    prompt += `\nBRICKS: Target ~${opts.targetBrickCount} bricks (${opts.targetBrickCount - 10} to ${opts.targetBrickCount + 10} acceptable)`;
  }

  if (opts.isFirstBuild) {
    prompt += '\n' + FIRST_BUILD_SUFFIX;
  }

  prompt += '\n' + STRUCTURAL_ANALYSIS_SUFFIX;

  return { systemPrompt: prompt, category: detectedCategory };
}

// Re-export LegoCategory for convenience
export type { LegoCategory } from './categories';

