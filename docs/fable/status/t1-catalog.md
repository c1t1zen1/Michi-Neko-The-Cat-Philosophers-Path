# t1-catalog

- Worker / model:    Worker I, Claude Sonnet 5.5
- Claimed:           2026-11-13
- Branch:            fable/t1-catalog
- Base commit:       489b923 (fable/integration)
- State:             in progress

## Steps
- [x] T1.1 `production` variant in asset-loader.mjs through the kit registry (FAMILIES), via labs/shared/game.js
- [x] T1.2 inspector: three-way compare (preview.html?variant=compare), tier switch, schema-generated param controls, live rebuild
- [x] T1.3 swap board (catalog/swap.html) + kit-overrides.json write route in catalog/server.mjs (atomic, revision-checked); static host downloads
- [ ] T1.4 thumbnails for production variants with provenance
- [ ] T1.5 tests + browser proof + gate G-T round trip

## Checks run (command -> real result)
(see report)
