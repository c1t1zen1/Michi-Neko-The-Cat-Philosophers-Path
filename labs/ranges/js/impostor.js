// Octahedral(ish) impostors: bake the real tree once from a hemisphere
// grid, then every wall tree is a camera-facing quad that samples the atlas
// cell matching the view direction — the Fortnite/Brucks recipe, on r160.
// Hemisphere only: a tree is never seen from below.
//
// Quality notes (from the SpeedTree/Florasynth bake literature):
//   * light the bake like the scene it will join — a dark bake never
//     recovers, so this rig is warm, bright and sky-filled;
//   * alpha-dilate every cell so mip-mapped edges don't fringe black;
//   * the drawn quad is sized from the canopy's real box height, not the
//     bounding sphere — silhouettes land the size the 3D tree would be.
import * as THREE from 'three';
import { octDir } from './profiles.js';

const _c = new THREE.Vector3();

/** Push RGB of opaque pixels into transparent ones (kills mip fringing). */
function dilateCell(img, w, h, passes = 2) {
  const d = img.data;
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] > 8) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            const j = (yy * w + xx) * 4;
            if (d[j + 3] > 8) { r += d[j]; g += d[j + 1]; b += d[j + 2]; n++; }
          }
        }
        if (n) { d[i] = r / n; d[i + 1] = g / n; d[i + 2] = b / n; }
      }
    }
  }
}

/**
 * Render `object` from a grid×grid hemisphere of directions into one atlas
 * canvas. Returns { texture, grid, center, size, worldH, fillY, canvas } —
 * `worldH` is the canopy's real height in world units so a quad scaled to it
 * draws the tree exactly as tall as the 3D version was.
 */
export function bakeImpostor(renderer, object, { grid = 4, cell = 192, pad = 1.1 } = {}) {
  const box = new THREE.Box3().setFromObject(object);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const center = sphere.center.clone();
  const radius = sphere.radius;
  const worldH = Math.max(0.01, box.max.y - box.min.y);
  const baseY = box.min.y;

  const bakeScene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(36, 1, radius * 0.1, radius * 12);
  const dist = radius * 3.4;
  // Warm afternoon bake — matches the lab's LightRig at ~hour 10.
  const key = new THREE.DirectionalLight(0xfff0d6, 3.1);
  key.position.set(0.55, 0.85, 0.6);
  const rim = new THREE.DirectionalLight(0xd8e4f2, 0.9);
  rim.position.set(-0.6, 0.5, -0.7);
  const fill = new THREE.HemisphereLight(0xcfe0f2, 0x5a6a44, 1.5);
  bakeScene.add(object, key, rim, fill);

  const rt = new THREE.WebGLRenderTarget(cell, cell, {
    alpha: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    colorSpace: THREE.SRGBColorSpace
  });
  const prevRT = renderer.getRenderTarget();
  const atlas = document.createElement('canvas');
  atlas.width = grid * cell; atlas.height = grid * cell;
  const ctx = atlas.getContext('2d');
  const buf = new Uint8Array(cell * cell * 4);

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
      dilateCell(img, cell, cell, 3);
      ctx.putImageData(img, i * cell, j * cell);
    }
  }
  renderer.setRenderTarget(prevRT);
  rt.dispose();
  const texture = new THREE.CanvasTexture(atlas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  const quadSize = radius * 2 * pad;
  // v-fraction of the quad where the canopy base sits (0 = bottom edge)
  const bottomV = (baseY - center.y) / quadSize + 0.5;
  return { texture, grid, center, radius, quadSize, worldH, baseY, bottomV, canvas: atlas, fillY: worldH / quadSize };
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
  vec2 inside = vUv * 0.9 + 0.05;
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
  if (col.a < 0.4) discard;
  vec3 rgb = col.rgb * vTint.rgb;
  gl_FragColor = vec4(rgb, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/**
 * A field of impostor cards. positions: [{x, y?, z, h, yaw, tint?}] where `h`
 * is the tree's real height in world units — the quad is scaled so the baked
 * silhouette draws `h` tall (not the whole bounding sphere).
 */
export function impostorField(atlas, positions, { blend = 1 } = {}) {
  const quad = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = quad.index;
  geo.attributes.position = quad.attributes.position;
  geo.attributes.uv = quad.attributes.uv;
  const n = positions.length;
  const iPos = new Float32Array(n * 4), iYaw = new Float32Array(n), iTint = new Float32Array(n * 4);
  const fillY = atlas.fillY || 0.62;
  positions.forEach((p, i) => {
    // draw the silhouette `h` tall: quad edge = h / fillY; centre sits so the
    // canopy base lands exactly on the ground point
    const h = p.h || atlas.worldH;
    const edge = h / fillY;
    iPos[i * 4] = p.x;
    iPos[i * 4 + 1] = (p.y || 0) + (0.5 - atlas.bottomV) * edge - h * 0.03;
    iPos[i * 4 + 2] = p.z;
    iPos[i * 4 + 3] = edge / atlas.quadSize;
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
