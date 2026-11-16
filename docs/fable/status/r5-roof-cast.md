# Status: r5-roof-cast

- Model: Claude Sonnet 5.5
- Base: a408a08 (fable/integration)
- Started: 2026-11-15
- Lane: Roof Road cast. Promoted: roof-shoki, roof-treats, roof-villagers (family roofcast), roof-chidori (CharacterDef). Deferred: roof-boatman, roof-hayashi (their hosts, the takasebune and the hoko, have no kit piece yet).

## Steps
- [x] Family src/kit/roofcast (shoki, treats, villagers, tiers hero/mid/far)
- [x] Chidori CharacterDef (src/characters/defs/chidori.js)
- [x] Checks, compare pairs (docs/fable/status/r5-roof-cast/), handoff, report

## Checks (Metal, load about 3.5; see the report for the output)
kit_check OK (459), kit_contract_test --family roofcast 197 checks 0 failed, check_syntax 175 modules OK, verify OK,
labs_check OK, cat_golden EQUAL, rooftop_golden classic EQUAL, rooftop_test 38/2 (the baseline two), auto stall s=1232.17 on
classic and swapped (all four ids), git diff --check clean.

## L6 judgement
Shoki: AAA-1 clearly better (scowl, sleeves, sash, hat, sword; classic is a cone and a ball); AAA-5 neutral (flat clay, one lit swap).
Treats: not resolvable in the page camera (the dishes sit behind ridges); judged on the close-up probe: better (rim, tail, eye).
Villagers: AAA-1 equal to classic by design (a tiered port, 3 tiers, about a third of the meshes); AAA-5 equal.
Chidori: equal plus dusk eye glint; the page only shows it with the game.js patch (handoff section 2).
Captures are not pixel repeatable (time loops); judged by eye.
