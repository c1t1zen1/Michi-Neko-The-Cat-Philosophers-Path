# dawCAT · Web Audio Studio

A tiny Ableton-style DAW built for **Michi-Neko: The Cat Philosopher's Path**. Compose with the game's own musical DNA, then export straight back into it — **without modifying any game code** (except optionally replacing `src/music.js` with the generated drop-in).

Pure Web Audio API + vanilla ES modules. No dependencies, no build step.

---

## Run it

Serve the **game root** (not the dawCAT folder) so both the game and the DAW share one origin:

```
# from the repo root (Michi-Neko-The-Cat-Philosophers-Path/)
python -m http.server 8080
```

Then open:

- **DAW:** `http://localhost:8080/dawCAT/`
- **Game:** `http://localhost:8080/`

> Serving over HTTP is required for the game-cue scanner (`fetch('../src/*.js')`). Opening `dawCAT/index.html` directly from disk (`file://`) works for composing, but scanning and hot-swap preview need the shared server.

---

## Quick tour

| Area | What it does |
|---|---|
| **Browser** (left) | Sounds, drum kits, instruments, audio effects, scales, ambient samples, **Game Cues**, clip library, grooves, templates, user library, current project tree. Drag anything onto the arrangement. |
| **Arrangement** | Canvas timeline: drag/resize/alt-duplicate clips, loop region on the ruler, automation lanes (selected track volume/pan + master), drag instruments/cues from the browser onto lanes. |
| **Piano Roll** | Double-click a synth clip (or select it → Piano Roll tab). Click to add notes, drag to move, edges to resize, right-click to delete, velocity lane at the bottom. |
| **Clip tab** | Drum step sequencer for drum clips (click = toggle, Shift = full velocity, drag paints) and sample-clip properties. |
| **Mix** | Channel strips with faders, pan, reverb/delay sends, mute/solo, live meters, master fader. |
| **Inspector** | Track settings (name, color, M/S/arm, sends, kit) and clip properties. |
| **Device Chain** (bottom) | Per-track rack: Analog synth editor, EQ Eight (with curve), Compressor, Delay, Reverb, Auto Filter, Chorus, Utility. |
| **Transport** | Play/stop/record, loop, metronome, tempo (click to edit), position, CPU/VOX meters. |

### Game Cues (the fun part)

Press **⟳ Rescan** in the browser header. dawCAT fetches the game's source over HTTP (`../index.html` → entry module → its imports, always including `src/music.js` + `src/audio.js`) and extracts:

- **Phases** — the MusicDirector's `dawn/day/dusk/night` objects (root Hz, chord, scale, density, cutoff)
- **SFX** — every `playXxx()` method in `audio.js` (meow, bell, collect, dream chime, splash, door, …) with its oscillator types and frequencies
- **Ambient** — `startRain/WindChimes/Birds/Ambient/Lapping` loops
- **Melodies / chords / scales** — any standalone frequency array in the game code

Each cue can be **previewed** (click), **dragged** into the arrangement as a clip (phases become pluck patterns in the game's own scale, chords become pads, SFX become one-shot clips, ambient loops become sample clips), or converted into an instrument preset (right-click). Rescan any time the game code changes.

---

## Exporting back into the game

**File ▸ Export to Game…** gives you three paths, zero game-code edits required:

1. **Hot-swap snippet (instant preview)** — click the game tab once (unlocks audio), open its DevTools console, paste the snippet, Enter. Your arrangement replaces the running music immediately. Nothing is written to disk; reload the game to get the original back.
2. **Drop-in `music.js`** — download it and replace the game's `src/music.js`, then hard-refresh the game. The generated file implements the exact `MusicDirector` API the game already calls (`start / stop / update(dayTime) / setDucked`), so no other game code changes.
3. **Track JSON / WAV** — archival and offline render (File ▸ Export WAV).

**Day phases:** in the export dialog, map `dawn / day / dusk / night` to arrangement bars. The exported player seeks to each section as the in-game clock changes (same hour thresholds as the original director: night <5.5h, dawn <7.5h, day <17h, dusk after). Leave −1 to ignore a phase and just loop the whole track.

---

## Workflow tips

- The **starter sketch** (default project) already plays — hit `Space`.
- Double-click an empty lane to create a clip; double-click a clip to open its editor (Piano Roll for synth, step grid for drums).
- `Alt+drag` a clip to duplicate it. Right-click clips/tracks for the full context menu.
- Record-arm a synth track and play **A W S E D F…** (musical typing) while the transport runs to capture notes into the selected clip.
- Snap and zoom live in the tab bar; `Ctrl+Wheel` zooms the timeline.
- Everything autosaves to browser storage; `Ctrl+S` saves immediately. Use User Library in the browser for named snapshots.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Play / stop |
| `Home` | Return to start |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / redo |
| `Ctrl+D` | Duplicate selected clip |
| `Delete` | Delete selected clip / note |
| `Ctrl+S` | Save to browser |
| `A W S E D F T G Y H U J K` | Musical typing |
| `Ctrl+Wheel` | Zoom timeline |

---

## Project layout

```
dawCAT/
  index.html          shell
  styles.css          Nebula-DAW theme
  src/
    main.js           bootstrap + shortcuts + wiring
    state.js          project model, undo/redo, persistence
    scanner.js        game cue scanner (phases, SFX, scales)
    bridge.js         export: drop-in music.js + hot-swap snippet + JSON
    engine/
      core.js         context, master bus, track chains, meters
      synth.js        synth voices, game SFX approximations, ambience
      drums.js        synthesized drum kits
      fx.js           EQ8 / comp / delay / reverb / filter / chorus / utility
      transport.js    lookahead scheduler (tempo, loop, metronome, automation)
      render.js       OfflineAudioContext → WAV
    ui/               browser, arrangement, pianoroll, drumgrid, mixer,
                      inspector, devices, transport-ui, common helpers
```

No dependencies, no build step — just static files.
