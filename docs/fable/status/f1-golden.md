# f1-golden

- Worker / model:     Claude Opus 5.5 (claude-opus-5-5)
- Claimed:            2026-11-13 03:05 PST
- Branch:             fable/f1-golden
- Base commit:        ed9f5b9 (fable/integration = main)
- State:              ready for review

Lane: guide item F1.6, split out of `f1-runtime` by the Integrator (ruling R10).
Builds the footprint golden: `tools/footprint_golden.html` (+ `.js`), the Node
CLI `tools/footprint_golden.mjs`, and the classic digest
`tools/golden/valley_classic.json`. Changes no game file.

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| (none: tooling lane) | | | | | |

## Steps
- [x] L1 Claim (this file, pushed)
- [x] L2 Read (AGENTS.md, guide §3.3/§3.4/§8, review sheets, main.js world order, countryside.js, hidden_places.js, context_actions.js)
- [x] G1 Page `tools/footprint_golden.html` + `.js`: build + digest (rng, builders, colliders, platforms, water, exclusions, samples, anchors, objects, aggregates, baked)
- [x] G2 Determinism: three runs byte-identical; neutralised sources listed below
- [x] G3 Diff mode against `tools/golden/valley_classic.json` (`{ equal, added, removed, changed }`, counts, capped lists)
- [x] G4 Node CLI `tools/footprint_golden.mjs` on `tools/headless.mjs` (`--write`, `--query`, `--out`, `--golden`, `--max`, `--json`)
- [x] G5 `tools/golden/valley_classic.json` generated from ed9f5b9: 181,894 bytes
- [x] G6 Perturbation proof in a scratch copy (exit 1, one readable change), then discarded
- [x] G7 Checks, report, PR

## Using it (f2, f3, kit lanes)
```
export PLAYWRIGHT_MODULE=/path/to/node_modules/playwright
node tools/footprint_golden.mjs                 # exit 0 equal, 1 different, 2 could not run
node tools/footprint_golden.mjs --max 60        # list more changes
node tools/footprint_golden.mjs --write         # only when a change is intended (say why in the commit)
```
About 3 s per run on Metal (5 s under SwiftShader; the page never renders).
When it says DIFFERENT, read the "first … builder to change" and "methods whose
totals changed" lines first. They compare per-builder *counts*: stream draws,
`Math.random()` draws, colliders, platforms, exclusions, water rects and
objects. So they show where those counts first diverge, not where a value first
moved. A change that keeps every count does not show there: two draws swapped
inside one builder, a value-only reorder, a collider nudged in place. It shows
only in the values; then the first changed entry in the list is the pointer
(causes first, build order within a section). `builders` is advisory (a
faithful split may move a draw between methods); everything else is the
verdict. `--write` refuses a run with `--query` (unless `--golden` names another
file), a failed rng probe, UUID routing off, or any page warning or console
error. Hook coupling (what to update if a lane moves `this.rng`, the platform
helpers or `_mergeStatics`): `docs/fable/handoff/f1-golden.md`.

## Checks run (command → real result)
- `node tools/footprint_golden.mjs --out <scratch>/final_N.json` ×3 → `EQUAL`, exit 0 each; the three digests and the golden share SHA-256 `8e689522812eceddbb3ec27644b11f0f77de7580f85407c0c7b432ea5edb82c2`; 3.17 / 3.36 / 3.23 s wall
- `node tools/footprint_golden.mjs --gpu swiftshader` → `EQUAL`, exit 0, 5.18 s wall
- `node tools/footprint_golden.mjs --query "?assets=modular&swap=torii:modular"` → `EQUAL`, exit 0 (passed through verbatim, ignored by the page)
- Scratch copy, shrine collider pad 0.4 → 0.45 → `DIFFERENT (1 changed, 0 added, 0 removed)`, exit 1: `~ colliders[29]   max |Δ| 0.05 at [2]`
- Scratch copy, extra `this.random()` in `buildVillageHouse` → `DIFFERENT`, exit 1; `first countryside builder to change: buildVillageStreet (draws 45 → 54; objects 443 → 450)`, `countryside.buildVillageHouse (draws 45 → 54)`
- Scratch copy, extra `new THREE.Object3D()` before the nest eggs → `EQUAL`, exit 0
- Scratch copy, lantern phase draw hoisted from `createChochinLantern` into its caller (stream order kept) → `EQUAL`, exit 0, advisory note `countryside.createChochinLantern (draws 10 → 5)`
- Scratch copy, `Wind Chime` renamed → `DIFFERENT`, exit 1 (object, aggregate, `anchors.handles.windChime`); `chimePos` y − 0.05 → `DIFFERENT`, exit 1 (`anchors.chimePos`)
- `node tools/check_syntax.mjs` → `All 37 modules OK`
- `node --check tools/footprint_golden.mjs`; `node --input-type=module --check < tools/footprint_golden.js` → no output, exit 0
- `git diff --check fable/integration...HEAD` → no output, exit 0

### Fix round 1 (CLI write guard and nits; handoff hook coupling)

The runs marked "worktree" used this branch. The others used a scratch copy of `src/` + `tools/`, discarded afterwards.

- Worktree, `node tools/footprint_golden.mjs` → `EQUAL`, golden `181.9 kB, byte-identical to this build`, exit 0.
- Worktree, `node tools/footprint_golden.mjs -h` → usage, exit 0.
- Worktree, `--write --query "?assets=modular"` → `WRITE REFUSED` / `reason   --query is set ("assets=modular"): …`, exit 2; golden SHA `8e689522812ecedd` unchanged.
- Scratch, `--write --query "?assets=modular" --golden tools/golden/modular_test.json` → `WROTE`, exit 0; the follow-up compare → `EQUAL`, exit 0.
- Scratch, `this.rng` reassigned in `buildYarn`:
  - `--write` → `WRITE REFUSED` (probe failed, page warning), exit 2; golden unchanged.
  - Compare → `PROBE FAILED (11 changed, 1 added, 0 removed)`, exit 2.
  - With that run's own digest copied in as the golden → `PROBE FAILED`, "the digest is equal", byte-identical, exit 2.
- Scratch page, `calledFromUUID` forced false → `--write` refused (`three.js UUID draws were not kept apart from Math.random()`, page warning), exit 2.
- Scratch, empty `Group` added after `_mergeStatics()` → `--write` refused (`page warning: object added after the merge: Group under (root)`), exit 2; compare → `EQUAL`, exit 0.
- Scratch page, `throw` in `diffDigests` → `PAGE FAILED … TypeError: Cannot read properties of null (reading 'equal')`, exit 2. The page's own rendering crashes on the null diff; the patch is in the handoff.
  - With that page patch applied → `COULD NOT COMPARE` / `reason   the comparison failed: diff exploded (scratch test)`, exit 2.
  - With the patch alone → `EQUAL`, exit 0.
- `node --check tools/footprint_golden.mjs` → exit 0.

## Neutralised sources (page only, no game file edited)
- `Math.random()` at build time in `buildBirdNest` (egg tilt, 3 draws), `buildOfferingBells` (bell yaw, 5), `buildDawnMist` (sprite placement, 84): seeded in the page, then marked `"~"` (13 leaves) or left out of their aggregate (15 members) by the two-build comparison
- three.js `generateUUID()` (four `Math.random()` draws per object, geometry, material and texture): routed to its own stream, so one more Object3D in a split builder cannot move the values above
- `performance.now()` / `Date.now()`: a stepping fake clock (nothing in the build reads them today)

## Deferred assets and why
None (tooling lane).

## Footprint waivers requested
None.

## Notes for the Integrator
- `tools/headless.mjs` was used untracked (copied from `origin/fable/p0-browser` 31769e6) and is not in this branch; the CLI imports `./headless.mjs`, so this lane merges after (or with) Phase 0's `p0-browser`.
- The page imports game modules with tag `20261107a`; a tag bump should include `tools/footprint_golden.html` and `.js` (outside the AGENTS.md `src/*.js index.html` one-liner).
- f1-runtime: `countrysideOptions()` in `tools/footprint_golden.js` is the one place to pass the asset runtime (`options.assets`, ruling R11); the page otherwise ignores `?assets=` / `?swap=`.
- f3 (F3.3): `buildOnce()` is where Interior joins; keep the main.js order (Countryside → HiddenPlaces → Interior → Vegetation).
- `fable/integration` moved to 8d5bb7b (p0-checks) after dispatch; that merge changed no game file and none of this lane's files. Checked: `src/` of 8d5bb7b (git archive into a scratch dir) with these tools → `EQUAL`, byte-identical, exit 0.
