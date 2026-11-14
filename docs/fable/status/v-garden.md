# v-garden status
Model: Claude Sonnet 5.5. Base: fable/integration (4273c90 + kit_test fixes). Lane: garden (lab 14).
- [x] L1-L10 done. Assets promoted: `shishi`, `wind-chime`. Offering bells deferred (v-shrine, Integrator ruling). No gap ids.

## Checks (real output)
- kit_contract_test --family garden: `2 assets, 6 asset×tier builds, 184 checks, 0 failed` / PASS
- kit_check: All kit checks OK (36 passed); kit_index --check: in sync (1 families)
- footprint_golden classic: EQUAL. Modular swap: DIFFERENT only by new asset:* objects, and anchors.handles.shishiRocker moved 0.18 m (waiver below); colliders/platforms/exclusions/anchors counts unchanged.
- check_syntax 64 modules OK; verify All checks passed; labs_check OK; `git diff --check fable/integration...HEAD` clean.

## Waivers / notes
- Rocker pivot raised from y 0.48 to 0.66 (pivot x unchanged) so the dipping mouth clears the hollow basin; the game's context-action range (distance < sqrt 3.2) is unaffected. Footprint is empty in classic and kit.
- Live draws: shishi hero/mid 3 (tube, feed stream, pour stream), far 1 (tube); chime hero/mid 4 (cord, bell, clapper, tanzaku), far 3. Static parts merge by km/MAT material (no InstancedMesh, R36). Over KIT_LIMITS.liveMeshes (hero 2) by 1-2 for the two interactive props; no exemption added.
- Clack: kit calls optional `instance.onClack()` / `layout.onClack()` when the tilt returns to rest. Classic has no audio call on clack (grep), so nothing is wired; `src/audio.js` not imported.
- Standalone (no game driver) the shishi self-drives the same 0.4 rad/s cycle; once the game writes rocker.rotation.z the kit follows it (the pour tracks the moving mouth).

## L6 compare
32 JPGs in `docs/fable/status/v-garden/` (`shishi|wind-chime` × near|far × hour 6,12,18,22 × classic|modular); none byte-identical, all under 150 KB, 960x600. The shishi framing fills a good part of the frame. The chime hangs under a dark eave so it stays small and low-contrast at hour 22 and 6.
AAA-1: shishi clearly better (hollow stone bowl, diagonal-cut culm, feeder, anvil). Chime: glass bell + paper strip read better than the metal dome but the tanzaku is a plain pale slab. AAA-5: both animate from live state (pour follows mouth; strip/clapper spring driven by env.wind).
Concern: cat-height (0.35 m) near shot for shishi was blocked by meadow grass, so near cam is 0.6 m.
