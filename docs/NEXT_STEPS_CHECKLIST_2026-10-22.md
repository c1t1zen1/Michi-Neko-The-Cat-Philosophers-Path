# Michi-Neko — Next Steps Checklist

**Date:** 2026-10-22
**Source:** `docs/NEXT_STEPS_FEEDBACK_2026-10-22_195413.md`
**Scope rule:** nothing in `src/mountaintop.js`, the summit UI, or the hilltop meditation spots — another agent owns that. New hidden places live in the valley, in a new file (`src/hidden_places.js`).

Legend: `[x]` done in this pass · `[~]` was already present before this pass · `[ ]` open / not doable here

## 0. Re-verify the stale claims first

The feedback was written from the 2026-09-11 master review. Checked against the code:

- [~] Adaptive-resolution stage 2 reachable — `main.js` `updateAdaptiveResolution` promotes 1→2
- [~] WebGL context-loss recovery — `onContextLost` / `onContextRestored` + recovery overlay
- [~] Save robustness — `save.js` backup key, validation, migration, export/import
- [~] Eco frame floor — `frameFloor` in `main.js`
- [~] Per-frame colour allocations — hoisted constants in `sky.js` / `scent.js`
- [~] Particle *simulation* budgets — `*Active` counts in `particles.js` `setBudget`
- [~] God-ray card count lever — `setBudget` hides whole cards
- [~] Indoor shadow suspension — `shadowCadence` gating in the main loop

## 1. Accessibility settings (U2.x)

- [x] FOV slider (40–90°)
- [x] Interface size (80–150%) — scales the parchment, prompt, toasts and dialogue
- [x] Larger dialogue text
- [x] High-contrast interaction prompts + dialogue
- [x] Reduce motion — follows the OS preference by default; stills FOV kicks, camera auto-follow swing, title orbit, rest drift, grain, fringe and CSS animation
- [x] Film grain and lens-fringe toggles
- [x] Settings persist (`catwalk_settings_v1`) and apply live
- [ ] Input remapping, gamepad, left-handed touch layout (U2.1) — not started; larger than this pass

## 2. NPC cats

- [x] Audit the NPC sheet — Luna and Kuro were both near-black
- [x] Distinct coats: Luna silver smoke-grey (soft tabby), Mochi ginger tabby, Kuro solid black
- [x] Silhouette variety: per-villager body scale on top of the existing builds
- [x] Per-villager idle repertoire and pacing (Luna grooms/sits, Mochi stretches/yawns, Kuro sits and watches)
- [x] Reaction to the player: notice on approach, greeting (Luna slow-blinks, Mochi turns playful, Kuro stays wary then warms), startle at a sprinting player
- [x] Mochi curls up to sleep at night and wakes with a yawn if the player tiptoes close

## 3. Light and time of day

- [~] Window glow at dusk — village windows and shoji already kindle with `nightness`
- [x] Lanterns kindle one after another instead of switching on together
- [x] Dawn valley mist — low river mist that peaks around 06:15 and burns off by ~09:15 (thicker in mist weather)
- [x] Rain on water — dedicated raindrop-ring pool on the river and ponds

## 4. Water interaction

- [~] Koi ripples and scatter — already present
- [~] Ripples when the cat steps into water — already present (`player.js`)
- [x] Rain impacts on water (see §3)
- [~] Dusk reflections — river shader already follows the sun band

## 5. Hidden places (valley only — no hilltops)

- [x] Moon Pool — still spring west of the shrine; caustics by day, moon-glow and rising motes by night, glassy pentatonic drops
- [x] Lantern Glade — bamboo ring west of the tea house with lanterns that kindle in turn, fireflies, bamboo knocks and leaf-breath
- [~] Roof view — the Rooftop Perch already exists (tea house roof); no new roof added
- [x] Each is a sit-and-watch spot with its own stillness-moment text (day / night / rain), journal entries and photo stamps
- [x] Discovery is by wandering: journal entry + XP on first arrival, scent trail only reveals within 10 m
- [x] Wired into existing discovery/journal/save systems (no schema change)

## 6. Quality-gap pass on buildings and props

- [x] Audit with the new `tools/town_preview.html` sheets
- [x] Village machiya: namako-kabe skirt walls, eave beams, wall studs
- [x] Torii: lacquer texture, swept kasagi ends, black base collars, kusabi wedges
- [ ] Tea house / craftsman residence skirt walls — their facades need hand placement around windows
- [ ] Bamboo fence tops, toro lantern detail — next candidates

## 7. Performance

- [~] Particle sim budgets per tier — already present
- [~] God-ray / dapple tier levers — god rays present
- [ ] Real-device benchmarks (V1.1 / V1.3) — **cannot be done here**; needs phones and a device matrix

## 8. Release hygiene

- [x] Syntax-check every module (`node tools/check_syntax.mjs`, 35/35)
- [x] Cache tag bumped byte-safely to `20261022f`
- [x] README "From the build" captures (real builder renders) added
- [x] AGENTS.md updated
- [ ] Full headless boot verified (see the status note in the commit message)
- [ ] Commit only my files; push to GitHub
