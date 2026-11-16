# Integrator delegate brief: G-V1 gate chores (end of wave 2.1 — props the cat walks past)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/integration (branch fable/integration). You act for the Integrator
(guide §4.1): you MAY edit hot files, but only for the items below. One commit per item; push after each (never force).
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/gate-v1-chores-report.md
Common rules: _common.md in this folder. Read first: BUILD_GUIDE_FABLE.md §3, §6, §9 (gate G-V1 text), Appendix C;
docs/fable/baseline/budgets.md; docs/fable/handoff/_production_adapters.md ("Pending helper moves"); the status and
handoff files of the eight wave-2.1 lanes (v-lanterns, v-fences, v-rocks, v-garden, v-greenery, v-alley, v-keepsakes, v-nest).
export PLAYWRIGHT_MODULE=/Users/c1t1zen/.npm/_npx/e41f203b7505f1fb/node_modules/playwright

## Items
1. Helper moves listed under "Pending helper moves": move each helper into src/kit/craft.js or src/kit/materials.js,
   re-export it from its family file (or update the family import) so behaviour is byte-identical; prove with
   `node tools/kit_contract_test.mjs` (all families) — geometry hashes must be unchanged — and the modular footprint golden.
2. Material reconciliation (ruling R39): enumerate every kit material actually created when ALL families are on modular
   (instrument `_once` / KitMaterials in a headless modular boot and list distinct material keys with their family), and
   the merged draws they cost. Dedupe identical or visually equivalent args across families into shared named kit
   materials (e.g. one bamboo, one dark wood, one paper glow) without visible change (re-shoot two L6 pairs per touched
   family and compare). Target: ≤ 11 new merged materials kit-wide (budgets.md). If it cannot be met without visible
   loss, record the measured count, the draw cost at the four spots, and a recommendation in budgets.md "Kit materials"
   and in the report — do not silently exceed.
3. Pending BUDGET_EXCEPTIONS requested in handoffs (e.g. v-greenery bamboo groves): apply exact entries to
   src/kit/budgets.js with the measured numbers the handoff gives; kit_check and the contract test must pass.
3b. Contract test gap (found by v-greenery's review): tools/kit_contract_test.* counts an InstancedMesh's geometry once;
   make the triangle budget count `geometry triangles × mesh.count` for InstancedMesh (and shadow pass as today), add a
   self-test for it, and re-run all families — any family that now exceeds a cap without an exception: report it.
4. Budgets with the eight families on modular (gate text: "budgets (D1) hold with the eight families on modular"):
   `node tools/perf_spots.mjs` at the four spots (street, shrine, river, meadow) on quality low, medium, high —
   classic vs `?assets=modular` — and compare with budgets.md rules (modular medium ≤ classic high; per-tier gates).
   Record a table in docs/fable/baseline/perf_gv1.md (new). Any breach: name the families responsible (swap them one at
   a time) and report it; do not tick G-V1.
5. NO cache-tag bump at this gate (Integrator ruling R44: tags are bumped only at gates that merge to main — G-V3, G-R
   and the final merge — because only main reaches players, and a bump mid-wave conflicts with every running lane). Do
   fix G1 whitespace damage that arrived with merged lanes (`git diff --check 414225f..HEAD` — e.g. blank lines at EOF in
   labs/keepsakes/js/shapes.js and src/kit/keepsakes/shapes.js), as integration glue.
6. Guide (Integrator-owned): tick the eight wave-2.1 lanes on the §6 board if any is unticked (only if merged), record the
   material/budget outcome in §3 where it changes the contract, and tick G-V1 only when item 7 is green. The gate says
   "If the pipeline needed a rule change, update §3–§5": add to the §9 standard lane recipe (L5/L7) the rules that wave
   2.1 taught, as written at the end of briefs/_village.md (static props merge-able, no InstancedMesh for static props
   unless measured; L6 pair per id, not byte-identical; contract sample = largest real layout; perf on modular high AND
   medium vs classic high; reuse kit material args before adding one).
7. Gate checks, record every command + real output: G1 (check_syntax, verify, kit_check, labs_check,
   `git diff --check` over your commits); G2 (footprint golden classic + `--query "?assets=modular"` + `--systems`,
   `node tools/kit_contract_test.mjs` all families, labs_geometry_test via headless, rooftop_test, summit_test + summit
   golden, cat_golden); G3 (`node tools/catalog_check.mjs`, labs_coverage + its test, `node --test catalog/tests/*.test.mjs`,
   `node tools/interiors_test.mjs`, `node tools/ranges_test.mjs`, `node tools/fable_swap_matrix.mjs`); boots classic and
   modular (console: only known lines). Any red: stop, do not tick G-V1, report BLOCKED with the output.
Reply with the short contract (≤15 lines) and the final `git rev-parse --short HEAD`.
