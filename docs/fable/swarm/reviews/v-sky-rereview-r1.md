# v-sky re-review, fix round 1

Verdict: all findings resolved. No blockers.

1. Duplication (R56): resolved. labs/sky/js/night.js now imports `loadKitSkyNightModule` from ../../shared/game.js and builds with the kit's buildStars/buildMoon. The game.js edit is one additive line, tagged ?v=20261113a, in the right place. The lab copy is gone.
2. Stars through cloud: resolved. Kit stars link to the deck (`linkClouds`, called from Sky only when a kit deck exists). The vertex shader reads the same field/cover/drift and multiplies alpha by 1 - cover*deckAlpha*1.3. Re-shot stars-22-modular: cloud bodies are star-free, stars stay in the gaps, a few at thin edges. Note: the vertex shader samples with kitCloudAt (no explicit lod), but vertex-stage texture sampling is always lod 0, so this is correct.
3. R52 at night: resolved. The moon is one quad shader (disc + glow + 22 deg ring, premultiplied; quad grows only while the ring shows). Reported night draws: shrine equal to classic in clear, cloudy and misty weather; lower at the other three spots. moon-22-mist-modular shows the ring, a crescent and a soft glow; the classic mist shot has a harsher dark-disc glow, and the modular one is visually fine and arguably better. Ring and glow are equivalent in intent (same radii as before: 22 deg ring at 82.8 m / 205 m).
4. Minors: post-pass reads now use texture2DLodEXT (mip 0) in branches and the loop; shade floor 0.4 -> 0.15; deck height smoothed with a teleport snap (deckY); genus mix and field.raw no longer allocate.

Classic path: unchanged. The fix diff touches src/sky.js and src/postfx.js only in kit branches (moonCover field on the kit env, a linkClouds call guarded by this.kit.clouds, a kit-shader dispose when `hook` is null, and envPaused replacing the private flag). No uniform writes or allocations were added on classic. The report cites classic game_shot maxDelta 0 at hours 6/12/18/22.

Minor, non-blocking:
- postfx change `sky._interiorShadow` -> `sky.envPaused` is a behaviour switch outside the fix list; the report says envPaused is the public equivalent set by main.js. Confirm they are the same flag at integration (the classic golden passing suggests yes).
- Shade floor 0.15 is a screen-space heuristic; the comment says so honestly.
- setTier re-tiering and art-direction notes remain open, as the report states.
