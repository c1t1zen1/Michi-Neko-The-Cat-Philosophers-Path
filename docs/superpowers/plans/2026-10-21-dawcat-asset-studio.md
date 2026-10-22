# dawCAT Asset Studio + Agent Harness 2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn dawCAT's one-shot AI composer into a multi-turn, streaming, self-repairing agent that works well with local llama-server and major cloud APIs, and add a procedural Sound Design studio for game SFX assets.

**Architecture:** New DOM-free modules under `dawCAT/src/agent/` and `dawCAT/src/sfx/` (Node-testable), consumed by a rewritten `ui/agent-panel.js` and a new `ui/sfx-designer.js`. The SFX synth is one self-contained factory whose source is embedded verbatim into game exports, mirroring `bridge.js`'s `dawcatRuntime` pattern.

**Tech Stack:** Vanilla ES modules, Web Audio API, Fetch + ReadableStream SSE, Node 16 for tests (no deps).

**Spec:** `docs/superpowers/specs/2026-10-21-dawcat-asset-studio-design.md`

## Global Constraints

- No build step, no npm runtime dependencies; `dawCAT/package.json` only declares `"type": "module"` and the test script.
- Tests must run on Node v16.13 (no `node:test`, no global `fetch`, no `structuredClone`, no `CustomEvent`).
- The browser calls providers directly; no proxy.
- Procedural audio only — no downloaded samples.
- v1 settings (`provider: 'local'`, sessionStorage key `michi-neko-dawcat-agent-settings-v1`) and v1 projects (no `sfx` array) must keep loading.
- Undo: one AI plan = one undo step; failed plans roll back fully (`AppState.applyBatch`).
- Windows: never rewrite files with PowerShell `Set-Content` (encoding corruption).

## Review Focus

1. Model output wrapped in prose / `<think>` / code fences, or cut off mid-JSON → plan still extracted, or a truncation error with a concrete fix (Task 4 tests).
2. SSE chunks split mid-line or mid-UTF-8 character → identical text to an unsplit stream (Task 3 tests).
3. Old saved data: v1 agent settings and projects without `sfx` → load without errors, defaults filled (Tasks 5, 6 tests).
4. Sloppy notation from models: `eb4`, `Bb3`, `C-1`, `H7`, out-of-range MIDI → accepted where unambiguous, otherwise a path-specific error the repair loop can act on (Tasks 1, 2 tests).
5. Extreme SFX params (freq 0, negative times, repeat 1000, NaN) → clamped, no AudioParam exceptions; a timeline clip whose patch was deleted plays silence, not a throw (Tasks 6, 8 tests).

---

### Task 1: Test runner + music theory

**Files:**
- Create: `dawCAT/package.json`, `dawCAT/tests/run.mjs`, `dawCAT/tests/harness.mjs`, `dawCAT/src/agent/theory.js`
- Test: `dawCAT/tests/theory.test.mjs`

**Interfaces:**
- Produces: `harness.mjs` → `test(name, fn)`, `assert` (node `assert/strict`), `installDomShims()`; `run.mjs` imports every `*.test.mjs`, prints pass/fail, exits 1 on failure.
- Produces (`theory.js`): `NOTE_NAMES`, `SCALES` (re-export of state.js's), `parseNote(v) → midi` (throws `Error` with message), `parseChord(symbol, octave=3) → midi[]`, `parseRoman(numeral, key, scale, octave=3) → midi[]`, `voiceLead(chords: midi[][]) → midi[][]`, `parsePhrase(str, {start=0}) → {midi,start,len,vel}[]`, `degreesToMidi(degrees, key, scale, octave=4) → midi[]`, `arpeggiate(notes, {style, rate, beats, start}) → note[]`, `parseStepGrid(obj) → {lane: number[16*bars]}`, `GROOVES` (name → grid object), `PRESET_RANGES` (preset → [lo, hi]).

- [ ] Step 1: tests — `parseNote('C4')===60`, `'c#4'===61`, `'Eb3'===51`, `'Bb-1'===10`, `parseNote(61)===61`, `parseNote('H2')` throws /not a note/; `parseChord('Cmaj7',3)` deep-equals `[48,52,55,59]`, `'Am7'`→`[57,60,64,67]`, `'F#m7b5'`→`[54,57,60,64]`, `'Gsus4'`→`[55,60,62]`, `'C/E'` lowest note 52; `parseRoman('ii7','C','major')` → Dm7 `[50,53,57,60]`; `voiceLead` keeps total movement ≤ naive root-position movement; `parsePhrase('E5/1 G5/.5 r/.5 A5/2@0.6')` → 3 notes, starts `[0,1,2]`, last `vel 0.6`; `degreesToMidi([1,3,5,8],'C','major',4)` → `[60,64,67,72]`; `arpeggiate([60,64,67],{style:'up',rate:0.5,beats:2})` → 4 notes `60,64,67,60`; `parseStepGrid({kick:'x...o...'})` → kick `[1,0,0,0,0.6,0,0,0,0…]` padded to 16; every `GROOVES` entry has a kick or perc lane.
- [ ] Step 2: run `cd dawCAT && node tests/run.mjs` → FAIL (module missing).
- [ ] Step 3: implement. Chord grammar: root `[A-G][#b]?`, quality tokens `maj7|M7|m7b5|ø|dim7|dim|°|aug|+|m|min|sus2|sus4|7|9|11|13|6|add9|add11|maj9|m9`, optional `/bass`. Unknown leftovers → throw.
- [ ] Step 4: run → PASS.
- [ ] Step 5: commit `Add dawCAT test runner and music-theory helpers`.

### Task 2: Action schema + validation

**Files:**
- Create: `dawCAT/src/agent/schema.js`
- Modify: `dawCAT/src/agent-protocol.js` (becomes compatibility re-exports)
- Test: `dawCAT/tests/schema.test.mjs`

**Interfaces:**
- Consumes: `theory.js` (`parseNote`, `parseChord` for validation of notation).
- Produces: `ACTIONS` (catalog: `{type, group, summary, target, params:{name:{type,enum?,min?,max?,required?,desc}}}`), `SUPPORTED_AGENT_ACTIONS` (Set), `MAX_ACTIONS = 60`, `actionReference(modes?) → string`, `planJsonSchema() → object`, `validatePlan(raw) → { plan: {protocol:2, reply, summary, actions, caveats}, errors: string[] }`, `extractJson(text) → object` (moved here; throws `TruncatedJsonError`-style message when braces never close).

- [ ] Step 1: tests — unknown type → error mentions `actions[0].type`; `addClip` with `notes:[{note:'C4',start:0,len:1}]` passes and keeps note; `setTempo {bpm: 999}` → clamped to 220 (no error); `addChordProgression {chords:['Cmaj7','Hm']}` → error contains `chords[1]`; `{reply:'hi', actions:[]}` valid; 61 actions → error mentions 60; `extractJson('<think>{x}</think>```json\n{"actions":[]}\n```')` returns `{actions:[]}`; `planJsonSchema().properties.actions.items.properties.type.enum` includes `addSfx`; `actionReference()` mentions every type.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implement; numbers clamp (not error), enums/required/notation are errors.
- [ ] Step 4: run → PASS.
- [ ] Step 5: commit `Add declarative agent action schema with path-specific validation`.

### Task 3: Providers, streaming, diagnostics

**Files:**
- Create: `dawCAT/src/agent/providers.js`, `dawCAT/src/agent/stream.js`, `dawCAT/src/agent/diagnose.js`
- Test: `dawCAT/tests/providers.test.mjs`, `dawCAT/tests/stream.test.mjs`

**Interfaces:**
- Produces (`providers.js`): `PROVIDERS` (table in spec §1), `providerInfo(id)`, `normalizeBaseUrl(url)`, `normalizeSettings(input) → settings` (fields: provider, baseUrl, model, apiKey, temperature 0.4, topP 0.9, maxTokens 4096, reasoning 'medium', structured 'auto', repairAttempts 2, applyMode 'auto', contextDetail 'auto', stream true, rememberKey false), `buildChatRequest(settings, {system, messages, schema, stream}) → {url, headers, body}`, `buildModelsRequest(settings)`, `parseModelList(json) → string[]`, `buildProbeRequests(settings) → {label,url,headers}[]`, `parseProps(json) → {nCtx, model}`, `parseCompletion(api, json) → {text, thinking, truncated, usage}`.
- Produces (`stream.js`): `createSseParser(onEvent)` → `{push(text), end()}`; `readCompletionStream(api, response, {onText, onThinking, onUsage, signal}) → Promise<{text, thinking, truncated, usage}>`.
- Produces (`diagnose.js`): `diagnoseNetworkFailure(url, {pageOrigin, fetchImpl}) → Promise<string>`, `notJsonHint(url, status, text, pageHost) → string`, `httpErrorHint(status, providerMessage, settings) → string`.

- [ ] Step 1: tests — `normalizeSettings({provider:'local'})` keeps `local` + `http://127.0.0.1:8080/v1`; unknown provider → `local`; `0.0.0.0` rewritten; OpenAI request has system message first, `stream:true`, `response_format.type==='json_schema'` for `openai`/`local`, `json_object` for `groq`; Anthropic request has top-level `system`, `x-api-key`, `anthropic-dangerous-direct-browser-access`; `parseModelList({models:[{name:'a'}]})` → `['a']`; `buildProbeRequests` for `local` includes `http://127.0.0.1:8080/props`; SSE: feeding `'data: {"choices":[{"delta":{"content":"he'` then `'llo"}}]}\n\n'` yields one text `hello`; Anthropic `thinking_delta` routed to `onThinking`; `finish_reason:'length'` → `truncated:true`; `httpErrorHint(401,…)` mentions API key.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implement (use `TextDecoder` with `{stream:true}`); read `claude-api` skill for current Anthropic model ids + thinking params before writing the Anthropic builder.
- [ ] Step 4: run → PASS.
- [ ] Step 5: commit `Add provider catalog, SSE streaming and connection diagnostics`.

### Task 4: Prompt builder + agent session (repair loop)

**Files:**
- Create: `dawCAT/src/agent/prompt.js`, `dawCAT/src/agent/session.js`
- Test: `dawCAT/tests/session.test.mjs`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces (`prompt.js`): `MODES` (`compose, remix, sfx, mix, ask, free` → `{label, hint, guidance, chips[]}`), `buildSystemPrompt(mode) → string`, `compactContext(context, detail) → object`, `chooseDetail(contextChars, nCtx) → 'full'|'compact'|'minimal'`, `buildUserMessage({prompt, context, mode}) → string`, `estimateTokens(str) → number`.
- Produces (`session.js`): `class AgentSession extends EventTarget` — `constructor({fetchImpl, getSettings, getContext, executePlan, nCtx?})`, `turns`, `send(prompt, mode) → Promise<turn>`, `stop()`, `applyTurn(id)`, `retry(id)`, `reset()`, `toJSON()/load(json)`. Events (`CustomEvent` detail = turn): `turn`, `delta`, `status`. Turn status values: `streaming | repairing | applied | review | answered | failed | stopped`.

- [ ] Step 1: tests (fake fetch returning JSON or SSE bodies, `installDomShims`) — bad JSON then good → turn `applied`, `attempts===2`, second request's last user message contains the validation error; plan whose `executePlan` throws once → repaired and applied; `repairAttempts:0` → `failed`; `applyMode:'review'` → `review` and `executePlan` not called until `applyTurn`; `{reply:'...',actions:[]}` → `answered`; second `send` includes previous turn summary in messages; truncated response → `failed` with message containing `Max tokens`.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implement.
- [ ] Step 4: run → PASS.
- [ ] Step 5: commit `Add agent session with streaming, history and self-repair loop`.

### Task 5: Plan executor + project migration

**Files:**
- Create: `dawCAT/src/agent/executor.js`
- Modify: `dawCAT/src/state.js` (`migrateProject` adds `sfx: []`; `defaultProject` adds `sfx: []`; AppState gets `addSfx/updateSfx/removeSfx/sfxById`), `dawCAT/src/main.js` (remove inline executor, build context via executor)
- Test: `dawCAT/tests/executor.test.mjs`

**Interfaces:**
- Consumes: `theory.js`, `schema.js`, Task 6's `normalizePatch`/`createPatch` (implement Task 6 patches first if needed — executor imports `../sfx/patches.js`).
- Produces: `class PlanExecutor { constructor(state); buildContext({mode, selectedSfxId}) → object; execute(plan) → {count, created:{tracks,clips,sfx}} }` (wraps `state.applyBatch`; errors prefixed `Action N (type):`).

- [ ] Step 1: tests — `addTrack`+`addChordProgression {chords:['C','G','Am','F'],beatsPerChord:4}` → clip with 12 notes, length 4 bars; `addDrumPattern {groove:'backbeat'}` on drum track → snare hits at steps 4,12; `addClip` with `phrase` creates notes; `transposeClip {semitones:12}` shifts midi; `addAutomation {param:'volume', ramp:{from:0,to:1,startBar:0,endBar:4}}` writes points; `addSfx {template:'collect'}` adds to `project.sfx`; `placeSfx` creates clip `sample:'sfxp:<id>'`; failing action at index 2 → project deep-equals pre-plan snapshot, error starts `Action 3 (`; v1 project via `loadJSON` gets `sfx: []`.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implement; move `buildStepsFromPattern`/`compactSteps` here.
- [ ] Step 4: run → PASS.
- [ ] Step 5: commit `Move agent plan execution into a tested executor with composition helpers`.

### Task 6: SFX runtime + patches

**Files:**
- Create: `dawCAT/src/sfx/runtime.js`, `dawCAT/src/sfx/patches.js`
- Test: `dawCAT/tests/sfx.test.mjs` (fake AudioContext recording node creation and AudioParam calls)

**Interfaces:**
- Produces (`runtime.js`): `sfxRuntime() → { play(ctx, dest, patch, when, opts={variation:0, gain:1}) → {stopAt, nodes}, duration(patch) → seconds, normalize(patch) → patch }` — self-contained, no free identifiers besides globals (`Math`, `Float32Array`).
- Produces (`patches.js`): `SFX_CATEGORIES`, `SFX_TEMPLATES` (id → patch factory, ≥ 20 ids from spec §8), `createPatch(templateId='blank', overrides) → patch`, `normalizePatch(p) → patch` (delegates to runtime normalize), `newLayer(kind) → layer`.

- [ ] Step 1: tests — `normalizePatch({layers:[{freq:0, env:{attack:-1}, repeat:{count:1000}}]})` → freq ≥ 20, attack ≥ 0, repeat.count ≤ 16, no NaN anywhere (deep scan); `duration` of template `collect` > 0 and < 5; `play` on fake ctx never passes NaN/negative times to AudioParam methods for every template; `new Function('return ' + sfxRuntime.toString())()` yields working runtime (proves self-containment); same seed → identical noise buffer contents.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implement (seeded mulberry32 PRNG; Karplus-Strong pluck rendered into an AudioBuffer).
- [ ] Step 4: run → PASS.
- [ ] Step 5: commit `Add procedural SFX runtime and starter patch templates`.

### Task 7: SFX export + ZIP

**Files:**
- Create: `dawCAT/src/sfx/export.js`, `dawCAT/src/zip.js`
- Test: `dawCAT/tests/export.test.mjs`

**Interfaces:**
- Consumes: Task 6.
- Produces: `generateSfxModule(patches) → string`, `sfxHotSwapSnippet(patches) → string`, `sfxManifest(patches, files) → object`, `sfxSlug(name) → string`; `zip.js`: `crc32(Uint8Array) → number`, `createZip(entries:{name, data:Uint8Array|string}[]) → Uint8Array`.

- [ ] Step 1: tests — `crc32('123456789' bytes) === 0xCBF43926`; zip starts with `PK\x03\x04`, ends with EOCD record whose entry count equals input length; generated module, after stripping `export ` keywords, parses with `new Function`; snippet parses with `new Function`; module contains each patch name; `installSfxOverrides` present only when a patch has `gameHook`.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implement.
- [ ] Step 4: run → PASS.
- [ ] Step 5: commit `Add SFX game module, hot-swap snippet and ZIP pack export`.

### Task 8: Engine integration (transport, render, clips)

**Files:**
- Modify: `dawCAT/src/engine/core.js` (`sfxPatch(trackId, patch, when, gain, variation)`), `dawCAT/src/engine/transport.js` (`sfxp:` clips → `kind:'sfxPatch'` events, round-robin variation), `dawCAT/src/engine/render.js` (same in `scheduleClipContent`; export `renderSfxToBuffer(patch, {variation}) → AudioBuffer`), `dawCAT/src/ui/arrangement.js` (drop kind `sfxPatch`, clip label/colour for sfx clips), `dawCAT/src/main.js` (export dialog warns about SFX clips)
- Test: extend `dawCAT/tests/executor.test.mjs` — transport event builder given a clip whose patch was deleted yields no `sfxPatch` event and does not throw.

- [ ] Step 1: write the failing test (extract the event-building loop into an exported pure `buildClipEvents(project, track, clip)` in transport.js so it is testable).
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implement.
- [ ] Step 4: run → PASS; syntax-check all modules.
- [ ] Step 5: commit `Play designed SFX patches from the timeline and in WAV renders`.

### Task 9: Sound Design view

**Files:**
- Create: `dawCAT/src/ui/sfx-designer.js`
- Modify: `dawCAT/index.html` (tab + view), `dawCAT/styles.css`, `dawCAT/src/ui/common.js` (`makeKnob` gains `log: true` option), `dawCAT/src/ui/browser.js` (Sound Design category), `dawCAT/src/main.js` (construct view, export-pack + WAV actions, `Ctrl+K`), `dawCAT/src/ui/transport-ui.js` (File ▸ Export SFX Pack…, Audio ▸ Sound Design)

**Interfaces:**
- Consumes: Tasks 6–8; `app.openAgent({mode:'sfx', sfxId})` from Task 10.
- Produces: `class SfxDesigner { constructor(app); select(id); render() }`.

- [ ] Step 1: implement the view per spec §8 (list, header, waveform + layer lanes, layer cards, master section, actions).
- [ ] Step 2: browser smoke (Task 11 harness): open Sound Design tab, create from each template, preview, render waveform, place on timeline; console has no errors.
- [ ] Step 3: commit `Add the Sound Design view for procedural game SFX`.

### Task 10: Agent panel rewrite

**Files:**
- Modify: `dawCAT/src/ui/agent-panel.js` (rewrite over `AgentSession`), `dawCAT/index.html` (panel markup), `dawCAT/styles.css`, `dawCAT/src/main.js` (wire `PlanExecutor`, `openAgent({mode, sfxId, prompt})`)

**Interfaces:**
- Consumes: Tasks 2–5.
- Produces: `class AgentPanel { constructor(app); open(opts); close(); toggle(); isOpen() }`.

- [ ] Step 1: implement per spec §9 — keep ids `agent-panel`, `agent-provider`, `agent-base-url`, `agent-api-key`, `agent-model`, `agent-model-select`, `agent-scan-models`, `agent-prompt`, `agent-send`, `agent-stop`, `agent-state`.
- [ ] Step 2: v1 settings migration: read old sessionStorage key once, write new per-provider store `dawcat-agent-v2`.
- [ ] Step 3: browser smoke with a mock OpenAI-compatible SSE server (Node `http`, CORS on): connection test shows model + n_ctx; send in Compose mode applies a plan; a deliberately broken first reply is repaired; Ask mode shows a reply with no changes; Undo reverts.
- [ ] Step 4: commit `Rebuild the AI agent panel as a streaming, multi-turn chat`.

### Task 11: Docs + end-to-end verification

**Files:**
- Modify: `dawCAT/README.md`
- Create (scratchpad, not repo): Edge CDP smoke driver + mock LLM server

- [ ] Step 1: README — new sections: Sound Design, Agent 2.0 (providers table, modes, notation, repair loop, review mode, diagnostics), tests (`cd dawCAT && npm test` / `node tests/run.mjs`).
- [ ] Step 2: run `node tests/run.mjs` → all pass; syntax-check every module; full browser smoke → no console errors.
- [ ] Step 3: commit `Document dawCAT Asset Studio and Agent 2.0`.
