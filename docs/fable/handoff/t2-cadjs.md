# t2-cadjs handoff

- New: `cadJS/src/kit-params.mjs` (pure: strict param validation against `defineAsset` schemas, panel model, kit AI action folding, kit-overrides entry builder). It imports `src/kit/contract.js` and `catalog/js/kit-overrides.mjs` directly (the current `?v=20261113a` tag on the contract import — bump with the others).
- The kit load path is t1's `loadCatalogAsset(id, { variant: 'production' })`; no new bridge export and no duplicate write: Push to game calls t1's `GET/POST /api/asset-library/kit-overrides` (mounted by `cadJS/server.mjs`).
- Server-side validation of kit params stays shape-only (schemas need three.js); cadJS validates strictly in the browser before POSTing, and the game's `resolveParams` clamps again.
- AI relay (`cadJS/server.mjs` `validateAgentPlan`) shape-checks the two new actions; the full schema check runs in the browser (agent panel `reviewPlan`).
- Package schema 2 adds `structure.ops`; schema 1 files migrate on open. `ASSET_PACKAGE_SCHEMA_VERSION` is now 2.
- Limits: kit asset rebuilds recapture the package baseline; free-form edits to a kit asset are not pushed to the game; `clearWorkspace` undo restores a plain clone (kit panel off); a non-kit AI plan on a kit asset restores a JSON clone and hides the panel.
- Tests: `cd cadJS && npm test` (adds `tests/kit.test.mjs`, loads all 99 registered kit assets through a three.js stub) and `npm run check`.
- Pending patches for other lanes: none. When families are added, cadJS needs no change.
