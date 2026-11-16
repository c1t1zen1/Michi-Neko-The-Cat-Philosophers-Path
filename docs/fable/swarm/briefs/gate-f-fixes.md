# Gate G-F follow-up fixes (Integrator delegate) — on fable/integration

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/integration (branch fable/integration; you are the only writer while this runs).
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/gate-f-fixes-report.md
Read: _common.md (same folder as this brief), AGENTS.md, BUILD_GUIDE_FABLE.md §3, and the gate review
/Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/gate-f-review-report.md
(findings I1, I2 and the Minor list with its triage). You are granted the hot files these fixes need (src/main.js,
src/player.js, src/vegetation.js, src/hidden_places.js, src/particles.js, src/ambient_life.js, src/kit/runtime.js,
BUILD_GUIDE_FABLE.md §3 text, docs/fable/handoff/f3-systems-split.md). Do NOT bump cache tags.

1. I1 — src/main.js:212-218, :255: AssetRuntime and Player are constructed with `initialQuality` ('medium' on every
   `auto` desktop) and the valley is built before `resolveQuality()` returns 'high', so merged kit statics are built at
   `mid` on default-settings high-tier machines. Fix as the review proposes (resolve the quality before `assembleWorld()`
   — e.g. `this.assets.setQuality(this.settings.resolveQuality())` at the top of `init()` once the renderer exists, and
   the same resolved value for Player), keeping classic behaviour identical (classic ignores tiers). Add a check to
   tools/kit_test.mjs or verify.mjs wiring that guards it (e.g. verify asserts main.js resolves quality before
   assembleWorld), never removing a check.
2. I2 — src/vegetation.js:46, src/hidden_places.js:89, src/particles.js:16, src/ambient_life.js:73 scope the runtime with
   `{}`, so kit builders for their ~50 ids get `ctx.MAT = {}` / `ctx.textures = {}`. Ruling: scope those four owners with
   the SAME shared MAT table and textures Countryside uses (find where Countryside gets MAT/textures and pass the same
   objects through; no new materials, no draw from any seeded stream). Update guide §3.3 (one sentence: every owner's
   ctx carries the shared MAT + textures) and the f3 handoff accordingly.
3. Minors triaged "fix now" or trivially safe in the review — fix them; list the rest as deferred in your report.
4. Prove: `node tools/check_syntax.mjs`, `node tools/verify.mjs`, `node tools/kit_check.mjs`, `node tools/labs_check.mjs`,
   `node --test tools/kit_test.mjs`, `node tools/footprint_golden.mjs` and `--systems` (EQUAL), `node tools/cat_golden.mjs`,
   `node tools/summit_test.mjs`, `node tools/rooftop_test.mjs`, `git diff --check HEAD~N`, and a classic boot:
   `node tools/headless.mjs /__boot.html --console --fail-on-error --ignore AudioContext --ignore cad-overrides.json --wait "window.game && window.game.capture && window.game.capture.frame > 60" --eval "window.game.assets.summary()"`
   plus the same with `?assets=modular` appended to the redirect target if the boot page supports it (else
   `/index.html?assets=modular` with sessionStorage autostart as __boot.html does) — show the runtime quality is 'high'
   on this Mac before the valley builds. export PLAYWRIGHT_MODULE=/Users/c1t1zen/.npm/_npx/e41f203b7505f1fb/node_modules/playwright
5. Commit (explicit paths; Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>) and `git push origin fable/integration`.
Reply with ONLY the short contract from _common.md. You do not dispatch subagents.
