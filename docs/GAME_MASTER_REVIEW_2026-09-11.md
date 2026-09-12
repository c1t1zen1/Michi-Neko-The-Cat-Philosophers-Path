# Michi-Neko · 道猫 — Master Game Review & Recommendations

**Date:** 2026-09-11
**Merged from:** `GAME_REVIEW_2026-09-11_014800.md` + `RECOMMENDATIONS_2026-09-11_023812.md` (both now archived in `OLD/`)
**Scope:** Performance review status (what's done vs. missing), review blind spots, production reliability, and a full gameplay/experience review — additions & removals to make the game amazing, fun, enjoyable, relaxing and exploratory.
**Goal for the next LLM/engineer:** Read this, then implement the improvements below in the proposed build order. Every finding is grounded in the actual source with file/line references so work can start without re-discovering the codebase.
**Historical context:** `OLD/PERFORMANCE_REVIEW_2026-09-09_023812.md` — that doc's plan is mostly *already implemented*; this master doc tells you exactly what remains, plus everything it never covered.

---

## TL;DR / Overall verdict

- The **rendering performance plan from `PERFORMANCE_REVIEW_2026-09-09_023812.md` is ~90% implemented** (confirmed in code + git: `28beb92 Perf: mobile-first render pipeline overhaul + static geometry merges`, `d6a7e05 Fix white screen when switching to HIGH`, `72e71ea cadJS…`). Technically, the game is in much better shape than that review suggests.
- **Still unimplemented from that review:** (1) foliage-shader low-tier octave reduction, (2) per-frame `new THREE.Color` allocations (plus the larger palette path), (3) god-ray / dapple-pool tier levers, (4) the adaptive-resolution stage 1→2 escalation bug (critical), (5) particle simulation budgets, (6) indoor shadow suspension, (7) title-screen performance mode, (8) startup calibration probe. **Uncovered blind spots:** CPU-side gameplay cost, Web Audio node cost/cleanup, memory/context-loss, battery/thermal frame-floor governor, startup budget, and zero measured baselines.
- The **gameplay loop is much thinner than the rendering.** It's a beautiful 30–60 min stroll with 1 real quest, 3 NPCs, and ~14 collectibles. Once the quests are done there is nothing to discover. The big wins for "amazing / fun / enjoyable / relaxing / exploratory" are **discovery payoff systems**, **softening the guiding UI**, **more NPC/quest/weather hooks**, and **identity rewards** — all consistent with the existing pillars (no fail states, mobile-first, Ghibli whimsy).
- The bigger opportunity now is not another broad optimization rewrite. It is:
  1. Fixing a few remaining performance-control bugs and omissions.
  2. Making saving and browser recovery production-safe.
  3. Deepening the existing Kyoto valley before expanding into a much larger Tokyo campaign.
  4. Giving players more enjoyable **cat-like ways to inhabit the world**, not just objectives to complete.
  5. Reducing HUD/progression pressure so exploration and stillness remain the heart of the experience.

---

## Part 1 — Performance

### 1.1 Completed (verified) — keep as-is

| Review item | Status | Where it landed |
|---|---|---|
| MSAA tier-driven (0/0/4) + `antialias:false` | Complete | `main.js:49`, `applyQuality` `main.js:415-444` (rebuilds ping-pong RTs to avoid context loss) |
| Bloom at half res | Complete | `main.js:83-86`, `onResize` `main.js:759-768` |
| Merged OutputPass + Grade (one pass) | Complete | `main.js:90-91` `GradeOutputShader` |
| PMREM re-bake 3.5s → 25s + delta-gate + skip inside tea house | Complete | `sky.js:31-33`, `sky.js:576-585` (`envInterval=25`, `envDrifted`, `envPaused`) |
| Shadow size cap (1024/2048/4096-discrete-only) + cadence (1/2) | Complete | `main.js:448-460` |
| Small-prop castShadow gating | Complete | `applySmallPropShadows` `main.js:494-509` |
| Interior no longer simulates the whole valley | Mostly complete | `main.js:823-829`, `main.js:840-844` (city/vegetation/particles/ambient gated by `isInside`; `sky.setInteriorShadowMode`) |
| Bamboo sway moved to vertex shader | Complete | `vegetation.js:69-70` ("Shader-driven bamboo"), custom depth mats `vegetation.js:389-476` |
| Static geometry merges per material | Substantially complete | `countryside.js:197/_mergeStatics`, `interior.js:59`, `vegetation.js:173`, `foliage.js:630` |
| Per-frame Color hoisting (postfx + countryside) | Complete (partial — see 1.2.2) | `postfx.js:414-418` (AERIAL_TINT/HAZE_TINT hoisted), `countryside.js:17-19` (HAZE_NIGHT/HAZE_DAY/_hazeTint) |
| Quality levers (density, particles, lanterns, shafts, AO, fringe) | Complete | `applyQuality` `main.js:466-487` (`vegetation.setDensity`, `particles.setBudget`, `lanternLightCount`) |
| Two-stage adaptive resolution | Present but stage 2 unreachable — see 1.2.1 | `main.js:338-387` (`perfStage` 0→1 sheds shafts/bloom, 1→2 scales pixel ratio) |
| GPU-string auto-tier probe | Complete | `settings.js:54-72` `isDiscreteGPU` |
| `backdrop-filter` gated to desktop | Complete | `index.html:256-260` (`@media (hover:hover) and (pointer:fine)`) |
| Lantern-light caching | Complete | `countryside.js:2995-3034` (`_lightPickPos` distance-gated re-sort) |
| Reduced-motion CSS for interface animation | Partially complete | — |

The main implementation is visible in: `src/main.js`, `src/postfx.js`, `src/sky.js`, `src/vegetation.js`, `src/interior.js`, `src/settings.js`.

### 1.2 Still missing — implement next (ordered by severity)

**1. Critical: the adaptive-resolution second stage cannot currently activate.** `perfStage` starts at `0`. On low frame rate: stage `0` becomes stage `1`; shafts are disabled; bloom drops to quarter resolution; the function returns. On subsequent low-frame-rate checks, stage `1` never becomes stage `2` — the code later says `if (this.perfStage < 2) return;`, but nothing promotes `perfStage` from `1` to `2`. **Dynamic pixel-ratio reduction is effectively unreachable**; the system performs only its post-processing reduction and then stops, even if the game remains below 45 FPS. This is the most important remaining technical issue because the code presents itself as a two-stage adaptive system, but currently only one stage functions.
**Recommended correction:** use sustained-low-performance timing — first bad window: stage 0 → 1; if FPS remains below target for another 4–6 seconds: stage 1 → 2; at stage 2, lower pixel ratio gradually; require 10–20 seconds of stable performance before restoring quality; add hysteresis so the game does not oscillate every few seconds.

**2. High: per-frame color allocations remain significant.**
- Two left from the original review: `sky.js:550` (`this.sun.color.lerp(new THREE.Color(0xff6e30), …)` every frame) and `scent.js:109` (`new THREE.Color(0xffd080).lerp(new THREE.Color(0xff7040), t)` every frame per live particle). Hoist to module constants (pattern already used at `countryside.js:17-19`).
- Larger palette path: `lerpPalette()` and `resolvePalette()` build new objects and create new `THREE.Color` instances repeatedly. `resolvePalette()` is called during the sky update, then called again in the main loop for the cat's rim light.

**Recommended correction:** keep two reusable palette objects; store reusable `THREE.Color` values for each palette field; write interpolation results into those objects; expose the already-resolved current palette from `Sky`; have the cat rim light read `sky.currentPalette` rather than calling `resolvePalette()` again. This should make the normal frame loop effectively allocation-free for sky colors. Also inspect: `updatePhotoCamera()` in `src/main.js` (creates vectors each photo-mode frame), `findAction()` in `src/context_actions.js` (creates several vectors during proximity checks), and any `clone()` usage in player collision and terrain-normal code.

**3. High: particle rendering budgets do not reduce particle simulation budgets.** `setBudget()` changes `geometry.setDrawRange()`, which reduces GPU rasterization. However, the update loops still process the original full counts. Rain alone updates 1,100 streaks, including two position writes per streak.
**Recommended correction:** store an `activeCount` for each particle system and only update that active prefix — Low: 40–50%, Medium: 70–75%, High: 100%. Also missing from the current budget: the separate god-ray card count, potentially splash counts, landing dust activation counts, and any ambient-life populations that remain fixed by tier.

**4. Medium/high: foliage shader LOD is still missing.** `foliage.js:171-197` still runs the full ~6 `folNoise` bump + 3 mottle + crevice per fragment on **every** canopy/bush/forest pixel regardless of tier. `applyQuality` never touches `uBump`/`uMottle`. The foliage system remains visually impressive but expensive; the review's low-tier shader simplification does not appear to have been implemented.
**Recommended approach — do not make every tree ugly on Low.** Divide foliage into visual categories:
1. **Hero foliage near the player** — keep the current shader, preserve leaf cards and translucency.
2. **Mid-distance trees** — fewer noise octaves, less bump/mottling, fewer alpha-cut cards.
3. **Outer forest and foothill masses** — Lambert or simplified Standard material, no expensive bump noise, no card shadows on Low, potentially no card layer at all beyond a distance threshold.

Distance-based complexity preserves the visual identity much better than uniformly degrading the entire world. Alternative: add a tier uniform (e.g. `uFoliageDetail`) that on `low` drops one mottle octave (`folM` in `foliage.js:187`) and the second bump octave set (`folBump += …` in `foliage.js:179`), or swap far instanced woods (`forest`/foothill meshes in `vegetation.js`) to `MeshLambertMaterial`. Frees low-tier budget that can be spent on particles/keepsakes instead.

**5. Medium: indoor shadow suppression is only partial.** The indoor update gating is good — outdoor city, vegetation, particles, and ambient life stop updating while the cat is inside. However, the sun shadow is not truly disabled. The shadow camera is tightened, but the main render loop still executes `this.sky.sun.shadow.needsUpdate = true;` on the configured cadence, including indoors.
**Recommended correction:** while indoors, either set `sun.castShadow = false` (if the room uses its local point lights and hemisphere light only), or use a distinct indoor shadow policy and update it only when entering the interior or when an indoor movable shadow caster changes. At minimum: `if (!this.interior.isInside && ++this._shadowFrame >= this.shadowCadence) { request outdoor shadow update }`. If sunlight through the interior is visually important, update the indoor sun shadow only on transition or major time-of-day changes — not every second frame.

**6. God-ray card count + dapple-pool count tier levers — missing.** `particles.js` god rays and `vegetation.js:233-271` `buildDappledLight`/`dappleMeshes` are fixed counts; they are not scaled by `setBudget`. Add draw-range/instance-count reductions on low.

**7. Medium: title-screen rendering consumes nearly full gameplay resources.** The title screen has a beautiful cinematic orbit, but much of the living valley continues updating while the player is not playing. On phones this means: higher battery use before gameplay, more thermal load, more chance of audio/render initialization issues, and potential adaptive-quality decisions based on title-screen performance rather than gameplay.
**Recommended correction:** create a title-scene performance mode — cap title rendering at 30 FPS on touch devices; disable or reduce AO and shafts on the title screen; update particles and ambient life at half frequency; pause unnecessary gameplay/NPC logic; restore the selected tier when entering the game; allow full-quality cinematic title rendering on desktop High. The title should establish the mood without making the phone hot before the player takes a step.

**8. Medium: auto quality could use a real startup probe.** GPU-string detection is implemented, which is good, but strings are incomplete and privacy restrictions can make them generic. Add an optional startup calibration: (1) render the title scene for approximately two seconds; (2) ignore shader-compilation frames; (3) measure median and 10th-percentile frame time; (4) lower the starting tier if necessary; (5) cache the result by game version and device characteristics. Do not permanently raise a tier based only on a short probe — raising should require sustained healthy performance because thermal throttling often begins later.

**9. No WebGL context-loss recovery path.** The code does not appear to listen for `webglcontextlost` or `webglcontextrestored` (only audio visibility recovery at `main.js:232-238`). Disposal is good on tier change, but there's no leak pass and no full context-restore path.
**Recommended behavior:** on context loss — prevent the browser's default terminal failure if appropriate; pause gameplay; display a calm "The valley is resting…" recovery screen; save current progress; attempt restoration; if restoration fails, offer "Reload and Continue." This is especially valuable for iOS Safari and memory-constrained mobile browsers.

**10. Web Audio CPU + node cleanup.** `audio.js`/`music.js` spawn an oscillator+gain per pluck (`music.js:170-193`) and per pad chord (`music.js:155-168`) with no cap; `audio.js` `stopAmbient()` tears down wind/rain/birds only on `stop()`, not on weather transitions. On low-end mobile this is an unmeasured, real cost. Add a voice cap + proper graph teardown on phase/weather change.

**11. Battery / thermal / frame pacing.** `updateAdaptiveResolution` sheds FX and resolution but **never caps frame rate**. For a relaxation game add an eco floor: when sustained fps < ~30, cap `requestAnimationFrame` cadence (e.g. 30fps) before dropping further — keeps long sessions cool and smooth-feeling.

**12. WebGL2 assumption.** Code uses half-float RT + MSAA with no graceful WebGL1 fallback or feature-detect gate. Decide whether to add a soft-fail to a basic renderer.

### 1.3 Blind spots — what the old performance review never covered

The old review is 100% render pipeline. These are the unexamined costs and risks:

1. **CPU-side gameplay cost.** No look at: collider math + per-frame platform scans in `player.js` (the `getPlatformHeight`/`getNormalAt` loops), NPC wander in `npc.js`, particle CPU loops (petals/fireflies/motes in `particles.js`), `checkCollectibles` distance loops in `main.js:978`, and `updateWaypointTargets`/compass work. Measure these before/after on a mid Android + low-end iGPU.
2. **Web Audio CPU + node cleanup** — see 1.2.10.
3. **Memory / context-loss** — see 1.2.9.
4. **Battery / thermal / frame pacing** — see 1.2.11.
5. **Startup / first-paint budget.** Boot image exists (`index.html:508-511`) but there are no cold-start timings. Record a target (e.g. < 1.5s to first interactive frame on mid Android) and measure.
6. **No baselines/budgets.** The old review is "findings → plan" with zero before/after numbers. Add explicit targets (low ≥ 30fps avg, high ≥ 55, no >16ms spikes after PMREM fix) and record `renderer.info` draw-call/triangle deltas per phase.
7. **WebGL2 assumption** — see 1.2.12.

### 1.4 What the perf review should add — measurement, budgets & stability

**A. A completed/pending status table.** Each recommendation should be marked: Complete, Partially complete, Not started, Rejected, Needs measurement, or Regressed. Include the commit implementing it and the measured result. The review document should be updated with a **status column** rather than continuing to treat all twelve phases as pending work.

**B. Explicit performance budgets.** Define targets before continuing to optimize.

**Mobile Low:**
- Target: stable 30 FPS minimum; preferred 45–60 FPS on newer devices.
- 95th-percentile frame time: under 33 ms.
- No recurring hitch over 50 ms.
- Draw calls: preferably under 180.
- DPR cap: 1.0.
- No light shafts, no MSAA, 1024 shadow map, reduced CPU particle counts.

**Mobile Medium:**
- Target: stable 45 FPS or device refresh subdivision.
- 95th-percentile frame time: under 24 ms.
- Draw calls: preferably under 220.
- DPR cap: 1.25.
- No shafts on mobile, no MSAA, 2048 shadows.

**Desktop High:**
- Target: stable 60 FPS at 1080p/1440p.
- 95th-percentile frame time: under 18 ms.
- 4× MSAA only where justified.
- 4096 shadows only on capable discrete GPUs.

Refine these numbers after real measurements.

**C. Startup and loading performance.** The review focuses almost entirely on frame rendering. It should also cover: first contentful render; time until title menu is responsive; time until movement is possible; shader compilation stalls; CDN failure behavior; cache behavior; offline behavior; slow mobile network behavior. Because Three.js is loaded remotely, the game should eventually self-host or service-worker-cache its engine modules. A peaceful instant-play game should not become a white screen because a CDN request failed.

**D. Long-session stability.** Test at least: 20 minutes; one complete day/night cycle where practical; repeated interior transitions; repeated Low ↔ High quality changes; backgrounding and restoring the mobile browser; locking/unlocking the phone; multiple photo captures; repeated New Game/Continue cycles. Look for: render-target leaks; increasing geometry/material counts; audio nodes accumulating; particle arrays growing; event handlers registered repeatedly; save corruption; thermal degradation.

**E. Accessibility performance.** Reduced-motion support should be treated as both accessibility and performance: disable camera auto-follow easing if requested; reduce or disable animated grain; disable chromatic fringe; reduce title-camera movement; reduce door-wipe movement; provide a static title backdrop option; offer a stable-camera mode.

---

## Part 2 — Gameplay & experience

### 2.1 Current state (content inventory — verified)

- **World:** one Kyoto valley (~90 m) — machiya townhouses, torii shrine (`shrinePoint (0,0,-31.05)`), river with koi, bamboo grove, rice paddies, sakura trees, tea house interior (Hisomu-an at `y=100`, `interior.js:42`), rooftop bird's nest, turtle corral (Larry), shishi-odoshi clacker, lanterns, mist ring.
- **Collectibles (~14):** 10 yarn (`countryside.js:2962-2986`, ids 0-9), Antique Key, Golden Dango charm (id 90, under bridge, `countryside.js:1006-1015`), Guardian's Feather (nest), Jade Paw (id 91, corral, `countryside.js:2230-2251`).
- **NPCs (3):** Luna (quest: 3 yarn → Jump Boost), Mochi (hint), Kuro (atmosphere). All wander; only Luna has a real quest (`main.js:938-977`).
- **Interactions:** eat grilled sea bream, cozy nap (advances time 4h), drink water (10-drink achievement), bat yarn, ring shrine bell (+10 XP), paw koi (+5 XP), inspect nest, take key, unlock tea house, greet NPC, knockables in tea house (`interior.js:152-172`), fence-walking (Jade Paw unlock).
- **Systems:** 60-min day/night, weather (clear/cloudy/rain/mist/snow), generative 4-phase music (`music.js`), scent trail, photo mode (PNG download only), progression ranks (Kitten→City Legend), quest manager (single active quest), save/load (`save.js`), auto-tier quality.
- **Cat:** rich animation rig in `cat.js` (moods calm/playful/curious/alert/cautious, purr, blink, ear twitch, idle poses, meow, prowl, drinking).

### 2.2 What's thin — the gaps to close

The world has strong atmosphere and a surprising number of interactions — drinking, eating, napping, batting yarn, ringing a bell, knocking props, meowing, wading, fence walking, NPC conversations and photo mode. But the implemented structured content is still narrow:

1. **Discovery payoff:** only ~14 collectibles and 1 hidden interior; once quests are done there's nothing left to find. No vista/rest spots, no photo-spot collection, no hidden nooks.
2. **NPCs are shallow:** no friendship/gifts, no reaction to the cat's actions beyond mood, no schedules, 3 cats only.
3. **No goal variety:** no foraging, bird-watching, fishing, hide-and-seek, leaf/bell collection, mist-gated secrets.
4. **Weather doesn't change gameplay** — Kuro's "follow the red shrine gates when the mist rolls in" line is never realized.
5. **Time-of-day has no hooks** beyond nap + lighting; no sunset/sunrise moments, no night-only activities.
6. **Progression rewards are mechanical only** (sprint/jump/speed) — no cosmetics/identity.
7. **The guiding UI fights exploration** (always-on waypoint markers + edge arrow + busy HUD parchment).
8. **No gentle completion beat** — the alpha ends at the torii line ("I can see beyond this valley…").
9. **Structured content is narrow:** one primary formal quest; three principal NPC cats; a small number of progression rewards; limited persistent discovery history; no real ending yet; a rank system whose later rewards are not always concrete.

Do not immediately build a huge Tokyo expansion. First, make the existing Kyoto valley feel like somewhere players want to revisit.

### 2.3 Discovery, stillness & payoff systems

1. **Rest / meditation spots.** 4–6 hand-placed vantage points (torii top, rooftop, river deck, sakura bench, shrine). Action "sit & watch" → slow 6–10 s camera drift + music swell + small XP + a keepsake. Highest-value "relaxing" addition; turns a vista into a *moment*. Wire through `context_actions.js` `findAction()` (pattern: `inspectNest`/`cozyNap`) and `interior.js`-style transition.
2. **Stillness moments.** The game calls itself meditative, but a meditative game needs mechanics that reward not moving. At certain scenic locations, sitting quietly for 8–20 seconds could reveal: koi approaching the bank; fireflies gathering; a train crossing the distant landscape; wind chimes starting; a fox spirit briefly appearing; a bird landing near the cat; a new layer entering the music; a poem or illustrated postcard; an NPC performing a private routine; moonlight reflecting on the river; a hidden scent becoming visible. This creates exploration through observation rather than waypoint-following. Possible names: Quiet Moments / Valley Memories / Pawprints / Small Wonders / Moments of Stillness. Do not attach a countdown timer — let the event happen naturally.
3. **Photo-spot / stamp album.** Photo mode currently just downloads a PNG (`main.js:316-334`). Add a persistent **album** that stamps each discovered spot (title + icon), persisted in `save.js` — replaces bare "score" with a keepsake journal; also serves as the exploration-completion tracker.
4. **Discovery journal (not a checklist).** A lightweight journal would give exploration memory without making it stressful. Possible sections: Cats Met; Quiet Moments; Places Discovered; Foods Tasted; Weather Memories; Strange Objects; Photo Album; Valley Map Sketch; Poems or NPC sayings. Entries could appear as hand-drawn ink sketches rather than rows of completion percentages. Avoid showing "7/43 secrets" by default — completion percentages can make undiscovered wonder feel like unfinished work. If a completionist option is desired, put it behind an explicit journal setting.
5. **More ambient micro-interactions to *react* to:** the shishi-odoshi clacker is built (`countryside.js:1925-2041`) but has no bat/drink trigger — add one (knock → clacker rocks + water splash + XP). Add "watch birds" (near nest) and "bat wind chime" actions. Cheap, very charming.
6. **Mist-gated secret.** Kuro says *"follow the red shrine gates when the mist rolls in"* — mist currently changes nothing. Add a mist-only-hidden path/altar behind the torii reachable only when `sky.weather === 'mist'`; grants a charm. Turns weather into *discovery*.

### 2.4 Cat verbs — more ways to be a cat

Give the player small, expressive actions with no XP requirement:

- Sit anywhere
- Curl up
- Groom
- Purr
- Scratch designated posts or trees
- Stretch after waking
- Slow blink at NPCs
- Rub against friendly NPCs
- Paw at water
- Watch koi
- Chase drifting leaves
- Hide in boxes or baskets
- Perch on ledges
- Knead cushions
- Bring a found object to an NPC
- Respond to distant sounds by turning the cat's ears/head

These do not all need dedicated buttons. Use the existing ACT button contextually.

**Design rule:** every visually inviting surface should either be traversable, perchable, interactive, or clearly decorative.

### 2.5 Time & weather hooks

7. **Sunset/night moments.** A "watch the sunset" rest action auto-available near dusk (golden-hour band in `sky.js` palette), and night-only firefly gathering (fireflies already exist in `particles.js`). Gives a reason to nap-to-change-time beyond XP.
8. **Weather-reactive NPC lines** (rain/mist comments) + rain-puddle splashes where the cat splashes through. Makes the valley feel alive.
9. **Weather as gameplay, not only visual variation.** The weather system is already one of the game's strongest technical features. Give each weather state unique discoveries:
   - **Rain:** shelter interactions, puddles to paw at, frogs appearing, cats gathering beneath awnings, louder indoor ambience, wet pawprints, rain-specific reflective photo opportunities.
   - **Mist:** spirit encounters, distant bells, hidden torii visibility, stronger scent trails, Kuro's special dialogue.
   - **Snow:** pawprints, snow pouncing, warm tea-house sequences, birds visiting feeding areas, snow collecting on static surfaces where affordable.
   - **Clear night:** moonlit perches, firefly gatherings, constellation-like cat stories, sleeping NPCs in unexpected locations.

   This reuses the existing world and multiplies its effective content.

### 2.6 NPCs — make them feel alive outside dialogue

10. **Friendship-lite via gifts.** Drop a yarn/fish near Luna/Mochi/Kuro → they purr, keep it, give tiny XP + one unique line. Warmth with no new systems; extend `npc.js`.
11. **Recognizable routines.** NPCs currently wander, but the valley will become much more memorable if each NPC has recognizable routines. Examples:
    - Luna watches the moon from a particular roof at night.
    - Mochi plays with fallen bamboo leaves in wind.
    - Kuro visits the river only during mist.
    - One cat shelters beneath an eave during rain.
    - Two cats occasionally meet and sit together.
    - A shy cat runs away at first but tolerates the player after repeated slow blinks.
    - A kitten follows the player briefly after being helped.
    - NPCs remember completed quests and change where they spend time.

    The player should sometimes discover a scene that exists without waiting for them.

### 2.7 Quests

12. **Bokuchi + Offering Bell quest (second real quest).** The design docs (`FUTURE_QUESTS.md`, `NPC_TASKS_AND_ENDGAME_GUIDE.md`) already spec Bokuchi (forest spirit, 5 Offering Bells) and an Inari shrine (50 torii, hidden altar). Implement just Bokuchi + the bell hunt: a second "wander and find hidden things" quest with a soft reward. Reuse the quest manager (`quest.js`) with a second type.
13. **Quest system upgrades (without turning it into a task list).** `QuestManager` is currently intentionally simple — it supports one active collect quest. The future design document correctly identifies the need for multi-step quests and persistent flags. Add next: stable quest IDs; multi-step quest definitions; prerequisites; persistent world flags; optional objectives; completed quest history; NPC relationship state; quest-item inventory; more than one discoverable quest, but preferably only one pinned objective; a journal entry rather than constant HUD pressure.
14. **Keep quests short and sensory.** Good quests for this game: return a dropped bell by following its sound; find a warm sleeping place for an elderly cat before rain; bring a leaf, feather and flower to a child making a tiny festival crown; sit with a nervous cat during thunder; guide ducklings across a path without urgency or failure; find where the wind chimes sound clearest; carry a ribbon through the bamboo without letting it touch water; discover which rooftop receives the first morning sunlight. Avoid too many conventional "collect ten objects" quests — one yarn hunt is charming; an entire game of collection counters would weaken the mood.

### 2.8 XP, progression & identity

15. **Cosmetic rewards.** Ranks currently only unlock mechanics (`progression.js:38-45`). Add small identity unlocks tied to quests: ribbon colors, a second collar bell, fur-pattern variations — matches README's planned customization. Extend `cat.js` palette + `save.js`.
16. **Reconsider the XP and movement-unlock system.** Sprinting is initially locked, and later ranks unlock movement improvements. There is also conceptual overlap between Luna's jump reward and rank-based jump progression.
    **Problems:** basic sprint being locked can make early exploration feel artificially slow; Luna's named "Leap" reward is less special if jump boost is also an automatic rank effect; "Master cat mode!" currently does not appear to apply a corresponding rank-4 effect; XP risks making players optimize actions instead of wandering; repeated XP from bells or interactions should be checked for farming/exploitation.
    **Recommended direction:** make the comfortable base movement kit available immediately — walk, jog/sprint, normal jump, prowl, meow. Reserve progression for expressive or route-opening abilities: Luna's Leap; fence balance; wall scramble; quiet landing; scent attunement; longer perch jump; friendly animal trust; weather-related perception. Alternatively, make progression cosmetic and emotional: new collar charms; pawprint effects; photo frames; tea-house decorations; music variations; NPC nicknames; new idle animations. For this kind of game, discovery should feel like the reward. XP should be secondary feedback, not the reason to interact.

### 2.9 Completion beat / Kyoto ending

17. **Gentle completion beat.** A one-time "watch the festival/sunset from the torii" cinematic after City Legend gives relaxation a payoff without an ending.
18. **Add a small local ending before the large future ending.** The current alpha has no traditional conclusion. That is acceptable for a sandbox, but even peaceful exploration benefits from a sense of emotional arrival. You do not need a boss, credits sequence or hard stop.
    **Suggested Kyoto ending:** after helping the local cats and finding several Quiet Moments — (1) Luna invites everyone to the tea house at sunset; (2) each helped NPC arrives naturally; (3) the player places one found keepsake in the room; (4) the music gains a fuller arrangement; (5) everyone watches lanterns drift or fireflies gather outside; (6) a short handwritten message appears: *"Every path becomes a home when someone remembers your pawprints."*; (7) free exploration resumes; (8) new weather scenes and NPC dialogue unlock. That gives completion without suggesting the player should stop exploring.

### 2.10 Remove / soften — things fighting the "relaxing, exploratory" vibe

19. **Aggressive objective markers (strongest remove).** The waypoint system (`waypoints.js` + `main.js:627-651`) constantly pushes key/door/nest/corral/yarn with edge arrows. For a *wander* game this undercuts discovery. **Recommend:** default to *discovery-based* compass icons (POI appears only after you've been near it), and keep the golden edge arrow off unless the hints toggle is ON (`settings.values.hints`). Make them optional or reveal them only after the player asks for help, remains lost for a while, or activates scent focus.
20. **HUD clutter / reduce HUD pressure.** The parchment shows yarn/rank/XP/quest/time/weather/inventory (`ui.js`, `index.html`). For relaxation, **default-collapse the scroll** (mobile already collapses), and reframe "score" as a keepsake/journal count. Recommended presentation modes:
    - **Minimal mode — default recommendation:** show only the context interaction prompt, important temporary notifications, and an optional subtle compass when requested. Hide persistent XP, rank and counters unless the player opens the parchment.
    - **Guided mode:** show the current objective, compass and hints.
    - **Explorer mode:** no objective arrows, no distance labels, landmarks and scent only.

    The existing hint toggle and collapsible scroll provide a good foundation. Make the collapsed/minimal presentation the default even on desktop. Also change the generic `Yarn:` counter once multiple collectible types exist — it risks confusing the inventory model.
21. **Constant scent trail.** `scent.js` emits whenever you move — reads as noise. **Gate it** to emit only near quest/items so it feels meaningful.
22. **Toast noise.** Keep autosaves silent; avoid toast spam on mundane actions (keep the 10-drink achievement toast — it's good). Reduce repetitive XP notifications: frequent numeric feedback can interrupt the quiet mood — use XP toasts mainly for meaningful milestones.
23. **Remove sprint as an early progression gate.** Let players choose their pace from the beginning.
24. **Remove or define "Master Cat mode".** At present, the rank message promises something that does not appear to have a corresponding gameplay effect. Either implement a meaningful final reward or change the message.
25. **Avoid a large number of generic collectibles.** Every collectible category should have a story, use, visual collection page, or world consequence. Do not add objects solely to lengthen playtime.
26. **Avoid expanding the map too early.** A smaller, deeply reactive Kyoto valley will be more memorable than a much larger set of attractive but mostly static districts.
27. **Avoid mandatory chase and runner sequences as the main escalation.** The future document uses soft failure thoughtfully, but the game's strongest identity is free spatial exploration. Set pieces should be rare changes of pace, not a replacement for the central experience.

### 2.11 Performance items that also serve "fun"

- **Eco/thermal frame-floor governor** (see 1.2.11) — protects long relaxing sessions on mobile.
- **Foliage low-tier octave reduction** (see 1.2.4) — frees budget for more particles/keepsakes on low tiers.
- **Hoist the last per-frame Colors** (see 1.2.2).

---

## Part 3 — Production hardening

### 3.1 Saving needs production hardening

The save manager is currently only a thin `localStorage` wrapper. No robust periodic autosave or `pagehide` save path was found in the main game.

**Add:** save schema version; migration functions; debounced autosave every 30–60 seconds; save after significant discoveries; save on interior/area transition; save on `pagehide`; save when the document becomes hidden; backup save key; last-known-safe spawn point; validate loaded numbers and arrays; detect corrupted saves; "Continue from backup" fallback; export/import save JSON, optional but valuable.

Mobile browsers can close tabs without giving a reliable traditional unload event. Saving only through menu choices and selected events is not enough. Also avoid saving an unsafe position — such as midair, inside a collider, or during a transition. Store both: exact current position; last safe grounded position.

### 3.2 Accessibility additions

The project already has: touch controls, camera sensitivity, invert Y, separate audio volumes, hints toggle, some ARIA labels, reduced-motion CSS, forgiving jump mechanics (coyote time and buffering), and text dialogue. That is a good start.

**Still missing or worth adding — Input:** full keyboard remapping; gamepad support; left-handed touch layout; adjustable joystick size; adjustable button size and opacity; toggle sprint; toggle/hold options for prowl; separate horizontal and vertical camera sensitivity.

**Visual comfort:** FOV slider; camera auto-follow strength; camera shake toggle; stable-camera mode; chromatic-fringe toggle; grain toggle; vignette slider; high-contrast interaction prompts; UI-scale setting; larger dialogue text; dyslexia-friendly font option, if appropriate.

**Information access:** shape/icon differentiation rather than color alone; `aria-live` for dialogue/toasts where useful; persistent dialogue history; optional visual indicators for important sounds; pause dialogue auto-advance, if any is later added; no critical clue delivered only through audio.

For a relaxing game, motion-comfort settings are particularly important. A player should be able to stop automatic camera behavior entirely.

### 3.3 Deepen Kyoto before expanding to Tokyo

The planned Tokyo campaign is ambitious, but it risks producing a large amount of shallow content before the core loop is fully mature. Recommend a "Kyoto Complete" milestone first.

**A strong Kyoto vertical slice would include:** 5–7 memorable NPCs; 4–6 short multi-step quests; 12–20 small environmental discoveries; 8–12 rest/perch spots; NPC daily schedules; weather-specific events; a lightweight discovery journal; one emotionally satisfying local conclusion; a reason to revisit areas at different times; a clear but quiet completion moment.

Then Tokyo becomes an expansion of a proven game rather than a substitute for depth.

---

## Part 4 — Unified priority / build order

Reconciled from the game review's 3-phase build order and the recommendations' P0–P4 priority order.

**Priority 0 — correctness & measurement (do first):**
1. Fix adaptive stage 1 → stage 2 escalation (1.2.1).
2. Add save versioning, autosave, safe positions and backup recovery (3.1).
3. Add WebGL context-loss recovery (1.2.9).
4. Record actual mobile and desktop benchmark results (1.4).
5. Fix per-frame sky palette allocations (1.2.2).
6. Test Low ↔ High switching repeatedly after the render-target reconstruction fix.

**Priority 1 — cheap, high value (no new systems):**
7. Hoist remaining `new THREE.Color` allocations (`sky.js:550`, `scent.js:109`).
8. Discovery-based markers + edge-arrow gated by hints (2.10.19).
9. Default-collapse HUD scroll + de-emphasize score / minimal mode (2.10.20).
10. Rest/meditation spots (2.3.1).
11. Stillness moments (2.3.2).
12. Photo-spot stamp album (2.3.3) + discovery journal (2.3.4).
13. Cat verbs — sit, groom, scratch, purr, perch interactions (2.4).

**Priority 2 — gameplay content:**
14. Foliage low-tier detail lever (1.2.4).
15. Bokuchi + Offering Bell quest (2.7.12).
16. Mist-gated secret behind torii (2.3.6).
17. Shishi-odoshi / bird-watch / wind-chime actions (2.3.5).
18. Two or three additional small NPC quests (2.7).
19. Weather-specific events (2.5.9).
20. NPC schedules (2.6.11).
21. Local Kyoto completion scene (2.9.18).

**Priority 3 — depth & identity:**
22. Time/weather hooks — sunset watch, firefly gathering, weather NPC lines, puddles (2.5).
23. Gift friendship-lite (2.6.10).
24. Cosmetic rewards + gentle completion beat (2.8.15, 2.9.17).
25. Eco/thermal governor + Web Audio node cap + context-restore (1.2.10-11).

**Priority 4 — comfort & accessibility:**
26. FOV and camera-follow settings.
27. Stable-camera/reduced-effects mode.
28. UI scaling and larger dialogue.
29. Remappable keyboard controls.
30. Gamepad support.
31. Left-handed and adjustable mobile controls.
32. High-contrast and sound-indicator options.

**Priority 5 — remaining performance depth:**
33. CPU particle-count scaling (1.2.3).
34. God-ray-card quality scaling (1.2.6).
35. True indoor shadow suspension (1.2.5).
36. Low-power title-screen mode (1.2.7).
37. Startup calibration probe (1.2.8).
38. Sustained thermal/battery testing (1.4.D).

**Priority 6 — expansion (only after the Kyoto vertical slice feels complete):**
39. Add the bamboo forest extension.
40. Implement the multi-step quest framework.
41. Prototype one Tokyo district.
42. Validate that its content density matches Kyoto.
43. Then commit to train and parade sequences.

---

## Part 5 — Explicitly NOT touching

- Painterly texture style, grade/vignette/grain/warmth look, cat rig & movement physics, day/night/weather lighting, gameplay logic foundations, generative music identity, audio identity.
- Do **not** add 512px textures or heavy downloads — 256px procedural canvas textures are ideal (`textures.js`).
- Preserve the "no fail states, no combat, no timers" pillar.

---

## Part 6 — Verification plan

- Side-by-side captures at golden hour, dusk, night, rain/mist on each tier (low/medium/high).
- `renderer.info` draw-call/triangle deltas before/after.
- Frame-time traces (no periodic spikes after PMREM fix) on: mid Android Chrome, iPhone Safari, low-end iGPU desktop, high-end desktop.
- **Gameplay regression pass:** movement, jump-boost, fence-walking, drinking, bat/knockable interactions, corral event, tea house transitions, photo mode, save/load — retested after each phase.
- Record baselines vs. targets (low ≥ 30fps, high ≥ 55, no >16ms spikes, cold-start < 1.5s).

**The review's verification phase is still missing evidence.** No committed report with actual results was found. The updated review should record: device and browser; resolution and DPR; quality tier; average FPS; median frame time; 95th- and 99th-percentile frame times; draw calls; triangles; geometries and textures; peak JavaScript heap where available; context-loss result; 10–20 minute thermal test; battery impact on a representative phone; golden-hour, rain, interior and title-screen measurements.

Average FPS alone is not enough. A relaxing game feels unpleasant if it averages 60 FPS but periodically freezes for 100 milliseconds.

---

## Reference — source files

| File | Role |
|---|---|
| `src/main.js` | Game loop, quality, adaptive, quests, compass/waypoints, save/load, photo mode |
| `src/countryside.js` | World build, collectibles, corral, lanterns, river, merges |
| `src/interior.js` | Tea house build, knockables, transitions |
| `src/vegetation.js` / `src/foliage.js` | Trees/bamboo/grass/foliage shader + density |
| `src/particles.js` | Rain/snow/petals/fireflies/motes/god-rays |
| `src/ambient_life.js` | Birds, butterflies, koi, guardian crows |
| `src/cat.js` | Cat rig, moods, idle actions, rim uniforms |
| `src/npc.js` / `src/dialogue.js` / `src/quest.js` | NPCs, dialogue, quest manager |
| `src/context_actions.js` | Interaction actions (findAction/trigger) |
| `src/audio.js` / `src/music.js` | Procedural SFX + generative music |
| `src/sky.js` | Sky dome, day/night, weather, PMREM |
| `src/postfx.js` | AO, atmosphere, grade |
| `src/settings.js` / `src/save.js` / `src/ui.js` / `src/menus.js` / `src/waypoints.js` | Settings, persistence, HUD, menus, markers |
| `OLD/PERFORMANCE_REVIEW_2026-09-09_023812.md` | Original perf review (now ~90% implemented) |
| `FUTURE_QUESTS.md`, `NPC_TASKS_AND_ENDGAME_GUIDE.md`, `QUICKSTART.md`, `README.md` | Design/vision reference |

---

## Final recommendation

The game does **not** primarily need more graphical spectacle right now. It already has an unusually rich rendering stack, weather, atmosphere, vegetation, audio, a pleasant cat controller, interactions and a distinctive visual direction.

To become amazing, it needs to make players think:

> "I wonder what happens if I sit here during rain," not merely "Where is the next marker?"

The strongest version of Michi-Neko is a game where:

- Moving is enjoyable.
- Remaining still is rewarding.
- Weather changes behavior.
- NPCs have lives of their own.
- The player can behave expressively like a cat.
- Progress is remembered without constantly being scored.
- The existing small world continues to reveal new details.
- Performance quietly adapts without the player noticing.

That would make the valley not just beautiful to walk through, but a genuinely comforting place players want to return to.

---

**猫の散歩 — A cat's stroll. Take your time. There's nowhere you need to be.**
