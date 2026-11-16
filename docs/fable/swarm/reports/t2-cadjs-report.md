# t2-cadjs report (Worker D, Claude Sonnet 5.5)

Commit ec309c3 on fable/t2-cadjs, PR #39 into fable/integration.

## Built
- cadJS/src/kit-params.mjs (new, pure): strict param validation against defineAsset schemas (no clamping), param panel model, AI action folding, kit-overrides entry builder.
- agent-protocol.mjs: actions set_asset_params {asset, values} and swap_asset_variant {asset, variant}; shape check on the relay, full schema check when a lookup is supplied; mixing with free-form edits is rejected.
- agent-panel.mjs: reviewPlan hook; a rejected plan shows REJECTED and disables Run.
- asset-package.mjs: schema 2 (structure.ops create/remove/reparent, applyStructureOps, diffHierarchy, migrateAssetPackage); schema 1 still validates and imports.
- app.mjs: production handoff (parts labelled catalog.<id>.<part>), KIT PARAMETERS inspector section (live preview, one undo step per commit), kit AI plans as one undo step, Push to game for kit assets via t1's GET/POST /api/asset-library/kit-overrides (revision-checked, atomic), structure diff on export, structure apply plus states as one undo step on open. cad-overrides path unchanged for linked free-form edits.
- README "Package schema 2", "Production assets", "Game boundary" rewritten. package.json test/check include the new test.

## Checks run
- cd cadJS && npm run check: "server/catalog/agent/asset modules: ok", catalog.test 15/15, kit.test 15/15 (loads 99 kit assets from 18 families via a three.js stub; min/max accepted and just-outside rejected for every numeric param).
- cd catalog && npm test: passes (unchanged). node tools/check_syntax.mjs: All 132 modules OK.
- Headless Chromium against cadJS/server.mjs: group asset:path-boulders and parts asset:path-boulders/boulders_light|dark; 4 sliders from params; edit size to 1.5, undo (back to default), redo; AI plan with size 150 rejected ("size: 150 is outside 0.6..1.5") at review and at execute with no history entry; valid 2-action plan = one undo step, undo restores modular; push wrote {"path-boulders":{"variant":"modular","params":{"size":1.5}}} preserving the existing edge-forest entry (file restored afterwards); package export emitted schema 2 with create/remove/reparent ops, apply/undo/redo verified; ?params={"size":1.2} handoff applied.

## Not verified / concerns
- Out-of-range ?params= handoff rejection is coded but not exercised in the browser.
- Kit param edits recapture the package baseline (older packages become incompatible); free-form edits to a kit asset are not pushed to the game (status says how many were skipped).
- clearWorkspace undo and non-kit AI plans on a kit asset restore a JSON clone, which turns the kit panel off.
- Server-side kit param validation remains shape-only (needs three.js for schemas); browser validates strictly first.
- Intermediate entries kept by undo history are not disposed (small leak per committed edit).
- No assets promoted or deferred; no footprint waivers; no src/** or hot files touched.

## Fix round 1
- Packages now record `source.kit {variant, params}` (schema 2, optional, validated, kept through migration). On import of a kit asset, `alignKitForPackage` rebuilds to the recorded params (or the defaults for older packages without them) until the baseline fingerprint matches, then applies.
- Any rebuild (panel edit, variant swap, AI plan) now confirms first when free-form edits or a loaded package exist, explaining they are dropped and the package is re-based; declining reverts the preview.
- History capped at 50; builds dropped by redo truncation or the cap are disposed.
- Checks: `npm run check` -> catalog 15/15, kit 16/16 (new: kit params survive validate and migrate); catalog `npm test` pass 49 fail 0. Headless: export at defaults -> edit size 1.5 -> import succeeds (params back to {}); export with {size 1.4, moss 0.9} -> reset -> import rebuilds to {size 1.4, moss 0.9}; no page errors. The decline-confirm path was not exercised.
