import * as THREE from 'three';

// Hoisted colours: the trail tints from warm honey to dusk orange as a
// mote ages. Previously two THREE.Color were allocated per live mote per
// frame (see the 2026-09-11 review, §1.2.2).
const SCENT_YOUNG = new THREE.Color(0xffd080);
const SCENT_OLD = new THREE.Color(0xff7040);

// Reusable scratch objects for the per-frame instance updates.
const _dummy = new THREE.Object3D();
const _offset = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _rot = new THREE.Quaternion();
const _scl = new THREE.Vector3();
const _col = new THREE.Color();
const _emitColor = new THREE.Color(0xffd080);

export class ScentTrail {
  constructor(scene, maxPoints = 80) {
    this.scene = scene;
    this.maxPoints = maxPoints;
    this.life = new Float32Array(maxPoints);
    this.ages = new Float32Array(maxPoints);
    this.lastPos = new THREE.Vector3();
    this.emitTimer = 0;
    // U1.4: the trail is meaningful only near things worth finding. The
    // main loop sets this flag each frame from quest/POI proximity.
    this.gated = false;
    this.build();
  }

  build() {
    const geo = new THREE.PlaneGeometry(0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
      vertexColors: true
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, this.maxPoints);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    _dummy.position.set(0, -1000, 0);
    _dummy.scale.set(0, 0, 0);
    _dummy.rotation.set(0, 0, 0);
    _dummy.updateMatrix();
    for (let i = 0; i < this.maxPoints; i++) {
      this.mesh.setMatrixAt(i, _dummy.matrix);
      this.mesh.setColorAt(i, _emitColor);
      this.life[i] = 0;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
    this.scene.add(this.mesh);
  }

  emit(position, speed, dt) {
    if (speed < 0.2) return;
    this.emitTimer -= dt;
    if (this.emitTimer > 0) return;
    this.emitTimer = Math.max(0.06, 0.25 - speed * 0.03);

    const moved = position.distanceToSquared(this.lastPos);
    this.lastPos.copy(position);
    if (moved < 0.001) return;

    // find a dead slot
    let slot = -1;
    for (let i = 0; i < this.maxPoints; i++) {
      if (this.life[i] <= 0) { slot = i; break; }
    }
    if (slot === -1) {
      // recycle oldest
      let oldest = 0;
      for (let i = 1; i < this.maxPoints; i++) {
        if (this.life[i] < this.life[oldest]) oldest = i;
      }
      slot = oldest;
    }

    this.life[slot] = 1.2 + Math.random() * 0.4;
    this.ages[slot] = 0;

    _offset.set((Math.random() - 0.5) * 0.15, 0.04 + Math.random() * 0.06, (Math.random() - 0.5) * 0.15);
    _dummy.position.copy(position).add(_offset);
    _dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    this.mesh.setMatrixAt(slot, _dummy.matrix);
    this.mesh.setColorAt(slot, _emitColor);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt, playerPos, speed) {
    // Gate: away from anything meaningful the trail stays silent, so it
    // reads as a discovery aid rather than constant noise.
    if (!this.gated) {
      speed = 0;
    }
    this.emit(playerPos, speed, dt);

    let changed = false;
    for (let i = 0; i < this.maxPoints; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt * 0.55;
      this.ages[i] += dt;

      this.mesh.getMatrixAt(i, _matrix);
      _matrix.decompose(_pos, _rot, _scl);

      _pos.y += dt * 0.04;
      const s = Math.max(0, this.life[i]);
      _dummy.position.copy(_pos);
      _dummy.quaternion.copy(_rot);
      _dummy.scale.setScalar(s);
      _dummy.updateMatrix();

      const t = Math.min(1, this.ages[i]);
      _col.copy(SCENT_YOUNG).lerp(SCENT_OLD, t);
      this.mesh.setColorAt(i, _col);
      this.mesh.setMatrixAt(i, _dummy.matrix);
      changed = true;

      if (this.life[i] <= 0) {
        _dummy.position.set(0, -1000, 0);
        _dummy.scale.setScalar(0);
        _dummy.updateMatrix();
        this.mesh.setMatrixAt(i, _dummy.matrix);
      }
    }
    if (changed) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.mesh.instanceColor.needsUpdate = true;
    }
  }
}
