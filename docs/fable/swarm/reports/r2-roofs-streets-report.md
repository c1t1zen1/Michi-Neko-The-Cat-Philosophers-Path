# r2-roofs-streets report (this PR = r2-a, 7 props)

Branch fable/r2-roofs-streets, PR #47. Family `src/kit/roofstreets/` (props.js, index.js).

## Promoted
roof-crates, roof-barrels, roof-komodaru, roof-lantern-post, roof-yuka, roof-utility-poles, roof-trellises.
Deferred to r2-b: machiya, kura, corner, kido, komayose, inuyarai, roji, tsuboniwa, balconies, zushi, alley pockets/routes,
kawara-roofs, facades, bridge, river-steps, street, ground.

## Design
Rail-frame builders read `layout.piece`; sizes identical to classic (platform tops unchanged). Materials resolve from the Roof Road's
own `ctx.MAT` (agedWood, timber, timberMed, steel, lacquer, lanternRed, bamboo, twine, leaves[0..2], wisteria, goods[3]) with kit
fallbacks, so props merge into the classic batches (no added draw calls). Vertex-colour materials were NOT used (they rendered black
before the integrator's common.js patch; classic materials match better anyway).
Trellis: foliage is now alpha-cut leaf cards (M.leaves, 2 tris each, same counts as classic: 4+4+3 per 0.43 m step per row at hero,
about half at mid, two leaf materials at mid for the 4-material budget); wisteria beads are 80-tri spheres (hero only).

## Checks (uptime load 2-5 while measured)
- kit_check All kit checks OK (459, after kit_index); contract --family roofstreets: 7 assets, 21 builds, 438 checks, 0 failed
- rooftop_golden classic EQUAL (before the final merge, re-run noted in the status file); swap of 7 ids changes only the 210 pieces of those types
- rooftop_test 38 passed / 2 failed (baseline names, same detail); companion: baseline "player reaches finale"
- check_syntax 173 OK, verify All checks passed, labs_check OK, git diff --check clean
- draw calls, classic vs modular (renderer.info, hour 0.1, default camera): s=24 223 vs 222; s=110 132 vs 131; s=160 215 vs 214; triangles 185041/177684, 144321/145829, 201214/183674 (measured before the leaf-card trellis; the card version adds about 22 tris per step)
- ?qa=1&auto=1 advanceForReview(450), 7 ids swapped: see status file (baseline s=1232.17; an earlier `?auto=1` real-time run with the same ids stopped at s=1232.1749)

## L6 compare
42 pairs in docs/fable/status/r2-roofs-streets/<type>-<near|mid>-<day|dusk|night>-<classic|modular>.jpg (hours 0.5, 0.75, 0.98;
960x600, <= 90 KB each, no pair byte-identical (cmp)). Camera is overridden to frame each type; near = 0.35 m above the piece's standing height.
Judgement: AAA-1: barrel, komodaru (now the same cask and twine hoops as classic), deck, lantern post, utility pole read as the classic piece
(deck pair nearly indistinguishable). Crates: slats are slightly flatter, gaps less deep than classic (minor). Trellis: after leaf cards close
to classic; bark curls and smooth bulbous wisteria are lower fidelity. AAA-5 (day/dusk/night): shadowed night shots keep the same values as
classic since materials are the page's own; lantern post lamp uses M.lanternRed so it glows as classic.
Captures are not pixel repeatable (time loops); judged by eye.

## Open
Family filter for `?assets=modular` loading the valley kit (r1 minor) is an Integrator runtime patch. Not tried: vertex-colour kit materials after
the common.js patch (not needed).

## Fix round 1 (coordinator scope completion; supersedes the older Compare and Auto-run lines above)
State: r2-a complete (7 props). Merged origin/fable/integration f8eabc9 (no rebase).
- L6: 42 pairs, `<type>-<near|mid>-<day|dusk|night>-<classic|modular>.jpg` (hours 0.5 / 0.75 / 0.98), all <= 90 KB, none byte-identical (cmp). Looked at crate, barrel, komodaru, deck, post, utility pole, trellis. AAA-1/5: barrel, komodaru (classic has no crest, removed mine), deck, lantern post (M.lanternRed glows), pole match classic closely at all three hours; crates have shallower slat gaps (minor); trellis close, bark curls and smooth wisteria are lower fidelity.
- Trellis: leaf cards (M.leaves, 2 tris, same counts as classic at hero), 80-tri wisteria beads; s=160 page triangles classic 200990 vs modular 186926.
- ?qa=1&auto=1 advanceForReview(450) after the merge: classic s=1232.1749 finale false; 7 ids swapped s=1232.2124 finale false (same stall, 0.04 m later; baseline 1232.17). An earlier real-time ?auto=1 run with the ids swapped stalled at 1232.1749.
- Draw calls classic/modular after the merge: s=24 223/223, s=110 133/133, s=160 213/213; triangles 185041/180637, 144345/144705, 200990/186926.
- After the merge: kit_check 459 OK (kit_index run locally, index not committed), contract 438 checks 0 failed, rooftop_golden classic EQUAL, swap changes only the 210 pieces of the 7 types, rooftop_test 38/2 baseline names, check_syntax 173, verify, labs_check OK, git diff --check clean. uptime load 2.6-3.5.
- Vertex colours: not adopted (classic materials via ctx.MAT already match; piece rails (B) not needed).
