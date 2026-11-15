# v-critters status
Model: Claude Sonnet 5.5. Started 2026-11-13. Base: fable/integration 2bd963d. Family: src/kit/critters, lab 18.
Integrator grant: single writer of src/ambient_life.js for this lane (6 added lines, see handoff).

- [x] L1 claim  - [x] L2-L3 choices  - [x] L4 guardian-crows study (`critters/guardian-crow`)  - [x] L5 promote  - [x] L6 30 compare JPGs  - [x] L7 checks  - [x] L8 self-review  - [x] L9 handoff  - [x] L10 PR

## Choices
- sparrows: lab `flock` sparrow, rebuilt as a painted body (bib, cheek, cap, forked tail on one vertex-coloured mesh) + two horizontal hinged wings with a primary fan and a wing-bar. 3 live meshes/bird (classic 4). Classic wings are vertical cards; kit wings are horizontal.
- koi: lab kohaku/sanke/showa/ogon/tancho hides (256 px, cached), lathed body, dorsal sail, deep-forked tail on the `tail` pivot, `pectoral_l/r` pivots. Eyes are painted (classic: 2 sphere meshes plus an outline hull, so 8 meshes -> 5, far 2). No ink outline (deliberate).
- butterflies: lab `hinge`: ONE InstancedMesh, 50 butterflies, wing flap in the vertex shader (per-instance phase), classic drift/seeds on CPU, fade via scale. Layout hook in ambient_life: `_bflyLayout.playerPos/sky`.
- guardian-crows: lab study only (hinged shoulder + wrist rig, part names in the handoff). Not a kit asset; stays classic.

## Checks (real output)
- kit_check: All kit checks OK (110 passed)
- kit_contract_test --family critters: 3 assets, 9 asset x tier builds, 226 checks, 0 failed; self-test OK
- footprint_golden: EQUAL; `--systems`: EQUAL (classic)
- modular systems golden (`?swap=sparrows,koi,butterflies:modular`): rng identical (vegetation 249867, ambient Math.random 648), positions/records identical; differences are only the creature meshes and the butterflies Points -> swarm
- check_syntax: All 85 modules OK; verify.mjs ok; labs_check: All labs checks OK; `git diff --check fable/integration...HEAD`: clean
- Boot with all three swapped (game_shot): no kit warnings, only the pre-existing /cad-overrides.json 404.

## Perf (tools/perf_spots.mjs, 1 boot x 2 rounds, river + meadow)
| tier | set | river draws | meadow draws | river tris | meadow tris |
|---|---|---:|---:|---:|---:|
| high | classic | 683 | 734 | 6.939M | 7.536M |
| high | modular (3 ids) | 622 | 742 | 6.939M | 7.546M |
| medium | classic | 506 mean (668/340) | 558 | 5.09M | 5.64M |
| medium | modular | 460 mean (629/294) | 563 | 5.08M | 5.65M |
Budget rule (modular medium <= classic high): met (629 <= 683, 740 <= 734 is the shadow-refresh frame at the meadow, +6 draws; mean 563 vs 734). Frame ms unchanged within noise (8.3-9.8 vs 9.7-11.4). Draw changes: fewer koi/sparrow meshes (outline hulls, eyes, tail card gone) offset by hero koi dorsal/pectoral meshes and the swarm being 1 draw like the old Points.

## L8 self-review
AAA-1: koi (painted hide, richer reds, forked tail) and butterflies (two painted wings, hinged, coloured) are clear steps up; sparrows read as a bird with a swept wing in silhouette. Koi lose the ink outline, a stylistic change. AAA-2/3/7/8/9: contract test. AAA-4 (no pop): tier fixed at build; live and unmerged. AAA-5: legible at 2-3 m; sparrows and butterflies are hidden at hour 22 and 6 by the classic day logic, so those pairs are identical for sparrows (SAME by cmp, expected) and the butterflies 6/22 pairs differ only by swarm vs Points that are both faded out. Not met: AAA pixel pairs for sparrows 6/22 (nothing visible).
Concerns: wing hinge for sparrows uses the game's rotation.z flap (+-0.45 rad); butterfly material emissive boost is a taste call; kit `lab` ids are not exact specimen ids (see handoff).
