# dawCAT Asset Studio + Agent Harness 2.0 — Design

Date: 2026-10-21 · Branch: `worktree-dawcat-asset-studio`

## Intent

**What the user said:** "Continue improving dawCAT. Make it more advanced and
more user friendly with an AI harness that is super helpful with local
llama-server and popular API services. Go all out and make dawCAT an amazing,
helpful assets designer. Work in your own worktree."

**What success looks like:**

1. A developer can describe a game audio asset (music cue *or* sound effect)
   in plain language and get a usable, editable result — reliably, even on a
   small local model behind llama-server.
2. The AI harness feels like a collaborator: multi-turn chat, live streaming,
   self-repairing when the model returns bad JSON, able to just *answer*
   questions, and clear about what it changed.
3. dawCAT designs **sound effects**, not only music: procedural, layered SFX
   patches that can be previewed, varied, placed on the timeline, rendered to
   WAV, packed for the game, and hot-swapped into the running game.
4. Connecting to a provider is easy: presets for the common local servers and
   cloud APIs, a one-click connection test that reports what it found, and
   specific diagnostics when something fails.

**Assumptions (not stated by the user — correct me if wrong):**

- "Assets" means game *audio* assets (music cues, SFX, ambience) — dawCAT is the
  audio tool; cadJS covers 3D assets.
- Keep dawCAT's identity: no build step, no npm runtime dependencies, browser
  calls providers directly (no proxy).
- Game guardrails apply: procedural audio only ("no heavy downloads"), no game
  code changes required to try an asset.
- The existing auto-apply behaviour stays the default, with an opt-in
  "Review first" mode.

## Architecture overview

```
dawCAT/src/
  agent/                    NEW — pure, Node-testable agent harness
    providers.js            provider catalog, request builders, model lists
    stream.js               SSE parsing for OpenAI-style + Anthropic streams
    theory.js               note names, chord symbols, scale degrees, grooves
    schema.js               action catalog → prompt docs, JSON Schema, validation
    prompt.js               system prompt + context compaction
    session.js              conversation turns, streaming call, repair loop
    executor.js             applies a validated plan to AppState (moved from main.js)
    diagnose.js             network-failure / HTTP-error explanations (moved from the panel)
  sfx/                      NEW — sound-design subsystem
    runtime.js              self-contained SFX synth (embedded verbatim in exports)
    patches.js              patch model, normalization, starter templates
    export.js               game module / hot-swap snippet / manifest generation
  zip.js                    NEW — tiny store-only ZIP writer (CRC32)
  ui/agent-panel.js         REWRITTEN — chat UI over AgentSession
  ui/sfx-designer.js        NEW — Sound Design view
  agent-protocol.js         kept as a thin compatibility re-export
dawCAT/tests/               NEW — Node 16-compatible test runner + suites
dawCAT/package.json         NEW — {"type":"module"} + test script, zero deps
```

Each `agent/*` and `sfx/*` module is DOM-free so it runs under Node for tests.
UI modules depend on them, never the reverse.

## 1. Provider layer (`agent/providers.js`)

Provider catalog entries: `{ id, label, group: 'local'|'cloud', api: 'openai'|'anthropic',
baseUrl, model, needsKey, structured: 'json_schema'|'json_object'|'none', probe }`.

| id | Label | Base URL |
|---|---|---|
| `local` | llama-server (llama.cpp) | `http://127.0.0.1:8080/v1` |
| `lmstudio` | LM Studio | `http://127.0.0.1:1234/v1` |
| `ollama` | Ollama | `http://127.0.0.1:11434/v1` |
| `custom` | Custom OpenAI-compatible | `http://127.0.0.1:3000/v1` |
| `openai` | OpenAI | `https://api.openai.com/v1` |
| `anthropic` | Anthropic | `https://api.anthropic.com/v1` |
| `openrouter` | OpenRouter | `https://openrouter.ai/api/v1` |
| `gemini` | Google Gemini (OpenAI-compatible) | `https://generativelanguage.googleapis.com/v1beta/openai` |
| `groq` | Groq | `https://api.groq.com/openai/v1` |
| `mistral` | Mistral | `https://api.mistral.ai/v1` |
| `deepseek` | DeepSeek | `https://api.deepseek.com/v1` |
| `xai` | xAI | `https://api.x.ai/v1` |

`local` keeps its id so saved settings from v1 still load.

- `buildChatRequest(settings, { system, messages, schema, stream })` returns
  `{ url, headers, body }`. OpenAI-style: system message first, `stream`,
  `response_format` chosen by the structured-output setting (auto → provider
  capability), `reasoning_effort` only for cloud providers that accept it.
  Anthropic: top-level `system`, thinking per the current API, browser-access header.
- `buildModelsRequest`, `parseModelList` (OpenAI / bare array / Ollama shapes).
- `buildProbeRequests(settings)` — for llama-server also `GET /health` and
  `GET /props` (root, not `/v1`) to read `n_ctx` and the loaded model alias.
- `parseCompletion(provider, json)` → `{ text, thinking, truncated, usage }` for
  non-streaming responses (some servers ignore `stream:true`).
- Settings are remembered **per provider** (base URL, model, key) so switching
  back and forth doesn't wipe anything. Keys live in `sessionStorage` unless the
  user ticks "Remember key on this device" (then `localStorage`, with a warning).

## 2. Streaming (`agent/stream.js`)

`createSseParser(onEvent)` consumes text chunks, splits on blank lines, and
yields `{ event, data }`. `readCompletionStream(api, response, handlers)` drives
it from `response.body.getReader()` and reports `onText`, `onThinking`,
`onUsage`, and resolves `{ text, thinking, truncated, usage }`:

- OpenAI-style: `choices[0].delta.content`, `delta.reasoning_content`
  (llama.cpp), `delta.reasoning` (OpenRouter), `finish_reason`, `usage`.
- Anthropic: `content_block_delta` (`text_delta`, `thinking_delta`),
  `message_delta.delta.stop_reason`, `message_start/message_delta` usage, `error`.
- If the server answered with `application/json` instead of an event stream,
  fall back to `parseCompletion`.

## 3. Music theory helpers (`agent/theory.js`)

Models are bad at MIDI arithmetic and good at musical notation, so the harness
accepts notation and does the arithmetic:

- `parseNote('C#4' | 'Eb3' | 61)` → MIDI; rejects garbage with a clear message.
- `parseChord('Cmaj7' | 'Am7' | 'F#m7b5' | 'Gsus4' | 'C/E' | 'Bbadd9', octave)`
  → MIDI notes; `parseRoman('ii7', key, scale)` for roman numerals.
- `voiceLead(chords)` — picks inversions that minimise movement between chords.
- `parsePhrase('E5/1 G5/.5 r/.5 A5/2@0.6')` → sequential notes (duration in
  beats, `r` rest, optional `@velocity`).
- `degreesToMidi(degrees, key, scale, octave)` — scale-degree melodies.
- `arpeggiate(chordNotes, style, rate, beats)` — block / up / down / updown /
  broken / pulse / strum.
- `parseStepGrid({ kick: 'x...x...x...x...' })` — `x` = 1.0, `o` = 0.6,
  `-`/`.` = rest, 16 chars per bar.
- `GROOVES` — named drum patterns (four-on-floor, backbeat, boom-bap,
  half-time, lofi, shuffle, waltz, bossa, taiko, ambient-pulse, festival).
- `PRESET_RANGES` — comfortable MIDI ranges per synth preset, used in prompts.

## 4. Action schema (`agent/schema.js`)

One declarative catalog drives three things: the prompt's action reference, the
JSON Schema sent for structured output, and validation/coercion.

Actions (existing ones keep their exact params):

- Tracks/mix: `addTrack`, `renameTrack`, `deleteTrack`, `setTrackMix`,
  `setTrackPreset`, `addDevice`, `setDeviceParams`, `setMaster`.
- Clips: `addClip` (now also accepts note *names*, `phrase`, `degrees`, and
  drum `grid` strings), `deleteClip`, `setClipNotes` (replace content in place),
  `transposeClip`, `duplicateClip`, `moveClip`.
- Composition helpers: `addChordProgression`, `addArpeggio`, `addDrumPattern`.
- Automation: `addAutomation` (volume / pan / master / `device.param`) with
  points or a ramp.
- Project: `setTempo`, `setKeyScale`, `setSwing`, `setLoop`, `setProjectInfo`.
- Sound design: `addSfx`, `updateSfx`, `deleteSfx`, `placeSfx`.

Response shape (all keys optional except `actions`):

```json
{ "reply": "conversational answer", "summary": "what changed",
  "actions": [{ "type": "…", "target": "selection|trackId|trackId:clipId|sfxId", "params": {} }],
  "caveats": ["…"] }
```

`validatePlan(raw)` returns `{ plan, errors[] }` where each error names its path
(`actions[3].params.chords[1]: "Hmaj7" is not a chord symbol`). Unknown action
types, missing required params and out-of-range values are errors; harmless
extras are dropped. Limit raised to 60 actions. A plan with `reply` and no
actions is valid (Ask mode, or a clarifying question).

## 5. Prompt + context (`agent/prompt.js`)

- System prompt: role, response contract, generated action reference, craft
  guidance (ranges per preset, game mood → musical choices, SFX design
  vocabulary), one compact worked example, and mode guidance.
- Modes: **Compose** (was Write), **Remix**, **Sound Design**, **Mix**,
  **Ask**, **Free**. Each has guidance text and quick-start prompt chips.
- Context compaction tiers — `full` (all clip content), `compact` (notes as
  phrase strings, drum steps as grids, clips capped), `minimal` (structure only)
  — chosen automatically from the model's context size (llama-server `n_ctx`
  when known, else a per-provider default) and an estimate of ~3.5 chars/token.
  Selected SFX patches are included in Sound Design mode.

## 6. Session + repair loop (`agent/session.js`)

`AgentSession` owns the conversation: turns of `{ id, mode, prompt, status,
text, thinking, plan, errors, applied, attempts, usage, startedAt }`.

`send(prompt)`:
1. Build messages: system + compact history (last N turns: user prompt →
   assistant summary + action list + outcome) + the new request with context.
2. Stream the completion (fetch injected for tests; abortable).
3. Extract JSON (strips `<think>` blocks and code fences, finds the outermost
   object). Validate.
4. On parse/validation failure, or if the plan throws while applying (the
   project is rolled back), append the model's output plus a precise error
   report and ask for a corrected full plan — up to `repairAttempts` (default 2).
5. Apply via the executor (auto) or park the plan as `review` until the user
   clicks Apply.

Events: `turn-start`, `delta`, `thinking`, `status`, `turn-done`, `error`.

## 7. Executor (`agent/executor.js`)

Moves `executeAgentAction` out of `main.js` into a class bound to `AppState`.
Implements every action in §4; composition helpers use `theory.js`. The whole
plan runs inside `AppState.applyBatch` (one undo step, full rollback on error).
Errors name the failing action index and type.

## 8. Sound Design subsystem (`sfx/`)

**Patch model** (stored in `project.sfx[]`, migrated in for old projects):

```
{ id, name, category, tags[], gain, seed, gameHook,
  variation: { pitch (cents), time (0..1), gain (0..1) },
  fx: { lowpass, highpass, reverb (0..1), reverbTime, drive (0..1) },
  layers: [{ id, on, kind: 'tone'|'noise'|'fm'|'pluck',
             wave, freq, freqEnd, sweep: 'exp'|'lin', sweepTime,
             fmRatio, fmDepth, noiseColor: 'white'|'pink'|'brown',
             filter: { type, freq, freqEnd, q },
             env: { attack, hold, decay, sustain, release },
             start, gain, pan,
             repeat: { count, interval, pitchStep, gainStep },
             vibrato: { rate, depth } }] }
```

**`sfx/runtime.js`** exports `sfxRuntime()` — a self-contained factory (no
imports, no outer closures) returning `{ play(ctx, dest, patch, when, opts),
duration(patch), normalize(patch) }`. The editor calls it for live preview,
transport playback and offline WAV render; exports embed
`sfxRuntime.toString()` verbatim — the same pattern `bridge.js` uses for the
music player — so what plays in dawCAT is exactly what plays in the game.
Seeded PRNG noise makes renders deterministic; `opts.variation` picks a seed
for natural round-robin variations.

**`sfx/patches.js`** — `createPatch`, `normalizePatch` (clamps every field),
`SFX_TEMPLATES` (Blank, Meow, Purr, Trill, Bell, Collect, Paw Step, Splash,
Shoji Door, Dream Chime, UI Click, UI Confirm, UI Back, Page Turn, Sparkle,
Wind Gust, Water Drop, Koto Pluck, Temple Gong, Cricket), categories.

**`sfx/export.js`**:
- `generateSfxModule(patches)` → `sfx-pack.js` (ES module: `PATCHES`,
  `playSfx(audio, name, opts)` routed to the game's `audio.buses.sfx`,
  `installSfxOverrides(audio)` which swaps `audio.playMeow` etc. for patches
  with a `gameHook`).
- `sfxHotSwapSnippet(patches)` → console snippet that installs the overrides
  into `window.game.audio` live.
- `sfxManifest(patches)` → JSON with names, durations, hooks, files.
- **Export SFX Pack** (UI) → ZIP via `zip.js`: `sfx/<slug>.wav` (+ optional
  variations), `sfx-pack.js`, `sfx-manifest.json`, `README.txt`.

**Playback integration:** a clip with `sample: 'sfxp:<id>'` plays the patch on
its track (through the track's FX chain) in the transport and in WAV render.
The game music export skips these (warned in the dialog, like imported audio).

**Sound Design view** (`ui/sfx-designer.js`, new "Sound Design" tab):
asset list (new-from-template, duplicate, rename, delete), patch header
(name, category, game hook, gain), waveform canvas with per-layer lanes,
layer cards with knobs (log-scaled frequency knobs), master FX + variation
section, actions: Preview, Variation preview, Auto-preview toggle, WAV,
→ Timeline, Copy hot-swap, Export pack, "✦ Ask AI" (opens the agent in Sound
Design mode targeting this patch). The browser sidebar gets a "Sound Design"
category; dragging an entry onto the arrangement creates an SFX clip.

## 9. Agent panel UI (`ui/agent-panel.js`)

- Header: status pill (provider · model · context size), New chat, settings
  toggle, expand/collapse width, close.
- Onboarding card until a connection test succeeds: local vs cloud quick
  picks, copy-paste llama-server command, what to check.
- Settings drawer: provider (grouped Local / Cloud), base URL, key (+ remember),
  model dropdown + scan + free text, **Test connection**, and an Advanced block:
  temperature, top-p, max tokens, reasoning, structured output
  (auto/json_schema/json_object/off), repair attempts, apply mode
  (auto/review), context detail (auto/full/compact/minimal), streaming on/off.
- Mode chips + per-mode quick-start chips.
- Transcript: user bubbles; assistant cards with live streaming text, a
  collapsible "thinking" block, elapsed time and token usage, then the reply,
  summary, action list, caveats, and status (Applied / Needs review / Rolled
  back / Error) with Apply, Undo, Retry, Copy JSON.
- Composer: Enter sends, Shift+Enter newline, Send/Stop.
- Diagnostics drawer: activity log + last raw request/response (key redacted).
- `Ctrl+K` toggles the panel. Closing never cancels an in-flight request.

## Error handling

- Network failures reuse and extend the existing `diagnoseNetworkFailure`
  (HTTPS→local, CORS vs nothing listening, localhost/IPv6, missing port,
  same-origin port clash) — moved to `agent/diagnose.js` so it is testable.
- HTTP errors surface the provider's message plus a hint for 401/403 (key),
  404 (wrong base URL or model), 413/400 context overflow (suggest compact
  context), 429 (rate limit).
- Truncation is reported with the budget and a concrete fix.
- Repair attempts are visible in the turn card ("repaired after 1 retry").

## Testing

`dawCAT/tests/run.mjs` — a dependency-free runner (Node 16 has no `node:test`)
plus suites for theory, schema/validation, providers/request building, SSE
parsing (chunk boundaries split mid-line), session repair loop (fake fetch),
executor against a real `AppState` (with a `CustomEvent` shim), SFX patch
normalization + runtime with a fake AudioContext, codegen parses as valid JS,
and ZIP CRC/structure. Browser smoke: serve the repo, drive headless Edge to
load dawCAT, open each view, run a mocked agent round-trip, and check the
console for errors.

## Out of scope

- A server-side proxy for providers that block browser CORS.
- Embedding designed SFX into the *music* export runtime.
- Sample-based (recorded) SFX design — patches are procedural by design.
