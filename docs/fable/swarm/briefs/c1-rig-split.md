# Lane brief: c1-rig-split (Phase 3 — the Cat split into rig, parts and behaviour, `Cat` kept as the facade)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/c1-rig-split   Branch: fable/c1-rig-split
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/c1-rig-split-report.md
Common rules: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md
Lane card: BUILD_GUIDE_FABLE.md §10 (C1.1–C1.5, character tiers, gate G-C) and §3.3. Read closely.

Serial lane, planned hot-file moment: you own `src/cat.js`, `src/npc.js`, `src/player.js` (granted) and NEW
`src/characters/**`. Also yours: a character golden tool if you build one (`tools/cat_golden.*`, `tools/golden/cat_*.json`),
`docs/fable/status/c1-rig-split.md`, `docs/fable/handoff/c1-rig-split.md`. Read-only: `src/cat_anatomy.js`,
`src/cat_sdf.js`, `src/cat_shading.js`, `src/cat_motion.js` (move code out of `cat.js` only; if a move into those files is
clearly better, write it in the handoff instead), `tools/cat_preview.js` (hot-ish: it mirrors coat palettes — leave it;
c3 makes it read the defs), `src/main.js` (villager schedules stay there).

## Who calls `Cat` (all must keep working unchanged)
the player (`src/player.js`), villagers (`src/npc.js`), the Roof Road's Chidori (`rooftops/js/game.js` imports
`../../src/cat.js?v=…`), `labs/shared/catwalk.js` (via `labs/shared/game.js`), `tools/cat_preview.js` (every sheet),
the catalog/cadJS adapters (`catalog/js/asset-loader.mjs`). Grep for `new Cat(` and `cat.js` before you start and list
every caller + every public method/property they use in your status file — that list is your API contract.

## Steps (C1.1–C1.5) with Integrator rulings
- C1.1 modules exactly as named in the card (`rig.js`, `parts/coat.js`, `parts/face.js`, `parts/collar.js`, `parts/shadow.js`,
  `behaviour/locomotion.js`, `behaviour/poses.js`, `behaviour/mood.js`, `character.js`).
- C1.2 move code; do not change behaviour. `Cat` keeps every public method/property and delegates.
- C1.3 `CharacterDef` `{ id, build, palette, face, accessories: [slots], scale, personality }`; slots `collar`, `bell`,
  `head`, `back`; `setMasterCat()` becomes a slot swap. Provide the tier mechanism (`hero` = today's character; `mid`/`far`
  hooks that c2/c3 fill — `mid` no outline pass + simpler face, `far` single merged mesh). Quality `low` keeps classic.
  Kit runtime names are frozen in guide §3.3 (`src/kit/runtime.js` may not be on your base yet — do not depend on it;
  CharacterDef is its own contract in `src/characters/character.js`).
- C1.4 proof of no change — the Phase 0 masters live outside the repo in `/Users/c1t1zen/Documents/GitHub/michi-wt/_baseline/`
  (index + noise floor in `docs/fable/baseline/captures.md` once Phase 0 merges; the controller will tell you). Capture every
  `tools/cat_preview.html` sheet (anatomy, face, gait, stride, poses, sleep, closeup, coat, npcs, and the `&golden=1`/`&raw=1`
  variants Phase 0 captured) with `node tools/headless.mjs` and `--diff` against the masters: within the recorded noise floor.
  `&perf=1` timings within noise (record before/after on this machine). `node tools/rooftop_test.mjs` passes (all checks).
  Recommended: a fast numeric golden first (bone names + rest transforms, part mesh counts/vertex counts/material params per
  body type and per pose, sampled gait frames) so you can iterate without screenshots — generate it from the UNCHANGED code
  and commit it before moving anything.
- C1.5 the sculpt cache per body type keeps working; a part swap must not trigger a re-sculpt (prove with a counter).

## Before Phase 0 merges
`tools/headless.mjs` is not on your base yet: `git fetch origin && git show origin/fable/p0-browser:tools/headless.mjs >
tools/headless.mjs` — UNTRACKED, never stage; when the controller says Phase 0 merged, delete it and `git rebase fable/integration`.

## Checks
`node tools/check_syntax.mjs`, `node tools/verify.mjs`, `node tools/rooftop_test.mjs`, `node tools/labs_check.mjs`,
`node tools/labs_coverage.mjs` (+ `--write` if your moves shift anchors/lines — inventory `sources[].anchor` strings pointing
into your three files must stay verbatim; if one cannot, you may edit only that anchor string in `labs/asset_inventory.json`
and list it in the handoff), `git diff --check fable/integration...HEAD`, cat sheets vs masters, full headless boot clean.
Commit per module moved. Push regularly. If context runs low: commit, push, report DONE_WITH_CONCERNS with the precise
remaining list.
