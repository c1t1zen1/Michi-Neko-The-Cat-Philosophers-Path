# Gate G-F fixes report
I1: main.js init() now sets resolvedQuality = settings.resolveQuality() and assets.setQuality() before preload()/assembleWorld(); Player gets resolvedQuality. verify.mjs has two new wiring checks. Boot: initialQuality medium, runtime quality high at build (classic and ?assets=modular both q=high; modular loaded rocks family).
I2: countryside.js exports MAT, TEX, KIT_TABLES; Vegetation/HiddenPlaces/Particles/AmbientLife scope with KIT_TABLES (no new materials, no rng). Guide 3.3 and f3 handoff updated.
M7: runtime.js no longer double-records swap problems. M9 covered by I1.
Deferred: M1, M4, M5, M6 (guide G2 wording), M8, and the "Later" list in the review's triage section 4.
Checks: check_syntax 64 OK; verify pass; kit_check 37 OK; labs_check OK (coverage report regenerated, line numbers shifted); kit_test 36/36; footprint golden and --systems EQUAL; cat_golden EQUAL (40 checks); summit_test 70; rooftop_test 40; git diff --check clean; boots clean except pre-existing cad-overrides.json 404.
