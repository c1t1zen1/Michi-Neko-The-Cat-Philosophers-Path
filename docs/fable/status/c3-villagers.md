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
- Lab 19 promotions: eye shine: superseded in fix round 1 by R27 (see below). Grooming loop promoted earlier as `grooming.js` (bouts). Coat chooser (mackerel/classic/spotted/ticked): not promoted for any id — it needs a coat-pattern texture param in `parts/coat.js` (c1 contract file), so Luna/Mochi/Kuro keep their current stripe amount. Luna, Mochi, Kuro lab specimens are 'original: true' baselines (the real Cat), so beyond shine and grooming the lab offers nothing beyond classic for them. Lab 'groom' specimen is the game's existing groom pose (no new pose to promote); 'yawn'/'sleep' likewise.
- Camera-as-light: in game the retroreflecting light is the camera, not a lantern (no lantern-position plumbing).

## Review fix round 1
- Merged fable/integration (c39a982), tags 20261113a, coverage regenerated.
- R27: my sprite eye shine deleted. Villager defs carry c2's `eye-shine` head part (colour from personality.shine); NPC calls `cat.setEyeShine(duskEyeShine(hour))` only when the part is present (modular, within 60 m). ONE curve: src/characters/behaviour/dusk.js `duskEyeShine` (17.3-19.5 / 4.8-6.8), also used by the main.js player driver (one-line grant).
- R22: c2's part is hidden on mid/far tiers (hero only), so far NPCs draw no discs; NPCs beyond 60 m also skip the call and grooming.
- c2's part verified: depthWrite false, depthTest on (occluded by walls/foliage); one-sided CircleGeometry on the eye surface. Facing verified by render at hour 22 (dusk-front.jpg: glint visible from in front; dusk-behind.jpg: nothing from behind). Not inverted. No fix needed in c2's file.
- Tests added: night > 0.3, day 0, none on classic; canonical curve points; far NPC does nothing; grooming never while asleep or on a schedule override (grooming also now requires effHome === home). The 'behind < 0.1' case is geometric (one-sided disc), so it is proven by the render pair, not a number.
- Lab 19 record: promoted = eye shine (via c2's part, R27), groom (grooming.js bouts); not promoted = coat chooser (needs c1 coat contract), yawn/sleep/groom pose specimens (game's existing poses), Luna/Mochi/Kuro specimens (baselines). Boots + grass-stamp evidence and L6 shots: see Scope completion above.
