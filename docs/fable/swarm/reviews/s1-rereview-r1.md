# s1-summit-split: re-review, fix round 1

Reviewed: 01c745e (finding 1) and 8bcec2a..2ae5b88 (findings 2 and 3; the merge 8bcec2a was not reviewed), in worktree `/Users/c1t1zen/Documents/GitHub/michi-wt/s1-summit-split` at 2ae5b88. Nothing in the worktree was changed.

### Finding Verdicts

- **Important 1: the summit golden broke on a cache-tag bump because it recorded tagged module load URLs.** ADDRESSED.
  - `tools/summit_golden.js:323` now strips `?v=…` from every recorded GLTFLoader URL.
  - `tools/golden/summit_classic.json` changed in one line only: the `loads` entry is now `assets/models/summit_kyoto_landmarks.glb`. A diff of 01c745e~1..2ae5b88 shows no other line changed.
  - `grep '?v='` finds 0 hits in both `tools/golden/summit_classic.json` and `tools/golden/summit_test.txt`. The golden was recorded under tag `20261107a` and the tree now runs `20261113a`, so a real tag bump has already gone through it. No other digest field holds a tag.
  - A golden page left on an old tag after a bump still routes correctly. It would load a second copy of `src/kit/runtime.js`, but the kit's type checks compare object shapes, not module identity (`src/kit/contract.js:290-300`).

- **Important 2: per-frame, update and state paths read handles that a kit instance may not provide.** ADDRESSED.
  - **The reviewer's example (portal).** In the valley branch of `update()`, the thicket, the reveal and the portal no longer depend on `raysGroup` (`src/mountaintop.js:836-868`). The ray pulse loops over `this._rays || []` (`:838`). `setUnlocked` was already guarded (`:545`).
  - **`setQuality()`.** The rain and snow budgets go through `pointsPosition()` (`src/mountaintop.js:406-414`; helper at `src/summit/common.js:104`).
  - **Summit side of `update()`.** `summitClouds || []` (`:909`); pollen through `pointsPosition()` (`:913`).
  - **`placeAsset()` binds.** Each bind is null-safe and warned once (`src/mountaintop.js:344-353`).
  - **Fūrin.** The sail and clapper are guarded (`src/summit/clearing.js:737-738`). The chime position is converted to summit-local space (`clearing.js:27-35`). On classic the bell is a direct child of `this.group` (`clearing.js:601`), so the function returns the same `furin.position` as before.
  - **Vista and weather.** A kit vista without a `layers` part falls back to its instance group (`src/summit/vista.js:45-48`); `groundColor` is guarded (`vista.js:1310`); `reseedSnow` and `reseedRain` are guarded (`src/summit/weather.js:66-67`, `:136-137`).
  - **Wildlife.** `src/summit/wildlife.js:179-182`, `:208`, `:237-247`. On classic the butterfly loop still covers every point: `count = min(bp.count, seeds/3, anchors/3)` equals the butterfly count (18 in the game, 8 in the preview, `wildlife.js:62-66`).
  - **All 25 bound fields.** I grepped every read of each field outside its build step:
    - Null-guarded: `raysGroup`, `meditationMotes`, `furin`/`furinSail`/`furinClapper`, `snow`/`rain`, `pollen`, `petals`, `butterflies`, `summitSkyFill`/`summitWarmFill`.
    - Only used as the add target, with the fallback above: `vista`.
    - Never read per frame: `vistaApproach`, `torii`, `perchStone`, `meditationPool`, `lowerPath`, `backBrush`, `kyotoPagoda`, `bay`, `ferrisWheel`, `vistaLandmarks`, `approachShoulder`, `summitTerrain`.
    - Reads from outside the summit (`main.js`, `player.js`: `active`, `colliders`, `cameraActive`, …) touch none of these handles.
  - **Draw-order constraint.** `git diff 8bcec2a..2ae5b88 -- src/mountaintop.js src/summit` changes no line that contains `rng`. On classic the guard changes do nothing, because `raysGroup`, `summitBirds`, and rain/snow/pollen with geometry always exist there.
  - **Test.** `tools/summit_test.mjs:683-846` adds 13 checks (bare, first-part-only and plain-part stand-ins through the real `AssetRuntime`), and the golden's routing test adds `driveSummit()` (`tools/summit_golden.js:385`, `:537-559`).
  - **Check I ran.** I exported the tree with `git archive` to a scratch directory, outside the repo:
    - 2ae5b88: `node tools/summit_test.mjs` gives `83 passed, 0 failed`, exit 0, output byte-identical to `tools/golden/summit_test.txt`.
    - Same tools with `src/` from 8bcec2a (before the fix): `73 passed, 10 failed`, exit 1. The never-throw, portal, warn-once, repeat-warn, first-part (×2), plain-part (×2), kit-vista and `?swap` checks all fail, so the tests catch the original defect.
  - **Gap left (Minor, not blocking).** The facade still reads `.geometry.attributes.position` directly once the matching classic material is set: snow `src/mountaintop.js:936`, rain `:967`, motes `src/summit/clearing.js:708`, petals `src/summit/weather.js:240`. That only happens if a kit sets that material through `footprint.anchors` over a part that is not a point cloud. The handoff documents this case ("owns that shape"). Reading through `pointsPosition()` at those four lines would make them consistent with `setQuality()` and the reseeds.

- **Minors: routing "not run" exits 2; warn once on unresolved and unregistered ids; status and handoff wording accurate.** ADDRESSED.
  - **Exit 2.** `tools/summit_golden.mjs:277` returns 2 when `routing` is missing or `ran: false`. The headline reads `ROUTING NOT RUN` (`:132`), the not-run line has a fallback reason (`:157`), and the usage text and header are updated (`:10`, `:43`). The old code treated "not run" as a pass.
  - **Warn once.** `summitWarnOnce` (`src/mountaintop.js:40-56`) goes through the runtime's `warnOnce`, so warnings also land in `problems`. Keys: `summit-unregistered:<id>` for a `?swap` of an unregistered id, `summit-parent:<id>:<parent>`, and `summit-bind:<id>:<field>`. Without a runtime it falls back to a module-level set. The classic set never reaches these warnings: `CLASSIC_ASSETS.swaps` is `{}`, and the parent and bind warnings only run after `isAssetInstance(out)`. The summit_test checks for the repeat bind, the unknown parent and the `?swap` confirm one warning per key.
  - **Wording.** Every item checked holds:
    - The tag `20261113a` matches the imports.
    - "Both AGENTS.md forms walk src/" matches `AGENTS.md:49` and `:69`.
    - The "four merges" match `git log --merges`: b8e4602, 915fd33, e879e3f and 8bcec2a.
    - `main.js` line ~356 matches.
    - The `check_syntax.mjs` scope statement matches `tools/check_syntax.mjs:21-23`.
    - No "unguarded" or "harmlessly" text and no `20261107a` remain in either file.
    - The regenerated `labs/ASSET_COVERAGE.md` anchors point at the right lines (spot-checked `:26`, `:428`, `:444`, `:489`).

- **Constraint check (summit_test 70 → 83, "additions only").** Confirmed:
  - `git diff 01c745e~1..2ae5b88 -- tools/summit_test.mjs` is +172/−0: the 13 checks plus a `getObjectByName` stub method that classic never calls.
  - `tools/golden/summit_test.txt` has one hunk; it removes only `70 passed, 0 failed` and adds the section header, 13 PASS lines and `83 passed, 0 failed`.
  - `tools/verify.mjs` is unchanged across the fix range.

### New Breakage in the Fix Diff

- **Minor: the stated pre-fix test result is wrong.** `docs/fable/status/s1-summit-split.md:50` says "on the pre-fix sources 8 of the 13 new checks fail", and the report says "73 passed, 8 failed". Those numbers add to 81, not 83. Reproduced on the 8bcec2a sources, 10 of the 13 new checks fail (`73 passed, 10 failed`). This is a documentation error only; the real result is stronger.
- No Critical or Important breakage.
- The golden's routing runtimes now log through `logger: { warn() {} }`. Build failures are still caught: by "no stand-in was built" in the single swaps and by the kit count in the all-modular build. This is not a weaker check.

### Out-of-Scope Observations

- With a kit `summit-vista` that does bring a `layers` part, the classic layers go into that part (`this.vista`), while kit layers are placed by name under the kit group, which is named 'Layered Kyoto Bay Vista' after `layout.name`. The part itself is renamed `asset:summit-vista/layers`. So a mixed vista splits its children across two nodes. This behaviour predates the fix round; a Phase 4 kit lane should decide on one parent.
- When kit preload fails, a `?swap=<summit id>:modular` warns "no kit asset is registered". That message is slightly misleading, though the runtime also logs the family-load failure.

### Verdict

**Fix round:** All findings addressed; no new Critical or Important breakage. Two notes for the ledger: the Minor gap left in finding 2 (four position reads that depend on the classic material) and the Minor wrong count in the status file and report.
