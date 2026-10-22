/* dawCAT — SFX patch model: creation, normalization and starter templates.
   The runtime (runtime.js) owns the canonical normalize(); this module adds
   ids, defaults and a library of starter patches modelled on the sounds the
   game already makes (src/audio.js), so designing a variant starts from
   something that already fits Michi-Neko's world. */
import { sfxRuntime } from './runtime.js';
import { uid } from '../state.js';

const RT = sfxRuntime();

export const SFX_CATEGORIES = ['UI', 'Cat', 'Footsteps', 'Nature', 'Magic', 'Objects', 'Ambience', 'Music sting'];

/* AudioManager methods in the game's src/audio.js that a patch can replace
   via the exported pack's installSfxOverrides(). */
export const GAME_HOOKS = [
  'playMeow', 'playPurr', 'playTrill', 'playHiss', 'playChirp', 'playLap', 'playEat', 'playSquawk',
  'playBell', 'playKeyChime', 'playUnlockChime', 'playCollect', 'playDreamChime', 'playSplash',
  'playDoorSlide', 'playFootstep', 'playSingingBowl', 'playMonkChoir'
];

export const LAYER_KINDS = ['tone', 'noise', 'fm', 'pluck'];

const LAYER_DEFAULTS = {
  tone: { kind: 'tone', wave: 'sine', freq: 660, gain: 0.5, env: { attack: 0.005, hold: 0, decay: 0.25, sustain: 0, release: 0.1 } },
  noise: { kind: 'noise', noiseColor: 'pink', gain: 0.5, filter: { type: 'lowpass', freq: 1200, q: 0.8 }, env: { attack: 0.003, hold: 0.01, decay: 0.15, sustain: 0, release: 0.1 } },
  fm: { kind: 'fm', wave: 'sine', freq: 220, fmRatio: 1.41, fmDepth: 300, gain: 0.45, env: { attack: 0.003, hold: 0, decay: 1.6, sustain: 0, release: 0.3 } },
  pluck: { kind: 'pluck', freq: 392, gain: 0.6, filter: { type: 'lowpass', freq: 4000, q: 0.5 }, env: { attack: 0.001, hold: 0, decay: 1.2, sustain: 0, release: 0.2 } }
};

export function newLayer(kind = 'tone', overrides = {}) {
  const base = JSON.parse(JSON.stringify(LAYER_DEFAULTS[kind] || LAYER_DEFAULTS.tone));
  return RT.normalize({ layers: [{ ...base, ...overrides, id: uid('L') }] }).layers[0];
}

const tone = (o) => ({ kind: 'tone', wave: 'sine', ...o });
const noiseL = (o) => ({ kind: 'noise', noiseColor: 'white', ...o });
const env = (attack, hold, decay, sustain = 0, release = 0.1) => ({ attack, hold, decay, sustain, release });

/* Each template: { label, category, patch() → partial patch }. */
export const SFX_TEMPLATES = {
  blank: { label: 'Blank', category: 'Objects', patch: () => ({ layers: [tone({ freq: 440, gain: 0.5, env: env(0.005, 0, 0.3) })] }) },

  meow: {
    label: 'Meow', category: 'Cat',
    patch: () => ({
      variation: { pitch: 120, time: 0.3, gain: 0.2 },
      layers: [
        tone({ wave: 'sawtooth', freq: 560, freqEnd: 820, sweep: 'lin', gain: 0.32, filter: { type: 'bandpass', freq: 1250, q: 2.2 }, vibrato: { rate: 7, depth: 25 }, env: env(0.04, 0.02, 0.1, 0.8, 0.05) }),
        tone({ wave: 'sawtooth', freq: 820, freqEnd: 470, sweep: 'lin', start: 0.12, gain: 0.3, filter: { type: 'bandpass', freq: 1100, freqEnd: 800, q: 2 }, vibrato: { rate: 6, depth: 30 }, env: env(0.02, 0.05, 0.22, 0, 0.1) }),
        tone({ wave: 'triangle', freq: 290, freqEnd: 235, gain: 0.14, env: env(0.04, 0.1, 0.25) })
      ]
    })
  },
  purr: {
    label: 'Purr', category: 'Cat',
    patch: () => ({
      layers: [
        noiseL({ noiseColor: 'brown', gain: 0.7, filter: { type: 'lowpass', freq: 320, q: 0.7 }, tremolo: { rate: 26, depth: 0.9 }, env: env(0.25, 1.3, 0.45) }),
        tone({ freq: 52, gain: 0.25, tremolo: { rate: 26, depth: 1 }, env: env(0.25, 1.3, 0.45) })
      ]
    })
  },
  trill: {
    label: 'Trill', category: 'Cat',
    patch: () => ({ variation: { pitch: 80, time: 0.2, gain: 0.1 }, layers: [tone({ freq: 572, freqEnd: 520, sweepTime: 0.06, gain: 0.35, vibrato: { rate: 18, depth: 60 }, repeat: { count: 3, interval: 0.045, pitchStep: 6, gainStep: 0.9 }, env: env(0.01, 0.02, 0.14) })] })
  },
  hiss: {
    label: 'Hiss', category: 'Cat',
    patch: () => ({ layers: [noiseL({ gain: 0.45, filter: { type: 'highpass', freq: 2500, freqEnd: 4200, q: 0.7 }, env: env(0.03, 0.15, 0.25) })] })
  },
  chirp: {
    label: 'Chirp', category: 'Cat',
    patch: () => ({ variation: { pitch: 100, time: 0.2, gain: 0.1 }, layers: [tone({ freq: 1500, freqEnd: 2200, gain: 0.3, env: env(0.005, 0.01, 0.1) })] })
  },
  bell: {
    label: 'Bell', category: 'Objects',
    patch: () => ({
      fx: { reverb: 0.25, reverbTime: 1.8 },
      layers: [
        tone({ freq: 520, gain: 0.45, env: env(0.002, 0, 1.6) }),
        tone({ freq: 1404, gain: 0.18, env: env(0.002, 0, 0.8) }),
        tone({ freq: 2090, gain: 0.08, env: env(0.002, 0, 0.4) }),
        noiseL({ gain: 0.12, filter: { type: 'highpass', freq: 3000, q: 0.7 }, env: env(0.0005, 0, 0.012) })
      ]
    })
  },
  collect: {
    label: 'Collect', category: 'Magic',
    patch: () => ({
      fx: { reverb: 0.2, reverbTime: 1.2 },
      layers: [
        tone({ freq: 1046.5, gain: 0.35, env: env(0.003, 0, 0.5) }),
        tone({ freq: 1318.5, start: 0.07, gain: 0.33, env: env(0.003, 0, 0.5) }),
        tone({ freq: 1568, start: 0.14, gain: 0.33, env: env(0.003, 0, 0.7) }),
        tone({ wave: 'triangle', freq: 3136, start: 0.14, gain: 0.08, env: env(0.003, 0, 0.4) })
      ]
    })
  },
  'paw-step': {
    label: 'Paw step', category: 'Footsteps',
    patch: () => ({
      variation: { pitch: 150, time: 0.3, gain: 0.3 },
      layers: [
        noiseL({ noiseColor: 'pink', gain: 0.65, filter: { type: 'lowpass', freq: 700, freqEnd: 300, q: 0.9 }, env: env(0.002, 0.01, 0.07) }),
        tone({ freq: 95, freqEnd: 60, gain: 0.3, env: env(0.002, 0, 0.06) })
      ]
    })
  },
  splash: {
    label: 'Splash', category: 'Nature',
    patch: () => ({
      variation: { pitch: 120, time: 0.25, gain: 0.2 },
      layers: [
        noiseL({ gain: 0.6, filter: { type: 'bandpass', freq: 1600, freqEnd: 600, q: 0.8 }, env: env(0.005, 0.03, 0.35) }),
        tone({ freq: 900, freqEnd: 300, gain: 0.18, env: env(0.002, 0, 0.12) }),
        tone({ freq: 1800, freqEnd: 2600, start: 0.08, gain: 0.1, repeat: { count: 4, interval: 0.06, pitchStep: -3, gainStep: 0.8 }, env: env(0.001, 0, 0.04) })
      ]
    })
  },
  'shoji-door': {
    label: 'Shoji door', category: 'Objects',
    patch: () => ({
      layers: [
        noiseL({ noiseColor: 'pink', gain: 0.45, filter: { type: 'bandpass', freq: 900, freqEnd: 1400, q: 1.2 }, env: env(0.08, 0.35, 0.3) }),
        tone({ freq: 120, freqEnd: 70, start: 0.7, gain: 0.35, env: env(0.002, 0, 0.12) }),
        noiseL({ start: 0.71, gain: 0.18, filter: { type: 'highpass', freq: 2500, q: 0.7 }, env: env(0.0005, 0, 0.015) })
      ]
    })
  },
  'dream-chime': {
    label: 'Dream chime', category: 'Magic',
    patch: () => ({ fx: { reverb: 0.45, reverbTime: 2.5 }, layers: [tone({ freq: 392, gain: 0.3, repeat: { count: 5, interval: 0.12, pitchStep: 4, gainStep: 0.92 }, env: env(0.004, 0, 1.8) })] })
  },
  'ui-click': {
    label: 'UI click', category: 'UI',
    patch: () => ({ variation: { pitch: 60, time: 0, gain: 0.1 }, layers: [noiseL({ gain: 0.45, filter: { type: 'highpass', freq: 3000, q: 0.7 }, env: env(0.0005, 0, 0.006) }), tone({ freq: 2200, gain: 0.2, env: env(0.001, 0, 0.02) })] })
  },
  'ui-confirm': {
    label: 'UI confirm', category: 'UI',
    patch: () => ({ layers: [tone({ wave: 'triangle', freq: 880, gain: 0.32, env: env(0.003, 0, 0.09) }), tone({ wave: 'triangle', freq: 1318.5, start: 0.06, gain: 0.3, env: env(0.003, 0, 0.14) })] })
  },
  'ui-back': {
    label: 'UI back', category: 'UI',
    patch: () => ({ layers: [tone({ wave: 'triangle', freq: 660, freqEnd: 520, gain: 0.3, env: env(0.003, 0, 0.12) }), tone({ freq: 440, start: 0.05, gain: 0.18, env: env(0.003, 0, 0.1) })] })
  },
  'page-turn': {
    label: 'Page turn', category: 'Objects',
    patch: () => ({ variation: { pitch: 150, time: 0.3, gain: 0.2 }, layers: [noiseL({ noiseColor: 'pink', gain: 0.4, filter: { type: 'bandpass', freq: 2500, freqEnd: 5000, q: 0.9 }, env: env(0.03, 0.05, 0.15) }), noiseL({ start: 0.12, gain: 0.15, filter: { type: 'highpass', freq: 6000, q: 0.7 }, env: env(0.001, 0, 0.03) })] })
  },
  sparkle: {
    label: 'Sparkle', category: 'Magic',
    patch: () => ({ fx: { reverb: 0.35, reverbTime: 1.6 }, layers: [tone({ freq: 2093, gain: 0.2, repeat: { count: 6, interval: 0.045, pitchStep: 5, gainStep: 0.85 }, env: env(0.002, 0, 0.25) }), noiseL({ gain: 0.06, filter: { type: 'highpass', freq: 8000, q: 0.7 }, env: env(0.01, 0, 0.3) })] })
  },
  'wind-gust': {
    label: 'Wind gust', category: 'Ambience',
    patch: () => ({ variation: { pitch: 200, time: 0.5, gain: 0.3 }, layers: [noiseL({ noiseColor: 'pink', gain: 0.55, filter: { type: 'bandpass', freq: 400, freqEnd: 1200, q: 1.5 }, env: env(0.6, 0.4, 1.2) }), noiseL({ gain: 0.07, filter: { type: 'highpass', freq: 3000, freqEnd: 5000, q: 0.7 }, env: env(0.6, 0.4, 1.2) })] })
  },
  'water-drop': {
    label: 'Water drop', category: 'Nature',
    patch: () => ({ variation: { pitch: 300, time: 0.2, gain: 0.3 }, fx: { reverb: 0.2, reverbTime: 0.9 }, layers: [tone({ freq: 1400, freqEnd: 500, sweepTime: 0.06, gain: 0.45, env: env(0.001, 0, 0.09) }), tone({ freq: 2600, freqEnd: 1800, start: 0.015, gain: 0.1, env: env(0.001, 0, 0.04) })] })
  },
  'koto-pluck': {
    label: 'Koto pluck', category: 'Music sting',
    patch: () => ({ fx: { reverb: 0.2, reverbTime: 1.4 }, layers: [{ kind: 'pluck', freq: 392, gain: 0.6, filter: { type: 'lowpass', freq: 3500, q: 0.6 }, env: env(0.001, 0, 1.6, 0, 0.3) }, { kind: 'pluck', freq: 784, gain: 0.15, filter: { type: 'lowpass', freq: 5000, q: 0.5 }, env: env(0.001, 0, 0.8, 0, 0.2) }] })
  },
  'temple-gong': {
    label: 'Temple gong', category: 'Ambience',
    patch: () => ({
      fx: { reverb: 0.4, reverbTime: 3.5 },
      layers: [
        { kind: 'fm', wave: 'sine', freq: 110, fmRatio: 1.41, fmDepth: 160, gain: 0.45, env: env(0.01, 0, 4) },
        tone({ freq: 220.5, gain: 0.18, env: env(0.01, 0, 3) }),
        tone({ freq: 333, gain: 0.09, env: env(0.01, 0, 2) }),
        noiseL({ noiseColor: 'brown', gain: 0.25, filter: { type: 'lowpass', freq: 200, q: 0.7 }, env: env(0.005, 0, 0.1) })
      ]
    })
  },
  'singing-bowl': {
    label: 'Singing bowl', category: 'Ambience',
    patch: () => ({ fx: { reverb: 0.35, reverbTime: 3 }, layers: [tone({ freq: 174.6, gain: 0.35, vibrato: { rate: 4.5, depth: 6 }, env: env(0.4, 0.5, 4) }), tone({ freq: 523.8, gain: 0.12, tremolo: { rate: 4.5, depth: 0.5 }, env: env(0.3, 0.4, 3) })] })
  },
  cricket: {
    label: 'Cricket', category: 'Nature',
    patch: () => ({ variation: { pitch: 80, time: 0.3, gain: 0.3 }, layers: [tone({ freq: 4400, gain: 0.22, repeat: { count: 6, interval: 0.03 }, env: env(0.002, 0, 0.015) }), tone({ freq: 4400, start: 0.5, gain: 0.2, repeat: { count: 6, interval: 0.03 }, env: env(0.002, 0, 0.015) })] })
  },
  unlock: {
    label: 'Unlock chime', category: 'Magic',
    patch: () => ({ fx: { reverb: 0.25, reverbTime: 1.5 }, layers: [tone({ freq: 660, gain: 0.35, env: env(0.003, 0, 0.45) }), tone({ freq: 990, start: 0.02, gain: 0.3, env: env(0.003, 0, 0.45) }), tone({ freq: 1320, start: 0.12, gain: 0.2, env: env(0.003, 0, 0.6) })] })
  }
};

export const SFX_TEMPLATE_IDS = Object.keys(SFX_TEMPLATES);

export function normalizePatch(p) { return RT.normalize(p); }

/* A fresh patch from a template, with its own id and seed. Layer ids are
   assigned so the editor can address layers stably. */
export function createPatch(templateId = 'blank', overrides = {}) {
  const tpl = SFX_TEMPLATES[templateId];
  if (!tpl) throw new Error(`Unknown SFX template "${templateId}" — use one of ${SFX_TEMPLATE_IDS.join(', ')}`);
  const base = tpl.patch();
  const patch = {
    id: uid('sfx'),
    name: tpl.label,
    category: tpl.category,
    tags: [],
    gain: 0.8,
    seed: 1 + Math.floor(Math.random() * 2147483000),
    gameHook: '',
    variation: { pitch: 0, time: 0, gain: 0 },
    fx: { lowpass: 20000, highpass: 20, reverb: 0, reverbTime: 1.5, drive: 0 },
    ...base,
    ...overrides
  };
  patch.fx = { lowpass: 20000, highpass: 20, reverb: 0, reverbTime: 1.5, drive: 0, ...(base.fx || {}), ...(overrides.fx || {}) };
  patch.variation = { pitch: 0, time: 0, gain: 0, ...(base.variation || {}), ...(overrides.variation || {}) };
  patch.layers = (overrides.layers || base.layers || []).map((l) => ({ ...l, id: l.id || uid('L') }));
  return RT.normalize(patch);
}

export function sfxDuration(patch) { return RT.duration(patch); }
