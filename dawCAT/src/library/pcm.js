/* Small, portable PCM primitives. The same synthesis runs in Node and the browser. */
export const TAU = Math.PI * 2;
export const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
export const dbGain = db => 10 ** (db / 20);
export const gainDb = x => 20 * Math.log10(Math.max(1e-12, x));
export function seedOf(text) {
  let h = 2166136261;
  for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function random(seed = 1) {
  let a = seed >>> 0;
  return () => { a += 0x6d2b79f5; let t = Math.imul(a ^ a >>> 15, 1 | a); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function pcm(sampleRate, channels) {
  const data = typeof channels === 'number' ? [new Float32Array(channels)] : channels;
  return { sampleRate, numberOfChannels: data.length, length: data[0].length,
    duration: data[0].length / sampleRate, getChannelData: i => data[i] };
}
export function copyPcm(buffer) {
  return pcm(buffer.sampleRate, Array.from({ length: buffer.numberOfChannels }, (_, ch) => buffer.getChannelData(ch).slice()));
}
export function edgeFade(data, sampleRate, seconds = .006) {
  const n = Math.min(data.length >> 1, Math.ceil(sampleRate * seconds));
  for (let i = 0; i < n; i++) { const g = .5 - .5 * Math.cos(Math.PI * i / n); data[i] *= g; data[data.length - 1 - i] *= g; }
  return data;
}
// Direct form II biquad, RBJ coefficients. State is local to a channel.
export function biquad(data, sr, type, hz, q = .707, gain = 0) {
  const w = TAU * clamp(hz, 10, sr * .45) / sr, c = Math.cos(w), s = Math.sin(w), alpha = s / (2 * q), A = 10 ** (gain / 40);
  let b0, b1, b2, a0 = 1 + alpha, a1 = -2 * c, a2 = 1 - alpha;
  if (type === 'highpass') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
  else if (type === 'bandpass') { b0 = alpha; b1 = 0; b2 = -alpha; }
  else if (type === 'peak') { b0 = 1 + alpha * A; b1 = -2 * c; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a2 = 1 - alpha / A; }
  else { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; }
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let z1 = 0, z2 = 0;
  for (let i = 0; i < data.length; i++) { const x = data[i], y = b0 * x + z1; z1 = b1 * x - a1 * y + z2; z2 = b2 * x - a2 * y; data[i] = y; }
  return data;
}
export function mixMono(buffer, data, at = 0, gain = 1, pan = 0) {
  const start = Math.round(at * buffer.sampleRate), L = buffer.getChannelData(0), R = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : L;
  const gl = Math.cos((clamp(pan, -1, 1) + 1) * Math.PI / 4) * gain, gr = Math.sin((clamp(pan, -1, 1) + 1) * Math.PI / 4) * gain;
  for (let i = Math.max(0, -start); i < data.length && i + start < L.length; i++) { L[i + start] += data[i] * gl; if (R !== L) R[i + start] += data[i] * gr; }
}
export function stats(buffer) {
  let peak = 0, energy = 0, sum = 0, nonFinite = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) for (const x of buffer.getChannelData(ch)) {
    if (!Number.isFinite(x)) nonFinite++;
    else { peak = Math.max(peak, Math.abs(x)); energy += x * x; sum += x; }
  }
  const n = buffer.length * buffer.numberOfChannels, rms = Math.sqrt(energy / n);
  return { peak, peakDb: gainDb(peak), rms, rmsDb: gainDb(rms), dc: sum / n, nonFinite, crestDb: gainDb(peak / Math.max(rms, 1e-12)) };
}
export function peakNormalize(buffer, ceilingDb = -3) {
  const s = stats(buffer), g = s.peak > 1e-10 ? dbGain(ceilingDb) / s.peak : 1;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) { const d = buffer.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] *= g; }
  return buffer;
}
export function toAudioBuffer(ctx, buffer) {
  const out = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) out.getChannelData(ch).set(buffer.getChannelData(ch));
  return out;
}
export function encodeWav(buffer, bits = 24, seed = 12) {
  if (![16, 24].includes(bits)) throw new Error('WAV supports 16 or 24 bit PCM');
  const channels = buffer.numberOfChannels, bytesPerSample = bits / 8, size = buffer.length * channels * bytesPerSample;
  const out = new Uint8Array(44 + size), v = new DataView(out.buffer), rng = random(seed);
  const str = (at, s) => { for (let i = 0; i < s.length; i++) out[at + i] = s.charCodeAt(i); };
  str(0, 'RIFF'); v.setUint32(4, 36 + size, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, channels, true); v.setUint32(24, buffer.sampleRate, true);
  v.setUint32(28, buffer.sampleRate * channels * bytesPerSample, true); v.setUint16(32, channels * bytesPerSample, true); v.setUint16(34, bits, true);
  str(36, 'data'); v.setUint32(40, size, true);
  const scale = 2 ** (bits - 1);
  for (let i = 0, pos = 44; i < buffer.length; i++) for (let ch = 0; ch < channels; ch++, pos += bytesPerSample) {
    const x = buffer.getChannelData(ch)[i];
    if (!Number.isFinite(x)) throw new Error('Cannot encode non-finite PCM');
    const value = Math.round(clamp(x * scale + rng() - rng(), -scale, scale - 1)); // TPDF dither at one LSB
    if (bits === 16) v.setInt16(pos, value, true);
    else { out[pos] = value & 255; out[pos + 1] = value >> 8 & 255; out[pos + 2] = value >> 16 & 255; }
  }
  return out;
}
