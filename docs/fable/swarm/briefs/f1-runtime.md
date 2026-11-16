# Lane brief: f1-runtime (Phase 1 — foundation; the kit runtime every later lane builds on)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/f1-runtime   Branch: fable/f1-runtime (from fable/integration @ ed9f5b9)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/f1-runtime-report.md
Common rules: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md
Lane card: BUILD_GUIDE_FABLE.md §8 "Lane f1-runtime" (F1.1–F1.11) and §3 (architecture). Read both closely.

You are the strongest model on the project and own its architecture. Phase 1 is a planned hot-file moment:
you may edit the hot files listed below. Everything else stays untouched.

## Concurrent lanes (do not edit their files)
- `p0-browser` builds `tools/headless.mjs` (Playwright CLI + module: `openPage`, `runPage`, `diffImages`; it serves a
  root dir on a free port). It pushes `fable/p0-browser` early. Until Phase 0 merges into fable/integration you may
  copy it UNTRACKED into your tools/ dir for testing (`git show origin/fable/p0-browser:tools/headless.mjs > tools/headless.mjs`
  after `git fetch origin`) — never stage that copy. When the controller tells you P0 merged, delete the copy and
  `git rebase fable/integration` (local branch; `git fetch` first if needed).
- `f1-golden` builds the classic footprint golden (`tools/footprint_golden.html/.js/.mjs`, `tools/golden/valley_classic.json`).
  After it merges you rebase and ADD modular support to it (`?assets=`/`?swap=` → construct your AssetRuntime and pass it in).
- `f2-countryside-split` (owns `src/countryside.js`) and `f3-systems-split` (owns vegetation/interior/hidden_places/
  ambient_life/particles) may start BEFORE you finish, coding against §3.3/§3.4 exactly as written. Therefore:
  **the names in §3.3/§3.4 are frozen: `defineAsset`, `AssetRuntime`, `build(id, layout, classicFn)`, the AssetInstance
  fields (`group, parts, sockets, footprint{colliders,exclusions,anchors}, live, update, setTier, dispose`), ctx fields
  (`THREE, MAT, kitMaterials, tier, rng, quality, textures`), part names `asset:<id>/<part>`.** If you must deviate,
  stop and report NEEDS_CONTEXT first.

## Interface you must provide (others depend on it)
- `src/kit/runtime.js` exports `AssetRuntime`, `CLASSIC_ASSETS` (pass-through: `build(id, layout, classicFn) → classicFn()`,
  `update(){}`, `instances: []`), and `isAssetInstance(x)`.
- `src/main.js`: `this.assets` (AssetRuntime) on the Game; `await assets.preload()` before the world is built (make
  `startGame` async if needed and update `src/bootstrap.js`'s call); pass `{ assets: this.assets }` in the options bag to
  `new Countryside(scene, options)` (its constructor already takes `options`) and to `new Vegetation(..., options)`;
  pass a trailing `{ assets: this.assets }` argument to `new HiddenPlaces(...)`, `new Particles(...)`,
  `new AmbientLife(...)`; `InteriorManager` already receives the game (`game.assets`). Those classes ignore it until
  f2/f3 read it (they default to CLASSIC_ASSETS) — so the classic game is unchanged.
- `assets.update(dt, t, env)` called from the frame loop; tier changes from `applyQuality()`.

## Your files
NEW: `src/kit/runtime.js`, `contract.js`, `materials.js`, `craft.js`, `rng.js`, `index.js` (generated, zero families),
`tools/kit_check.mjs`, `tools/kit_index.mjs`, `tools/kit_test.mjs` (node --test unit tests for contract/rng/runtime
set resolution/overrides/swap parsing/fallback), `tools/kit_contract_test.html` + `.js` + CLI `tools/kit_contract_test.mjs`
(runs the page through `tools/headless.mjs`), `tools/game_shot.mjs`, `tools/cad_overrides_test.mjs` (or extend an
existing test), fixtures under `tools/golden/` or `tools/fixtures/`.
EDIT (hot, granted): `src/settings.js`, `src/main.js`, `src/bootstrap.js`, `src/cad_overrides.js`, `tools/check_syntax.mjs`,
`tools/verify.mjs`, `AGENTS.md` (Kit row + verification commands), `BUILD_GUIDE_FABLE.md` §3 + Appendix C only
(reconcile with what you built; do NOT tick the §6 board). After f1-golden merges: `tools/footprint_golden.*` (modular support).

## Steps
F1.1–F1.11 as written in the guide, plus these Integrator rulings:
- F1.4: verify the draw-call merge claim with a real count (before/after) and record numbers.
- F1.5 kit_check must also check: every `src/kit/<family>/index.js` exports `assets`; `?v=` tags on game-module imports
  inside `src/kit/**` equal the tag in `src/main.js`; `src/kit/index.js` is in sync with the family folders.
- F1.7: budgets come from `docs/fable/baseline/budgets.md` (written by p0-browser; arrives when P0 merges). Store the
  machine-readable numbers in `src/kit/budgets.js` (or `tools/golden/budgets.json`) and cite budgets.md. Page accepts
  `?family=` and `?asset=`; zero assets → passes and prints `0 assets`. Include a self-test: a throwaway fixture asset
  defined inside the test (not registered in the game) proves every check can FAIL (bad part name, floating part,
  over-budget, nondeterministic geometry, leaking dispose) and pass.
- Tiers vs `_mergeStatics()` is the key design question: per-instance LOD conflicts with merging statics by material.
  Decide (e.g. tier chosen per instance at build time from distance band × quality and merged; live LOD only for
  unmerged hero objects; `setTier` rebuilds) and DOCUMENT the decision in §3 of the guide and in runtime.js.
- Footprint application: the contract test must be able to compare an instance's `footprint` with the classic
  builder's output; describe in §3 how a caller registers an instance's footprint (colliders/exclusions/anchors) so
  f2/f3 implement it the same way everywhere.
- NEW F1.12 (needed by every lane's L6 compare and Phase 8 hero shots): game capture flags in `src/main.js`, honoured
  only when present: `?hour=<0-24>` (fixed time of day), `?cam=px,py,pz,tx,ty,tz[,fov]`, `?nohud=1`, `?shot=1`
  (freeze time/animation and seeded wind so frames repeat), plus `?assets=` and `?swap=` from F1.3. Check the
  existing Photo Mode / debug code first and reuse it. `tools/game_shot.mjs --query "<flags>" --out x.jpg [--size]`
  boots the game headlessly (as `__boot.html` does: `sessionStorage.catwalk_autostart='new'`) and saves the frame.
- Determinism: two boots with the same flags must produce the same frame (record the --diff numbers).

## Done when (guide F1 "Done when", proven with real output in your report)
`node tools/check_syntax.mjs`, `node tools/verify.mjs`, `node tools/kit_check.mjs`, `node --test tools/kit_test.mjs`,
`node tools/labs_check.mjs`, `git diff --check fable/integration...HEAD` all green; contract test prints `0 assets` and its fixture self-test
proves fail+pass; cad-overrides fixture proves existing overrides apply exactly as before; full headless boot
(`/__boot.html`) shows no new console output beyond AudioContext warnings on `?assets=classic` AND `?assets=modular`;
a `game_shot` at a fixed cam/hour on classic vs modular (zero families) diffs at the Phase 0 noise floor; golden diff
empty (after f1-golden merges). Push, open the PR (base fable/integration).
