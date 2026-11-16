# v-lanterns re-review, fix round 1

Verdict: APPROVED. No Critical or Important issues.

## Finding: unmeasured live draws (R36)
Resolved. Stone-lantern flame prisms now use `ownerGlow(ctx)`, the shared merged MAT.lanternGlow, with `live=[]` plus the halo sprite only where a halo exists. The street-lamp halo is removed (classic had none). Remaining live draws: toro/pool halo sprites (the game's own halos in classic too), andon +1 private washi, chochin unchanged. The report gives perf_spots deltas (street 711 -> 706, shrine 469 -> 456 draws), which is well inside +6, and they are recorded in status and handoff. I did not re-run perf_spots; the numbers are the implementer's.

## Named risk: per-lantern kindle onset
Not a regression. Classic (src/countryside.js ~3575-3593): the flame prisms are MAT.lanternGlow with `emissiveIntensity = 0.15 + nightness*2.2`, one shared uniform curve. Only `lanternHalos[i].opacity` uses the per-lantern onset `((i*0.618)%1)*0.4`. Modular matches that split: flames on the valley dusk curve, and the toro halo (`ownHalo:false`, bound into lanternHalos by the game) and pool halo keep the per-lantern onset. The card note "keep the per-lantern kindle onset" is therefore satisfied. The handoff wording ("lamp-onset is now the valley's dusk curve, as classic") is accurate.

## Minors (all addressed)
nightnessAt comment now names sky.sunDir; kit_test handoff note updated; verify line filled; draw table added.

## Nits (optional)
- build.js keeps dead `const lit = null` and passes it to lampUpdate/freePrivate; harmless.
- `flame` on toro/pool now tints only the halo sprite; flame prism color is no longer tunable. The shots show it reads fine.
- Street lamps lose the extra halo the modular version had; matches classic, so intended.
