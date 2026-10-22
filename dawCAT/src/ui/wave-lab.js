/* dawCAT — Wave Lab: Audacity-style Audio Manipulator, Sample Recorder & Chromatic Sampler builder.
   Supports:
   - Importing audio files (.wav, .mp3, .ogg, .flac, .m4a, .webm)
   - Recording live from Microphone (Web Audio PCM capture with live meter & waveform)
   - Resampling dawCAT's own Master output ("Record What You Hear")
   - Manipulating Sound Physics: Time-Stretch (WSOLA), Speed (Varispeed), Pitch Shift (Semitones + Cents),
     Reverse, Loop Points (Start/End + Ping-Pong), Trim/Crop, Silence region, Fade In/Out, Normalize,
     Filter Sculpt (LP/HP), Tape Drive, Bitcrush/Downsample, Ring Mod, Tremolo, Echo
   - Incorporating samples into songs: Place as Audio Clip on Timeline, Sync-Stretch to 1/2/4 Bars,
     Turn into a Chromatic Playable Sampler Track, Bake to New Sample, or Export WAV. */

import { el, toast, makeKnob, download } from './common.js';
import { uid, midiToName } from '../state.js';
import {
  STARTER_SAMPLES, SOUND_PHYSICS_PRESETS, defaultPhysicsParams, normalizePhysicsParams,
  processAudioBuffer, cropBufferToRegion, silenceBufferRegion, reverseBufferRegion, makeAudioBuffer
} from '../engine/manipulator.js';
import { putAsset, cacheBuffer, getCachedBuffer, decodeAndCache, loadDecodedAsset } from '../engine/assets.js';
import { wavBlob, renderSfxToBuffer } from '../engine/render.js';

const fmtSec = (s) => `${Number(s || 0).toFixed(2)}s`;
const fmtPct = (v) => `${Math.round(v * 100)}%`;
const fmtSemi = (v) => `${v > 0 ? '+' : ''}${Math.round(v)} st`;
const fmtHz = (v) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 1 : 2)}kHz` : `${Math.round(v)}Hz`);

export class WaveLab {
  constructor(app) {
    this.app = app;
    this.state = app.state;
    this.root = document.getElementById('wave-lab');
    this.activeSampleId = STARTER_SAMPLES[0].id;
    this.boundClipRef = null; // { trackId, clipId } when editing a timeline clip directly
    this.params = defaultPhysicsParams(STARTER_SAMPLES[0].duration);
    this.autoPreview = true;
    this.zoom = 1;
    this.scrollFrac = 0;

    this.sourceBuffer = null;
    this.processedBuffer = null;
    this.activePreview = null;
    this.playheadSec = null;
    this._raf = null;
    this._processTimer = null;

    // Recording state (mic or master resample)
    this.recordingMode = null; // 'mic' | 'resample' | null
    this.recChunksL = [];
    this.recChunksR = [];
    this.recLevel = 0;
    this.recDuration = 0;
    this._recStream = null;
    this._recSource = null;
    this._recProcessor = null;

    this.state.addEventListener('project', () => {
      if (this.isVisible()) this.refreshSidebar();
    });
    this.state.addEventListener('selection', () => {
      const clip = this.state.selectedClip();
      const track = this.state.selectedTrack();
      if (clip && clip.audio && clip.audio.assetId && track) {
        this.bindToClip(track.id, clip.id, { quiet: true });
      }
    });

    this.render();
    this.loadSample(this.activeSampleId, { preview: false });
  }

  isVisible() {
    return this.app.activeTab === 'wavelab';
  }

  onShow() {
    this.refreshSidebar();
    if (!this.sourceBuffer) {
      this.loadSample(this.activeSampleId, { preview: false });
    } else {
      this.drawWaveform();
    }
  }

  /* ---------------- loading & binding samples ---------------- */

  async loadSample(sampleId, { preview = false, keepBoundClip = false } = {}) {
    if (!keepBoundClip) this.boundClipRef = null;
    this.activeSampleId = sampleId;
    const ctx = this.app.engine.ensure().ctx;
    let buf = getCachedBuffer(sampleId, ctx);
    if (!buf) {
      buf = await loadDecodedAsset(ctx, sampleId);
    }
    if (!buf) {
      toast('Could not load sample buffer', true);
      return;
    }
    this.sourceBuffer = buf;
    if (!keepBoundClip) {
      const starter = STARTER_SAMPLES.find((s) => s.id === sampleId);
      const assetMeta = this.state.project.assets[sampleId];
      this.params = defaultPhysicsParams(buf.duration);
      if (starter && starter.rootMidi) this.params.rootMidi = starter.rootMidi;
      else if (assetMeta && assetMeta.rootMidi) this.params.rootMidi = assetMeta.rootMidi;
    }
    this.recomputeProcessed({ preview });
    this.render();
  }

  async bindToClip(trackId, clipId, { quiet = false } = {}) {
    const t = this.state.track(trackId);
    const c = t && t.clips.find((x) => x.id === clipId);
    if (!c || !c.audio || !c.audio.assetId) return;
    this.boundClipRef = { trackId, clipId };
    this.activeSampleId = c.audio.assetId;
    const ctx = this.app.engine.ensure().ctx;
    const buf = getCachedBuffer(c.audio.assetId, ctx) || await loadDecodedAsset(ctx, c.audio.assetId);
    if (!buf) return;
    this.sourceBuffer = buf;
    this.params = normalizePhysicsParams(c.audio, buf.duration);
    this.recomputeProcessed({ preview: false });
    if (this.isVisible()) this.render();
    if (!quiet) toast(`Editing clip "${c.name || 'Audio'}" in Wave Lab`);
  }

  async loadFromSfxPatch(sfxId) {
    const patch = this.state.sfxById(sfxId);
    if (!patch) return;
    try {
      const buffer = await renderSfxToBuffer(patch, { sampleRate: 44100 });
      await this.saveBufferAsAsset(buffer, `${patch.name} (SFX render)`, { select: true });
      toast(`Loaded "${patch.name}" into Wave Lab`);
    } catch (err) {
      toast('Failed to render SFX: ' + err.message, true);
    }
  }

  /* ---------------- file import & recording ---------------- */

  triggerFileImport() {
    let inp = document.getElementById('sample-file-input');
    if (!inp) {
      inp = el('input', { id: 'sample-file-input', type: 'file', accept: 'audio/*,.wav,.mp3,.ogg,.flac,.m4a,.webm', multiple: 'multiple', hidden: 'hidden' });
      inp.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) this.importAudioFiles(e.target.files);
        e.target.value = '';
      });
      document.body.append(inp);
    }
    inp.click();
  }

  async importAudioFiles(fileList, { placeOnTimeline = false } = {}) {
    const files = [...(fileList || [])].filter((f) => f.type.startsWith('audio/') || /\.(wav|mp3|ogg|flac|m4a|aac|webm)$/i.test(f.name));
    if (!files.length) {
      toast('Choose an audio file (.wav, .mp3, .ogg, .flac, .m4a)', true);
      return;
    }
    await this.app.engine.resume();
    const ctx = this.app.engine.ensure().ctx;
    let lastId = null;

    for (const file of files) {
      try {
        const bytes = await file.arrayBuffer();
        const assetId = uid('smp');
        const buffer = await decodeAndCache(ctx, assetId, bytes);
        const cleanName = file.name.replace(/\.[^.]+$/, '') || 'Sample';
        const meta = {
          id: assetId,
          name: cleanName,
          mime: file.type || 'audio/wav',
          durationSec: Math.round(buffer.duration * 1000) / 1000,
          sampleRate: buffer.sampleRate,
          channels: buffer.numberOfChannels,
          keepInLibrary: true,
          rootMidi: 60
        };
        await putAsset(Object.assign({ bytes }, meta));
        this.state.registerAsset(meta);
        lastId = assetId;

        if (placeOnTimeline) {
          this.placeAssetOnTimeline(assetId, cleanName, defaultPhysicsParams(buffer.duration), buffer.duration);
        }
      } catch (err) {
        toast(`Could not decode "${file.name}"`, true);
      }
    }

    if (lastId) {
      await this.loadSample(lastId, { preview: true });
      toast(`Imported ${files.length} sample${files.length > 1 ? 's' : ''} into Wave Lab`);
    }
  }

  async saveBufferAsAsset(buffer, name, { select = true, rootMidi = 60 } = {}) {
    const assetId = uid('smp');
    const blob = wavBlob(buffer);
    const bytes = await blob.arrayBuffer();
    cacheBuffer(assetId, buffer);
    const meta = {
      id: assetId,
      name: name || 'Recorded Sample',
      mime: 'audio/wav',
      durationSec: Math.round(buffer.duration * 1000) / 1000,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels,
      keepInLibrary: true,
      rootMidi
    };
    await putAsset(Object.assign({ bytes }, meta));
    this.state.registerAsset(meta);
    if (select) {
      await this.loadSample(assetId, { preview: false });
    }
    return assetId;
  }

  /* ---------- Microphone & Resample Recording ---------- */

  async toggleMicRecording() {
    if (this.recordingMode === 'mic') {
      await this.stopRecording();
      return;
    }
    if (this.recordingMode) await this.stopRecording();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast('Microphone recording is not supported in this browser environment', true);
      return;
    }

    try {
      await this.app.engine.resume();
      const ctx = this.app.engine.ensure().ctx;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      this._recStream = stream;
      const src = ctx.createMediaStreamSource(stream);
      this._startPcmCapture(ctx, src, 'mic');
      toast('🎙 Recording from microphone… click Stop when done');
    } catch (err) {
      toast(`Microphone access denied or unavailable (${err.message}) — try "⏺ Resample Song" to record internal audio!`, true);
    }
  }

  async toggleResampleRecording() {
    if (this.recordingMode === 'resample') {
      await this.stopRecording();
      return;
    }
    if (this.recordingMode) await this.stopRecording();

    await this.app.engine.resume();
    const pack = this.app.engine.ensure();
    const ctx = pack.ctx;
    this._startPcmCapture(ctx, pack.master, 'resample');
    if (!this.app.transport.playing) {
      this.app.transport.play();
      this._startedTransportForResample = true;
    }
    toast('⏺ Resampling dawCAT Master output… play notes or let the song run, then click Stop!');
  }

  _startPcmCapture(ctx, sourceNode, mode) {
    this.recordingMode = mode;
    this.recChunksL = [];
    this.recChunksR = [];
    this.recLevel = 0;
    this.recDuration = 0;
    const proc = ctx.createScriptProcessor(2048, 2, 2);
    const silentGain = ctx.createGain();
    silentGain.gain.value = 0;

    proc.onaudioprocess = (e) => {
      if (!this.recordingMode) return;
      const inL = e.inputBuffer.getChannelData(0);
      const inR = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : inL;
      const copyL = new Float32Array(inL.length);
      const copyR = new Float32Array(inR.length);
      copyL.set(inL);
      copyR.set(inR);
      this.recChunksL.push(copyL);
      this.recChunksR.push(copyR);

      let peak = 0;
      for (let i = 0; i < copyL.length; i += 4) {
        const a = Math.abs(copyL[i]);
        if (a > peak) peak = a;
      }
      this.recLevel = peak;
      this.recDuration += copyL.length / ctx.sampleRate;
      this.updateRecStatusUI();

      // Auto-cap at 30 seconds so memory stays light
      if (this.recDuration >= 30) {
        this.stopRecording();
      }
    };

    sourceNode.connect(proc);
    proc.connect(silentGain);
    silentGain.connect(ctx.destination);
    this._recSource = sourceNode;
    this._recProcessor = proc;
    this._recSilent = silentGain;
    this.render();
  }

  async stopRecording() {
    const mode = this.recordingMode;
    if (!mode) return;
    this.recordingMode = null;

    if (this._startedTransportForResample) {
      this._startedTransportForResample = false;
      this.app.transport.stop();
    }

    try {
      if (this._recProcessor) {
        this._recProcessor.onaudioprocess = null;
        if (this._recSource && mode === 'resample') {
          try { this._recSource.disconnect(this._recProcessor); } catch {}
        } else if (this._recSource) {
          try { this._recSource.disconnect(); } catch {}
        }
        this._recProcessor.disconnect();
      }
      if (this._recSilent) this._recSilent.disconnect();
      if (this._recStream) {
        this._recStream.getTracks().forEach((t) => t.stop());
      }
    } catch {}
    this._recStream = null;
    this._recSource = null;
    this._recProcessor = null;
    this._recSilent = null;

    const totalLen = this.recChunksL.reduce((s, c) => s + c.length, 0);
    if (totalLen < 512) {
      toast('Recording was too short', true);
      this.render();
      return;
    }

    const ctx = this.app.engine.ensure().ctx;
    const buffer = makeAudioBuffer(ctx, 2, totalLen, ctx.sampleRate);
    const dstL = buffer.getChannelData(0);
    const dstR = buffer.getChannelData(1);
    let offset = 0;
    for (let i = 0; i < this.recChunksL.length; i++) {
      dstL.set(this.recChunksL[i], offset);
      dstR.set(this.recChunksR[i], offset);
      offset += this.recChunksL[i].length;
    }
    this.recChunksL = [];
    this.recChunksR = [];

    const takeNum = Object.keys(this.state.project.assets || {}).length + 1;
    const label = mode === 'mic' ? `Mic Take ${takeNum}` : `Resample Take ${takeNum}`;
    await this.saveBufferAsAsset(buffer, label, { select: true });
    toast(`Saved "${label}" (${buffer.duration.toFixed(2)}s) — ready to manipulate!`);
  }

  updateRecStatusUI() {
    const badge = this.root && this.root.querySelector('.wl-rec-banner');
    if (!badge) return;
    const meterFill = badge.querySelector('.wl-rec-meter-fill');
    const timeEl = badge.querySelector('.wl-rec-time');
    if (meterFill) meterFill.style.width = `${Math.min(100, Math.round(this.recLevel * 140))}%`;
    if (timeEl) timeEl.textContent = `${this.recDuration.toFixed(1)}s`;
  }

  /* ---------------- processing & preview ---------------- */

  recomputeProcessed({ preview = false } = {}) {
    if (!this.sourceBuffer) return;
    const ctx = this.app.engine.ensure().ctx;
    this.params = normalizePhysicsParams(this.params, this.sourceBuffer.duration);
    this.processedBuffer = processAudioBuffer(ctx, this.sourceBuffer, this.params);

    // If bound to a timeline clip, sync non-destructively to that clip
    if (this.boundClipRef) {
      const { trackId, clipId } = this.boundClipRef;
      const t = this.state.track(trackId);
      const c = t && t.clips.find((x) => x.id === clipId);
      if (c) {
        const audioPatch = Object.assign({ assetId: this.activeSampleId }, this.params);
        this.state.updateClip(trackId, clipId, { audio: audioPatch }, { undo: false });
      }
    }

    this.drawWaveform();
    this.updateStatsUI();
    if (preview) this.schedulePreview();
  }

  updateParam(patch, { structural = false, preview = this.autoPreview } = {}) {
    Object.assign(this.params, patch);
    clearTimeout(this._processTimer);
    this._processTimer = setTimeout(() => {
      this.recomputeProcessed({ preview });
      if (structural) this.render();
    }, 25);
  }

  applyPreset(presetId) {
    const pr = SOUND_PHYSICS_PRESETS.find((p) => p.id === presetId);
    if (!pr || !this.sourceBuffer) return;
    const base = defaultPhysicsParams(this.sourceBuffer.duration);
    base.trimStart = this.params.trimStart;
    base.trimEnd = this.params.trimEnd;
    base.loop = this.params.loop;
    base.loopStart = this.params.loopStart;
    base.loopEnd = this.params.loopEnd;
    base.rootMidi = this.params.rootMidi;
    this.params = normalizePhysicsParams(Object.assign(base, pr.params), this.sourceBuffer.duration);
    this.recomputeProcessed({ preview: true });
    this.render();
    toast(`Physics preset: ${pr.name}`);
  }

  snapStretchToBars(bars = 1) {
    if (!this.sourceBuffer) return;
    const bpm = this.state.project.tempo || 110;
    const targetSec = bars * 4 * (60 / bpm);
    const trimmedDur = Math.max(0.05, (this.params.trimEnd || this.sourceBuffer.duration) - (this.params.trimStart || 0));
    const stretch = Math.min(4.0, Math.max(0.25, Math.round((targetSec / trimmedDur) * 1000) / 1000));
    this.params.stretch = stretch;
    this.params.speed = 1.0;
    this.recomputeProcessed({ preview: true });
    this.render();
    toast(`Time-stretched to ${bars} bar${bars > 1 ? 's' : ''} (${targetSec.toFixed(2)}s @ ${bpm} BPM, ${Math.round(stretch * 100)}%)`);
  }

  schedulePreview() {
    clearTimeout(this._previewDebounce);
    this._previewDebounce = setTimeout(() => this.playPreview(), 180);
  }

  playPreview() {
    this.stopPreview();
    const buf = this.processedBuffer || this.sourceBuffer;
    if (!buf) return;
    this.app.engine.resume().then(() => {
      const p = this.params;
      const ratio = buf.duration / Math.max(0.01, (p.trimEnd || this.sourceBuffer.duration) - (p.trimStart || 0));
      const loopStart = p.loop ? Math.max(0, (p.loopStart - p.trimStart) * ratio) : 0;
      const loopEnd = p.loop ? Math.min(buf.duration, Math.max(loopStart + 0.02, (p.loopEnd - p.trimStart) * ratio)) : buf.duration;
      const res = this.app.engine.previewBuffer(buf, {
        gain: 0.9,
        loop: p.loop,
        loopStart,
        loopEnd
      });
      if (!res) return;
      this.activePreview = { ...res, duration: buf.duration, loop: p.loop, loopStart, loopEnd };
      res.src.addEventListener('ended', () => {
        if (this.activePreview && this.activePreview.src === res.src) {
          this.activePreview = null;
          this.playheadSec = null;
          this.drawWaveform();
          this.syncPlayButton();
        }
      });
      this.syncPlayButton();
      this.animatePlayhead();
    });
  }

  stopPreview() {
    cancelAnimationFrame(this._raf);
    if (this.activePreview && this.activePreview.src) {
      try { this.activePreview.src.stop(); } catch {}
    }
    this.activePreview = null;
    this.playheadSec = null;
    this.drawWaveform();
    this.syncPlayButton();
  }

  syncPlayButton() {
    const btn = this.root && this.root.querySelector('#wl-btn-play');
    if (btn) {
      btn.textContent = this.activePreview ? '■ Stop Preview' : '▶ Audition Sample';
      btn.classList.toggle('active', !!this.activePreview);
    }
  }

  animatePlayhead() {
    cancelAnimationFrame(this._raf);
    const step = () => {
      if (!this.activePreview || !this.app.engine.ctx) return;
      const elapsed = Math.max(0, this.app.engine.ctx.currentTime - this.activePreview.startTime);
      const { duration, loop, loopStart, loopEnd } = this.activePreview;
      if (loop && loopEnd > loopStart) {
        if (elapsed < loopStart) this.playheadSec = elapsed;
        else this.playheadSec = loopStart + ((elapsed - loopStart) % (loopEnd - loopStart));
      } else {
        this.playheadSec = Math.min(duration, elapsed);
        if (elapsed >= duration) {
          this.activePreview = null;
          this.playheadSec = null;
          this.drawWaveform();
          this.syncPlayButton();
          return;
        }
      }
      this.drawWaveform();
      this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }

  /* ---------------- destructive Audacity region actions ---------------- */

  async commitDestructiveEdit(newBuffer, actionLabel) {
    const name = this.sampleName(this.activeSampleId);
    const isStarter = String(this.activeSampleId).startsWith('starter:');
    const targetName = isStarter ? `${name} (edited)` : name;
    if (isStarter) {
      await this.saveBufferAsAsset(newBuffer, targetName, { select: true, rootMidi: this.params.rootMidi });
    } else {
      const blob = wavBlob(newBuffer);
      const bytes = await blob.arrayBuffer();
      cacheBuffer(this.activeSampleId, newBuffer);
      const meta = Object.assign({}, this.state.project.assets[this.activeSampleId] || {}, {
        id: this.activeSampleId,
        name: targetName,
        mime: 'audio/wav',
        durationSec: Math.round(newBuffer.duration * 1000) / 1000,
        sampleRate: newBuffer.sampleRate,
        channels: newBuffer.numberOfChannels,
        keepInLibrary: true
      });
      await putAsset(Object.assign({ bytes }, meta));
      this.state.registerAsset(meta);
      this.sourceBuffer = newBuffer;
      this.params.trimStart = 0;
      this.params.trimEnd = newBuffer.duration;
      this.params.loopStart = 0;
      this.params.loopEnd = newBuffer.duration;
      this.recomputeProcessed({ preview: true });
      this.render();
    }
    toast(`${actionLabel} applied to "${targetName}"`);
  }

  async cropToSelection() {
    if (!this.sourceBuffer) return;
    const s0 = this.params.trimStart || 0;
    const s1 = this.params.trimEnd || this.sourceBuffer.duration;
    if (s0 <= 0.005 && s1 >= this.sourceBuffer.duration - 0.005) {
      toast('Drag the Start/End trim handles on the waveform first to crop a region', true);
      return;
    }
    const ctx = this.app.engine.ensure().ctx;
    const cropped = cropBufferToRegion(ctx, this.sourceBuffer, s0, s1);
    await this.commitDestructiveEdit(cropped, 'Cropped selection');
  }

  async silenceSelection() {
    if (!this.sourceBuffer) return;
    const s0 = this.params.trimStart || 0;
    const s1 = this.params.trimEnd || this.sourceBuffer.duration;
    const ctx = this.app.engine.ensure().ctx;
    const silenced = silenceBufferRegion(ctx, this.sourceBuffer, s0, s1);
    await this.commitDestructiveEdit(silenced, 'Silenced region');
  }

  async reverseDestructive() {
    if (!this.sourceBuffer) return;
    const s0 = this.params.trimStart || 0;
    const s1 = this.params.trimEnd || this.sourceBuffer.duration;
    const ctx = this.app.engine.ensure().ctx;
    const rev = reverseBufferRegion(ctx, this.sourceBuffer, s0, s1);
    await this.commitDestructiveEdit(rev, 'Reversed region');
  }

  async bakeToNewSample() {
    const buf = this.processedBuffer || this.sourceBuffer;
    if (!buf) return;
    const baseName = this.sampleName(this.activeSampleId);
    const newId = await this.saveBufferAsAsset(buf, `${baseName} (baked)`, { select: true, rootMidi: this.params.rootMidi });
    toast(`Baked processed audio to new sample "${this.sampleName(newId)}"`);
    return newId;
  }

  /* ---------------- incorporating into song ---------------- */

  async ensureProjectAsset(sampleId) {
    if (this.state.project.assets[sampleId]) return sampleId;
    const buf = getCachedBuffer(sampleId, this.app.engine.ensure().ctx) || this.sourceBuffer;
    if (!buf) return sampleId;
    const starter = STARTER_SAMPLES.find((s) => s.id === sampleId);
    const meta = {
      id: sampleId,
      name: starter ? starter.name : 'Sample',
      mime: 'audio/wav',
      durationSec: Math.round(buf.duration * 1000) / 1000,
      sampleRate: buf.sampleRate,
      channels: buf.numberOfChannels,
      keepInLibrary: true,
      rootMidi: this.params.rootMidi || 60
    };
    this.state.registerAsset(meta);
    return sampleId;
  }

  async placeInSong() {
    const buf = this.processedBuffer || this.sourceBuffer;
    if (!buf) return;
    const assetId = await this.ensureProjectAsset(this.activeSampleId);
    const name = this.sampleName(this.activeSampleId);
    this.placeAssetOnTimeline(assetId, name, this.params, buf.duration);
  }

  placeAssetOnTimeline(assetId, name, physicsParams, processedDurationSec) {
    const st = this.state;
    let t = st.selectedTrack();
    if (!t || t.kind === 'drum') {
      t = st.project.tracks.find((x) => x.name === 'Samples' && x.kind === 'synth');
      if (!t) {
        t = st.addTrack({ name: 'Samples', kind: 'synth', color: '#38bdf8' });
      }
    }
    const spb = 60 / (st.project.tempo || 110);
    const startBar = Math.floor(Math.max(0, this.app.transport.position) / 4);
    const lengthBars = Math.max(0.5, Math.round((processedDurationSec / (4 * spb)) * 4) / 4);
    const audioSpec = Object.assign({ assetId }, normalizePhysicsParams(physicsParams, this.sourceBuffer ? this.sourceBuffer.duration : processedDurationSec));
    const clip = st.addClip(t.id, {
      name,
      start: startBar,
      length: physicsParams.loop ? Math.max(2, Math.ceil(lengthBars)) : lengthBars,
      loop: !!physicsParams.loop,
      loopLen: Math.max(1, lengthBars * 4),
      audio: audioSpec
    });
    st.select(t.id, clip.id);
    this.boundClipRef = { trackId: t.id, clipId: clip.id };
    toast(`Placed "${name}" on track "${t.name}" at bar ${startBar + 1}`);
  }

  async createSamplerTrackFromCurrent() {
    const buf = this.processedBuffer || this.sourceBuffer;
    if (!buf) return;
    // Bake physics into a clean sample asset if physics are active so chromatic pitching is super fast
    const assetId = await this.ensureProjectAsset(this.activeSampleId);
    const name = this.sampleName(this.activeSampleId);
    const preset = {
      kind: 'sampler',
      osc1: 'sine',
      osc2: 'off',
      detune: 0,
      attack: Math.max(0.005, this.params.fadeIn || 0.008),
      decay: 1.2,
      sustain: 0.85,
      release: Math.max(0.15, this.params.fadeOut || 0.35),
      cutoff: this.params.lowpass || 10000,
      res: 0.5,
      gain: Math.min(1, this.params.gain || 0.8),
      samplerAssetId: assetId,
      samplerPhysics: Object.assign({}, this.params, { gain: 1 }),
      rootMidi: this.params.rootMidi || 60,
      samplerLoop: !!this.params.loop,
      samplerLoopStart: this.params.loopStart || 0,
      samplerLoopEnd: this.params.loopEnd || buf.duration
    };
    const st = this.state;
    const t = st.addTrack({
      name: `🎹 ${name.slice(0, 22)}`,
      kind: 'synth',
      color: '#ec4899',
      preset
    });
    // Add a starter melodic clip so the user can immediately hear and edit it in Piano Roll!
    const root = preset.rootMidi || 60;
    const sc = [0, 3, 5, 7, 10, 12, 10, 7];
    const notes = sc.map((semi, i) => ({
      id: uid('n'),
      midi: Math.min(96, Math.max(36, root + semi)),
      start: i * 0.5,
      len: 0.45,
      vel: 0.82
    }));
    const clip = st.addClip(t.id, {
      name: `${name} Melody`,
      start: Math.floor(Math.max(0, this.app.transport.position) / 4),
      length: 4,
      loop: true,
      loopLen: 4,
      notes
    });
    st.select(t.id, clip.id);
    this.app.engine.resume().then(() => this.app.engine.preview(preset, root));
    toast(`Created playable Sampler Track "${t.name}"! Use Piano Roll or keys A W S E D F… to play it.`);
  }

  exportCurrentWav() {
    const buf = this.processedBuffer || this.sourceBuffer;
    if (!buf) return;
    const name = this.sampleName(this.activeSampleId).toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'sample';
    download(`${name}-manipulated.wav`, wavBlob(buf), 'audio/wav');
    toast('Manipulated WAV downloaded');
  }

  sampleName(id) {
    const asset = this.state.project.assets && this.state.project.assets[id];
    if (asset && asset.name) return asset.name;
    const starter = STARTER_SAMPLES.find((s) => s.id === id);
    if (starter) return starter.name;
    return id || 'Sample';
  }

  /* ---------------- UI rendering ---------------- */

  render() {
    if (!this.root) return;
    this.root.innerHTML = '';
    this.root.append(this.renderSidebar(), this.renderMain());
    this.drawWaveform();
    this.updateStatsUI();
  }

  refreshSidebar() {
    if (!this.root) return;
    const oldSide = this.root.querySelector('.wl-sidebar');
    if (oldSide) oldSide.replaceWith(this.renderSidebar());
  }

  renderSidebar() {
    const side = el('aside', { class: 'wl-sidebar' });

    const recRow = el('div', { class: 'wl-rec-btns' },
      el('button', {
        class: 'btn primary wl-btn-full',
        text: '📂 Import Audio Sample…',
        title: 'Import .wav, .mp3, .ogg, .flac, .m4a into your sample library',
        onclick: () => this.triggerFileImport()
      }),
      el('div', { class: 'wl-btn-split' },
        el('button', {
          class: 'btn' + (this.recordingMode === 'mic' ? ' danger' : ''),
          text: this.recordingMode === 'mic' ? '■ Stop Mic' : '🎙 Record Mic',
          title: 'Record live audio from your microphone directly into Wave Lab',
          onclick: () => this.toggleMicRecording()
        }),
        el('button', {
          class: 'btn' + (this.recordingMode === 'resample' ? ' danger' : ''),
          text: this.recordingMode === 'resample' ? '■ Stop Resample' : '⏺ Resample Song',
          title: 'Record dawCAT\'s own master output into a new sample',
          onclick: () => this.toggleResampleRecording()
        })
      )
    );
    side.append(recRow);

    if (this.recordingMode) {
      side.append(el('div', { class: 'wl-rec-banner' },
        el('div', { class: 'wl-rec-dot' }),
        el('span', { text: this.recordingMode === 'mic' ? 'MIC REC' : 'RESAMPLING' }),
        el('div', { class: 'wl-rec-meter' }, el('div', { class: 'wl-rec-meter-fill' })),
        el('span', { class: 'wl-rec-time', text: '0.0s' })
      ));
    }

    const listWrap = el('div', { class: 'wl-sample-list' });

    // 1. Project Assets (Imported / Recorded / Baked)
    const assets = Object.values(this.state.project.assets || {});
    if (assets.length) {
      listWrap.append(el('div', { class: 'wl-sec-label', text: `PROJECT SAMPLES (${assets.length})` }));
      for (const a of assets) {
        const active = this.activeSampleId === a.id && !this.boundClipRef;
        const item = el('div', { class: 'wl-sample-item' + (active ? ' active' : '') },
          el('span', { class: 'wl-sicon', text: '🎙' }),
          el('div', { class: 'wl-stext' },
            el('div', { class: 'wl-sname', text: a.name || a.id }),
            el('div', { class: 'wl-ssub', text: `${(a.durationSec || 0).toFixed(2)}s · ${a.sampleRate || 44100}Hz` })
          ),
          el('button', {
            class: 'mini-btn x',
            text: '×',
            title: 'Delete sample from project',
            onclick: (e) => {
              e.stopPropagation();
              this.state.removeAsset(a.id);
              if (this.activeSampleId === a.id) this.loadSample(STARTER_SAMPLES[0].id);
              else this.refreshSidebar();
            }
          })
        );
        item.addEventListener('click', () => this.loadSample(a.id, { preview: true }));
        listWrap.append(item);
      }
    }

    // 2. Timeline Audio Clips
    const audioClips = [];
    for (const t of this.state.project.tracks || []) {
      for (const c of t.clips || []) {
        if (c.audio && c.audio.assetId) audioClips.push({ track: t, clip: c });
      }
    }
    if (audioClips.length) {
      listWrap.append(el('div', { class: 'wl-sec-label', text: `SONG AUDIO CLIPS (${audioClips.length})` }));
      for (const { track, clip } of audioClips) {
        const isBound = this.boundClipRef && this.boundClipRef.clipId === clip.id;
        const item = el('div', { class: 'wl-sample-item' + (isBound ? ' active' : '') },
          el('span', { class: 'wl-sicon', text: '▭' }),
          el('div', { class: 'wl-stext' },
            el('div', { class: 'wl-sname', text: clip.name || 'Audio Clip' }),
            el('div', { class: 'wl-ssub', text: `${track.name} · Bar ${clip.start + 1}` })
          )
        );
        item.addEventListener('click', () => this.bindToClip(track.id, clip.id));
        listWrap.append(item);
      }
    }

    // 3. Built-in Starter Samples
    listWrap.append(el('div', { class: 'wl-sec-label', text: 'BUILT-IN STUDIO SAMPLES' }));
    for (const s of STARTER_SAMPLES) {
      const active = this.activeSampleId === s.id && !this.boundClipRef;
      const item = el('div', { class: 'wl-sample-item' + (active ? ' active' : ''), title: s.desc },
        el('span', { class: 'wl-sicon', text: '🌊' }),
        el('div', { class: 'wl-stext' },
          el('div', { class: 'wl-sname', text: s.name }),
          el('div', { class: 'wl-ssub', text: `${s.category} · ${s.duration}s` })
        )
      );
      item.addEventListener('click', () => this.loadSample(s.id, { preview: true }));
      listWrap.append(item);
    }

    // 4. Sound Design SFX patches
    const sfxList = this.state.project.sfx || [];
    if (sfxList.length) {
      listWrap.append(el('div', { class: 'wl-sec-label', text: 'RENDER FROM SOUND DESIGN' }));
      for (const sfx of sfxList) {
        const item = el('div', { class: 'wl-sample-item', title: 'Render this procedural SFX into Wave Lab to manipulate its audio physics' },
          el('span', { class: 'wl-sicon', text: '✦' }),
          el('div', { class: 'wl-stext' },
            el('div', { class: 'wl-sname', text: sfx.name }),
            el('div', { class: 'wl-ssub', text: `Render SFX → Sample` })
          )
        );
        item.addEventListener('click', () => this.loadFromSfxPatch(sfx.id));
        listWrap.append(item);
      }
    }

    side.append(listWrap);
    return side;
  }

  renderMain() {
    const main = el('div', { class: 'wl-main' });
    const name = this.sampleName(this.activeSampleId);
    const p = this.params;

    // Top Header Bar
    const presetSelect = el('select', { class: 'wl-preset-select', title: 'Quick Sound Physics presets' },
      el('option', { value: '', text: '⚡ Sound Physics Presets…' }),
      ...SOUND_PHYSICS_PRESETS.map((pr) => el('option', { value: pr.id, text: pr.name, title: pr.desc }))
    );
    presetSelect.addEventListener('change', () => {
      if (presetSelect.value) {
        this.applyPreset(presetSelect.value);
        presetSelect.value = '';
      }
    });

    const autoCheck = el('input', { type: 'checkbox' });
    autoCheck.checked = this.autoPreview;
    autoCheck.addEventListener('change', () => { this.autoPreview = autoCheck.checked; });

    const head = el('div', { class: 'wl-head' },
      el('div', { class: 'wl-title-wrap' },
        el('strong', { class: 'wl-title', text: `🌊 ${name}` }),
        this.boundClipRef
          ? el('span', { class: 'wl-bound-tag', text: '🔗 Linked to Timeline Clip (live sync)' })
          : el('span', { class: 'wl-sub-tag', text: 'Sample Workbench' })
      ),
      presetSelect,
      el('div', { class: 'wl-actions' },
        el('button', {
          id: 'wl-btn-play',
          class: 'btn primary' + (this.activePreview ? ' active' : ''),
          text: this.activePreview ? '■ Stop Preview' : '▶ Audition Sample',
          onclick: () => (this.activePreview ? this.stopPreview() : this.playPreview())
        }),
        el('label', { class: 'sfx-toggle', title: 'Automatically audition after adjusting a physics knob' }, autoCheck, 'Auto-preview'),
        el('button', {
          class: 'btn',
          text: '→ Place on Timeline',
          title: 'Place this manipulated sample as an Audio Clip at the playhead',
          onclick: () => this.placeInSong()
        }),
        el('button', {
          class: 'btn',
          text: '🎹 Make Sampler Track',
          title: 'Create a playable instrument track from this sample (play melodies in Piano Roll or with typing keys!)',
          onclick: () => this.createSamplerTrackFromCurrent()
        }),
        el('button', {
          class: 'btn',
          text: '💾 Bake Copy',
          title: 'Bake all current physics into a brand-new sample in the library',
          onclick: () => this.bakeToNewSample()
        }),
        el('button', {
          class: 'btn',
          text: '⬇ WAV',
          title: 'Download manipulated sample as a .wav file',
          onclick: () => this.exportCurrentWav()
        }),
        el('button', {
          class: 'btn ai',
          text: '✦ Ask AI',
          title: 'Ask the AI assistant to manipulate this sample or build a track around it',
          onclick: () => this.app.openAgent({ mode: 'free', prompt: `Manipulate sample "${name}" to sound like a dreamy half-speed tape loop and create a sampler track with it` })
        })
      )
    );

    // Audacity Region & Quick Edit Toolbar
    const editBar = el('div', { class: 'wl-edit-bar' },
      el('button', {
        class: 'mini-btn' + (p.reverse ? ' active' : ''),
        text: '⇄ Reverse',
        title: 'Reverse playback direction (non-destructive)',
        onclick: () => this.updateParam({ reverse: !p.reverse }, { structural: true })
      }),
      el('button', {
        class: 'mini-btn' + (p.loop ? ' active' : ''),
        text: p.loop ? '🔁 Loop ON' : '🔁 Loop Points',
        title: 'Toggle loop region between Loop Start and Loop End',
        onclick: () => this.updateParam({ loop: !p.loop }, { structural: true })
      }),
      el('button', {
        class: 'mini-btn' + (p.pingPong ? ' active' : ''),
        text: '⇄ Ping-Pong',
        title: 'Forward-then-backward seamless ping-pong wave cycle',
        onclick: () => this.updateParam({ pingPong: !p.pingPong }, { structural: true })
      }),
      el('button', {
        class: 'mini-btn' + (p.normalize ? ' active' : ''),
        text: '📈 Normalize 0dB',
        title: 'Automatically normalize peak level to -0.2 dB',
        onclick: () => this.updateParam({ normalize: !p.normalize }, { structural: true })
      }),
      el('span', { class: 'wl-sep' }),
      el('button', { class: 'mini-btn', text: '✂ Crop to Trim', title: 'Destructively crop waveform to [Trim Start .. Trim End]', onclick: () => this.cropToSelection() }),
      el('button', { class: 'mini-btn', text: '🔇 Silence Trim', title: 'Destructively silence the selected trim region', onclick: () => this.silenceSelection() }),
      el('button', { class: 'mini-btn', text: '⇄ Bake Reverse', title: 'Destructively flip the selected region in the source waveform', onclick: () => this.reverseDestructive() }),
      el('span', { class: 'wl-sep' }),
      el('span', { class: 'dim', text: 'Fit to Tempo:' }),
      el('button', { class: 'mini-btn', text: '1 Bar', title: 'Time-stretch sample to exactly 1 bar at current project BPM', onclick: () => this.snapStretchToBars(1) }),
      el('button', { class: 'mini-btn', text: '2 Bars', title: 'Time-stretch sample to exactly 2 bars at current project BPM', onclick: () => this.snapStretchToBars(2) }),
      el('button', { class: 'mini-btn', text: '4 Bars', title: 'Time-stretch sample to exactly 4 bars at current project BPM', onclick: () => this.snapStretchToBars(4) }),
      el('span', { class: 'wl-sep' }),
      el('button', {
        class: 'mini-btn',
        text: '↺ Reset Physics',
        title: 'Reset all sound physics parameters to neutral',
        onclick: () => this.applyPreset('clean')
      })
    );

    // Interactive Waveform Canvas
    const waveWrap = el('div', { class: 'wl-wave-wrap' });
    const canvas = el('canvas', { class: 'wl-wave-canvas' });
    this.wireWaveformCanvas(canvas);
    const statsBar = el('div', { class: 'wl-stats' });
    waveWrap.append(canvas, statsBar);

    // Drag-and-drop audio files straight onto Wave Lab
    main.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    main.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        this.importAudioFiles(e.dataTransfer.files);
      }
    });

    // Sound Physics Preset Chips
    const presetBar = el('div', { class: 'wl-presets' },
      el('span', { class: 'wl-presets-label', text: '⚡ Physics Presets:' }),
      ...SOUND_PHYSICS_PRESETS.map((pr) => el('button', {
        class: 'wl-preset-chip',
        text: pr.name,
        title: pr.desc,
        onclick: () => this.applyPreset(pr.id)
      }))
    );

    // Sound Physics Knob Cards
    const grid = el('div', { class: 'wl-cards-grid' },
      this.renderTimePitchCard(),
      this.renderRegionLoopCard(),
      this.renderEnvelopeCard(),
      this.renderTimbreLoFiCard()
    );

    // Chromatic Sampler Test Keyboard
    const rootMidi = p.rootMidi || 60;
    const kbd = el('div', { class: 'wl-kbd' });
    for (let semi = -5; semi <= 12; semi++) {
      const midi = rootMidi + semi;
      const noteName = midiToName(midi);
      const isBlack = noteName.includes('#');
      const btn = el('button', {
        class: `wl-key${isBlack ? ' black' : ''}${semi === 0 ? ' root' : ''}`,
        text: noteName,
        title: `Audition manipulated sample at ${noteName} (${semi >= 0 ? '+' : ''}${semi} semitones)`,
        onclick: () => this.playSampleAtMidi(midi)
      });
      kbd.append(btn);
    }
    const kbdBar = el('div', { class: 'wl-kbd-bar' },
      el('span', { class: 'wl-kbd-label', text: `🎹 Chromatic Sampler Audition (Root: ${midiToName(rootMidi)})` }),
      kbd
    );

    main.append(head, editBar, waveWrap, presetBar, grid, kbdBar);
    return main;
  }

  playSampleAtMidi(midi) {
    const buf = this.processedBuffer || this.sourceBuffer;
    if (!buf) return;
    const root = this.params.rootMidi || 60;
    const rate = Math.pow(2, (midi - root) / 12);
    this.app.engine.resume().then(() => {
      const pack = this.app.engine.ensure();
      const src = pack.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate;
      const g = pack.ctx.createGain();
      g.gain.value = 0.85;
      src.connect(g);
      g.connect(pack.master);
      src.start();
    });
  }

  renderTimePitchCard() {
    const p = this.params;
    const card = el('div', { class: 'wl-card' },
      el('div', { class: 'wl-card-head' },
        el('strong', { text: '⏱ Time Stretch, Speed & Pitch Physics' }),
        el('span', { class: 'dim', text: 'WSOLA Granular + Varispeed' })
      )
    );
    const knobs = el('div', { class: 'knob-row' },
      makeKnob({
        label: 'Time Stretch', min: 0.25, max: 4.0, step: 0.01, def: 1.0, value: p.stretch,
        title: 'WSOLA pitch-preserving time stretch (0.5x = twice as fast, 2.0x = twice as long at same pitch)',
        fmt: (v) => `${v.toFixed(2)}x`,
        onChange: (v) => this.updateParam({ stretch: v })
      }).el,
      makeKnob({
        label: 'Tape Speed', min: 0.25, max: 4.0, step: 0.01, def: 1.0, value: p.speed,
        title: 'Varispeed tape playback (changes speed AND pitch together)',
        fmt: (v) => `${v.toFixed(2)}x`,
        onChange: (v) => this.updateParam({ speed: v })
      }).el,
      makeKnob({
        label: 'Pitch Shift', min: -24, max: 24, step: 1, def: 0, value: p.pitchSemis,
        title: 'Pitch shift in semitones without changing duration',
        fmt: fmtSemi,
        onChange: (v) => this.updateParam({ pitchSemis: Math.round(v) })
      }).el,
      makeKnob({
        label: 'Fine Tune', min: -100, max: 100, step: 1, def: 0, value: p.fineCents,
        title: 'Micro-pitch adjustment in cents (100 cents = 1 semitone)',
        fmt: (v) => `${v > 0 ? '+' : ''}${Math.round(v)} ct`,
        onChange: (v) => this.updateParam({ fineCents: Math.round(v) })
      }).el
    );

    const quickPitch = el('div', { class: 'wl-chip-row' },
      el('span', { class: 'dim', text: 'Quick Pitch:' }),
      ...[-12, -7, -5, 0, 5, 7, 12].map((st) => el('button', {
        class: 'mini-btn' + (p.pitchSemis === st ? ' active' : ''),
        text: st === 0 ? '0 st' : `${st > 0 ? '+' : ''}${st} st`,
        onclick: () => { this.params.pitchSemis = st; this.recomputeProcessed({ preview: true }); this.render(); }
      }))
    );

    card.append(knobs, quickPitch);
    return card;
  }

  renderRegionLoopCard() {
    const p = this.params;
    const dur = Math.max(0.1, this.sourceBuffer ? this.sourceBuffer.duration : 2.0);
    const card = el('div', { class: 'wl-card' },
      el('div', { class: 'wl-card-head' },
        el('strong', { text: '🔁 Trim Bounds, Loop Points & Root Key' }),
        el('span', { class: 'dim', text: 'Drag handles on waveform or dial below' })
      )
    );
    const knobs = el('div', { class: 'knob-row' },
      makeKnob({
        label: 'Trim Start', min: 0, max: Math.max(0.05, dur - 0.02), step: 0.005, def: 0, value: p.trimStart,
        title: 'Sample start offset in seconds',
        fmt: fmtSec,
        onChange: (v) => this.updateParam({ trimStart: Math.min(v, (this.params.trimEnd || dur) - 0.02) })
      }).el,
      makeKnob({
        label: 'Trim End', min: 0.02, max: dur, step: 0.005, def: dur, value: p.trimEnd || dur,
        title: 'Sample end point in seconds',
        fmt: fmtSec,
        onChange: (v) => this.updateParam({ trimEnd: Math.max(v, (this.params.trimStart || 0) + 0.02) })
      }).el,
      makeKnob({
        label: 'Loop Start', min: 0, max: Math.max(0.05, dur - 0.02), step: 0.005, def: 0, value: p.loopStart,
        title: 'Loop sustain start point (seconds)',
        fmt: fmtSec,
        onChange: (v) => this.updateParam({ loop: true, loopStart: Math.min(v, (this.params.loopEnd || dur) - 0.02) })
      }).el,
      makeKnob({
        label: 'Loop End', min: 0.02, max: dur, step: 0.005, def: dur, value: p.loopEnd || dur,
        title: 'Loop sustain end point (seconds)',
        fmt: fmtSec,
        onChange: (v) => this.updateParam({ loop: true, loopEnd: Math.max(v, (this.params.loopStart || 0) + 0.02) })
      }).el,
      makeKnob({
        label: 'Root Key', min: 36, max: 84, step: 1, def: 60, value: p.rootMidi || 60,
        title: 'Root MIDI note for Chromatic Sampler tracks (60 = C4)',
        fmt: (v) => midiToName(Math.round(v)),
        onChange: (v) => this.updateParam({ rootMidi: Math.round(v) }, { preview: false })
      }).el
    );
    card.append(knobs);
    return card;
  }

  renderEnvelopeCard() {
    const p = this.params;
    const dur = Math.max(0.2, this.processedBuffer ? this.processedBuffer.duration : 2.0);
    const card = el('div', { class: 'wl-card' },
      el('div', { class: 'wl-card-head' },
        el('strong', { text: '📐 Gain, Fades & Amplitude Envelope' }),
        el('span', { class: 'dim', text: `Curve: ${p.fadeCurve}` })
      )
    );
    const knobs = el('div', { class: 'knob-row' },
      makeKnob({
        label: 'Gain', min: 0, max: 2.5, step: 0.01, def: 1.0, value: p.gain,
        title: 'Output amplitude multiplier (0% to 250%)',
        fmt: fmtPct,
        onChange: (v) => this.updateParam({ gain: v })
      }).el,
      makeKnob({
        label: 'Fade In', min: 0, max: Math.min(10, dur), step: 0.01, def: 0, value: p.fadeIn,
        title: 'Fade-in duration in seconds',
        fmt: fmtSec,
        onChange: (v) => this.updateParam({ fadeIn: v })
      }).el,
      makeKnob({
        label: 'Fade Out', min: 0, max: Math.min(10, dur), step: 0.01, def: 0, value: p.fadeOut,
        title: 'Fade-out duration in seconds',
        fmt: fmtSec,
        onChange: (v) => this.updateParam({ fadeOut: v })
      }).el,
      makeKnob({
        label: 'Tape Drive', min: 0, max: 1, step: 0.01, def: 0, value: p.drive,
        title: 'Warm harmonic soft-clipping saturation',
        fmt: fmtPct,
        onChange: (v) => this.updateParam({ drive: v })
      }).el
    );

    const curveRow = el('div', { class: 'wl-chip-row' },
      el('span', { class: 'dim', text: 'Fade Shape:' }),
      ...[['exp', 'Exponential'], ['lin', 'Linear'], ['scurve', 'S-Curve']].map(([id, label]) => el('button', {
        class: 'mini-btn' + (p.fadeCurve === id ? ' active' : ''),
        text: label,
        onclick: () => this.updateParam({ fadeCurve: id }, { structural: true })
      }))
    );
    card.append(knobs, curveRow);
    return card;
  }

  renderTimbreLoFiCard() {
    const p = this.params;
    const card = el('div', { class: 'wl-card' },
      el('div', { class: 'wl-card-head' },
        el('strong', { text: '🎛 Filter, Lo-Fi Crush, Ring Mod & Space' }),
        el('span', { class: 'dim', text: 'Spectral & Timbral Physics' })
      )
    );
    const knobs = el('div', { class: 'knob-row' },
      makeKnob({
        label: 'Lowpass', min: 80, max: 20000, step: 10, log: true, def: 20000, value: p.lowpass,
        title: 'Lowpass filter cutoff frequency',
        fmt: fmtHz,
        onChange: (v) => this.updateParam({ lowpass: v })
      }).el,
      makeKnob({
        label: 'Highpass', min: 20, max: 4000, step: 5, log: true, def: 20, value: p.highpass,
        title: 'Highpass filter cutoff frequency',
        fmt: fmtHz,
        onChange: (v) => this.updateParam({ highpass: v })
      }).el,
      makeKnob({
        label: 'Bit Depth', min: 4, max: 16, step: 1, def: 16, value: p.bitcrush,
        title: 'Bitcrusher resolution (16 = clean, 12 = vintage sampler, 6 = retro 8-bit)',
        fmt: (v) => `${Math.round(v)}-bit`,
        onChange: (v) => this.updateParam({ bitcrush: Math.round(v) })
      }).el,
      makeKnob({
        label: 'Downsample', min: 1, max: 24, step: 1, def: 1, value: p.downsample,
        title: 'Sample-rate decimation factor (1x = clean, 4x+ = alias crunch)',
        fmt: (v) => `${Math.round(v)}x`,
        onChange: (v) => this.updateParam({ downsample: Math.round(v) })
      }).el,
      makeKnob({
        label: 'Ring Mod', min: 0, max: 800, step: 1, def: 0, value: p.ringModHz,
        title: 'Ring modulator carrier frequency (0 = off)',
        fmt: (v) => (v < 1 ? 'Off' : `${Math.round(v)}Hz`),
        onChange: (v) => this.updateParam({ ringModHz: v })
      }).el,
      makeKnob({
        label: 'Tremolo', min: 0, max: 18, step: 0.1, def: 0, value: p.tremoloRate,
        title: 'Amplitude modulation rate in Hz (0 = off)',
        fmt: (v) => (v < 0.2 ? 'Off' : `${v.toFixed(1)}Hz`),
        onChange: (v) => this.updateParam({ tremoloRate: v })
      }).el,
      makeKnob({
        label: 'Echo Bake', min: 0, max: 0.5, step: 0.01, def: 0, value: p.echoDelay,
        title: 'Baked tape echo delay time (0 = off)',
        fmt: (v) => (v < 0.01 ? 'Off' : `${Math.round(v * 1000)}ms`),
        onChange: (v) => this.updateParam({ echoDelay: v })
      }).el
    );
    card.append(knobs);
    return card;
  }

  /* ---------------- interactive waveform canvas ---------------- */

  wireWaveformCanvas(cv) {
    let dragMode = null; // 'trimStart' | 'trimEnd' | 'loopStart' | 'loopEnd' | 'region'
    let startSec = 0;

    const xToSec = (e) => {
      if (!this.sourceBuffer) return 0;
      const r = cv.getBoundingClientRect();
      const pad = 12;
      const frac = Math.min(1, Math.max(0, (e.clientX - r.left - pad) / Math.max(1, r.width - pad * 2)));
      return frac * this.sourceBuffer.duration;
    };

    cv.addEventListener('pointerdown', (e) => {
      if (!this.sourceBuffer) return;
      const r = cv.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const pad = 12;
      const w = Math.max(1, r.width - pad * 2);
      const dur = this.sourceBuffer.duration;
      const secToX = (s) => pad + (s / dur) * w;

      const tsX = secToX(this.params.trimStart || 0);
      const teX = secToX(this.params.trimEnd || dur);
      const lsX = secToX(this.params.loopStart || 0);
      const leX = secToX(this.params.loopEnd || dur);

      if (this.params.loop && y < 32 && Math.abs(x - lsX) < 10) dragMode = 'loopStart';
      else if (this.params.loop && y < 32 && Math.abs(x - leX) < 10) dragMode = 'loopEnd';
      else if (Math.abs(x - tsX) < 10) dragMode = 'trimStart';
      else if (Math.abs(x - teX) < 10) dragMode = 'trimEnd';
      else {
        dragMode = 'region';
        startSec = xToSec(e);
      }

      const onMove = (ev) => {
        const s = xToSec(ev);
        if (dragMode === 'trimStart') {
          this.params.trimStart = Math.min(s, (this.params.trimEnd || dur) - 0.02);
        } else if (dragMode === 'trimEnd') {
          this.params.trimEnd = Math.max(s, (this.params.trimStart || 0) + 0.02);
        } else if (dragMode === 'loopStart') {
          this.params.loopStart = Math.min(s, (this.params.loopEnd || dur) - 0.02);
        } else if (dragMode === 'loopEnd') {
          this.params.loopEnd = Math.max(s, (this.params.loopStart || 0) + 0.02);
        } else if (dragMode === 'region' && Math.abs(s - startSec) > 0.03) {
          this.params.trimStart = Math.min(startSec, s);
          this.params.trimEnd = Math.max(startSec, s);
        }
        this.drawWaveform();
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        if (dragMode) {
          this.recomputeProcessed({ preview: this.autoPreview });
        }
        dragMode = null;
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  }

  drawWaveform() {
    const cv = this.root && this.root.querySelector('.wl-wave-canvas');
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth || 720;
    const h = cv.clientHeight || 210;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#080e1a';
    g.fillRect(0, 0, w, h);

    const srcBuf = this.sourceBuffer;
    const procBuf = this.processedBuffer || srcBuf;
    if (!srcBuf || !procBuf) return;

    const pad = 12;
    const plotW = Math.max(10, w - pad * 2);
    const rulerH = 20;
    const topH = Math.floor((h - rulerH - 10) * 0.36); // Top strip: Source + Trim/Loop handles
    const botY = rulerH + topH + 6;
    const botH = h - botY - 4; // Bottom strip: Processed Physics output

    // Time Ruler
    g.fillStyle = '#0d1526';
    g.fillRect(0, 0, w, rulerH);
    const srcDur = Math.max(0.05, srcBuf.duration);
    const tickStep = srcDur > 8 ? 1 : srcDur > 3 ? 0.5 : srcDur > 1 ? 0.25 : 0.1;
    g.font = '9px ui-monospace, monospace';
    g.fillStyle = '#6b82a8';
    g.strokeStyle = '#18243c';
    for (let t = 0; t <= srcDur + 1e-6; t += tickStep) {
      const x = Math.round(pad + (t / srcDur) * plotW) + 0.5;
      g.beginPath();
      g.moveTo(x, rulerH - 5);
      g.lineTo(x, h);
      g.stroke();
      g.fillText(`${t.toFixed(t < 1 ? 2 : 1)}s`, x + 3, 13);
    }

    // 1. Source Lane (Top) with Trim & Loop Markers
    const topY = rulerH + 2;
    g.fillStyle = '#0b1322';
    g.fillRect(pad, topY, plotW, topH);
    this.paintBufferMinMax(g, srcBuf, pad, topY, plotW, topH, '#3b5988', '#5aa2ff');

    const p = this.params;
    const tsX = pad + ((p.trimStart || 0) / srcDur) * plotW;
    const teX = pad + ((p.trimEnd || srcDur) / srcDur) * plotW;

    // Dim trimmed-out regions
    g.fillStyle = 'rgba(5, 8, 16, 0.72)';
    if (tsX > pad) g.fillRect(pad, topY, tsX - pad, topH);
    if (teX < pad + plotW) g.fillRect(teX, topY, pad + plotW - teX, topH);

    // Trim handles
    g.strokeStyle = '#fbbf24';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(tsX, topY); g.lineTo(tsX, topY + topH);
    g.moveTo(teX, topY); g.lineTo(teX, topY + topH);
    g.stroke();
    g.fillStyle = '#fbbf24';
    g.fillRect(tsX - 1, topY, 6, 10);
    g.fillRect(teX - 5, topY, 6, 10);

    // Loop region overlay on Source Lane
    if (p.loop) {
      const lsX = pad + ((p.loopStart || 0) / srcDur) * plotW;
      const leX = pad + ((p.loopEnd || srcDur) / srcDur) * plotW;
      g.fillStyle = 'rgba(52, 211, 153, 0.16)';
      g.fillRect(lsX, topY, Math.max(2, leX - lsX), topH);
      g.strokeStyle = '#34d399';
      g.beginPath();
      g.moveTo(lsX, topY); g.lineTo(lsX, topY + topH);
      g.moveTo(leX, topY); g.lineTo(leX, topY + topH);
      g.stroke();
      g.fillStyle = '#34d399';
      g.font = 'bold 9px system-ui';
      g.fillText('🔁 LOOP', lsX + 4, topY + 11);
    }

    g.fillStyle = '#8fa8d1';
    g.font = 'bold 9px system-ui';
    g.fillText('SOURCE WAVE · DRAG TO TRIM / CROP', pad + 6, topY + topH - 5);

    // 2. Processed Physics Lane (Bottom)
    g.fillStyle = '#0b1322';
    g.fillRect(pad, botY, plotW, botH);
    this.paintBufferMinMax(g, procBuf, pad, botY, plotW, botH, '#6d4aff', '#a78bfa');

    // Draw Fade In / Fade Out envelope overlay on Processed Lane
    const procDur = Math.max(0.05, procBuf.duration);
    g.strokeStyle = 'rgba(244, 114, 182, 0.85)';
    g.lineWidth = 1.5;
    g.beginPath();
    const fiX = pad + Math.min(1, (p.fadeIn || 0) / procDur) * plotW;
    const foX = pad + Math.max(0, 1 - (p.fadeOut || 0) / procDur) * plotW;
    g.moveTo(pad, botY + botH);
    g.lineTo(fiX, botY + 4);
    g.lineTo(foX, botY + 4);
    g.lineTo(pad + plotW, botY + botH);
    g.stroke();

    g.fillStyle = '#cbbcff';
    g.font = 'bold 9px system-ui';
    g.fillText(`PROCESSED PHYSICS OUTPUT (${procDur.toFixed(2)}s${p.reverse ? ' · REVERSED' : ''}${p.pingPong ? ' · PING-PONG' : ''})`, pad + 6, botY + 13);

    // Live Playhead
    if (this.playheadSec != null) {
      const px = pad + Math.min(1, Math.max(0, this.playheadSec / procDur)) * plotW;
      g.strokeStyle = '#ffffff';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(px, botY);
      g.lineTo(px, botY + botH);
      g.stroke();
    }
  }

  paintBufferMinMax(g, buffer, x0, y0, w, h, colorOuter, colorInner) {
    const ch0 = buffer.getChannelData(0);
    const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : ch0;
    const cols = Math.max(1, Math.floor(w));
    const spp = ch0.length / cols;
    const mid = y0 + h / 2;
    const amp = h / 2 - 3;

    g.strokeStyle = '#1b2945';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x0, mid + 0.5);
    g.lineTo(x0 + w, mid + 0.5);
    g.stroke();

    g.fillStyle = colorOuter;
    for (let c = 0; c < cols; c++) {
      const start = Math.floor(c * spp);
      const end = Math.min(ch0.length, Math.floor((c + 1) * spp) + 1);
      let min = 1, max = -1, rms = 0, count = 0;
      for (let i = start; i < end; i++) {
        const v = (ch0[i] + ch1[i]) * 0.5;
        if (v < min) min = v;
        if (v > max) max = v;
        rms += v * v;
        count++;
      }
      if (max < min) continue;
      const top = mid - Math.min(1, max) * amp;
      const bot = mid - Math.max(-1, min) * amp;
      g.fillStyle = colorOuter;
      g.fillRect(x0 + c, top, 1, Math.max(1, bot - top));
      if (count > 0) {
        const rVal = Math.sqrt(rms / count) * amp;
        g.fillStyle = colorInner;
        g.fillRect(x0 + c, mid - rVal, 1, Math.max(1, rVal * 2));
      }
    }
  }

  updateStatsUI() {
    const host = this.root && this.root.querySelector('.wl-stats');
    if (!host || !this.sourceBuffer) return;
    const src = this.sourceBuffer;
    const proc = this.processedBuffer || src;
    const p = this.params;
    let peak = 0;
    const d0 = proc.getChannelData(0);
    for (let i = 0; i < d0.length; i += 2) {
      const a = Math.abs(d0[i]);
      if (a > peak) peak = a;
    }
    const db = peak > 1e-5 ? `${(20 * Math.log10(peak)).toFixed(1)} dB` : '-∞ dB';
    const bpm = this.state.project.tempo || 110;
    const bars = (proc.duration / (4 * (60 / bpm))).toFixed(2);

    host.innerHTML = '';
    host.append(
      el('span', { text: `Source: ${src.duration.toFixed(2)}s (${src.sampleRate}Hz, ${src.numberOfChannels}ch)` }),
      el('span', { text: `Processed: ${proc.duration.toFixed(2)}s (~${bars} bars @ ${bpm} BPM)` }),
      el('span', { text: `Peak: ${db}` }),
      el('span', { text: `Stretch: ${Math.round(p.stretch * 100)}% · Speed: ${Math.round(p.speed * 100)}% · Pitch: ${fmtSemi(p.pitchSemis)} (${p.fineCents}ct)` }),
      el('span', { text: `Root: ${midiToName(p.rootMidi || 60)}` })
    );
  }
}
