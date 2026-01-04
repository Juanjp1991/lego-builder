/**
 * Brick to HTML Conversion
 * 
 * Converts an array of LEGO bricks into a complete HTML file
 * with Three.js scene rendering.
 */

import type { LegoBrick } from './voxel-to-brick';

/**
 * HTML template for Three.js LEGO scene
 */
const HTML_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <!-- GENERATION_METHOD: deterministic_algorithm -->
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

function addBrick(w,d,x,y,z,color){
  const gap=0.04,brickHeight=1.0,studRadius=0.3,studHeight=0.2;
  const geometry=new THREE.BoxGeometry(w-gap,brickHeight-gap,d-gap);
  const brick=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color}));
  brick.position.set(x+w/2,y*brickHeight+brickHeight/2,z+d/2);
  brick.castShadow=true;brick.receiveShadow=true;scene.add(brick);
  brick.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:0x333333})));
  const studGeo=new THREE.CylinderGeometry(studRadius,studRadius,studHeight,16);
  const studMat=new THREE.MeshLambertMaterial({color});
  for(let i=0;i<w;i++)for(let j=0;j<d;j++){const stud=new THREE.Mesh(studGeo,studMat);stud.position.set(i-w/2+0.5,brickHeight/2+studHeight/2,j-d/2+0.5);brick.add(stud)}
}

// --- BRICKS START ---
{{BRICKS}}
// --- BRICKS END ---

// Auto-frame camera to fit model
(function autoFrameCamera() {
  const box = new THREE.Box3();
  scene.traverse((obj) => {
    if (obj.isMesh && obj.geometry) {
      box.expandByObject(obj);
    }
  });
  
  if (!box.isEmpty()) {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.8; // Add padding
    
    camera.position.set(center.x + cameraZ * 0.7, center.y + cameraZ * 0.5, center.z + cameraZ * 0.7);
    camera.lookAt(center);
    controls.target.copy(center);
    controls.update();
  }
})();

// Handle control messages from parent
function centerCamera() {
  const box = new THREE.Box3();
  scene.traverse((obj) => {
    if (obj.isMesh && obj.geometry) box.expandByObject(obj);
  });
  if (!box.isEmpty()) {
    const c = box.getCenter(new THREE.Vector3());
    const s = box.getSize(new THREE.Vector3());
    const m = Math.max(s.x, s.y, s.z);
    const z = m * 1.8;
    camera.position.set(c.x + z * 0.7, c.y + z * 0.5, c.z + z * 0.7);
    camera.lookAt(c);
    controls.target.copy(c);
  }
  controls.update();
}

window.addEventListener('message', (e) => {
  const d = e.data;
  if (!d || !d.type) return;
  
  if (d.type === 'rotate') {
    const o = new THREE.Vector3().copy(camera.position).sub(controls.target);
    const a = Math.PI / 8;
    o.applyAxisAngle(new THREE.Vector3(0, 1, 0), d.direction === 'left' ? a : -a);
    camera.position.copy(controls.target).add(o);
  } else if (d.type === 'zoom') {
    camera.position.multiplyScalar(d.direction === 'in' ? 0.8 : 1.25);
  } else if (d.type === 'reset' || d.type === 'center') {
    controls.reset();
    centerCamera();
  }
  controls.update();
});

window.parent.postMessage({type:'ready'},'*');
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)}animate();

window.addEventListener('resize',()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight)});
</script>
</body>
</html>`;

/**
 * LEGO color name to hex value mapping
 */
const LEGO_COLOR_HEX: Record<string, string> = {
  red: '0xC91A09',
  blue: '0x0055BF',
  yellow: '0xF2CD37',
  green: '0x237841',
  white: '0xFFFFFF',
  black: '0x1B2A34',
  gray: '0x9BA19D',
  'light-gray': '0xA0A5A9',
  'dark-gray': '0x6D6E5C',
  orange: '0xFE8A18',
  brown: '0x583927',
  tan: '0xE4CD9E',
  pink: '0xFC97AC',
  purple: '0x671F81',
  lime: '0xBBE90B',
  cyan: '0x0AAAA4',
  'dark-blue': '0x0A3463',
  'dark-red': '0x720E0F',
  'dark-green': '0x184632',
};

/**
 * Convert color name to hex, with fallback
 */
function colorToHex(color: string): string {
  // If already hex format, return as-is
  if (color.startsWith('0x') || color.startsWith('#')) {
    return color.startsWith('#') ? `0x${color.slice(1)}` : color;
  }
  return LEGO_COLOR_HEX[color.toLowerCase()] || '0xF2CD37'; // Default to yellow
}

/**
 * Generate complete HTML from brick array
 */
export function generateHTMLFromBricks(bricks: LegoBrick[]): string {
  const brickCalls = bricks
    .map(brick => {
      const { width, depth, x, y, z, color } = brick;
      const hexColor = colorToHex(color);
      return `addBrick(${width},${depth},${x},${y},${z},${hexColor});`;
    })
    .join('\n');

  return HTML_TEMPLATE.replace('{{BRICKS}}', brickCalls);
}

/**
 * Parse voxel JSON from LLM response
 */
export interface VoxelGridJSON {
  dimensions?: { x: number; y: number; z: number };
  voxels: Array<{ x: number; y: number; z: number; color: string }>;
}

/**
 * Parse and validate voxel JSON
 */
export function parseVoxelJSON(jsonString: string): VoxelGridJSON | null {
  try {
    // Try to extract JSON from markdown code blocks
    let cleaned = jsonString.trim();

    // Remove markdown code fences
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');

    const parsed = JSON.parse(cleaned);

    // Validate structure
    if (!parsed.voxels || !Array.isArray(parsed.voxels)) {
      console.error('[parseVoxelJSON] Missing or invalid voxels array');
      return null;
    }

    // Validate voxels
    for (const voxel of parsed.voxels) {
      if (typeof voxel.x !== 'number' ||
        typeof voxel.y !== 'number' ||
        typeof voxel.z !== 'number' ||
        typeof voxel.color !== 'string') {
        console.error('[parseVoxelJSON] Invalid voxel format:', voxel);
        return null;
      }
    }

    return parsed;
  } catch (error) {
    console.error('[parseVoxelJSON] Failed to parse:', error);
    return null;
  }
}
