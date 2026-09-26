import * as THREE from 'three';
import { Cat } from './cat.js?v=20260926a';
import { ColliderGrid } from './collider_grid.js?v=20260926a';

const Y_UP = new THREE.Vector3(0, 1, 0);

// Collision scratch. The resolve loop, the camera ray and the camera
// push-out run every frame over every candidate box; allocating a Vector3
// or a cloned Box3 per candidate was a steady drip of garbage with nothing
// to show for it. These are written and read within a single call.
const _catCenter = new THREE.Vector3();
const _boxCenter = new THREE.Vector3();
const _expandBy = new THREE.Vector3(0.25, 0, 0.45);
const _expanded = new THREE.Box3();
const _rayHit = new THREE.Vector3();
const _pushDir = new THREE.Vector3();

export class Player {
  constructor(scene, camera, audio = null) {
    this.scene = scene;
    this.camera = camera;
    this.audio = audio;

    // Tan coat with light-brown mackerel tabby stripes (Ghibli reference palette)
    this.cat = new Cat({ fur: 0xc4915a, belly: 0xf3e7d0, accent: 0x6e4424, audio });
    this.mesh = new THREE.Group();
    this.mesh.name = 'Player Character (Michi)';
    this.mesh.add(this.cat.group);
    this.scene.add(this.mesh);

    this.currentSpeed = 0;
    this.heading = 0;

    this.velocity = new THREE.Vector3();
    // Broad phase over the world's static colliders, rebuilt only when the
    // backing array changes (interior and exterior each get their own).
    this.colliderGrid = new ColliderGrid(8);
    this.interiorGrid = new ColliderGrid(4);
    this.nearColliders = [];
    this.nearCamColliders = [];
    this.isGrounded = false;
    this.speed = 4.5;
    this.sprintMultiplier = 1.7;
    // Base movement kit is available immediately (C2.3): the player chooses
    // their own pace from the first step — walk, jog, sprint, jump, prowl.
    this.canSprint = true;
    this.canWalkFences = false;
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
    this.actionLocked = false;

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
    let groundY = inWater
      ? (world && world.wadeDepthAt ? world.wadeDepthAt(this.mesh.position.x, this.mesh.position.z) : -0.09)
      : 0;
    if (isInside) {
      groundY = interior.getGroundHeight(this.mesh.position.x, this.mesh.position.z);
    } else if (world && world.platforms) {
      const px = this.mesh.position.x;
      const pz = this.mesh.position.z;
      const py = this.mesh.position.y;
      const falling = this.velocity.y <= 0.01;
      for (const plat of world.platforms) {
        const top = this.getPlatformHeight(plat, px, pz);
        if (top == null) continue;
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

    // Rain paw-ripples (G2.2): wet paws leave small rings on puddled ground
    // while it rains — the weather becomes something to walk through.
    if (!inWater && this.isGrounded && world && world.spawnRipple) {
      const sky = window.game && window.game.sky;
      const raining = sky && (sky.targetWeather === 'rain'
        ? sky.weatherBlend
        : (sky.weather === 'rain' ? 1 : 0)) > 0.6;
      if (raining && this.moveInput.lengthSq() > 0) {
        this._rainRippleTimer = (this._rainRippleTimer || 0) - dt;
        if (this._rainRippleTimer <= 0) {
          world.spawnRipple(this.mesh.position.x, this.mesh.position.z, 0.5);
          this._rainRippleTimer = 0.3;
        }
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
          const height = this.getPlatformHeight(plat, x, z, 0.12);
          if (height != null && height > top && height <= this.mesh.position.y + 0.6) top = height;
        }
      }
      return top;
    };
    const prevX = this.mesh.position.x;
    const prevZ = this.mesh.position.z;
    if (!this.actionLocked && this.moveInput.lengthSq() > 0) {
      let currentSpeed = (this.sprint && this.canSprint) ? this.speed * this.sprintMultiplier : this.speed;
      currentSpeed *= speedBonus;
      if (inWater) currentSpeed *= 0.55;
      if (this.isProwling) currentSpeed *= 0.45;
      // Preserve virtual joystick distance so mobile players can choose a
      // slower pace instead of every deflection moving at maximum speed.
      const inputStrength = Math.min(1, this.moveInput.length());
      currentSpeed *= inputStrength;
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
        // Allow ordinary stairs and smooth ramps to descend naturally. Only
        // cancel a move when it would be a real ledge-sized drop.
        if (oldSup > 0.05 && newSup < oldSup - 0.55) {
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
    if (!this.actionLocked && this.jumpBufferTimer > 0 && (this.isGrounded || this.coyoteTimer > 0)) {
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
    const groundNormal = (!isInside && world)
      ? this.getPlatformNormal(world, this.mesh.position.x, this.mesh.position.z, groundY)
      : Y_UP;
    const localNormal = groundNormal.clone().applyAxisAngle(Y_UP, -this.heading);
    const targetPitch = Math.atan2(localNormal.z, Math.max(0.001, localNormal.y));
    const targetRoll = -Math.atan2(localNormal.x, Math.max(0.001, localNormal.y));
    this.cat.group.rotation.x += (targetPitch - this.cat.group.rotation.x) * Math.min(1, dt * 10);
    this.cat.group.rotation.z += (targetRoll - this.cat.group.rotation.z) * Math.min(1, dt * 10);
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

    // Active colliders (interior vs exterior), narrowed to the cat's
    // neighbourhood. The query rectangle spans both where the cat was and
    // where it now is, padded past the widest collider expansion used below
    // (0.45 m) so nothing that could still block the move is filtered out.
    const activeColliders = isInside ? interior.colliders : colliders;
    const grid = (isInside ? this.interiorGrid : this.colliderGrid).sync(activeColliders || []);
    const qPad = 1.6;
    const nearColliders = grid.query(
      Math.min(prevX, this.mesh.position.x) - qPad,
      Math.min(prevZ, this.mesh.position.z) - qPad,
      Math.max(prevX, this.mesh.position.x) + qPad,
      Math.max(prevZ, this.mesh.position.z) + qPad,
      this.nearColliders
    );

    // Building collisions
    const catLocalMin = new THREE.Vector3(-0.25, 0, -0.4);
    const catLocalMax = new THREE.Vector3(0.25, 0.7, 0.45);
    const makeCatBox = () => new THREE.Box3(
      catLocalMin.clone().add(this.mesh.position),
      catLocalMax.clone().add(this.mesh.position)
    );
    let catBox = makeCatBox();
    const previousCenter = new THREE.Vector3(prevX, this.mesh.position.y + 0.35, prevZ);
    let movementBlocked = false;

    // Resolve more than once because pushing out of one wall can place the cat
    // against a neighboring fence or corner. Rebuilding the cat box after each
    // correction prevents stale bounds from allowing a second barrier through.
    for (let pass = 0; pass < 3 && !movementBlocked; pass++) {
      let corrected = false;
      for (const c of nearColliders) {
        catBox = makeCatBox();
        const verticalOverlap = catBox.max.y > c.min.y && catBox.min.y < c.max.y;
        if (!verticalOverlap) continue;

        const currentCenter = catBox.getCenter(_catCenter);
        const expanded = _expanded.copy(c).expandByVector(_expandBy);
        const crossedCollider = !expanded.containsPoint(previousCenter) &&
          this.segmentIntersectsBoxXZ(previousCenter, currentCenter, expanded);

        if (crossedCollider && !catBox.intersectsBox(c)) {
          // Thin walls and fence runs can otherwise be crossed in one low-FPS
          // sprint frame. Return to the last known clear horizontal position.
          this.mesh.position.x = prevX;
          this.mesh.position.z = prevZ;
          movementBlocked = true;
          break;
        }

        if (!catBox.intersectsBox(c)) continue;
        const catCenter = catBox.getCenter(_catCenter);
        const cCenter = c.getCenter(_boxCenter);
        const dx = catCenter.x - cCenter.x;
        const dz = catCenter.z - cCenter.z;
        const overlapX = Math.min(catBox.max.x, c.max.x) - Math.max(catBox.min.x, c.min.x);
        const overlapZ = Math.min(catBox.max.z, c.max.z) - Math.max(catBox.min.z, c.min.z);

        if (overlapX < overlapZ) {
          this.mesh.position.x += dx >= 0 ? overlapX : -overlapX;
        } else {
          this.mesh.position.z += dz >= 0 ? overlapZ : -overlapZ;
        }
        corrected = true;
      }
      if (!corrected) break;
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
    // Paused during rest cinematics so the slow drift owns the camera.
    if (this.cameraPaused) return;
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

    // Soft camera collision against active colliders. The camera swings well
    // outside the cat's own query, so the boom gets its own rectangle: the
    // span from the eye to the desired camera position, padded for the
    // push-out pass below, which reuses this same candidate set.
    const eye = this.mesh.position.clone().add(new THREE.Vector3(0, 0.35, 0));
    const camPad = 1.0;
    const camColliders = grid.query(
      Math.min(eye.x, targetPos.x, this.camera.position.x) - camPad,
      Math.min(eye.z, targetPos.z, this.camera.position.z) - camPad,
      Math.max(eye.x, targetPos.x, this.camera.position.x) + camPad,
      Math.max(eye.z, targetPos.z, this.camera.position.z) + camPad,
      this.nearCamColliders
    );
    const toCam = new THREE.Vector3().subVectors(targetPos, eye);
    const dist = toCam.length();
    let obstructed = false;
    if (dist > 0.01) {
      const dir = toCam.clone().normalize();
      const ray = new THREE.Ray(eye, dir);
      let nearest = dist;
      for (const c of camColliders) {
        // Skip boxes that contain the eye (e.g. bush colliders around the cat)
        if (c.containsPoint(eye)) continue;
        if (ray.intersectBox(c, _rayHit)) {
          const d = _rayHit.distanceTo(eye);
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
    for (const c of camColliders) {
      if (c.containsPoint(this.camera.position)) {
        // Move camera to the nearest face of the box, biased upward
        const p = this.camera.position;
        let best = p.x - c.min.x;
        _pushDir.set(-1, 0, 0);
        const consider = (d, x, y, z) => {
          if (d < best) { best = d; _pushDir.set(x, y, z); }
        };
        consider(c.max.x - p.x, 1, 0, 0);
        consider(c.max.y - p.y, 0, 1, 0);
        consider(p.z - c.min.z, 0, 0, -1);
        consider(c.max.z - p.z, 0, 0, 1);
        p.addScaledVector(_pushDir, best + 0.12);
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

  platformEnabled(platform) {
    if (!platform) return false;
    if (platform.requiredAbility === 'fenceWalk' && !this.canWalkFences) return false;
    if (platform.requiredRank != null) {
      const rank = window.game && window.game.progression ? window.game.progression.rank : 0;
      if (rank < platform.requiredRank) return false;
    }
    return !platform.enabled || platform.enabled(this);
  }

  getPlatformHeight(platform, x, z, margin = 0) {
    if (!this.platformEnabled(platform)) return null;
    if (platform.getHeightAt) return platform.getHeightAt(x, z, margin, this);
    if (!platform.min || !platform.max) return null;
    if (x < platform.min.x - margin || x > platform.max.x + margin ||
        z < platform.min.z - margin || z > platform.max.z + margin) return null;
    return platform.max.y;
  }

  getPlatformNormal(world, x, z, groundY) {
    if (!world || !world.platforms || groundY <= 0.05) return Y_UP;
    let best = null;
    let bestDelta = 0.16;
    for (const platform of world.platforms) {
      const height = this.getPlatformHeight(platform, x, z, 0.04);
      if (height == null) continue;
      const delta = Math.abs(height - groundY);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = platform;
      }
    }
    if (best && best.getNormalAt) return best.getNormalAt(x, z).clone().normalize();
    return Y_UP;
  }

  /** Mild external balance disturbance that cannot knock the cat off a platform. */
  applyBalanceNudge(dx, dz, world) {
    if (!world || !world.platforms) return;
    const oldX = this.mesh.position.x;
    const oldZ = this.mesh.position.z;
    let oldTop = 0;
    for (const platform of world.platforms) {
      const top = this.getPlatformHeight(platform, oldX, oldZ, 0.04);
      if (top != null && top <= this.mesh.position.y + 0.6) oldTop = Math.max(oldTop, top);
    }
    const nextX = oldX + dx;
    const nextZ = oldZ + dz;
    let nextTop = 0;
    for (const platform of world.platforms) {
      const top = this.getPlatformHeight(platform, nextX, nextZ, 0.04);
      if (top != null && top <= this.mesh.position.y + 0.6) nextTop = Math.max(nextTop, top);
    }
    if (oldTop <= 0.05 || nextTop >= oldTop - 0.12) {
      this.mesh.position.x = nextX;
      this.mesh.position.z = nextZ;
    }
  }

  segmentIntersectsBoxXZ(start, end, box) {
    let tMin = 0;
    let tMax = 1;
    for (const axis of ['x', 'z']) {
      const delta = end[axis] - start[axis];
      if (Math.abs(delta) < 1e-8) {
        if (start[axis] < box.min[axis] || start[axis] > box.max[axis]) return false;
        continue;
      }
      const inv = 1 / delta;
      let t1 = (box.min[axis] - start[axis]) * inv;
      let t2 = (box.max[axis] - start[axis]) * inv;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return false;
    }
    return tMax >= 0 && tMin <= 1;
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
