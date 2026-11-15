# t3-audio handoff

## Contract
Kit code calls `env.audio?.play('<event>', { pos, gain })` inside `update(dt, t, env)` or its own onX callback. `env.audio` is `AssetRuntime.audio` (src/kit/audio.js); no sink = silent. Events (`KIT_AUDIO_EVENTS`): garden.shishi.clack, garden.chime.ring, lantern.kindle, shrine.bell.ring, water.stones.flow, water.float.bell, water.boat.pole, machiya.noren.brush, keepsake.collect, nest.settle. New events: add to BOTH src/kit/audio.js and dawCAT/src/sfx/kit-events.js (a dawCAT test fails if they differ).
Already applied here (granted): runtime.js `this.audio` + `_env.audio`; main.js `assetEnv()` sets `env.audio`.

## Game sink (Integrator, src/main.js, after `this.audio` is built and `this.assets` exists; optional, one block)
```js
// today's sounds for the moments the game already voices; the rest stay silent until a dawCAT pack is installed
this.assets.audio?.setSink((ev) => {
  const a = this.audio; if (!a) return;
  if (ev === 'shrine.bell.ring') a.playBell();
  else if (ev === 'nest.settle') a.playPurr();
  // keepsake.collect: main.js already calls playCollect on pickup; do not double-play
});
```
To use the dawCAT sounds instead: `import { kitPackModule }` in dawCAT, export `kitPackModule()` as src/sfx-pack.js, then in the sink call `playSfx(this.audio, ev.replace(/\./g,'-'), { gain })` (slug = event with dots as dashes).

## Per-family patches (family-owned files)
- garden (src/kit/garden/build.js): at the existing clack line (~133) add `env.audio?.play('garden.shishi.clack', { pos: g.position });` (keep onClack calls). Wind chime: when the clapper swing flips past a gust threshold (e.g. `env.wind > 1.4` with 0.8 s cooldown) `env.audio?.play('garden.chime.ring', { pos: g.position, gain: Math.min(1, env.wind / 3) });`
- lanterns: on `env.lanternOn` false->true per lantern, after its onset delay: `env.audio?.play('lantern.kindle', { pos: group.position, gain: 0.6 });` (throttle one per 0.15 s across lanterns in the sink if many).
- shrine (offering bells / ringBell): `env.audio?.play('shrine.bell.ring', { pos })` from ringBell; the game sink maps it to playBell, so today's sound is unchanged.
- water: stones `water.stones.flow` by cat proximity (<6 m, 2 s cooldown), float bells `water.float.bell` at wave-phase peak, boat pole `water.boat.pole` on the plant stroke.
- machiya noren: `machiya.noren.brush` when the cat passes within 0.5 m of the cloth plane (cooldown 1 s).
- keepsakes / nest: events exist for completeness; the game already plays collect/purr, so families should NOT call them while the sink maps them to the same sounds.
