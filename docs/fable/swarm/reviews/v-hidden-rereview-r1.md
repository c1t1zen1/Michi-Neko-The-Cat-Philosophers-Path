# v-hidden re-review, fix round 1

1. calmAt mist: FIXED. calmAt = max(wet, mist). main.js assetEnv adds env.mist = sky.weatherAmount('mist') (weatherAmount exists, sky.js:511); runtime.js initial env gets mist:0. assetEnv feeds only the kit, so classic is neutral.
2. pool-toro reuse: FIXED. pool.js finds the lanterns family 'pool-toro' def and calls toroDef.build(ctx, L.toro, defaultParams(...)). L.toro carries index:0, x, z, footprint; lampUpdate uses layout.index only, so the ctx/layout is valid. compose places it at x,z, and its update(dt,t,env) still drives the halo. Classic does not rotate by angle, so no ry is correct.
3. Lotus standing leaf: PARTIAL, minor. Lowered, cupped, tilted, lighter. In moon-pool-12 (noon) and -22 (night) cat-modular it is a pale, flat-looking disc on a thin visible stalk, so it still reads a bit like a saucer on a pole, though much less dominant than before. Acceptable; not blocking. A lower, larger, ruffled or notched leaf with a shorter stem would settle it.
4. budgets.js exceptions: committed (moon-pool, lantern-glade, glade-lanterns), each with a why.

Glade lantern sway: classic does sway them (hidden_places.js:861 bobs lamp.position.y by 0.03 m, plus flicker at 857). Modular dropping the bob is a real, tiny (3 cm) classic divergence. Flicker is presumably kept via lampUpdate. Not blocking; log as known.

No new issues in the diff.

VERDICT: APPROVED (finding 3 partial, nit only; glade bob dropped, nit).
