# Lane brief: t1-catalog (Phase 6 — Asset Library: production variant, swap board, thumbnails)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/t1-catalog   Branch: fable/t1-catalog (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/t1-catalog-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, then AGENTS.md (catalog row), BUILD_GUIDE_FABLE.md §3 (esp. §3.5 kit-overrides.json
format `michi-neko-kit-overrides`), §13 lane t1 (T1.1–T1.5, gate G-T), catalog/README.md, catalog/THUMBNAILS.md,
docs/fable/handoff/_production_adapters.md (the production adapter ids every kit lane recorded).

## Your files
`catalog/**` (lane-owned for this lane EXCEPT the hot files below), `labs/shared/game.js` (hot — GRANTED for an additive
kit-registry bridge only, like c2's loadMichiModule bridge), `catalog/js/asset-loader.mjs`, `catalog/metadata.json`,
`catalog/thumbnails.json` (hot — GRANTED for this lane), status/handoff files. Never edit src/** (game) — the catalog
reads the kit through labs/shared/game.js. Do not edit cadJS/ (lane t2) — the shared server is cadJS/server.mjs which
mounts catalog/server.mjs; your server changes go in catalog/server.mjs.

## Steps (guide §13 T1.1–T1.5)
- T1.1 variant `production` in asset-loader.mjs built through the kit registry (allowlist; never evaluate source text).
  Every id in _production_adapters.md resolves; ids without a kit asset show "classic only".
- T1.2 inspector: three-way compare (original, lab study, production), tier switch (hero/mid/far), param controls
  generated from the asset's `params` schema (number → slider with min/max/step; enum → select), live rebuild.
- T1.3 swap board: per-asset variant (classic/modular) + params, saved as `kit-overrides.json` (format
  `michi-neko-kit-overrides`, guide §3.5) through catalog/server.mjs with the same atomic, revision-checked write used for
  metadata.json; on a static host it downloads the file instead. The game already loads kit-overrides.json at boot (f1).
- T1.4 thumbnails for production variants with provenance per THUMBNAILS.md (generated headlessly; small files).
- T1.5 tests: extend catalog/tests/asset-loader.test.mjs and server.test.mjs; `node tools/catalog_check.mjs`,
  `cd catalog && npm test`, `node --test catalog/tests/*.test.mjs`; optional browser smoke with
  PLAYWRIGHT_MODULE=/Users/c1t1zen/.npm/_npx/e41f203b7505f1fb/node_modules/playwright.
- Prove the round trip for gate G-T: set a param on the swap board → kit-overrides.json written → game boot on
  ?assets=modular shows the change (game_shot before/after) → delete the file → reverts.
