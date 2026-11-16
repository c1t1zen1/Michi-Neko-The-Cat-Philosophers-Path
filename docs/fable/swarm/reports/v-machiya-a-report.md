# v-machiya-a report
Full status with checks, per-asset triangle counts, perf table and judgement: docs/fable/status/v-machiya-a.md (branch fable/v-machiya-a). Handoff: docs/fable/handoff/v-machiya-a.md.
Built: src/kit/machiya (kawara-roof, koushi, upper-windows, noren, timber-frame, namako, engawa, tea-bench, secret-door, lock-plate), lab gap specimens (labs/machiya/js/gaps.js). ~1,100 changed source lines, 80 compare JPGs.
Checks: kit_check 93 OK; contract 10 assets / 30 builds / 901 checks / 0 failed, merge OK; footprint golden EQUAL; swap golden differs only by replaced meshes; check_syntax 82 OK; verify OK; labs_check OK; diff --check clean.
Perf street: draws 761->670 (high), 597->518 (medium); tris +1.3%.
Concerns: hero noren = one live draw each (may exceed the spot's liveMeshes cap); roof hero 7,960 / mid 4,440 tris each; timber-frame and roof compare frames weak (occluded).

## Fix round 1
Noren now static with a shared vertex-shader sway material (no live meshes). Merged integration. Contract 903/0 failed, kit_check 131, golden EQUAL (swap: meshes only), verify/labs OK. Street perf: high draws 780->657, tris +0.8%, frame 9.70->12.05 ms; medium draws 600->515, frame 7.95->9.13 ms (frame rise flagged). Roof tri derivation, door comment and `layout.band` note added. Details: docs/fable/status/v-machiya-a.md.
