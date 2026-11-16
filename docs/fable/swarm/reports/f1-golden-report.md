# f1-golden report (guide F1.6, footprint golden)

- Worker: Claude Opus 5.5 · worktree `/Users/c1t1zen/Documents/GitHub/michi-wt/f1-golden` · branch `fable/f1-golden`
- Base: ed9f5b9 (fable/integration at dispatch) · head: 592d425 · PR: https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/pull/4
- Status: DONE (concerns listed at the end are design notes, not failures)

## What was built

### `tools/footprint_golden.html` + `tools/footprint_golden.js`

The page builds the valley as the review sheets do (`town_preview.js`, `hidden_preview.js`):

1. `new Countryside(scene)` with its default seed 20260729.
2. `new HiddenPlaces(scene, city)`, in the `src/main.js` order.
3. `new ContextActionManager({ scene: stubScene }, city, …)` plus `hidden.attach(…)`, so the rest spots are the game's full list of 8.

There is no renderer, no Vegetation and no Interior. The page then writes a JSON digest (19 top-level sections):

| Section | Content |
|---|---|
| `rng` | Valley stream draws (49,233) with `probe: true`, hidden-places draws (7,810), game `Math.random()` draws (92) |
| `builders` | Per top-level builder in build order: stream draws, `Math.random` draws, colliders, platforms, exclusions, water rects, scene objects added. `calls`: every `build*`/`create*` method with its call count and inclusive totals (covers the F2.4 nested builders) |
| `colliders`, `houseColliders` | `city.colliders` in order (518), `villageHouseColliders.left/right` |
| `platforms` | 65 entries. Box3 platforms as boxes. Function platforms carry their gating (`rank`, `ability`), the exact world rect captured from `addOrientedPlatform` / `addSlopedRoofPlatforms`, and a `getHeightAt` probe on a 0.1 m lattice (`n`, bbox, min/max/mean height, normal). The probe is the only record of the two bridge-ramp closures |
| `waterRects`, `water`, `exclusions`, `samples` | 5 water rects, the bridge deck clearance and ramps, 4 exclusion rects, path (101) and river (61) samples |
| `anchors` | 25 fields. Every `this.*Pos`, plus 12 `this.*Mesh` handles (key and world position), `doorCollider` (index and box), 17 collectibles (id and kind), offering bells, 10 lanterns (position, baseY, phase), 6 toro spots, Larry (home, bounds, radius, speed), 10 bamboo fences (role, collider index, which house colliders they join), bush collider spots, shrine-thicket trees and bushes (collider indices), Moon Pool and Lantern Glade (11 lanterns, stalk tops), 8 rest spots, `shrinePoint` |
| `objects` | 312 named Object3Ds, snapshotted inside `_mergeStatics()` before the merge removes them. Each has its name path (`Machiya House W1/Kawara Roof/Onigawara Ornament#2`), world p / q (canonical sign) / s, and hidden flag. Renderables also get material signature, shadow flags, local geometry stats (vertices, indices, bbox, centroid, covariance) and instance stats (count, translation bbox and mean, mean linear part, mean instance colour) |
| `aggregates` | 185 groups covering 1,840 unnamed renderables, grouped by nearest named ancestor and measured in that ancestor's frame (instanced members expanded): count, vertices, bbox, centroid, covariance, material multiset, shadow counts |
| `baked` | 62 merged "Baked Statics" meshes, keyed by parent, material and flags (not by their merge-order number): vertices, indices, bbox, centroid, covariance, mean UV |
| `volatile` | What the two-build comparison masked (13 leaves, 15 members), with paths |

Numbers are rounded to 1e-4. Key order is build order. The text puts one entry per line (1,671 lines), so a git diff of the golden stays readable.

**Diff mode.** The page fetches `tools/golden/valley_classic.json` (or `?golden=`) and diffs the parsed documents.

- Maps are matched by key. Lists are aligned by LCS, so one inserted collider reads as one `+`, not 300 changes.
- The result is `{ equal, counts: {added, removed, changed}, added: [paths], removed: [paths], changed: [paths with notes], sections, items, where, advisory }`. Lists are capped (items 2,000; per-kind lists 200), and the counts are complete.
- Notes explain each change: "p moved 0.12 m", "q turned 3.1°", "max |Δ| 0.05 at [2]", "draws 45 → 54".
- `where` names the first top-level builder whose totals changed and the methods whose totals changed. It also says when a list holds the same entries in another order.
- Changes are listed causes first (rng, builders), then colliders → baked, with counts last.
- `builders` is **advisory**: shown, never part of the verdict. A faithful split may move a draw from `createChochinLantern` into a layout step while keeping the stream order (scratch test 6 proves this case). The stream position (`rng`) and everything observable stay in the verdict.

**Hook for f1-runtime.** `countrysideOptions()` is the one place to pass `options.assets` (ruling R11). Unknown page flags are ignored.

### `tools/footprint_golden.mjs` (Node CLI)

```
node tools/footprint_golden.mjs [--write] [--query "?assets=modular&swap=..."] [--out file]
                                [--golden file] [--max n] [--json] [--gpu metal|swiftshader] [--timeout s] [--console]
```

- It runs the page through `runPage` from `./headless.mjs`, serving the repo it lives in, and prints a one-screen summary.
- Exit codes: **0** equal (or written), **1** different, **2** could not run (no or unparseable golden, page error, Playwright or headless.mjs missing), **64** bad arguments.
- `--query` is passed through verbatim. `--write` regenerates the golden.
- A missing `tools/headless.mjs` gives a clear message pointing at Phase 0.

### `tools/golden/valley_classic.json`

Generated from this checkout (main @ ed9f5b9; no game file changed). Size: **181,894 bytes**, 1,671 lines, SHA-256 `8e689522812eceddbb3ec27644b11f0f77de7580f85407c0c7b432ea5edb82c2`.

| Count | Value |
|---|---|
| Named objects | 312 |
| Aggregates (members) | 185 (1,840) |
| Baked meshes | 62 |
| Colliders | 518 |
| Platforms | 65 |
| Water rects | 5 |
| Exclusions | 4 |
| Anchor fields | 25 (holding 17 collectibles, 10 lanterns, 6 toro spots, 10 fences, 27 bush spots, 6 thicket trees, 19 thicket bushes, 11 glade lanterns, 8 rest spots, 12 handles, …) |
| Valley draws | 49,233 |

**Run time** (CLI, wall, Metal, Apple M5 Max): 3.17 / 3.36 / 3.23 s. In the page: import ≈1.0 s, build A ≈0.63 s, build B ≈0.37 s, digest and diff ≈0.06 s. Under SwiftShader: 5.18 s, since nothing is rendered.

## Stream-position check: the method

- **Counting.** Before construction the page installs an accessor named `rng` on `Countryside.prototype`. The constructor's `this.rng = mulberry32(seed)` hits that setter. The setter puts an own accessor on the instance whose getter returns a counting wrapper around the generator, and a later reassignment would be wrapped and counted too. Every draw is counted, both through `this.random()` and through `buildCanopy(this.rng, …)` in `buildEdgeForest`, which bypasses `random()`. Values are unchanged and countryside.js is not edited. HiddenPlaces' `this.rand` is counted the same way.
- **Proof.** After the build, the page draws one probe value through the wrapper, uncounted. It checks that this value equals value N+1 of a fresh `mulberry32(city.seed)`, the same algorithm as countryside.js. `rng.valley.probe: true` means the count N (49,233) is the true stream position.
- **Per builder.** Prototype wrappers on every `build*` / `create*` method give each top-level builder's share in build order, and each method's inclusive share.

## Neutralised sources (page only; no game file edited)

| Source | Where | Treatment |
|---|---|---|
| `Math.random()` at build time | `buildBirdNest` egg tilt (3 draws), `buildOfferingBells` bell yaw (5), `buildDawnMist` sprite placement (84) | Seeded replacement installed before any game module loads (game modules are loaded with `import()` after the shims). The valley is then built twice with different ambient seeds and clocks. Values that differ are written as `"~"` (the bells' q[1]/q[3], three numbers of the baked egg mesh), and differing unnamed members are left out of their aggregate (3 eggs, 12 mist sprites; counted as `vol`) |
| three.js `generateUUID()` | Every Object3D, geometry, material and texture, 4 `Math.random()` draws each | On a single stream, a builder's `Math.random()` value would depend on how many three.js objects came before it. One extra Group in an f2 split would reshuffle the eggs. The shim checks its caller (a 3-frame stack) and serves UUID draws from their own stream, with a self-check at start (`uuidSeparated`). Proven by scratch test 2 |
| `performance.now()`, `Date.now()` | Not read by the build today | Stepping fake clock: deterministic, and monotonic so time-budget loops still end. Build B uses another start and step, so clock-driven values would be masked too |

## Checks run (real output, trimmed)

Each item gives the command and what it printed.

1. **Three determinism runs, final code.** For N in 1..3, `node tools/footprint_golden.mjs --out <scratch>/final_N.json`:
   ```
   run 1 EXIT=0 real 3.17 | footprint golden: EQUAL | time     build 635 + 366 ms · page 2.1 s · run 3.1 s
   run 2 EXIT=0 real 3.36 | footprint golden: EQUAL | time     build 636 + 374 ms · page 2.1 s · run 3.2 s
   run 3 EXIT=0 real 3.23 | footprint golden: EQUAL | time     build 623 + 362 ms · page 2.1 s · run 3.1 s
   8e689522…edb82c2  tools/golden/valley_classic.json
   8e689522…edb82c2  final_1.json / final_2.json / final_3.json
   ALL THREE BYTE-IDENTICAL TO THE GOLDEN
   ```
   An earlier set of three runs, before the diff and UI changes, printed the same SHA.
2. **Summary of an EQUAL run.** `node tools/footprint_golden.mjs`:
   ```
   footprint golden: EQUAL
     golden   tools/golden/valley_classic.json  181,894 bytes, byte-identical to this build
     counts   312 objects · 185 aggregates (1840 members) · 62 baked · 518 colliders · 65 platforms · 5 water rects · 4 exclusions · 25 anchors
     rng      valley 49233 draws (probe ok) · hidden 7810 · Math.random 92 · volatile 13 leaves, 15 members
   EXIT=0
   ```
3. **SwiftShader.** `node tools/footprint_golden.mjs --gpu swiftshader` printed `EQUAL … [Google, Vulkan 1.3.0 (SwiftShader Device …)]`, exit 0, real 5.18 s.
4. **Query passthrough.** `--query "?assets=modular&swap=torii:modular"` printed `EQUAL`, page `/tools/footprint_golden.html?assets=modular&swap=torii:modular`, exit 0.
5. **Acceptance perturbation.** In a scratch copy (`_scratch/f1-golden/repo`, only `src/` and `tools/`), the shrine hall collider pad went from 0.4 to 0.45:
   ```
   footprint golden: DIFFERENT (1 changed, 0 added, 0 removed)
     section           added  removed  changed
     colliders             0        0        1
     ~ colliders[29]   max |Δ| 0.05 at [2]
         [-1.5,0.45,-33.3,1.5,3.05,-30.7]  →  [-1.55,0.4,-33.35,1.55,3.1,-30.65]
   EXIT=1
   ```
   The perturbation was discarded: the scratch file was restored and `diff -q` against the worktree printed nothing. The worktree's game files were never touched.
6. **Extra Object3D (scratch).** An extra `new THREE.Object3D(); new THREE.MeshBasicMaterial();` before the eggs printed `EQUAL`, exit 0.
7. **Extra stream draw (scratch).** An extra `this.random()` in `buildVillageHouse` printed:
   ```
   DIFFERENT (751 changed, 11 added, 13 removed)
   first countryside builder to change: buildVillageStreet (draws 45 → 54; objects 443 → 450)
   methods whose totals changed: countryside.createChochinLantern (calls 10 → 11; draws 10 → 11), …, countryside.buildVillageHouse (draws 45 → 54), …
   ~ rng.valley.draws   Δ 34
   EXIT=1
   ```
8. **Hoisted draw (scratch).** The lantern phase draw moved from `createChochinLantern` into its caller, with the stream order kept. It printed `EQUAL`, exit 0, and `note builder attribution differs in 1 entry … countryside.createChochinLantern (draws 10 → 5)`.
9. **Rename (scratch).** Renaming `Wind Chime` to `Furin Chime` printed `DIFFERENT (1 changed, 2 added, 2 removed)` (the object, its aggregate and `anchors.handles.windChime`), exit 1.
10. **Anchor shift (scratch).** Moving `chimePos` y by −0.05 printed `DIFFERENT (1 changed …)` with `~ anchors.chimePos max |Δ| 0.05 at [1]`, exit 1.
11. **CLI error paths (scratch).**
    - An unparseable golden gave `NO GOLDEN … unusable: the golden is not valid JSON`, exit 2.
    - With headless.mjs moved away: `tools/headless.mjs did not load … shared headless runner from Phase 0`, exit 2.
    - `--bogus` exited 64, `--help` exited 0, and `--golden /tmp/x.json` exited 64 with "must be inside …".
12. **Integration head.** `src/` of `fable/integration` @ 8d5bb7b (after the p0-checks merge), via `git archive` into a scratch dir, printed `EQUAL … byte-identical`, exit 0.
13. **Syntax.** `node tools/check_syntax.mjs` printed `All 37 modules OK` (exit 0). `node --check tools/footprint_golden.mjs` and `node --input-type=module --check < tools/footprint_golden.js` produced no output (exit 0).
14. **Whitespace.** `git diff --check fable/integration...HEAD` produced no output (exit 0).
15. **Only my files.** `git diff --stat fable/integration...HEAD` lists 5 files: `docs/fable/status/f1-golden.md`, `tools/footprint_golden.html`, `tools/footprint_golden.js`, `tools/footprint_golden.mjs` and `tools/golden/valley_classic.json`, for 3,200 insertions. `tools/headless.mjs` stays untracked and was never staged.
16. **The page for a person.** Screenshots at `_scratch/f1-golden/page_equal.png` and `page_different.png` show a status line, a summary and the change list.

## Files changed

The five files are listed in check 15. The commits:

- 014413a: claim lane (status file)
- 8f2aca3: footprint golden page and headless CLI (F1.6)
- 59565a9: classic valley digest, diff readability, CLI pass-through
- 592d425: status file: steps, checks with real output, notes for the Integrator

## Assets promoted / deferred

None; this is a tooling lane. **Footprint waivers:** none.

## Self-review against the lane's acceptance list

| Item | Result |
|---|---|
| 3 identical runs | Yes: byte-identical, SHA `8e689522…`, done twice (before and after the final edits) |
| Golden committed | Yes: `tools/golden/valley_classic.json` from ed9f5b9. Size, counts and run time are above |
| CLI exits 0 on this checkout | Yes (check 2) |
| CLI exits 1 with a readable diff on one perturbed collider in a scratch copy, then discarded | Yes (check 5): one line names `colliders[29]` and its delta |
| Run time recorded | ≈3.2 s per run on Metal, 5.2 s on SwiftShader. Target was "well under a minute" |
| `check_syntax`, `git diff --check fable/integration...HEAD` | Both green |
| Only my files changed; pushed; PR open | Yes: PR #4 |
| Brief items (a)–(e), diff mode, `--write/--query/--out`, ignore unknown flags, list neutralised sources | All covered above |

## Open concerns / notes for the Integrator

1. **Merge order.** The CLI needs `tools/headless.mjs` from `p0-browser`. Merge this PR after (or together with) Phase 0's browser half. Until then the CLI exits 2 with a clear message, and the page itself works in any browser.
2. **Vegetation is not built.** That matches the brief's scope; F3.3 extends the golden later. In the game, Vegetation appends its tree colliders to `city.colliders` after HiddenPlaces, so those are not in this golden. Vegetation reads only the colliders, samples, water rects and exclusions, all of which are digested, plus its own seed (77). So any Countryside change that would reach Vegetation is already caught. Interior and Vegetation would join in `buildOnce()`, keeping the main.js order.
3. **`builders` is advisory by design** (explained above). If the Integrator wants per-method attribution to be binding, delete `builders` from `ADVISORY` in `tools/footprint_golden.js`. Expect false alarms from faithful splits if you do.
4. **Collider and platform order is part of the verdict**, as is everything else in a list. A pure "move the code" split keeps the order. If one changes it, the diff says "the same N entries in another order" in the `where` lines.
5. **Volatility detection compares two builds.** A `Math.random`-driven value that happens to round to the same number in both builds stays unmasked. That value is still stable across refactors, because game `Math.random()` draws no longer depend on three.js object counts. It changes only if `Math.random` calls are reordered.
6. **The UUID routing depends on the name `generateUUID`** appearing in the call stack (three r160, unminified, as the import map loads it). The page self-checks this at start and warns if it ever stops working.
7. **Cache tags.** The page imports game modules with `20261107a`. The AGENTS.md one-liner rewrites only `src/*.js` and `index.html`, so a gate bump should include `tools/footprint_golden.html` and `.js`. A stale tag still works; it only loads a separate module URL.
8. **Hardcoded anchors outside Countryside.** The page uses `ContextActionManager` only for its hardcoded rest spots and `shrinePoint`. Its module-level `_DOOR_POS` (20, 0, 12.5) cannot be reached and is not digested.
9. **The bridge ramps have no exact record.** They are raw closures, so they are described only by the 0.1 m `getHeightAt` probe. Ramps are sloped, so the height statistics catch small shifts. All other function platforms also carry their exact rect.
10. **AGENTS.md is stale on one count.** It says `check_syntax` covers "all 36 modules"; it now prints 37. AGENTS.md is a hot file, so this is noted, not edited.

## Fix round 1 (after merge 5dc924a): commit 83f9651 on `fable/f1-golden`

Scope as asked: only `tools/footprint_golden.mjs`, `docs/fable/status/f1-golden.md` and the new
`docs/fable/handoff/f1-golden.md`. `tools/footprint_golden.js` and `.html` are untouched (other lanes are editing them).

### Changes

1. **The `--write` guard** (`tools/footprint_golden.mjs`):
   - **Query.** `--write` with a non-empty `--query` and no `--golden` is refused up front (exit 2), before any browser starts. With an explicit `--golden <file>` it writes there.
   - **Untrusted run.** After the run, `--write` is refused (exit 2, golden untouched) when any of these holds:
     - `probe:false`
     - `ambient.uuidSeparated` is not true
     - the page reported any warning
     - the page logged any console error. I added this last condition: a run that logged errors should not become the golden.
   - **Failed probe.** In compare mode, `probe:false` exits 2 (`PROBE FAILED`) even when the digest is equal.
   - **Verdict.** It is a single `verdict()` that returns `{ state, code, reasons }`. `--json` now carries it.
2. **Wording** (status file): the "first … builder to change" and "methods whose totals changed" lines are count-based. They locate where draw counts (and collider, platform, exclusion, water and object counts) first diverge, not value-only reorders. Those show only in the values, where the first changed entry is the pointer.
3. **Hook coupling** (new `docs/fable/handoff/f1-golden.md`): a table of the three requested hooks, each with page and game line numbers:
   - `countDraws` (L163, installed at L290/L291) assumes the plain assignment `this.rng = mulberry32(this.seed)` at countryside.js L143, and `this.rand =` at hidden_places.js L77.
   - `trackPlatformHelpers` (L235; L240/L242/L253, rect formula L259–L264) assumes `addOrientedPlatform` (L362, returns the platform, L377) and `addSlopedRoofPlatforms` (L381, two platforms, side −1 then +1, L388).
   - `trackMerge` (L274; L275/L277) assumes `_mergeStatics` (L220), called once at L207.

   Each row says what breaks and what to update, and lighter couplings are listed below the table. Page line numbers are as of 592d425 = 5dc924a.
4. **CLI nits:**
   - `-h` is accepted.
   - `kb()` prints `181.9 kB`.
   - When the page has a golden but no diff, the CLI prints `COULD NOT COMPARE` with the page's `golden.error` and exits 2.

### Finding: a throwing diff crashes the page, not the CLI

When `diffDigests` throws, the page itself crashes. Its status rendering reads `diff.equal` on a null diff, so `main()`'s catch replaces the result. With the current page the CLI therefore prints `PAGE FAILED … TypeError: Cannot read properties of null (reading 'equal')` and exits 2. That is not a bare DIFFERENT, but the root cause is lost inside the page. The two-line page patch is written out in the handoff file (an `else if (!diff)` branch in `main()`) and was not applied, because the page is off limits this round. With it, the CLI prints the root cause (T8b below).

### Checks (real output, trimmed)

Worktree runs used this branch. Scratch runs used a copy of `src/` + `tools/` in `_scratch/f1-golden/repo`, restored afterwards; the restore was checked with `diff -rq`.

**T1, worktree.** `node tools/footprint_golden.mjs`:
```
footprint golden: EQUAL
  golden   tools/golden/valley_classic.json  181.9 kB, byte-identical to this build
  digest   181.9 kB
  rng      valley 49233 draws (probe ok) · hidden 7810 · Math.random 92 · volatile 13 leaves, 15 members
T1 EXIT=0
```

**T2, worktree.** `node tools/footprint_golden.mjs -h` printed the usage and exited 0.

**T3, worktree.** `--write --query "?assets=modular"`:
```
footprint golden: WRITE REFUSED
  reason   --query is set ("assets=modular"): a run with page flags does not overwrite the classic golden; pass --golden <file> to write its digest to another file
T3 EXIT=2        golden sha 8e689522812ecedd before and after
```

**T4, scratch.** `--write --query "?assets=modular" --golden tools/golden/modular_test.json` printed `WROTE` and exited 0. The follow-up compare printed `EQUAL`, `byte-identical`, exit 0. The file was then removed.

**T5, scratch.** I added `this.rng = mulberry32(this.seed + 1);` at the top of `buildYarn`.
- `--write`:
  ```
  footprint golden: WRITE REFUSED
    reason   the rng probe failed: the counted valley draws do not match the stream position
    reason   page warning: rng probe failed: the counted draws do not match the stream position
  T5a write EXIT=2 golden sha 8e689522812ecedd -> 8e689522812ecedd
  ```
- Compare:
  ```
  footprint golden: PROBE FAILED (11 changed, 1 added, 0 removed)
  T5b compare EXIT=2
  ```
- That run's digest copied in as the golden, then compare:
  ```
  footprint golden: PROBE FAILED
    reason   the rng probe failed: … (the digest is equal)
    golden   … 181.9 kB, byte-identical to this build
  T5c equal-digest compare EXIT=2
  ```

**T6, scratch page.** With `calledFromUUID` returning false, `--write` gave `WRITE REFUSED` with reasons `three.js UUID draws were not kept apart from Math.random()` and the page warning. Exit 2, golden unchanged.

**T7, scratch.** With `this.scene.add(new THREE.Group())` after `_mergeStatics()`:
- `--write` gave `WRITE REFUSED` / `reason   page warning: object added after the merge: Group under (root)`, exit 2, golden unchanged.
- Compare gave `EQUAL`, exit 0.

**T8, scratch page.** With a `throw` injected in `diffDigests`, compare gave:
```
footprint golden: PAGE FAILED
  error    TypeError: Cannot read properties of null (reading 'equal')
T8 compare EXIT=2
```

**T8b, scratch page.** With the handoff patch plus the same `throw`:
```
footprint golden: COULD NOT COMPARE
  reason   the comparison failed: diff exploded (scratch test)
T8b compare EXIT=2
```

**T8c, scratch page.** With the handoff patch alone: `EQUAL`, byte-identical, exit 0. The patch changes no digest byte.

**Static checks.**
- `node --check tools/footprint_golden.mjs` exited 0.
- `node tools/check_syntax.mjs` printed `All 37 modules OK`.
- `git diff --check fable/integration...HEAD` printed nothing (exit 0).
- `git diff --stat origin/fable/integration...HEAD` lists 3 files: the handoff, the status file and `tools/footprint_golden.mjs`, for 170 insertions and 28 deletions.

### Open after this round

- The page patch in the handoff waits for whoever next owns `tools/footprint_golden.js`.
- The `--write` guard also refuses on page console errors; that condition is my addition to the four requested.
