// The last tier: a baked billboard. The far tower is rendered from N
// azimuths (orthographic, one row) into a half-float atlas under the current
// light; a quad turns to face the camera about the vertical axis and blends
// the two nearest views. One draw, two triangles, at any distance. Rebake
// when the light changes by more than a little.
import * as THREE from 'three';

const VS = /* glsl */`
uniform float uW, uH, uY0;
varying vec2 vUv; varying float vAz; varying vec3 vWorld;
void main() {
  vUv = uv;
  vec3 c = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 to = cameraPosition - c; to.y = 0.0;
  vec3 f = normalize(to + vec3(1e-5, 0.0, 0.0));
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), f));
  vec3 p = c + right * (position.x * uW) + vec3(0.0, uY0 + (position.y + 0.5) * uH, 0.0);
  vAz = atan(f.x, f.z);
  vWorld = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const FS = /* glsl */`
uniform sampler2D tAtlas; uniform float uViews;
uniform vec3 uAirCol, uSunCol, uSunW, uBeta; uniform float uAir;
varying vec2 vUv; varying float vAz; varying vec3 vWorld;
void main() {
  float f = mod(vAz / 6.2831853 * uViews + uViews, uViews);
  float i0 = floor(f), i1 = mod(i0 + 1.0, uViews), fr = f - i0;
  vec4 a = texture2D(tAtlas, vec2((i0 + vUv.x) / uViews, vUv.y));
  vec4 b = texture2D(tAtlas, vec2((i1 + vUv.x) / uViews, vUv.y));
  vec4 c = mix(a, b, fr);
  if (c.a < 0.5) discard;
  gl_FragColor = vec4(c.rgb / max(c.a, 1e-3), 1.0);
  vec3 ray = vWorld - cameraPosition; float d = length(ray);
  vec3 ext = exp(-uBeta * d * uAir);
  float sunA = pow(max(dot(ray / d, uSunW), 0.0), 8.0);
  gl_FragColor.rgb = gl_FragColor.rgb * ext + mix(uAirCol, uSunCol * 1.15, sunA * 0.55) * (1.0 - ext);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Impostor {
  constructor(renderer, air, { views = 16, cell = 128 } = {}) {
    this.r = renderer;
    this.views = views;
    this.cell = cell;
    this.rt = new THREE.WebGLRenderTarget(views * cell, cell * 2, { type: THREE.HalfFloatType });
    this.rt.texture.generateMipmaps = true;
    this.rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    this.bakeScene = new THREE.Scene();
    this.hemi = new THREE.HemisphereLight();
    this.sun = new THREE.DirectionalLight();
    this.bakeScene.add(this.hemi, this.sun, this.sun.target);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS,
      uniforms: { tAtlas: { value: this.rt.texture }, uViews: { value: views }, uW: { value: 1 }, uH: { value: 1 }, uY0: { value: 0 }, ...air }
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material);
    this.mesh.name = 'Impostor';
    this.mesh.frustumCulled = false;
    this.bakes = 0;
  }

  /** Render `source` from every azimuth, lit like the rig. */
  bake(source, rig, environment = null) {
    const r = this.r, box = new THREE.Box3().setFromObject(source);
    const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const half = Math.max(size.x, size.z) * 0.72, H = size.y * 1.02;
    this.material.uniforms.uW.value = half * 2;
    this.material.uniforms.uH.value = H;
    this.material.uniforms.uY0.value = box.min.y - 0.01 * H;
    Object.assign(this.cam, { left: -half, right: half, top: H / 2, bottom: -H / 2, near: 0.1, far: half * 8 });
    this.cam.updateProjectionMatrix();
    this.hemi.color.copy(rig.hemi.color); this.hemi.groundColor.copy(rig.hemi.groundColor); this.hemi.intensity = rig.hemi.intensity;
    this.sun.color.copy(rig.sun.color); this.sun.intensity = rig.sun.intensity;
    this.sun.position.copy(rig.sunDir).multiplyScalar(100).add(c); this.sun.target.position.copy(c);
    this.bakeScene.environment = environment;
    const parent = source.parent;
    this.bakeScene.add(source);
    const clear = r.getClearColor(new THREE.Color()), alpha = r.getClearAlpha();
    r.setClearColor(0x000000, 0);
    this.rt.scissorTest = false; this.rt.viewport.set(0, 0, this.rt.width, this.rt.height);
    r.setRenderTarget(this.rt); r.clear();
    this.rt.scissorTest = true;
    const midY = box.min.y + H / 2;
    for (let i = 0; i < this.views; i++) {
      const a = (i / this.views) * Math.PI * 2;
      this.cam.position.set(c.x + Math.sin(a) * half * 4, midY, c.z + Math.cos(a) * half * 4);
      this.cam.lookAt(c.x, midY, c.z);
      this.rt.viewport.set(i * this.cell, 0, this.cell, this.cell * 2);
      this.rt.scissor.copy(this.rt.viewport);
      r.setRenderTarget(this.rt);
      r.render(this.bakeScene, this.cam);
    }
    this.rt.scissorTest = false;
    r.setRenderTarget(null);
    r.setClearColor(clear, alpha);
    if (parent) parent.add(source); else this.bakeScene.remove(source);
    this.mesh.position.set(c.x, 0, c.z);
    this.bakes++;
    return this;
  }
}
