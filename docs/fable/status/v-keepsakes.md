# v-keepsakes status
Model: Claude Sonnet 5.5. Base: fable/integration (merged, incl. lanterns/fences). Family: src/kit/keepsakes, lab 17.

- [x] L1 status file
- [x] L2-L3 family `keepsakes`: yarn, key, dango, jade-paw, secret-fish, interior-fish (hero/mid/far, params, parts below)
- [x] L4 gap specimens: dango, jade-paw, secret-fish, interior-fish added to lab 17 (`labs/keepsakes/js/treats.js`, `shapes.js`; wired in main.js, recipes.js untouched so coverage links hold)
- [x] L5 `node tools/kit_index.mjs` (src/kit/index.js regenerated)
- [x] L6 compare JPGs: 6 ids x (6/12/18/22 h near + 12 h far) x classic/modular = 60 in `docs/fable/status/v-keepsakes/`, all pairs differ (cmp)
- [x] L7 checks (below)
- [x] L9 handoff `docs/fable/handoff/v-keepsakes.md`
- [x] L10 push + PR

## Parts
yarn: core (game's MAT.yarn, the pulse target), thread. key: key (game's MAT.goldAntique), glint (live sprite). dango: balls (live, own gold), trim, glow (live). jade-paw: paw (live, own jade), ring (goldAntique). secret-fish: fish. interior-fish: platter, fish (bound `fishMesh`), garnish.
Names kept via layout.name (root group): 'Yarn Ball NN', 'Secret Key', 'River-Spirit Charm', 'Jade Paw Reward', 'Grilled Fish Treat', 'Grilled Sea Bream'. The root group is the collectible / secretKeyMesh / fishMesh / corralRewardMesh exactly as before (userData id, isCharm, isCorralReward, isSecretKey, velocity, batted copied by the footprint; jade stays visible=false). The collectible loop's `item.material` pulse still works: `group.material` is the core / gold / jade material.

## Checks
- kit_check: All kit checks OK (64 passed)
- kit_contract_test --family keepsakes: 6 assets, 18 asset x tier builds, 504 checks, 0 failed (after fixing dispose of a fallback material, glint/glow param effect, far materials <= 2)
- footprint_golden classic: EQUAL
- footprint_golden valley, `?swap=yarn,key,dango,jade-paw,secret-fish:modular` (the brief's `assets=modular` also turns every other family on, so ids were swapped alone): colliders, houseColliders, platforms, waterRects, exclusions, anchors (secretKeyPos etc.), rng (valley 49233) all EQUAL; objects differ only by the replaced meshes -> asset parts; every root name and position identical (e.g. Secret Key at -23.5,0.55,-21.5; River-Spirit Charm -1,0.28,30.5; Jade Paw Reward -31,0.42,9 hidden:1; Yarn Ball 00 -20,0.35,14)
- footprint_golden --systems, `?swap=interior-fish:modular`: rng, hidden, vegetation, particles, ambient EQUAL; interior differs only by the fish (see waiver)
- check_syntax: All 70 modules OK; verify: All checks passed; labs_check: All labs checks OK; `git diff --check fable/integration...HEAD`: clean
- Draw/triangle delta at the yarn framing (`render`): classic 123 calls / 4,952,532 tris / 302 geometries; all five valley ids modular 123 calls / 4,963,272 tris / 313 geometries (+10.7k tris, +0 draws)

## Waivers
- interior-fish: the room binds `fishMesh` to the `fish` part (a child group) instead of the root, so in the systems digest the bound key reads `.../Grilled Sea Bream/asset:interior-fish/fish`; root name kept. The fish group is at the classic world position (0.3, y+0.56); the platter is now a lathe with rim, garnish added. The digest shows the root group at y 0.49 (classic: the fish group itself at 0.56). Gameplay (visible=false on eat, anchor eatFishAnchor) is unchanged.
- key: the classic halo ring is replaced by a soft glint sprite (lab "A soft glint"); the key's local origin and extent are unchanged.
New merged materials: 0 (thread/fish use km.bag, shared). Live meshes: key glint 1, dango balls + glow 2, jade paw 1. Dango, jade and the key's sprite are not merged by design (collectibles are protected roots).

## Judgement
- yarn AAA-1: wound bands read as thread, not a plastic sphere; AAA-5: pink core + pink thread still pops from the grass at 0.35 m, 2.5 m, and 22 h.
- key AAA-1: ward bit, inner ring and collar make it a key; glint sparkle visible only in motion. AAA-5: bright gold against shade at all hours.
- dango AAA-1: reads instantly as dango (under the bridge); AAA-5: gold on dark water with a warm glow at all hours.
- jade-paw AAA-1: the paw medallion is unmistakable. Note: in a normal start Larry covers it (it is hidden until the challenge), shots hid the turtle only for framing. AAA-5 fine.
- fish: bream in the tea house is legible with garnish; the secret-house fish is dark because the room is (same as classic).
