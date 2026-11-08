# Deep Analysis Review — Michi-Neko (2026-11-08)

A whole-repo study: the main game (`index.html` + `src/`), the Labs (`labs/`),
the two companion apps (`cadJS/`, `dawCAT/`), the Roof Road prototype
(`rooftops/` + `kyoto-rooftops.html`), the verification tooling (`tools/`),
and how the parts interoperate. Read-only — no code was changed.

> **Note on timing:** this review was taken while two work streams were
> *actively in flight* in the working tree — the Labs build-out
> (`docs/superpowers/specs/2026-11-08-labs-build-out-design.md`) and a new
> dawCAT "library + live-MIDI" feature. `git status` gained new modified files
> during the analysis itself. Findings reflect the tree as of the run below;
> treat in-flight areas as moving targets.

## Verification scorecard (all run fresh on this machine, 2026-11-08)

| Suite | Scope | Result |
|---|---|---|
| `node tools/check_syntax.mjs` | All `src/*.js` ES modules | **37/37 OK** |
| `node tools/verify.mjs` | Syntax + static wiring + summit state machine + `index.html` markup | **All pass** (70 summit + 24 wiring + 10 markup) |
| `node tools/summit_test.mjs` | Headless `mountaintop.js` state machine | **70/70** |
| `node tools/interiors_test.mjs` | Interiors lab physics/layout invariants | **28/28** |
| `node tools/ranges_test.mjs` | Ranges lab terrain/profiles/impostor | **19/19** |
| `node tools/rooftop_test.mjs` | Roof Road rail/level/physics/reachability/autopilot | **38/38** |
| `node tools/labs_check.mjs` | Lab syntax, cache tags, registry sanity | **All OK** |
| `cd dawCAT && npm test` | 13 suites over agent/sfx/engine/state | **160/160** |
| `cd cadJS && npm test` | catalog + agent-protocol + asset-package | **15/15** |
| `cd cadJS && npm run check` | Module-load + tests | **FAILS on macOS/Linux** — hangs forever (see §5) |

Browser-rendered sheets (`tools/*_preview.html`, the grass captures, the
`__boot.html` full-game boot, the out-of-repo Playwright suites in
`/tmp/michi-test/`) were not re-run — the last clean full boot is documented
2026-10-23.

---

## 1. Executive summary

**This project is in unusually healthy shape for a self-described early
alpha.** Zero `TODO`/`FIXME` markers exist in shipped code; nearly every
README and checklist claim verifies against the implementation; the static
verification suite is broad and *green today*. The codebase's weak points are
not stubs — they are **small verified bugs, process gaps (cache tags, doc
drift), missing-input coverage (gamepad/remap), and two big items of
unfinished business**: the 14 unbuilt labs of the current build-out, and the
never-integrated Roof Road.

Headline findings, ordered by how much they should concern you:

1. **Two in-flight efforts are mid-flight and uncommitted.** The Labs
   build-out has its new shared kit and one finished-but-unpublished lab
   (`shrine`); dawCAT has a new `src/library/` feature landing. Whoever picks
   this up next inherits a dirty tree.
2. **cadJS has three real, verified bugs** — a dead name-resolution path that
   silently misdirects AI-agent edits, a subdivide edit that never persists
   to the game, and an `npm run check` that hangs on every non-Windows
   machine. Details in §5.
3. **The main game has three small confirmed defects**: a HUD line that
   displays the literal word "desktop"/"mobile" instead of the controls
   cheat-sheet, Esc in photo mode that both exits photo mode *and* opens the
   pause menu, and a startup-calibration cache that is written but never
   read. Details in §2.
4. **Cache-tag drift**: `src/` + `index.html` + `labs/shared/game.js` are on
   `20261107a`; `tools/*_preview` and `rooftops/` still carry `20261106a`;
   `AGENTS.md` still documents `20261106a`. The manual-bump step failed
   exactly where `AGENTS.md` warns it would.
5. **The only truly missing feature is input breadth** — no gamepad, no
   remapping, no left-handed touch layout. Honestly flagged 🔲 in the README,
   but it is the game's largest unbuilt surface area.
6. **Main-game verification has a structural gap**: every automated suite
   tests modules, labs, or the summit — nothing exercises the main loop,
   save/load round-trip, quest flow, or controls except a 15–20 min manual
   headless boot last run two weeks ago.

---

## 2. The main game — `index.html` + `src/`

**Scale:** 37 ES modules, ~27,100 LOC in `src/` + 957-line `index.html`.
Three.js r160 via unpkg import-map, no build step, seeded deterministic
world, Web Audio synthesis for all sound, localStorage saves.

### 2.1 Module map and maturity

| Module | LOC | Job | State |
|---|---|---|---|
| `main.js` | 1,887 | `Game` class: renderer+composer, system wiring, frame loop, photo mode, adaptive perf | Solid; monolithic — see risks |
| `countryside.js` | 3,772 | Seeded valley builder (terrain, river, village, shrine, paddies, lanterns) | Solid; `this.random()` ordering is load-bearing |
| `mountaintop.js` | 4,127 | Summit clearing (天上), bell unlock, veils, meditation | Solid — **owned by a separate effort; don't edit** |
| `cat.js` + `cat_anatomy` + `cat_sdf` + `cat_motion` + `cat_shading` | ~3,800 | Sculpted/skinned cat: SDF body, leg-IK gait, painted coat/face, collar+bell | Solid — flagship quality |
| `grass.js` | 1,752 | Lab grass recipes as LOD rings, `BiomeMask`, GPU spring/trail physics | Solid |
| `foliage.js` | 1,775 | Shared painterly canopy shader (sprays vs masses), wind, rustle | Solid |
| `sky.js` | 802 | Sky dome, 24 h cycle, weather states, env-map rebake | Solid |
| `vegetation.js` | 799 | Tree/meadow placement; paints the `BiomeMask` | Solid |
| `textures.js` | 856 | Procedural 256 px PBR textures + normal maps | Solid; new materials must join `MAT` |
| `particles.js` | 528 | Pooled instanced rain/snow/petals/fireflies/ripples | Solid |
| `ambient_life.js` | 711 | Sparrows, butterflies, koi, crows | Solid |
| `npc.js` | 362 | Luna/Mochi/Kuro personalities, schedules, greetings | Solid |
| `context_actions.js` | 856 | ~15 interaction verbs + rest spots + stillness moments | Solid |
| `interior.js` | 538 | Tea House pocket scene | Solid |
| `hidden_places.js` | 727 | Moon Pool + Lantern Glade | Solid |
| `audio.js` | 821 | Synthesized SFX set, buses, gesture unlock, ambient crossfade | Solid |
| `music.js` | 273 | Generative day-phase director, `SCENE_MOODS` | Solid |
| `player.js` | 634 | Third-person controller: jump buffer/coyote/variable, prowl, wading, camera collision | Solid |
| `controls.js` | 261 | Keyboard / mouse-drag / touch joystick + buttons | **Partial** — no gamepad; `#mode` bug below |
| `quest.js` | 48 | Single active quest, collect counting | **Deliberately minimal** — no multi-quest/abandon |
| `dialogue.js` | 115 | DOM typewriter box | Solid (simple) |
| `progression.js` | 64 | 5 ranks, XP, rank effects | Solid |
| `waypoints.js` | 174 | Screen markers, distance labels, compass strip | Solid |
| `scent.js` | 141 | Instanced wisp trail, gated near objectives | Solid |
| `settings.js` | 103 | Comfort/accessibility set, quality resolver | Solid |
| `ui.js` | 229 | HUD parchment, toasts, prompt, F3 debug | Solid (one bug below) |
| `menus.js` | 193 | Title/pause/settings, save export/import | Solid |
| `save.js` | 148 | v2 schema + backup + migration + validation | Solid |
| `collider_grid.js` | 100 | Uniform-grid queries | Solid |
| `instanced_chunks.js` | 156 | Spatial chunking for culling | Solid |
| `postfx.js` | 636 | AO pass, atmosphere pass, grade shader | Solid |
| `cad_overrides.js` | 125 | Applies `cad-overrides.json` at boot | Solid |
| `bootstrap.js` | 80 | `file://` guard, deferred engine load | Solid |

### 2.2 Controls — complete inventory

**Keyboard** (`controls.js`, `main.js`, `menus.js`, `ui.js`):

| Input | Action | Where |
|---|---|---|
| `WASD` / arrows | Move (camera-relative) | `controls.js:249-252` |
| `Shift` | Sprint | `controls.js:258` |
| `Space` | Jump (hold = higher) / advance dialogue | `controls.js:37-44` |
| `E` | Context action / advance dialogue | `controls.js:45-52` |
| `M` | Meow | `controls.js:53` |
| `C` | Prowl toggle | `controls.js:57` |
| `P` | Photo mode | `main.js:351` |
| `Enter` | Capture PNG (photo mode) | `main.js:355` |
| `J` | Discovery journal | `main.js:1530` |
| `Esc` | Pause/resume, close settings, exit photo | `menus.js:32`, `main.js:359` |
| `F3` | Debug overlay | `ui.js:56` |

**Mouse:** drag orbits (sensitivity/invert-Y settings apply); photo mode has
its own orbit + wheel zoom (`main.js:363-373`).

**Touch:** virtual joystick (deadzone 0.12, smoothstep), push-to-edge sprint,
double-tap careful-pace toggle, canvas-swipe look, JUMP/ACT/MEOW buttons.

**Missing (all honestly flagged 🔲):** gamepad (zero `getGamepads`
references), input remapping, left-handed touch layout, prowl/pause buttons
on touch.

### 2.3 Confirmed defects

1. **HUD controls line is overwritten** — `Controls` calls
   `ui.setMode('desktop'|'mobile')` at construction (`controls.js:23-24`);
   `ui.setMode` writes the literal string into `#mode` (`ui.js:146`), which
   `index.html:786` seeded with `"WASD + Space, E: Act, M: Meow, C: Prowl"`.
   The parchment's mode line ends up showing the word "desktop" — cosmetic,
   user-visible whenever the scroll is unrolled.
2. **Esc double-fires in photo mode** — the photo-mode Esc handler
   (`main.js:359`) and `MenuSystem`'s Esc handler (`menus.js:32-37`) are
   sibling window listeners; `canPause` checks `dialogue.active` but not
   `photoMode`. One Esc exits photo mode *and* opens pause — contradicts the
   on-screen "P / Esc: exit" hint.
3. **`catwalk_probe_v1` is write-only** — `main.js:1507` stores the
   calibrated quality tier; nothing ever `getItem`s it. Every boot re-runs
   the ~4 s title-screen probe. Either consume it at `initialQuality`
   selection or remove the write.
4. **Per-frame allocation on idle screens** — `player.moveInput.clone()`
   every non-playing frame (`main.js:1266`); minor GC churn.

### 2.4 Doc drift (claims vs code)

| Claim | Reality |
|---|---|
| README/QUICKSTART: sprint "unlocked at rank 2" | `player.canSprint = true` from construction (`player.js:47`); only *effectiveness* scales at rank 3 |
| README: "saves every 12 s" | Autosave is every **30 s** (`main.js:1258`) + on pagehide |
| README: "35-module syntax check"; AGENTS.md: "36 modules" | **37** modules (incl. `bootstrap.js`) |
| AGENTS.md: "Current tag: `20261106a`" | Actual repo tag is **`20261107a`** |

### 2.5 Feature completeness vs README

Everything the README's feature list claims **verifies in code**: yarn
collectibles + Yarn Hunt + Offering Bell + Jade Paw corral + Golden Dango;
progression ranks and effects; saves (versioned, backup, migration,
export/import); scent trail gating; waypoints + compass; the full comfort
set; tea-house interior (fish buff, 4 h nap); photo mode with journal
stamps; journal with places/moments/photos/weather; generative music +
scene moods; the post stack; adaptive resolution + eco floor; context-loss
recovery; both hidden places; the summit unlock. **Open items** from the
checklists that remain: gamepad/remap/left-handed (U2.1), a11y info
(aria-live, U2.4), tea-house/residence skirt walls, bamboo-fence-top and
toro detail, ambient-life tier lever, multi-step quest framework, the full
Kyoto ending beat, real-device benchmarks (impossible in this repo alone).

### 2.6 Verification gaps

The automated coverage is **wide but module-level**: syntax, summit state
machine, lab invariants, rooftop physics. Nothing automated exercises:
the main frame loop, a save→quit→load round-trip, quest progression,
context-action verbs, the title→play transition, or controls. The only
full-game checks are the manual `/__boot.html` headless boot (~15–20 min,
last clean 2026-10-23) and the out-of-repo Playwright suites. **This is the
single largest verification risk in the project** — regressions in
`main.js` wiring would only be caught by `verify.mjs`'s ~24 summit-centric
regex checks.

---

## 3. The Labs — `labs/`

**Structure:** a hub (`index.html` rendered from `registry.js`), a shared
kit (`shared/`), and one folder per lab — 22 registered labs in four tiers +
4 extras.

### 3.1 Status per lab

| # | Slug | Registry | Reality on disk |
|---|---|---|---|
| 01 | ground | live | **Complete** — 4,829 LOC, 31 variants, 12 steps, poster |
| 02 | water | live | **Complete** — 5,597 LOC, 28 variants, 12 steps, poster |
| 03 | ranges | live | **Complete** — 2,596 LOC, poster |
| 04 | machiya | live | **Complete** — 1,217 LOC, 35 specimens, poster |
| 05 | sky | live | **Complete** — 876 LOC, 24 studies, poster |
| 06 | shrine | **planned** | **Built, unpublished** — `index.html` + 4 js (1,094 LOC), 27 specimens, 8 stages; missing `poster.png` + registry flip |
| 07 | moonpool | planned | Research notebook only (all 13 pending labs have real dated research, not placeholders) |
| 08 | pagoda | live | **Complete** — 3,647 LOC, 65 specimens, poster |
| 09 | summit | `elsewhere`, no href | **No directory** — spec says build it read-only over `mountaintop.js` |
| 10–20, 22 | nest, lanterns, fences, rocks, garden, greenery, alley, keepsakes, critters, villagers, weather, komorebi | planned | `research.md` only, each dated 2026-11-06 with real sources and a "Decisions" section |
| 21 | interiors | live | **Complete** — 772 LOC, 12 rooms, poster |
| — | grass (extra) | extras | **Complete** — 3,650 LOC, 20 grasses + cat slab; predates the new kit |

**The build-out is ~1/16 of the way through its ledger:** kit files all
exist, shrine is functionally complete but unpublished, 14 labs remain
research-only. The spec's ledger (`:74-90`) is already stale — kit and
shrine are `[~]`/`[x]` in reality.

### 3.2 The shared kit — two generations coexist

- **Original kit** (used by the 8 finished labs): `stage.js`
  (renderer/Views/Loop/Meter/Governor/split), `ui.js` (Dropdown, seg,
  slider, toggle, Stepper, Split, Callouts), `light.js` (hour-keyframed
  `LightRig`), `catwalk.js` (real `Cat` as a walker), `glsl.js`, `nav.js`.
- **New build-out kit** (only shrine uses it): `craft.js` (seeded rng,
  noise, `Bag`, sweeps, rocks, instancing), `painted.js` (`paintify()` +
  material set on the game's own textures), `finish.js` (8 post looks,
  promoted from pagoda), `sound.js` (Web Audio synths), `world.js`
  (`LabWorld`: real game Sky + painted ground + ridges + foliage + grass +
  cat + picking + compare + postcards), `original.js` (runs real game
  builders on `Countryside.prototype` stubs), `workshop.js`/`workshop.css`
  (`runLab(def)` — shelves, lazy-scissored tiles, per-tile stats, recipes =
  `spec.build.toString()`, search, Stepper).

**Gap:** `kit.html`/`kit.js` exercises only the *old* kit. The six newest
modules have no check page — shrine is their only dogfood.

### 3.3 Checker blind spots

`labs_check.mjs` passes today, but it can't catch the current staleness:
it doesn't require `poster` for `status:'live'` labs, and it doesn't flag a
`planned` lab that already has an `index.html` (shrine slips through).
Registry `nav.js`/`hub.js` only link `live` labs, so shrine is invisible
from the portal until the flip.

---

## 4. The Roof Road — `rooftops/` + `kyoto-rooftops.html`

A **complete, tested, intentionally-isolated** prototype: seven "mouths" of
old Kyoto in side-scroll, the real cat + a guide cat, the game's jump
constants, futon bounces, an autopilot that proves no soft-locks, and the
Okuribi finale. `rooftop_test.mjs`: **38/38 green**.

- **Not in the game** — confirmed: zero references from `index.html`/`src/`;
  the page itself says so. Game integration is fully designed (spec §8.2:
  railing-walk unlock, `RooftopManager` shaped like `SummitManager`, pocket
  scene at `y=−2400`, save flags, journal/XP wiring, `roof-road` branch
  exists at origin).
- **Bug: stale cache tag** — `rooftops/js/game.js:87` and `build.js:17`
  import `../../src/*?v=20261106a` while the repo tag is `20261107a`.
  Returning visitors can get stale-cached `cat.js`/`textures.js`. This is
  exactly the manual-bump hazard `AGENTS.md` documents — it was missed on
  the 11-07 bump.

---

## 5. cadJS — the CAD companion

**Scale:** `app.mjs` ~2,037 LOC + 5 support modules; a zero-dep Node server
(`server.mjs`, 343 LOC) that serves the whole repo and proxies the AI
agent. **Tests: 15/15 pass.**

### 5.1 What works (verified)

Three.js editor viewport (gizmo, snap, wireframe, turntable, 4 light moods),
scene tree + full inspector, param-rebuild + distort + instanced extract,
Procedural Studio (15 Kyoto prefabs, 16 painterly textures, 10 palettes, 8
cat poses — all seeded client-side), repo catalog scan, **live game bridge**
(iframe + `contentWindow.game`, runtime scan, dbl-click picking injected
into the game canvas), send-to-CAD clone, **push-to-game**
(`POST /api/overrides` → merges into repo-root `cad-overrides.json` →
`src/cad_overrides.js` applies by `object.name` at boot), project
save/export, versioned asset packages, undo/redo incl. whole-scene
snapshots, **13-provider AI agent** + offline keyword copilot with validated
≤64-action plans, command palette (~50 commands), GLB/OBJ import/export.

### 5.2 Confirmed bugs

1. **`npm run check` hangs on macOS/Linux** — `package.json` uses Windows
   cmd syntax `set CADJS_VALIDATE=1&& node …`. On POSIX `sh`, `set` never
   exports the var, so `server.mjs:335`'s guard fails and the module
   *listens on :4173 forever* — the test half never runs. Reproduced live:
   it printed the server banner and hung until killed. (Known upstream as
   BUILD_GUIDE WS-1.5, still open.)
2. **Agent name-targeting is dead code** — `findAgentTarget`
   (`app.mjs:1085`) resolves only `selection`/`workspace`/UUID, but the
   system prompt *and* the built-in copilot emit name targets
   (`'Head'`, `'Tail Root'`). They resolve `null` → silently fall back to
   `this.selected || this.root` — **part-scoped agent edits land on the
   wrong object with no error.**
3. **`addProceduralAsset` drops params** — `app.mjs:1106` passes only
   `primaryColor`; the documented `secondaryColor`/`accentColor`/`tiers`
   params are ignored.
4. **Subdivide never persists** — `subdivideSelected` (`app.mjs:1302`)
   doesn't set `userData.cadGeoEdited`, so subdivide edits are silently
   excluded from pushed overrides (param-rebuild and distort are included).
5. **Name-keyed overrides are fragile** — overrides match `object.name` +
   child-index `rel` paths; renamed/reordered builder output silently
   skips. The designed fix (`.def.js`/`assetRef` pipeline) is entirely
   unimplemented — no `src/assets/`, `asset_runtime.js`,
   `def-serializer.mjs`, or `/api/assets` exist. `.cadasset.json` packages
   are likewise a cadJS-internal dead end (no game loader).
6. **Server security is dev-grade** — serves the whole repo incl. `.git`;
   `safePath` blocks `..` but not symlinks; `/api/overrides` has no
   auth/origin check (a drive-by `text/plain` POST can write overrides);
   `/api/agent` + `/api/agent/probe` will fetch arbitrary client-supplied
   `baseUrl`s (SSRF). Acceptable only because it binds `127.0.0.1` —
   `HOST=0.0.0.0` would be genuinely dangerous. Gemini API keys travel in
   URL query strings (logged by any proxy).

---

## 6. dawCAT — the audio companion

**Scale:** ~19,300 LOC total; zero-dep, `type: module`; a real DAW:
arrangement/piano-roll/drum-grid/mixer/devices/automation, Wave Lab
(manipulator/recorder/sampler), Sound Design (24 templates → zero-file
`sfx-pack.js`), streaming self-repairing AI assistant (11 providers), MIDI
I/O, 42-groove library, IndexedDB assets. **Tests: 160/160 pass** — real,
thorough coverage (generated `sfx-pack.js` is eval'd and exercised).

### 6.1 Feature completeness

Every README claim verified: the full DAW surface, Wave Lab DSP (WSOLA,
pitch shift, varispeed, filters, 10 physics presets), exactly 42 rhythms,
exactly 24 SFX templates, the three game-export paths, the 6-mode/11-provider
agent with JSON-plan validation + self-repair + atomic undo, the game-cue
scanner. No vaporware found; only honest placeholders (a flat clip
placeholder when peaks aren't computed; "is not implemented" as a defensive
error for unknown agent actions).

### 6.2 In-flight work (new today)

`dawCAT/src/library/` (untracked, written 04:27–04:35) plus modifications
to `engine/{drums,synth}.js`, `midi.js`, `state.js`, `ui/{browser,devices}.js`
and a new `engine/live-midi.js`:

- `instruments.js` — 16 procedural instrument designs (koto, shamisen,
  biwa, shakuhachi, shinobue, shō, bonshō, singing bowl, fūrin, mokugyo,
  Rhodes/piano/pad/bass/lead analogues) with `instrumentPreset()` —
  **already imported by `state.js`, `ui/browser.js`, `ui/devices.js`**.
- `voices.js` + `pcm.js` — modal/physical-model synthesis primitives.
- `score-renderer.js` + `scores.js` + `mastering.js` + `render-worker.js` —
  an offline score→PCM render pipeline with a soft-knee stereo compressor.
- `live-midi.js` — Web MIDI input with voice tracking, sustain, pitch bend,
  panic-on-stop.

This reads as a "score library + live MIDI input" feature mid-landing.
The earlier "dead code" suspicion is wrong — `instruments.js` is already
wired; the rest (scores/mastering/worker) may not yet be reachable from UI.

### 6.3 Gaps

1. **Write-path to the game is manual** — no server, so: drop-in
   `music.js` (a file swap + hard refresh — supported cleanly, game
   feature-detects `setScene` at `main.js:1369`), `sfx-pack.js` (requires
   *editing game code* to `import` it — no hook exists; README's "without
   touching game code" is only true for `music.js`), or console hot-swap.
   Consider a `src/sfx-pack.js` optional-import shim like `cad_overrides.js`.
2. **Exported music loses scene moods** — generated `MusicDirector.setScene`
   is a no-op, so Tea House/Summit `SCENE_MOODS` scaling is dropped.
3. **Scanner is regex-based** — silently degrades if `audio.js`/`music.js`
   are refactored; cue previews are approximations, not the game's code.
4. **`wave-lab.js` recording uses deprecated `ScriptProcessorNode`** —
   works, but is the kind of thing that breaks silently in a future Chrome.
5. **`docs/DAW_CADJS_DEEP_REVIEW_2026-09-20.md` is stale** — predates 2.0.

---

## 7. Interoperation — how the pieces connect

```
            ┌────────────────────┐
            │     MAIN GAME      │  index.html + src/ (tag 20261107a)
            │  window.game set   │  main.js:92, 1885
            └────────┬───────────┘
        reads        │        writes
   ┌─────────────────┼───────────────────────────┐
   │                 │                           │
   ▼                 ▼                           ▼
┌─────────┐   ┌─────────────┐            ┌───────────────┐
│  LABS   │   │   cadJS     │            │    dawCAT     │
│ shared/ │   │ iframe +    │            │ scanner.js    │
│ game.js │──▶│ /api/       │            │ reads src/*.js│
│ (sole   │   │ overrides → │            │ over HTTP     │
│ bridge, │   │ cad-        │            └───────┬───────┘
│ tagged) │   │ overrides.  │                    │ download/console
└─────────┘   │ json        │                    ▼
              │ → src/      │            music.js drop-in (setScene
              │ cad_        │            feature-detected) / hot-swap /
              │ overrides.js│            sfx-pack.js (needs manual import)
              └─────────────┘
   ┌──────────────────────────┐
   │  ROOF ROAD (rooftops/)   │  imports cat.js + textures.js direct
   │  separate entry point    │  with own tags — currently STALE (20261106a)
   └──────────────────────────┘
   ┌──────────────────────────┐
   │  tools/*_preview.html    │  drive the real Cat/Countryside/
   │  (visual review sheets)  │  HiddenPlaces with seeded rng — tags
   └──────────────────────────┘  also STALE (20261106a)
```

**The healthy patterns:**
- **One bridge per consumer.** Labs reach the game *only* through
  `labs/shared/game.js` (verified: no other lab file imports `src/`); cadJS
  reaches it only through `cad-overrides.json` + the iframe `window.game`;
  dawCAT reaches it only through conformant drop-in APIs. The game never
  imports a lab or companion file.
- **Feature-detected contracts.** `main.js` tolerates a dawCAT-exported
  `music.js` lacking `setScene`; `cad_overrides.js` ignores a missing file.
- **"Originals are real."** Labs run the game's own builders via
  `Countryside.prototype` stubs — the first tile on every shelf is the
  shipping code.

**The weak seams:**
- **Cache tags are a manual, error-prone process.** Three tag epochs are
  live right now: `src/`+`index.html`+`labs/shared/game.js` = `20261107a`;
  `tools/*_preview` + `rooftops/` = `20261106a`; `AGENTS.md` documents a
  stale value. Every bump must remember `labs/shared/game.js`,
  `rooftops/js/{game,build}.js`, `tools/*`, and `AGENTS.md` itself — it
  already failed once (11-07).
- **dawCAT→game has no declared contract file.** `scanner.js` regexes
  `music.js`/`audio.js` internals; the `sfx-pack.js` contract
  (`THROTTLE`/`PASSTHROUGH` tables mirroring `audio.js:664-672`) is kept in
  sync by a unit test *inside dawCAT*, not by anything in the game — a
  refactor of `audio.js` would break exported packs without any game-side
  signal.
- **Shared runtime assumptions are implicit.** cadJS's runtime picker and
  dawCAT's hot-swap both depend on `window.game` + internals
  (`audio.buses.music`, `sky.dayTime`, named meshes). `verify.mjs` doesn't
  check any of them.
- **`mountaintop.js` ownership crosses boundaries by necessity.** The
  summit lab (spec item 09) will read it through `game.js`'s
  `loadSummitModule` — the first lab to depend on another effort's file.

---

## 8. Cross-cutting issues

1. **Dirty tree / concurrent work.** Uncommitted: the whole new lab kit,
   the shrine lab, the spec doc, `dawCAT/src/library/` + live-midi + 6
   modified dawCAT files, `labs/pagoda/js/finish.js`, `labs/shared/game.js`.
   Two efforts are landing at once; the risk is tag/registry/doc skew —
   already visible (registry still `planned` for shrine, AGENTS.md tag
   stale).
2. **Docs rot is the project's main failure mode.** Not code stubs — docs:
   stale tag in AGENTS.md, stale module counts (36/35 vs 37), stale README
   (sprint rank, 12 s autosave), stale DAW_CADJS review, stale spec ledger.
   Consider one `docs/` sweep per tag bump, or fold the tag into a single
   source (`tools/check_syntax` could assert it).
3. **No TODO markers anywhere** — tracking lives in `docs/` checklists
   instead. Good discipline, but it means `grep` can't find the work; the
   checklists are the source of truth and they drift (see 2).
4. **`main.js` at 1,887 lines** is the project's coupling hotspot — every
   new feature lands in `Game`. It stays correct because it's heavily
   annotated, but extraction seams (journal UI, photo mode, perf governor,
   collectibles) would pay off before the next feature wave.
5. **`setTimeout` presentation timers** (`interior.js` door wipe,
   `context_actions.js` post-nap stretch, summit veils) are cosmetic-only
   and fine under the "no timers" guardrail — but `cozyNap`'s stretch can
   fire after state changed. Low risk; worth a convention note.
6. **Load path still has the SBA-review gaps** (2026-09-27): ~1.7 MB
   unminified JS + unpkg CDN dependency (no self-host, no service
   worker/offline fallback, no shader precompile, 374 KB boot JPEG,
   `user-scalable=no`). The three critical SBA bugs (probe pinning,
   per-gesture `applyQuality`, frozen `ui.fps`) — **the per-gesture
   `applyQuality` path no longer exists** (the audio-unlock listener no
   longer calls it; `applyQuality` only runs via `applySettings`), and the
   probe now guards on menu mode — but `ui.fps` freezing under the eco
   floor and the write-only probe cache remain.

---

## 9. Prioritized recommendations

**P0 — fix or finish before the next feature lands**

| # | Item | Where |
|---|---|---|
| 1 | Commit or checkpoint the two in-flight streams (lab kit + shrine; dawCAT library) — the tree changed during this review | `git status` |
| 2 | Bump stale cache tags to `20261107a` in `tools/*_preview.{html,js}` and `rooftops/js/{game,build}.js`; fix AGENTS.md's "Current tag" | `tools/`, `rooftops/` |
| 3 | Fix `npm run check` for POSIX (`CADJS_VALIDATE=1 node -e …` or a cross-platform script) — it's the only failing suite | `cadJS/package.json:10` |
| 4 | Fix cadJS agent name-targeting (`findAgentTarget` should resolve names/`cadSemanticId`) — silent wrong-object edits | `cadJS/src/app.mjs:1085` |
| 5 | Flip `shrine` to `status:'live'` + render `poster.png` once it's verified headless; update the spec ledger | `labs/registry.js:22` |
| 6 | Esc-in-photo-mode double-fire (check `photoMode` in `canPause` or `stopImmediatePropagation`) | `main.js:310,359` |
| 7 | `#mode` HUD line (don't let `setMode` clobber the controls cheat-sheet — separate concerns) | `ui.js:146`, `controls.js:23` |

**P1 — near-term hardening**

- `subdivideSelected` → set `userData.cadGeoEdited`; `addProceduralAsset` →
  pass through the documented params (`cadJS/src/app.mjs:1106,1302`).
- Consume or remove the write-only `catwalk_probe_v1` cache (`main.js:1507`).
- Optional-import shim for `sfx-pack.js` (mirror `cad_overrides.js`'s
  missing-file tolerance) so dawCAT exports become truly drop-in.
- Extend `labs_check.mjs`: require `poster` for `live` labs; flag
  `planned` labs that have `index.html`.
- Extend `kit.html`/`kit.js` to exercise the new kit modules
  (`workshop/world/craft/painted/finish/original/sound`).
- One-line cache-tag single-source (e.g. `tools/check_syntax.mjs` asserts
  all `?v=` equal the newest in `src/main.js`).
- cadJS: pass documented params, consider an `assetRef` name-stable key
  (the def-file pipeline if you want the durable fix); note the server is
  loopback-only.
- Gamepad + input-remap (U2.1) — the game's largest missing surface;
  `controls.js` is small enough to take a binding map cleanly.
- A modest automated smoke for the main loop (boot → title → start → one
  frame → save → reload) in Node or headless — closes the verification
  hole that today only `verify.mjs`'s summit regexes cover.

**P2 — roadmap, honestly already documented upstream**

- The remaining 14 labs per the build-out spec; summit lab read-only over
  `mountaintop.js`.
- Roof Road §8.2 game integration (`roof-road` branch).
- dawCAT: wire `scores/mastering/render-worker` into UI, replace
  `ScriptProcessorNode`, keep exported `setScene` parity, retire stale
  deep-review doc.
- cadJS BUILD_GUIDE def-file pipeline; permanent importer; animation
  timeline.
- Load-path: self-host three.js, service worker, shader precompile,
  WebP boot image, `user-scalable` re-eval.
- Real-device benchmarks (needs hardware — the only item this repo can't
  self-verify).

---

## 10. The honest bottom line

**Working:** the entire shipped feature set — every README claim verified,
all 9 suites green (save the POSIX-broken cadJS `check`), zero code stubs,
disciplined single-bridge interop.

**Needs fixing:** three small game bugs (HUD line, Esc double-fire,
write-only probe), three cadJS bugs (agent targeting, check script,
subdivide persistence), stale cache tags in `tools/` + `rooftops/`, and a
layer of doc drift.

**Needs attention (unfinished, not broken):** 14 of 22 labs, the Roof
Road's game integration, gamepad/remap/left-handed input, the
main-loop-level automated test, real-device measurement, and the
in-flight dawCAT library feature.

The project's risks are **coordination risks**, not code-quality risks:
manual tag bumps, docs-as-tracker, single big `main.js`, and now two
parallel uncommitted work streams. The fixes are all small; the biggest
single investment worth making is the main-loop smoke test, because every
other risk is already written down and triaged.
