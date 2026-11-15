# a2-hilltop

- Worker / model:     Claude Sonnet 5.5 (resumed after a first session ended before its first commit)
- Claimed:            2026-11-14
- Branch:             fable/a2-hilltop
- Base commit:        2f78865
- State:              ready for review (scope completion done)

## Steps
- [x] A.1 Routes walked (below); [x] A.2/A.3 seat judged at 6.5/12/18/23 h classic vs modular
- [x] A.4 Life; [x] A.5 Sound audit (below); [x] A.6 Performance (below); [x] A.7 Comfort (below); [x] A.8 pairs + ranked issues

## Fixed (deferred minors)
- Pollen (kit) damps on reduce-motion (R55); classic untouched.
- Butterflies (critters, small fix): wing emissive follows sun height (uGlow), dark at night.
- Kit rain/snow ramp in from zero on summit entry like the classic.
- summit_kit_parity: lanternY now measured from the built toro (null = failure); derived value kept as lanternYDerived.
- summit_preview: kit runtime with `?assets=`, `?swap=`, `&quality=`; existing views unchanged.

## Checks
- summit_kit_parity: EQUAL; kit_contract_test critters + summitlife: PASS; kit_check 422 passed
- summit_golden EQUAL (advisory diffs pre-existing); footprint_golden EQUAL; summit_test 83/0; verify all passed; check_syntax 162 OK
- game_shot boots classic + modular: 120 frames, only the optional /cad-overrides.json 404

## G-S (Ruling R59): meditation view accepted PROVISIONALLY from the four-time seat pairs; operator may overturn.

## Remaining issues, ranked
2. s2 stone slightly light/yellow at noon (not touched).
3. s3: night lit-city wave weak from the seat; pagoda proxy lighting in rain/storm; kyoto-city far tier only fewer houses.
4. Butterfly still faintly visible at night (lit by the sky fill), minor.
5. summit-trees / slope-forest still deferred.

## A.1 Routes (summit-local camera paths, `tools/summit_preview.html?assets=modular&time=T&view=custom&cam=px,py,pz,lx,ly,lz`)
Times T = 6.5, 12, 18, 23 (dawn, noon, dusk, night); files `rN_<pos>_<T>.jpg` in `docs/fable/status/a2-hilltop/`.
- R1 torii steps -> lower path -> clearing, up the axis x=0, eye 0.7 m above ground, looking up the path: z = 46, 36, 26, 16, 8 (y -5.4, -3.9, -2.4, -1.4, 0.0), looking 10 m ahead toward -z.
- R2 clearing -> meditation seat: (0,0.7,6) and (0,0.7,2) looking to (0,0.9,-3)/(0,0.9,-6); the seat itself is `seat_<T>_<set>.jpg` (the vista view).
- R3 brow walk along the shoulder at z=-6: x = -8, -3, +3, +8, eye 0.7 m, looking along the brow.
- Weather: `seat_12_rain.jpg`, `seat_12_snow.jpg` (modular). 56 JPGs total, all under 150 KB.
Frames that break the bar (by eye): none from the assets themselves. Route-camera artefacts: R1 z=46 sits beside a lantern/post block (left third of frame), R1 z=26/16 stops were re-shot (fix round 1) from higher and further back so the stair no longer fills the frame. Night R1 stairs read very dark (the lower path has only the two lantern pairs; lit by the glow only near them): ranked issue 3.

## A.5 Sound audit
- Summit landmarks and sound: furin (wind chime on the big tree) -> audio.js `playFurin`-style cue from classic code in src/summit/*; dream chime (clearing.js:748 `audio.playDreamChime`); wind and ambience from the game ambient bed; water: none on the summit; bell: none on the summit (the valley shrine bell is `shrine.bell.ring`).
- Kit summit assets (summit-*, vista, clearing, summitlife) call `env.audio` nowhere: `grep -rn "audio" src/kit/summitlife src/kit/vista src/kit/clearing` finds nothing. The kit furin builds the sail/clapper; the clap sound is from classic game code which still runs.
- Ranked missing (t3 contract, `docs/fable/handoff/t3-audio.md`): (1) summit furin chime: in `src/kit/clearing` furin update, when the clapper swings past a threshold, `env.audio?.play('garden.chime.ring', { pos: furin.position, gain })` (event exists); needs the main.js sink block from the t3 handoff (a1-village/Integrator, not edited here). (2) summit stone lantern kindle: lanterns family already has the call site; sink only. No new event names needed.

## A.6 Performance (summit_preview, time 12, 120 rAF frames, headless Metal, `uptime` load 1m: 1.8-2.6, all below 3 so not load-affected)
| view | set | quality | draws | tris | median ms (p95) |
|---|---|---|---|---|---|
| meditation | classic | med/high (no tier for classic) | 234 | 1.545M | 16.7 (17.7) |
| meditation | modular | medium | 140 | 1.530M | 16.6 (18.0) |
| meditation | modular | high | 142 | 1.583M | 16.6 (17.9) |
| arrival | classic | med/high | 165 | 1.541M | 16.7 (17.3) |
| arrival | modular | medium | 133 | 1.531M | 16.7 (17.8) |
| arrival | modular | high | 135 | 1.581M | 16.6 (18.2) |
Frame ms is pinned at the 60 Hz vsync (16.6), so it shows no difference; draws drop 40 percent at the seat and 20 percent at arrival. Tris are renderer.info of the last pass. Tier distances were not changed; nothing cut.

## A.7 Comfort
Booted `/index.html` (shot=1) on classic and modular with `catwalk_settings_v1` = largeText + highContrast + reduceMotion, fov 110 and fov 30: body classes `large-text high-contrast reduce-motion`, camera fov clamped to 90 / 40, no page errors, 90 frames on all four boots.
Pollen damping proven at runtime (summit_preview, `summit.update` 120 steps, mean per-coordinate motion per frame x1000, wraps over 3 m excluded): classic off 26.7, on 28.1 (ratio 1.05, unchanged by design, R55); modular (fix round 1: damping moved to the points' onBeforeRender, after the facade) off 26.9, on 8.0 (ratio 0.297 = CALM), measured with a render per step.

## A.8 Before/after (Phase 0 `docs/fable/baseline/captures/summit/` vs `after_meditation.jpg`, `after_arrival.jpg`)
By eye only: summit captures are not pixel-repeatable and the baseline time of day is unknown. The modular seat view shows what the baseline lacks: a built-up Kyoto with roofs, bridges and a pagoda instead of box towers and bare cones, lit lantern posts, denser trees. Same composition, torii and fūrin placement; the perch sightline holds.

## Assigned minors
- s2 noon stone tint: warmStone tint 0xb4aa92 -> 0xa8a28e (`src/kit/clearing/approach.js`), slightly cooler/darker. Contract + goldens green.
- s3 night lit-city wave: front softness 0.30 -> 0.16 and sprite size 0.8 -> 0.95 (`src/kit/vista/city.js`); before/after at 19.6 h compared by eye: only a small gain, it stays subtle from the seat. Sprites only, no tri/draw cost.
- Butterfly still faintly visible at night: it is a summit *visit* (a flock fades in for 12-24 s on a timer), and the classic code visits at night too (`src/summit/wildlife.js:230`, no night check). Wing glow already dims with the sun (the earlier commit). Making kit visits skip the night would diverge from classic timing, so it is left: ranked issue.
- Pagoda proxy lighting in rain/storm: not fixed. Needs a rain-aware material path in `src/kit/vista` pagoda proxy plus a look study; out of the small-fix scope. Ranked issue.
- kyoto-city far tier is only fewer houses: not fixed (the brief limits to fewer houses; a real far impostor is a new asset). Ranked issue.

## Remaining issues, ranked
1. Summit audio: kit furin/lanterns do not emit env.audio (call sites in A.5); needs the main.js sink (Integrator / a1-village).
2. Pagoda proxy lighting in rain/storm.
3. Lower-path steps read very dark at night (route R1 at 23 h): add a faint lantern fill or raise stair ambient; needs a look study.
4. Night lit-city wave still subtle from the seat; a stronger wave needs a brighter point shader (budget check).
5. kyoto-city far tier is only fewer houses.
6. Night butterfly visits match the classic timing.
8. summit-trees / slope-forest still deferred (no cheap study).
