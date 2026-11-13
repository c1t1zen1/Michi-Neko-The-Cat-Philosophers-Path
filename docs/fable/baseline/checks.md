# Baseline checks — Node half (guide §7, step P0.2)

Recorded by lane `p0-baseline`, part 1 (`p0-checks`), 2026-11-13. This file holds the Node and CLI commands of
guide Appendix C, run on the code of `main` @ `ed9f5b9` ("Add BUILD_GUIDE_FABLE: the modular asset swap master plan"). Every command, exit code, wall time and
output below was captured from a real run; long outputs are trimmed with an explicit marker that says how many lines
were omitted and which pattern they matched. Nothing was fixed or changed to make a check pass.

**Browser rows** (the `tools/labs_geometry_test.html` suite, the full-game `/__boot.html` boot, the review sheets and the
optional Playwright suites) are recorded by lane part 2 in [`checks-browser.md`](checks-browser.md).

**Result: all 14 required commands exited 0 on `main`. There is no failure to report.**

## Environment

| Item | Value |
|---|---|
| Machine | Mac17,7, Apple M5 Max, 128 GB RAM |
| OS | macOS 26.6.2 (Darwin 25.6.0, arm64) |
| Node / npm / git | v26.7.0 / 11.19.0 / git version 2.55.0 |
| Checkout | `/Users/c1t1zen/Documents/GitHub/michi-wt/p0-checks`, branch `fable/p0-checks` |
| Commit run on | `50bca49` ("p0-baseline: claim lane, add status file (part 1, p0-checks)") = `main` @ `ed9f5b9` plus one docs-only commit. Files that differ from `ed9f5b9`: `docs/fable/status/p0-baseline.md`. No file any command reads differs from `main`. |
| Working tree | `git status --porcelain` was empty before and after every command below: none of them wrote a file |
| Passes | Two full passes, 2026-11-13 11:05:41 to 11:07:08 UTC (03:05 to 03:07 PST). Pass 2 exit codes and times are listed beside pass 1, and the output of pass 2 is byte-identical to pass 1 (test-runner millisecond timings aside) |
| Wall time | Measured by a scratch runner (`child_process.spawn`, `process.hrtime`) around `bash -c "<command>"`. Sibling lanes were running on the same machine at the time, so treat times as an order of magnitude, not as a benchmark |
| Dependencies | None installed. `cadJS/package.json` and `dawCAT/package.json` declare no `dependencies` or `devDependencies`, no lockfile exists in either, and `node_modules/` is git-ignored and absent. `npm ci` / `npm install` were not run and nothing was added |

## Summary of the required commands

| # | Gate | Command (run from the repo root) | Exit | Wall, pass 1 / pass 2 | Result line(s), verbatim |
|--:|---|---|:--:|---|---|
| 1 | G1 | `node tools/check_syntax.mjs` | 0 | 0.85 s / 0.83 s | All 37 modules OK |
| 2 | G1 | `node tools/verify.mjs` | 0 | 3.67 s / 3.64 s | All checks passed (summit state machine: 70 passed, 0 failed) |
| 3 | G1 | `node tools/labs_check.mjs` | 0 | 4.02 s / 3.94 s | All labs checks OK |
| 4 | G1 | `git diff --check` | 0 | 0.01 s / 0.01 s | (no output) |
| 5 | G2 | `node tools/rooftop_test.mjs` | 0 | 0.08 s / 0.08 s | 38 passed, 0 failed |
| 6 | G2 | `node tools/summit_test.mjs` | 0 | 2.76 s / 2.79 s | 70 passed, 0 failed |
| 7 | G3 | `node tools/catalog_check.mjs` | 0 | 0.40 s / 0.39 s | OK Asset Library: 17 modules, 190 records, 120 evidence targets, 134 pictured assets, 386 WebP files (2.45 MB), 126 active editable entries |
| 8 | G3 | `node tools/labs_coverage.mjs` | 0 | 0.05 s / 0.05 s | OK 37 source modules, 112 construction methods, 190 inventory rows, 120 evidence targets / Active coverage: direct=89, review=41, embedded=27, related=19, missing=10 |
| 9 | G3 | `node --test tools/labs_coverage_test.mjs` | 0 | 0.17 s / 0.17 s | ℹ tests 11 / ℹ pass 11 / ℹ fail 0 |
| 10 | G3 | `node --test catalog/tests/*.test.mjs` | 0 | 0.13 s / 0.12 s | ℹ tests 37 / ℹ pass 37 / ℹ fail 0 |
| 11 | G3 | `cd cadJS && npm run check` | 0 | 0.15 s / 0.14 s | server/catalog/agent/asset modules: ok / 15/15 tests passed |
| 12 | G3 | `cd dawCAT && npm test` | 0 | 1.57 s / 1.57 s | 246 passed, 0 failed |
| 13 | G3 | `node tools/interiors_test.mjs` | 0 | 0.03 s / 0.04 s | 28 interiors checks passed. |
| 14 | G3 | `node tools/ranges_test.mjs` | 0 | 0.03 s / 0.03 s | 19 ranges checks passed. |

Supplementary runs (not required by the brief, cheap, same checkout):

| # | Command | Exit | Wall | Result line(s), verbatim |
|--:|---|:--:|---|---|
| S1 | `for f in src/*.js; do node --input-type=module --check < "$f" >/dev/null \|\| echo "FAIL $f"; done; echo "loop finished"` | 0 | 0.84 s | no FAIL line; "loop finished" |
| S2 | `cd catalog && npm run check` | 0 | 0.58 s | OK Asset Library: 17 modules, 190 records, 120 evidence targets, 134 pictured assets, 386 WebP files (2.45 MB), 126 active editable entries / ℹ tests 37 / ℹ pass 37 / ℹ fail 0 |

## Appendix C accounting

Every row of guide Appendix C (and the extra `kit_index` command of §4.6) and where it is recorded:

| Gate | Appendix C row | Where recorded |
|---|---|---|
| G1 | `node tools/check_syntax.mjs` | this file, command 1 |
| G1 | `node tools/verify.mjs` | this file, command 2 |
| G1 | `node tools/kit_check.mjs` *(new)* | **not yet built (Phase 1)**, see below |
| G1 | `node tools/labs_check.mjs` | this file, command 3 |
| G1 | `git diff --check` | this file, command 4 |
| §4.6 | `node tools/kit_index.mjs` *(new)* | **not yet built (Phase 1)**, see below |
| G2 | `tools/footprint_golden.html` *(new)* | **not yet built (Phase 1)**, see below |
| G2 | `tools/kit_contract_test.html` *(new)* | **not yet built (Phase 1)**, see below |
| G2 | `tools/labs_geometry_test.html` | browser: [`checks-browser.md`](checks-browser.md) |
| G2 | `node tools/rooftop_test.mjs` | this file, command 5 |
| G2 | `node tools/summit_test.mjs` | this file, command 6 |
| G3 | `node tools/catalog_check.mjs` | this file, command 7 |
| G3 | `node tools/labs_coverage.mjs` | this file, command 8 |
| G3 | `node --test tools/labs_coverage_test.mjs` | this file, command 9 |
| G3 | `node --test catalog/tests/*.test.mjs` | this file, command 10 |
| G3 | `cd cadJS && npm run check` | this file, command 11 |
| G3 | `cd dawCAT && npm test` | this file, command 12 |
| G3 | `node tools/interiors_test.mjs` | this file, command 13 |
| G3 | `node tools/ranges_test.mjs` | this file, command 14 |
| G4 | `/__boot.html` headless, `?assets=classic` and `?assets=modular` | browser: [`checks-browser.md`](checks-browser.md). The `?assets=` parameter and `assetSet` setting are created in Phase 1 (§3.1), so on `main` only the default boot exists |
| G4 | Review sheets `cat_`, `tree_`, `town_`, `hidden_`, `summit_`, `grass_preview.html` | browser: Phase 0 captures, `captures.md` |
| G4 | Optional `catalog/tests/browser-smoke.mjs`, `adapters-browser.mjs`, `cad-handoff-browser.mjs` | browser (needs the external Playwright): [`checks-browser.md`](checks-browser.md) |
| (note) | The 44-check smoke suite in `/tmp/michi-test/` | **does not exist on this machine**, not run, see below |

## Command output

Each block is the real combined stdout and stderr. Wall times are repeated from the summary for convenience.

### 1. `node tools/check_syntax.mjs`

- Gate G1. Proves: All src modules parse.
- Exit code: 0 (pass 2: 0). Wall time: 0.85 s (pass 2: 0.83 s). Started 2026-11-13T11:05:41.487Z.
- 37 `OK   <module>` lines, 0 lines containing FAIL.

```
OK   ambient_life.js
OK   audio.js
OK   bootstrap.js
[... 32 lines matching /^OK   \S+\.js$/ omitted; every other line is shown ...]
OK   vegetation.js
OK   waypoints.js

All 37 modules OK
```

### 2. `node tools/verify.mjs`

- Gate G1. Proves: Syntax, main.js wiring, summit state machine, index.html sanity.
- Exit code: 0 (pass 2: 0). Wall time: 3.67 s (pass 2: 3.64 s). Started 2026-11-13T11:05:42.379Z.
- 36 `PASS` lines across the four sections, 0 lines containing FAIL. Section 3 is the summit state machine.

```

[1/4] ES module syntax
  All 37 modules OK

[2/4] main.js wiring
  PASS  summit.update() is called every frame
  PASS  summit imported
  PASS  music switches to the Summit mood
  PASS  summit unlock is saved
  PASS  summit ring count is saved
  PASS  on-summit position is saved
  PASS  save never persists the summit pocket
  PASS  unlock is restored
  PASS  ring count is restored
  PASS  onSummit resumes the clearing
  PASS  valley vegetation paused on the summit
  PASS  NPCs paused on the summit
  PASS  scent trail gated off
  PASS  waypoints suppressed
  PASS  valley prompts suppressed
  PASS  mp4 source attached lazily
  PASS  video-playing class applied
  PASS  veil modes cleared on exit
  PASS  summit snow system built
  PASS  summit rain system built
  PASS  summit vista uses spatial geometry, not the painted cyclorama
  PASS  summit vista has city, bay and horizon depth bands
  PASS  summit weather includes rain and mist
  PASS  card set keyed by kind (not opts.kind)
  PASS  summit landmark asset is module-relative

[3/4] summit state machine
  70 passed, 0 failed

[4/4] index.html markup + CSS
  PASS  transition veil present
  PASS  video element present
  PASS  fallback flare is animated
  PASS  descent veil is animated
  PASS  no duplicate summit-dim keyframes
  PASS  no duplicate .quick rules outside the reduced-motion block
  PASS  reduced-motion disables the veils
  PASS  quest card target exists
  PASS  compass target exists
  PASS  prompt target exists
  PASS  braces balanced

All checks passed
```

### 3. `node tools/labs_check.mjs`

- Gate G1. Proves: Labs syntax, cache tags, registry.
- Exit code: 0 (pass 2: 0). Wall time: 4.02 s (pass 2: 3.94 s). Started 2026-11-13T11:05:46.083Z.
- 287 `OK   ...` lines (177 syntax, 14 cache tag, 3 registry, 22 live lab, 44 lab, 22 research block, 4 extra, plus the inventory line), 0 lines containing FAIL. Total output lines: 291.

```
OK   syntax labs/alley/js/main.js
OK   syntax labs/alley/js/props.js
[... 189 lines matching /^OK   (syntax|cache tag|live lab|lab|research block|extra) / omitted; every other line is shown ...]
OK   registry has 22 labs
OK   registry n = 1..22 unique
OK   registry slugs unique
[... 92 lines matching /^OK   (syntax|cache tag|live lab|lab|research block|extra) / omitted; every other line is shown ...]
OK   asset inventory and coverage report
OK 37 source modules, 112 construction methods, 190 inventory rows, 120 evidence targets
Active coverage: direct=89, review=41, embedded=27, related=19, missing=10

All labs checks OK
```

### 4. `git diff --check`

- Gate G1. Proves: No whitespace damage (vacuous on a clean tree, see note).
- Exit code: 0 (pass 2: 0). Wall time: 0.01 s (pass 2: 0.01 s). Started 2026-11-13T11:05:50.145Z.
- Produces no output. The tree is clean, so this is vacuous here; see the observations below for how a lane should use it.

```
(no output)
```

### 5. `node tools/rooftop_test.mjs`

- Gate G2. Proves: Roof Road: rail, level, reach, physics, autopilot.
- Exit code: 0 (pass 2: 0). Wall time: 0.08 s (pass 2: 0.08 s). Started 2026-11-13T11:05:58.643Z.
- 38 `PASS` lines, 0 lines containing FAIL.

```
rail
  PASS  L-rail length = legs minus the fillet saving
  PASS  first straight leg point
  PASS  first leg tangent +x
  PASS  normal points at the camera (+z on a +x leg)
  PASS  rail ends on the last vertex
  PASS  arc length is uniform (|ds| error < 1e-5)
  PASS  tangent is continuous through fillets
  PASS  isStraight sees the fillet
level
  PASS  level has a rail and platforms
  PASS  seven mouths
  PASS  every platform has s0 < s1 and finite heights
  PASS  every piece sits on one straight leg (or is a corner)
  PASS  the street runs the whole rail
  PASS  every lantern checkpoint sits in its own mouth, on a surface
  PASS  the six street mouths tile the rail end to end
  PASS  Takase keeps water, nine stones, the boat, footbridge and five boughs
  PASS  Pontochō keeps complete low and middle zigzag roads
  PASS  Nishiki keeps three canopy runs and two lowered crossings
  PASS  Laundry Sky keeps its low futons and high cistern/chimney route
  PASS  Hoko-chō keeps five yatai and its lantern-rack ascent
  PASS  the main road visibly changes depth at least 35 times
interface
  PASS  touch UI has an analog pad plus separate jump and drop actions
  PASS  pause, adaptive sound, guidance and recovery controls remain accessible
reach
  PASS  start and perch exist
  PASS  the perch is reachable from the start
  PASS  no soft-locks: the perch is reachable from every platform
  PASS  a climb-back within 12 m of every metre of street
  PASS  the route starts on the start platform and ends on the perch
  PASS  route links fit the strict budget (80 % of run reach, no mantle)
  PASS  seven Shōki, each standing on a reachable platform
physics
  PASS  held jump peaks at the game apex (1.30 m)
  PASS  analytic flat reach at run = 2.99 m
  PASS  ledge guard holds the cat on the roof
  PASS  ↓ lets it step off into the street
  PASS  mantle pulls up a 1.55 m rise
  PASS  futon bounce reaches ≈1.85 m above it
  PASS  autopilot reaches the perch on the real physics
  PASS  …without touching the street or the canal

38 passed, 0 failed
```

### 6. `node tools/summit_test.mjs`

- Gate G2. Proves: Summit state machine.
- Exit code: 0 (pass 2: 0). Wall time: 2.76 s (pass 2: 2.79 s). Started 2026-11-13T11:05:58.766Z.
- 70 `PASS` lines, 0 lines containing FAIL. Total output lines: 75.

```

=== 天上 summit logic ===

  PASS  constructs
  PASS  starts locked
  PASS  group hidden at boot
  PASS  has torii
  PASS  has meadow + vista + rays in the group
  PASS  has dense grass field
[... 58 lines matching /^ {2}PASS / omitted; every other line is shown ...]
  PASS  the cat curls into a ball
  PASS  the sleep pose holds indefinitely
  PASS  a singing bowl rings the moment of sleep
  PASS  walking away breaks the spell
  PASS  movement exits scenic view and restores controls
  PASS  the cat can fall asleep a second time

70 passed, 0 failed
```

### 7. `node tools/catalog_check.mjs`

- Gate G3. Proves: Catalog integrity.
- Exit code: 0 (pass 2: 0). Wall time: 0.40 s (pass 2: 0.39 s). Started 2026-11-13T11:06:01.569Z.

```
OK Asset Library: 17 modules, 190 records, 120 evidence targets, 134 pictured assets, 386 WebP files (2.45 MB), 126 active editable entries
```

### 8. `node tools/labs_coverage.mjs`

- Gate G3. Proves: Inventory and coverage totals, report freshness.
- Exit code: 0 (pass 2: 0). Wall time: 0.05 s (pass 2: 0.05 s). Started 2026-11-13T11:06:02.007Z.

```
OK 37 source modules, 112 construction methods, 190 inventory rows, 120 evidence targets
Active coverage: direct=89, review=41, embedded=27, related=19, missing=10
```

### 9. `node --test tools/labs_coverage_test.mjs`

- Gate G3. Proves: Coverage audit unit tests.
- Exit code: 0 (pass 2: 0). Wall time: 0.17 s (pass 2: 0.17 s). Started 2026-11-13T11:06:02.093Z.

```
✔ the authored inventory resolves against the current game and lab sources (8.40525ms)
✔ adding a visual builder requires an inventory owner (6.250792ms)
✔ a new source module cannot silently escape the source inventory (5.427583ms)
✔ renaming a game construction anchor invalidates its evidence (10.664084ms)
✔ removing a specimen definition invalidates its evidence target (5.338709ms)
✔ an existing but different specimen cannot substantiate a selector (5.363208ms)
✔ unknown target IDs and duplicate asset IDs fail the audit (10.334958ms)
✔ a review page cannot be promoted to focused lab coverage (4.965208ms)
✔ related evidence and missing coverage need explicit limitations (9.668917ms)
✔ hidden rewards, guardian crows and inactive builders retain honest classifications (0.444833ms)
✔ the report counts overlapping evidence once per active catalog row (35.777792ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 138.827083
```

### 10. `node --test catalog/tests/*.test.mjs`

- Gate G3. Proves: Catalog units and API.
- Exit code: 0 (pass 2: 0). Wall time: 0.13 s (pass 2: 0.12 s). Started 2026-11-13T11:06:10.635Z.
- The glob `catalog/tests/*.test.mjs` expands (in bash) to: `catalog/tests/asset-loader.test.mjs`, `catalog/tests/assistant.test.mjs`, `catalog/tests/links.test.mjs`, `catalog/tests/model.test.mjs`, `catalog/tests/server.test.mjs`. 37 `✔` lines, 0 `✖` lines.

```
✔ the capability index imports in Node without loading Three.js or the DOM (0.536792ms)
✔ characters, ordinary objects and hidden physical rewards have real original adapters (0.078209ms)
✔ retired builders and scene-wide effects do not advertise editable isolation (0.050708ms)
[... 31 lines matching /^✔ / omitted; every other line is shown ...]
✔ unknown asset fields and cross-origin saves are rejected before disk writes (4.027417ms)
✔ local guide API produces validated catalog actions without a provider request (10.001083ms)
✔ real provider relay keeps keys transient and validates the returned action IDs (4.001959ms)
ℹ tests 37
ℹ suites 0
ℹ pass 37
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 100.76025
```

### 11. `cd cadJS && npm run check`

- Gate G3. Proves: cadJS server modules and tests.
- Exit code: 0 (pass 2: 0). Wall time: 0.15 s (pass 2: 0.14 s). Started 2026-11-13T11:06:10.806Z.
- `npm run check` imports `server.mjs` with `CADJS_VALIDATE=1` (does not listen on a port), then `src/catalog.mjs`, `src/agent-protocol.mjs`, `src/asset-package.mjs`, then runs `tests/catalog.test.mjs`.

```

> michi-neko-cadjs@1.0.0 check
> node --input-type=module -e "process.env.CADJS_VALIDATE='1'; await Promise.all([import('./server.mjs'),import('./src/catalog.mjs'),import('./src/agent-protocol.mjs'),import('./src/asset-package.mjs')]); console.log('server/catalog/agent/asset modules: ok')" && node tests/catalog.test.mjs

server/catalog/agent/asset modules: ok
✓ normalizes Windows paths and classifies supported files
✓ extracts Three.js classes, builders, geometries, materials, and object types
✓ creates a sorted source and asset catalogue
✓ produces stable, readable descriptor fingerprints
✓ normalizes and clamps AI provider settings
✓ extracts fenced plans and rejects unsupported actions
✓ builds OpenAI-compatible multimodal requests for local and OpenRouter providers
✓ builds Anthropic image requests and extracts provider text
✓ creates deterministic asset package hashes and semantic identifiers
✓ creates, validates, and detects tampering in versioned asset packages
✓ reports package baseline compatibility and extracts incremental changes
✓ emits sparse object components instead of duplicating unchanged geometry
✓ supports expanded provider catalog including Ollama, LM Studio, Gemini, Groq, DeepSeek, xAI, Mistral, and Builtin
✓ validates expanded v2 procedural, texture, palette, pose, and layout CAD actions
✓ synthesizes multi-step Kyoto asset plans with built-in offline copilot

15/15 tests passed
```

### 12. `cd dawCAT && npm test`

- Gate G3. Proves: Audio studio.
- Exit code: 0 (pass 2: 0). Wall time: 1.57 s (pass 2: 1.57 s). Started 2026-11-13T11:06:10.994Z.
- The line `dawCAT SFX: no sound named nope` is a `console.warn` (`dawCAT/src/sfx/export.js:80`) triggered on purpose by the negative-path assertion `playSfx(audio, 'nope')` returning `null` (`dawCAT/tests/export.test.mjs:59`). It is not an error; the run still reports `0 failed`.

```

> dawcat@3.0.0 test
> node tests/run.mjs

dawCAT SFX: no sound named nope

246 passed, 0 failed
```

### 13. `node tools/interiors_test.mjs`

- Gate G3. Proves: Interiors lab invariants.
- Exit code: 0 (pass 2: 0). Wall time: 0.03 s (pass 2: 0.04 s). Started 2026-11-13T11:06:12.605Z.

```
OK   fourhalf: full coverage, no overlap, no four-corner junction
OK   six: full coverage, no overlap, no four-corner junction
OK   eight: full coverage, no overlap, no four-corner junction
OK   Kyōma module and six-mat footprint
OK   A crossed four-mat junction is rejected
OK   Overlapping mats are rejected
OK   Twelve unique room studies, three per family
OK   All recipes have a valid floor plan
OK   Formal tea uses the sparse ceremonial furnishing
OK   Floor support is stable
OK   Table support has the actual top height
OK   A cat below a tabletop cannot teleport onto it
OK   Furniture blocks a walking cat
OK   A cat above the table can cross its edge
OK   Closed screens block access to engawa
OK   A closed screen cannot be crossed with an ordinary jump
OK   Room edges prevent falls
OK   Construction pass 01 has no invisible furniture
OK   Click route navigates around the table
OK   A click inside solid furniture is refused
OK   Closed screen refuses a route to the veranda
OK   Opening screens makes the veranda reachable
OK   Running jump has enough height for all furniture
OK   Jump lands on the table at 30 Hz
OK   Jump lands on the table at 60 Hz
OK   Jump lands on the table at 120 Hz
OK   Walking off a platform falls back to the floor
OK   Circular furniture uses a circular footprint

28 interiors checks passed.
```

### 14. `node tools/ranges_test.mjs`

- Gate G3. Proves: Ranges lab invariants.
- Exit code: 0 (pass 2: 0). Wall time: 0.03 s (pass 2: 0.03 s). Started 2026-11-13T11:06:12.674Z.

```
OK   terrainSector: wall closes north, opens south
OK   terrainHeight: the playable bowl stays flat
OK   terrainHeight: walls rise behind the shrine, sink behind the pagoda
OK   terrainHeight is deterministic
OK   valueNoise stays in [0,1], worldNoise is smooth
OK   fbm1 and ridged1 are deterministic and bounded
OK   all ridge profiles return [0,1] over the domain
OK   profiles are continuous (no cliff jumps)
OK   profile endpoints nearly meet (arcs sink at the flanks)
OK   the valley set stacks near < mid < far in mass
OK   strokeToProfile resamples, smooths and clamps
OK   strokeToProfile tolerates unordered and degenerate input
OK   octDir · octUV round-trip inside the diamond
OK   octDir never looks below the horizon
OK   mulberry32 is stable across runs
OK   smoothstep is pinned to the game ports
OK   step states only use declared techniques
OK   the walkthrough builds up to the finished valley
OK   every step has a recipe and every source a note

19 ranges checks passed.
```

### Supplementary runs

#### S1. `for f in src/*.js; do node --input-type=module --check < "$f" >/dev/null || echo "FAIL $f"; done; echo "loop finished"`

- Proves: AGENTS.md alternative: per-file ESM syntax check of src/*.js. Exit code: 0. Wall time: 0.84 s. Started 2026-11-13T11:06:45.563Z.

```
loop finished
```

#### S2. `cd catalog && npm run check`

- Proves: Catalog package script (catalog_check + node --test). Exit code: 0. Wall time: 0.58 s. Started 2026-11-13T11:06:46.444Z.

```

> michi-neko-asset-library@1.0.0 check
> node ../tools/catalog_check.mjs && node --test tests/*.test.mjs

OK Asset Library: 17 modules, 190 records, 120 evidence targets, 134 pictured assets, 386 WebP files (2.45 MB), 126 active editable entries
✔ the capability index imports in Node without loading Three.js or the DOM (0.524708ms)
✔ characters, ordinary objects and hidden physical rewards have real original adapters (0.074208ms)
[... 33 lines matching /^✔ / omitted; every other line is shown ...]
✔ local guide API produces validated catalog actions without a provider request (10.673459ms)
✔ real provider relay keeps keys transient and validates the returned action IDs (3.654542ms)
ℹ tests 37
ℹ suites 0
ℹ pass 37
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 90.478584
```

## Appendix C commands that do not exist yet ("not yet built (Phase 1)")

These are created in Phase 1 (lanes `f1-runtime` and `f1-golden`). They were run or listed to record the real state on `main`:

### `node tools/kit_check.mjs`

- Appendix C / guide reference: G1; Appendix C, F1.5. Exit code: 1. Started 2026-11-13T11:06:47.063Z.

```
node:internal/modules/cjs/loader:1573
  throw err;
  ^

Error: Cannot find module '/Users/c1t1zen/Documents/GitHub/michi-wt/p0-checks/tools/kit_check.mjs'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1569:15)
    at wrapResolveFilename (node:internal/modules/cjs/loader:1123:27)
    at defaultResolveImplForCJSLoading (node:internal/modules/cjs/loader:1147:10)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1174:12)
    at Module._load (node:internal/modules/cjs/loader:1346:5)
    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
    at node:internal/main/run_main_module:33:47 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}

Node.js v26.7.0
```

### `node tools/kit_index.mjs`

- Appendix C / guide reference: §4.6 step 3; F1. Exit code: 1. Started 2026-11-13T11:06:47.133Z.

```
node:internal/modules/cjs/loader:1573
  throw err;
  ^

Error: Cannot find module '/Users/c1t1zen/Documents/GitHub/michi-wt/p0-checks/tools/kit_index.mjs'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1569:15)
    at wrapResolveFilename (node:internal/modules/cjs/loader:1123:27)
    at defaultResolveImplForCJSLoading (node:internal/modules/cjs/loader:1147:10)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1174:12)
    at Module._load (node:internal/modules/cjs/loader:1346:5)
    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
    at node:internal/main/run_main_module:33:47 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}

Node.js v26.7.0
```

### `ls -la tools/kit_contract_test.html tools/footprint_golden.html tools/golden src/kit`

- Appendix C / guide reference: G2; Appendix C, F1.6/F1.7. Exit code: 1. Started 2026-11-13T11:06:47.196Z.

```
ls: src/kit: No such file or directory
ls: tools/footprint_golden.html: No such file or directory
ls: tools/golden: No such file or directory
ls: tools/kit_contract_test.html: No such file or directory
```

Status of each: `kit_check`, `kit_index`, the kit contract test and the footprint golden are **not yet built (Phase 1)**. The
browser pages cannot be run at all until they exist; there is nothing to record for them beyond this absence.

## The 44-check browser smoke suite (`/tmp/michi-test/`)

`AGENTS.md` describes a Playwright harness in `/tmp/michi-test/smoke.js` and `smoke2.js` (44 checks). **It does not exist on this
machine and was not run.** Evidence:

```
$ ls -la /tmp/michi-test/
ls: /tmp/michi-test/: No such file or directory
(exit 1)

$ find /tmp /private/tmp /Users/c1t1zen/Documents/GitHub -maxdepth 4 \( -name 'michi-test' -o -name 'smoke.js' -o -name 'smoke2.js' \) -not -path '*/node_modules/*' -not -path '*/OLD/*' 2>/dev/null; echo "find exit=$?"
find exit=0
```

The second command searches `/tmp`, `/private/tmp` and the GitHub folder (depth 4, excluding `node_modules` and `OLD`) for a
`michi-test` directory or a `smoke.js` / `smoke2.js`; it printed nothing but its own exit line. The repo does carry three Playwright
suites that cover part of the same ground (`catalog/tests/browser-smoke.mjs`, `adapters-browser.mjs`,
`cad-handoff-browser.mjs`); those are browser runs, recorded (or marked not run, with the reason) in `checks-browser.md`.

## Observations

Things noticed while running the matrix. None was fixed; they are reported so the Integrator can decide.

1. **No failure on `main`.** All 14 required commands, and both supplementary runs, exited 0 in both passes.
2. **`AGENTS.md` count drift.** Its Verification section says `check_syntax.mjs` covers "all 36 modules". The tool reports `All 37 modules OK`, and `ls src/*.js | wc -l` is 37 (`verify.mjs` also reports 37). The inventory audit agrees: `OK 37 source modules`.
3. **`git diff --check` is vacuous for committed work.** It only inspects uncommitted changes. Lanes commit per step, so on a committed branch it prints nothing whatever the content. For the G1 gate use `git diff --check origin/fable/integration...HEAD` (committed lane work) in addition to plain `git diff --check` (uncommitted work). On this clean `main` checkout the plain form is trivially empty.
4. **`rooftop_test.mjs` is faster than documented.** `AGENTS.md` says "a few seconds"; it ran in 0.08 s here (38 checks, including the autopilot run on the real physics).
5. **The numbers match the guide.** `labs_coverage.mjs` reports 190 inventory rows, 120 evidence targets, `direct=89, review=41, embedded=27, related=19, missing=10` over the 186 active rows, which is the guide §1 figure (89 of 186 = 47.8% focused). `catalog_check.mjs` reports 386 WebP thumbnails. `labs_check.mjs` reports 22 labs in the registry.
6. **Nothing was written.** The Node suites need no installed packages and wrote no file; `git status --porcelain` was empty before and after every command.

## How to repeat

```sh
cd <worktree>
node tools/check_syntax.mjs && node tools/verify.mjs && node tools/labs_check.mjs && git diff --check
node tools/rooftop_test.mjs && node tools/summit_test.mjs
node tools/catalog_check.mjs && node tools/labs_coverage.mjs && node --test tools/labs_coverage_test.mjs
node --test catalog/tests/*.test.mjs
(cd cadJS && npm run check) && (cd dawCAT && npm test)
node tools/interiors_test.mjs && node tools/ranges_test.mjs
```
