# dawCAT · Web Audio Studio

A tiny Ableton-style DAW built for **Michi-Neko: The Cat Philosopher's Path**. Compose with the game's own musical DNA, then export straight back into it — **without modifying any game code** (except optionally replacing `src/music.js` with the generated drop-in). An optional [AI composition agent](#ai-composition-agent) turns natural-language prompts into validated melody/rhythm/mix plans, calling a local llama-server, Anthropic, OpenAI, or any OpenAI-compatible API directly from the browser — no server of dawCAT's own involved.

Pure Web Audio API + vanilla ES modules. No npm dependencies, no build step.

---

## Run it

Serve the **game root** (not the dawCAT folder) so both the game and the DAW share one origin — any static server works, no Node/npm needed anywhere in dawCAT:

```
# from the repo root (Michi-Neko-The-Cat-Philosophers-Path/)
python -m http.server 8000
```

Then open:

- **DAW:** `http://localhost:8000/dawCAT/`
- **Game:** `http://localhost:8000/`

> Port 8000, not 8080, on purpose: **8080 is llama-server's default port**. Serving dawCAT there too means one of the two can't bind, and the AI agent's Base URL ends up pointing at dawCAT's own file server instead of your model.

> Serving over HTTP is required for the game-cue scanner (`fetch('../src/*.js')`). Opening `dawCAT/index.html` directly from disk (`file://`) works for composing, but scanning and hot-swap preview need the shared server.

The [AI composition agent](#ai-composition-agent) needs nothing extra either — it calls your chosen provider (local llama-server, OpenAI, Anthropic, ...) directly from the page with `fetch()`, the same as any other static-file app. There's no proxy to run and no API key ever leaves the browser for anywhere but the provider you configured. If it can't reach your server, see [Connecting to a local server](#connecting-to-a-local-server).

---

## Quick tour

| Area | What it does |
|---|---|
| **Browser** (left) | Sounds, drum kits, instruments, audio effects, scales, ambient samples, **Game Cues**, clip library, grooves, templates, user library, current project tree. Search box filters live across every category. Drag anything onto the arrangement — including audio files from Finder/Explorer. |
| **Arrangement** | Canvas timeline: drag/resize/alt-duplicate clips, marquee-drag or shift-click to multi-select clips, loop region on the ruler, automation lanes (volume/pan/master **and any automatable device parameter**), waveform-accurate audio clips, right-click a track to freeze/unfreeze or quantize. |
| **Piano Roll** | Double-click a synth clip (or select it → Piano Roll tab). Click to add notes, drag to move, edges to resize, right-click to delete or quantize to the current grid, velocity lane at the bottom. |
| **Clip tab** | Drum step sequencer for drum clips (click = toggle, Shift = full velocity, drag paints) and sample-clip properties. |
| **Mix** | Channel strips with faders, pan, reverb/delay sends, mute/solo, live meters, master fader. |
| **Inspector** | Three tabs: **Track** (name, color, M/S/arm, sends, kit) and clip properties, **Mixer** (compact strip for the selected track), **Plugins** (chip list of the track's device chain, click to jump to Device Chain), **Metadata** (project name, tempo, time signature, key/scale, day-phase section markers, cue-scan summary). |
| **Device Chain** (bottom) | Per-track rack: Analog synth editor, EQ Eight (real filter-response curve, including the high-pass stage), Compressor, Delay, Reverb, Auto Filter, Chorus, Utility. Automatable parameters can be drawn onto arrangement automation lanes. |
| **Transport** | Play/stop/record, loop, metronome, tempo (click to edit), position, CPU/VOX meters. |
| **✦ AI Agent** (menu bar) | One click opens the [AI composition agent](#ai-composition-agent) — pick a provider, scan its models, choose Remix / Write / Free, and prompt. |

### Game Cues (the fun part)

Press **⟳ Rescan** in the browser header. dawCAT fetches the game's source over HTTP (`../index.html` → entry module → its imports, always including `src/music.js` + `src/audio.js`) and extracts:

- **Phases** — the MusicDirector's `dawn/day/dusk/night` objects (root Hz, chord, scale, density, cutoff)
- **SFX** — every `playXxx()` method in `audio.js` (meow, bell, collect, dream chime, splash, door, …) with its oscillator types and frequencies
- **Ambient** — `startRain/WindChimes/Birds/Ambient/Lapping` loops
- **Melodies / chords / scales** — any standalone frequency array in the game code

The browser groups cues **Scene → Time of Day / Sounds** (today just one scene, "Overworld" — a later scene gets its own group automatically). Each cue can be **previewed** (click), **dragged** into the arrangement as a clip (phases become pluck patterns in the game's own scale, chords become pads, SFX become one-shot clips, ambient loops become sample clips), or converted into an instrument preset (right-click). Right-click a **Dawn/Day/Dusk/Night** cue for **Load as new project** — clears the current project and rebuilds it as a fresh Pad + Pluck arrangement voicing that phase's chord/scale, ready to remix. Rescan any time the game code changes.

---

## Exporting back into the game

**File ▸ Export to Game…** gives you three paths, zero game-code edits required:

1. **Hot-swap snippet (instant preview)** — click the game tab once (unlocks audio), open its DevTools console, paste the snippet, Enter. Your arrangement replaces the running music immediately. Nothing is written to disk; reload the game to get the original back.
2. **Drop-in `music.js`** — download it and replace the game's `src/music.js`, then hard-refresh the game. The generated file implements the exact `MusicDirector` API the game already calls (`start / stop / update(dayTime) / setDucked`), so no other game code changes.
3. **Track JSON** (`*.dawcat-export.json`) — a flattened archival dump, not an editable project file (it can't be re-opened via File ▸ Open — use **Save Project** for that).

Both the hot-swap snippet and `music.js` carry each track's full **device chain** (EQ/compressor/delay/reverb/filter/chorus/utility) and **volume/pan/device-parameter automation**, so what you hear in dawCAT is what plays in the game. The one thing that never survives game export is drag-and-dropped audio clips (synth notes, drum steps and built-in samples only) — the export dialog warns you if a project has any.

**Day phases:** in the export dialog, map `dawn / day / dusk / night` to arrangement bars. The exported player seeks to each section as the in-game clock changes (same hour thresholds as the original director: night <5.5h, dawn <7.5h, day <17h, dusk after). Leave −1 to ignore a phase and just loop the whole track.

**Scene / Time of Day:** every project carries a `scene` (free text — the game only has one, "Overworld", today) and a `timeOfDay` (`dawn/day/dusk/night`, or "All" for the classic full-cycle export). Picking a specific Time of Day tags the export and makes it just loop that one variant instead of seeking phases — the day-phase mapping above only applies to "All" exports. Downloaded filenames disambiguate by scene/time (e.g. `music.overworld.dawn.js`) so variants don't overwrite each other; this is prep for scenes the game doesn't have yet — right-click a **Dawn/Day/Dusk/Night** Game Cue ▸ **Load as new project** to start one.

---

## AI composition agent

Open it with the **✦ AI Agent** button in the top menu bar. It's a button, not a menu — one click opens the agent, there's no dropdown entry to hunt for — and it lights up while the panel is open. The panel floats above whatever view you're in rather than swapping it, so your arrangement stays visible underneath. **Closing the panel doesn't stop a request in flight** — it keeps generating in the background; click **✦ AI Agent** again to see where it's at.

Describe a melody, rhythm, or idea in plain language; the agent turns it into a constrained JSON plan of DAW actions — new or reworked tracks, clips (notes or drum steps), presets, FX, mix levels, tempo/key/scale/swing, the master fader — that dawCAT validates and **applies automatically the moment the full response comes back**, no separate confirm step. It cannot execute arbitrary JavaScript, touch game or project files, or do anything outside the action list below. `Ctrl+Z` or **Undo Last** reverts the whole plan in one step if you don't like the result. Same harness shape as cadJS's design agent, adapted for music instead of geometry.

No server, no npm, no build step — the panel calls your configured provider's API **directly from the browser** with `fetch()`, exactly like curling it yourself. That means it lives or dies by that provider's own CORS policy: a local inference server (llama-server, LM Studio, Ollama's OpenAI-compatible endpoint) overwhelmingly allows cross-origin requests by default, which is the whole point of running one, so this just works for the common case. A cloud provider that blocks browser origins will surface as a plain network error in the panel — there's no proxy left to paper over that, and dawCAT doesn't ship one.

### Remix / Write / Free

Three buttons above the prompt box pick how the request is framed (the line under them spells out what the selected mode does) — all three see the same full context (every track's real clip content, not just a count), so any of them can act on what's already in the project:

| Mode | What it tells the model |
|---|---|
| **Remix** | Rework the existing composition — prefer altering what's there (swap a clip's content, retune a preset, tweak a device, adjust mix) over piling on unrelated new tracks. |
| **Write** | Compose something new — prefer adding fresh tracks/clips, only touching existing ones if the request needs it. |
| **Free** | Follow the request exactly as given — adjust anything in the composition: add or remove tracks, clips, devices, mix, tempo. A one-line tweak, a full remix, a new composition, or all of the above. |

### Providers

| Provider | Default base URL | Default model | Key |
|---|---|---|---|
| Local / llama-server | `http://127.0.0.1:8080/v1` | `local-model` | Normally none |
| Custom / OpenAI-compatible | `http://127.0.0.1:3000/v1` | `custom-model` | Gateway-dependent |
| OpenAI | `https://api.openai.com/v1` | `gpt-5.2` | Required |
| OpenRouter | `https://openrouter.ai/api/v1` | `openai/gpt-5.2` | Required |
| Anthropic | `https://api.anthropic.com/v1` | `claude-opus-5` | Required |

Base URLs are editable and may need updates as provider availability changes. API keys are kept in browser `sessionStorage` only — never written to project JSON, never logged, and only ever sent to the Base URL you set.

Local llama.cpp example:

```powershell
llama-server -m C:\models\your-model.gguf --host 127.0.0.1 --port 8080
```

Then set Base URL to `http://127.0.0.1:8080/v1` and press **⟳ SCAN MODELS**. See [Connecting to a local server](#connecting-to-a-local-server) if it doesn't connect.

### Picking a model

Click **⟳ SCAN MODELS** next to the Model label: dawCAT does a `GET {Base URL}/models` against whatever provider you've configured and loads **every model that API offers** into the dropdown below it — pick one and it drops into the model field. Works for local servers, OpenAI, OpenRouter, and Anthropic (its own `/v1/models` endpoint) alike, and understands the OpenAI (`{data:[{id}]}`), bare-array, and Ollama (`{models:[{name}]}`) response shapes.

The text field under the dropdown is the model id actually sent, so you can always just type one — useful if a provider doesn't implement `/models`, or if you want a model that isn't listed. Switching Service resets the list, since another provider's model ids don't exist on the new endpoint.

### Connecting to a local server

llama-server prints the address it **bound** on startup — `http://0.0.0.0:8080`. That is not an address you can connect to: `0.0.0.0` means "listen on every interface". dawCAT rewrites it to `127.0.0.1` for you (and shows the corrected value back in the field), but the distinction matters when you're checking things by hand.

Use **`http://127.0.0.1:8080/v1`**. Four addresses that look equivalent are not:

| Base URL | Result |
|---|---|
| `http://127.0.0.1:8080/v1` | ✅ What you want. |
| `http://0.0.0.0:8080/v1` | Rewritten to `127.0.0.1` on use. Chrome silently treats it as localhost anyway; Safari and Firefox do not. |
| `http://localhost:8080/v1` | ⚠️ Can fail even when the server is up: `localhost` may resolve to the IPv6 address `::1`, and `--host 0.0.0.0` binds **IPv4 only**, so nothing answers. |
| `http://127.0.0.1/v1` | ❌ No port — goes to port 80, not 8080. |

If a scan fails, the panel tells you which of these it actually was rather than a generic "could not reach": it re-probes the address to separate *nothing is listening there* from *the server answered but blocked the browser from reading it (CORS)*, and names mixed content when dawCAT is on `https://` and the server is on plain `http://` — which browsers block outright, so the request never leaves the page.

Two more things worth checking if nothing connects:

- **Don't serve dawCAT on port 8080.** That's llama-server's default; if dawCAT is there too, `http://127.0.0.1:8080/v1/models` reaches dawCAT's static file server and returns its HTML 404. The panel calls this out by name when it happens.
- **Being able to open the server in a browser tab doesn't prove the agent can reach it.** Typing the URL in the address bar is a top-level navigation, which is exempt from CORS; a `fetch()` from a page is not. A server can load fine in a tab and still refuse the agent.

Anthropic calls include the `anthropic-dangerous-direct-browser-access` header, which is what Anthropic requires to allow a page like this one to call its API straight from a browser with a user-supplied key instead of going through a backend.

### Context sent to the model

The whole project's actual musical content, not just a summary: tempo/key/scale/swing/time signature, the master fader, and every track (id, name, kind, preset or drum kit, volume/pan/mute/solo, device list) **with its real clips** — id, timing, and the full note list or drum-step pattern — plus up to 12 of the scanned Game Cues' phase data (scene, time of day, root Hz, chord, scale). That's what lets Remix mode meaningfully rework a clip that's already there instead of only ever bolting new material on, and lets any mode match a Game Cue's mood on request.

### Supported actions

`addTrack` (synth or drum, with a preset/kit), `renameTrack`, `deleteTrack`, `setTrackMix` (volume/pan/mute/solo/sends), `setTrackPreset`, `addDevice` (EQ/comp/delay/reverb/filter/chorus/utility), `setDeviceParams` (tweaks the first device of a given type already on the track, adding one if it's missing — no duplicate stacking), `addClip` (note melody on a synth track, or a 16-step rhythm on a drum track — pairing `deleteClip` + `addClip` on the same track is how a remix replaces a clip's content), `deleteClip`, `setTempo`, `setKeyScale`, `setSwing`, `setMaster` (master fader). Plans are limited to 40 actions and applied as **one undoable transaction** — a plan that fails partway rolls the project back completely rather than leaving a half-applied mess.

### Example prompt

```text
Add a warm pad track voicing a Cmaj9 chord and a koto pluck track playing a
sparse pentatonic-major melody around it, both around 90 BPM, plus a light
four-on-the-floor drum groove on a soft kit. Keep it calm — this is for a
dawn scene.
```

---

## Audio import, freezing, and MIDI

- **Drag audio in** — drop a `.wav`/`.mp3`/`.ogg` file from Finder/Explorer straight onto the arrangement to create a waveform clip on the lane you dropped it on (or a new track). Files are decoded once, cached for the session, and their bytes live in IndexedDB (not localStorage) so autosave never chokes on embedded audio.
- **Freeze a track** — right-click a track header ▸ **Freeze track (bounce to audio)** to render its instrument + FX chain to a buffer, cutting CPU usage for busy tracks. Volume, pan, mute/solo and sends stay live so the mixer is still editable; right-click ▸ **Unfreeze** to go back to the live signal chain.
- **MIDI import/export** — **File ▸ Import MIDI (.mid)…** reads a Standard MIDI File (Format 0/1) and creates one new synth track per MIDI track. **File ▸ Export MIDI (.mid)** writes your synth tracks out as a Format-1 SMF. Notes only — drum-lane steps, FX chains and automation don't round-trip through `.mid`.

---

## Workflow tips

- The **starter sketch** (default project) already plays — hit `Space`.
- Double-click an empty lane to create a clip; double-click a clip to open its editor (Piano Roll for synth, step grid for drums).
- `Alt+drag` a clip to duplicate it. Shift-click or marquee-drag across a blank part of a lane to select multiple clips, then drag/duplicate/delete them as a group. Right-click clips/tracks for the full context menu.
- Right-click a piano-roll note selection or an arrangement clip to **quantize** it to the current snap grid.
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
    main.js            bootstrap + shortcuts + wiring + AI agent execution
    state.js           project model, undo/redo (+ applyBatch for AI plans), persistence
    scanner.js         game cue scanner (phases, SFX, scales)
    bridge.js          export: drop-in music.js + hot-swap snippet + JSON
    midi.js            Standard MIDI File (.mid) import/export
    agent-protocol.js  AI agent: direct-to-provider request building, prompt, plan validation
    engine/
      core.js         context, master bus, track chains, meters
      synth.js        synth voices, game SFX approximations, ambience
      drums.js        synthesized drum kits
      fx.js           EQ8 / comp / delay / reverb / filter / chorus / utility
      automatable.js  table of automatable device-parameter ranges
      assets.js       IndexedDB-backed audio asset store + decode/peak cache
      transport.js    lookahead scheduler (tempo, loop, metronome, automation)
      render.js       OfflineAudioContext → WAV, per-track freeze bounce
    ui/               browser, arrangement, pianoroll, drumgrid, mixer,
                      inspector, devices, transport-ui, agent-panel, common helpers
```

No dependencies, no build step — just static files, AI agent included.
