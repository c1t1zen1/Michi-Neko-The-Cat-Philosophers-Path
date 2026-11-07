// Pagoda Lab: one WebGL renderer, multiple pagoda variants, interactive controls.
import * as THREE from 'three';
import { VARIANTS, getVariant } from './variants.js';
import { makeMaterials } from './pagoda.js';

const canvas = document.getElementById('gl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  document.body.insertAdjacentHTML('afterbegin',
    '<p style="padding:40px;font:1.2rem Georgia">This page needs WebGL2.</p>');
  throw e;
}

renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x87CEEB, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

let currentVariant = 'original';
let currentDistance = 'near';
let scene, camera, pagoda, ground, directionalLight;

function init() {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x87CEEB, 100, 1000);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);

  const groundGeo = new THREE.PlaneGeometry(500, 500);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x5a8c4a, roughness: 0.9 });
  ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Distant mountains
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x7a8c9e, roughness: 0.8 });
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const dist = 200 + Math.random() * 100;
    const mHeight = 40 + Math.random() * 60;
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(50 + Math.random() * 30, mHeight, 6),
      mountainMat
    );
    mountain.position.set(Math.cos(angle) * dist, mHeight / 2 - 10, Math.sin(angle) * dist);
    scene.add(mountain);
  }

  directionalLight = new THREE.DirectionalLight(0xffeedd, 2.0);
  directionalLight.position.set(30, 40, 20);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(2048, 2048);
  scene.add(directionalLight);

  const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x556633, 0.6);
  scene.add(hemisphereLight);

  // Sky
  const skyGeo = new THREE.SphereGeometry(900, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x1e5799) },
      bottomColor: { value: new THREE.Color(0xf5e6d3) },
      offset: { value: 10 },
      exponent: { value: 0.6 }
    },
    vertexShader: `
      varying vec3 worldPosition;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        worldPosition = wp.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 worldPosition;
      void main() {
        float h = normalize(worldPosition).y + offset;
        gl_FragColor = vec4(mix(bottomColor, topColor, pow(max(h, 0.0), exponent)), 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);


function buildPagoda(variantId, distance) {
  if (pagoda) {
    scene.remove(pagoda);
    pagoda.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
    });
  }

  const variant = getVariant(variantId);
  let scale = 1;

  if (distance === 'near') {
    scale = 0.35;
    camera.position.set(0, 3, 8);
    camera.lookAt(0, 3, 0);
  } else if (distance === 'mid') {
    scale = 0.15;
    camera.position.set(0, 8, 40);
    camera.lookAt(0, 4, 0);
  } else {
    scale = 0.06;
    camera.position.set(0, 15, 120);
    camera.lookAt(0, 3, 0);
  }

  pagoda = variant.builder(scale);
  pagoda.position.y = 0;
  scene.add(pagoda);

  updateVariantDisplay(variant);
}

function updateVariantDisplay(variant) {
  const display = document.getElementById('variant-display');
  display.innerHTML = `
    <div class="variant-info">
      <div class="info-card">
        <h2>${variant.name}</h2>
        <p>${variant.desc}</p>
        <h3>How it's made</h3>
        <ul>${variant.how.map(h => `<li>${h}</li>`).join('')}</ul>
        <h3>Source recipe</h3>
        <pre><code>${variant.code}</code></pre>
      </div>
    </div>
  `;
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
});

document.querySelectorAll('#seg-variant button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#seg-variant button').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    currentVariant = btn.dataset.v;
    buildPagoda(currentVariant, currentDistance);
  });
});

document.querySelectorAll('#seg-distance button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#seg-distance button').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    currentDistance = btn.dataset.v;
    buildPagoda(currentVariant, currentDistance);
  });
});

document.getElementById('sun-slider').addEventListener('input', (e) => {
  const t = parseFloat(e.target.value);
  const angle = (t - 0.5) * Math.PI;
  directionalLight.position.x = Math.sin(angle) * 40;
  directionalLight.position.y = Math.cos(angle) * 40 + 5;
  if (t < 0.15 || t > 0.85) {
    scene.fog.color.setHex(0xd4c5b0);
    renderer.setClearColor(0xd4c5b0, 1);
  } else {
    scene.fog.color.setHex(0x87CEEB);
    renderer.setClearColor(0x87CEEB, 1);
  }
});

function animate(time) {
  requestAnimationFrame(animate);
  if (pagoda) {
    pagoda.rotation.y = time * 0.00015;
  }
  renderer.render(scene, camera);
}

init();
animate(0);
  buildPagoda(currentVariant, currentDistance);
}