# c2-michi report
Built: parts `eye-shine` (head) and `kumihimo-indigo` (collar) in src/characters/parts/michi_extras.js; `MICHI_MODULAR` def + `michiIsModular` in src/characters/defs/michi.js; Player wiring (classic untouched); labs/cat/ (classic vs modular, 13 in-page checks, all pass, console clean); handoff docs/fable/handoff/c2-michi.md.
Checks: cat_golden EQUAL (40/40); check_syntax 44 OK; verify pass; kit_check 27 pass; labs_check OK (after coverage --write); rooftop_test 38/0; syntax check of src/characters OK; git diff --check clean.
Not run: full headless boot (Player needs main.js patch, handoff 1); capture --compare sheets; swap at dawn/dusk/night via game_shot.
Deviations: labs/shared/game.js got one additive export (loadMichiModule).
Concerns: coat/face/shadow are not slots, so they are shared c1 parts rather than new swappable ones; dusk driver and registry row are handoff items.

## Scope completion
main.js patched in-lane (Player `{assets, quality}`; dusk eye-shine driver). Full boot classic and `swap=michi:modular` at 6/12/18/22 clean (only the pre-existing /cad-overrides.json 404). capture_baseline --only cat --compare Phase 0: 18 sheets 0/0/0. L6 JPGs in docs/fable/status/c2-michi/; hour 12 identical, dusk glint reads well. Scope accounting per item is in docs/fable/status/c2-michi.md ("Scope completion"): coat/face/bow/contact shadow shared or deferred, collar (indigo), bell, master bells, eye shine offered. labs/shared/game.js listed as hot-file change in the handoff.
