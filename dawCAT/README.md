# dawCAT 2.0 · Audio Asset Studio

The audio workbench for **Michi-Neko: The Cat Philosopher's Path**. Compose music cues with the game's own musical DNA, design **procedural sound effects**, and let an **AI assistant** do the heavy lifting — then export straight back into the game **without modifying any game code**.

- **Compose** — an Ableton-style DAW: arrangement, piano roll, drum grid, mixer, device chain, automation.
- **✦ Sound Design** — layered procedural SFX (tones, FM, filtered noise, plucked strings) with variations, exported as a zero-file `sfx-pack.js` that can replace the game's own sounds.
- **✦ AI assistant** — describe a cue or a sound in plain words. Works with a local **llama-server**, LM Studio, Ollama, or **Anthropic, OpenAI, Gemini, OpenRouter, Groq, Mistral, DeepSeek, xAI**. Streams live, keeps a conversation, fixes its own mistakes, and every change is one Ctrl+Z away.

Pure Web Audio + vanilla ES modules. No runtime dependencies, no build step, no server of its own.

---

## Run it

Serve the **game root** (not the dawCAT folder) so the game and dawCAT share one origin:

```
# from the repo root (Michi-Neko-The-Cat-Philosophers-Path/)
python -m http.server 8000
```

- **dawCAT:** `http://localhost:8000/dawCAT/`
- **Game:** `http://localhost:8000/`

> Port 8000, not 8080, on purpose: **8080 is llama-server's default port**. Serving dawCAT there too means one of them can't bind.

> HTTP (not `file://`) is required for the game-cue scanner and the AI assistant. Plain **http** matters too: a page served over https is blocked by the browser from reaching local model servers.

---

## Quick tour

| Area | What it does |
|---|---|
| **Browser** (left) | Sounds, drum kits, instruments, effects, scales, ambient samples, **Sound Design** (your SFX — click to hear, drag onto the timeline), **Game Cues**, clip library, grooves, templates, user library, current project. Search filters every category. |
| **Arrangement** | Canvas timeline: drag/resize/alt-duplicate clips, marquee or shift-click multi-select, loop region, automation lanes (volume, pan, master, any automatable device parameter), audio clips, freeze/unfreeze, quantize. |
| **Piano Roll / Clip** | Note editing with velocity lane; drum step sequencer. |
| **Mix** | Faders, pan, reverb/delay sends, mute/solo, meters, master. |
| **✦ Sound Design** (tab) | The SFX studio — see [Sound Design](#-sound-design). |
| **Inspector / Device Chain** | Track & clip properties, metadata; per-track synth + EQ Eight, compressor, delay, reverb, filter, chorus, utility. |
| **✦ AI Agent** (menu bar, **Ctrl+K**) | The assistant — see [AI assistant](#-ai-assistant). |

### Game Cues

Press **⟳ Rescan** in the browser header. dawCAT reads the game's source over HTTP and extracts the MusicDirector's **dawn/day/dusk/night phases** (root, chord, scale, density, cutoff), every **`playXxx()` SFX** in `audio.js`, the **ambient loops**, and any melody/chord/scale arrays. Preview a cue (click), drag it into the arrangement, turn it into an instrument preset, or right-click a phase ▸ **Load as new project**. The AI assistant sees the phase cues too, so "make it fit dusk" uses the game's real dusk scale.

---

## ✦ Sound Design

The **✦ Sound Design** tab designs the game's sound effects procedurally — nothing is sampled, so a whole pack costs a few kilobytes to ship and every sound can vary each time it plays.

**Start a sound** from one of 24 templates modelled on Michi-Neko's own sounds — *Meow, Purr, Trill, Hiss, Chirp, Paw step, Bell, Collect, Dream chime, Unlock chime, Sparkle, Splash, Water drop, Shoji door, Page turn, Wind gust, Cricket, Koto pluck, Temple gong, Singing bowl, UI click/confirm/back*, or Blank — or ask the AI in Sound Design mode ("soft paw steps on wood, 4 variations").

**A sound is a stack of layers**, each one of:

| Layer | Use it for |
|---|---|
| **tone** | An oscillator with pitch sweep and vibrato — chirps, blips, chimes, meows. |
| **noise** | White / pink / brown noise through a sweepable filter — footsteps, whooshes, splashes, wind. |
| **fm** | A modulated oscillator whose brightness decays like a struck object — bells, gongs, glassy hits. |
| **pluck** | A plucked string (Karplus–Strong) — koto, harp, pizzicato stings. |

Every layer has an envelope (attack, hold, decay, sustain, release), an optional filter with its own sweep, vibrato and tremolo (a ~26 Hz tremolo is what makes the purr), level, pan, start offset and **repeats** (count, interval, pitch step, fade — arpeggios, trills, rattles). The master section adds gain, low/high-pass, reverb, drive and **variation** (pitch, timing and level spread).

**Variations:** sounds with variation amounts play a different round-robin take each time — in the game, on the timeline, and with **🎲 Variation** in the editor. **Make 3 variations** (right-click a sound) bakes distinct copies instead.

The waveform is rendered offline with exactly the code the game will run, with one coloured lane per layer showing when it sounds. **Enter** previews; **Auto-preview** plays after every tweak; knobs show a tooltip, turn with drag or mouse wheel, and reset on double-click. Edits are undoable (one Ctrl+Z per knob gesture).

**Use your sounds:**
- **→ Timeline** places the sound as a clip on an "SFX" track (it plays through that track's effects); or drag it from the list or the browser.
- **⬇ WAV** renders one sound.
- **Game hook** (header dropdown) marks the game sound this one replaces — e.g. `playMeow`, or `playFootstep:wood` for one surface only.
- **⬇ Export SFX pack…** (also File ▸ Export SFX Pack…) zips:
  - `sfx-pack.js` — drop it in the game's `src/`. It embeds the SFX synth and your sounds; nothing else to ship.
    ```js
    import { playSfx, installSfxOverrides } from './sfx-pack.js';
    playSfx(this.audio, 'leaf-sparkle');   // play any pack sound on the game's SFX bus
    installSfxOverrides(this.audio);       // swap hooked game sounds (playMeow, playFootstep…)
    ```
    Overrides keep the game's own behaviour where it matters: footsteps stay throttled to one per 0.28 s and water still laps.
  - `sfx/*.wav` renders (plus `.v2`, `.v3`… variations) for trailers or other tools, `sfx-manifest.json`, and a README.
  - **Pack level** (default 35 %) scales sounds to sit at the game's quiet SFX loudness.
- **🎮 Hot-swap into game** copies a console snippet: paste it into the running game's DevTools console and your hooked sounds replace the originals immediately (`dawcatSfx.play('name')` to audition, `dawcatSfx.uninstall()` to restore, or just reload).

---

## ✦ AI assistant

Open it with **✦ AI Agent** in the menu bar or **Ctrl+K**. It floats over whatever you are doing, and closing it never cancels a request in flight.

### Connect a model

Open **⚙ Settings** in the panel, pick a service, and press **⚡ Test connection** — it checks the server, lists its models, and (for llama-server) reads the loaded model and its **context window**, which dawCAT uses to size what it sends.

| Service | Default base URL | Notes |
|---|---|---|
| **llama-server** (llama.cpp) | `http://127.0.0.1:8080/v1` | Free and private. `llama-server -m model.gguf --port 8080 --ctx-size 16384 --jinja` |
| **LM Studio** | `http://127.0.0.1:1234/v1` | Start the server in the Developer tab; enable CORS. |
| **Ollama** | `http://127.0.0.1:11434/v1` | Set `OLLAMA_ORIGINS=*` and `OLLAMA_CONTEXT_LENGTH=16384` (its default is 4k). |
| Custom OpenAI-compatible | `http://127.0.0.1:3000/v1` | vLLM, Jan, KoboldCpp, gateways… |
| **Anthropic** | `https://api.anthropic.com/v1` | Default model `claude-opus-5-5`. |
| **OpenAI** | `https://api.openai.com/v1` | |
| **Google Gemini** | `https://generativelanguage.googleapis.com/v1beta/openai` | |
| **OpenRouter** | `https://openrouter.ai/api/v1` | Any model on OpenRouter. |
| **Groq**, **Mistral**, **DeepSeek**, **xAI** | their `/v1` endpoints | |

Each service remembers its own base URL and model. API keys stay in the browser — in session storage by default (gone when the tab closes), or on this device if you tick **Remember API keys** — and are only ever sent to the base URL you set. dawCAT calls providers **directly from the page** (no proxy), so a provider must allow browser (CORS) requests. The local servers above do (LM Studio and Ollama after the setting noted); Anthropic explicitly supports it; for any other cloud API that doesn't, the connection test reports a CORS block rather than a vague error.

**Which local model?** Any instruct model of 7B+ works; 14B+ composes noticeably better. A context of 16k tokens is comfortable; dawCAT shrinks what it sends to fit smaller windows automatically.

If a connection fails, the panel says why instead of "failed to fetch": nothing listening vs. a CORS block, `localhost` resolving to IPv6, a missing port, an https page blocked from local servers, or the base URL pointing at dawCAT's own file server. `0.0.0.0` (what llama-server prints) is rewritten to `127.0.0.1` for you.

### Modes

| Mode | For |
|---|---|
| **Compose** | New music: tracks, chord progressions, melodies, grooves — a complete loopable cue. |
| **Remix** | Rework what's in the project: re-voice, reharmonise, re-groove, re-mix. |
| **Sound Design** | Create and edit SFX patches (see above). |
| **Mix** | Levels, EQ, compression, space, automation — notes untouched. |
| **Ask** | Questions about music, the project, the game or dawCAT. Nothing changes. |
| **Free** | Anything, exactly as asked. |

Each mode offers quick-start prompts. **Enter** sends, **Shift+Enter** adds a line.

### What happens when you send

1. dawCAT sends a mode-specific system prompt, your recent conversation, and the project — tracks, clips with their notes and drum grids, SFX, game cues — compacted to fit the model's context window (the status line shows the estimate).
2. The reply **streams** into the turn card, with the model's thinking in a collapsible pane.
3. The JSON plan is validated. If the model wrote an unknown action, a bad chord symbol or a missing parameter — or the plan fails while applying — dawCAT sends the exact error back and asks for a corrected plan (**Self-repair tries**, default 2). This is what makes small local models dependable.
4. The plan applies as **one undo step** (or waits for **✓ Apply** if *Apply plans: after I review* is set). A failed plan rolls back completely.

The turn card lists every change in plain words, with **▶ Listen** (plays what was made), **↶ Undo**, **↻ Retry**, **Copy JSON** and, for new sounds, **Open in Sound Design**. The conversation survives a page reload; **New chat** starts fresh without touching the project.

### Musical notation the model can use

Models are bad at MIDI arithmetic, so the assistant writes music the way musicians do and dawCAT does the maths:

- **Chords:** `Cmaj7 Am7 Dm7 G7`, slash chords `D/F#`, or roman numerals in the project key `I vi ii7 V7 bVII` — voice-led automatically, as block chords or arpeggios (`up`, `down`, `updown`, `broken`, `pulse`, `strum`).
- **Melodies:** `E5/1 G5/.5 r/.5 [C5 E5]/2@0.6` (note/beats@velocity, `r` = rest, `q`/`e`/`h` durations), or scale degrees `[1, 3, 5, "b7", 8]`.
- **Drums:** grids like `kick: "x...x...x...x..."` or named grooves (`four-on-floor`, `backbeat`, `boom-bap`, `lofi`, `bossa`, `taiko`, `festival`, `ambient-pulse`…).

### Actions it can take

Project (tempo, key/scale, swing, master, loop, scene/time of day), tracks (add, rename, delete, mix, synth preset/patch, add/tune/remove effects), clips (add, rewrite, delete, transpose, duplicate, move), composition helpers (`addChordProgression`, `addDrumPattern`, `addAutomation` ramps such as filter sweeps), and sound design (`addSfx` from a template or from layers, `updateSfx`, `deleteSfx`, `placeSfx`). Up to 60 actions per plan. It cannot run code or touch files.

### Advanced settings

Temperature, top-p, max tokens, reasoning effort, structured output (auto / JSON schema / JSON mode / off — if a server rejects one, dawCAT retries without it), self-repair tries, apply mode, context detail and streaming. **Diagnostics** shows an activity log and copies the last request and response (key redacted) for debugging a model or server.

With **Anthropic**, current Claude models use adaptive thinking and *Reasoning* sets the effort ("none" means the lightest effort, since thinking can't be switched off on the newest models); on Claude Opus 5.5, Opus 5, Sonnet 5.5 and Fable 5.1 a declined request falls back to another model server-side. With reasoning models in general, give *Max tokens* room for both thinking and the answer (8000+).

---

## Exporting music back into the game

**File ▸ Export to Game…**

1. **Hot-swap snippet** — paste into the game's DevTools console; your arrangement replaces the running music immediately. Reload to undo.
2. **Drop-in `music.js`** — replace the game's `src/music.js` and hard-refresh. It implements the exact `MusicDirector` API the game already calls (`start / stop / update(dayTime) / setDucked`).
3. **Track JSON** — a flattened archival dump (not re-openable; use Save Project for that).

Both carry each track's device chain and automation. Map **dawn / day / dusk / night** to arrangement bars for a full-day-cycle export, or pick one Time of Day to export a single looping variant (`music.<scene>.<time>.js`). Drag-and-dropped audio clips and Sound Design SFX clips are not part of the music export — SFX ship with the SFX pack.

---

## Audio import, freezing and MIDI

- **Drag audio in** — drop a `.wav` / `.mp3` / `.ogg` onto the arrangement. Bytes live in IndexedDB so autosave never chokes.
- **Freeze a track** — right-click a track ▸ Freeze to render its instrument + effects; mixer stays live.
- **MIDI** — File ▸ Import / Export MIDI (notes only).

## Workflow tips

- The starter sketch already plays — hit `Space`.
- Double-click an empty lane for a clip; double-click a clip to edit it.
- Record-arm a synth track and play **A W S E D F…** while the transport runs to record.
- Everything autosaves to the browser; `Ctrl+S` saves now. User Library keeps named snapshots.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Play / stop |
| `Home` | Return to start |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / redo (AI plans are one step) |
| `Ctrl+D` | Duplicate selected clip |
| `Delete` | Delete selected clip / note |
| `Ctrl+S` | Save to browser |
| `Ctrl+K` | Open / close the AI assistant |
| `Enter` | Send (in the assistant) · Preview sound (in Sound Design) |
| `A W S E D F T G Y H U J K` | Musical typing |
| `Ctrl+Wheel` | Zoom timeline |

---

## Project layout

```
dawCAT/
  index.html, styles.css
  package.json          marks src/ as ES modules for Node tests — no dependencies
  src/
    main.js             bootstrap, shortcuts, wiring
    state.js            project model, undo/redo, persistence, SFX patches
    scanner.js          game cue scanner
    bridge.js           music export: drop-in music.js, hot-swap, JSON
    midi.js             Standard MIDI File import/export
    zip.js              store-only ZIP writer (SFX packs)
    agent/              AI assistant core (DOM-free, unit-tested)
      providers.js      provider catalog, request building, response parsing
      stream.js         SSE streaming for OpenAI-style and Anthropic APIs
      diagnose.js       connection / HTTP error explanations
      theory.js         note names, chords, roman numerals, voice leading, phrases, grooves
      schema.js         action catalog → prompt reference, JSON schema, validation
      prompt.js         modes, system prompt, context compaction
      session.js        conversation, streaming call, self-repair loop
      executor.js       applies plans to the project (one undo step)
      describe.js       plain-language action descriptions
      settings-store.js per-provider settings, v1 migration
    sfx/
      runtime.js        self-contained SFX synth (embedded verbatim in exports)
      patches.js        patch model, templates, game hooks
      export.js         sfx-pack.js, hot-swap snippet, manifest, pack contents
    engine/             audio engine: core, synth, drums, fx, transport, render, assets
    ui/                 browser, arrangement, piano roll, drum grid, mixer, inspector,
                        devices, transport bar, agent-panel, sfx-designer, common
  tests/                dependency-free Node test suites
```

## Tests

```
cd dawCAT
npm test            # or: node tests/run.mjs [filter]
```

Runs on Node 16+, no install needed. Covers music theory, plan validation, provider request building, SSE parsing (including chunks split mid-character), the self-repair session loop, the plan executor against a real project state, undo, the SFX synth (every template through a strict fake AudioContext), SFX pack generation and the ZIP writer.
