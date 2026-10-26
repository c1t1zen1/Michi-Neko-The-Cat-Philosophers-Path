# The Roof Road (屋根道) — design

**Date:** 2026-10-24 · **Status:** design + playable greybox (`rooftops/`), live as a sandbox at `kyoto-rooftops.html`; not yet wired into the game
**Research:** `docs/ROOFTOPS_RESEARCH_2026-10-24.md`

## 1. What was asked, and what I assumed

**Asked:** a new rooftop scene made of the buildings out past the bridge. It is
unlocked in a particular way, like the shrine-bell passage where the vegetation
opens and the cat walks through. The cat jumps from rooftop to rooftop as a side
scroller, with a few twists and turns. Research the inner parts of Kyoto first,
lay out the ideas, then push.

**Assumed** (correct any of these):

* "Past the bridge" means the south end of the valley's river bridge, where the
  cobbled path stops at z≈34 and the ramp runs into the mountain rim at z≈37.
  Nothing is there yet.
* The design and build were done in one pass without stopping for review, because
  you asked for the work to be finished and pushed. §11 lists the decisions I'd most
  like you to check.
* "Inner Kyoto" means the dense old town inside Hideyoshi's earthen wall:
  *rakuchū*, west of the Kamo. Gion and Higashiyama, east of the river, are
  saved for a second run (§10).
* This pass delivers the research, this design and a **playable greybox lab**. It
  makes **no changes to the running game**: no edits to `countryside.js`,
  `main.js` or the summit files. The in-game gate and transition are specified in
  §8.2 for the next pass.
* The house rules hold: no fail states, no combat, no timers, soft optional
  guidance, painterly procedural textures only.

## 2. Pitch

The valley bridge is the game's Sanjō Ōhashi, the old end of the Tōkaidō. Past
it, an earthen bank crowned with bamboo, the Odoi, closes the way into the old
city. Walk the bridge railing post to post and the seven posts answer with seven
rising notes. The bamboo on the bank parts, lanterns show beyond it, and the cat
pads through a noren into **rakuchū**.

The camera swings side-on and the game becomes a 2.5D run over the roofs of the
inner city. It is one late-summer afternoon that becomes festival night. It goes
through seven *mouths*, each a real place: the bridge gate, Pontochō, the Takase
canal, the Nishiki canopy, the laundry decks, the Gion Matsuri float streets, and
the top of a festival float. At the top, the five Okuribi fires kindle one by one
on the mountains. The run turns corners wherever Kyoto's grid does.

## 3. Where it sits, and the guardrails

| Guardrail | How the Roof Road keeps it |
|-----------|----------------------------|
| No fail states | The street is always underneath, and the Takase is 30 cm deep. A missed jump lands the cat in the street, never off the world. Every metre of street has a climb-back within 12 m, and the test proves it (§9) |
| No timers | The sky advances with **distance along the route**, not seconds. Standing still stops time |
| No combat | Nothing chases you. The guide cat Chidori waits for you |
| Guidance stays soft | Only a title card per mouth and a strip of the seven mouths' kanji, both optional (the `H` key hides them) |
| Painterly, no downloads | Every surface uses the game's procedural `src/textures.js` sets (kawara, plaster, wood, namako, shoji) |
| Deepen Kyoto, don't expand | It's the same city the valley belongs to, reached through the valley's own bridge. A pocket scene like the summit, not new open map |

## 4. The unlock: the Seven Posts

* The bridge already has seven railing posts per side (`buildRiverAndBridge`, posts
  at local z = −4…4) and walkable railings (deck + 0.66 m).
* Each post gets a small bronze **giboshi** cap. A clay **Shōki** figure sits on the
  south-end post, looking *along* the east railing. That is the only hint, and it
  is wordless. Shōki figures are placed so they never stare at each other, so this
  one looks at the rail.
* Walk the east railing from the north end to the south end without stepping off.
  As the cat passes each post, that giboshi warms to a glow and plays the next note
  of a rising pentatonic scale. Step off and the glows fade back: a quiet reset, no
  penalty. There's no time limit.
* On the seventh note, the bamboo on the Odoi bank south of the ramp leans apart
  over about 3 s. The animation and timing are the same as the shrine thicket's
  `setShrineThicketOpen(t)`. A toast reads "✦ The bamboo on the old earthen wall
  parts — lanterns beyond ✦", and the journal gets a *places* entry. It's saved
  (`worldFlags.rooftopsUnlocked`).
* Walking into the gap plays the transition: an indigo **noren** with a 洛 mark
  sweeps across the screen (CSS, like the summit veil), and the cat arrives on the
  far bridge in the pocket.

The unlock is gated on noticing, not on quests. It's open from the start of the
game, like the summit bell.

## 5. The run: seven mouths

The route is one polyline (the *rail*) with three right-angle turns filleted at
2.5 m. The arc-length parameter `s` runs 0 → 336.8 m. Every turn bends *away* from
the camera, so the route spirals inward and the camera always rides the outside of
a corner. A corner on the camera side would swing the camera across the inside and
put the corner house between it and the cat. Collision lives in (`s`, `y`); the
depth of what you stand on is visual only (§7.2). The code is the source of truth
for the numbers: `rooftops/js/level.js`.

```
 top-down, pocket frame (−z up)                ① Awataguchi — bridge, kido gate, first shops
                                               ② Pontochō   — narrow lane, roofs both sides, yuka decks
      ④ Nishiki ◄══════════ (turn 2) ◄═══╗     ③ Takase     — shallow canal, drifting takasebune
   (turn 3)  ⑤ Monohoshi                 ║     ④ Nishiki    — the long canopy
      ║                                  ③     ⑤ Monohoshi  — drying decks, futons, kura
      ⑥ Hoko-chō                         ║     ⑥ Hoko-chō   — lantern racks, plank to the float
      ▼  ⑦ float top (the run turns      ②     ⑦ Okuribi    — the five fires
         vertical; the fires burn on     ║
         the hills to the right)         ║
                                         ║ (turn 1)
   ① ════════════════════════════════════╝
   (bridge, from the valley)          camera: always outside the spiral
```

| # | Mouth | s | Surfaces | What it teaches / the twist | Shōki |
|---|-------|---|----------|----------------------------|-------|
| ① | **粟田口 Awataguchi** — the Mouth | 0–51.4 | Detailed Sanjō-style bridge (1.1 m) over animated Kamo water, gravel shoals, dressed banks and cutwater piers; four giboshi caps (1.95), kido-gate roof (2.45), a lantern-lit roji garden, one- and two-storey machiya, the first corner deck (3.4) | Run, jump, tap vs hold, the ledge guard (the cat stops and peers over), climb-backs from the street | On the first shop's eave |
| ② | **先斗町 Pontochō** — the Narrow Lane | 51.4–122 | River-side and far alley rows; seven low yuka decks (1.4); eleven crooked engawa, awnings and alley bridges (2.1–2.7); two chidori lantern lines (3.3); a stepped pair of kura (3.7 → 5.4); animated Kamo water | **Three-layer zigzag**: trade continuously among yuka, façades/alley balconies and broken ridgelines. Missed jumps become a lower route, and all roads rejoin at the kura | Far-row ridge |
| ③ | **高瀬川 Takase** — the Water Maze | 122–164.4 | A 31 m animated canal with dressed banks and towpath; nine wet stepping stones; a drifting cargo **takasebune** with boatman, rice bales and wake; an arched footbridge and two landings; five cherry boughs plus a haul rope | **Three complete roads**: rhythmic stones and safe water below, boat and bridge between, sprinting cherry branches above. They cross and rejoin instead of punishing a miss | Far-bank hisashi, under a cherry |
| ④ | **錦 Nishiki** — the Long Canopy | 164.4–229.6 | Three fast canopy runs (5.0) split by two broad open skylights; lowered timber crossings (3.84–3.92) swap depth through each opening; vents, covered shops and crate climb-backs below; fishmonger's drying deck (5.0) | **Speed with decisions**: race each roof segment, drop through the skylights, cross the arcade and climb back. The route repeatedly changes both height and depth | Fishmonger's hisashi at the canopy's end |
| ⑤ | **物干し Monohoshi** — Laundry Sky | 229.6–289.3 | Drying decks (5.0), two low futon-rack bounce routes, two laundry poles (5.5), a rooftop cistern (6.1), tall kura (6.7 → 7.8), chimney cap (6.05), climb-back balconies and a one-storey dip | **Layer exchange**: bounce up from street-level futons, prowl the washing line, then chain cistern, kura and chimney across the high skyline | On the kura ridge |
| ⑥ | **鉾町 Hoko-chō** — Festival Streets | 289.3–336.8 | Five distinct yatai roofs, two three-tier lantern racks, two lantern balance lines, merchant roofs and the *kaisho* plank; then the wheeled, brocade-draped **hoko float** (deck 3.6 → perch 9.1), temple gate and wall | **Festival maze to vertical finale**: stalls and racks weave low and middle roads before the route climbs the animated float one generous step at a time | Kaisho ridge |
| ⑦ | **送り火 Okuribi** — the Sending Fires | float roof, y > 6.4 | The perch on the shingi pole (9.1) | Sit. The finale (§5.1) | Temple-gate ridge (a running jump off the float's eave) |

### 5.1 The finale

Reaching the perch locks input. The cat sits, Chidori sits beside it, and the
camera pulls back behind the cat and turns toward the hills. The five fires light
in order, about 1.6 s apart in the lab: 大 Daimonji, 妙法 Myōhō, 船形 Funagata,
左大文字 Hidari-Daimonji, 鳥居形 Toriigata. The order follows Wikipedia; sources
differ on the middle two. The glyphs are drawn from a Mincho font and sampled into
flickering points. A card reads **屋根道 The Roof Road**, with the Shōki count. In the
lab the card offers *Run it again*, *Stay a while* and *Back to the valley*. In the
game a paper lantern drifts past instead, and following it returns the cat to the
valley side of the bridge.

The real festivals are a month apart: Yoiyama is in July, the Okuribi on 16 August.
Holding both on one night is a deliberate dream, like the summit's compressed view
of the bay.

## 6. Twists and turns

1. **The grid turns.** Three right-angle turns where Kyoto's streets meet. The
   camera swings round the corner on the rail's normal, so the city wheels past.
2. **Depth zigzag.** In Pontochō the river-side row keeps breaking, so the cat hops
   up across the alley to the far row and drops back. One collision plane, but the
   cat visibly leaps *across* the lane.
3. **High road / low road.** Roofs or yuka decks, canopy or market. They always
   rejoin, and the high road holds the Shōki.
4. **The water maze.** Takase has three complete routes: stepping stones and safe
   water, the moving takasebune and footbridge, or the high cherry-bough sprint.
5. **The broken speed run.** Nishiki opens the gallop, then two skylights ask for
   quick drops, depth swaps and climbs back onto the next canopy segment.
6. **The bounce.** Low futon racks fling the cat into Laundry Sky; the cistern,
   kura and chimney carry the route above the washing poles.
7. **The balance.** Laundry poles force a prowl. The cat lowers itself and its tail
   streams out.
8. **The turn to vertical.** The last mouth stops scrolling sideways and climbs.
9. **Afternoon into night.** The sky turns gold over Nishiki, dusk on the laundry
   decks, lantern night in the float streets. It's driven by progress, so it's yours.
10. **The guide cat.** **Chidori**, a small grey-and-white Pontochō cat named for the
    plover lanterns. She waits at perches and hops ahead when you come near.
    (*Chidori-ashi* is a weaving, zigzag gait, and she zigzags the alley.)

## 7. Mechanics

### 7.1 Movement (identical to `src/player.js`)

| Constant | Value | Effect |
|----------|-------|--------|
| Run | 4.5 m/s | Default pace (A/D, ←/→) |
| Sprint | ×1.7 = 7.65 m/s | Shift held |
| Jump | 7.2 m/s, gravity −20 | 1.30 m apex |
| Fall / early release | gravity ×1.4 / ×1.7 | Snappy fall, short hops on a tap |
| Coyote / buffer | 0.12 s / 0.15 s | Forgiving edges |
| Ledge guard | No walking off a drop > 0.55 m | Hold ↓/S (or jump) to leave on purpose |
| Step-up | ≤ 0.3 m | Ridge stacks and kerbs don't need a jump |
| **Mantle** (new) | Feet within 0.35 m below a ledge top, moving toward it | Pulls up. Effective reach 1.65 m |
| **Futon** (new) | Landing sets vy = +8.6 | ≈ 1.85 m extra bounce height |
| **Pole / rope** (new) | Thin platform → prowl at 0.45× speed | No balance meter, just slower |
| **Canopy** (new) | Low friction: speed eases instead of snapping | Momentum feel; never pushes you off |
| Water | 0.55× speed, `inWater` gait | The Takase |

Reach this gives (used by the test): flat gap 3.0 m running, 5.1 m sprinting;
+1 m rise 2.3 / 3.9 m; −2 m drop 3.8 / 6.5 m. Main-route gaps are kept at
≤ 80 % of the *running* reach, except gaps marked `sprint`.

### 7.2 Depth

Each platform carries a depth `d` along the rail normal (+ toward the camera). The
façade line is 0. The street is +2.2 (the Pontochō riverbank +4.0, the canal +3.0),
yuka decks +2.4, a one-storey eave +0.45, a hisashi +0.7, a ridge −2.5. In Pontochō
the lantern lines hang over the alley at −3.9, and the alley row's eave and ridge
are at −4.25 and −6.9. The cat's depth eases toward the `d` of what it stands on,
or of the platform below it while airborne. That keeps the 2D collision exact and
makes the 3D picture read right.

Building walls are one-way (they block entering a taller house from the side, never
leaving it) and carry a depth band. A cat on the street or a façade-front eave walks
past them; a cat at ridge depth bumps into them.

### 7.3 Controls

| | Desktop | Touch |
|-|---------|-------|
| Move | A/D, ←/→ | Left thumb drag |
| Jump (hold = higher) | Space, W, ↑ | Big right button |
| Sprint | Shift | Drag far (past ~110 px) |
| Drop / leave a ledge | S, ↓ | Small right button |
| Back to last lantern | R | — |
| Hide guidance | H | — |

Lantern checkpoints sit at each mouth's start. R is a convenience, never needed.

### 7.4 Soundscape

The lab downloads no audio. After the first keyboard, controller or touch gesture,
Web Audio starts two tiny shared-noise layers: river sound rises through Awataguchi,
Pontochō and Takase (and close to the water), while roof wind rises with height and
progress. Paw sounds change among water, timber, tile and stone without allocating a
fresh noise buffer per step. Dusk adds sparse insect chirps; Hoko-chō adds a very
distant festival drum beneath the five finale drums and chimes. Mute suspends the
audio context, and pause fades the ambience bus instead of leaving it running.

## 8. Architecture

### 8.1 Now (this pass): `rooftops/`, a lab like `grass/`

```
kyoto-rooftops.html the entry point at the repo root: page shell, import map,
                    file:// guard, HUD markup; loads rooftops/js/game.js
rooftops/
  index.html        forwards to ../kyoto-rooftops.html, keeping ?flags
  style.css         HUD + touch controls
  package.json      {"type":"module"} so Node can import the pure modules
  serve.cmd         Windows helper (python http.server, opens the page)
  js/rail.js        polyline + fillets → pointAt(s), tangentAt(s), normalAt(s)      [pure]
  js/level.js       the seven mouths as pieces → platforms, walls, pickups, perches [pure]
  js/physics.js     the runner: player.js constants + mantle/futon/rope/canopy     [pure]
  js/reach.js       jump-reach maths + platform graph                              [pure]
  js/autopilot.js   drives the runner along the route (the test and ?auto=1)       [pure]
  js/build.js       Three.js meshes for every piece (uses ../../src/textures.js)
  js/sky.js         sky dome, sun/hemi/fog by progress, hills ring, the five fires
  js/atmosphere.js  petals, smoke, birds, motes, fireflies and pooled impact effects
  js/game.js        loop, input, real Cat + Chidori, camera, audio, HUD, finale, flags
tools/rooftop_test.mjs   node test: rail, level, reachability, climb-backs, physics, a full autopilot run
```

The pure modules import nothing from three, so the same code runs in the page and
under Node. The lab's `../../src/cat.js?v=` and `../../src/textures.js?v=` imports
carry the cache tag (bump them with the others, like the Grass Lab's). Physics runs
at a fixed 120 Hz in the page and in the test, so the autopilot's proof holds for
the page.

URL flags: `?at=<s>` start at a route position, `?mouth=<1-7>` start at a mouth's
lantern, `?hour=<0-1>` force the sky phase, `?finale=1` start on the perch,
`?auto=1` let the autopilot run it (an attract mode), `?debug=1` draw the platform
lines (route in red) and walls, `?cat=0` keep the stand-in capsule, `?shadows=0`,
`?shot=1` keep the drawing buffer for captures, `?nohud=1` hide the HUD. Console
hooks for captures: `roofRoad.at(s)`, `roofRoad.jumpToMouth(n)`,
`roofRoad.skipFinale()`; `roofRoad.audio` exposes the live sound state for QA.

**Soft launch.** The lab is merged to `main` as new files only, behind its own
entry point, `kyoto-rooftops.html`. GitHub Pages serves it next to the game, but
the game's `index.html` and `src/` don't change and don't link to it. That is the
usual way to try an unfinished feature in production without exposing it. Pages
builds one site from one branch, so preview builds per branch would need an
Actions workflow this repo doesn't have. Work toward §8.2 continues on the
`roof-road` branch and lands through a pull request when the game wiring is
ready.

### 8.2 Next pass: into the game

| Piece | Where | Notes |
|-------|-------|-------|
| Giboshi caps + Shōki on the bridge | `Countryside.buildRiverAndBridge()` | Static. Caps keep their own material, so the glow can animate (protected from `_mergeStatics`) |
| Odoi bank + bamboo thicket | new `Countryside.buildOdoiThicket()` | Its **own** `mulberry32(0x0D01)`: no new `this.random()` draws, so the seeded valley layout doesn't shift. Registers `vegetationExclusions` and colliders. `setOdoiThicketOpen(t)` mirrors `setShrineThicketOpen` |
| Seven Posts trigger | `RooftopManager.update()` (valley side) | Reads the player on the east railing platform (x = −1 + 1.24 ± 0.21, y ≥ 1.6) and the post z values |
| `RooftopManager` | new `src/rooftops.js` | Shaped like `SummitManager`: `setUnlocked`, `enter` (noren veil), `exit`, `setActive` (hides the valley, takes the camera), `update`. Pocket origin `(0, −2400, 0)` |
| Runner | `src/rooftop_level.js`, `src/rooftop_physics.js` | The lab's pure modules, moved verbatim. While active, the manager drives the player mesh and `cat.update`, and `Player.update` is skipped (like the summit's `cameraActive`) |
| Save | `worldFlags.rooftopsUnlocked`, `rooftopShoki` (7-bit mask), `rooftopFinished` | Never save a pocket position: a reload during the run puts the cat on the bridge's south ramp |
| Journal / XP | `discover('places', …)`, `progression.addXP` | Each Shōki is a keepsake. The finale is a *quiet moment* |
| Music / audio | `music.setScene('Rooftops')`, `audio.playBell` for the posts | |
| `index.html` | the noren veil element + CSS | The summit UI is owned elsewhere. Add a sibling element, don't touch `#summit-transition` |

## 9. Testing

* `node tools/rooftop_test.mjs` (38 checks, all passing on 2026-10-25), pure and fast:
  1. The rail is continuous, arc length is uniform, tangents are continuous through
     the fillets.
  2. Every platform has s0 < s1. Every piece sits on one straight leg, except
     corners and the street/canal ribbons, which follow the rail. The street runs
     under every metre of the rail.
  3. **The finale is reachable from the start** through the jump graph built from
     the §7.1 physics.
  4. **No soft-locks:** the finale is reachable from *every* platform.
  5. **Climb-backs:** from any metre of street or canal, within 12 m there is a
     platform that reaches the finale without touching the street again.
  6. Consecutive route platforms fit the strict budget: 80 % of the running reach
     with no mantle, and straight-up climbs within the bare apex plus the 5 cm
     landing tolerance. Gaps marked `sprint` use the sprint reach.
  7. All seven Shōki sit on a reachable platform. Each mouth's lantern checkpoint
     stands inside that mouth and on a surface, and the mouths tile the rail.
  8. Physics unit checks: the held-jump apex (1.30 m), the ledge guard and ↓, a
     1.55 m mantle, the futon bounce (≈1.85 m).
  9. **The autopilot runs the whole route** on the real physics (boat, canopy vents,
     futon, the float climb) and reaches the perch **without touching the street or
     the canal**. That ties the runtime physics to the analytic reach.
  10. The three-layer district signatures stay intact: Takase's stones/boat/bridge/
      boughs, Pontochō's decks and balconies, Nishiki's split canopy, Laundry Sky's
      low and high roads, Hoko-chō's stalls and lantern ascent, and at least 35
      visible depth changes on the main route.
  11. Mobile and desktop interface contracts remain wired: analog touch pad,
      separate jump/drop actions, safe-area/coarse-pointer CSS, labelled guidance,
      sound, recovery and pause controls, and an accessible pause dialog.
* `node --input-type=module --check < file` for every `rooftops/js/*.js`.
* Headless Chromium + SwiftShader captures (scratch harness, as for the Grass Lab)
  of all seven mouths and the finale, with no page errors, failed requests or
  console warnings. In the page, `?auto=1` moved the cat from s = 2 to s = 17 over
  the bridge caps and kido gate in 40 frames, and the HUD (title card, strip, hint)
  rendered. The README's `docs/images/capture-roof-road.jpg` comes from these
  captures.

## 10. Later (out of scope now)

* **East-side run, rakugai:** Gion Shirakawa (willow boughs as swings, the Tatsumi
  bridge), bengara teahouses on Hanamikoji, the Sannenzaka stair roofs down past
  the Yasaka pagoda. It ends on the **stage of Kiyomizu**: "to jump from the stage"
  means to take the plunge, and the cat does, into cherry canopy. There's no fall
  damage, ever.
* **Kamo delta:** the turtle and plover stepping stones as a hop line, with a nod
  to Larry the turtle.
* **Rain variant:** wet kawara and canopy become slides, and puddles hold lantern
  reflections.
* **Nishijin night:** loom clatter from the workshops below as a rhythm track.
* **Real Shōki variety:** sculpt several poses; save which ones were greeted.

## 11. Open questions for you

1. Is the **Seven Posts** railing walk the unlock you want? Alternatives: ring the
   finished Offering Bells at the bridge, or only at dusk.
2. One continuous run (≈5–8 min), or a hub where each mouth is entered separately?
3. Should Chidori become a valley villager afterwards, with a `PERSONALITIES` entry?
4. In-game, should the finale always be night, or follow the real clock?
</content>
</invoke>
