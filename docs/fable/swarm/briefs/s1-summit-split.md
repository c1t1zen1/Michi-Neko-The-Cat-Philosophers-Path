# Lane brief: s1-summit-split (Phase 4 — mountaintop.js split behind the SummitManager facade)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/s1-summit-split   Branch: fable/s1-summit-split
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/s1-summit-split-report.md
Common rules: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md
Lane card: BUILD_GUIDE_FABLE.md §11 (S1.1–S1.5, gate G-S), §3.3/§3.4, and `docs/fable/decisions.md` D2.

## D2 (Integrator ruling): Phase 4 is OPEN
The operator asked for all phases; `origin/fix/hilltop-ground-transitions` is fully merged. Note the corrected evidence
in decisions.md: c16aeb0 (2026-11-06) changed mountaintop.js substantively; efbfd8c (2026-11-07) was tags only.
FIRST: `git fetch origin` and confirm no remote branch other than fable/* has unmerged changes to `src/mountaintop.js`,
`src/ui.js` or the summit UI in `index.html` (`git log --oneline main..origin/<b> -- <file>` for each branch). If one does,
STOP and report NEEDS_CONTEXT. Otherwise your FIRST commit updates the `src/mountaintop.js` row of the AGENTS.md layout
table (summit ownership: "opened to the Fable plan by decision D2 (docs/fable/decisions.md); single writer: lane s1") —
that one AGENTS.md edit is granted.

## Your files
Single writer of `src/mountaintop.js` (hot, granted); NEW `src/summit/**`; `tools/summit_test.mjs` (S1.4: update the
import-stub harness for the new modules WITHOUT removing any check), `tools/verify.mjs` (S1.5: re-point string checks to
the files the code moved to; never delete a check), a summit golden (`tools/summit_golden.*`, `tools/golden/summit_classic.json`),
AGENTS.md (the one row above + the summit paragraph's file references if code moves), status/handoff files.
Never touch `index.html`, `src/ui.js`, `src/main.js` (summit wiring there stays as is; if a hot-file change is unavoidable,
put the exact patch in your handoff).

## Steps (S1.1–S1.5) with Integrator rulings
- S1.1 summit golden from the UNCHANGED code, committed before any move: SummitManager built in isolation (read how
  `tools/summit_preview.js` and `tools/summit_test.mjs` construct it), digest of object transforms (named + aggregates),
  colliders/walkables, `terrainHeightAt` and `perchSightlineAt` sampled on a lattice, rng draw count of the summit stream
  (`this.rng`, seed 20261004 — count draws without editing mountaintop.js, e.g. an accessor/prototype hook like the valley
  golden in `tools/footprint_golden.js` and `docs/fable/status/f1-golden.md`), plus the full `node tools/summit_test.mjs`
  output saved verbatim. Deterministic across 3 runs.
- S1.2 split the builders into `src/summit/terrain.js`, `clearing.js`, `planting.js`, `vista.js`, `weather.js`, `wildlife.js`,
  `light.js` by concern. `SummitManager` stays in mountaintop.js as the facade with the same public API and state machine.
  Move code; do not redesign. Commit per module; golden EQUAL after each.
- S1.3 layout/mesh split + `assets.build`-style routing (§3.4, ruling R12: `layout.footprint`, a `placeAsset(id, layout,
  classicFn)` helper, `layout.bind`, `instance.live` unmerged) using the summit's own stream; NO new `this.rng()` draws, and
  the summit grass must not start drawing from it. Runtime: `src/kit/runtime.js` may not be on your base; use a local
  CLASSIC_ASSETS pass-through (`{ build: (id, layout, classicFn) => classicFn(), update() {}, instances: [] }`) that the
  Integrator swaps for the import at merge; the runtime will reach SummitManager the same way Countryside gets it (an
  `options.assets`/`game.assets` — read src/main.js where SummitManager is constructed and describe the exact hook needed
  in your handoff). Route by the summit inventory ids (32 rows in labs/asset_inventory.json, group "Summit").
- S1.4/S1.5 as written. The protected view: nothing may cover the city or the sea from the meditation seat
  (`perchSightlineAt()`); the golden's lattice proves it is unchanged.

## Before Phase 0 merges
`tools/headless.mjs` is not on your base yet: `git fetch origin && git show origin/fable/p0-browser:tools/headless.mjs >
tools/headless.mjs` — UNTRACKED, never stage; when the controller says Phase 0 merged, delete it and `git rebase fable/integration`.
Phase 0 summit captures (masters in `/Users/c1t1zen/Documents/GitHub/michi-wt/_baseline/`) may still be in progress — use them at the END.

## Done when
Golden EQUAL after every commit; `node tools/summit_test.mjs` identical check count and all pass; `node tools/verify.mjs`
all pass with no check removed (show before/after check counts); `node tools/check_syntax.mjs`, `labs_check`,
`labs_coverage` (+`--write` if anchors/lines moved — inventory anchors into mountaintop.js stay verbatim or, if impossible,
only that anchor string is edited in labs/asset_inventory.json and listed in the handoff), `git diff --check
fable/integration...HEAD`; every `summit_preview.html` view vs the Phase 0 masters within the noise floor (meditation view
first); full headless boot clean. Push; PR into fable/integration. If context runs low: commit, push, report
DONE_WITH_CONCERNS with the precise remaining list.
