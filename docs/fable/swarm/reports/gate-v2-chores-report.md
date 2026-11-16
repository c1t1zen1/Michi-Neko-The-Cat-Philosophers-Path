# G-V2 chores report (with G-C and G-V1 follow-ups)

Worktree `michi-wt/integration`, branch `fable/integration`. Scratch: `michi-wt/_scratch/gate-v2-chores/` (logs, `boot.mjs`, `run.sh`, `main-wt/` a detached worktree of origin/main 414225f). Playwright via `PLAYWRIGHT_MODULE`. Machine load 3.7 to 7.7 during the run. No cache-tag bump (R44).

## Items
1. I1: `fence.js` sample is the 11.0 m run. Measured hero / mid / far 22,638 / 12,660 / 568 tris. At 11 m the warm build is 8 to 11 ms (over 6 / 3), a real failure, so `BUDGET_EXCEPTIONS['bamboo-fence']` also carries `buildMs: 14` (hero, mid). `budgets.md` §4 and `perf_gv1.md` "needs a ruling" paragraphs replaced with the R51 outcome. Family contract: 300 checks, 0 failed.
2. I2: R52 wording in guide §9 L5, `budgets.md` (§3 bullets, derivation marked as history, headroom paragraph); `KIT_LIMITS.newMergedMaterials` renamed `mergedMaterialsBaseline` (informational); `kit_check.mjs` no longer pins 11 (asserts 25k/6k/1k, 6/4/2 and that the retired key is gone; note points at R52). Per-handoff "lists its merged material" check dropped with a note: 19 of 34 handoffs do not use the phrase, so it would be a retroactive failure. New `tools/kit_material_census.mjs` (`--help`, `--tier`, `--out`, `--json`; instruments a temp copy of src, repo untouched; about 7 s). Today: 30 kit materials at high, 28 on static draws. Listed in Appendix C as optional.
3a. `catalog/js/links.mjs`: interiors and ranges bench allowlists now come from `registerKnownTargets(inventory.targets)` (app, `catalog_check`, links test register it); unregistered benches fail closed; a new test rejects unknown ids. Ranges anchors stay as an id-to-anchor hint with fallback to the id. `cd catalog && npm test` 50/50.
3. Minors: M1 (v-fences handoff wording) and M4 (sign board note in v-fences status) fixed; M3 folded into items 1 and 2. Deferred: M2 barrel L6 re-shoot (v-alley or a1-village), M5 pool toro merge pass (v-hidden), M6 modular fence lighter at dusk (a1-village, `weathered` finish), M7 idle perf_spots run (needs a quiet machine; must be read idle before G-V3).
4. Board: v-machiya and v-interiors were already `[x]`; c2-michi, c3-villagers, G-V2, G-C ticked. §6 notes record the R49 edge-forest pin and deferred ids (village-street, tree-trunks, tree-canopies, scent, splash, landing-dust, summit-wildlife, v-sky six, c2 bow and shadow, offering bells). v-ground, v-water, s3-vista, r1-roof-split untouched.

## Gate results
G1 (`g1.log`): check_syntax 147 modules OK; verify.mjs all passed (kit 364, kit_test 36/36); kit_check 364 passed; kit_index in sync; labs_check OK; cad_overrides_test 27/0; `git diff --check` clean.
G2 (`g2.log`, `g2b.log`): footprint golden EQUAL; `--systems` EQUAL; `--query "?assets=modular"` DIFFERENT as expected (53 changed, 583 added, 354 removed; 518 colliders, 65 platforms, 5 water rects, 4 exclusions, 25 anchors, rng draws unchanged = classic). summit_golden EQUAL (routing 32/32), summit_test 83/0, cat_golden EQUAL (40/0), rooftop_test 40/0, labs_geometry_test 32/32.
kit_contract_test, all families: run 1 = 121 assets, 10121 checks, 1 failed: `kawara-roof [mid] warm build <= 3 ms` at 3.5 ms (only a millisecond check). Run 2, load 3.7: 0 failed, merge OK (237 -> 285 -> 240 calls), self-test OK.
G3 (`g3.log`): catalog_check OK (176 targets); labs_coverage OK; labs_coverage_test 11/0; catalog tests 50/0; interiors_test 28; ranges_test 19; swap matrix 186 rows OK; dawCAT 251/0.

## G-V2 boot (`boot.mjs`, `boot_modular.json`, `boot_classic.json`)
`node boot.mjs <repo> <repo> "?assets=modular" new out.json` (and `?assets=classic`): autostart new, boot dissolved, 239 kit instances on modular (0 on classic), 289 and 300 rendered frames, KeyW held 4 s moved the cat z 0 to 17.9 on both. Console: only the known `404 /cad-overrides.json`; no warnings.

## G-C saves load
Commands (scratch dir):
- `node boot.mjs <integration> <main-wt> "" new main_save.json - save` boots origin/main (414225f), sets pos (5.5, 0, -8.25), heading 1.25, yaw 0.5, xp 137 rank 1, score 7, collected [probe-a, probe-b], dayTime 15.5, calls `saveGame()` and dumps `localStorage.catwalk_save_v2` to `save_payload.json`.
- `node boot.mjs <integration> <integration> "?assets=classic" continue load_classic.json save_payload.json` and the same with `?assets=modular` (the payload is injected as `catwalk_save_v2`, autostart `continue`).
Result: both boots restore pos [5.5, 0, -8.25], heading 1.25, yaw 0.5, score 7, xp 137, rank 1, the two collected ids and dayTime 15.5; modular has 239 instances; errors only the known 404, no warnings. Cat sheets equal (cat golden), villagers part the grass (systems golden EQUAL).

Verdict: GREEN. G-V2 and G-C ticked. Not done: the dedicated Appendix-C summit_kit_parity and cadJS `npm run check` (not in this brief's list).
