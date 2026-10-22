/* dawCAT — synthesized drum kit voices */

export const DRUM_KIT_LIST = [
  { id: 'soft', name: 'Soft Kit', desc: 'Warm, gentle brushed & muffled voices' },
  { id: 'punch', name: 'Punch Kit', desc: 'Tight studio punch with snappy transients' },
  { id: 'lofi', name: 'Lo-Fi Kit', desc: 'Dusty vintage tape-filtered percussion' },
  { id: 'taiko', name: 'Taiko & Shrine Kit', desc: 'Deep Japanese odaiko, shime-daiko, bamboo rim & kane bell' },
  { id: '808', name: '808 Sub Kit', desc: 'Booming sub-bass kick, crispy clap & metallic hats' },
  { id: 'acoustic', name: 'Acoustic Studio Kit', desc: 'Natural woody drum kit with warm snare & cymbals' },
  { id: 'crisp', name: 'Crisp Electronic Kit', desc: 'Modern tight electronic transients & bright hats' }
];

const KITS = {
  soft: { tune: 1, decay: 1, snap: 0.5, tone: 1, sub: 0 },
  punch: { tune: 1.15, decay: 0.85, snap: 1, tone: 1.2, sub: 0.2 },
  lofi: { tune: 0.85, decay: 1.2, snap: 0.3, tone: 0.55, sub: 0.1 },
  taiko: { tune: 0.78, decay: 1.45, snap: 0.85, tone: 0.9, sub: 0.35 },
  '808': { tune: 0.72, decay: 1.65, snap: 0.9, tone: 1.1, sub: 0.55 },
  acoustic: { tune: 1.04, decay: 1.05, snap: 0.75, tone: 1.05, sub: 0.1 },
  crisp: { tune: 1.22, decay: 0.72, snap: 1.1, tone: 1.35, sub: 0.15 }
};

export function playDrum(pack, dest, lane, when, vel, kit = 'soft', reg) {
  const ctx = pack.ctx;
  const k = KITS[kit] || KITS.soft;
  const out = ctx.createGain();
  out.gain.value = vel;
  out.connect(dest);

  const osc = (type, f0, dur, vol, f1, filter) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1 != null ? f1 : f0 * k.tune, when);
    if (f1 != null) o.frequency.exponentialRampToValueAtTime(Math.max(1, f0 * k.tune), when + dur * 0.85);
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.0008, when + dur * k.decay);
    let tail = o;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = filter.type; f.frequency.value = filter.freq; f.Q.value = filter.q || 1;
      o.connect(f); tail = f;
    }
    tail.connect(g); g.connect(out);
    o.start(when); o.stop(when + dur * k.decay + 0.05);
    if (reg) reg(o);
  };
  const noise = (dur, filter, vol, q = 1, attack = 0.001, offset = 0) => {
    const t0 = when + offset;
    const src = ctx.createBufferSource();
    if (!pack._drumNoise) {
      const len = Math.floor(ctx.sampleRate * 1.2);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      pack._drumNoise = buf;
    }
    src.buffer = pack._drumNoise;
    const f = ctx.createBiquadFilter();
    f.type = filter.type; f.frequency.value = filter.freq * (kit === 'lofi' ? 0.7 : k.tone || 1); f.Q.value = filter.q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur * k.decay);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t0); src.stop(t0 + dur * k.decay + 0.05);
    if (reg) reg(src);
  };

  switch (lane) {
    case 'kick':
      osc('sine', kit === '808' ? 38 : kit === 'taiko' ? 52 : 45, kit === '808' ? 0.65 : 0.42, 1.1, kit === 'taiko' ? 125 : 150);
      if (kit === 'taiko') osc('triangle', 78, 0.28, 0.45, 140, { type: 'lowpass', freq: 380, q: 1.5 });
      if (k.snap > 0.3) noise(0.02, { type: 'lowpass', freq: 3000 }, 0.25 * k.snap);
      break;
    case 'snare':
      noise(0.18, { type: 'bandpass', freq: 1800, q: 0.9 }, 0.8);
      osc('triangle', kit === 'taiko' ? 240 : 190, 0.12, 0.5);
      break;
    case 'clap':
      [0, 0.012, 0.026].forEach((dt) => noise(0.09, { type: 'bandpass', freq: 1100, q: 1.4 }, 0.55, 1, 0.001, dt));
      break;
    case 'hatC': noise(0.055, { type: 'highpass', freq: 8000 }, 0.5); break;
    case 'hatO': noise(0.34, { type: 'highpass', freq: 7000 }, 0.4); break;
    case 'tom':
      osc('sine', kit === 'taiko' ? 82 : 90, kit === 'taiko' ? 0.38 : 0.3, 0.95, kit === 'taiko' ? 165 : 200);
      if (kit === 'taiko') noise(0.025, { type: 'bandpass', freq: 900, q: 2 }, 0.25);
      break;
    case 'rim':
      osc(kit === 'taiko' ? 'triangle' : 'square', kit === 'taiko' ? 1420 : 1750, 0.038, 0.45, null, { type: 'bandpass', freq: kit === 'taiko' ? 1420 : 1750, q: 4 });
      break;
    case 'perc':
      osc('sine', kit === 'taiko' ? 1046 : 880, kit === 'taiko' ? 0.22 : 0.09, 0.5, (kit === 'taiko' ? 1046 : 880) * 1.4);
      break;
    default: break;
  }
  setTimeout(() => { try { out.disconnect(); } catch (e) { /* noop */ } }, 2500);
}
