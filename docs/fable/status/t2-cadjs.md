# t2-cadjs status

- Worker: D (Claude Sonnet 5.5), lane t2-cadjs, branch fable/t2-cadjs
- Base: fable/integration @ 1e74cf3
- Started: 2026-11-14

| Step | State | Notes |
|------|-------|-------|
| T2.1 `/cadJS/?asset=<id>&variant=production` loads the kit asset, parts named `asset:<id>/<part>`, selectable | [x] | verified headless: group `asset:path-boulders`, parts `asset:path-boulders/boulders_light`, semantic ids `catalog.path-boulders.<part>` |
| T2.2 param panel from `params`, live rebuild, Undo/Redo | [x] | slider preview + one undo step per commit; verified edit, undo, redo |
| T2.3 AI `set_asset_params` / `swap_asset_variant`, schema validated, one undo step | [x] | out-of-range plan rejected at review and at execute; applies atomically |
| T2.4 package schema 2 (create/remove/reparent) + migration from 1 | [x] | unit tests both schemas; browser create/reparent/remove with undo/redo |
| T2.5 Push to game writes kit-overrides.json (t1's atomic write) + cad-overrides for free-form | [x] | verified through cadJS/server.mjs; file restored after |
| T2.6 `npm run check` and `npm test`, README | [x] | 15 + 15 tests |
