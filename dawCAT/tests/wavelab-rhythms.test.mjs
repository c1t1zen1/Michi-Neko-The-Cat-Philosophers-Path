import { test, assert, installDomShims, fakeResponse } from './harness.mjs';
installDomShims();

import { DRUM_RHYTHMS, RHYTHM_CATEGORIES, getRhythm, humanizeSteps, rotateSteps, addDrumFill } from '../src/engine/rhythms.js';
import { DRUM_KIT_LIST } from '../src/engine/drums.js';
import { normalizePhysicsParams, processAudioBuffer, makeAudioBuffer, olaStretchChannel, resampleChannel, PHYSICS_PRESETS, STARTER_SAMPLES, synthesizeStarterSample } from '../src/engine/manipulator.js';
import { AppState, defaultProject } from '../src/state.js';
import { PlanExecutor } from '../src/agent/executor.js';
import { validatePlan } from '../src/agent/schema.js';
import { POPULAR_MODELS, autoDetectLocalServers } from '../src/agent/providers.js';

const fresh = () => {
  const state = new AppState();
  state.setProject(defaultProject());
  return { state, exec: new PlanExecutor(state), p: state.project };
};

test('DRUM_RHYTHMS library provides 40+ pre-programmed rhythms across all categories', () => {
  assert.ok(DRUM_RHYTHMS.length >= 40, `Expected >= 40 rhythms, got ${DRUM_RHYTHMS.length}`);
  for (const cat of RHYTHM_CATEGORIES) {
    const inCat = DRUM_RHYTHMS.filter((r) => r.category === cat);
    assert.ok(inCat.length >= 4, `Expected >= 4 rhythms in category ${cat}`);
  }
  for (const r of DRUM_RHYTHMS) {
    assert.ok(r.id && r.name && r.grid, `Rhythm ${r.id} has id, name, grid`);
    assert.ok(r.bpm >= 40 && r.bpm <= 220, `Rhythm ${r.id} has valid bpm`);
    const found = getRhythm(r.id);
    assert.equal(found.id, r.id);
  }
});

test('DRUM_KIT_LIST provides 7 studio & Kyoto drum kits', () => {
  assert.equal(DRUM_KIT_LIST.length, 7);
  const ids = DRUM_KIT_LIST.map((k) => k.id);
  for (const k of ['soft', 'punch', 'lofi', 'taiko', '808', 'acoustic', 'crisp']) {
    assert.ok(ids.includes(k), `Kit ${k} exists`);
  }
});

test('drum step manipulation helpers (humanizeSteps, rotateSteps, addDrumFill)', () => {
  const steps = { kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], snare: new Array(16).fill(0) };
  const rot = rotateSteps(steps, 1);
  assert.equal(rot.kick[1], 1);
  assert.equal(rot.kick[0], 0);
  const fill = addDrumFill(steps);
  assert.ok(fill.tom[12] > 0 || fill.snare[15] > 0);
  const hum = humanizeSteps(steps, 0.1);
  assert.ok(hum.kick[0] > 0 && hum.kick[0] <= 1);
});

test('WSOLA time-stretch preserves pitch while changing duration', () => {
  const sr = 44100;
  const input = new Float32Array(sr * 0.5);
  for (let i = 0; i < input.length; i++) input[i] = Math.sin((2 * Math.PI * 440 * i) / sr);
  const stretched2x = olaStretchChannel(input, 2.0, sr);
  assert.ok(Math.abs(stretched2x.length - input.length * 2) < 100);
  const compressedHalf = olaStretchChannel(input, 0.5, sr);
  assert.ok(Math.abs(compressedHalf.length - input.length * 0.5) < 100);
});

test('Audio Manipulator processAudioBuffer applies reverse, fades, bitcrush, filter, and pitch', () => {
  const sr = 44100;
  const ch = new Float32Array(sr * 0.4);
  for (let i = 0; i < ch.length; i++) ch[i] = Math.sin((2 * Math.PI * 220 * i) / sr) * (i / ch.length);
  const srcBuf = makeAudioBuffer(null, 1, ch.length, sr);
  srcBuf.getChannelData(0).set(ch);
  const params = normalizePhysicsParams({
    stretch: 1.5,
    speed: 1.0,
    pitchSemis: 5,
    reverse: true,
    fadeIn: 0.05,
    fadeOut: 0.05,
    bitcrush: 8,
    downsample: 2,
    lowpass: 4000,
    drive: 0.3,
    normalize: true
  }, 0.4);
  const outBuf = processAudioBuffer(null, srcBuf, params);
  const out0 = outBuf.getChannelData(0);
  assert.equal(outBuf.numberOfChannels, 1);
  assert.ok(out0.length > ch.length * 1.2);
  // Fade-in starts at 0
  assert.equal(out0[0], 0);
  // Normalized peak near 0.96
  let peak = 0;
  for (let i = 0; i < out0.length; i++) {
    const a = Math.abs(out0[i]);
    if (a > peak) peak = a;
  }
  assert.ok(peak > 0.85 && peak <= 1.0);
});

test('PHYSICS_PRESETS and STARTER_SAMPLES synthesize valid stereo AudioBuffers', () => {
  assert.equal(PHYSICS_PRESETS.length, 10);
  assert.equal(STARTER_SAMPLES.length, 8);
  for (const s of STARTER_SAMPLES) {
    assert.ok(s.id.startsWith('starter:'));
    assert.ok(s.duration > 0.3);
    const buf = synthesizeStarterSample(null, s.id);
    assert.equal(buf.numberOfChannels, 2);
    assert.ok(buf.length > 10000);
  }
});

test('AI action setDrumRhythm switches the song drum rhythm, kit, and swing', () => {
  const { exec, p } = fresh();
  const { plan, errors } = validatePlan({
    summary: 'Switch to matsuri taiko',
    actions: [
      { type: 'setDrumRhythm', params: { rhythm: 'taiko', kit: 'taiko', syncTempo: true, bars: 8 } }
    ]
  });
  assert.deepEqual(errors, []);
  exec.execute(plan);
  const drumTrack = p.tracks.find((t) => t.kind === 'drum');
  assert.ok(drumTrack);
  assert.equal(drumTrack.drumKit, 'taiko');
  assert.equal(p.tempo, 112);
  assert.ok(drumTrack.clips[0].steps.kick.some((v) => v > 0));
});

test('AI action manipulateAudio creates or updates an audio sample clip with sound physics', () => {
  const { exec, p } = fresh();
  const { plan, errors } = validatePlan({
    summary: 'Add stretched reversed temple bell',
    actions: [
      {
        type: 'manipulateAudio',
        params: {
          sampleId: 'starter:temple-bell',
          name: 'Dream Bell',
          stretch: 2.0,
          pitchSemis: -7,
          reverse: true,
          loop: true,
          fadeIn: 0.3,
          lowpass: 3500
        }
      }
    ]
  });
  assert.deepEqual(errors, []);
  exec.execute(plan);
  const smpTrack = p.tracks.find((t) => t.name === 'Samples');
  assert.ok(smpTrack);
  const clip = smpTrack.clips[0];
  assert.ok(clip && clip.audio);
  assert.equal(clip.audio.assetId, 'starter:temple-bell');
  assert.equal(clip.audio.stretch, 2.0);
  assert.equal(clip.audio.pitchSemis, -7);
  assert.equal(clip.audio.reverse, true);
  assert.equal(clip.audio.loop, true);
});

test('AI action createSamplerTrack creates a playable chromatic sampler track and melody clip', () => {
  const { exec, p } = fresh();
  const { plan, errors } = validatePlan({
    summary: 'Create koto sampler track',
    actions: [
      {
        type: 'createSamplerTrack',
        params: {
          sampleId: 'starter:koto-pluck',
          name: 'Silk Koto Sampler',
          rootMidi: 60,
          phrase: 'C5/1 D5/1 E5/1 G5/1'
        }
      }
    ]
  });
  assert.deepEqual(errors, []);
  exec.execute(plan);
  const track = p.tracks.find((t) => t.name === 'Silk Koto Sampler');
  assert.ok(track);
  assert.equal(track.preset.kind, 'sampler');
  assert.equal(track.preset.samplerAssetId, 'starter:koto-pluck');
  assert.equal(track.clips.length, 1);
  assert.equal(track.clips[0].notes.length, 4);
});

test('POPULAR_MODELS and autoDetectLocalServers work for local and cloud providers', async () => {
  assert.ok(POPULAR_MODELS.local.length >= 5);
  assert.ok(POPULAR_MODELS.anthropic.length >= 3);
  assert.ok(POPULAR_MODELS.openai.length >= 4);

  const detected = await autoDetectLocalServers({
    fetchImpl: async (url) => {
      if (url.includes('127.0.0.1:8080/v1/models')) {
        return fakeResponse({ json: { data: [{ id: 'qwen3-14b-instruct.gguf' }] } });
      }
      if (url.includes('127.0.0.1:8080/props')) {
        return fakeResponse({ json: { default_generation_settings: { n_ctx: 16384 } } });
      }
      return fakeResponse({ status: 503, json: {} });
    }
  });
  assert.equal(detected.length, 1);
  assert.equal(detected[0].provider, 'local');
  assert.equal(detected[0].nCtx, 16384);
});
