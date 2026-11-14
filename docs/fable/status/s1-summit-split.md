# s1-summit-split

- Worker / model:     Claude Opus 5.5 (claude-opus-5-5)
- Claimed:            2026-11-13 04:10 PST
- Branch:             fable/s1-summit-split
- Base commit:        5dc924a (fable/integration); merged 619aab7 (Phase 0 + f1-runtime) as b8e4602, 5297f2d (f2, f3, c1, G-F chores) as 915fd33, c39a982 (tag 20261113a; f2, f3, c1, c2) as e879e3f, and 4273c90 (c3, Roof Road downtown from main) as 8bcec2a
- State:              review fix round 1 done; ready for re-review

Lane: guide section 11, Phase 4, steps S1.1 to S1.5 (gate G-S). Splits
`src/mountaintop.js` into `src/summit/` modules behind the `SummitManager`
facade, then adds the layout/mesh split and `placeAsset` routing on the
summit's own stream. No visible or behavioural change.

## D2 pre-check (2026-11-13, after `git fetch origin`)

`git log --oneline main..origin/<b> -- <file>` for every non-`fable/*` remote
branch (`main`, `fix/hilltop-ground-transitions`, `graphics-overhaul`,
`roof-road`) and `src/mountaintop.js`, `src/ui.js`, `index.html`:

- `src/mountaintop.js`, `src/ui.js`: no output on any branch.
- `index.html`: one commit, `9cbddf2` on `origin/graphics-overhaul` (ignored by
  ruling D6). Its only `index.html` hunk is the `src/main.js?v=` script tag
  (`20260907a` → `20260924b`), not the summit UI.
- Local branches other than `fable/*` (`feat/rooftops-downtown`): no commit
  touching `src/mountaintop.js` or `src/ui.js`.

Result: no unmerged summit work elsewhere. Phase 4 proceeds under D2.

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| (none promoted: serial split lane; all 32 summit rows are routed through `placeAsset`, see the handoff table) | | | | | |

## Steps
- [x] S1.0 Claim: D2 pre-check, AGENTS.md summit row (D2), this file (409afe4)
- [x] S1.1 Summit golden from the unchanged code (41eb25a): `tools/summit_golden.html/.js/.mjs`, `tools/golden/summit_classic.json`, `tools/golden/summit_test.txt`
- [x] S1.2 Builders split into `src/summit/` (golden EQUAL after each commit): common d2138d6, light 2554841, terrain 4c8af48, clearing cee0951, planting ae6fc42, vista dcf0297, weather 20a543e, wildlife + grouped facade 8c075af; six inventory anchors 3144779
- [x] S1.3 Layout/mesh split and `placeAsset` routing, all 32 summit ids: 2615b07, d54061e, 86081ce, b253a4b; routing self-test 7f5b69c
- [x] S1.4 `tools/summit_test.mjs` loads the facade and its real modules (d2138d6; native `src/kit/runtime.js` 2615b07); no check changed
- [x] S1.5 `tools/verify.mjs` checks read the files the code moved to (ae6fc42, dcf0297); summit syntax pass and three wiring checks added (f9d69ec); none removed
- [x] AGENTS.md row and summit paragraph references (f8ab3a6); handoff; previews against the Phase 0 masters; boots; report; PR
- [x] Review fix round 1: golden ignores cache tags in load URLs (01c745e); every per-frame and state path that reads a routed handle is bound or null-guarded, the portal no longer depends on the beacon handle, placeAsset warns once (unresolved bind part, unknown parent, `?swap` of an unregistered id) through the runtime; 13 checks added to `summit_test.mjs` and an update() drive added to the golden's routing test; routing "not run" exits 2

## Checks run (command → real result)

Review fix round 1, on the tree merged with 4273c90 (details and output in the
lane report's "Fix round 1" section):

- `node tools/summit_golden.mjs` → `summit golden: EQUAL`, exit 0; routing ok 32/32; `drive update() on classic and kit stand-ins: classic 0 throws, portal ok, perch ok, fūrin 1; modular 0 throws, portal ok, perch ok, fūrin 1; bare 0 throws, portal ok, perch ok, fūrin 0; bind warnings 25/25 (bare)`; `summit_test.mjs "83 passed, 0 failed", output identical to tools/golden/summit_test.txt (91 lines)`. Same page on the pre-fix sources → `EQUAL, ROUTING FAILED`, exit 1; routing forced off → `EQUAL, ROUTING NOT RUN`, exit 2.
- `node tools/summit_test.mjs` → `83 passed, 0 failed` (the 70 earlier checks unchanged; on the pre-fix sources 8 of the 13 new checks fail); a scratch mutation pass undoing each of the 21 new guards one at a time: 21 of 21 caught.
- `node tools/verify.mjs` → `All checks passed`, 53 PASS lines (none removed); `node tools/check_syntax.mjs` → `All 62 modules OK`; `node tools/kit_check.mjs` → `All kit checks OK (29 passed)`; `node tools/labs_check.mjs` → `All labs checks OK` (after `labs_coverage.mjs --write`: line links only); `node tools/footprint_golden.mjs` → `footprint golden: EQUAL`; `git diff --check origin/fable/integration...HEAD` → no output.
- Boots (Metal): `/__boot.html` and `/index.html?assets=modular` play, summit entered: `{set classic|modular, scoped, kit 0, active, colliders 24, platforms 8, problems []}`, only the known `cad-overrides.json` 404; `?swap=summit-furin:modular` adds exactly one `[kit]` warning.

Before review (merged tree 915fd33):

- `node tools/summit_golden.mjs` → `summit golden: EQUAL`, exit 0; `rng summit 51267 draws (probe ok) · Math.random 0 · volatile 0`; `routing ok: 32 summit ids, 34 classic placeAsset() calls; all modular 34/34 stand-ins, 51267 draws (probe ok); single swaps 32/32 ok`; `test summit_test.mjs "70 passed, 0 failed", output identical to tools/golden/summit_test.txt (75 lines)`. Advisory only (not the verdict): `+api placeAsset, assetEnv`, `+state.assets`, `_tree` no longer called by `buildRocksAndTrees`.
- Golden determinism (S1.1, before any move): 3 Metal runs byte-identical; after switching canvas textures to drawing-command hashes, Metal and SwiftShader digests byte-identical (`adc8a2c1…`); three EQUAL runs after `--write`.
- Golden perturbations (scratch copy, never the worktree): extra draw in `buildPollen` → DIFFERENT, `first summit builder to change: buildPollen (draws 270 → 271)`, exit 1; tree collider 0.34 → 0.35 → DIFFERENT (5 colliders); `makeLandTexture` seed → DIFFERENT (`state.MAT land`, terrain and shoulder materials); perch rim 12.2 → 12.3 → DIFFERENT (44 sightline rows); method removed → DIFFERENT (`- api makeVistaTextureLegacy`); extra Object3D → EQUAL; landing platform footprint off by 5 cm in the layout → `EQUAL, ROUTING FAILED` (all modular + swap summit-entry), exit 1.
- Byte-identity of the moves (scratch `checkmove.mjs` against `git show 5dc924a:src/mountaintop.js`), after S1.2: `53 methods and 30 top-level declarations compared, 0 differ`.
- `node tools/summit_test.mjs` → `70 passed, 0 failed` (same 70 checks; output identical to the pre-change capture).
- `node tools/verify.mjs` → `All checks passed`; 53 PASS lines (50 on the merged base before this lane's verify edits; every earlier check name still present) plus `All 8 summit modules OK (src/summit/)`, `70 passed, 0 failed`, `All kit checks OK (29 passed)`, `kit_test: tests 36, pass 36, fail 0`.
- `node tools/check_syntax.mjs` → `All 53 modules OK`.
- `node tools/labs_check.mjs` → `All labs checks OK`; `node tools/labs_coverage.mjs` → `OK 37 source modules, 112 construction methods, 190 inventory rows, 120 evidence targets` (totals as before; report regenerated with `--write`); `node --test tools/labs_coverage_test.mjs` → pass 11, fail 0.
- `node tools/kit_check.mjs` → `All kit checks OK (29 passed)`; `node tools/fable_swap_matrix.mjs` → `OK swap matrix: 186 rows …`; `node tools/footprint_golden.mjs` → `footprint golden: EQUAL`.
- `git diff --check origin/fable/integration...HEAD` → no output, exit 0.
- Boot, Metal: `node tools/headless.mjs /__boot.html --wait "…menu?.isPlaying" --eval <enter the summit, 4 s>` → plays in 6.2 s; summit `{ set: classic, scoped, kit: 0, active, colliders: 24, platforms: 8 }`; only console line the optional `cad-overrides.json` 404. Same with `/index.html?assets=modular --session catwalk_autostart=new` → `set: modular`, same counts, same single 404.
- Previews (`node tools/capture_baseline.mjs --only summit --compare <Phase 0 masters>`), and a control capture of the unchanged code (5dc924a sources, same tool, same session): meanΔ vs the masters, split / control: meditation 10.75 / 11.35, arrival 0.78 / 0.89, approach-front 0.21 / 0.13, approach-side 0.77 / 0.76, meadow-gate 14.12 / 14.04, edge-left 4.12 / 4.30, edge-right 3.84 / 3.44, edge-sheet 1.29 / 1.38. Split vs control directly: meanΔ 0.12 to 1.98 (meditation 1.98), within the repeat noise (0.05 to 1.31 in these runs; Phase 0 measured up to 10.6). Meditation frames inspected side by side: identical but for grass sway; city and sea open from the seat.

## Deferred assets and why
None (no kit asset is promoted in this lane).

## Footprint waivers requested
None.

## Notes for the Integrator
See `docs/fable/handoff/s1-summit-split.md`: no hot-file patch needed (the
runtime reaches the summit through `game.assets`); both AGENTS.md tag-bump
forms already cover `src/summit/`, and `tools/summit_golden.html/.js` are
bumped by hand; six inventory anchors changed; the Summit Lab's code panel now
shows a delegator; the per-id handle table for `s2`–`s4` (every handle now
bound or guarded); the branch merged integration four times rather than
rebasing (no force-push); `tools/golden/summit_test.txt` was regenerated for
the 13 added checks.
