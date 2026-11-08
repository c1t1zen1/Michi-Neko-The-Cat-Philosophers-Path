/* Original procedural instrument designs; no third-party recordings. */
export const INSTRUMENTS = [
  { id: 'koto', name: 'Koto · silk & kiri', family: 'string', decay: 2.6, brightness: .66, position: .18, body: 420, description: 'Fractional delay string, plectrum comb, kiri body and a gently settling pitch.' },
  { id: 'koto-muted', name: 'Koto · palm mute', family: 'string', decay: .65, brightness: .36, position: .23, body: 480, description: 'Damped strings and soft finger contact for intimate passages.' },
  { id: 'shamisen', name: 'Shamisen · bachi & sawari', family: 'string', decay: 1.1, brightness: .9, position: .11, body: 680, buzz: .18, description: 'Bright bachi attack, skin resonance and nonlinear sawari buzz.' },
  { id: 'biwa', name: 'Biwa · wooden storyteller', family: 'string', decay: 1.5, brightness: .55, position: .14, body: 310, buzz: .09, description: 'Low wooden body and restrained buzzing string.' },
  { id: 'shakuhachi', name: 'Shakuhachi · breath & bamboo', family: 'wind', breath: .23, vibrato: .006, attack: .12, description: 'Breathy attack, delayed vibrato, pitch scoop and uneven harmonic colour.' },
  { id: 'shinobue', name: 'Shinobue · festival flute', family: 'wind', breath: .12, vibrato: .003, attack: .045, description: 'Clear high register flute with breath accents.' },
  { id: 'sho', name: 'Shō · reed cloud', family: 'reed', attack: .45, description: 'Slow reed-like beating partials for modern ambient harmony; not an aitake transcription.' },
  { id: 'temple-bell', name: 'Bonshō · bronze modes', family: 'metal', decay: 5.8, ratios: [1, 1.51, 2.09, 2.56, 3.91, 4.32, 5.4], description: 'Inharmonic bronze modes with independently decaying partials and beating.' },
  { id: 'singing-bowl', name: 'Bowl · breathing bronze', family: 'metal', decay: 5, ratios: [1, 2.71, 4.91, 7.34], description: 'Paired detuned resonances and a soft felt strike.' },
  { id: 'furin', name: 'Fūrin · glass summer', family: 'metal', decay: 2.4, ratios: [1, 2.76, 5.4, 8.93], description: 'Sparse high glass modes with a bright suspended strike.' },
  { id: 'moku', name: 'Mokugyo · hollow wood', family: 'wood', decay: .21, ratios: [1, 1.47, 2.18, 3.8], description: 'Short wooden resonator and hollow body knock.' },
  { id: 'rhodes', name: 'Lantern tines', family: 'keys', decay: 2.8, description: 'Velocity-sensitive tine harmonics and warm bell attack.' },
  { id: 'felt-piano', name: 'Machiya felt piano', family: 'keys', decay: 2.1, description: 'Stretched damped partials and a quiet hammer transient.' },
  { id: 'warm-pad', name: 'Paper lantern pad', family: 'pad', attack: .7, description: 'Slow, dark stereo-friendly harmonic bed.' },
  { id: 'sub-bass', name: 'Kamo rounded bass', family: 'bass', decay: 1.2, description: 'Sine fundamental with a small warm second harmonic.' },
  { id: 'silk-lead', name: 'Silk & neon lead', family: 'lead', attack: .025, description: 'Rounded FM colour for restrained modern counterpoint.' }
];
export function instrumentPreset(id) {
  const def = INSTRUMENTS.find(x => x.id === id);
  if (!def) throw new Error(`Unknown instrument: ${id}`);
  return { kind: 'physical', model: id, gain: .62, attack: def.attack || .006, decay: def.decay || 1.8,
    sustain: ['wind', 'reed', 'pad', 'lead', 'bass'].includes(def.family) ? .7 : 0,
    release: .22, cutoff: 14000, res: .5, brightness: def.brightness ?? .6, body: .35,
    breath: def.breath ?? .12, vibrato: def.vibrato ?? .003, position: def.position ?? .2, buzz: def.buzz || 0 };
}
