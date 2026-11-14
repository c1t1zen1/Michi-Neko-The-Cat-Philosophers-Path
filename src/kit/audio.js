// Kit audio hook (T3.3). Kit assets never import src/audio.js; they call
//   env.audio?.play('<event>', { pos, gain })
// from update(dt, t, env) (or from an onX callback they own). The game (or a
// dawCAT sfx-pack) installs a sink with setSink(fn); until then play() is a
// silent no-op, so classic and un-wired boots are unchanged.
// Event names are the contract shared with dawCAT/src/sfx/kit-events.js
// (a dawCAT test asserts both lists are identical).
export const KIT_AUDIO_EVENTS = Object.freeze([
  'garden.shishi.clack',
  'garden.chime.ring',
  'lantern.kindle',
  'shrine.bell.ring',
  'water.stones.flow',
  'water.float.bell',
  'water.boat.pole',
  'machiya.noren.brush',
  'keepsake.collect',
  'nest.settle'
]);

export function createKitAudio() {
  let sink = null;
  const known = new Set(KIT_AUDIO_EVENTS);
  return {
    events: KIT_AUDIO_EVENTS,
    /** fn(event, { pos, gain }) or null. Returns the previous sink. */
    setSink(fn) { const prev = sink; sink = typeof fn === 'function' ? fn : null; return prev; },
    get hasSink() { return !!sink; },
    /** Fire-and-forget. Unknown events and a throwing sink are ignored (audio must never break a frame). */
    play(event, opts) {
      if (!sink || !known.has(event)) return false;
      try { sink(event, opts || {}); return true; } catch (e) { return false; }
    }
  };
}
