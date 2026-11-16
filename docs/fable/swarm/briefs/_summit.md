# Summit lane addendum (Phase 4: s2-clearing, s3-vista, s4-summit-life) — read after _common.md and _village.md

The summit (天上) was split by lane s1 into `src/summit/*.js` behind the `SummitManager` facade in `src/mountaintop.js`.
Read `docs/fable/status/s1-summit-split.md` and `docs/fable/handoff/s1-summit-split.md` first: they list the 32 summit
ids, how each is routed through placeAsset with the SUMMIT's own scoped runtime (`scopeAssets(game.assets, { MAT: this.MAT,
textures: TEX })`), the bound handles (`layout.bind`) the per-frame code reads, and the anchors kits must keep.

## Differences from the valley recipe
- Your kit family folder is `src/kit/<family>/` (named on your card). Summit kit builders receive the summit's MAT table.
- NEVER edit `src/mountaintop.js` or `src/summit/**` (hot for you). A needed hook goes in your handoff as an exact patch.
- No new draw from the summit's seeded `this.rng` (seed 20261004); kit assets use `ctx.rng` only. The summit grass draws
  nothing from the summit stream and must not start.
- The protected view: nothing may cover the city or the sea from the meditation seat — every planted or placed modular
  object is capped by `perchSightlineAt()` (bearing −0.62…0.38 rad). Prove it with the meditation view captures.
- Meditation is the point of this place. Judge first from the seat: `tools/summit_preview.html?view=meditation` at dawn,
  noon, dusk, night (`&time=`), then `?view=arrival` and any `?cam=px,py,pz,lx,ly,lz[,fov]` you need (summit-local).
  Classic and modular from the same camera (`&assets=classic` vs `&swap=<id>:modular`, or whatever the preview supports —
  check `tools/summit_preview.html`/its js; if it has no swap flag, use `tools/game_shot.mjs` in the summit). Summit
  captures are NOT pixel-repeatable (time loops, unseeded Math.random in classic) — compare by eye, not by hash.
- Checks (L7) add: `node tools/summit_test.mjs` (83 passed, never fewer), the summit golden CLI (`ls tools/summit_golden*`,
  `--help`): classic EQUAL + routing OK, and the routing with your ids on modular; `node tools/verify.mjs`.
- Weather/light state on entry must match the valley's (s4 especially).
