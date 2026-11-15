# r2-roofs-streets

- Worker / model:     Claude Sonnet 5.5
- Claimed:            2026-11-15
- Branch:             fable/r2-roofs-streets
- Base commit:        80ddf98 (fable/integration)
- State:              partial: 7 of 23 ids promoted; the rest deferred (see below)

## Promoted (family `roofstreets`, `src/kit/roofstreets/`)
roof-crates, roof-barrels, roof-komodaru, roof-lantern-post, roof-yuka, roof-utility-poles, roof-trellises
(the most repeated simple pieces: 54 crates, 66 barrels, 60 komodaru, 10 decks, 7 poles, 8 trellises, 5 posts).

## Deferred, with reasons
- roof-machiya, roof-kura, roof-corner-house, roof-kido, roof-komayose, roof-inuyarai, roof-roji, roof-tsuboniwa,
  roof-balconies, roof-zushi, roof-alley-pockets, roof-alley-routes, roof-kawara-roofs, roof-facades: large facade/roof
  builders (machiya.js hiraRoof/tsuma, downtown decorateHouse) that need a shared roof-and-facade module and a
  representative-row contract sample; the PR would exceed ~1500 lines. Next lane round (r2-b).
- roof-bridge, roof-river-steps, roof-street: bridge and ribbons depend on the Roof Road's M textures and rail ribbons.
- roof-ground: `M.ground` is a painted gravel texture; a flat kit plane would read worse (AAA-1). Deferred.

## Checks (uptime 1-min load 2-5 while measured)
- kit_check: All kit checks OK (459 passed) (needs `node tools/kit_index.mjs`, see handoff)
- kit_contract_test --family roofstreets: 7 assets, 21 asset x tier builds, 438 checks, 0 failed
- rooftop_golden classic: EQUAL. Swap of all 7 ids: only the 210 pieces of those types change (komodaru #8 first);
  platforms, walls, ceilings and lights unchanged.
- rooftop_test: 38 passed, 2 failed, the same two baseline names; rooftop_companion_test: baseline "player reaches finale".
- check_syntax 173 modules OK; verify All checks passed; labs_check OK.
- Draw calls / triangles (renderer.info, Metal, hour 0.1, cat=0), classic vs all 7 swapped:
  at s=24: 223 / 185041 vs 222 / 177684; s=110: 132 / 144321 vs 131 / 145829; s=160: 215 / 201214 vs 214 / 183674.
  Modular draws <= classic (R52): kit props use the page's own `ctx.MAT` (agedWood, timber, steel, lacquer, foliage,
  bamboo, twine, wisteria, enamel, dark), so they merge into the classic batches.

## Compare (L6)
`at110-*.jpg`, `at160-*.jpg` (default Roof Road camera; mouth captures are not pixel-repeatable). Only the trellis is in
frame at s=160: bamboo and lattice match the classic; leaves are chunky low-poly clumps, not alpha cards (AAA-1 so-so,
tuned smaller). Crates, barrels, komodaru, decks and poles were not framed by this camera; judged only by contract
and golden bounds. AAA-5 night/day close-ups not done. Honest gap.

## Auto-run
`?auto=1&swap=...` browser stall check NOT completed (headless run exceeded its time budget); gameplay safety rests on the golden (platforms, walls, lights identical) and rooftop_test baseline parity.

## Fix round 1 (coordinator scope completion; supersedes the older Compare and Auto-run lines above)
State:              r2-a done (7 props); r2-b deferred (see below)
- L6: 42 pairs, `<type>-<near|mid>-<day|dusk|night>-<classic|modular>.jpg` (hours 0.5 / 0.75 / 0.98), all <= 90 KB, none byte-identical (cmp). Looked at crate, barrel, komodaru, deck, post, utility pole, trellis. AAA-1/5: barrel, komodaru (classic has no crest, removed mine), deck, lantern post (M.lanternRed glows), pole match classic closely at all three hours; crates have shallower slat gaps (minor); trellis close, bark curls and smooth wisteria are lower fidelity.
- Trellis: leaf cards (M.leaves, 2 tris, same counts as classic at hero), 80-tri wisteria beads; s=160 page triangles classic 200990 vs modular 186926.
- ?qa=1&auto=1 advanceForReview(450) after the merge: classic s=1232.1749 finale false; 7 ids swapped s=1232.2124 finale false (same stall, 0.04 m later; baseline 1232.17). An earlier real-time ?auto=1 run with the ids swapped stalled at 1232.1749.
- Draw calls classic/modular after the merge: s=24 223/223, s=110 133/133, s=160 213/213; triangles 185041/180637, 144345/144705, 200990/186926.
- After the merge: kit_check 459 OK (kit_index run locally, index not committed), contract 438 checks 0 failed, rooftop_golden classic EQUAL, swap changes only the 210 pieces of the 7 types, rooftop_test 38/2 baseline names, check_syntax 173, verify, labs_check OK, git diff --check clean. uptime load 2.6-3.5.
- Vertex colours: not adopted (classic materials via ctx.MAT already match; piece rails (B) not needed).
