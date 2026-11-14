# Status: c3-villagers
Model: Claude Sonnet 5.5 · base fable/integration @ 55cd691
- [x] Defs luna/mochi/kuro (src/characters/defs), PERSONALITIES derived from them
- [x] grooming.js, modular NPC path (classic byte-identical)
- [x] cat_preview reads the defs (+ &def=1)
- [x] tools/villagers_check (14 checks)
- [ ] main.js wiring (handoff docs/fable/handoff/c3-villagers.md)

## Scope completion
- main.js wired in-lane (assets: this.assets x3). Boots `?assets=classic` and `&swap=luna:modular,mochi:modular,kuro:modular`: ~4.6 s, only error is the pre-existing /cad-overrides.json 404 (same on classic). Eval: all three NPCs `modular:true`.
- Grass (G-C): the grass stamps read `cat.chest/hips/legs[].paw` of each `grassContext.npcs` entry; eval on the swapped boot shows all three modular NPCs have chest, hips, 4 legs, are in the scene and in `grassContext.npcs`. (No stamp-count capture.)
- L6: classic-/modular-{6,12,18,22}.jpg. The camera landed on Michi (villagers wander), so Luna is not framed in 18; the 22 h modular shot shows Luna's dusk glint through the fence. AAA judgement, honest: AAA-1/AAA-5 parity with classic by day (the shots are pixel-near identical); the one visible gain is dusk eye shine. Not a visual upgrade otherwise.
- Lab 19 promotions: eye shine (lab `shine` specimen) promoted as `behaviour/eyeshine.js`, wired per-def (`personality.shine`). Grooming loop promoted earlier as `grooming.js` (bouts). Coat chooser (mackerel/classic/spotted/ticked): not promoted for any id — it needs a coat-pattern texture param in `parts/coat.js` (c1 contract file), so Luna/Mochi/Kuro keep their current stripe amount. Luna, Mochi, Kuro lab specimens are 'original: true' baselines (the real Cat), so beyond shine and grooming the lab offers nothing beyond classic for them. Lab 'groom' specimen is the game's existing groom pose (no new pose to promote); 'yawn'/'sleep' likewise.
- Camera-as-light: in game the retroreflecting light is the camera, not a lantern (no lantern-position plumbing).
