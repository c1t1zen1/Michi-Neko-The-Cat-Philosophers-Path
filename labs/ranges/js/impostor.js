// Octahedral(ish) impostors: bake the real tree once from a hemisphere
// grid, then every wall tree is a camera-facing quad that samples the atlas
// cell matching the view direction — the Fortnite/Brucks recipe, on r160.
// Hemisphere only: a tree is never seen from below.
import * as THREE from 'three';
import { octDir } from './profiles.js';

const _c = new THREE.Vector3();

/**
 * Render `object` from a grid×grid hemisphere of directions into one atlas
 * canvas. Returns { texture, grid, center, size } — size = the quad edge in
 * world units so the card covers the baked silhouette.
 */
export function bakeImpostor(renderer, object, { grid = 4, cell = 192, pad = 1.18 } = {}) {
  const box = new THREE.Box3().setFromObject(object);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const center = sphere.center.clone();
  const radius = sphere.radius;

  const bakeScene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(38, 1, radius * 0.1, radius * 12);
  const dist = radius * 3.4;
  const key = new THREE.DirectionalLight(0xfff2dc, 2.4);
  key.position.set(0.5, 0.9, 0.6);
  const fill = new THREE.HemisphereLight(0xbfd4ee, 0x50603c, 1.1);
  bakeScene.add(object, key, fill);

  const rt = new THREE.WebGLRenderTarget(cell, cell, {
    alpha: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    colorSpace: THREE.SRGBColorSpace
  });
  const prevRT = renderer.getRenderTarget();
  const atlas = document.createElement('canvas');
  atlas.width = grid * cell; atlas.height = grid * cell;
  const ctx = atlas.getContext('2d');
  const buf = new Uint8Array(cell * cell * 4);
  const row = new Uint8Array(cell * 4);

  for (let j = 0; j < grid; j++) {
    for (let i = 0; i < grid; i++) {
      const d = octDir((i + 0.5) / grid, (j + 0.5) / grid);
      cam.position.copy(center).addScaledVector(_c.set(d.x, d.y, d.z), dist);
      cam.up.set(0, 1, 0);
      if (Math.abs(d.y) > 0.98) cam.up.set(0, 0, -1);
      cam.lookAt(center);
      renderer.setRenderTarget(rt);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(bakeScene, cam);
      renderer.readRenderTargetPixels(rt, 0, 0, cell, cell, buf);
      // GL rows are bottom-up: flip into the canvas
      const img = ctx.createImageData(cell, cell);
      for (let y = 0; y < cell; y++) {
        const src = (cell - 1 - y) * cell * 4;
        img.data.set(buf.subarray(src, src + cell * 4), y * cell * 4);
      }
      ctx.putImageData(img, i * cell, j * cell);
    }
  }
  renderer.setRenderTarget(prevRT);
  rt.dispose();
  const texture = new THREE.CanvasTexture(atlas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return { texture, grid, center, radius, quadSize: radius * 2 * pad, canvas: atlas };
}

const IMP_VS = /* glsl */`
uniform float uQuad;
attribute vec4 iPos;      // xyz world offset, w scale
attribute float iYaw;
attribute vec4 iTint;
varying vec2 vUv;
varying vec3 vDir;        // object→camera direction in bake space
varying vec4 vTint;
varying float vFogZ;
void main() {
  vUv = uv;
  vTint = iTint;
  // spherical billboard: build the quad straight in view space
  vec4 centre = modelViewMatrix * vec4(iPos.xyz, 1.0);
  centre.xy += position.xy * uQuad * iPos.w;
  vFogZ = -centre.z;
  gl_Position = projectionMatrix * centre;
  // view direction for frame selection, un-yawed into bake space
  vec3 d = normalize(cameraPosition - iPos.xyz);
  float c = cos(-iYaw), s = sin(-iYaw);
  vDir = vec3(d.x * c - d.z * s, d.y, d.x * s + d.z * c);
}`;

const IMP_FS = /* glsl */`
uniform sampler2D uAtlas;
uniform float uGrid, uBlend;
varying vec2 vUv; varying vec3 vDir; varying vec4 vTint; varying float vFogZ;

vec2 octUV(vec3 d) {
  float inv = 1.0 / (abs(d.x) + abs(d.y) + abs(d.z));
  return d.xz * inv * 0.5 + 0.5;
}
vec4 cellAt(vec2 cellUV) {
  // cellUV = oct-space centre of one atlas cell; shrink the quad's uv a
  // little so mips can't bleed neighbouring frames
  vec2 inside = vUv * 0.94 + 0.03;
  return texture2D(uAtlas, cellUV + (inside - 0.5) / uGrid);
}
void main() {
  vec3 d = normalize(vDir);
  if (d.y < 0.02) d.y = 0.02;      // hemisphere: clamp to the horizon ring
  vec2 ouv = octUV(d);
  vec2 gp = ouv * uGrid - 0.5;
  vec2 g0 = floor(gp);
  vec2 fr = gp - g0;
  vec4 col = vec4(0.0);
  float wsum = 0.0;
  for (int j = 0; j <= 1; j++) {
    for (int i = 0; i <= 1; i++) {
      vec2 cell = g0 + vec2(float(i), float(j));
      vec2 cu = (cell + 0.5) / uGrid;
      float w = mix(1.0, (1.0 - abs(fr.x - float(i))) * (1.0 - abs(fr.y - float(j))), uBlend);
      col += cellAt(cu) * w;
      wsum += w;
    }
  }
  col /= max(wsum, 1e-4);
  if (col.a < 0.45) discard;
  vec3 rgb = col.rgb * vTint.rgb;
  gl_FragColor = vec4(rgb, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/**
 * A field of impostor cards. positions: [{x, y?, z, s, yaw, tint?}].
 * blend 1 = barycentric-smooth frame blending; 0 = nearest (shows the pops).
 */
export function impostorField(atlas, positions, { blend = 1 } = {}) {
  const quad = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = quad.index;
  geo.attributes.position = quad.attributes.position;
  geo.attributes.uv = quad.attributes.uv;
  const n = positions.length;
  const iPos = new Float32Array(n * 4), iYaw = new Float32Array(n), iTint = new Float32Array(n * 4);
  positions.forEach((p, i) => {
    iPos[i * 4] = p.x; iPos[i * 4 + 1] = (p.y || 0) + atlas.quadSize * (p.s || 1) * 0.5 - atlas.radius * 0.08; iPos[i * 4 + 2] = p.z; iPos[i * 4 + 3] = p.s || 1;
    iYaw[i] = p.yaw || 0;
    const t = p.tint || [1, 1, 1, 1];
    iTint.set(t, i * 4);
  });
  geo.setAttribute('iPos', new THREE.InstancedBufferAttribute(iPos, 4));
  geo.setAttribute('iYaw', new THREE.InstancedBufferAttribute(iYaw, 1));
  geo.setAttribute('iTint', new THREE.InstancedBufferAttribute(iTint, 4));
  geo.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    vertexShader: IMP_VS, fragmentShader: IMP_FS,
    uniforms: {
      uAtlas: { value: atlas.texture },
      uGrid: { value: atlas.grid },
      uBlend: { value: blend },
      uQuad: { value: atlas.quadSize }
    },
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return { mesh, material: mat };
}
