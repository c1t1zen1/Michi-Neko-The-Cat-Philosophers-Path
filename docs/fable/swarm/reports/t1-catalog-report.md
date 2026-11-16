# t1-catalog report (Worker I, Claude Sonnet 5.5)

Branch fable/t1-catalog from fable/integration 489b923. PR into fable/integration.

## Built
- T1.1 `production` variant in catalog/js/asset-loader.mjs: `getKitIndex()`/`listKitAssets()` read `FAMILIES` (src/kit/index.js) and each family's `assets`; `loadCatalogAsset(id, { variant:'production', tier, params })` builds through the real `AssetRuntime` (modular, high quality, published overrides ignored). Only reaches the kit through four additive exports in labs/shared/game.js. No hand-kept id list: families merged later appear automatically. Ids without a kit asset show "Production (classic only)".
- T1.2 preview.html: variant `production` and `compare` (original, lab study, production side by side), tier switch, controls generated from `params` (number slider, enum select, boolean, color; catalog/js/param-controls.mjs), live debounced rebuild, `?tier=` and `?params=`. Inspector in index.html gets the Production button and compare/swap links (index.html also got the three.js import map, needed because kit families import `three`).
- T1.3 Swap board catalog/swap.html: per-asset classic/modular and params; saved to repo-root kit-overrides.json through new `GET/POST /api/asset-library/kit-overrides` in catalog/server.mjs (temp file + rename, serialized queue, sha256 revision, id allowlist from a text scan of `defineAsset({ id:` in src/kit, shape validation, same-origin check); static host downloads the file. Entries equal to defaults are dropped; the file keeps exactly the game's format.
- T1.4 28 production thumbnails (360x300 WebP, 252 KB total) in `thumbnails.json` `production` map, kind `production`, with source and capturedAt; catalog/THUMBNAILS.md documents provenance; tools/catalog_check.mjs validates them.
- T1.5 tests: catalog/tests/kit-overrides.test.mjs (4), server.test.mjs (+4), asset-loader.test.mjs (+4).

## Checks (real output)
- `cd catalog && npm test`: pass 49, fail 0. `node --test catalog/tests/*.test.mjs`: pass 48 before the thumbnail test was added, then 49/0.
- `node tools/catalog_check.mjs`: OK Asset Library: 21 modules, 190 records, 126 evidence targets, 134 pictured assets, 414 WebP files (2.65 MB), 126 active editable entries
- `node tools/labs_check.mjs`: All labs checks OK. `node tools/kit_check.mjs`: All kit checks OK (119 passed).
- Headless Chromium (Metal): all 28 ids from docs/fable/handoff/_production_adapters.md build at preview.html?variant=production with 0 console errors (triangles 88..5904). Tier switch toro mid 390 -> far 270 triangles; slider rebuild shows params {"girth":1.1}. Compare view toro: original, lab, production all present.
- Gate G-T round trip (cadJS/server.mjs on a scratch port): swap board, key-rock size 1.5, Save -> kit-overrides.json written (`{"key-rock":{"variant":"modular","params":{"size":1.5}}}`). `game_shot --query "hour=11&cam=-20.5,1.8,-17.5,-23.5,0.6,-21.5&nohud=1&shot=1&assets=modular"`: before vs after diff maxDelta 197, meanDelta 9.02, 165785 px over 8; file deleted -> diff vs before maxDelta 0. File restored with git checkout (the committed empty file is unchanged). Shots in /Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/t1-catalog/gt-{before,after,deleted}.png.
- Not run: catalog `npm run test:browser/test:adapters` (they expect a server on :4173 and hang here); replaced by the targeted headless flows above. Not run: Playwright suites of cadJS.

## Files changed
catalog/{index.html,preview.html untouched,preview.css,server.mjs,swap.html,swap.css,thumbnails.json,THUMBNAILS.md}, catalog/js/{app,asset-loader,preview,swap,kit-overrides,param-controls}.mjs, catalog/thumbnails/production-*.webp (28), catalog/tests/{asset-loader,server,model,kit-overrides}.test.mjs, labs/shared/game.js, tools/catalog_check.mjs, docs/fable/{status,handoff}/t1-catalog.md.

## Concerns
- tools/catalog_check.mjs is outside `catalog/**`; the edit is additive (production map). Accept or move.
- catalog/tests/model.test.mjs: jade-paw coverage expectation `related` -> `direct`; it failed on the base because v-keepsakes added a direct lab target. Data-driven, not a weakening.
- Server param validation is shape-only (schemas need three.js); the board and the game clamp.
- Promoted/deferred: all 28 registered kit ids covered; none deferred. The cache tag in labs/shared/game.js stays 20261113a (do not bump here).
