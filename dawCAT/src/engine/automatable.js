/* dawCAT — table of device parameters that map directly to a live AudioParam and
   can therefore be automated (driven every scheduler tick via setTargetAtTime).
   Deliberately excludes non-continuous params (osc/filter type enums, delay sync
   mode, EQ band type) and params that require offline regeneration rather than a
   simple AudioParam write (reverb size/decay rebuild the impulse response). */

export const AUTOMATABLE_PARAMS = {
  eq8: {
    hpFreq: { min: 20, max: 2000, label: 'HP Freq' },
    band0Gain: { min: -24, max: 24, label: 'Band 1 Gain' },
    band1Gain: { min: -24, max: 24, label: 'Band 2 Gain' },
    band2Gain: { min: -24, max: 24, label: 'Band 3 Gain' },
    band3Gain: { min: -24, max: 24, label: 'Band 4 Gain' },
    band4Gain: { min: -24, max: 24, label: 'Band 5 Gain' },
    band5Gain: { min: -24, max: 24, label: 'Band 6 Gain' },
    band6Gain: { min: -24, max: 24, label: 'Band 7 Gain' },
    band7Gain: { min: -24, max: 24, label: 'Band 8 Gain' }
  },
  comp: {
    threshold: { min: -60, max: 0, label: 'Threshold' },
    ratio: { min: 1, max: 20, label: 'Ratio' },
    attack: { min: 0.001, max: 1, label: 'Attack' },
    release: { min: 0.01, max: 2, label: 'Release' },
    knee: { min: 0, max: 40, label: 'Knee' },
    makeup: { min: 0, max: 4, label: 'Makeup' }
  },
  delay: {
    feedback: { min: 0, max: 0.92, label: 'Feedback' },
    wet: { min: 0, max: 1, label: 'Wet' }
  },
  reverb: {
    wet: { min: 0, max: 1, label: 'Wet' }
  },
  filter: {
    freq: { min: 20, max: 20000, label: 'Freq' },
    q: { min: 0.0001, max: 24, label: 'Q' }
  },
  chorus: {
    rate: { min: 0.05, max: 8, label: 'Rate' },
    // depth automates the live lfoGain.gain AudioParam directly, which chorusFx()'s
    // apply() scales by 0.012 from the 0-1 UI knob range — the automatable range must
    // match the actual param scale, not the knob's.
    depth: { min: 0, max: 0.012, label: 'Depth' },
    mix: { min: 0, max: 1, label: 'Mix' }
  },
  utility: {
    gain: { min: 0, max: 4, label: 'Gain' }
  }
};

export const DEVICE_LABELS = {
  eq8: 'EQ Eight', comp: 'Compressor', delay: 'Delay', reverb: 'Reverb',
  filter: 'Filter', chorus: 'Chorus', utility: 'Utility'
};

export function normalizeAuto(v, range) {
  if (!range) return Math.min(1, Math.max(0, v));
  const span = range.max - range.min;
  return span ? Math.min(1, Math.max(0, (v - range.min) / span)) : 0;
}

export function denormalizeAuto(n, range) {
  if (!range) return Math.min(1, Math.max(0, n));
  return range.min + Math.min(1, Math.max(0, n)) * (range.max - range.min);
}
