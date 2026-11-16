# Village / kit lane template (Phase 2 and every later "standard lane recipe" lane)

Read with: the common brief (_common.md) and your per-lane brief (which names family, lab, builders, ids, extras).

## Your files (only these)
- `src/kit/<family>/**` (NEW family folder: `index.js` exporting `assets = [defineAsset(...), …]` + builders)
- `labs/<lab-slug>/**` (gap specimens for L4, research notes) — never `labs/shared/**`, never `labs/registry.js`
- `docs/fable/status/<lane>.md`, `docs/fable/status/<lane>/` (compare JPGs), `docs/fable/handoff/<lane>.md`
- Lane-specific tests only if your per-lane brief lists them.
Everything else is read-only. Hot files (guide §4.5) — including `src/kit/index.js`, `labs/asset_inventory.json`,
`catalog/js/asset-loader.mjs`, `src/countryside.js` — change ONLY through your handoff file.

## Before you start
- Read `BUILD_GUIDE_FABLE.md` §3 as reconciled by f1-runtime (it documents the real contract, tiers decision, footprint
  registration, materials), §5, §9 "standard lane recipe" L1–L10, your lane card row, and Appendix D.
- Read the classic builders named on your card in their CURRENT split form (f2/f3 split them into `layoutX()` +
  `meshXClassic(layout)` routed through `placeAsset(id, …)`): your kit `build(ctx, layout, params)` receives exactly that
  `layout` — read its fields, `layout.footprint` and `layout.bind`. Do not change the layout shape (it is countryside.js).
- Read the lab: `labs/<slug>/research.md`, `js/recipes.js` (+ `kit.js`/`stage.js`), the matching rows in
  `labs/ASSET_COVERAGE.md`, and any construction fix in `labs/REVIEW_2026-11-10.md` (promote the fixed version).

## Rules specific to kit code
- No import from `labs/` in `src/kit/**`. Port the code you need. Shared helpers you need from another family or from
  `labs/shared/craft.js`/`painted.js` that are not yet in `src/kit/craft.js`/`materials.js`: copy minimal local versions
  into your family folder AND request the move in your handoff.
- Materials through `ctx.kitMaterials` / `ctx.MAT` (merge-able); no new textures downloaded; painterly 256px procedural only.
- Determinism: only `ctx.rng`; same seed → identical geometry (contract test hashes it).
- Every asset: named parts `asset:<id>/<part>`, tiers `hero`/`mid`/`far` (ruling R9: tiny items may share geometry
  across tiers but all three must resolve), params with ranges, footprint defaulting to `layout.footprint`
  (ruling R12; any deviation = a waiver in your status file), `live` meshes listed (glow/animation), `dispose()`.
- Ids must equal inventory ids. Gameplay names/anchors the game looks up stay identical.
- A throwing kit builder falls back to classic — but do not rely on that: your asset must build cleanly.

## Checks (L7) — run, paste real output into the status file and report
```
node tools/kit_check.mjs
node tools/kit_contract_test.mjs --family <family>       # every asset × tier: AAA-2,3,7,8,9
node tools/footprint_golden.mjs                           # classic: must be equal
node tools/footprint_golden.mjs --query "?assets=modular&swap=<id>:modular,…"   # modular: equal or only waived diffs
node tools/check_syntax.mjs && node tools/verify.mjs && node tools/labs_check.mjs && git diff --check fable/integration...HEAD
```
(If a tool's real flags differ, use `--help` and the reconciled guide §3/Appendix C; report what you ran.)

## L6 compare
`node tools/game_shot.mjs` with the same `cam` from near your asset at cat height (0.35 m) and 2–3 m, at
`hour=6`, `12`, `18`, `22`: once with `?assets=classic`, once with `?swap=<id>:modular` (all your ids). Save small JPGs
(≤ 150 KB, 960×600) as `docs/fable/status/<lane>/<id>-<hour>-classic.jpg` / `-modular.jpg`. Look at them yourself
(Read the image files) and judge AAA-1 and AAA-5 honestly in the status file.

## L9 handoff (`docs/fable/handoff/<lane>.md`) — exact, machine-applicable where possible
inventory rows to add/update (JSON snippets for `labs/asset_inventory.json`), `production` adapter ids for the catalog,
new part names, footprint waivers, helpers to move into `src/kit/craft.js`/`materials.js`, any lab registry change
(new specimen ids), and anything the Integrator must wire in a hot file (exact patch).

## L10
Push, open the PR into `fable/integration` (title `<lane>: <family> kit`), report per the common contract. Sizing:
about ten assets / ~1500 changed lines per PR; if larger, say so in the report (the Integrator may split -a/-b).

## Added after Phase 1 (binding)
- Required reading for your builders' layouts and part names: `docs/fable/handoff/f2-countryside-split.md` (countryside
  ids: part names gameplay binds via `layout.bind`, per-component origin conventions, "a kit parent must NOT build its
  listed components", per-ring/per-sprite materials that update() animates, material expectations) and
  `docs/fable/handoff/f3-systems-split.md` (system-module ids). A kit instance missing a bound part now warns once
  and gameplay loses that handle — provide every bound part.
- Budgets (decision D1, `docs/fable/baseline/budgets.md`, machine-readable in src/kit/budgets.js): per-asset triangles
  hero 25k / mid 6k / far 1k (shadow pass counted). The WHOLE kit may add at most 11 new merged materials. Ruling R26:
  reuse `ctx.MAT` / `ctx.kitMaterials` materials (painterly finishes, vertex colour variation) by default; a family
  may add at most ONE new merged material without asking, more only by an explicit request in your handoff with the
  draw-call cost. Live (animated/glowing) meshes are separate draws — keep them few and say how many.
- Tier policy is `TIER_POLICY` in src/kit/contract.js (guide §3.3): build all three tiers; the runtime picks.
- `git diff --check fable/integration...HEAD` (not plain `git diff --check`).
- Cache tag is now `20261113a` — new files import game modules with it; never bump it.
- Boots/captures take seconds on Metal: `node tools/game_shot.mjs --help`, `node tools/headless.mjs --help`.
- Ruling R36 (draw calls): static props must use plain merged geometry on merge-able materials so `_mergeStatics` merges
  them across every instance by material. `_mergeStatics` skips InstancedMesh — use it only for large counts, and then
  measure (`node tools/perf_spots.mjs` classic vs your swap) and record the draw/triangle delta in status + handoff.
- L6: a compare pair for EVERY promoted id, framed on that asset; pairs must not be byte-identical (`cmp`); Read several.
- Contract samples must be representative: the `sample` your asset gives the contract test must be the LARGEST real layout
  the game builds (e.g. the biggest grove/fence run), so the per-asset triangle budget is tested on what players see. If a
  real layout exceeds the cap, request a BUDGET_EXCEPTIONS entry in your handoff with measured modular vs classic counts.
- Measure perf on two tiers: `node tools/perf_spots.mjs` classic high vs your swap at modular HIGH and MEDIUM (budget rule:
  modular medium ≤ classic high). Explain every draw-call change you see.
- Materials: before adding one, look for an existing kit material with the same args (`_once` in src/kit/materials.js
  returns the same material for identical args) — reuse beats adding.
- Ruling R52 (supersedes the kit-wide "≤11 new merged materials" cap and R26's count): reuse KIT_SHARED / km.shared()
  materials first; a NEW merged material is allowed only with a one-line justification + its draw cost in your handoff, and
  your perf run must show modular draw calls ≤ classic at the spots your family appears in, per tier.
- Ruling R54: never loosen a budget (buildMs, triangles, meshes) because a check flaked while other agents load the machine.
  Warm-build millisecond checks are re-measured on a quiet machine at gate G-V3; if your asset genuinely needs an allowance,
  measure with `uptime` 1-min load < 3 and record the load next to the number.
