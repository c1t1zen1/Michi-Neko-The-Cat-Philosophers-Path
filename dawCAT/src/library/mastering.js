import { copyPcm, biquad, clamp, dbGain, gainDb, stats, peakNormalize } from './pcm.js';

// Stereo-linked feed-forward dynamics. A shared detector preserves the image.
// This is a sample-peak processor, not a BS.1770/true-peak compliance meter.
export function dynamics(buffer, { threshold = -21, ratio = 2.5, attack = .012, release = .18, makeup = 0, knee = 6 } = {}) {
  const out = copyPcm(buffer), sr = out.sampleRate, channels = Array.from({ length: out.numberOfChannels }, (_, i) => out.getChannelData(i));
  const ac = Math.exp(-1 / (sr * Math.max(.0001, attack))), rc = Math.exp(-1 / (sr * Math.max(.001, release)));
  let reduction = 0;
  for (let i = 0; i < out.length; i++) {
    let peak = 0; for (const d of channels) peak = Math.max(peak, Math.abs(d[i]));
    const over = gainDb(peak) - threshold;
    const target = over < -knee / 2 ? 0 : over > knee / 2 ? over * (1 - 1 / ratio) : (over + knee / 2) ** 2 / (2 * Math.max(.001, knee)) * (1 - 1 / ratio);
    const c = target > reduction ? ac : rc; reduction = c * reduction + (1 - c) * target;
    const g = dbGain(makeup - reduction); for (const d of channels) d[i] *= g;
  }
  return out;
}
export function processMastering(buffer, operation, options = {}) {
  let out = copyPcm(buffer);
  if (operation === 'compress') return dynamics(buffer, options);
  if (operation === 'normalize') return peakNormalize(out, options.ceiling ?? -2);
  if (operation === 'rms') {
    const s = stats(out), g = Math.min(dbGain((options.target ?? -22) - s.rmsDb), dbGain(options.ceiling ?? -2) / Math.max(s.peak, 1e-12));
    for (let ch = 0; ch < out.numberOfChannels; ch++) { const d = out.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] *= g; }
    return out;
  }
  const n = out.length, sr = out.sampleRate;
  for (let ch = 0; ch < out.numberOfChannels; ch++) {
    const d = out.getChannelData(ch);
    if (operation === 'dc') { let mean = 0; for (const x of d) mean += x; mean /= n; for (let i = 0; i < n; i++) d[i] -= mean; }
    else if (operation === 'hum') {
      const hz = options.hz || 60;
      for (let h = 1; h <= 4; h++) biquad(d, sr, 'peak', hz * h, 14, -24);
    } else if (operation === 'gate') {
      const threshold = dbGain(options.threshold ?? -48); let envelope = 0, g = 0;
      for (let i = 0; i < n; i++) { envelope = Math.max(Math.abs(d[i]), envelope * Math.exp(-1 / (sr * .04))); const target = clamp((envelope - threshold * .5) / threshold); g += (target - g) * (target > g ? .02 : .0005); d[i] *= g; }
    } else if (operation === 'declick') {
      const original = d.slice();
      for (let i = 2; i < n - 2; i++) {
        const neighbors = [original[i-2], original[i-1], original[i+1], original[i+2]].sort((a,b) => a-b), median = (neighbors[1] + neighbors[2]) / 2;
        if (Math.abs(original[i] - median) > (options.threshold ?? .3) && Math.abs(original[i-1] - original[i+1]) < .08) d[i] = median;
      }
    } else throw new Error(`Unknown mastering action: ${operation}`);
  }
  return out;
}
// Four damped feedback delay lines, different prime-ish lengths per channel.
// Feed only the send bus; avoid baking the dry signal into the return twice.
export function roomReturn(send, amount = .25) {
  const out = copyPcm(send), sr = send.sampleRate;
  for (let ch = 0; ch < out.numberOfChannels; ch++) {
    const input = send.getChannelData(ch), d = out.getChannelData(ch); d.fill(0);
    for (let j = 0; j < 4; j++) {
      const len = Math.round(sr * ([.0371,.0437,.0533,.0617][j] + ch * .0013));
      const delay = new Float32Array(len); let cursor = 0, low = 0;
      for (let i = 0; i < d.length; i++) {
        const x = delay[cursor]; low = low * .28 + x * .72;
        delay[cursor] = input[i] + low * (.71 - j * .025); cursor = (cursor + 1) % len;
        d[i] += x * amount * .25;
      }
    }
  }
  return out;
}
