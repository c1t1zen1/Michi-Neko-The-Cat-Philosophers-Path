# Review r1: r1-roof-split (BASE 2f78865 → HEAD 28c4709)

Reviewer: Claude Opus 5.5. I reviewed the diff in passes because it is 934 KB. I used git in the worktree, read-only. Scratch files are in `/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/r1-review/`. I skipped the generated data and checked only that each file matches what its tool produces: `tools/golden/rooftop_classic.json`, `labs/ASSET_COVERAGE.md` and `docs/fable/baseline/swap_matrix.md`.

### Spec Compliance

- ❌ **R1.3 is partly missing.** Five things are still built directly in the facade instead of through `assets.build`: the ground, the distant city, the three skyline pagodas, the Shōki and the treats (`rooftops/js/build.js:141-165`). Details are under Important.
- Everything else in R1.1–R1.5 and R57 checks out. Evidence:
  - ✅ **R57.** `git diff --stat 2f78865 28c4709 -- rooftops/js/{level,rail,physics,reach,autopilot,companion}.js` is empty.
    - Under `rooftops/` the lane edited only `build.js` and `game.js` (plus the new `pieces/`).
    - It did not touch `src/`, `index.html`, `AGENTS.md`, `catalog/`, `labs/shared/`, `kyoto-rooftops.html` or `BUILD_GUIDE_FABLE.md`.
  - ✅ **R1.2: the moves are verbatim.**
    - **Line count.** I compared every line of the 2f78865 `build.js` with `build.js` + `pieces/*.js` at 92efc80, the last commit that only moves code. Exactly 40 non-blank lines were lost: the 35 `B.x = (pc, ctx) => {` heads, 4 import lines and the "Shōki, treats, the distant city" banner. Every added line is a header comment, an import, an `export const x = (pc, ctx) => {` head or an `export {…}` line.
    - **Order.** For each piece module I removed the header and imports and turned the head back into `B.x =`. Every blank-line-separated chunk then appears verbatim and contiguous in the original file. The one exception is a comment banner in `common.js` ("Merging").
    - **Nothing changed after the move.** `git diff 92efc80 28c4709 -- rooftops/js/pieces/` touches only `index.js`.
    - **`buildWorld` itself.** Diffing the original and new bodies shows changes only in the piece loop (PIECES lookup, `pieceLayout`, `assets.build`, `placePiece`) and in the added `assets.update`/`assetEnv` lines (`build.js:99-120`, `167-179`).
    - **API.** `buildWorld` and `makeShoki` are still exported. Their callers are `rooftops/js/game.js:13` and `tools/rooftop_golden.js:241`.
    - **The downtown builders.** `installDowntown` only adds types; it never wraps or calls the original builders. So `DT = {}` (`pieces/index.js:58-59`) gives the same builders as before. That makes 48 PIECES types (35 + 13), and `buildLevel()` uses exactly those 48.
  - ✅ **R1.3 routing.**
    - `game.js:56-58` constructs the AssetRuntime the way `main.js:213` does, with the tag `?v=20261113a`.
    - Every tag on the new imports is `20261113a`: `build.js:30`, `pieces/paint.js:13`, `pieces/common.js:11`, `tools/rooftop_golden.js:243,378`.
    - `scopeAssets(undefined)` returns `CLASSIC_ASSETS` (`src/kit/runtime.js:551`), and `preload()` swallows its own errors (`runtime.js:250`).
  - ✅ **R1.4.** All proof checks pass (see Checks I ran).
  - ✅ **R1.1 inventory.**
    - The change is additive. `sourceFiles`, `ignoredBuilders` and `assets` all have their 2f78865 content as an unchanged prefix. Only the Roof Road exclusion text, `scope` and `reviewedAt` changed.
    - There are 62 Roof Road rows: 58 at review level, 4 embedded. That is honest, because the shelf runs the original builders, so it is review evidence and not a focused study.
  - ✅ **R1.5.** The lab works (see Checks I ran).
- ⚠️ **Cannot verify from the diff: the guide's R1.5 "catalog adapter".** The brief narrowed it to "a specimen the catalog can link", and that is met: every target has a `url`. The `asset-loader.mjs` adapter is deferred to that file's owner (handoff §4.2).
- ⚠️ **Merge risk outside this lane: the operator's uncommitted work.** The primary checkout (`/Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path`) has rooftops work that is on no branch:
  - `build.js` (±75 lines): the bridge deck and ramp are reworked, the float's musicians now come from `makeResident`, and the `cutaway.js` import is replaced;
  - `cutaway.js` is deleted;
  - `game.js` (226 lines) and `downtown.js` (45 lines) are edited;
  - three modules are new: `alley-passages.js`, `camera-obstacles.js` and `people.js`.

  These edits target the old single-file `build.js`. After this merge they must be ported into `pieces/bridge.js`, `pieces/float.js` and the facade (`build.js:24` still imports `cutaway.js`). Once they land, `labs_coverage` and `labs_check` will fail for two reasons:
  - the three new modules are unclassified and `cutaway.js` is "removed/renamed";
  - `people.js` adds `makeResident`, a `make` function no inventory row owns.

  R57 only foresaw `level.js` on `feat/rooftops-stage2` (17c9cae, which the lane probed: merge-tree is clean). The Integrator should coordinate with the operator before merging.

### Strengths

- **Careful, verifiable split.** The lane moved the code without rewriting it: one module per piece type, per-lane header comments, and every original line still in place.
- **The golden is written from the unchanged code and really catches changes.**
  - Its digest covers each mesh's world matrix, geometry hash, bounds, merged batches, materials and texture pixels, `update()` samples and the level data.
  - It builds the world twice to check that the build is repeatable, and refuses `--write` on any warning.
  - **Proof it can fail.** In a scratch copy of HEAD I moved the chimney rain cap by 1 cm (`pieces/chimney.js`). The tool returned `DIFFERENT (5 changed)`, first piece `#283 chimney`, exit 1.
  - **Proof of commit order.** HEAD's golden equals the file at 772433e, and 772433e's own tool on its own tree prints `EQUAL, byte-identical`. `git diff 2f78865 772433e -- rooftops/` is empty.
- **The routing self-test** (`tools/rooftop_golden.js:374-430`) uses stand-in kit assets on four leg directions. It checks the rail frame, the light sockets, that `live` parts stay out of the merge, that every other piece is identical, and that an id swapped with no kit asset still builds classic. This is real behaviour, not a mock.
- **The coverage checks were extended without being loosened.** Each of the 5 new tests proves its rule can fail, and none of the 11 existing tests changed. The `source module removed/renamed` check is only widened to also accept Roof Road files (`labs_coverage.mjs:91`). The swap matrix check that every piece row's lane matches PIECES (`fable_swap_matrix.mjs:244-252`) cross-checks the table rather than trusting it.
- **The handoff is thorough:** the piece → lane table, the frame contract for kit pieces, and exact patches for the Integrator.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)

1. **`rooftops/js/build.js:141-165`: five inventory rows have no `assets.build` route.** These are `roof-ground`, `roof-distant-city`, `roof-skyline-pagodas`, `roof-shoki` and `roof-treats`. The facade builds them by direct calls:
   - `new THREE.Mesh(... M.ground)` at 141;
   - `buildDistantCity` at 149;
   - `buildPagoda` ×3 at 150-152;
   - `makeShoki`/`makeTreat` at 158.

   **Why it matters.**
   - The lane assigned these rows to r2, r4 and r5. The §12 cards for r4 and r5 name "distant city, pagoda" and "the seven Shōki".
   - `build.js` is a hot file (guide §4.5), and "Phase 5 step R1" is the only planned moment to edit it.
   - As left, three parallel lanes must each send a hot-file patch to the same facade function before they can swap their card items. The handoff §2 even says so. That is the parallel editing of `build.js` that the serial r1 lane exists to prevent.

   **Fix.** Wrap each call in `assets.build(id, layout, classic)` and place the result with `placePiece`:
   - ground and city: a layout at the world centre (level origin);
   - pagodas: index 0–2 at their x and z, with the scale as a param;
   - pickups: `k.s` and `k.d`, with `dynamic.shoki`/`dynamic.treats` filled from the instance.

   The golden then proves classic equality. Extend the routing self-test with one stand-in for these extras (a pagoda, say).

#### Minor (Nice to Have)

1. **PIECES is read as text in two places.** The pattern is `tools/labs_coverage.mjs:23` (`PIECE_ENTRY`), repeated verbatim at `tools/fable_swap_matrix.mjs:33`.
   - An entry written another way, such as a quoted key, double quotes or a wrapped line, silently drops out of the "every piece type has a Roof Road row" check. The only guard is `pieces.length > 0`.
   - Fix: cross-check the match count against the number of `piece(` calls, and share one helper between the two tools.
2. **`pieces/index.js:58-59, 79-115` / `build.js:111-112`: downtown types now need a second registration.** Before, a builder added in `installDowntown` (`downtown.js`) plus a level piece of that type just worked. Now it throws `No Roof Road renderer for <type>` even though the builder exists. The operator is actively adding to `downtown.js`, so the error should name the fix (for example "add it to `rooftops/js/pieces/index.js` PIECES").
3. **`build.js:83-86`: the `dynamic` branch of `placePiece` is untested.** This branch is how a kit boat, float or villager animates. The routing self-test only uses static stand-ins with `live` parts and sockets.
4. **`rooftops/js/game.js:56-57`: `?assets=modular` loads the whole valley kit.** On the Roof Road page it preloads every valley family (the golden prints "kit loaded, 136 kit ids, 0 instances"), though no `roof-*` id can resolve. It costs load time only under the explicit flag.
5. **`labs/registry.js:44`: the hub link changed.** The `roofroad` extra keeps `kind: 'prototype'`, but the hub card now opens the shelf, not the run. Playing is one more click; consider stating that on the hub.

### Checks I ran (worktree, read-only)

| Command | Result |
|---|---|
| `node tools/rooftop_test.mjs` | `40 passed, 0 failed` |
| `node tools/rooftop_golden.mjs` | `EQUAL`, byte-identical; 441 pieces (573 adds, 0 empty); routing ok 27/27 |
| `--query "assets=modular"` | `EQUAL` |
| Golden on a 772433e export (unchanged `build.js`) | `EQUAL`, byte-identical; the golden file there is identical to HEAD's |
| Perturbation (chimney cap +1 cm, scratch copy) | `DIFFERENT (5 changed)`, exit 1 |
| `node tools/labs_check.mjs` | `All labs checks OK` |
| `node --test tools/labs_coverage_test.mjs` | `tests 16, pass 16, fail 0` |
| `node tools/labs_coverage.mjs` | `OK … 56 Roof Road modules, 10 Roof Road construction functions, 48 Roof Road piece types, 252 inventory rows` |
| `node tools/fable_swap_matrix.mjs` | `OK swap matrix: 248 rows …`; the regenerated output leaves `git status` clean, so the committed file is current |
| `git diff --check 2f78865 28c4709` | clean; the edited files keep LF line endings |
| Lab: `headless.mjs "/labs/roofroad/?specimen=float" --fail-on-error` | 52 entries and 52 tiles, errors `[]` |
| Page: `headless.mjs "/kyoto-rooftops.html?qa=1&shadows=0&swap=roof-bridge:modular"` | boots (`window.roofRoad` up), errors `[]` |
| Line-multiset and contiguity scripts (scratch `moves.mjs`, `contig.mjs`) | as described under R1.2 above |

### The Integrator patches in handoff §4

- **§4.1 AGENTS.md: must land at the merge.**
  - After the merge, the tagged `src/textures.js` imports live in `pieces/paint.js` and `pieces/common.js`, but AGENTS.md's hand-bump list still names only `game.js`, `build.js` and `labs/shared/game.js`.
  - The next tag bump done by the book would miss them. The Roof Road page and the lab would then load a second copy of `src/textures.js` (`game.js` bumped, `pieces/*` stale).
  - The same patch also carries the 40-check count, the new golden tool and the coverage-regeneration rule (below).
- **§4.1 coverage-regeneration rule (the fourth patch): must land at the merge.** `labs_check` now fails whenever an anchored line moves in `rooftops/js/{build,game,downtown,sky,atmosphere}.js`, `pieces/*.js` or `labs/roofroad/js/shelf.js`, until `labs_coverage.mjs --write` is run. It also fails whenever a new `rooftops/js` module or `make…` function appears (see the merge-risk note above). The operator must be told before their next commit.
- **§4.2 `catalog/js/links.mjs`: should land at the merge or right after; it does not block.** The 62 new catalog rows get an "Open the game" link to `index.html`, which does not contain the Roof Road. It is a small patch in t1's file, and the evidence links already work.
- **§4.3 a tag check in verify for `rooftops/js/**`: later.** This is hardening. The AGENTS.md text is the minimum, and the check removes the human step.

### Assessment

**Task quality:** Needs fixes

**Reasoning:** The split is a verified move, the new golden was written first and catches a 1 cm change, R57 is clean, and the inventory and tests only grow. The one Important gap is that the five facade-built rows (ground, city, pagodas, Shōki, treats) were left unrouted in the hot file that only this lane may edit. That should be fixed now, while `build.js` is still open, rather than through three later hot-file patches.
