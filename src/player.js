import * as THREE from 'three';
import { Cat } from './cat.js?v=20260823a';

const Y_UP = new THREE.Vector3(0, 1, 0);

export class Player {
  constructor(scene, camera, audio = null) {
    this.scene = scene;
    this.camera = camera;
    this.audio = audio;

    // Tan coat with light-brown mackerel tabby stripes (Ghibli reference palette)
    this.cat = new Cat({ fur: 0xc99c63, belly: 0xf3e7d0, accent: 0x9a6b3a, audio });
    this.mesh = new THREE.Group();
    this.mesh.add(this.cat.group);
    this.scene.add(this.mesh);

    this.currentSpeed = 0;
    this.heading = 0;

    this.velocity = new THREE.Vector3();
    this.isGrounded = false;
    this.speed = 4.5;
    this.sprintMultiplier = 1.7;
    this.canSprint = false;
    this.sprint = false;
    this.jumpForce = 7.2;
    this.gravity = -20;
    this.yaw = 0;
    this.yawPrev = 0;
    this.moveInput = new THREE.Vector2();
    this.wasGrounded = false;
    this.isTurning = false;
    this.npc = null;
    this.nearObject = null;

    this.inWater = false;
    this.wasInWater = false;
    this.raycaster = new THREE.Raycaster();
    this.fovBase = 55;
    this.fovCurrent = 55;

    // Camera pitch (vertical look)
    this.pitch = 0;

    // Platformer feel: coyote time + jump buffering + variable jump height
    this.coyoteTime = 0.12;
    this.coyoteTimer = 0;
    this.jumpBufferTime = 0.15;
    this.jumpBufferTimer = 0;
    this.jumpHeld = false;

    this.cameraOffset = new THREE.Vector3(0, 2.4, -4.2);
    this.cameraLookOffset = new THREE.Vector3(0, 0.55, 0.6);
    // Auto-follow: while walking (and not manually orbiting) the camera
    // slowly swings back around behind the cat.
    this.lastLookTime = -10;
    this.minCamDist = 1.35;

    // Lift the cat a touch so paws rest ON floors instead of sinking into them
    this.cat.group.position.y = 0.035;

    // Water-splash droplet pool (erupts upward on water entry)
    this.splashPool = [];
    const splashGeo = new THREE.SphereGeometry(0.05, 6, 5);
    for (let i = 0; i < 28; i++) {
      const m = new THREE.Mesh(splashGeo, new THREE.MeshBasicMaterial({ color: 0xdff6f2, transparent: true, opacity: 0.9 }));
      m.visible = false;
      scene.add(m);
      this.splashPool.push({ mesh: m, vel: new THREE.Vector3(), life: 0 });
    }
  }

  update(dt, colliders, world = null, npc = null) {
    this.npc = npc || this.npc;

    const interior = window.game && window.game.interior ? window.game.interior : null;
    const isInside = interior && interior.isInside;

    const inWater = (!isInside && world && world.isInWater)
      ? world.isInWater(this.mesh.position.x, this.mesh.position.z, this.mesh.position.y)
      : false;
    this.inWater = inWater;

    // Water entry splash: burst of droplets upward, scaled by impact speed
    if (inWater && !this.wasInWater) {
      if (this.audio) this.audio.playSplash();
      const impact = THREE.MathUtils.clamp(Math.abs(this.velocity.y) / 6, 0.35, 1.4);
      this.spawnSplash(this.mesh.position.x, -0.02, this.mesh.position.z, impact);
    }
    this.wasInWater = inWater;
    this.updateSplash(dt);

    // Determine effective ground height (terrain, water, or elevated platforms)
    let groundY = inWater ? -0.09 : 0;
    if (isInside) {
      groundY = interior.getGroundHeight(this.mesh.position.x, this.mesh.position.z);
    } else if (world && world.platforms) {
      const px = this.mesh.position.x;
      const pz = this.mesh.position.z;
      const py = this.mesh.position.y;
      const falling = this.velocity.y <= 0.01;
      for (const plat of world.platforms) {
        if (px < plat.min.x || px > plat.max.x || pz < plat.min.z || pz > plat.max.z) continue;
        const top = plat.max.y;
        // Assisted climbing: generous magnet window while descending — the cat
        // snaps onto crates/ledges/roofs/railings instead of clipping past them
        const canLand = falling && py >= top - 0.85;
        // Step-up onto low ledges while grounded
        const canStep = this.isGrounded && py >= top - 0.55 && py <= top + 0.05;
        if ((canLand || canStep) && top > groundY) groundY = top;
      }
    }

    const isSprint = this.sprint && this.canSprint;
    const yawDelta = this.yaw - this.yawPrev;
    this.yawPrev = this.yaw;
    this.isTurning = Math.abs(yawDelta) > 0.015 && this.moveInput.lengthSq() < 0.3;
    this.cat.onSprint(isSprint);

    // Speed buff timer (e.g. from eating grilled fish)
    let speedBonus = 1.0;
    if (this.speedBuffTimer > 0) {
      this.speedBuffTimer -= dt;
      speedBonus = 1.35;
    }

    // Near-object detection for mood
    let nearObject = null;
    if (world && world.collectibles) {
      for (const item of world.collectibles) {
        if (item.position.distanceToSquared(this.mesh.position) < 6.25) { // 2.5m
          nearObject = 'yarn';
          break;
        }
      }
    }
    if (this.npc && this.npc.mesh.position.distanceToSquared(this.mesh.position) < 6.25) {
      nearObject = 'npc';
    }
    this.nearObject = nearObject;

    if (inWater && world.spawnRipple) {
      this.rippleTimer = (this.rippleTimer || 0) - dt;
      const moving = this.moveInput.lengthSq() > 0;
      if (this.rippleTimer <= 0 && (moving || !this.isGrounded)) {
        world.spawnRipple(this.mesh.position.x, this.mesh.position.z, this.isGrounded ? 1 : 1.6);
        this.rippleTimer = 0.22;
      }
    }

    // Horizontal movement
    // Ledge assist: track platform support so the cat can never accidentally
    // walk off a crate / ledge / roof / railing — only a deliberate jump
    // (jump buffered) or falling lets it leave the surface.
    const supAt = (x, z) => {
      let top = 0;
      if (!isInside && world && world.platforms) {
        for (const plat of world.platforms) {
          if (x >= plat.min.x - 0.12 && x <= plat.max.x + 0.12 &&
              z >= plat.min.z - 0.12 && z <= plat.max.z + 0.12 &&
              plat.max.y > top && plat.max.y <= this.mesh.position.y + 0.6) {
            top = plat.max.y;
          }
        }
      }
      return top;
    };
    const prevX = this.mesh.position.x;
    const prevZ = this.mesh.position.z;
    if (this.moveInput.lengthSq() > 0) {
      let currentSpeed = (this.sprint && this.canSprint) ? this.speed * this.sprintMultiplier : this.speed;
      currentSpeed *= speedBonus;
      if (inWater) currentSpeed *= 0.55;
      if (this.isProwling) currentSpeed *= 0.45;
      const input = this.moveInput.clone().normalize().multiplyScalar(currentSpeed * dt);
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(Y_UP, this.yaw);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(Y_UP, this.yaw);
      const worldMove = new THREE.Vector3()
        .addScaledVector(forward, input.y)
        .addScaledVector(right, input.x);
      this.mesh.position.x += worldMove.x;
      this.mesh.position.z += worldMove.z;

      const targetHeading = Math.atan2(worldMove.x, worldMove.z);
      let diff = targetHeading - this.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.heading += diff * Math.min(1, dt * 10);
      this.mesh.rotation.y = this.heading;

      this.currentSpeed = currentSpeed;
      if (this.isGrounded && this.audio) this.audio.playFootstep(inWater ? 'water' : 'grass');

      // Ledge guard: if grounded on an elevated surface and the step just
      // taken left its support, undo the horizontal move — no accidental
      // falls off crates, ledges, roofs or bridge railings. A deliberate
      // jump (buffered) bypasses the guard.
      if (this.wasGrounded && this.jumpBufferTimer <= 0 && !inWater) {
        const oldSup = supAt(prevX, prevZ);
        const newSup = supAt(this.mesh.position.x, this.mesh.position.z);
        if (oldSup > 0.05 && newSup < oldSup - 0.05) {
          this.mesh.position.x = prevX;
          this.mesh.position.z = prevZ;
        }
      }
    } else {
      this.currentSpeed = 0;
    }

    // Coyote time & jump buffer
    this.coyoteTimer = this.isGrounded ? this.coyoteTime : Math.max(0, this.coyoteTimer - dt);
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    if (this.jumpBufferTimer > 0 && (this.isGrounded || this.coyoteTimer > 0)) {
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.velocity.y = this.jumpForce;
      this.mesh.position.y += 0.05;
      this.isGrounded = false;
      this.wasGrounded = false;
      this.cat.onJump();
      if (this.audio) this.audio.playMeow();
    }

    // Gravity & ground (snappier fall, floatier rise for game feel)
    let g = this.gravity;
    if (this.velocity.y < 0) g *= 1.4;                       // fast fall
    else if (!this.jumpHeld && this.velocity.y > 0) g *= 1.7; // short hop on early release
    if (inWater && this.velocity.y < 0) g *= 0.25;            // buoyancy in water
    this.velocity.y += g * dt;
    this.mesh.position.y += this.velocity.y * dt;

    if (this.mesh.position.y <= groundY && this.velocity.y <= 0) {
      this.mesh.position.y = groundY;
      this.velocity.y = 0;
      if (!this.wasGrounded) this.cat.onLand();
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }
    this.wasGrounded = this.isGrounded;

    this.cat.update(dt, this.currentSpeed, this.isGrounded, isSprint, this.isTurning, inWater, this.nearObject);
    this.cat.updateShadow(Math.max(0, this.mesh.position.y - groundY));

    // Map boundary (exterior only)
    if (!isInside) {
      const boundary = world && world.boundaryRadius ? world.boundaryRadius : 0;
      if (boundary) {
        const rr = Math.hypot(this.mesh.position.x, this.mesh.position.z);
        if (rr > boundary) {
          const k = boundary / rr;
          this.mesh.position.x *= k;
          this.mesh.position.z *= k;
        }
      }
    }

    // Active colliders (interior vs exterior)
    const activeColliders = isInside ? interior.colliders : colliders;

    // Building collisions
    const catBox = new THREE.Box3(
      new THREE.Vector3(-0.25, 0, -0.4),
      new THREE.Vector3(0.25, 0.7, 0.45)
    ).translate(this.mesh.position);

    for (const c of activeColliders || []) {
      if (catBox.intersectsBox(c)) {
        const catCenter = catBox.getCenter(new THREE.Vector3());
        const cCenter = c.getCenter(new THREE.Vector3());
        const dx = catCenter.x - cCenter.x;
        const dz = catCenter.z - cCenter.z;
        const overlapX = Math.min(catBox.max.x, c.max.x) - Math.max(catBox.min.x, c.min.x);
        const overlapZ = Math.min(catBox.max.z, c.max.z) - Math.max(catBox.min.z, c.min.z);

        if (overlapX < overlapZ) {
          this.mesh.position.x += dx > 0 ? overlapX : -overlapX;
        } else {
          this.mesh.position.z += dz > 0 ? overlapZ : -overlapZ;
        }
      }
    }

    // Auto-follow: when walking and the player hasn't touched the camera
    // recently, ease yaw around so the camera settles behind the cat.
    const nowSec = performance.now() / 1000;
    const movingNow = this.moveInput.lengthSq() > 0.01;
    if (movingNow && nowSec - this.lastLookTime > 1.2) {
      let yawDiff = this.heading - this.yaw;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      // Slow, smooth swing (stronger the further off-axis it is)
      this.yaw += yawDiff * Math.min(1, dt * 1.6);
    }

    // Camera follow + feel (yaw orbit + pitch tilt)
    const baseCamOffset = isInside ? new THREE.Vector3(0, 1.6, -2.6) : this.cameraOffset;
    const offset = baseCamOffset.clone().applyAxisAngle(Y_UP, this.yaw);
    if (this.pitch) {
      const camRight = new THREE.Vector3(1, 0, 0).applyAxisAngle(Y_UP, this.yaw);
      offset.applyAxisAngle(camRight, this.pitch);
    }
    const targetPos = this.mesh.position.clone().add(offset);

    // Jump anticipation / landing squash
    if (this.cat.jumpTime > 0) targetPos.y += 0.05 * (this.cat.jumpTime / 0.25);
    if (this.cat.landTime > 0) targetPos.y -= 0.08 * (this.cat.landTime / 0.3);

    // Soft camera collision against active colliders
    const eye = this.mesh.position.clone().add(new THREE.Vector3(0, 0.35, 0));
    const toCam = new THREE.Vector3().subVectors(targetPos, eye);
    const dist = toCam.length();
    let obstructed = false;
    if (dist > 0.01) {
      const dir = toCam.clone().normalize();
      const ray = new THREE.Ray(eye, dir);
      let nearest = dist;
      for (const c of activeColliders || []) {
        // Skip boxes that contain the eye (e.g. bush colliders around the cat)
        if (c.containsPoint(eye)) continue;
        const hit = new THREE.Vector3();
        if (ray.intersectBox(c, hit)) {
          const d = hit.distanceTo(eye);
          if (d > 0.05 && d < nearest) nearest = d;
        }
      }
      if (nearest < dist) {
        obstructed = true;
        // Keep a clear minimum distance so the camera never enters the cat
        const pulled = Math.max(this.minCamDist, nearest - (isInside ? 0.15 : 0.3));
        ray.at(pulled, targetPos);
      }
    }

    // Never let the camera dip below the terrain/cat feet level
    const camFloor = this.mesh.position.y + 0.32;
    if (targetPos.y < camFloor) targetPos.y = camFloor;

    // Faster snap when obstructed so the camera never lingers inside geometry
    this.camera.position.lerp(targetPos, Math.min(1, dt * (obstructed ? 12 : 6)));

    // Hard guarantee: keep the camera outside the cat's personal bubble
    const camToCat = new THREE.Vector3().subVectors(this.camera.position, eye);
    const camDist = camToCat.length();
    if (camDist < this.minCamDist && camDist > 0.001) {
      camToCat.multiplyScalar(this.minCamDist / camDist);
      this.camera.position.copy(eye).add(camToCat);
    }
    // Push the camera out of any collider box it ended up inside
    for (const c of activeColliders || []) {
      if (c.containsPoint(this.camera.position)) {
        // Move camera to the nearest face of the box, biased upward
        const p = this.camera.position;
        const pushes = [
          { d: p.x - c.min.x, v: new THREE.Vector3(-1, 0, 0) },
          { d: c.max.x - p.x, v: new THREE.Vector3(1, 0, 0) },
          { d: c.max.y - p.y, v: new THREE.Vector3(0, 1, 0) },
          { d: p.z - c.min.z, v: new THREE.Vector3(0, 0, -1) },
          { d: c.max.z - p.z, v: new THREE.Vector3(0, 0, 1) }
        ];
        pushes.sort((a, b) => a.d - b.d);
        p.addScaledVector(pushes[0].v, pushes[0].d + 0.12);
      }
    }

    this.camera.lookAt(this.mesh.position.clone().add(this.cameraLookOffset));

    // FOV dynamics
    let fov = this.fovBase;
    if (isSprint) fov += 5;
    if (this.cat.jumpTime > 0) fov += 2;
    if (this.cat.landTime > 0) fov -= 2;
    this.fovCurrent += (fov - this.fovCurrent) * Math.min(1, dt * 8);
    this.camera.fov = this.fovCurrent;
    this.camera.updateProjectionMatrix();
  }

  /** Splash droplets erupt upward/outward from the water surface. */
  spawnSplash(x, y, z, strength = 1) {
    const n = Math.min(this.splashPool.length, Math.round(10 + strength * 12));
    for (let i = 0; i < n; i++) {
      const d = this.splashPool[i];
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.18;
      d.mesh.position.set(x + Math.cos(a) * r, y + 0.05, z + Math.sin(a) * r);
      d.vel.set(
        Math.cos(a) * (0.4 + Math.random() * 0.8) * strength,
        (1.8 + Math.random() * 2.2) * strength,
        Math.sin(a) * (0.4 + Math.random() * 0.8) * strength
      );
      d.life = 0.55 + Math.random() * 0.25;
      d.mesh.scale.setScalar(0.5 + Math.random() * 0.7 * strength);
      d.mesh.material.opacity = 0.9;
      d.mesh.visible = true;
    }
  }

  updateSplash(dt) {
    for (const d of this.splashPool) {
      if (d.life <= 0) continue;
      d.life -= dt;
      d.vel.y -= 14 * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      d.mesh.material.opacity = Math.max(0, d.life * 1.6);
      if (d.life <= 0) d.mesh.visible = false;
    }
  }

  jump() {
    // Buffered: actual impulse happens in update() when grounded/coyote allows
    this.jumpBufferTimer = this.jumpBufferTime;
  }

  /** Called on Space release for variable jump height. */
  onJumpRelease() {
    if (this.velocity.y > 3.2) this.velocity.y = 3.2;
  }

  meow() {
    this.cat.triggerMeow();
  }

  toggleProwl() {
    this.isProwling = !this.isProwling;
    this.cat.setProwling(this.isProwling);
  }
}
