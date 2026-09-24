# dawCAT & cadJS Deep Review

**Date:** September 20, 2026  
**Timestamp:** 14:30:00 UTC  
**Reviewer:** Cline (AI Analysis)  
**Scope:** Both companion apps — feature completeness, remaining development, focus areas for maximum usage as cornerstone tools

---

## Executive Summary

Both dawCAT and cadJS are **substantial, production-quality tools** that already form strong foundations for the Michi-Neko development ecosystem. However, neither is "finished" — each has clear paths toward becoming truly cornerstone-level tools.

| Tool | Maturity | Remaining Dev | Key Focus Areas |
|------|----------|---------------|-----------------|
| **dawCAT** | ~85-90% | ~10-15% | BPM import/export, help tooltips, workflow polish |
| **cadJS** | ~70-75% | ~25-30% | Help info badges, rig/animation tools, game integration |

Both tools are functional today but have specific gaps preventing them from being truly "cornerstone" for the full development lifecycle.

---

## dawCAT Analysis

### Current Architecture

dawCAT is a **pure vanilla ES module Web Audio DAW** with no build step, no dependencies, and no server. It's composed of:

- **src/main.js** — App bootstrap, wiring, AI plan execution, export logic
- **src/state.js** — Project model, undo/redo, persistence, batch operations
- **src/engine/** — Audio engine (core, synth, drums, fx, transport, render, assets, automatable)
- **src/ui/** — 9 UI components (browser, arrangement, pianoroll, drumgrid, mixer, inspector, devices, transport-ui, agent-panel)
- **src/bridge.js** — Game export (drop-in music.js generation, hot-swap snippet)
- **src/midi.js** — Hand-rolled Standard MIDI File import/export
- **src/scanner.js** — Game cue scanner (reads scales/chords/SFX from game source)
- **src/agent-protocol.js** — AI agent request building, validation

### Implemented Features

1. Multi-track arrangement — Canvas timeline with drag/resize/multi-select
2. Piano roll — Note editing with velocity lane, quantization
3. Drum step sequencer — 8-lane, 16-step grid
4. Full mixer — Faders, pan, sends (reverb/delay), mute/solo, live meters
5. Per-track FX chain — 8 devices (synth, EQ8, compressor, delay, reverb, filter, chorus, utility)
6. Synth presets — Multiple game-inspired synth sounds
7. Game SFX synthesis — Approximations of in-game sound effects
8. Ambience generator — Weather/environment sounds
9. Loop region — On ruler with transport integration
10. Automation — Volume/pan/master + any automatable parameter on arrangement lanes
11. MIDI import/export — Format 0/1 Standard MIDI File
12. Audio import — Drag-and-drop WAV/MP3/OGG with waveform display
13. Track freezing — Bounce to audio for CPU savings
14. AI composition agent — Direct-to-provider (local/OpenAI/Anthropic/OpenRouter)
15. Game cue scanner — Reads scales, chords, SFX from game source
16. Game export — Drop-in music.js or hot-swap snippet
17. Project persistence — IndexedDB-backed with autosave
18. Musical typing — A W S E D F... keyboard input

### Remaining Development for dawCAT

#### High Priority (Cornerstone Critical)

1. **BPM Import/Export Information** *(User requested)*
   - **Gap:** When exporting to the game or to MIDI, tempo/BPM information is not prominently communicated.
   - **Needed:** BPM value should be clearly visible in all export dialogs, metadata export should include explicit BPM field, hot-swap snippet should document the assumed BPM.
   - **Complexity:** Low (mostly UI/documentation changes)
   - **Impact:** High for game audio integration workflow

2. **Help Tooltips & Info Badges**
   - **Gap:** Many features have no inline documentation. Users must know DAW terminology.
   - **Needed:** `title` attributes or hover tooltips on transport controls, mixer strips, device parameters, browser items.
   - **Complexity:** Low-Medium (systematic UI pass)
   - **Impact:** High for usability and onboarding

#### Medium Priority

3. **Improved MIDI Round-Trip Documentation**
   - **Gap:** MIDI export only handles notes; drum steps, FX, automation don't survive. Not clearly communicated.
   - **Needed:** Export dialog should list what will/won't be included.

4. **BPM Synchronization with Game**
   - **Gap:** No mechanism to sync dawCAT's tempo to an existing in-game audio track or vice versa.
   - **Needed:** "Match BPM from game audio" feature (detect tempo via autocorrelation).

#### Low Priority

5. More Synth Presets — Game-specific instrument sounds
6. Advanced Automation — Envelope drawing, more automation curve types
7. Project Templates — Pre-built arrangements for different game scenes
8. Plugin Format Support — Read-only AU/VSTi inspection

### Estimated Remaining Effort (dawCAT)

| Category | Effort |
|----------|--------|
| BPM import/export info | 2-4 hours |
| Help tooltips/info badges | 6-12 hours |
| MIDI documentation improvements | 1-2 hours |
| BPM sync feature | 15-25 hours |

---

## cadJS Analysis

### Current Architecture

cadJS is a **Three.js CAD workspace** with a custom Node server, composed of:

- **src/app.mjs** — Main application (~1164 lines), scene management, editor/game view, transforms
- **src/catalog.mjs** — Source file scanning, metadata extraction, entry classification
- **src/agent-panel.mjs** — AI design agent UI and execution
- **src/agent-protocol.mjs** — AI provider request building, validation
- **src/asset-package.mjs** — Versioned asset packaging, compatibility checking
- **server.mjs** — Node static server with /api/agent proxy endpoint
- **tests/catalog.test.mjs** — Test suite covering catalog, agent, and asset package logic

### Implemented Features

1. Editor/Game View Toggle — Switch between CAD workspace and live game inspection
2. Object Selection — From hierarchy tree, viewport click, or game scene
3. Transform Tools — Move (W), Rotate (E), Scale (R) gizmos and numeric entry
4. Geometry Editing — Primitive parameter editing (radius, height, segments, etc.)
5. Geometry Distortion — 9 operations: twist, bend, taper, noise, flatten, inflate, pinch, shear, spherize
6. Material/Texture Editing — Colors, properties, texture upload/fit/apply-to-parts, UV repeat/offset/rotation/wrap
7. Light/Camera Controls — Full property editing for all light and camera types
8. Primitive Creation — Box, sphere, cylinder, cone, torus, capsule, light, camera
9. Object Hierarchy Management — Parent/child, isolation, grouping
10. Import — GLB, glTF, OBJ, STL (FBX/PLY/DAE/3DS catalogued but not previewable)
11. Export — Project JSON, versioned asset packages, runtime overrides, GLB, OBJ, PNG screenshot
12. Catalog Scanning — Auto-detects Three.js source files, classes, builders, geometries, materials, object types
13. Live Game Inspection — Reads `window.game.scene`, traverses hierarchy, applies runtime overrides
14. AI Design Agent — Multimodal (text + reference images), validated action plans
15. Versioned Asset Packages — Schema 1 with baseline compatibility checking, sparse object diffs
16. Undo/Redo — Full session history with snapshot-based state changes
17. Multiple Viewport Presets — Perspective, front, side, top, iso views

### Remaining Development for cadJS

#### High Priority (Cornerstone Critical)

1. **Help Info Badges & Tooltips** *(User requested)*
   - **Gap:** Almost no inline help. The tool rail has `title` attributes, but that's it. Inspector sections, menu items, viewport buttons, and catalog entries have no tooltips.
   - **Needed:** Systematic addition of hover tooltips or info badges across all UI elements — tool rail buttons, inspector sections (object, transform, geometry, material, light, camera, instances), viewport toolbar, menu items, catalog select/scan buttons, status bar, and especially the AI agent panel.
   - **Complexity:** Low-Medium (systematic UI pass, ~50-100 tooltip additions)
   - **Impact:** Very High for usability and onboarding — cadJS has more complex 3D terminology than dawCAT

2. **Rig Inspector & Animation Timeline**
   - **Gap:** Explicitly listed as "planned but not in current UI" in the README.
   - **Needed:** Visual rig inspector for articulated `THREE.Group` pivots (the production cat's animation system), bone/bend editing, and a basic animation timeline for previewing walk cycles and idle animations.
   - **Complexity:** High (new UI system, animation playback infrastructure)
   - **Impact:** Critical for character work, which is central to Michi-Neko

3. **Permanent Game-Asset Importer**
   - **Gap:** Exports are not automatically consumed by the game. The "safety boundary" prevents cadJS from writing to game files.
   - **Needed:** A deliberate import workflow — either an "Import into Game" menu item that copies assets with developer confirmation, or a game-side `cadJS/assets/` watcher.
   - **Complexity:** Medium (game-side code changes + cadJS export format alignment)
   - **Impact:** High for the full design→implement workflow

#### Medium Priority

4. **Animation Preview**
   - **Gap:** No way to preview animations in the CAD viewport.
   - **Needed:** Simple playback controls for imported GLB animations and generated animation sequences.

5. **More Import Formats**
   - **Gap:** FBX, PLY, DAE, 3DS are catalogued but not previewable.
   - **Needed:** FBX support would cover most external model workflows.

6. **Component Reuse Library**
   - **Gap:** No way to save and reuse common CAD components (e.g., a "roof tile" or "torii gate post" template).
   - **Needed:** A library system for named components that can be instanced.

#### Low Priority

7. Collaboration — Multi-user editing, comments, change tracking
8. Scripting API — Automated batch operations
9. Advanced Materials — PBR workflow, material previews

### Estimated Remaining Effort (cadJS)

| Category | Effort |
|----------|--------|
| Help info badges/tooltips | 8-16 hours |
| Rig inspector & animation timeline | 60-100 hours |
| Permanent game-asset importer | 20-40 hours |
| Animation preview | 25-40 hours |
| FBX import | 15-25 hours |
| **Total (core improvements)** | **~128-221 hours** |


---

## Comparative Analysis

### Similarities

Both tools share:
- Direct-to-provider AI agent architecture (no server proxy for AI calls)
- Same provider support (local/llama-server, OpenAI, OpenRouter, Anthropic, custom)
- Validated action plans from the AI
- Vanilla ES modules, no npm dependencies (cadJS has server, but that's separate)
- Export-oriented workflow (dawCAT exports music.js, cadJS exports packages/assets)
- Focus on non-destructive editing
- Extensive keyboard shortcuts

### Differences

| Aspect | dawCAT | cadJS |
|--------|--------|-------|
| Server | None (pure static) | Node server (for AI proxy, API) |
| Persistence | IndexedDB | localStorage + project files |
| External deps | None | Three.js + loaders/exporters (CDN) |
| Complexity | ~4,500 lines (app) | ~1,200 lines (app) + server |
| AI integration | Composition agent | Design agent + multimodal |
| Testing | Manual/smoke tests | 12 unit tests |
| Maturity | Higher | Lower (more planned features) |

### Integration Potential

The two tools complement each other well for full Michi-Neko development:
- **dawCAT** handles all audio composition and integration
- **cadJS** handles 3D asset creation, inspection, and packaging
- Both share the AI agent philosophy (constrained, validated plans)
- Could share a common project management layer in the future

---

## Recommendations for Maximum Usage

### Short-Term (1-2 Weeks)

1. **dawCAT: Add BPM import/export information** — Quick win that directly addresses game integration pain points.
2. **cadJS: Add help info badges/tooltips** — Dramatically improves usability for complex 3D operations.
3. **Both: Add "Getting Started" tutorial overlays** — First-time user guidance.

### Medium-Term (1-2 Months)

4. **cadJS: Build rig inspector** — Essential for Michi-Neko's animated cat character.
5. **cadJS: Build animation timeline/preview** — Allows iteration on character animation.
6. **dawCAT: BPM sync with game audio** — Enables creating music that matches existing game audio.

### Long-Term (3-6 Months)

7. **cadJS: Permanent game-asset importer** — Closes the design→implement loop.
8. **Both: Shared project management** — Common interface for dawCAT + cadJS projects.
9. **Both: More advanced AI features** — Iterative refinement, A/B testing of AI outputs.

---

## Conclusion

Both dawCAT and cadJS are **well-architected, feature-rich tools** that are already functional today. The main gaps preventing them from being "cornerstone" are:

**dawCAT:** ~25-43 hours of remaining dev, mostly UI polish and workflow improvements (BPM info, tooltips, documentation).

**cadJS:** ~128-221 hours of remaining dev, with major features like rig inspector, animation timeline, and game-asset importer still planned but not built.

**Priority focus for both:** Add comprehensive help info badges and tooltips (low effort, high impact for usability), then address dawCAT's BPM import/export information and cadJS's rig/animation tools.

With these improvements, both tools will become essential, full-lifecycle development companions for Michi-Neko rather than just useful utilities.

---

*Analysis completed by Cline AI on September 20, 2026. No code changes were made.*