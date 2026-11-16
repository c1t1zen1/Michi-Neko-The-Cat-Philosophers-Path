// manager.js — the Roof Road (屋根道) in the game (BUILD_GUIDE_FABLE R6.3; spec
// docs/superpowers/specs/2026-10-24-rooftop-road-design.md §4, §5.1, §8.2;
// ruling D3: the Seven Posts unlock, one continuous run, Chidori stays on the
// Roof Road, the finale's sky follows the run).
//
// Shaped like SummitManager (src/mountaintop.js): setUnlocked, enter (the noren
// veil), exit, setActive, update. It ticks in both scenes:
//   - in the valley it listens to the Seven Posts on the bridge's east railing
//     (src/rooftops/posts.js), warms the giboshi, parts the Odoi thicket once the
//     seventh post has sung, and starts the veil when the cat walks into the gap;
//   - on the Roof Road it reads the game's controls and hands them to the pocket
//     (src/rooftops/pocket.js), which owns the run: the real runner physics, the
//     real cat, Chidori, the camera, the sky by progress and the finale.
//
// The pocket is a scene of its own, built the first time the cat goes through
// the noren (behind the veil) and kept afterwards; its origin is
// ROOFTOP_ORIGIN, 2.4 km below the valley (the summit sits at 1.2 km), so
// nothing that measures distance from the cat hears or reaches the valley.
// Nothing of the Roof Road loads on the way to the valley: main.js imports this
// file, which imports only pure modules; pocket.js and the Roof Road's own
// modules are imported on the first enter().
//
// No fail states and no timers (design guardrails): a fall lands on a roof or
// in the street (the runner's own rule), the sky follows distance, and the
// way home is always open — walk back off the start of the bridge, or follow
// the paper lantern after the finale.
//
// Saved (main.js): worldFlags.rooftopsUnlocked, rooftopShoki (a 7-bit mask:
// the run has seven Shōki as built) and rooftopFinished. A pocket position is
// never saved: a save made on the Roof Road reloads on the bridge's south ramp.

import { SevenPosts, PENTATONIC, POST_Z, inOdoiGate, ODOI_RETURN } from './posts.js?v=20261114a';

export const ROOFTOP_ORIGIN = Object.freeze({ x: 0, y: -2400, z: 0 });
/** The Shōki of the run as built (rooftops/js/level.js pickups): the save's bit mask width. */
export const SHOKI_COUNT = 7;
/** "The bamboo leans apart over about 3 s" (spec §4). */
const THICKET_SECONDS = 3;
/** The noren veil: sweep in, then the swap happens behind it, then sweep out. */
const VEIL_IN_MS = 950;
const VEIL_OUT_MS = 900;

const smoothstep = (t) => t * t * (3 - 2 * t);

export class RooftopManager {
  /**
   * @param game the Game (main.js): scene, camera, renderer, player, controls,
   *   ui, audio, city, progression, music, discover(), saveGame().
   * @param options.loadPocket () => Promise<class>, the pocket's constructor
   *   (default: a dynamic import of pocket.js); tools/rooftop_manager_test.mjs injects a stub.
   * @param options.timers { set(fn, ms) } (default setTimeout), for the test.
   */
  constructor(game, { loadPocket = null, timers = null } = {}) {
    this.game = game;
    this.origin = ROOFTOP_ORIGIN;
    this.active = false;
    this.transitioning = false;
    this.unlocked = false;
    this.shoki = 0;          // bit i set: the Shōki with id i + 1 has been greeted
    this.finished = false;   // the finale has been sat through once
    this.posts = new SevenPosts();
    this.glow = new Array(POST_Z.length).fill(0);
    this.glowTarget = new Array(POST_Z.length).fill(0);
    this._thicketOpen = 0;
    this.pocket = null;
    this._pocketPromise = null;
    this._loadPocket = loadPocket || (() => import('./pocket.js?v=20261114a').then((m) => m.RooftopPocket));
    this._timers = timers || { set: (fn, ms) => setTimeout(fn, ms) };
    this._input = { jumpWas: false, downWas: false, resetWas: false, touchJumpT: 0 };
    this.time = 0;
  }

  /** The pocket draws the frame (main.js loop) and owns the camera while it is up. */
  get rendering() { return this.active && !!this.pocket; }
  get cameraActive() { return this.active; }
  /** Where a save made on (or into) the Roof Road puts the cat: the bridge's south ramp. */
  get returnSpot() { return ODOI_RETURN; }
  get greeted() { let n = 0; for (let i = 0; i < SHOKI_COUNT; i++) if (this.shoki & (1 << i)) n++; return n; }

  /* ================= Unlock ================= */

  /**
   * The seventh post has sung (or a save says it did). Silent: restore from a
   * save, no toast, no journal, the thicket already open.
   */
  setUnlocked(on, silent = false) {
    on = !!on;
    if (on === this.unlocked && !silent) return;
    this.unlocked = on;
    const g = this.game;
    if (!on) return;
    this.posts.complete = true;
    for (let i = 0; i < this.glowTarget.length; i++) this.glowTarget[i] = 0.5;
    if (silent) {
      this._thicketOpen = 1;
      for (let i = 0; i < this.glow.length; i++) this.glow[i] = 0.5;
      this._applyGlow();
      if (g.city && g.city.setOdoiThicketOpen) g.city.setOdoiThicketOpen(1);
      return;
    }
    if (g.audio && g.audio.playBell) g.audio.playBell();
    if (g.music && g.music.swell) g.music.swell(6);
    if (g.ui) g.ui.showToast('✦ The bamboo on the old earthen wall parts — lanterns beyond ✦', 5200);
    if (g.progression) g.progression.addXP(60, 'The Seven Posts — the way into the old city');
    if (g.discover) g.discover('places', { id: 'odoi-gate', text: 'Seven posts sang on the bridge, and the bamboo on the old earthen wall parted' });
    if (g.saveGame) g.saveGame();
  }

  /** One post's note: a small pitched bell on the game's sfx bus (silent until audio runs). */
  playPostNote(i) {
    const a = this.game.audio;
    if (!a || !a.initialized || !a.ctx || !a.buses) return;
    const c = a.ctx, t = c.currentTime, f = PENTATONIC[i % PENTATONIC.length];
    for (const [mul, gain, dur] of [[1, 0.06, 1.6], [2.76, 0.016, 0.9], [5.4, 0.005, 0.5]]) {
      const o = c.createOscillator(), v = c.createGain();
      o.type = 'sine';
      o.frequency.value = f * mul;
      v.gain.setValueAtTime(0, t);
      v.gain.linearRampToValueAtTime(gain, t + 0.008);
      v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(v).connect(a.buses.sfx);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  _applyGlow() {
    const city = this.game.city;
    if (!city || !city.setSevenPostGlow) return;
    for (let i = 0; i < this.glow.length; i++) city.setSevenPostGlow(i, this.glow[i]);
  }

  /* ================= Transitions ================= */

  _veil() { return typeof document !== 'undefined' ? document.getElementById('rooftop-transition') : null; }

  _lock(on) {
    const g = this.game;
    if (g.controls) g.controls.enabled = !on;
    if (g.player) {
      g.player.actionLocked = on;
      if (g.player.moveInput) g.player.moveInput.set(0, 0);
    }
  }

  /** Drop the noren: off .hidden first, a style flush, then .show, so the panels slide. */
  _showVeil(veil) {
    veil.classList.remove('hidden', 'out');
    void veil.offsetWidth;
    veil.classList.add('show');
  }

  /** Build the pocket once (the first enter); later enters reuse it. */
  ensurePocket() {
    if (this.pocket) return Promise.resolve(this.pocket);
    if (!this._pocketPromise) {
      this._pocketPromise = (async () => {
        const Pocket = await this._loadPocket();
        const pocket = new Pocket(this.game, { origin: this.origin, manager: this });
        await pocket.init();
        this.pocket = pocket;
        return pocket;
      })().catch((e) => { this._pocketPromise = null; throw e; });
    }
    return this._pocketPromise;
  }

  /** The cat walked into the open gap: the noren sweeps across, the run begins behind it. */
  enter() {
    if (this.transitioning || this.active || !this.unlocked) return;
    this.transitioning = true;
    const g = this.game;
    this._lock(true);
    if (g.dialogue && g.dialogue.active) g.dialogue.close();
    if (g.audio && g.audio.playDreamChime) g.audio.playDreamChime();
    const veil = this._veil();
    if (veil) this._showVeil(veil);
    const building = this.ensurePocket();
    this._timers.set(async () => {
      let ok = true;
      try { await building; } catch (e) {
        ok = false;
        console.error('[rooftops] the Roof Road could not be built', e);
      }
      if (ok) {
        this.setActive(true);
        this.pocket.start({ shoki: this.shoki });
      }
      if (veil) veil.classList.add('out');
      this._timers.set(() => {
        if (veil) {
          veil.classList.remove('show', 'out');
          veil.classList.add('hidden');
        }
        this.transitioning = false;
        this._lock(false);
        if (g.ui) g.ui.showToast(ok ? 'Through the noren — the roofs of rakuchū, the old city.'
          : 'The lanes beyond the noren are not ready yet. The bridge waits.', 4200);
        if (g.saveGame) g.saveGame();
      }, VEIL_OUT_MS);
    }, VEIL_IN_MS);
  }

  /** Back through the noren to the bridge's south ramp (the lantern after the finale, or the bridge's end). */
  exit() {
    if (this.transitioning || !this.active) return;
    this.transitioning = true;
    const g = this.game;
    this._lock(true);
    if (g.audio && g.audio.playDreamChime) g.audio.playDreamChime();
    const veil = this._veil();
    if (veil) this._showVeil(veil);
    this._timers.set(() => {
      this.setActive(false);
      this.placeOnBridge();
      if (veil) veil.classList.add('out');
      this._timers.set(() => {
        if (veil) {
          veil.classList.remove('show', 'out');
          veil.classList.add('hidden');
        }
        this.transitioning = false;
        this._lock(false);
        if (g.ui) g.ui.showToast('You pad back through the noren. The river sounds just as it did.', 3600);
        if (g.saveGame) g.saveGame();
      }, VEIL_OUT_MS);
    }, VEIL_IN_MS);
  }

  /** No veil: leave at once (quit to title, a context loss). */
  exitImmediate() {
    if (!this.active) return;
    this.setActive(false);
    this.placeOnBridge();
    this.transitioning = false;
    this._lock(false);
  }

  /** The return spot: the bridge's south ramp, facing north over the river. */
  placeOnBridge() {
    const p = this.game.player;
    if (!p || !p.mesh) return;
    p.mesh.position.set(ODOI_RETURN.x, ODOI_RETURN.y, ODOI_RETURN.z);
    p.heading = ODOI_RETURN.heading; p.yaw = ODOI_RETURN.heading; p.yawPrev = ODOI_RETURN.heading;
    if (p.mesh.rotation) p.mesh.rotation.y = ODOI_RETURN.heading;
    if (p.velocity) p.velocity.set(0, 0, 0);
    const cam = this.game.camera;
    if (cam && cam.position) {
      cam.position.set(ODOI_RETURN.x, ODOI_RETURN.y + 1.9, ODOI_RETURN.z + 1.6);
      if (cam.lookAt) cam.lookAt(ODOI_RETURN.x, ODOI_RETURN.y + 0.6, ODOI_RETURN.z - 4);
    }
  }

  /** Swap the pocket in or out: the cat, the camera, the interface. */
  setActive(on) {
    on = !!on;
    if (this.active === on) return;
    const g = this.game;
    if (on && !this.pocket) return;
    this.active = on;
    if (on) {
      if (g.dialogue && g.dialogue.active) g.dialogue.close();
      if (g.contextActions && g.contextActions.hideAllPrompts) g.contextActions.hideAllPrompts();
      if (g.photoMode && g.togglePhotoMode) g.togglePhotoMode();
      this.pocket.attach();
    } else {
      this.pocket.detach();
      if (g.waypoints) g.waypoints.setTargets([]);
      if (g.refreshCompassPois) g.refreshCompassPois();
    }
    if (typeof document !== 'undefined' && document.body) document.body.classList.toggle('rooftop-mode', on);
  }

  /* ================= Pocket callbacks ================= */

  /** A Shōki on the roofs was greeted (id 1 … 7). Each is a keepsake. */
  onShoki(id, mouth) {
    const bit = 1 << ((id - 1) % SHOKI_COUNT);
    if (this.shoki & bit) return false;
    this.shoki |= bit;
    const g = this.game;
    const n = this.greeted;
    if (g.progression) g.progression.addXP(10, 'Greeted a Shōki on the roofs');
    if (g.discover) {
      g.discover('keepsakes', {
        id: `roof-shoki-${id}`,
        text: `A clay Shōki keeping watch over ${mouth ? mouth.romaji : 'the old city'} (${n} of ${SHOKI_COUNT})`
      });
    } else if (g.saveGame) g.saveGame();
    return true;
  }

  /** The perch: the five fires. The finale is a quiet moment. */
  onFinale() {
    const g = this.game;
    const first = !this.finished;
    this.finished = true;
    if (first && g.progression) g.progression.addXP(75, 'The Roof Road — the five fires');
    if (g.discover) {
      g.discover('quietMoments', {
        id: 'roof-road-okuribi',
        text: 'Sat on the float with Chidori while the five Okuribi fires kindled on the hills'
      });
    } else if (g.saveGame) g.saveGame();
  }

  /** The pocket asks to go home (the lantern followed, or the bridge's end walked off). */
  onLeave() { this.exit(); }

  /* ================= Input (the game's controls, read for the runner) ================= */

  /**
   * The runner's input from the game's Controls: A/D or ←/→ (or the stick) to
   * run, Shift (or the stick pushed far) to sprint, Space / W / ↑ or the jump
   * button to jump (held = higher), S / ↓ (or the stick pulled down) to drop,
   * R back to the last lantern.
   */
  readInput(dt) {
    const g = this.game, c = g.controls, p = g.player, st = this._input;
    const keys = (c && c.keys) || {};
    const mi = (p && p.moveInput) || { x: 0, y: 0 };
    const move = Math.max(-1, Math.min(1, -(mi.x || 0)));          // Controls: +x is left
    const keyJump = !!(keys.Space || keys.KeyW || keys.ArrowUp);
    const keyDown = !!(keys.KeyS || keys.ArrowDown) || (mi.y || 0) < -0.55;
    // Space and the touch button call player.jump(), which only buffers; the
    // runner consumes that buffer here. A touch press holds for a full jump.
    let pressed = keyJump && !st.jumpWas;
    if (p && p.jumpBufferTimer > 0) {
      if (!keyJump) st.touchJumpT = 0.34;
      pressed = true;
      p.jumpBufferTimer = 0;
    }
    st.touchJumpT = Math.max(0, st.touchJumpT - (dt || 0));
    const held = keyJump || st.touchJumpT > 0;
    const released = !held && (st.jumpWas || st.heldWas);
    const downPressed = keyDown && !st.downWas;
    const reset = !!keys.KeyR && !st.resetWas;
    st.jumpWas = keyJump; st.heldWas = held; st.downWas = keyDown; st.resetWas = !!keys.KeyR;
    return {
      move, sprint: !!(p && p.sprint),
      jumpHeld: held, jumpPressed: pressed, jumpReleased: released,
      downHeld: keyDown, downPressed, reset
    };
  }

  /* ================= Per-frame ================= */

  update(dt, playing) {
    this.time += dt;
    const g = this.game;
    if (this.active) {
      if (this.pocket) this.pocket.update(dt, playing && !this.transitioning ? this.readInput(dt) : null);
      return;
    }
    const pos = g.player && g.player.mesh ? g.player.mesh.position : null;

    // The Seven Posts: each passed post warms; stepping off lets them cool.
    if (!this.unlocked && pos && playing && !this.transitioning) {
      for (const ev of this.posts.update(pos)) {
        if (ev.type === 'post') {
          this.glowTarget[ev.index] = 1;
          this.playPostNote(ev.index);
        } else if (ev.type === 'reset') {
          this.glowTarget.fill(0);
        } else if (ev.type === 'complete') {
          this.setUnlocked(true);
        }
      }
    }
    let changed = false;
    for (let i = 0; i < this.glow.length; i++) {
      const target = this.glowTarget[i], cur = this.glow[i];
      if (cur === target) continue;
      const rate = target > cur ? 5 : 0.9;                     // warm quickly, cool slowly
      this.glow[i] = Math.abs(target - cur) < 0.004 ? target : cur + (target - cur) * Math.min(1, dt * rate);
      changed = true;
    }
    if (changed) this._applyGlow();

    if (!this.unlocked) return;
    // The thicket leans apart over ~3 s, one way.
    if (this._thicketOpen < 1) {
      this._thicketOpen = Math.min(1, this._thicketOpen + dt / THICKET_SECONDS);
      if (g.city && g.city.setOdoiThicketOpen) g.city.setOdoiThicketOpen(smoothstep(this._thicketOpen));
    }
    // Walking into the open gap.
    if (playing && !this.transitioning && this._thicketOpen >= 1 && pos && inOdoiGate(pos)) this.enter();
  }

  /** main.js loop(): draw the pocket instead of the valley's composer. */
  render() {
    if (this.pocket) this.pocket.render();
  }

  /** Quality tier changes (main.js applyQuality). */
  setQuality(q) {
    if (this.pocket && this.pocket.setQuality) this.pocket.setQuality(q);
  }
}
