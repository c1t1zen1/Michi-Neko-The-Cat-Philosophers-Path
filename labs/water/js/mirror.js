// A planar mirror for the water shaders: three's Reflector, unbundled. A
// virtual camera is reflected through the water plane, its near plane is
// bent onto the water (Lengyel's oblique clip) so nothing under the surface
// leaks in, and the result lands in a half-float target the water samples
// with a little normal distortion. Works for perspective and orthographic
// cameras, so the isometric cubes can use it too.
import * as THREE from 'three';

const _n = new THREE.Vector3(0, 1, 0), _rp = new THREE.Vector3(), _cp = new THREE.Vector3();
const _rot = new THREE.Matrix4(), _look = new THREE.Vector3(), _view = new THREE.Vector3(), _target = new THREE.Vector3();
const _plane = new THREE.Plane(), _clip = new THREE.Vector4(), _q = new THREE.Vector4();
const _inv = new THREE.Matrix4(), _clear = new THREE.Color();

export class PlanarMirror {
  constructor({ y = 0, scale = 0.5, maxSize = 1024, clipBias = 0.003 } = {}) {
    this.y = y;
    this.scale = scale;
    this.maxSize = maxSize;
    this.clipBias = clipBias;
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 0 });
    this.persp = new THREE.PerspectiveCamera();
    this.ortho = new THREE.OrthographicCamera();
    this.matrix = new THREE.Matrix4();
    this.hide = [];
    this.clearColor = null;   // cubes have no sky dome: clear to the horizon instead
    this.enabled = true;
    this.rendered = false;
  }
  get texture() { return this.rt.texture; }

  setSize(w, h) {
    const k = Math.min(1, this.maxSize / Math.max(w, h));
    const W = Math.max(4, Math.round(w * this.scale * k)), H = Math.max(4, Math.round(h * this.scale * k));
    if (this.rt.width !== W || this.rt.height !== H) this.rt.setSize(W, H);
  }

  /** Render the reflection for `camera`. `hide` = objects to skip (the water itself). */
  update(renderer, scene, camera, rectW, rectH) {
    this.rendered = false;
    if (!this.enabled) return;
    this.setSize(rectW * renderer.getPixelRatio(), rectH * renderer.getPixelRatio());
    _rp.set(0, this.y, 0);
    camera.updateMatrixWorld();
    _cp.setFromMatrixPosition(camera.matrixWorld);
    _view.subVectors(_rp, _cp);
    if (_view.dot(_n) > 0 && camera.isPerspectiveCamera) return;   // under the water: no mirror
    // reflect the camera position (relative to a point on the plane)
    _view.subVectors(_cp, _rp);
    _view.y = -_view.y;
    _view.add(_rp);
    _rot.extractRotation(camera.matrixWorld);
    _look.set(0, 0, -1).applyMatrix4(_rot).add(_cp);
    _target.subVectors(_look, _rp);
    _target.y = -_target.y;
    _target.add(_rp);
    const vc = camera.isOrthographicCamera ? this.ortho : this.persp;
    vc.position.copy(_view);
    vc.up.set(0, 1, 0).applyMatrix4(_rot);
    vc.up.y = -vc.up.y;
    vc.lookAt(_target);
    vc.near = camera.near; vc.far = camera.far;
    vc.updateMatrixWorld();
    vc.projectionMatrix.copy(camera.projectionMatrix);
    vc.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    this.matrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.matrix.multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse);

    // oblique near plane = the water plane, in the virtual camera's view space
    _plane.setFromNormalAndCoplanarPoint(_n, _rp).applyMatrix4(vc.matrixWorldInverse);
    _clip.set(_plane.normal.x, _plane.normal.y, _plane.normal.z, _plane.constant);
    const P = vc.projectionMatrix, e = P.elements;
    _inv.copy(P).invert();
    _q.set(Math.sign(_clip.x), Math.sign(_clip.y), 1, 1).applyMatrix4(_inv);
    _clip.multiplyScalar(2 / _clip.dot(_q));
    e[2] = _clip.x - e[3];
    e[6] = _clip.y - e[7];
    e[10] = _clip.z - e[11] - this.clipBias;
    e[14] = _clip.w - e[15];

    const vis = this.hide.map((o) => o.visible);
    for (const o of this.hide) o.visible = false;
    const prevTarget = renderer.getRenderTarget();
    const prevXr = renderer.xr.enabled, prevShadow = renderer.shadowMap.autoUpdate;
    renderer.xr.enabled = false;
    renderer.shadowMap.autoUpdate = false;
    this.rt.viewport.set(0, 0, this.rt.width, this.rt.height);
    this.rt.scissor.set(0, 0, this.rt.width, this.rt.height);
    this.rt.scissorTest = false;
    renderer.setRenderTarget(this.rt);
    renderer.state.buffers.depth.setMask(true);
    if (this.clearColor) {
      renderer.getClearColor(_clear);
      const ca = renderer.getClearAlpha();
      renderer.setClearColor(this.clearColor, 1);
      renderer.clear();
      renderer.render(scene, vc);
      renderer.setClearColor(_clear, ca);
    } else {
      if (renderer.autoClear === false) renderer.clear();
      renderer.render(scene, vc);
    }
    renderer.xr.enabled = prevXr;
    renderer.shadowMap.autoUpdate = prevShadow;
    renderer.setRenderTarget(prevTarget);
    this.hide.forEach((o, i) => { o.visible = vis[i]; });
    this.rendered = true;
  }

  dispose() { this.rt.dispose(); }
}
