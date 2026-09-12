# Design, Playability & Production Recommendations — Michi-Neko · 道猫

**Date:** 2026-09-11 02:38
**Scope:** Post-performance-review recommendations for the game project
**Goal:** Make Michi-Neko an amazing, fun, enjoyable, relaxing and exploratory game to play — while fixing the remaining performance-control issues, hardening production reliability, and deepening the existing Kyoto valley before any larger expansion.

---

## Overall verdict

The performance review dated **2026-09-09 02:38** is now partly historical. A later commit from September 9 — `28beb92 "Perf: mobile-first render pipeline overhaul + static geometry merges"` — implemented most of its largest recommendations.

**Technically, the game is in much better shape than the review suggests.** The bigger opportunity now is not another broad optimization rewrite. It is:

1. Fixing a few remaining performance-control bugs and omissions.
2. Making saving and browser recovery production-safe.
3. Deepening the existing Kyoto valley before expanding into a much larger Tokyo campaign.
4. Giving players more enjoyable **cat-like ways to inhabit the world**, not just objectives to complete.
5. Reducing HUD/progression pressure so exploration and stillness remain the heart of the experience.

---

## 1. What from the performance review is already complete?

### Completed or substantially completed

| Review recommendation | Current status |
|---|---|
| Disable default-framebuffer antialiasing | **Complete** — `antialias: false` |
| Tier-driven MSAA | **Complete** — 0 samples on Low/Medium and 4 on High |
| Half-resolution bloom | **Complete** |
| Merge `OutputPass` and grading | **Complete** — `GradeOutputShader` |
| Bamboo sway moved away from per-frame matrix recomposition | **Appears complete** — animation is shader-driven |
| PMREM interval raised to 25 seconds | **Complete** |
| PMREM palette-delta gate | **Complete** |
| Pause PMREM indoors | **Complete** |
| Shadow resolution tiers | **Complete** — 1024/2048, with 4096 reserved for detected discrete GPUs |
| Shadow update cadence | **Complete** — every other frame below High |
| Disable shadows on tiny props at Low | **Complete** |
| Gate outdoor systems while indoors | **Mostly complete** |
| Grass quality density | **Complete** |
| Particle rendering budgets | **Complete** |
| Lantern-light quality count | **Complete** |
| Disable shafts on Low/mobile Medium | **Complete** |
| GPU renderer-string detection | **Complete** |
| Restrict `backdrop-filter` to desktop/fine pointer | **Complete** |
| Static geometry merging | **Substantially complete** across environment, vegetation, and interior builders |
| Reduced-motion CSS for interface animation | **Partially complete** |

The main implementation is visible in:

- `src/main.js`
- `src/postfx.js`
- `src/sky.js`
- `src/vegetation.js`
- `src/interior.js`
- `src/settings.js`

So the review document should be updated with a **status column** rather than continuing to treat all twelve phases as pending work.

---

## 2. Performance work that is genuinely still missing

### Critical: the adaptive-resolution second stage cannot currently activate

`perfStage` starts at `0`. On low frame rate:

- Stage `0` becomes stage `1`.
- Shafts are disabled.
- Bloom drops to quarter resolution.
- The function returns.

On subsequent low-frame-rate checks, stage `1` never becomes stage `2`. The code later says `if (this.perfStage < 2) return;`, but nothing promotes `perfStage` from `1` to `2`.

That means **dynamic pixel-ratio reduction is effectively unreachable**. The system performs only its post-processing reduction and then stops, even if the game remains below 45 FPS.

**Recommended correction:** use sustained-low-performance timing:

- First bad window: stage 0 → 1.
- If FPS remains below target for another 4–6 seconds: stage 1 → 2.
- At stage 2, lower pixel ratio gradually.
- Require 10–20 seconds of stable performance before restoring quality.
- Add hysteresis so the game does not oscillate every few seconds.

This is the most important remaining technical issue because the code presents itself as a two-stage adaptive system, but currently only one stage functions.

---

### High: per-frame color allocation remains significant

The original review recommended hoisting a few `new THREE.Color()` allocations, but the current palette path still generates many new colors each frame. `lerpPalette()` and `resolvePalette()` build new objects and create new `THREE.Color` instances repeatedly. `resolvePalette()` is called during the sky update, then called again in the main loop for the cat's rim light.

**Recommended correction:**

- Keep two reusable palette objects.
- Store reusable `THREE.Color` values for each palette field.
- Write interpolation results into those objects.
- Expose the already-resolved current palette from `Sky`.
- Have the cat rim light read `sky.currentPalette` rather than calling `resolvePalette()` again.

This should make the normal frame loop effectively allocation-free for sky colors. Also inspect:

- `updatePhotoCamera()` in `src/main.js`, which creates vectors each photo-mode frame.
- `findAction()` in `src/context_actions.js`, which creates several vectors during proximity checks.
- Any `clone()` usage in player collision and terrain-normal code.

---

### High: particle rendering budgets do not reduce particle simulation budgets

`setBudget()` changes `geometry.setDrawRange()`, which reduces GPU rasterization. However, the update loops still process the original full counts. Rain alone updates 1,100 streaks, including two position writes per streak.

**Recommended correction:** store an `activeCount` for each particle system and only update that active prefix:

- Low: 40–50%
- Medium: 70–75%
- High: 100%

Also missing from the current budget:

- The separate god-ray card count
- Potentially splash counts
- Landing dust activation counts
- Any ambient-life populations that remain fixed by tier

---

### Medium/high: foliage shader LOD is still missing

The foliage system remains visually impressive but expensive. The review's low-tier shader simplification does not appear to have been implemented. The foliage materials still use the detailed painterly noise path without a visible tier-driven complexity switch.

**Recommended approach** — do not make every tree ugly on Low. Divide foliage into visual categories:

1. **Hero foliage near the player** — keep the current shader, preserve leaf cards and translucency.
2. **Mid-distance trees** — fewer noise octaves, less bump/mottling, fewer alpha-cut cards.
3. **Outer forest and foothill masses** — Lambert or simplified Standard material, no expensive bump noise, no card shadows on Low, potentially no card layer at all beyond a distance threshold.

Distance-based complexity preserves the visual identity much better than uniformly degrading the entire world.

---

### Medium: indoor shadow suppression is only partial

The indoor update gating is good — outdoor city, vegetation, particles, and ambient life stop updating while the cat is inside. However, the sun shadow is not truly disabled. The shadow camera is tightened, but the main render loop still executes `this.sky.sun.shadow.needsUpdate = true;` on the configured cadence, including indoors.

**Recommended correction:** while indoors, either:

- Set `sun.castShadow = false`, if the room uses its local point lights and hemisphere light only, or
- Use a distinct indoor shadow policy and update it only when entering the interior or when an indoor movable shadow caster changes.

At minimum: `if (!this.interior.isInside && ++this._shadowFrame >= this.shadowCadence) { request outdoor shadow update }`. If sunlight through the interior is visually important, update the indoor sun shadow only on transition or major time-of-day changes — not every second frame.

---

### Medium: title-screen rendering consumes nearly full gameplay resources

The title screen has a beautiful cinematic orbit, but much of the living valley continues updating while the player is not playing. On phones this means: higher battery use before gameplay, more thermal load, more chance of audio/render initialization issues, and potential adaptive-quality decisions based on title-screen performance rather than gameplay.

**Recommended correction:** create a title-scene performance mode:

- Cap title rendering at 30 FPS on touch devices.
- Disable or reduce AO and shafts on the title screen.
- Update particles and ambient life at half frequency.
- Pause unnecessary gameplay/NPC logic.
- Restore the selected tier when entering the game.
- Allow full-quality cinematic title rendering on desktop High.

The title should establish the mood without making the phone hot before the player takes a step.

---

### Medium: auto quality could use a real startup probe

GPU-string detection is implemented, which is good, but strings are incomplete and privacy restrictions can make them generic. Add an optional startup calibration:

1. Render the title scene for approximately two seconds.
2. Ignore shader-compilation frames.
3. Measure median and 10th-percentile frame time.
4. Lower the starting tier if necessary.
5. Cache the result by game version and device characteristics.

Do not permanently raise a tier based only on a short probe. Raising should require sustained healthy performance because thermal throttling often begins later.

---

### Medium: no WebGL context-loss recovery path was found

The code does not appear to listen for `webglcontextlost` or `webglcontextrestored`.

**Recommended behavior:** on context loss:

- Prevent the browser's default terminal failure if appropriate.
- Pause gameplay.
- Display a calm "The valley is resting…" recovery screen.
- Save current progress.
- Attempt restoration.
- If restoration fails, offer "Reload and Continue."

This is especially valuable for iOS Safari and memory-constrained mobile browsers.

---

### The review's verification phase is still missing evidence

The review includes a strong verification checklist, but no committed report with actual results was found.

**The updated review should record:**

- Device and browser
- Resolution and DPR
- Quality tier
- Average FPS
- Median frame time
- 95th- and 99th-percentile frame times
- Draw calls
- Triangles
- Geometries and textures
- Peak JavaScript heap where available
- Context-loss result
- 10–20 minute thermal test
- Battery impact on a representative phone
- Golden-hour, rain, interior and title-screen measurements

Average FPS alone is not enough. A relaxing game feels unpleasant if it averages 60 FPS but periodically freezes for 100 milliseconds.

---

## 3. What the performance review itself should add

### A. A completed/pending status table

Each recommendation should be marked: Complete, Partially complete, Not started, Rejected, Needs measurement, or Regressed. Include the commit implementing it and the measured result.

### B. Explicit performance budgets

Define targets before continuing to optimize.

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

### C. Startup and loading performance

The review focuses almost entirely on frame rendering. It should also cover:

- First contentful render
- Time until title menu is responsive
- Time until movement is possible
- Shader compilation stalls
- CDN failure behavior
- Cache behavior
- Offline behavior
- Slow mobile network behavior

Because Three.js is loaded remotely, the game should eventually self-host or service-worker-cache its engine modules. A peaceful instant-play game should not become a white screen because a CDN request failed.

### D. Long-session stability

Test at least:

- 20 minutes
- One complete day/night cycle where practical
- Repeated interior transitions
- Repeated Low ↔ High quality changes
- Backgrounding and restoring the mobile browser
- Locking/unlocking the phone
- Multiple photo captures
- Repeated New Game/Continue cycles

Look for:

- Render-target leaks
- Increasing geometry/material counts
- Audio nodes accumulating
- Particle arrays growing
- Event handlers registered repeatedly
- Save corruption
- Thermal degradation

### E. Accessibility performance

Reduced-motion support should be treated as both accessibility and performance:

- Disable camera auto-follow easing if requested.
- Reduce or disable animated grain.
- Disable chromatic fringe.
- Reduce title-camera movement.
- Reduce door-wipe movement.
- Provide a static title backdrop option.
- Offer a stable-camera mode.

---

## 4. The biggest game-design opportunity: more ways to be a cat

The world has strong atmosphere and a surprising number of interactions — drinking, eating, napping, batting yarn, ringing a bell, knocking props, meowing, wading, fence walking, NPC conversations and photo mode.

But the implemented structured content is still narrow:

- One primary formal quest
- Three principal NPC cats
- A small number of progression rewards
- Limited persistent discovery history
- No real ending yet
- A rank system whose later rewards are not always concrete

Do not immediately build a huge Tokyo expansion. First, make the existing Kyoto valley feel like somewhere players want to revisit.

### Add a "cat verbs" layer

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

---

## 5. Add meaningful stillness

The game calls itself meditative, but a meditative game needs mechanics that reward not moving.

### Recommended "stillness moments"

At certain scenic locations, sitting quietly for 8–20 seconds could reveal:

- Koi approaching the bank
- Fireflies gathering
- A train crossing the distant landscape
- Wind chimes starting
- A fox spirit briefly appearing
- A bird landing near the cat
- A new layer entering the music
- A poem or illustrated postcard
- An NPC performing a private routine
- Moonlight reflecting on the river
- A hidden scent becoming visible

This creates exploration through observation rather than waypoint-following. Possible names:

- Quiet Moments
- Valley Memories
- Pawprints
- Small Wonders
- Moments of Stillness

Do not attach a countdown timer. Let the event happen naturally.

---

## 6. Deepen Kyoto before expanding to Tokyo

The planned Tokyo campaign is ambitious, but it risks producing a large amount of shallow content before the core loop is fully mature. Recommend a "Kyoto Complete" milestone first.

### A strong Kyoto vertical slice would include

- 5–7 memorable NPCs
- 4–6 short multi-step quests
- 12–20 small environmental discoveries
- 8–12 rest/perch spots
- NPC daily schedules
- Weather-specific events
- A lightweight discovery journal
- One emotionally satisfying local conclusion
- A reason to revisit areas at different times
- A clear but quiet completion moment

Then Tokyo becomes an expansion of a proven game rather than a substitute for depth.

---

## 7. Improve the quest system without turning it into a task list

`QuestManager` is currently intentionally simple — it supports one active collect quest. The future design document correctly identifies the need for multi-step quests and persistent flags.

### Add next

- Stable quest IDs
- Multi-step quest definitions
- Prerequisites
- Persistent world flags
- Optional objectives
- Completed quest history
- NPC relationship state
- Quest-item inventory
- More than one discoverable quest, but preferably only one pinned objective
- A journal entry rather than constant HUD pressure

### Keep quests short and sensory

Good quests for this game:

- Return a dropped bell by following its sound.
- Find a warm sleeping place for an elderly cat before rain.
- Bring a leaf, feather and flower to a child making a tiny festival crown.
- Sit with a nervous cat during thunder.
- Guide ducklings across a path without urgency or failure.
- Find where the wind chimes sound clearest.
- Carry a ribbon through the bamboo without letting it touch water.
- Discover which rooftop receives the first morning sunlight.

Avoid too many conventional "collect ten objects" quests. One yarn hunt is charming; an entire game of collection counters would weaken the mood.

---

## 8. Reconsider the XP and movement-unlock system

Sprinting is initially locked, and later ranks unlock movement improvements. There is also conceptual overlap between Luna's jump reward and rank-based jump progression.

### Problems

- Basic sprint being locked can make early exploration feel artificially slow.
- Luna's named "Leap" reward is less special if jump boost is also an automatic rank effect.
- "Master cat mode!" currently does not appear to apply a corresponding rank-4 effect.
- XP risks making players optimize actions instead of wandering.
- Repeated XP from bells or interactions should be checked for farming/exploitation.

### Recommended direction

Make the comfortable base movement kit available immediately: walk, jog/sprint, normal jump, prowl, meow.

Reserve progression for expressive or route-opening abilities:

- Luna's Leap
- Fence balance
- Wall scramble
- Quiet landing
- Scent attunement
- Longer perch jump
- Friendly animal trust
- Weather-related perception

Alternatively, make progression cosmetic and emotional:

- New collar charms
- Pawprint effects
- Photo frames
- Tea-house decorations
- Music variations
- NPC nicknames
- New idle animations

For this kind of game, discovery should feel like the reward. XP should be secondary feedback, not the reason to interact.

---

## 9. Reduce HUD pressure

The current parchment HUD is visually thematic, but it displays yarn count, rank, XP, active quest, time/weather, inventory, compass and objective information. That can make a meditative exploration game feel like an objective tracker.

### Recommended presentation modes

**Minimal mode — default recommendation:** show only the context interaction prompt, important temporary notifications, and an optional subtle compass when requested. Hide persistent XP, rank and counters unless the player opens the parchment.

**Guided mode:** show the current objective, compass and hints.

**Explorer mode:** no objective arrows, no distance labels, landmarks and scent only.

The existing hint toggle and collapsible scroll provide a good foundation. Make the collapsed/minimal presentation the default even on desktop.

Also change the generic `Yarn:` counter once multiple collectible types exist — it risks confusing the inventory model.

---

## 10. Add a discovery journal, but do not turn it into a checklist

A lightweight journal would give exploration memory without making it stressful. Possible sections:

- Cats Met
- Quiet Moments
- Places Discovered
- Foods Tasted
- Weather Memories
- Strange Objects
- Photo Album
- Valley Map Sketch
- Poems or NPC sayings

Entries could appear as hand-drawn ink sketches rather than rows of completion percentages. Avoid showing "7/43 secrets" by default — completion percentages can make undiscovered wonder feel like unfinished work. If a completionist option is desired, put it behind an explicit journal setting.

---

## 11. Make NPCs feel alive outside dialogue

NPCs currently wander, but the valley will become much more memorable if each NPC has recognizable routines. Examples:

- Luna watches the moon from a particular roof at night.
- Mochi plays with fallen bamboo leaves in wind.
- Kuro visits the river only during mist.
- One cat shelters beneath an eave during rain.
- Two cats occasionally meet and sit together.
- A shy cat runs away at first but tolerates the player after repeated slow blinks.
- A kitten follows the player briefly after being helped.
- NPCs remember completed quests and change where they spend time.

The player should sometimes discover a scene that exists without waiting for them.

---

## 12. Use weather as gameplay, not only visual variation

The weather system is already one of the game's strongest technical features. Give each weather state unique discoveries:

**Rain:** shelter interactions, puddles to paw at, frogs appearing, cats gathering beneath awnings, louder indoor ambience, wet pawprints, rain-specific reflective photo opportunities.

**Mist:** spirit encounters, distant bells, hidden torii visibility, stronger scent trails, Kuro's special dialogue.

**Snow:** pawprints, snow pouncing, warm tea-house sequences, birds visiting feeding areas, snow collecting on static surfaces where affordable.

**Clear night:** moonlit perches, firefly gatherings, constellation-like cat stories, sleeping NPCs in unexpected locations.

This reuses the existing world and multiplies its effective content.

---

## 13. Accessibility additions

The project already has: touch controls, camera sensitivity, invert Y, separate audio volumes, hints toggle, some ARIA labels, reduced-motion CSS, forgiving jump mechanics (coyote time and buffering), and text dialogue. That is a good start.

### Still missing or worth adding

**Input:**

- Full keyboard remapping
- Gamepad support
- Left-handed touch layout
- Adjustable joystick size
- Adjustable button size and opacity
- Toggle sprint
- Toggle/hold options for prowl
- Separate horizontal and vertical camera sensitivity

**Visual comfort:**

- FOV slider
- Camera auto-follow strength
- Camera shake toggle
- Stable-camera mode
- Chromatic-fringe toggle
- Grain toggle
- Vignette slider
- High-contrast interaction prompts
- UI-scale setting
- Larger dialogue text
- Dyslexia-friendly font option, if appropriate

**Information access:**

- Shape/icon differentiation rather than color alone
- `aria-live` for dialogue/toasts where useful
- Persistent dialogue history
- Optional visual indicators for important sounds
- Pause dialogue auto-advance, if any is later added
- No critical clue delivered only through audio

For a relaxing game, motion-comfort settings are particularly important. A player should be able to stop automatic camera behavior entirely.

---

## 14. Saving needs production hardening

The save manager is currently only a thin `localStorage` wrapper. No robust periodic autosave or `pagehide` save path was found in the main game.

### Add

- Save schema version
- Migration functions
- Debounced autosave every 30–60 seconds
- Save after significant discoveries
- Save on interior/area transition
- Save on `pagehide`
- Save when the document becomes hidden
- Backup save key
- Last-known-safe spawn point
- Validate loaded numbers and arrays
- Detect corrupted saves
- "Continue from backup" fallback
- Export/import save JSON, optional but valuable

Mobile browsers can close tabs without giving a reliable traditional unload event. Saving only through menu choices and selected events is not enough.

Also avoid saving an unsafe position — such as midair, inside a collider, or during a transition. Store both:

- Exact current position
- Last safe grounded position

---

## 15. Add a small local ending before the large future ending

The current alpha has no traditional conclusion. That is acceptable for a sandbox, but even peaceful exploration benefits from a sense of emotional arrival. You do not need a boss, credits sequence or hard stop.

### Suggested Kyoto ending

After helping the local cats and finding several Quiet Moments:

1. Luna invites everyone to the tea house at sunset.
2. Each helped NPC arrives naturally.
3. The player places one found keepsake in the room.
4. The music gains a fuller arrangement.
5. Everyone watches lanterns drift or fireflies gather outside.
6. A short handwritten message appears: *"Every path becomes a home when someone remembers your pawprints."*
7. Free exploration resumes.
8. New weather scenes and NPC dialogue unlock.

That gives completion without suggesting the player should stop exploring.

---

## 16. Things I would remove or reduce

### Reduce repetitive XP notifications

Frequent numeric feedback can interrupt the quiet mood. Use XP toasts mainly for meaningful milestones.

### Remove sprint as an early progression gate

Let players choose their pace from the beginning.

### Remove or define "Master Cat mode"

At present, the rank message promises something that does not appear to have a corresponding gameplay effect. Either implement a meaningful final reward or change the message.

### Reduce constant objective arrows

Make them optional or reveal them only after the player asks for help, remains lost for a while, or activates scent focus.

### Avoid a large number of generic collectibles

Every collectible category should have a story, use, visual collection page, or world consequence. Do not add objects solely to lengthen playtime.

### Avoid expanding the map too early

A smaller, deeply reactive Kyoto valley will be more memorable than a much larger set of attractive but mostly static districts.

### Avoid mandatory chase and runner sequences as the main escalation

The future document uses soft failure thoughtfully, but the game's strongest identity is free spatial exploration. Set pieces should be rare changes of pace, not a replacement for the central experience.

---

## 17. Recommended priority order

### Priority 0 — correctness and measurement

1. Fix adaptive stage 1 → stage 2 escalation.
2. Add save versioning, autosave, safe positions and backup recovery.
3. Add WebGL context-loss recovery.
4. Record actual mobile and desktop benchmark results.
5. Fix per-frame sky palette allocations.
6. Test Low ↔ High switching repeatedly after the render-target reconstruction fix.

### Priority 1 — make the current valley delightful

1. Add sit, groom, scratch, purr and perch interactions.
2. Add 6–10 Quiet Moments.
3. Add a discovery journal.
4. Add two or three additional small NPC quests.
5. Add weather-specific events.
6. Give existing NPCs recognizable schedules.
7. Add a local Kyoto completion scene.

### Priority 2 — comfort and accessibility

1. FOV and camera-follow settings.
2. Stable-camera/reduced-effects mode.
3. UI scaling and larger dialogue.
4. Remappable keyboard controls.
5. Gamepad support.
6. Left-handed and adjustable mobile controls.
7. High-contrast and sound-indicator options.

### Priority 3 — remaining performance depth

1. Foliage shader LOD.
2. CPU particle-count scaling.
3. God-ray-card quality scaling.
4. True indoor shadow suspension.
5. Low-power title-screen mode.
6. Startup calibration probe.
7. Sustained thermal/battery testing.

### Priority 4 — expansion

Only after the Kyoto vertical slice feels complete:

1. Add the bamboo forest extension.
2. Implement the multi-step quest framework.
3. Prototype one Tokyo district.
4. Validate that its content density matches Kyoto.
5. Then commit to train and parade sequences.

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

