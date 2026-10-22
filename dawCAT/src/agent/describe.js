/* dawCAT — human-readable one-liners for agent plan actions, shown on the
   chat's turn cards so people can see what the AI did without reading JSON.
   `names` maps ids to display names: { tracks: {id: name}, sfx: {id: name} }. */

function trackName(target, names) {
  if (!target || target === 'selection') return 'the selected track';
  const id = String(target).split(':')[0];
  return (names.tracks && names.tracks[id]) || id;
}

function sfxName(target, names) {
  if (!target || target === 'selection') return 'the selected sound';
  return (names.sfx && names.sfx[target]) || target;
}

const list = (v) => (Array.isArray(v) ? v.join(' ') : String(v));

const DESCRIBE = {
  setTempo: (p) => `Tempo → ${p.bpm} BPM`,
  setKeyScale: (p) => `Key → ${[p.key, p.scale].filter(Boolean).join(' ')}`,
  setSwing: (p) => `Swing → ${Math.round(p.swing * 100)}%`,
  setMaster: (p) => `Master → ${Math.round(p.volume * 100)}%`,
  setLoop: (p) => `Loop ${p.on === false ? 'off' : `bars ${p.start ?? '…'}–${p.end ?? '…'}`}`,
  setProjectInfo: (p) => `Project info: ${Object.keys(p).join(', ')}`,
  addTrack: (p) => `New ${p.kind || 'synth'} track “${p.name || (p.kind === 'drum' ? 'Drums' : 'Synth')}”${p.preset || p.drumKit ? ` (${p.preset || p.drumKit})` : ''}`,
  renameTrack: (p, t, n) => `Rename ${trackName(t, n)} → “${p.name}”`,
  deleteTrack: (p, t, n) => `Delete track ${trackName(t, n)}`,
  setTrackMix: (p, t, n) => `Mix ${trackName(t, n)}: ${Object.keys(p).join(', ')}`,
  setTrackPreset: (p, t, n) => `Sound of ${trackName(t, n)}${p.preset ? ` → ${p.preset}` : ''}${p.patch ? ' (tweaked)' : ''}`,
  addDevice: (p, t, n) => `Add ${p.type} to ${trackName(t, n)}`,
  setDeviceParams: (p, t, n) => `${p.type} on ${trackName(t, n)}: ${Object.keys(p.params || {}).join(', ')}`,
  removeDevice: (p, t, n) => `Remove ${p.type} from ${trackName(t, n)}`,
  addClip: (p, t, n) => `New clip${p.name ? ` “${p.name}”` : ''} on ${trackName(t, n)}${p.phrase ? ' (melody)' : p.grid || p.groove ? ' (drums)' : ''}`,
  setClipNotes: (p, t, n) => `Rewrite clip on ${trackName(t, n)}`,
  deleteClip: (p, t, n) => `Delete clip on ${trackName(t, n)}`,
  transposeClip: (p, t, n) => `Transpose ${trackName(t, n)} ${p.semitones > 0 ? '+' : ''}${p.semitones} st`,
  duplicateClip: (p, t, n) => `Duplicate clip on ${trackName(t, n)} ×${p.times || 1}`,
  moveClip: (p, t, n) => `Move/resize clip on ${trackName(t, n)}`,
  addChordProgression: (p, t, n) => `Chords ${list(p.chords)} on ${trackName(t, n)}`,
  addDrumPattern: (p, t, n) => `Drum ${p.groove ? `groove ${p.groove}` : 'pattern'}${p.bars ? `, ${p.bars} bars` : ''} on ${trackName(t, n)}`,
  setDrumRhythm: (p) => `Switch song drum rhythm → ${p.groove || 'custom pattern'}${p.drumKit ? ` (${p.drumKit} kit)` : ''}${p.syncTempo ? ' + match tempo' : ''}`,
  manipulateAudio: (p, t, n) => `Manipulate sample ${p.sampleId || trackName(t, n)} (${[p.stretch && p.stretch !== 1 ? `stretch ${p.stretch}x` : '', p.speed && p.speed !== 1 ? `speed ${p.speed}x` : '', p.pitchSemis ? `pitch ${p.pitchSemis > 0 ? '+' : ''}${p.pitchSemis}st` : '', p.reverse ? 'reverse' : '', p.loop ? 'loop' : '', p.bitcrush && p.bitcrush < 16 ? `${p.bitcrush}-bit` : ''].filter(Boolean).join(', ') || 'physics'})`,
  createSamplerTrack: (p) => `New playable Sampler track from ${p.sampleId || 'starter:koto-pluck'}${p.phrase ? ' + melody' : ''}`,
  addAutomation: (p, t, n) => `Automate ${p.param}${String(p.param).toLowerCase().startsWith('master') ? '' : ` on ${trackName(t, n)}`}`,
  addSfx: (p) => `New sound “${p.name || p.template || 'Untitled'}”${p.template ? ` (from ${p.template})` : ''}`,
  updateSfx: (p, t, n) => `Edit sound ${sfxName(t, n)}: ${Object.keys(p).join(', ')}`,
  deleteSfx: (p, t, n) => `Delete sound ${sfxName(t, n)}`,
  placeSfx: (p, t, n) => `Place ${sfxName(t, n)} at bar ${(p.start ?? 0) + 1}`
};

export function describeAction(action, names = {}) {
  const fn = DESCRIBE[action && action.type];
  if (!fn) return String(action && action.type || 'action');
  try { return fn(action.params || {}, action.target, names); } catch { return action.type; }
}
