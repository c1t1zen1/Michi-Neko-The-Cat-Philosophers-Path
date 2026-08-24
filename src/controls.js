import * as THREE from 'three';

export class Controls {
  constructor(player, ui, audio = null, contextActions = null, dialogue = null) {
    this.player = player;
    this.ui = ui;
    this.audio = audio;
    this.contextActions = contextActions;
    this.dialogue = dialogue;

    this.keys = {};
    this.enabled = true;          // false while title/pause menus open
    this.sensitivity = 0.004;     // set from SettingsManager
    this.invertY = false;
    this.mouse = { down: false, lastX: 0, lastY: 0 };
    this.joystick = { active: false, origin: new THREE.Vector2(), current: new THREE.Vector2(), id: null };
    this.input = new THREE.Vector2();
    this.rawInput = new THREE.Vector2();

    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (this.isMobile) this.ui.setMode('mobile');
    else this.ui.setMode('desktop');

    this.setupKeyboard();
    this.setupMouse();
    this.setupTouch();
    this.setupTouchLook();
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (this.audio) { this.audio.resumeOnGesture(); this.audio.start(); }
      this.keys[e.code] = true;
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.dialogue && this.dialogue.active) {
          this.dialogue.advance();
        } else {
          this.player.jump();
        }
      }
      if (e.code === 'KeyE') {
        e.preventDefault();
        if (this.dialogue && this.dialogue.active) {
          this.dialogue.advance();
        } else if (this.contextActions) {
          this.contextActions.trigger();
        }
      }
      if (e.code === 'KeyM') {
        e.preventDefault();
        this.player.meow();
      }
      if (e.code === 'KeyC') {
        e.preventDefault();
        this.player.toggleProwl();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'Space') this.player.onJumpRelease();
    });
  }

  setupMouse() {
    const startAudio = () => { if (this.audio) { this.audio.resumeOnGesture(); this.audio.start(); } };
    window.addEventListener('mousedown', (e) => {
      startAudio();
      if (e.target.tagName === 'CANVAS') {
        this.mouse.down = true;
        this.mouse.lastX = e.clientX;
        this.mouse.lastY = e.clientY;
      }
    });
    window.addEventListener('mouseup', () => this.mouse.down = false);
    window.addEventListener('mousemove', (e) => {
      if (!this.mouse.down || !this.enabled) return;
      const dx = e.clientX - this.mouse.lastX;
      const dy = e.clientY - this.mouse.lastY;
      this.player.yaw -= dx * this.sensitivity;
      this.player.lastLookTime = performance.now() / 1000;
      // Vertical look: drag down -> camera rises & looks down (non-inverted)
      const dir = this.invertY ? -1 : 1;
      this.player.pitch = THREE.MathUtils.clamp(
        this.player.pitch + dy * this.sensitivity * dir,
        -0.42, 0.62
      );
      this.mouse.lastX = e.clientX;
      this.mouse.lastY = e.clientY;
    });
  }

  /** Swipe anywhere on the canvas (right side) to orbit the camera on touch devices. */
  setupTouchLook() {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    let lookId = null;
    let lastX = 0;
    let lastY = 0;
    canvas.addEventListener('touchstart', (e) => {
      if (!this.enabled) return;
      const t = e.changedTouches[0];
      lookId = t.identifier;
      lastX = t.clientX;
      lastY = t.clientY;
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
      if (!this.enabled || lookId === null) return;
      for (const t of e.changedTouches) {
        if (t.identifier !== lookId) continue;
        const dx = t.clientX - lastX;
        const dy = t.clientY - lastY;
        lastX = t.clientX;
        lastY = t.clientY;
        this.player.yaw -= dx * this.sensitivity * 1.7;
        this.player.lastLookTime = performance.now() / 1000;
        const dir = this.invertY ? -1 : 1;
        this.player.pitch = THREE.MathUtils.clamp(
          this.player.pitch + dy * this.sensitivity * 1.4 * dir,
          -0.42, 0.62
        );
      }
    }, { passive: true });
    const end = () => { lookId = null; };
    canvas.addEventListener('touchend', end);
    canvas.addEventListener('touchcancel', end);
  }

  setupTouch() {
    const joystickZone = document.getElementById('joystick-zone');
    const jumpBtn = document.getElementById('jump-btn');
    const actBtn = document.getElementById('act-btn');
    if (!joystickZone || !jumpBtn) return;

    this.knob = document.createElement('div');
    this.knob.className = 'joystick-knob';
    joystickZone.appendChild(this.knob);

    joystickZone.addEventListener('touchstart', (e) => {
      if (this.audio) { this.audio.resumeOnGesture(); this.audio.start(); }
      e.preventDefault();
      const t = e.changedTouches[0];
      this.joystick.active = true;
      this.joystick.id = t.identifier;
      this.joystick.origin.set(t.clientX, t.clientY);
      this.joystick.current.copy(this.joystick.origin);
      this.updateKnob(0, 0);
    }, { passive: false });

    joystickZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = this.findTouch(e.changedTouches, this.joystick.id);
      if (!t || !this.joystick.active) return;
      const maxRadius = Math.max(16, (joystickZone.clientWidth - this.knob.offsetWidth) / 2 - 4);
      const dx = t.clientX - this.joystick.origin.x;
      const dy = t.clientY - this.joystick.origin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist > maxRadius ? maxRadius / dist : 1;
      this.joystick.current.set(
        this.joystick.origin.x + dx * scale,
        this.joystick.origin.y + dy * scale
      );
      this.rawInput.set(dx * scale / maxRadius, -dy * scale / maxRadius);
      this.updateKnob(dx * scale, dy * scale);
    }, { passive: false });

    const endJoystick = (e) => {
      const t = this.findTouch(e.changedTouches, this.joystick.id);
      if (t) {
        this.joystick.active = false;
        this.joystick.id = null;
        this.rawInput.set(0, 0);
        this.input.set(0, 0);
        this.updateKnob(0, 0);
      }
    };
    joystickZone.addEventListener('touchend', endJoystick);
    joystickZone.addEventListener('touchcancel', endJoystick);

    jumpBtn.addEventListener('touchstart', (e) => { if (this.audio) { this.audio.resumeOnGesture(); this.audio.start(); } e.preventDefault(); this.player.jump(); }, { passive: false });
    jumpBtn.addEventListener('mousedown', (e) => { if (this.audio) { this.audio.resumeOnGesture(); this.audio.start(); } e.preventDefault(); this.player.jump(); });

    if (actBtn) {
      actBtn.addEventListener('touchstart', (e) => { if (this.audio) { this.audio.resumeOnGesture(); this.audio.start(); } e.preventDefault(); if (this.contextActions) this.contextActions.trigger(); }, { passive: false });
      actBtn.addEventListener('mousedown', (e) => { if (this.audio) { this.audio.resumeOnGesture(); this.audio.start(); } e.preventDefault(); if (this.contextActions) this.contextActions.trigger(); });
    }

    const meowBtn = document.getElementById('meow-btn');
    if (meowBtn) {
      meowBtn.addEventListener('touchstart', (e) => { if (this.audio) { this.audio.resumeOnGesture(); this.audio.start(); } e.preventDefault(); this.player.meow(); }, { passive: false });
      meowBtn.addEventListener('mousedown', (e) => { if (this.audio) { this.audio.resumeOnGesture(); this.audio.start(); } e.preventDefault(); this.player.meow(); });
    }
  }

  findTouch(touches, id) {
    for (let i = 0; i < touches.length; i++) {
      if (touches[i].identifier === id) return touches[i];
    }
    return null;
  }

  updateKnob(dx, dy) {
    if (!this.knob) return;
    this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  applyJoystickDeadzone() {
    const len = this.rawInput.length();
    const dead = 0.12;
    if (len < dead) {
      this.input.set(0, 0);
    } else {
      const t = Math.min(1, (len - dead) / (1 - dead));
      const smoothed = t * t * (3 - 2 * t);
      this.input.copy(this.rawInput).normalize().multiplyScalar(smoothed);
    }
  }

  update(dt) {
    if (!this.enabled) {
      this.input.set(0, 0);
      this.rawInput.set(0, 0);
      this.player.moveInput.set(0, 0);
      this.player.sprint = false;
      return;
    }
    if (this.joystick.active) {
      this.applyJoystickDeadzone();
    } else {
      this.input.set(0, 0);
      this.rawInput.set(0, 0);
      if (this.keys['KeyW'] || this.keys['ArrowUp']) this.input.y += 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) this.input.y -= 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.input.x += 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) this.input.x -= 1;
      this.rawInput.copy(this.input);
    }

    this.player.moveInput.copy(this.input);
    this.player.jumpHeld = !!this.keys['Space'];
    this.player.sprint = (this.keys['ShiftLeft'] || this.keys['ShiftRight']) ||
      (this.joystick.active && this.rawInput.length() > 0.95);
  }
}
