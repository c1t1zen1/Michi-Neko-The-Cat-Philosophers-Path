# t1-catalog

- Worker / model:    Worker I, Claude Sonnet 5.5
- Claimed:           2026-11-13
- Branch:            fable/t1-catalog
- Base commit:       489b923 (fable/integration)
- State:             ready for review

## Steps
- [x] T1.1 `production` variant in asset-loader.mjs through the kit registry (FAMILIES), via labs/shared/game.js
- [x] T1.2 inspector: three-way compare (preview.html?variant=compare), tier switch, schema-generated param controls, live rebuild
- [x] T1.3 swap board (catalog/swap.html) + kit-overrides.json write route in catalog/server.mjs (atomic, revision-checked); static host downloads
- [x] T1.4 thumbnails for production variants with provenance
- [x] T1.5 tests + browser proof + gate G-T round trip

## Checks run (command -> real result)
- `cd catalog && npm test` -> 49 pass, 0 fail; `node --test catalog/tests/*.test.mjs` -> same
- `node tools/catalog_check.mjs` -> OK (414 WebP files, 2.65 MB)
- `node tools/labs_check.mjs` -> All labs checks OK
- 28/28 kit ids build in preview.html?variant=production (headless Metal), 0 console errors
- G-T round trip: swap board key-rock size 1.5 -> kit-overrides.json written -> game_shot ?assets=modular diff maxDelta 197 -> file deleted -> diff maxDelta 0
- Full report: .superpowers/sdd/BUILD_GUIDE_FABLE/reports/t1-catalog-report.md
