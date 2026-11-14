# f1-golden handoff

What the Integrator, and any lane that moves Countryside code, must know about
the footprint golden (`tools/footprint_golden.html` + `.js`, CLI
`tools/footprint_golden.mjs`, digest `tools/golden/valley_classic.json`).

## Hook coupling — if you move these, update these hooks

The page never edits game code. It instruments `Countryside` and `HiddenPlaces`
at run time, and each hook is tied to one name or one statement in a game
module. A lane that renames or moves one of those targets must update the hook
in `tools/footprint_golden.js` in the same PR. Otherwise the golden reports
something that looks like a layout change but is really a broken hook.

Line numbers: `tools/footprint_golden.js` as of 592d425 (= `fable/integration`
5dc924a); game modules as of ed9f5b9. Other lanes are editing the page now,
so search for the function name if the numbers have moved.

| Hook in `tools/footprint_golden.js` | What it assumes in game code | What breaks if that moves, and what to update |
|---|---|---|
| **`countDraws(proto, prop, slot)`** (L163), installed by `instrument()` at L290 as `countDraws(Countryside.prototype, 'rng', 'valley')` | `src/countryside.js` L143: the constructor *assigns* `this.rng = mulberry32(this.seed);` on the instance. It is a plain assignment, so it lands on the setter the page put on `Countryside.prototype`, which keeps a counting wrapper on the instance. Every draw goes through `this.rng`: `random()` (L210) and `buildCanopy(this.rng, …)` (L3067) | Renaming `rng`, declaring it as a class field (`rng = …` uses define semantics and skips the setter), or `Object.defineProperty(this, 'rng', …)` leaves draws uncounted. `rng.valley.draws` drops to 0 and the stream probe fails. The CLI then exits 2 (`PROBE FAILED`) and `--write` is refused. Update the property name at L290 |
| same, L291 `countDraws(HiddenPlaces.prototype, 'rand', 'hidden')` | `src/hidden_places.js` L77: `this.rand = mulberry(0x4d43);` | `rng.hidden.draws` reads 0. There is no probe for this stream, so it shows only as a changed count. Update L291 |
| **`trackPlatformHelpers(proto)`** (L235): wraps `proto.addOrientedPlatform` (L240/L242) and `proto.addSlopedRoofPlatforms` (L253), installed on `Countryside.prototype` at L294 | `src/countryside.js` L362 `addOrientedPlatform(parent, bounds, topY, options)` returns the platform it adds (L377), and `parent.matrixWorld` is current when it returns. L381 `addSlopedRoofPlatforms(parent, roofY, w, d, ridgeH, overhang, options)` pushes exactly two platforms onto `this.platforms`, side −1 then +1 (L388). Each covers x ∈ [−w/2−overhang, w/2+overhang] and z ∈ [−d/2−overhang, 0] or [0, d/2+overhang] in the parent's frame | If a helper is renamed or moved, every function platform loses its `via`/`rect`/`top`/`eave`/`ridge` fields; only the `getHeightAt` probe remains. `platforms` then shows a change for each of them. If the sloped geometry changes, the recorded `rect` no longer agrees with the probe's `box`. Update the method names at L240/L242/L253, and the rect formula at L259–L264 to mirror countryside.js |
| **`trackMerge(proto)`** (L274): wraps `proto._mergeStatics` (L275/L277), installed on `Countryside.prototype` at L295 | `src/countryside.js` L220: `_mergeStatics()` is a prototype method. It is called exactly once, at the end of the constructor (L207), while `this.scene` holds the whole valley. The page snapshots every named object just before it runs (L281) | If it is renamed, removed or called from elsewhere, the pre-merge snapshot never runs. The page warns "Countryside._mergeStatics() never ran" (L680) and reads objects after the merge, by which time most named meshes are gone. The result is a large `objects`/`aggregates` DIFFERENT, and `--write` is refused because of the warning. Update L275/L277 |

Lighter couplings (same rule: move the target, update the hook):

- **`trackPhases`** (L208, name filter L210): `build*` / `create*` method names on both prototypes. These feed only the advisory `builders` section, so a rename changes advisory output and never the verdict.
- **`calledFromUUID`** (L92–L97): three.js r160, unminified, calls `generateUUID` by that name. A self-check at L1146 sets `uuidSeparated`; if it is false, `--write` is refused.
- **`bakedRecords`** (L472, name test L475): the merge names its meshes `Baked Statics N` (countryside.js L310).
- **`buildOnce`** (L658; construction at L665–L670): the main.js order and these signatures:
  - `new Countryside(scene, options)`
  - `new HiddenPlaces(scene, city)`
  - `new ContextActionManager(player, world, …)` (context_actions.js L12), which only needs `player.scene`
  - `hidden.attach({ contextActions })`, which pushes onto `ca.restSpots` (hidden_places.js L537–L550)
- **`anchorsOf`** (L557): Countryside field names (`napSpotPos`, `nestPos`, `secretKeyPos`, `chimePos`, `secretDoor*`, the `*Mesh` handles, `collectibles`, `lanterns[].group`, `toroSpots`, `corralGuardian.bounds`, `bambooFences`, `shrineThicket*`, …). Renaming a field turns its anchor into `null`, which reads as DIFFERENT.
- **`countrysideOptions()`** (L66) is where f1-runtime passes `options.assets` (ruling R11).

## Pending page patch (not applied: two lanes are editing `footprint_golden.js` now)

When the diff itself throws, the page records the error in `golden.error` and
leaves `diff` as `null`. Its status rendering then reads `diff.equal`, so
`main()`'s catch replaces the result with that TypeError. The CLI prints
`PAGE FAILED … Cannot read properties of null (reading 'equal')` and exits 2,
which is not a bare DIFFERENT, but the real error is lost. The CLI already has
the branch for the fixed page (`COULD NOT COMPARE`, exit 2, with the page's
`golden.error`). Whoever next owns the page should apply this in `main()`
(L1202–L1205 as of 5dc924a):

```diff
   if (!golden.found) {
     statusEl.textContent = `no usable golden at ${GOLDEN_URL} (${golden.error}): write it with node tools/footprint_golden.mjs --write`;
     statusEl.className = 'failed';
+  } else if (!diff) {
+    statusEl.textContent = `could not compare with ${GOLDEN_URL}: ${golden.error}`;
+    statusEl.className = 'failed';
   } else if (diff.equal) {
```

Verified in a scratch copy:
- With this patch and a `throw` injected into `diffDigests`, the CLI prints `COULD NOT COMPARE` / `reason   the comparison failed: diff exploded (scratch test)` and exits 2.
- With the patch alone, the run is `EQUAL` and byte-identical, exit 0.

The patch changes no digest byte, so the golden stays valid.

## Other wiring notes

- The CLI imports `./headless.mjs` (Phase 0, `fable/p0-browser`). Until that merges, the CLI exits 2 with a message saying so; the page itself works in any browser.
- A cache-tag bump must include `tools/footprint_golden.html` and `.js`. They import game modules with `?v=20261107a`, and they sit outside the AGENTS.md `src/*.js index.html` one-liner.
- `--write` refuses in two cases. First, when `--query` is set without `--golden`, so a flagged build never overwrites the classic golden. Second, when the run is not trustworthy: the probe failed, UUID routing is off, or the page reported a warning or console error. Regenerate the golden only for an intended change, and say why in the commit.
