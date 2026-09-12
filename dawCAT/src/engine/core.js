/* dawCAT — audio engine core: context, master bus, per-track chains, meters */
import { createDeviceNode, makeImpulse } from './fx.js';
import { playSynthNote, playGameSfx, playAmbient } from './synth.js';
import { playDrum } from './drums.js';
import { getCachedBuffer } from './assets.js';

export function buildMasterPack(ctx) {
  const master = ctx.createGain();
  master.gain.value = 0.85;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 14;
  limiter.attack.value = 0.002; limiter.release.value = 0.12;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  master.connect(limiter); limiter.connect(analyser); analyser.connect(ctx.destination);

  // Reverb send bus (shared convolution reverb)
  const reverbBus = ctx.createGain();
  const reverbNode = ctx.createConvolver();
  reverbNode.buffer = makeImpulse(ctx, 2.4, 2.6);
  const reverbReturn = ctx.createGain(); reverbReturn.gain.value = 0.9;
  reverbBus.connect(reverbNode); reverbNode.connect(reverbReturn); reverbReturn.connect(master);

  // Delay send bus (game-style echo with feedback)
  const delayBus = ctx.createGain();
  const delayNode = ctx.createDelay(2.0); delayNode.delayTime.value = 0.32;
  const delayFb = ctx.createGain(); delayFb.gain.value = 0.34;
  const delayReturn = ctx.createGain(); delayReturn.gain.value = 0.8;
  delayBus.connect(delayNode); delayNode.connect(delayFb); delayFb.connect(delayNode);
  delayNode.connect(delayReturn); delayReturn.connect(master);

  // Preview / metronome bus (bypasses master for click)
  const clickBus = ctx.createGain(); clickBus.gain.value = 0.5; clickBus.connect(ctx.destination);

  return { ctx, master, analyser, reverbBus, delayBus, reverbNode, delayNode, clickBus, bpm: 110 };
}

function chainSignature(track) {
  // Frozen tracks play back a pre-rendered buffer instead of running their
  // insert devices live (see the frozen branch in buildTrackChain below), so
  // their identity depends on which bounce is active, not on live device
  // params — keeps this the single source of truth rebuildAll() compares
  // against to decide whether to rebuild a track's node graph.
  if (track.frozenActive) return 'frozen:' + track.frozenAssetId;
  return JSON.stringify((track.devices || []).map((d) => [d.type, d.on, d.params]));
}

/* Builds just the insert-device portion of a track's signal path (no
   gain/pan/sends/master) — shared by the live per-track chain below and by
   render.js's renderTrackToBuffer(), which bakes only this part into a
   freeze so mute/solo/volume/pan/sends stay live and editable afterward. */
export function buildDeviceChain(pack, track) {
  const { ctx } = pack;
  const input = ctx.createGain();
  let node = input;
  const devices = [];
  const deviceParams = {};
  for (const def of track.devices || []) {
    if (!def.on) continue;
    const dev = createDeviceNode(pack, def);
    node.connect(dev.input);
    node = dev.output;
    devices.push(dev);
    if (dev.params) deviceParams[def.id] = dev.params;
  }
  return { input, output: node, devices, deviceParams };
}

export function buildTrackChain(pack, track, project) {
  const { ctx } = pack;
  // Frozen: skip the device chain entirely (already baked into
  // frozenAssetId's rendered buffer at freeze time) — real CPU savings come
  // from not running that DSP every tick for content that no longer changes.
  const { input, output, devices, deviceParams } = track.frozenActive
    ? { input: ctx.createGain(), output: null, devices: [], deviceParams: {} }
    : buildDeviceChain(pack, track);
  const node = output || input;

  const gain = ctx.createGain();
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  node.connect(gain); gain.connect(pan); pan.connect(analyser); analyser.connect(pack.master);

  const sendA = ctx.createGain(); const sendB = ctx.createGain();
  pan.connect(sendA); sendA.connect(pack.reverbBus);
  pan.connect(sendB); sendB.connect(pack.delayBus);

  const chain = { input, gain, pan, analyser, sendA, sendB, devices, deviceParams, sig: chainSignature(track) };
  syncTrackChain(pack, chain, track, project);
  return chain;
}

export function syncTrackChain(pack, chain, track, project) {
  const soloed = project.tracks.some((t) => t.solo);
  const audible = !track.mute && (!soloed || track.solo);
  const t = pack.ctx.currentTime;
  chain.gain.gain.setTargetAtTime(audible ? track.volume : 0, t, 0.02);
  if (chain.pan.pan) chain.pan.pan.setTargetAtTime(track.pan || 0, t, 0.02);
  chain.sendA.gain.setTargetAtTime(track.sends?.a || 0, t, 0.02);
  chain.sendB.gain.setTargetAtTime(track.sends?.b || 0, t, 0.02);
  chain.sig = chainSignature(track);
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.pack = null;
    this.chains = new Map();
    this._live = new Set();
    this._meterBuf = null;
    this.cpu = 0;
    this.voiceCount = 0;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.pack = buildMasterPack(this.ctx);
      this._meterBuf = new Float32Array(256);
    }
    return this.pack;
  }

  resume() {
    this.ensure();
    if (this.ctx.state === 'running') return Promise.resolve(true);
    return this.ctx.resume().then(() => this.ctx.state === 'running').catch(() => false);
  }

  get isRunning() { return !!this.ctx && this.ctx.state === 'running'; }

  get live() { return this._live; }

  register(node) {
    this._live.add(node);
    this.voiceCount = this._live.size;
    node.onended = () => { this._live.delete(node); this.voiceCount = this._live.size; };
  }

  stopAll() {
    for (const n of [...this._live]) { try { n.stop(); } catch (e) { /* already stopped */ } }
    this._live.clear();
    this.voiceCount = 0;
  }

  rebuildAll(project) {
    this.ensure();
    const keep = new Set();
    for (const t of project.tracks) {
      keep.add(t.id);
      let chain = this.chains.get(t.id);
      const sig = chainSignature(t);
      if (!chain || chain.sig !== sig) {
        if (chain) this.disposeChain(chain);
        chain = buildTrackChain(this.pack, t, project);
        this.chains.set(t.id, chain);
      } else {
        syncTrackChain(this.pack, chain, t, project);
      }
    }
    for (const [id, chain] of [...this.chains]) {
      if (!keep.has(id)) { this.disposeChain(chain); this.chains.delete(id); }
    }
    this.pack.master.gain.setTargetAtTime(project.master.volume, this.ctx.currentTime, 0.02);
  }

  disposeChain(chain) {
    try { chain.input.disconnect(); chain.gain.disconnect(); chain.pan.disconnect(); } catch (e) { /* noop */ }
    for (const d of chain.devices) { try { d.dispose(); } catch (e) { /* noop */ } }
  }

  trackInput(trackId) { return this.chains.get(trackId)?.input || null; }

  /* ---------- playback primitives ---------- */

  synthNote(trackId, preset, midi, when, dur, vel) {
    const dest = this.trackInput(trackId);
    if (!dest) return;
    playSynthNote(this.pack, dest, preset, midi, when, dur, vel, (n) => this.register(n));
  }

  drum(trackId, lane, when, vel, kit) {
    const dest = this.trackInput(trackId);
    if (!dest) return;
    playDrum(this.pack, dest, lane, when, vel, kit, (n) => this.register(n));
  }

  sfx(name, when, level = 1) {
    this.ensure();
    playGameSfx(this.pack, this.pack.master, name, when || this.ctx.currentTime, level, (n) => this.register(n));
  }

  ambient(name, when, dur, level = 1) {
    this.ensure();
    playAmbient(this.pack, this.pack.master, name, when || this.ctx.currentTime, dur, level, (n) => this.register(n));
  }

  /* Plays a dragged-in audio-file clip. The buffer must already be decoded
     and cached (assets.js decodeAndCache/loadDecodedAsset) — decoding is
     async and this runs on the lookahead scheduler tick, so a cache miss
     just silently skips the event rather than blocking playback. */
  playAudioClip(trackId, assetId, when, dur, gain = 1, trimStart = 0) {
    const dest = this.trackInput(trackId);
    const buffer = getCachedBuffer(assetId);
    if (!dest || !buffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g); g.connect(dest);
    src.start(when, Math.max(0, trimStart), Math.max(0.01, dur));
    this.register(src);
  }

  preview(preset, midi) {
    this.ensure();
    const g = this.ctx.createGain(); g.gain.value = 0.9; g.connect(this.pack.master);
    playSynthNote(this.pack, g, preset, midi, this.ctx.currentTime + 0.01, 0.4, 0.9, (n) => this.register(n));
    setTimeout(() => { try { g.disconnect(); } catch (e) { /* noop */ } }, 4000);
  }

  previewDrum(lane, kit) {
    this.ensure();
    const g = this.ctx.createGain(); g.gain.value = 0.9; g.connect(this.pack.master);
    playDrum(this.pack, g, lane, this.ctx.currentTime, 0.9, kit, (n) => this.register(n));
    setTimeout(() => { try { g.disconnect(); } catch (e) { /* noop */ } }, 1500);
  }

  /* ---------- meters ---------- */

  level(analyser) {
    if (!analyser) return 0;
    analyser.getFloatTimeDomainData(this._meterBuf);
    let sum = 0;
    for (let i = 0; i < this._meterBuf.length; i++) { const v = this._meterBuf[i]; sum += v * v; }
    return Math.min(1, Math.sqrt(sum / this._meterBuf.length) * 2.2);
  }

  trackLevel(id) { return this.level(this.chains.get(id)?.analyser); }
  masterLevel() { return this.level(this.pack?.analyser); }

  spectrum(analyser, out) {
    if (!analyser) return out.fill(0);
    analyser.getFloatFrequencyData(out);
    return out;
  }
}
