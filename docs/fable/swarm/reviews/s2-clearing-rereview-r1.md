# s2-clearing re-review r1
1. Ensō glow: FIXED. Now lit MeshStandardMaterial, near-black ink, polygonOffset. Night 22 pair: no glow, reads as dark ink.
2. lanternY: FIXED. clearing.js edit is layout-only (+3 lines): same arithmetic as classic (terrainHeightAt(side*3.15, LANDING_Z1+5.5*LOWER_STEP_RUN) - 0.05), no this.rng() draw, classic mesh code untouched; kit uses it with fallback. Parity tool EQUAL (rng identical), summit_test 83/0.
3. Stone: FIXED, minor residual. Darker warmRock palette, size 0.85. Day 12 close-up: modular is still slightly lighter/yellower-green than classic but no longer bleached; silhouette comparable. Night 22 matches. Not blocking.
4. Parity tool: DONE (tools/summit_kit_parity.{html,js,mjs}). Nit: its lanternY compares terrain arithmetic, not the built toro's world y (the collected `lanterns` array is unused). Non-blocking.
Verdict: APPROVED.
