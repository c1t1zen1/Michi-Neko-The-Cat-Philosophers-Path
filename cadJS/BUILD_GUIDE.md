# cadJS — BUILD GUIDE: Data-Driven Assets & Direct-to-Game Editing

**Date:** 2026-09-29
**Scope:** cadJS + the game-side asset pipeline (`src/`)
**Goal:** Open cadJS → pick a character, item, or building → adjust it (e.g. Michi's
collar) → click **Save to Game** → the change is written into the game's own
files and shows up in `git diff`. No override layer.
**Audience:** Humans and parallel AI agents. Every workstream owns a disjoint set
of files so a swarm can work at once without editing the same file.

---

## TL;DR for agents

1. Read **Part 1** (why), **Part 2** (locked decisions), and **Part 3** (format spec) before touching code.
2. Find your workstream in **Part 6**. Only edit files your workstream **owns** (Part 5 matrix).
3. Respect the **wave order** in Part 4 — do not start an item whose `depends-on` is unchecked.
4. Every item has **Acceptance** criteria. An item is `- [x]` only when those are verified with the commands in **Part 7**.
5. Need a change in a file you don't own? Write a **coordination note** at the bottom of this file (Part 10) — don't edit it.
6. Keep the cache-busting `?v=` tags in sync (see Part 8). Never re-encode files on Windows with PowerShell.

### Status legend
`- [ ]` not started · `- [~]` in progress · `- [x]` done & verified · `- [!]` blocked (say why) · `- [?]` needs a human decision

---

## Part 1 — Why: how AAA pipelines do this

Professional engines separate **code** from **content**:

| | Code | Content (data) |
|---|---|---|
| Answers | *How* things behave | *What* things are |
| Example | "The collar follows the neck; the bell swings." | "Collar = torus r 0.072, tube 0.012, tilted 83.7°, ribbon material." |
| Unity | C# scripts | `.prefab`, `.asset`, `.unity` scene files |
| Unreal | C++ / Blueprint logic | `.uasset` (meshes, materials, anim), `.umap` |
| Godot | GDScript | `.tscn`, `.tres` |
| **Michi-Neko (target)** | `src/cat.js`, `src/world/*.js` | `src/assets/*.def.js` |

The editor **only reads and writes content files**. Every part has a stable
name/ID, so the editor never has to find "the line of code that made this."
Animation is content too: poses and clips are data that artists tune without
touching code. Scenes/levels are data too: a list of "put asset X here, rotated Y."

**Today's problem:** Michi-Neko keeps content numbers *inside* code
(`new THREE.TorusGeometry(0.072, 0.012, 8, 20)` at `src/cat.js:529-535`), so cadJS
can either rewrite code (fragile: expressions like `Math.PI / 2.15`, loops,
shared materials) or patch on top of it (`cad-overrides.json`: the patch never
becomes the real value, and it drifts from the source). This guide moves the
numbers into data files that cadJS owns.

### Answers to the design questions

- **"Should we name every part?"** Yes, and it happens automatically: in a def
  file, the part's key (`collar`) *is* its name. The runtime sets
  `object.name` and `userData.assetRef` from it. Names alone don't solve
  saving; the data file does.
- **"Should each item/character/building get its own .js file?"** Yes, for
  *organization and swarm parallelism* (WS-5 splits `countryside.js`, 3,479
  lines, into `src/world/*.js`). But splitting code alone does **not** solve line
  location. The per-asset **data** file (`.def.js`) is what solves it.
- **"Will more files make loading slower?"** Not noticeably. ES modules over a
  local or HTTP/2 server load in parallel; ~30–60 extra small modules add
  milliseconds. It becomes a concern only at hundreds of modules, and then a
  one-line bundling step (esbuild) fixes it. Keep all imports static (no
  waterfalls of dynamic imports) and it stays fast.
- **"Can cadJS handle loops and animation framing?"** Yes, once loops become
  data (`arrays`: "4 legs with these per-leg values") and poses become data
  (`poses` + `poseChannels`). See Part 3.

---

## Part 2 — Locked decisions (don't re-litigate without a human)

- **D1. Content lives in `src/assets/<assetId>.def.js`.** Each file is a JS module
  with `export default { … }` containing **pure data only**: numbers, strings,
  booleans, `null`, arrays, plain objects. No expressions, no function calls, no
  imports, no computed keys. *Why JS not JSON:* the game builds synchronously
  today; a static `import` needs no `fetch`, keeps the `?v=` cache-busting scheme,
  and needs no JSON import attributes (patchy browser support).
- **D2. cadJS writes def files through a deterministic serializer** (Part 3.6).
  Same input → byte-identical output. Key order is preserved, so edits produce
  minimal one-line diffs.
- **D3. Builders become interpreters.** `src/cat.js` etc. read their def and
  build from it. Custom geometry (the cat's fur capsules, kawara roofs) stays in
  code as **registered shape factories** that take def params.
- **D4. Stable identity = `assetId` + `partKey` (+ `index` for arrays)**, stamped
  on every built object as `object.userData.assetRef`. Never rely on child-index paths.
- **D5. Rotations are stored in degrees** (`rotationDeg`), colors as `'#rrggbb'`,
  numbers rounded to 6 decimal places with trailing zeros trimmed.
- **D6. Git is the undo system for saved changes.** cadJS shows a diff preview
  before every write and refuses to write if the file changed on disk since it
  was loaded (hash check → HTTP 409).
- **D7. `cad-overrides.json` is retired** once every overridable asset is def-backed
  (WS-8). Until then the old loader stays, untouched, for backward compatibility.
- **D8. What can't be data stays code, exposed as `params`.** Procedural scatter
  (grass, bamboo, forests) keeps its algorithm in code; its density, seed, and
  color numbers move into `params` so cadJS can tune them.
- **D9. No new runtime dependencies in the game.** cadJS server stays
  zero-dependency Node too (the serializer and validator are hand-written).
- **D10. Parity first.** Migrating an asset must not change how it looks. Each
  migration captures a golden snapshot *before* and proves equality *after*
  (Part 7.3) before anyone makes creative edits.

---

## Part 3 — Asset Definition format (the contract)

### 3.1 File layout

```
src/
  asset_schema.js        ← validator + defaults (no THREE import; usable in Node & browser)
  asset_runtime.js       ← buildFromDef(), shape registry, assetRef stamping, pose apply
  assets/
    cat.def.js           ← character (player + NPC cats via variants)
    tea-house.def.js     ← building
    toro-lantern.def.js  ← prop
    secret-key.def.js    ← item
    layouts/
      kyoto-village.def.js   ← placements: which asset goes where
  world/                 ← split from countryside.js (WS-5), one builder module per asset family
    tea_house.js
    torii.js
    …
cadJS/
  src/def-serializer.mjs ← deterministic writer (Node + browser)
  src/asset-store.mjs    ← server-side read/validate/write of def files
  src/asset-editor.mjs   ← asset browser + def-bound inspector (browser)
  src/pose-editor.mjs    ← pose mode (browser)
  tests/*.test.mjs
```

### 3.2 Top-level shape

```js
// src/assets/cat.def.js
// cadJS-managed data file. Edit in cadJS or by hand; keep it pure data.
export default {
  format: 'michi-neko-asset',   // fixed
  version: 1,                   // schema version (bump + migrate if the schema changes)
  id: 'cat',                    // must equal filename stem
  kind: 'character',            // character | prop | building | item | fx | layout
  label: 'Cat (Michi & NPCs)',
  builder: 'src/cat.js#Cat',    // which code interprets this def (informational + cadJS import hint)

  params:    { … },   // free-form tunables the builder reads (numbers/strings/bools)
  materials: { … },   // named materials, referenced by parts
  parts:     { … },   // named single parts (tree via `parent`)
  arrays:    { … },   // repeated parts: legs, tail segments, lanterns on a string
  variants:  { … },   // named overrides of params/materials (player vs NPC palettes)
  poses:     { … },   // named poses (animation framing)
  poseChannels: { … },// how pose keys map onto parts (so cadJS can edit poses visually)
  anchors:   { … }    // sockets: where other assets attach (hat, carried item)
};
```

Only `format`, `version`, `id`, `kind` are required. Everything else is optional.

### 3.3 Parts

```js
materials: {
  ribbon:    { type: 'toon', color: '#d63228' },
  bellBrass: { type: 'toon', color: '#b08a4a', emissive: '#40300a', emissiveIntensity: 0.15 },
  fur:       { type: 'custom', factory: 'catFur' }      // code-built material, def just names it
},

parts: {
  neck:       { parent: 'chest', shape: 'group', position: [0, 0.08, 0.14] },
  collar:     { parent: 'neck', shape: 'torus',
                args: { radius: 0.072, tube: 0.012, radialSegments: 8, tubularSegments: 20 },
                position: [0, 0.015, 0.02], rotationDeg: [83.72, 0, 0],
                material: 'ribbon' },
  collarBell: { parent: 'neck', shape: 'sphere',
                args: { radius: 0.016, widthSegments: 10, heightSegments: 8 },
                position: [0, -0.06, 0.085], material: 'bellBrass' },
  neckFur:    { parent: 'neck', shape: 'catCapsule',             // registered custom shape
                args: { r: 0.058, len: 0.11, furKind: 'torso' },
                position: [0, 0.05, 0.045], rotationDeg: [69.23, 0, 0],
                material: 'fur', outline: 1.05 }
}
```

**Part fields:** `parent` (part key, or omitted = asset root) · `shape`
(`group` | built-in primitive | registered custom shape) · `args` (shape
parameters, named) · `position` · `rotationDeg` · `scale` (number or `[x,y,z]`) ·
`material` (key) · `visible` · `castShadow` · `receiveShadow` · `outline`
(number, cat toon outline) · `tags` (string[], free-form, e.g. `['cosmetic']`).

**Built-in shapes** (map 1:1 to THREE constructors, args named after THREE's
parameter names): `box`, `sphere`, `cylinder`, `cone`, `torus`, `plane`,
`capsule`, `circle`, `ring`, `lathe` (args.points: `[[x,y],…]`), `extrude`
(args.shape: `[[x,y],…]`, args.depth).

**Custom shapes** are registered by builder code:
`registerShape('catCapsule', (args, material, ctx) => THREE.Object3D)`. cadJS
shows their `args` as editable fields and rebuilds by calling the same factory.

### 3.4 Arrays (loops as data)

```js
arrays: {
  legs: {
    parent: 'body',
    count: 4,
    template: 'catLeg',                 // custom shape factory that builds one leg rig
    shared: { upperLen: 0.16, lowerLen: 0.14, pawRadius: 0.035 },  // same for all
    items: [                            // per-index values; length must equal count
      { label: 'Front Left',  position: [ 0.07, 0, 0.16] },
      { label: 'Front Right', position: [-0.07, 0, 0.16] },
      { label: 'Back Left',   position: [ 0.07, 0, -0.16] },
      { label: 'Back Right',  position: [-0.07, 0, -0.16] }
    ]
  }
}
```

Built objects carry `userData.assetRef = { assetId: 'cat', part: 'legs', index: 2 }`.
cadJS shows them as **Legs › Back Left**. Editing one writes `items[2]`; editing a
`shared` field (inspector toggle "apply to all") writes `shared`.

**Symmetry helper (optional, later):** `mirror: 'x'` on an array lets `items`
hold only the left side; cadJS edits mirror automatically.

### 3.5 Variants, poses, anchors

```js
variants: {
  michi: { materials: { ribbon: { color: '#d63228' } }, params: { furColor: '#c4915a' } },
  luna:  { materials: { ribbon: { color: '#315d80' } }, params: { furColor: '#9a9a9a' } }
},
```
Variants are **deep-merged** over the base (objects merge, arrays and scalars
replace). The player uses `variant: 'michi'`; NPCs pass their own. This moves the
palette literals now in `src/player.js:25` and `src/npc.js:25` into data.

```js
poses: {
  sit:   { bodyY: -0.10, chestY: 0.41, hipsY: 0.39, headY: 0.14, headRotX: 0.05,
           tailRootX: 0.55, legRootX: [-0.6, -0.6, 0.75, 0.75], legKneeX: [-0.9, -0.9, 0.85, 0.85] },
  groom: { … }, stretch: { … }, yawn: { … }
},
poseChannels: {
  // pose key → which part/property it drives, so cadJS can pose the rig visually
  bodyY:     { part: 'body',     property: 'position.y' },
  headRotX:  { part: 'head',     property: 'rotation.x' },
  legRootX:  { array: 'legs', sub: 'root', property: 'rotation.x' },   // array-valued key
  legKneeX:  { array: 'legs', sub: 'knee', property: 'rotation.x' }
},
anchors: {
  mouth: { parent: 'muzzle', position: [0, -0.01, 0.04] },   // carried items attach here
  hat:   { parent: 'head',   position: [0, 0.09, 0] }
}
```

`poses` keeps the **existing key vocabulary** of `Cat.getIdlePose()`
(`src/cat.js:958`) so the animation code barely changes: it reads values instead
of hard-coding them. `poseChannels` is what lets cadJS drag the head and write
`headRotX` back. Pose values stay in **radians** (they are animation offsets,
not authored transforms). `poseChannels` should document the exact part/sub-part
each key drives; WS-3 must confirm these against the real rig.

### 3.6 Serializer rules (`cadJS/src/def-serializer.mjs`)

- Output: header comment (preserved verbatim from the existing file, or the
  default two-line header) + `export default ` + object literal + `;\n`.
- 2-space indent. Single-quoted strings. Unquoted keys when they are valid identifiers.
- **Short arrays of scalars and small leaf objects stay on one line** (≤ 100 chars),
  so `position: [0, 0.015, 0.02]` stays readable and diffs stay one line.
- Numbers: `Number(x.toFixed(6))`, trailing zeros trimmed, `-0` → `0`.
- Key order: preserve the order of the loaded object; new keys go at the end.
- Round-trip law: `serialize(parse(file)) === file` for any file the serializer
  wrote. Tested.
- Comments inside the object are **not** preserved. Put explanations in builder
  code or in a `notes: '…'` string field.

### 3.7 Game runtime API (`src/asset_runtime.js`)

```js
registerShape(name, factory)                 // custom shape: (args, material, ctx) => Object3D
registerMaterial(name, factory)              // custom material: (spec, ctx) => Material
resolveDef(def, variantName?)                // deep-merge a variant; returns a new object
buildFromDef(def, { variant, ctx, materials }) // → { root, parts: Map<key,Object3D>, arrays: Map<key,Object3D[]>, materials: Map }
stampAssetRef(object, assetId, part, index?) // sets userData.assetRef + object.name
applyPose(built, def, poseName, weight=1)    // uses poseChannels; for cadJS preview & game
degToRadVec(arr)                             // helpers shared with cadJS
```

Builders can mix: `buildFromDef` for the declarative parts, then custom code for
behavior, using `built.parts.get('collarBell')` instead of local variables.
Every asset class accepts an optional `def` in its constructor options
(`new Cat({ variant: 'michi', def: workingCopy })`), which is how cadJS previews
unsaved edits using the game's **real** builder.

### 3.8 Validator API (`src/asset_schema.js`)

```js
validateAssetDef(def) → { ok: boolean, errors: [{ path: 'parts.collar.args.radius', message }], warnings: [...] }
isPureData(value)     → boolean   // rejects functions, class instances, NaN, Infinity, undefined
```
Checks: required fields; `id` matches `^[a-z0-9][a-z0-9-]*(/[a-z0-9-]+)*$`;
parents exist and form no cycles; `material` keys exist; `arrays.*.items.length === count`;
`poseChannels` keys reference real parts/arrays; vectors have 3 finite numbers;
colors match `^#[0-9a-f]{6}$`.

### 3.9 cadJS server API

| Method & path | Body | Returns |
|---|---|---|
| `GET /api/assets` | — | `[{ id, kind, label, file, hash }]` from `src/assets/**/*.def.js` |
| `GET /api/assets/:id` | — | `{ id, file, hash, def, source }` (`def` parsed, `source` raw text) |
| `POST /api/assets/:id/preview` | `{ def }` | `{ ok, errors, warnings, diff }`: unified diff vs disk, nothing written |
| `PUT /api/assets/:id` | `{ def, baseHash }` | `200 { ok, hash, diff }` · `400` invalid · `409` file changed on disk since `baseHash` |

**Parsing a def file on the server:** strip the header comment and the
`export default` prefix and trailing `;`, then parse with a small, strict
pure-data literal parser in `def-serializer.mjs` (objects, arrays, strings,
numbers, booleans, null; identifier or quoted keys; trailing commas allowed).
**Never `eval` or `import()` user files on the server.**

**Write safety:** only paths matching `src/assets/**/*.def.js` under the repo
root; reject `..`; write via temp file + rename (atomic); validate before writing.

---

## Part 4 — Waves (dependency order for the swarm)

```
Wave 0 (serial, 1 agent):   WS-0 Foundation ── contracts, validator, runtime, serializer
                                   │
Wave 1 (parallel):          WS-1 Server API    WS-3 Cat pilot    WS-5 Countryside split
                                   │                 │                   │
Wave 2 (parallel):          WS-2 cadJS Asset Editor (needs WS-1 + WS-3)  │
                                   │                                     │
Wave 3 (parallel):          WS-4 Pose Editor   WS-6a..n asset migrations (one agent per world module)
                                   │                                     │
Wave 4 (parallel):          WS-7 Layouts/placements                     │
                                   │                                     │
Wave 5 (serial):            WS-8 Retire overrides  →  WS-9 Docs & tag sync (final)
```

**Critical path to the user's first win ("edit the collar, click save"):**
WS-0 → WS-1 + WS-3 → WS-2 (items 2.1–2.6). Everything else can follow.

---

## Part 5 — File ownership matrix

| File / glob | Owner | Notes |
|---|---|---|
| `src/asset_schema.js`, `src/asset_runtime.js` | **WS-0** | Frozen after Wave 0; later changes via coordination note → WS-0 owner (or a human) |
| `cadJS/src/def-serializer.mjs`, `cadJS/tests/def-serializer.test.mjs`, `cadJS/tests/asset-schema.test.mjs` | **WS-0** | |
| `cadJS/server.mjs`, `cadJS/src/asset-store.mjs`, `cadJS/tests/asset-store.test.mjs` | **WS-1** | WS-8 edits `server.mjs` later (removes `/api/overrides`) |
| `cadJS/src/app.mjs`, `cadJS/src/asset-editor.mjs`, `cadJS/index.html`, `cadJS/styles.css` | **WS-2** | WS-4 adds `pose-editor.mjs` and asks WS-2 for a hook (coordination note) |
| `cadJS/src/pose-editor.mjs` | **WS-4** | |
| `src/cat.js`, `src/assets/cat.def.js`, `src/player.js`, `src/npc.js` | **WS-3** | player/npc only for the `variant:` switch |
| `src/countryside.js`, `src/world/*.js` (creation) | **WS-5** | After WS-5 lands, each `src/world/<x>.js` is owned by exactly one WS-6 agent |
| `src/world/<module>.js` + `src/assets/<asset>.def.js` | **WS-6-<module>** | One agent per module. Claim it in Part 6 before starting |
| `src/vegetation.js`, `src/foliage.js` | **WS-6-vegetation** | `params` only (D8) |
| `src/interior.js`, `src/ambient_life.js`, `src/sky.js`, `src/particles.js` | **WS-6-<file>** | Lower priority; `params` extraction |
| `src/assets/layouts/*.def.js`, `src/layout_runtime.js` | **WS-7** | |
| `src/main.js` | **WS-8** | Everyone else: coordination note only |
| `src/cad_overrides.js`, `cad-overrides.json` | **WS-8** | Deleted at the end |
| `index.html`, `AGENTS.md`, `cadJS/README.md`, this guide's checkboxes | **WS-9** | Any agent may tick **its own** checkboxes here |

---

## Part 6 — Workstreams & checklists

### WS-0 · Foundation (Wave 0, one agent, blocks everything)

- [ ] **0.1 Validator** `src/asset_schema.js`: `validateAssetDef`, `isPureData`, `SHAPES` list of built-in shape names with their arg names/defaults. No THREE import.
  *Acceptance:* `cadJS/tests/asset-schema.test.mjs` covers every rule in 3.8 (≥1 passing and ≥1 failing fixture each).
- [ ] **0.2 Serializer + parser** `cadJS/src/def-serializer.mjs`: `serializeDef(def, { header })`, `parseDefSource(text) → { header, def }`, `hashSource(text)` (sha-256 hex via `node:crypto` on the server / `crypto.subtle` in the browser, choose one implementation per side), `unifiedDiff(a, b)` (small line-based LCS, no deps).
  *Acceptance:* round-trip law holds on 5+ fixtures, including the full example from Part 3; malicious inputs (`process.exit()`, `` `${x}` ``, `a: b`, `__proto__` keys) are rejected; numbers format per D5.
- [ ] **0.3 Runtime** `src/asset_runtime.js`: everything in 3.7. Built-in shapes map to THREE geometries using THREE's own parameter names. `buildFromDef` stamps `assetRef` and `name` on every part and array item. Materials: `toon` type is registered by `cat.js` (it owns `toonMat`), `standard` built in.
  *Acceptance:* a scratch def with a group, a torus child, a 3-item array and a pose builds in the browser; `applyPose` moves the right parts; a def with an unknown shape throws a readable error naming the part.
- [ ] **0.4 Import-map sanity:** confirm `src/assets/*.def.js` and `src/world/*.js` load with `?v=` tags from `index.html` in the game and from `cadJS/index.html` (paths `../src/...`). Document the exact import form for other agents in Part 10.
- [ ] **0.5 Freeze:** mark Part 3 as frozen v1 (edit the heading). From now on, schema changes need a human.

### WS-1 · cadJS server asset API (Wave 1)

- [ ] **1.1** `cadJS/src/asset-store.mjs`: `listAssets(repoRoot)`, `readAsset(id)`, `previewAsset(id, def)`, `writeAsset(id, def, baseHash)` exactly as in 3.9, using WS-0's parser/serializer/validator.
- [ ] **1.2** Wire routes into `cadJS/server.mjs` (`/api/assets…`). Keep `/api/overrides` working, untouched.
- [ ] **1.3** Atomic write (temp + rename) and path allow-list; 409 on hash mismatch; 400 with validator `errors` on invalid defs.
- [ ] **1.4** Tests `cadJS/tests/asset-store.test.mjs` against a temp directory: list, read, preview diff, write, 409 conflict, traversal rejection (`../../etc`), non-def path rejection.
- [ ] **1.5** Add the new test files to `npm test` in `cadJS/package.json`. Fix the `check` script so it works on macOS (`set X=1&&` is Windows-only; use `CADJS_VALIDATE=1 node …` or `cross-platform` via `node -e "process.env.CADJS_VALIDATE='1'; …"`).
  *Acceptance (WS-1):* `cd cadJS && npm test` green; `curl -s localhost:4173/api/assets` lists `cat` once WS-3 lands.

### WS-3 · Cat pilot: first def-backed asset (Wave 1, parallel with WS-1)

- [ ] **3.1 Golden snapshot BEFORE any change** (Part 7.3) for variants: player (Michi), each NPC cat, and cadJS's showcase cat. Commit under `cadJS/tests/golden/cat.*.json`.
- [ ] **3.2 Create `src/assets/cat.def.js`**. Move literals from `buildTorso/buildHead/buildLegs/buildTail` (`src/cat.js:428-800`) into `parts`, `arrays` (legs, tail segments, eyes, pupils, ears), and `materials`. Convert `Math.PI / k` rotations to `rotationDeg`.
- [ ] **3.3 Register cat custom shapes/materials** in `src/cat.js`: `catCapsule`, `catBall`, `catLeg`, `catFur`, `toon`, `catEye`, outline handling via the `outline` field.
- [ ] **3.4 Rewrite the builder** to `buildFromDef` + existing behavior code. Keep the public fields (`this.collar`, `this.collarBell`, `this.legs`, `this.head`, …) as aliases of `built.parts.get(...)` so the rest of the game (`setMasterCat()` at `src/cat.js:1019`, `progression.js`, `player.js`) doesn't change.
- [ ] **3.5 Variants:** move palettes from `src/player.js:25` and `src/npc.js:25` into `variants`; those files now pass `variant: '<name>'`. The `Cat` constructor still accepts explicit colors (explicit options win over the variant) for backward compatibility.
- [ ] **3.6 Poses:** move `getIdlePose()` numbers (`src/cat.js:958+`) into `poses`; write `poseChannels` after confirming which object each key drives in the animation code. `getIdlePose(name)` returns a copy of `def.poses[name]` merged over the neutral pose.
- [ ] **3.7 Gait/animation tunables** (stride, bob, tail sway amplitudes, blink timing) → `params.animation`. Code keeps the math.
- [ ] **3.8 `def` constructor option** for cadJS live preview (3.7 contract).
- [ ] **3.9 Parity:** golden snapshots from 3.1 match within tolerance (Part 7.3). Browser smoke suites still pass (44/44).
  *Acceptance (WS-3):* no visual change in-game; `src/cat.js` contains no geometry/transform/color literals for the parts listed in the def; a hand edit of `collar.args.radius` in the def file shows in-game after reload.

### WS-2 · cadJS Asset Editor: the one-click round trip (Wave 2)

User story: *"Open cadJS → Assets → Cat → select Collar → drag / type values → Save to Game (1 change) → see diff → Confirm → game reloads with the new collar."*

- [ ] **2.1 Asset browser panel** (`cadJS/src/asset-editor.mjs`): lists `/api/assets` grouped by `kind`, with search. Existing catalog entries whose `builder` matches a def show a **"Data-backed"** badge; others show "Code-only (read-only)".
- [ ] **2.2 Open an asset:** fetch the def, import the builder named in `def.builder`, construct it with `{ def: workingCopy, variant }` into the CAD viewport. A **variant dropdown** switches the preview.
- [ ] **2.3 Named tree:** hierarchy built from the def (`parts` tree + `arrays` as expandable groups with item labels), not from raw THREE children. Selecting a tree row or clicking the mesh selects the same part (via `userData.assetRef`).
- [ ] **2.4 Def-bound inspector:** for the selected part show `position`, `rotationDeg`, `scale`, shape `args` (from the `SHAPES` table or the custom shape's arg list), `material` (dropdown + that material's fields), `visible`, shadows. Edits write to the **working copy** of the def and trigger a debounced (~100 ms) rebuild through the game's real builder. Gizmo drags write the object's local transform back on drag end (rounded per D5).
- [ ] **2.5 Shared-material warning:** editing a material used by N>1 parts shows "Shared by N parts: Collar, …  [Edit shared] [Make unique]". Make unique = clone into `materials.<part>Material` and repoint that part.
- [ ] **2.6 Save to Game:** button label shows the change count. Click → `POST /preview` → modal with the unified diff → **Confirm** → `PUT` with `baseHash` → on 200: reload the game iframe (`frame.contentWindow.location.reload()`), status `SAVED cat.def.js (+1 −1)`. On 409: offer **Reload from disk** or **Overwrite anyway** (re-fetch hash, then PUT). On 400: list validator errors next to the fields.
- [ ] **2.7 Undo/redo** integrates with the existing `history` (edits to the working copy are undoable; saved writes are undone with git, stated in the diff modal).
- [ ] **2.8 Unsaved-changes guard** on switching asset / closing tab (reuse the pattern from commit 338eb13).
- [ ] **2.9 Array editing:** item selection edits `items[i]`; "apply to all" toggle writes `shared`; count changes allowed only when the array's template supports it (flag `resizable: true` in the def).
- [ ] **2.10 Tools that can't round-trip** (vertex distortion ops, texture painting) are disabled on def-backed parts with a tooltip explaining why (see Part 9 for the later plan).
- [ ] **2.11 Live-game jump:** "Show in game" button selects the same `assetRef` in the runtime scene tree (the game objects carry the same stamps).
  *Acceptance (WS-2):* the user story above works end-to-end in ≤ 5 clicks; `git diff` afterwards shows exactly one changed line in `src/assets/cat.def.js`; **no** `cad-overrides.json` is created or modified.

### WS-4 · Pose Editor: animation framing (Wave 3)

- [ ] **4.1 Pose mode toggle** in the Asset Editor for defs with `poses`. A pose dropdown (`neutral`, `sit`, `groom`, …) and a **blend slider 0→1** that calls `applyPose(built, def, name, weight)`.
- [ ] **4.2 Channel-driven gizmo:** selecting a part shows only the pose channels that drive it (e.g. Head → `headRotX`, `headRotY`). Rotate gizmo is constrained to those axes. Edits write `poses.<name>.<key>` (radians) in the working copy.
- [ ] **4.3 Array channels:** selecting Leg 3 edits index 2 of `legRootX`/`legKneeX`.
- [ ] **4.4 New pose:** "Duplicate pose as…" creates `poses.<newName>`; the game ignores unknown poses until code references them (note in the UI).
- [ ] **4.5 Preview playback:** "Play idle cycle" runs the game's own idle-action code on the preview cat for a few seconds so the pose is seen in motion.
- [ ] **4.6 (Later, needs a human decision `[?]`)** Keyframed clips: `clips: { tailFlick: { duration: 0.8, tracks: { tailRootX: [[0, 0.2], [0.4, 0.6], [0.8, 0.2]] } } }` + a timeline scrubber. Only if procedural animation is to be partly replaced.
  *Acceptance (WS-4):* adjust the `sit` pose's head tilt in cadJS, save, sit in-game, and the new tilt shows; the diff touches only `poses.sit`.

### WS-5 · Split `countryside.js` into modules (Wave 1, serial, mechanical)

Pure refactor, **no behavior change**, no def work. It exists so WS-6 agents can work in parallel.

- [ ] **5.1** Golden snapshot of the whole world (Part 7.3, scene-level, names + transforms + geometry params hash per top-level group).
- [ ] **5.2** Move each builder family into `src/world/<name>.js` as `export function buildX(ctx, …)` where `ctx` is the `Countryside` instance (for `addCollider`, `MAT`, `rng`). Suggested modules:
  `machiya.js` (TeaHouse, Residence, SecretMachiya, VillageHouse, Koushi, KawaraRoof, CurvedSlope, Engawa) ·
  `shrine.js` (Torii, Shrine, OfferingBells, MistAltar, WindChime) ·
  `lanterns.js` (ToroLantern, ChochinLantern, Lanterns) ·
  `water.js` (RiverAndBridge, RipplePool, Paddies, water materials) ·
  `paths.js` (Path, WalkwaySlabs, PathBoulders, PathShoulders) ·
  `landscape.js` (Ground, Mountains, DistantPagoda, EdgeForest, MistRing) ·
  `props.js` (ClimbCrates, BambooFence, BambooCorral, ShishiOdoshi, BirdNest, Yarn) ·
  `items.js` (SecretKey, KeyHidingRock) ·
  `street.js` (VillageStreet, StreetGreenery, Village).
  Shared helpers (`mulberry32`, `makeCanvasTexture`, `box`, `panelMaterial`, `MAT`) → `src/world/common.js`.
- [ ] **5.3** `countryside.js` becomes the orchestrator: imports modules, calls them in the original order (**order matters for RNG sequences**; keep the seeded RNG call order identical).
- [ ] **5.4** Parity: world golden snapshot matches; smoke suites 44/44; load time within ±5% (Part 7.4).
- [ ] **5.5** Post the module → owner claim table in Part 10 so WS-6 agents can claim.

### WS-6 · Asset migrations (Wave 3, one agent per module, fully parallel)

Per module, repeat this recipe (it's the WS-3 recipe generalized):

1. Golden snapshot of the asset(s) in that module.
2. Create `src/assets/<asset-id>.def.js` per distinct asset (tea house, torii, toro lantern, …).
3. Custom geometry (kawara roof, koushi lattice) → registered shapes with named `args`.
4. Repeated elements (koushi bars, roof tiles, lantern rows) → `arrays` or shape `args` (`count`, `spacing`).
5. Instance-specific values passed from the orchestrator (x, z, rotY) are **placements**, not asset data. Leave them for WS-7; don't put world positions in asset defs.
6. Parity check, then tick.

Claim a module by writing your agent name next to it:

- [ ] **6-machiya** (tea house incl. the bonsai from commit f9237f2, residence, secret machiya, village house) · owner: ___
- [ ] **6-shrine** · owner: ___
- [ ] **6-lanterns** · owner: ___
- [ ] **6-props** · owner: ___
- [ ] **6-items** (secret key, hiding rock; key `anchors` for pickup) · owner: ___
- [ ] **6-water** (`params` for water materials; bridge as a def) · owner: ___
- [ ] **6-paths** (`params` only: slab size, boulder density, seed) · owner: ___
- [ ] **6-landscape** (`params` only, D8) · owner: ___
- [ ] **6-street** · owner: ___
- [ ] **6-vegetation** (`src/vegetation.js`, `src/foliage.js`: `params` for density/colors/seeds per grove; bonsai/pine shape params) · owner: ___
- [ ] **6-interior** (`src/interior.js`: room layout as def, knockables as `arrays`) · owner: ___
- [ ] **6-ambient** (`src/ambient_life.js`: bird/koi/butterfly body shapes and `params`) · owner: ___
- [ ] **6-npc-extras** (NPC name-tag style, accessories as `anchors` on cat.def) · owner: ___ · depends-on: WS-3

  *Acceptance (each):* parity ✓, smoke 44/44 ✓, asset opens in the cadJS Asset Editor and a one-field edit round-trips to a one-line diff.

### WS-7 · Layouts / placements (Wave 4)

The scene-file equivalent: *where* assets go, separate from *what* they are.

- [ ] **7.1** `src/assets/layouts/kyoto-village.def.js`:
  ```js
  export default {
    format: 'michi-neko-asset', version: 1, id: 'layouts/kyoto-village', kind: 'layout',
    placements: [
      { asset: 'tea-house',    id: 'teaHouse',   position: [12, 0, -8],  rotationDeg: [0, 90, 0] },
      { asset: 'toro-lantern', id: 'lantern-01', position: [4.2, 0, 3.1] },
      …
    ]
  };
  ```
  `id` is the stable placement name (becomes `object.name`, used by quests/colliders/waypoints).
- [ ] **7.2** `src/layout_runtime.js`: `placeLayout(layoutDef, registry)` calls each asset's builder and applies the transform. Colliders/platforms are created by the asset builder relative to its root, so moving a placement moves its colliders.
- [ ] **7.3** Orchestrator (`countryside.js`) reads placements instead of hard-coded `buildX(x, z, rotY)` calls. Parity check.
- [ ] **7.4** cadJS **Layout mode**: open a layout, show all placements, move/rotate them with the gizmo, **duplicate/add/remove placements** (adding content is finally possible, because it's data), save.
- [ ] **7.5** Guardrail check: adding placements must respect "Don't expand the map early; deepen Kyoto first" (AGENTS.md). Layout mode shows the current map bounds.

### WS-8 · Retire the override file (Wave 5, serial)

- [ ] **8.1 Migration tool:** `node cadJS/tools/bake-overrides.mjs`: for each record in `cad-overrides.json`, find the def-backed part by name/assetRef and write its values into the def (through the serializer). Unmatched records are listed, not dropped.
- [ ] **8.2** Remove `applyCadOverrides` from `src/main.js` (lines ~32 and ~228-230), delete `src/cad_overrides.js`, remove `/api/overrides` and `overridesRequest` from `cadJS/server.mjs`, remove "Push to game / Export game overrides" UI (replaced by Save to Game) from `cadJS/src/app.mjs`.
- [ ] **8.3** "Send runtime object to CAD" now opens the **owning asset** in the Asset Editor (via `assetRef`). For code-only objects it shows "This object isn't data-backed yet: see BUILD_GUIDE WS-6".
  *Acceptance:* `grep -rn "cad-overrides\|applyCadOverrides" src cadJS index.html` returns nothing; smoke 44/44.

### WS-9 · Docs, tags, and tooling (final)

- [ ] **9.1** Update `AGENTS.md`: the cache-tag `sed` must cover subfolders: `sed -i '' -E "s/\?v=[0-9a-z]+/?v=TAG/g" src/*.js src/*/*.js src/*/*/*.js index.html` (and the Node one-liner to recurse). Add the def-file rules (pure data, edit via cadJS).
- [ ] **9.2** Update the syntax-check loop to include `src/**/*.js`.
- [ ] **9.3** `cadJS/README.md`: new "Asset Editor", "Pose mode", "Layout mode", "Save to Game" sections; remove override docs.
- [ ] **9.4** `docs/`: add a one-page "How to make a new asset" (def + builder + register) with the lantern as the worked example.
- [ ] **9.5** Bump the `?v=` tag once for the release and verify every import carries it.

---

## Part 7 — Verification protocol

### 7.1 Every change
```sh
for f in src/*.js src/*/*.js src/*/*/*.js; do [ -f "$f" ] && { node --input-type=module --check < "$f" >/dev/null || echo "FAIL $f"; }; done
cd cadJS && npm test
```

### 7.2 Game smoke
Serve the repo (`python3 -m http.server 8000`) and run the Playwright suites in
`/tmp/michi-test/smoke.js` + `smoke2.js` (44 checks; see
`docs/VERIFICATION_REPORT_2026-09-11.md`). If `/tmp/michi-test` is missing,
report it as `- [!]`. Don't claim smoke passed.

### 7.3 Parity snapshots (required for WS-3, WS-5, WS-6, WS-7)
Add a small browser-side helper (WS-0 may place it in `asset_runtime.js` as
`snapshotTree(root)`) that walks an object tree and emits, per node:
`name`, `type`, position/rotation/scale (rounded 1e-4), `geometry.type` +
`geometry.parameters`, vertex count, material type + color/emissive hex +
roughness/metalness, `visible`, `castShadow`. Capture via Playwright or the
cadJS console into `cadJS/tests/golden/<asset>.<variant>.json`.
**Parity = identical JSON** except names that were previously empty (now
stamped). Any other difference must be explained in the PR/commit message.

### 7.4 Load time
Record time-to-first-frame (existing perf probe or `performance.now()` at the
end of world build) on the same machine before and after WS-5/WS-6. Budget:
+5% max. If exceeded, flag `[?]` with numbers (bundling is the known fix).

### 7.5 The user's acceptance test (run after WS-2 and again after WS-8)
1. `cd cadJS && npm start`, open `http://127.0.0.1:4173`.
2. Assets → **Cat** → variant **michi** → select **Collar**.
3. Change radius 0.072 → 0.08, tilt 83.72° → 80°.
4. **Save to Game** → diff shows 2 changed values in `src/assets/cat.def.js` → Confirm.
5. Game iframe reloads; Michi's collar is visibly larger and more tilted.
6. `git diff --stat` → only `src/assets/cat.def.js`. `cad-overrides.json` untouched or absent.

---

## Part 8 — Guardrails (all agents)

- **Game design (from AGENTS.md / docs/BUILD_GUIDE):** no fail states, no combat,
  no timers; painterly 256px procedural textures only; don't expand the map
  early; free exploration stays the identity.
- **No visual changes during migrations.** Creative edits happen *after* parity, in cadJS.
- **Cache tags:** every new import carries `?v=<current tag>` (currently `20260929a`); keep all tags in sync.
- **Encoding:** on Windows never bulk-edit with PowerShell `Get-Content/Set-Content`
  (corrupts em-dashes and Japanese text; see commit 3bb7578). Use Node or sed.
- **Def files are pure data.** If you need logic, it belongs in the builder.
- **Don't edit files you don't own.** Use Part 10.
- **Git:** work lands on `main` (no feature branches in this repo). Commit only
  your owned files; never stage unrelated files. `dawCAT/` is off-limits.
  Humans decide when `cadJS/` changes are committed and pushed.
- **Server safety:** cadJS binds `127.0.0.1` by default; keep it that way. The
  asset API must never write outside `src/assets/`.

---

## Part 9 — Out of scope for v1 (parked with a plan)

- **Free-form mesh edits** (cadJS distortion ops) on def-backed parts. Later plan:
  a `mesh` shape whose `args.file` points to a compact `src/assets/meshes/<id>.json`
  (quantized positions), still pure data and diffable. Needs a human `[?]` because it
  moves away from "procedural".
- **Painted textures.** Later plan: `texture: { file: 'src/assets/textures/<id>.png' }`,
  ≤256px (guardrail), written by the server as PNG. Needs a human `[?]`.
- **Keyframed animation clips** (WS-4.6).
- **Bundling** (only if 7.4 budget is exceeded).
- **Multi-user editing / merge UI** beyond the 409 conflict prompt.

---

## Part 10 — Coordination notes & claims

Format: `YYYY-MM-DD · from WS-x · to WS-y · file · request · status`

- _(empty)_

### Agent prompt template (copy for each swarm agent)

```
You are agent <NAME> working on Michi-Neko's cadJS data-driven asset pipeline.
Read cadJS/BUILD_GUIDE.md Parts 1–3, 5, 7, 8 fully before doing anything.
Your workstream: <WS-x (and module, e.g. 6-shrine)>.
Only edit files your workstream owns per Part 5. For anything else, append a
coordination note to Part 10.
Check that every `depends-on` / wave prerequisite for your items is ticked [x];
if not, stop and report.
Do the items in order. For each: implement → verify with Part 7 → tick [x]
only when its Acceptance is met, pasting the verification output summary into
your final report. If verification can't run, mark [!] with the reason. Never
claim a pass you didn't observe.
Do not change how anything looks during migrations (D10).
```
