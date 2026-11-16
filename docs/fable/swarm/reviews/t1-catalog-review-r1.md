# t1-catalog review r1 — verdict: APPROVE (no blockers)

Reviewed the diff in passes (src, server, tests, check tool); thumbnails and swap/preview UI skimmed, not exercised. Tests not re-run.

## Named risks
1. Write route (catalog/server.mjs). Fixed path `repoRoot/kit-overrides.json`, no client path input: no traversal. Body cap 2 MB via the existing `body()`. Origin check is the shared POST gate (rejects cross-origin when Origin present; absent Origin passes, identical to the metadata write). Revision = sha256 of file bytes ('none' if absent), compared inside the serialized queue; temp file + rename; two-writer test shows 200/409. Id allowlist from a text scan of `defineAsset({ id:` (readdir + regex, never evaluated); ids/param keys regex-restricted (`__proto__` rejected); values limited to finite number/bool/string<=64. Game side verified: `parseOverridesDoc` ignores bad entries; `resolveParams` reports unknown keys as problems (not thrown) and `coerceParam` clamps/snaps numbers, rejects bad enum/boolean. Unknown ids are never looked up. Shape-only server validation is therefore safe.
2. Production variant: builds from `FAMILIES` via `AssetRuntime` with `fetchOverrides: async () => null` and a stub logger; only registered defs; variant must be in a fixed list; no eval/Function. Kit imports go through four new additive exports in labs/shared/game.js (tagged 20261113a, matching others). catalog_check's "no direct src imports" rule still satisfied.
3. model.test.mjs jade-paw related -> direct: data-state update (comment cites the new keepsakes lab target); assertion strength unchanged. Accept.
4. tools/catalog_check.mjs: additive (`image()` gains optional `production` flag defaulting to the old kinds; new loop over `thumbs.production || {}` with the same path/WebP/budget checks plus source/capturedAt). Accept.

## Minor (non-blocking)
- POST body of JSON `null` makes `payload.overrides` throw a TypeError; check the route's catch maps it to 4xx not 500 (same pattern exists in the workspace route).
- Kit-ids scan regex requires `id:` first inside `defineAsset({`; a future asset with another key first would be silently unsavable (409/400, fail-closed, so safe). The test asserts all 28 current ids.
- Missing Origin header is accepted (consistent with existing route; local-only server).
