# Game audio inventory

Reviewed 2026-11-08. Generated from the shipped game sources; game files were read only. Full method bodies, every call site and source SHA-256 values are in [GAME_AUDIO_CATALOG.json](GAME_AUDIO_CATALOG.json). A replacement candidate is a studio audition, not an installed override.

| Source | Sound / system | Call sites | New audition candidates |
|---|---|---:|---|
| [src/audio.js:91](../../src/audio.js#L91) | playUnlockChime | 1 | unlock-lantern |
| [src/audio.js:167](../../src/audio.js#L167) | playCollect | 1 | collect-koto |
| [src/audio.js:186](../../src/audio.js#L186) | startWindChimes | 1 | bell-furin |
| [src/audio.js:208](../../src/audio.js#L208) | startBirds | 2 | bird-uguisu |
| [src/audio.js:250](../../src/audio.js#L250) | playMeow | 2 | cat-greeting |
| [src/audio.js:267](../../src/audio.js#L267) | playPurr | 8 | cat-purr |
| [src/audio.js:289](../../src/audio.js#L289) | playTrill | 4 | cat-trill |
| [src/audio.js:309](../../src/audio.js#L309) | playHiss | 1 | cat-hiss |
| [src/audio.js:332](../../src/audio.js#L332) | playChirp | 2 | cat-chirp |
| [src/audio.js:348](../../src/audio.js#L348) | playLap | 3 | water-lap |
| [src/audio.js:383](../../src/audio.js#L383) | playBell | 5 | bell-collar |
| [src/audio.js:411](../../src/audio.js#L411) | playKeyChime | 4 | ui-confirm |
| [src/audio.js:430](../../src/audio.js#L430) | playDoorSlide | 3 | shoji-slide |
| [src/audio.js:452](../../src/audio.js#L452) | playEat | 1 | cat-eat |
| [src/audio.js:471](../../src/audio.js#L471) | playSquawk | 2 | bird-crow |
| [src/audio.js:492](../../src/audio.js#L492) | playSplash | 3 | water-splash |
| [src/audio.js:514](../../src/audio.js#L514) | playDreamChime | 8 | dream-moon |
| [src/audio.js:537](../../src/audio.js#L537) | playMonkChoir | 2 | choir-cloud |
| [src/audio.js:589](../../src/audio.js#L589) | playSingingBowl | 2 | bowl-stillness |
| [src/audio.js:621](../../src/audio.js#L621) | setSummitWind | 2 | wind-bamboo |
| [src/audio.js:664](../../src/audio.js#L664) | playFootstep | 1 | paw-grass, paw-wood, paw-stone, paw-water |
| [src/audio.js:703](../../src/audio.js#L703) | startAmbient | 1 | wind-bamboo |
| [src/audio.js:734](../../src/audio.js#L734) | startRain | 1 | rain-eaves |
| [src/hidden_places.js:633](../../src/hidden_places.js#L633) | playPoolDrop | 1 | water-drop |
| [src/hidden_places.js:655](../../src/hidden_places.js#L655) | playBambooKnock | 1 | bamboo-knock |
| [src/hidden_places.js:679](../../src/hidden_places.js#L679) | playLeafBreath | 1 | leaves-autumn |
| [src/music.js:196](../../src/music.js#L196) | playPadChord | 1 | Score ensemble / retained original |
| [src/music.js:214](../../src/music.js#L214) | playPluck | 1 | Score ensemble / retained original |

Footsteps have grass, wood, stone and water branches; water delegates to `playLap`. `startLapping` repeats `playLap` every 430 ms. Unlock chimes are a direct-to-destination audio-enable confirmation. Pool drops, bamboo knocks and leaf breaths are synthesized in `hidden_places.js`, outside `AudioManager`. Music has dawn/day/dusk/night definitions, scene moods (Overworld, Tea House, Summit), pad/pluck layers, echo and occasional bowl calls.

The source purr comment says approximately 27.5 Hz, but the actual multiplier is `55 * 2π`: its amplitude modulation runs at **55 Hz**. The new breathing purr uses 26 Hz. `playPurr`/`playSingingBowl` take duration arguments, so one rendered audition is not the whole API contract. `playFootstep` throttles at 0.28 s. These behaviours must be preserved in a future integration.

## Kit asset sound moments (Fable)

Kit files never import `src/audio.js`; they call `env.audio?.play(event, { pos, gain })` (`src/kit/audio.js`). dawCAT maps each event to a synthesized template and exports them through the usual zero-file `sfx-pack.js` (`kitPackModule()` in `src/sfx/kit-events.js`). Events with no shipped sound today are silent until the game installs a sink (see `docs/fable/handoff/t3-audio.md`).

| Event | Kit id | Moment | Today's game sound | dawCAT template | Audition |
|---|---|---|---|---|---|
| `garden.shishi.clack` | shishi | Bamboo tube tips back and knocks the anvil stone | none | `bamboo-clack` | bamboo-knock |
| `garden.chime.ring` | wind-chime | Clapper strikes the glass bell in a gust (furin) | AudioManager.startWindChimes (ambient wind chimes, no per-prop hook) | `furin-glass` | bell-furin |
| `lantern.kindle` | lanterns (all) | A lantern lights as dusk falls (per-lantern onset) | none | `lantern-kindle` | fire-lantern |
| `shrine.bell.ring` | offering-bells / shrine bells | Cat reaches an offering bell; ringBell | AudioManager.playCollect + playBell (src/main.js collectible pickup) | `bell` | bell-suzu |
| `water.stones.flow` | river stones / weirs | Water passes over stones and kame-ishi (looped bed at distance) | none per prop (river ambience in AudioManager) | `stream-over-stones` | river-bed |
| `water.float.bell` | float bells | A river float bell rocks on the current | none | `float-bell` | bell-collar |
| `water.boat.pole` | boat pole | Pole is planted in the bed | none | `pole-plant` | water-lap |
| `machiya.noren.brush` | noren | Cloth parts as the cat passes through | none | `noren-brush` | cloth-rustle |
| `keepsake.collect` | keepsakes | A keepsake is picked up | AudioManager.playCollect | `collect` | collect-koto |
| `nest.settle` | nest | Cat settles into the nest | AudioManager.playPurr (rest spots) | `purr` | cat-purr |
