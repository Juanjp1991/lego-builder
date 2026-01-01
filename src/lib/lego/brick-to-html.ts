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

window.addEventListener('message',(e)=>{const d=e.data;if(!d||!d.type)return;if(d.type==='rotate'){const o=new THREE.Vector3().copy(camera.position).sub(controls.target);const a=Math.PI/8;o.applyAxisAngle(new THREE.Vector3(0,1,0),d.direction==='left'?a:-a);camera.position.copy(controls.target).add(o)}else if(d.type==='zoom'){camera.position.multiplyScalar(d.direction==='in'?0.8:1.25)}else if(d.type==='reset'){controls.reset();camera.position.set(20,20,20);camera.lookAt(0,0,0)}controls.update()});
window.parent.postMessage({type:'ready'},'*');
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)}animate();
window.addEventListener('resize',()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight)});
</script>
</body>
</html>`;

/**
 * Generate complete HTML from brick array
 */
export function generateHTMLFromBricks(bricks: LegoBrick[]): string {
    const brickCalls = bricks
        .map(brick => {
            const { width, depth, x, y, z, color } = brick;
            return `addBrick(${width},${depth},${x},${y},${z},${color});`;
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
