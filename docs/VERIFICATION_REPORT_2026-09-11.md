# Michi-Neko — Verification Report

**Date:** 2026-09-11
**Scope:** BUILD_GUIDE_2026-09-11_041436.md, Workstreams A/S/P/AU/C/N/G/U/V
**Harness:** Playwright 1.63.0, headless Chromium (SwiftShader software WebGL), local static file server

## Automated results

Two headless browser suites were run against the live game. Both pass cleanly.

### Smoke suite — 31/31 checks

Boot & startup, WebGL2 feature gate, versioned save (v2) + journal persistence +
safe position + backup rotation + v1→v2 migration, rest-spot action, stillness
moment (~8 s quiet), cat verb cycle (sit→groom), sprint from start, mist altar
gating (appears in mist, hides in clear), NPC routine resolution (Luna → bridge
at night), weather-reactive dialogue, scent gating, waypoint hint gating,
adaptive-resolution stage 0→1→2 escalation + hysteresis recovery, eco
frame-floor below 30 fps, journal open/populate/close, photo album stamping,
music voice cap, WebGL context-loss overlay + restore, pagehide autosave,
Master Cat golden-bell cosmetic, zero console errors during 12 s of play.

### Deep-regression suite — 13/13 checks

W-key movement (6.7 m over 1.5 s simulated), jump, Bokuchi/Offering-Bell quest
end-to-end (start via Kuro after yarn quest → 5/5 bells → pending reward →
keepsake granted), interior transition in/out, save-while-inside persists
exterior spawn (y=0, not y=100), repeated Low↔Medium↔High quality switching
with live render-target rebuilds (no white screen, composer still draws),
full weather cycle (rain/mist/snow/cloudy/clear) without errors, NPC commute
under live simulation (Luna reaches bridge at night), zero console/page errors
for the entire session.

### Notes on the harness

- Headless SwiftShader renders far below real-time fps (~2–5 fps), so tests
  that depend on wall-clock were stepped deterministically (`player.update`,
  `npc.update`, `controls.update` called directly). Results reflect logic
  correctness, not real-device frame pacing.
- `renderer.info` at session end: 723 geometries, 103 textures. Draw calls
  read 1 because the final probe rendered into the composer's first target —
  treat these as structure counts, not frame cost.

## Performance status table (A4.1)

| Item | Status | Evidence |
|---|---|---|
| Adaptive stage 1→2 escalation | Complete | stage 0→1→2 + hysteresis verified in smoke suite |
| WebGL context-loss recovery | Complete | overlay + restore path verified |
| Eco/thermal frame-floor | Complete | engages under sustained <30 fps |
| Startup calibration probe | Complete | `main.js` samples title fps, lowers start tier if needed |
| Low↔High switching | Complete | 6-tier round trip, no white screen |
| WebGL2 gate | Complete | feature-detect gate at boot |
| Palette allocation hoisting | Complete | `sky.js` persistent palette buffers; `scent.js` scratch colors |
| Particle CPU budgets | Complete | `particles.js setBudget` caps sim + upload prefix per tier |
| Foliage low-tier detail | Complete | `foliage.js setFoliageDetail` / `FOL_LOW` define |
| Indoor shadow suspension | Complete | outdoor shadow cadence gated on `interior.isInside` |
| Title-screen perf mode | Complete | reduced effects/cadence on title |
| Ambient-life tier budgets | Partial | `ambient_life.js` has no tier lever |
| Per-frame allocation audit | Partial | main offenders fixed; `findAction` scratch vectors etc. |
| On-device budgets (A4.2) | Targets only | see below — not yet measured on hardware |
| Startup/CDN/offline (A4.3) | Partial | boot verified headless; CDN-failure path unmeasured |
| 20-min long sessions (A4.4) | Not run | repeated transitions + quality switches verified only |

## Performance budget targets (A4.2 — targets, pending device validation)

| Tier | Target fps | 95th frame | Draw calls | Notes |
|---|---|---|---|---|
| Mobile Low | ≥30 | <33 ms | <180 | DPR 1.0, no shafts/MSAA, 1024 shadow |
| Mobile Medium | ≥45 | <24 ms | <220 | DPR 1.25, no MSAA, 2048 shadow |
| Desktop High | 60 | <18 ms | — | 4×MSAA where justified, 4096 shadow on discrete GPUs |

## Remaining gaps (not verified / not implemented)

- Full keyboard remapping, gamepad support, left-handed layout, adjustable
  mobile controls (U2.1)
- FOV slider, camera-follow strength, stable-camera, fringe/grain/vignette
  toggles, high-contrast prompts, UI scale, larger dialogue (U2.2–U2.4)
- Explicit reduced-motion setting (U2.5 — partially covered by eco governor)
- Save export/import JSON (S1.7)
- Ambient-life population tier lever (P1.3 partial)
- Snow & clear-night specific discoveries (G2.3 partial)
- Full multi-beat Kyoto ending sequence (G3.2 partial — gentle torii beat exists)
- Real-device frame traces, 20-min sessions, thermal/battery (V1.x/V2.2)
