# h1-hero review r1

I did not read the diff file; the review rests on the 15 committed JPGs plus README, shots.json, handoff and the head of tools/hero_capture.mjs in the worktree.

### Spec Compliance
- ❌ Issues found: several shots do not deliver what they promise (04, 05, 09, 11); see Important.
- ⚠️ Cannot verify: reproducibility claims (only read, not re-run); BUILD_GUIDE §15 text H1.1-H1.5 was not at the path I tried, so I judged against the dispatch wording.

### Strengths
- All 15 hero-*.jpg exist, 57-320 KB, all under 1 MB. shots.json (docs/images/hero/shots.json) has 15 ids whose `file` fields match the 15 files exactly.
- docs/images/README.md lists every file with shot id, kind, command, and a D8 honesty split (captures vs sheet vs parts sheet vs before/after pair). The commit is given once in the section heading ("game code at 9c7f490") and not per row (Minor).
- tools/hero_capture.mjs imports `./headless.mjs` (line 62) and reuses openPage, waitForExpression, loadPlaywright and diffImages. It does not fork game_shot.
- Real frames only; the parts sheet is labelled as such.

### Ranking (best to weakest as a README hero)
1. 02 torii-dusk: strong composition and light, Michi framed under the gate.
2. 01 valley-golden-hour: the pagoda is centred, with a good sky and warm exposure. It has no cat.
3. 03 lane-rain: a good leading line, Michi and Luna present, a convincing grey mood.
4. 06 lantern-glade: mood and lanterns read well; the cyan-fringed grass is a bit noisy.
5. 12 okuribi: both cats, the fires and the moon read clearly.
6. 14a/14b before/after: a legible difference, since the classic roofs and cobbles are flatter. 14b repeats shot 02 without Michi.
7. 07 tea-house: a clean interior, but the floor has moire stripes and there is no cat.
8. 10 summit-dusk: a great sky, but the foreground is near-black.
9. 09 summit-seat: pretty, but it does not read as dawn.
10. 04 river-morning: the sun is blown out and the cat is cropped.
11. 13 parts sheet: unlabelled parts float over trees.
12. 05 moon-pool: about 70% black.
13. 08 villagers: a flat review sheet, not a hero shot.
14. 11 roof-road: the weakest.

### Issues

#### Critical
None.

#### Important
- 11 (hero-roof-road-michi-chidori.jpg): a near top-down view of flat dark roofs, with the cats tiny and the sky and skyline absent. It is the weakest shot. Re-frame by dropping the camera to roof level, behind and beside Michi at about 1.2 m. Look along the ridge toward Chidori with the Kyoto skyline and pagoda in frame. Alternatively use sandbox dusk (hour about 0.75) for a warm rim light.
- 09 (hero-summit-seat-dawn.jpg): the deep-blue noon-like sky and saturated green read as bright morning, not dawn. Move the time to about 5.6-5.9 h. If the preview's sun floor prevents that, retitle the file to "morning" and update the README and shots.json.
- 05 (hero-moon-pool-night.jpg): most of the frame is black and the foreground is an empty void. Move the camera closer and lower so the pool, cat and lantern fill the frame, then lift the exposure or use hour about 21.
- 04 (hero-river-morning-mist.jpg): Michi is cropped at the bottom edge (only head and ears show), the sun is blown out, and the pagoda is half hidden by foliage. Raise the camera or aim it up, step Michi back into frame, and lower the sun glare (hour 7.5 or a shifted yaw).
- 12 (hero-roof-road-okuribi.jpg): large white square star sprites, e.g. at (947,50) and (1193,260), look broken. Re-shoot with a slightly different framing that crops them, or check the sandbox star-point size.

#### Minor
- 13 (hero-parts-sheet-toro.jpg): the eight parts are small and unlabelled against busy trees. A closer camera with a plain sky backdrop, and the part names listed in the README caption, would make it read as a parts sheet.
- 10 (hero-summit-vista-dusk.jpg): the foreground is near-black and it repeats the 09 composition. Lift ambient light or choose a different seat angle.
- 07 (hero-tea-house-interior.jpg): the floor wood shows aliasing/moire.
- 08 (hero-villagers.jpg): it is a flat-background review sheet with tiny labels. Keep it for the villagers section only, not as a top-level hero.
- docs/images/README.md: the "six files were removed" text lists five. The handoff maps `capture-roof-road.jpg`, which the README does not list. Reconcile.
- The README table has no per-row commit column.

### Title-screen gap
- The handoff patch idea (let `capture.frame` advance on the menu under `?shot=1` in src/main.js) means touching a hot file in a lane that does not own it. It is risky, and it is not needed for the poster.
- A different real frame can serve as the poster: hero-torii-dusk.jpg or hero-valley-golden-hour.jpg, both game-page shots with menu flags off. A poster only needs a representative frame. Recommend the lane use one of these, or capture the title screen by screenshotting the live menu without `?shot=1`, via a one-off Playwright screenshot.
- Keep concept-art `title-screen.jpg` labelled in its own section (decision D8).

### Assessment
**Task quality:** Needs fixes

**Reasoning:** The tooling, shots.json, README and handoff are sound. Roughly a third of the shots are weak (11, 09, 05, 04, 12) and need re-framing before the README uses them.
