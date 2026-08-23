import * as THREE from 'three';

export class ScentTrail {
  constructor(scene, maxPoints = 80) {
    this.scene = scene;
    this.maxPoints = maxPoints;
    this.life = new Float32Array(maxPoints);
    this.ages = new Float32Array(maxPoints);
    this.lastPos = new THREE.Vector3();
    this.emitTimer = 0;
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

    const dummy = new THREE.Object3D();
    dummy.position.set(0, -1000, 0);
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    for (let i = 0; i < this.maxPoints; i++) {
      this.mesh.setMatrixAt(i, dummy.matrix);
      this.mesh.setColorAt(i, new THREE.Color(0xffcc88));
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

    const offset = new THREE.Vector3((Math.random() - 0.5) * 0.15, 0.04 + Math.random() * 0.06, (Math.random() - 0.5) * 0.15);
    const p = position.clone().add(offset);

    const dummy = new THREE.Object3D();
    dummy.position.copy(p);
    dummy.rotation.x = Math.random() * Math.PI;
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    this.mesh.setMatrixAt(slot, dummy.matrix);
    this.mesh.setColorAt(slot, new THREE.Color(0xffd080));
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt, playerPos, speed) {
    this.emit(playerPos, speed, dt);

    const dummy = new THREE.Object3D();
    let changed = false;
    for (let i = 0; i < this.maxPoints; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt * 0.55;
      this.ages[i] += dt;

      const m = new THREE.Matrix4();
      this.mesh.getMatrixAt(i, m);
      const pos = new THREE.Vector3();
      const rot = new THREE.Quaternion();
      const scl = new THREE.Vector3();
      m.decompose(pos, rot, scl);

      pos.y += dt * 0.04;
      const s = Math.max(0, this.life[i]);
      dummy.position.copy(pos);
      dummy.quaternion.copy(rot);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();

      const t = Math.min(1, this.ages[i]);
      const col = new THREE.Color(0xffd080).lerp(new THREE.Color(0xff7040), t);
      this.mesh.setColorAt(i, col);
      this.mesh.setMatrixAt(i, dummy.matrix);
      changed = true;

      if (this.life[i] <= 0) {
        dummy.position.set(0, -1000, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        this.mesh.setMatrixAt(i, dummy.matrix);
      }
    }
    if (changed) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.mesh.instanceColor.needsUpdate = true;
    }
  }
}
