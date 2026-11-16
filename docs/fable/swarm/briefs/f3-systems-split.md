# Lane brief: f3-systems-split (Phase 1 — layout/mesh split in the five system modules)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/f3-systems-split   Branch: fable/f3-systems-split
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/f3-systems-split-report.md
Common rules: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md
Lane card: BUILD_GUIDE_FABLE.md §8 "Lane f3-systems-split" (F3.1–F3.4) and §3.3/§3.4.

You own, for the duration (hot files, granted): `src/vegetation.js`, `src/interior.js`, `src/hidden_places.js`,
`src/ambient_life.js`, `src/particles.js`; plus the golden extension files `tools/footprint_golden.js`/`.html`/`.mjs`
for F3.3 (coordinate: f1-runtime may later add modular flags to the same page — keep your change additive and small),
a new golden `tools/golden/systems_classic.json` (or extra sections in the valley digest — your call, documented),
and `docs/fable/status/f3-systems-split.md`, `docs/fable/handoff/f3-systems-split.md`. Never touch `src/countryside.js`
(lane f2 owns it right now), `src/sky.js`, `src/postfx.js`, `src/grass.js` (F3.4), or `src/main.js`.

## The 21 builders
vegetation.js: buildSakuraGrove, buildDappledLight, buildPetalDrifts, buildBambooGrove, buildMaplesAndPines, buildMeadow ·
interior.js: buildKnockables, buildInterior · hidden_places.js: buildMoonPool, buildLanternGlade ·
ambient_life.js: buildBirds, buildGuardianBirds, buildButterflies, buildKoi ·
particles.js: buildGodRays, buildRain, buildRiverPetals, buildPetals, buildFireflies, buildMotes, buildSnow.
Map each to inventory ids from `labs/asset_inventory.json` (read-only) in your status file. Where the classic code
has a natural seam, route sub-objects under their own inventory ids — wave-2.1+ kit lanes depend on these:
`andon`, `courtyard-toro`, `courtyard-gravel`, `courtyard-wall`, `tatami`, `shoji-doors`, `teaware`, `tokonoma`, `scroll`,
`bonsai`, `chabudai`, `zabuton`, `interior-fish`, `knockables` (interior.js); `pool-toro`, `pool-rim`, `pool-apron`,
`pool-seat`, `lily-pads`, `lotus`, `glade-floor`, `glade-bamboo`, `glade-lanterns`, `glade-seat` (hidden_places.js);
`bamboo-groves`, `sakura`, `maples`, `pines` (vegetation.js); `sparrows`, `guardian-crows`, `butterflies`, `koi`
(ambient_life.js). If a seam does not exist without reordering draws, route the parent whole and say so.

## Interfaces (frozen; f1-runtime builds the runtime in parallel)
- Runtime: `Vegetation` gets `options.assets`; `HiddenPlaces`, `Particles`, `AmbientLife` get a trailing `{ assets }`
  argument; `InteriorManager` reads `game.assets`. All default to a classic pass-through when absent (review sheets).
  Import `CLASSIC_ASSETS` / `isAssetInstance` from `./kit/runtime.js?v=<tag>` if it exists on fable/integration when you
  start; otherwise define local fallbacks (`{ build: (id, layout, classicFn) => classicFn(), update() {}, instances: [] }`,
  `x && x.group && x.parts && typeof x.dispose === 'function'`) with a comment that the Integrator swaps in the import.
- §3.4 shape per builder: `layoutX()` (all seeded/random draws in original order) + `meshXClassic(layout)` routed
  through a `placeAsset(id, layout, classicFn)` helper. Integrator ruling R12 (binding): layouts carry
  `layout.footprint = { colliders, exclusions, anchors }` in classic formats; modular path adds `instance.group`,
  registers `instance.footprint` through the same registration path in the same order, binds gameplay mesh refs from
  `instance.parts`/`sockets` via `layout.bind`; kit footprint defaults to `layout.footprint`; `instance.live` stays
  out of any static merge.
- Particles/ambient life are runtime effects (they may use `Math.random()` today — leave classic code's randomness
  exactly as is; only kit code is forbidden from it). For effects, "layout" = the parameters/spawn data the classic
  code computes; keep it honest and small.
- F3.1: `hidden_places.js` must still be built before `Vegetation` and attached after `ContextActionManager`.
- F3.2: interior knockable physics and nap/interaction anchors live in the layout data so a kit interior inherits them.

## Verification
Golden page overlap: f1-runtime is also editing `tools/footprint_golden.*` (adding `?assets=`/`?swap=` modular support).
Put your collectors in a NEW module (e.g. `tools/golden/systems_digest.js`) and hook it into the page/CLI with the
smallest possible change (one import + one call + CLI flag if needed), so the two edits merge cleanly.
F3.3: extend the footprint golden to the interior and hidden places (and record vegetation exclusions/tree placements,
koi/bird spawn layouts where seeded). Generate the systems digest from the UNCHANGED code first (commit it before
splitting anything), then split builder by builder, re-running the golden after each and committing per builder.
Also: `node tools/check_syntax.mjs`, `node tools/verify.mjs`, `node tools/interiors_test.mjs`, `node tools/labs_check.mjs`,
`git diff --check fable/integration...HEAD`; review sheets `tools/hidden_preview.html`, `tree_preview.html`, `grass_preview.html` diffed against
the Phase 0 masters in `/Users/c1t1zen/Documents/GitHub/michi-wt/_baseline/` with `node tools/headless.mjs --diff`
(noise floor in `docs/fable/baseline/captures.md`); full headless boot clean. Preserve line endings.

## Done when
Goldens equal after every commit; all checks green; sheets within the noise floor; boot clean; status file maps every
builder → id(s) → split/whole with reasons. Push; PR into fable/integration.

## Headless tool before Phase 0 merges
Copy it UNTRACKED: `git fetch origin && git show origin/fable/p0-browser:tools/headless.mjs > tools/headless.mjs` (never
stage it; when the controller says Phase 0 merged, delete it and `git rebase fable/integration`). The golden's hooks
(see docs/fable/status/f1-golden.md) assume Countryside internals that lane f2 is splitting in parallel — your golden
work must not depend on countryside.js changes. Phase 0 capture masters may still be in progress — use them at the END.
