# v-interiors-a re-review r1: PASS
1. Andon/shoji freeze: fixed. main.js runs interior.assets.update(dt, elapsed, assetEnv()) while inside; InteriorManager.setLightsActive forwards to assetInstances; tea.js feeds the lamps a fixed night ROOM_ENV (hour 22, lanternOn). Classic andon uses interior MAT.lanternPaper, a static emissive 0.85 (not hour-driven), so always lit: modular matches.
2. tea.js no longer touches window.game; only setLightsActive, with warn-once (at frame 600 if never called). Fixed.
3. Minors fixed (cup moved, km.bag dropped for roomMats bag, dead code, mergeGeometries, fish tail).
Risk (a): classic boot ran clean: ok true, errors [], warnings [] (only the ignored cad-overrides 404). The main.js edit is a no-op for classic (no kit instances; assets.update on classic runtime) and interior.js loop is guarded by inst.setLightsActive.
Risk (c): the family adds 2 merged materials (shoji paper, scroll paper) vs R26's 1, unasked; Integrator to reconcile. budgets.js tea-interior exception (buildMs 9/6) is in place with a why.
Nit: the Knick-knack layout x/z overrides are now ignored (uses KNICK only).
