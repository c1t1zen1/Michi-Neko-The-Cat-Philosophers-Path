# G-V3 chores report (end of Phase 2, the village)

Status: **DONE_WITH_CONCERNS. G-V3 NOT ticked** (two reds, see "Concerns").
Worktree `michi-wt/integration`, branch `fable/integration`, start `422d301`, final **`ff8e8e7`** (pushed, = origin).
Scratch: `michi-wt/_scratch/gate-v3-chores/` (logs, JSON, scripts). Playwright via `PLAYWRIGHT_MODULE`. Model: Claude Opus 5.5.
Cache tag per the coordinator's correction: **`20261114a`** (not 20261115a). Ruling R64 applied (Roof Road sandbox, `kyoto-rooftops.html`,
`tools/rooftop_*_test.mjs`, `Shinkansen/` untouched by the bump).

**Machine load.** The swarm was held, but the machine was never idle: processes outside the swarm ran throughout
(resident 65B `llama-server` on the GPU, the Devin IDE renderer at up to 120 % CPU, WindowServer, QuickTime, an RDP client,
short Blender jobs from 23:28, and the operator's own Codex session running `rooftop_browser_test.mjs` in the main checkout
at 22:59, which I waited out). 1-min load: 1.5 to 2.7 for items 2 and the start of 3, up to 5.5 during the day run and 8.5
during the attribution run. Every perf table records the load at each boot start.

## Commits

| SHA | Item |
|---|---|
| `497280c` | 0: merge origin/main (a3221d4, Shinkansen only), no conflict |
| `ca3a6b0` | 1: board note, village lanes 2.1–2.3 all merged, deferrals |
| `aed29f8` | 2: budgets.md §5 warm-build re-check + §4 R53 attribution |
| `b97a553` | 4: cache tag `20261114a` (163 files) |
| `618e540`, `7c838fb` | 3: `docs/fable/baseline/perf_gv3.md`; budgets.md §2 status note |
| `ff8e8e7` | 6: board note, G-V3 not ticked, with reasons and owners |

## Item 0: origin/main

`git fetch origin && git merge --no-ff origin/main -m "Merge origin/main (a3221d4: Shinkansen project) into fable/integration"`:
no conflict; files changed outside `Shinkansen/`: 0. `git merge-base --is-ancestor origin/main HEAD` → true, so `main` can
fast-forward. (Commit amended before the push only to add the Co-Authored-By line.)

## Item 1: board

All twenty village lanes (rows 2.1–2.3) are `[x]`. No lane-level deferral; id-level deferrals already in the G-V2 notes
(village-street, tree-trunks/canopies, scent/splash/landing-dust, summit-wildlife, six v-sky ids, c2 bow + shadow, offering
bells; edge-forest pinned classic, R49). Added a G-V3 board note; fixed the stale "s3-vista stays open" (it merged).

## Item 2: warm-build re-check (budgets.md §5) and R53 (budgets.md §4)

`node tools/kit_contract_test.mjs` (140 assets, 420 builds, 11,894 checks), at `ca3a6b0`:
- Run 1 (load 2.04→2.51, 9.4 s): **0 failed**. Run 2 (load 2.34→2.99, 17.6 s, the page ran at half speed): 20 warm-build failures.
- **No failure reproduces on both runs.** Four more runs dumping every warm number (`kct_warm.mjs`, load 2.55–2.72): 0, 0, 1
  (`summit-pagoda` hero 6.1/6), 0. After the tag bump (load 2.8–3.0): 0 and 0 failed. (One run at load 3.8: 7 watch-list
  assets 2–30 % over: load, not code.)
- Nothing is over budget on the quiet machine; no cap changed. The reported flakes, quiet (min–max / cap): summit-pagoda hero
  4.7–6.1/6, horizon mid 2.3–3.0/3, kawara-roof hero 3.2–3.7/6 and mid 2.1–2.5/3, timber-frame mid 1.3–1.5/3, sakura hero
  4.3–5.0/6.
- Watch list (≥ 85 % of cap): summit-pagoda hero, horizon hero/mid/far (vista), valley-ground far (ground), distant-pagoda hero
  (pagoda).
- **Proposals (not applied)**: `buildMs` exceptions no longer needed: tea-house / residence hero 12 (quiet 2.5–3.5), tea-interior
  hero 9 and far 5 (4.2–4.5, 0.9–1.2; mid stays, 3.3 > 3), mountains 30 (0.2–0.5); bamboo-fence 14 could be 10 (6.1–7.9 real).

**R53.** Deterministic boots (`?shot=1&hour=10.5`, street spot) listing every main-pass and shadow-pass object, classic
against `?swap=tea-house,residence,secret-house,street-house`: medium 370→371 main, 363→364 shadow: the one new draw is the
baked kit `bag` mesh (timber trim), not the skirt/fence (hero-only). High +3/+3: `bag`, `bamboo`, `cord`. **The two inuyarai
merge across instances** (one baked bamboo + one cord mesh), and with the whole kit (`?assets=modular`, high) no `culms`/`knots`
mesh stays unmerged; switching tea-house + residence to classic leaves bamboo 3/4 and cord 1/1 unchanged, so the inuyarai cost
0 draws and the kit houses draw one call fewer than classic (296 vs 297). Nothing to drop at hero.

## Item 3: performance (perf_gv3.md)

`node tools/perf_spots.mjs --boots 2 --rounds 3 --url-suffix "" --url-suffix "?assets=modular"` (day, four spots × three
tiers) and `--hour 22 --spots street,shrine` (night).
- **budgets.md §1: every rule holds, day and night.** Medium modular calls 277–442 vs classic high 455–768; triangles
  4.86–5.75 M vs 6.93–8.12 M; frame below classic high. High: calls 0.76–0.91 ×, triangles 1.083–1.094 ×, frame 0.99–1.11 ×.
- **R52 holds on every tier**: modular draws below classic at every spot (medium −33 to −152, high −40 to −185).
- Low rule: saved `{"quality":"low","assetSet":"modular"}` → `set: classic, loaded: false, instances: 0`; only the runtime's
  static imports load (runtime, rng, contract, audio); no family, materials.js or kit-overrides.json. **Holds.**
- Frame regressions > 1 ms (no rule broken): street +1.67 medium / +1.65 high (night +1.31 / +1.77), shrine +1.16 / +1.25
  (night +1.37 medium), meadow high +1.75; river flat. Attribution at street high, one family switched to classic at a
  time (19 configs × 2 boots): `ground` −1.15 ms frame / −1.03 ms GPU render (both boots agree; fragment cost of the ground
  material, medium already drops POM and puddles), `water` −0.80 / −0.58, `fences` −0.75 / −0.61 and −0.38 M tris (R51 hero
  runs, merged valley-wide). Others within noise.
- **budgets.md §2 world build FAILS on modular.** Dedicated re-measure (4 boots per set and tier, interleaved, load 2.3–4.3):
  medium build 1,316 → 2,262 ms (1.72 ×), ready 1.63 ×, boot total +1,202 ms; high 1,389 → 2,414 (1.74 ×), +1,219 ms.
  Rule: ≤ 1.25 ×, boot ≤ +1,000 ms. The lowest-load pair is still 1.63 ×. (G-V1: 1.19 ×.) MAIN classic (414225f, same
  settings, load 4.2–4.9) builds in 1,744 ms, so integration's classic is not slower. Kit instance `buildMs` summed by family
  (one boot per tier, 261 instances): 845 / 1,031 ms medium, 1,229 high; top: `valley-ground` 199–251, `clouds` 65–81,
  `moon-pool` 52–66, `corral-sign` 38–45, `street-bushes` 30–37, `moon` 22–35 (≈420 ms together).

## Item 4: cache tag `20261114a`

Byte-safe Node script (`bump.mjs`: literal `?v=20261113a` → `?v=20261114a`, UTF-8 round-trip checked, CRLF kept), then
`node tools/kit_index.mjs` → "wrote src/kit/index.js (24 families, … tag 20261114a)". 162 files, 492 tags, plus `KIT_TAG`;
`AGENTS.md` "Current tag" updated with the R64 exception. Diff verified tag-only (normalised diff empty; CR counts equal per
file; index.html is the one CRLF file). `cadJS/src/kit-params.mjs` is the only cadJS file (it imports the tagged kit
contract); no dawCAT, catalog, rooftops, Shinkansen or kyoto-rooftops file touched.

```
$ grep -rn "?v=2026" --include=*.js --include=*.html --include=*.mjs . | grep -v 20261114a | grep -v node_modules
docs/social/cat-anatomy-glow-up/source/capture/harness/capture.js:16:const TAG = '?v=20261022e';   (archived social-post harness, imports its own /snap/ copy)
rooftops/js/game.js:90:    const mod = await import('../../src/cat.js?v=20261113a');       deferred to G-R (R64)
rooftops/js/build.js:17:} from '../../src/textures.js?v=20261113a';                       deferred to G-R (R64)
```
Also deferred to G-R (R64), untagged or own tags: `kyoto-rooftops.html`, `tools/rooftop_alley_test.mjs`,
`tools/rooftop_browser_test.mjs`, `Shinkansen/**` (its own `?v=20261114a` on style.css/game.js is the operator's).
`node tools/rooftop_test.mjs` after the bump: **40 passed, 0 failed**; companion 7 passed. `git diff --check` notes
index.html:947, the same pre-existing CRLF line the G-F bump showed (93955a2), not damage.

## Item 5: gate checks (logs `g1.log`, `g2.log`, `g2b.log`, `g2c.log`, `g3.log`, `g4_boot.log`, `g4_sheets*.log`)

**G1 (at 7c838fb)**: check_syntax "All 170 modules OK"; verify.mjs "All checks passed" (kit 446, kit_test 36/36); kit_check
446 passed; kit_index in sync (24 families, tag 20261114a); kit_test 36/36; labs_check OK; cad_overrides_test 27/0;
`git diff --check` clean (range 422d301..HEAD clean except index.html:947 CR, see item 4). **Green.**

**G2**: footprint golden **EQUAL** (518 colliders, 65 platforms, rng 49233); `--systems` **EQUAL**; `--query "?assets=modular"`
DIFFERENT as expected (60 changed, 657 added, 403 removed) with colliders 518, platforms 65, water rects 5, exclusions 4,
anchors 25 and rng draws = classic; anchor diffs are the known shishi rocker (0.18 m) and `hidden.lanterns[]` → null (v-hidden
status: the kit runs the glade lanterns). ground_wear_test 14/0. summit_test 83/0; summit golden **EQUAL** (routing 32/32);
summit_kit_parity **EQUAL**; cat golden **EQUAL** (40/0); rooftop_test 40/0; rooftop_companion 7/0; labs_geometry_test
32/32 ("PASS: lab geometry"); kit_contract_test all families 0 failed (twice, post-bump, load 2.8–3.0), merge OK
(237→285→240), self-test OK; game_shot two boots per set `maxDelta 0` (classic and modular). **Green.**

**G3**: catalog_check OK (190 records, 189 targets); labs_coverage OK; labs_coverage_test 11/0; catalog npm test 50/0; dawCAT
251/0; interiors_test 28; ranges_test 19; swap matrix 186 rows OK. **`cd cadJS && npm run check` FAILS**: modules ok, 15/15
catalog tests pass, then `tests/kit.test.mjs` throws `ReferenceError: document is not defined` (`src/kit/ground/valley.js` →
`countryside.js` → `textures.js` paints a canvas at module load). Bisected in scratch worktrees: 16/16 at the t2-cadjs merge
`5067685`; broken at the v-sky merge `0c6908a` (`TypeError: …crossVectors(...).normalize is not a function` from
`src/kit/sky/night.js` module-level vector math against the test's Proxy `three` stub); v-ground added the second cause. Not
caused by this gate; not fixed here (cadJS and the families are not chores files). **Red.**

**G4**: `boot.mjs` (autostart new, 4 s KeyW): classic: 300 frames, cat z 0 → 18.006, set classic, 0 instances; modular: 300
frames, z 0 → 17.9996, 261 instances, loaded; console both: only the known `404 /cad-overrides.json`, no warnings.
Review sheets `capture_baseline.mjs --previews none --no-repeat --compare _baseline --only town,hidden,tree,cat`: cat 18/18 and
hidden 3/3 `0/0/0`; town 9 within the Phase 0 floor (worst 43 / px>8 17, floor 74 / 17); tree 12 sheets differ from Phase 0
(hero mean 4.7, px>8 123,639) but are **byte-identical to MAIN** (414225f captured the same way: `maxDelta 0` on hero,
detail, rim, bush, compare, thicket): the R25 / G-F harness-tag artefact already on `main`, not a change from this merge;
textures 0/0/0. No tracked preview overwritten. **Green.**

## Item 6

Not ticked: budgets.md §2 (a budget rule) fails on modular, and G3 has a red check. Recorded in the §6 G-V3 board note,
budgets.md §2, and perf_gv3.md.

## Concerns for the Integrator

1. **World build on modular is 1.72 × classic (rule 1.25 ×), boot total +1.2 s (rule +1.0 s).** Players on default settings
   are unaffected (assetSet `classic`; `low` never loads the kit), so a ruling could accept the merge with modular opt-in and
   assign the build work (`valley-ground`, `clouds`, `moon-pool`, `corral-sign`, `street-bushes`, `moon` first builds) to
   `a1-village`, or hold. Your call.
2. **cadJS kit test red since v-sky** (and v-ground). Fix options: lazy THREE work in `src/kit/sky/night.js` and no top-level
   `countryside.js` import in `src/kit/ground/valley.js` (family owners), or a richer stub in `cadJS/tests/kit.test.mjs`.
3. Frame time: modular +1.2 to 1.8 ms at street/shrine/meadow (no rule broken); ground ≈1 ms GPU, water ≈0.6, fences ≈0.6.
4. Measurements were taken under outside load (up to 8.5 during attribution); same-session ratios are the evidence, absolute
   frame ms are not comparable with perf.md.
5. Four detached scratch worktrees were created for the cadJS bisect and left in place (rule: no worktree deletion without the
   Integrator): `_scratch/gate-v3-chores/wt-pre-ground` (1ac830b), `wt-ground` (422d301), `wt-5067685`, `wt-0c6908a`. Prune
   with `git worktree remove` when convenient. `gate-v2-chores/main-wt` was used read-only and kept.
6. `docs/social/.../capture.js` keeps its own `?v=20261022e` (archived harness); listed in the grep proof.
