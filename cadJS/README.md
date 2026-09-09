# cadJS — Complete User Manual

cadJS is the standalone, non-destructive Three.js CAD workspace for **Michi-Neko: The Cat Philosopher's Path**. It provides a browser environment for inspecting, creating, transforming, reshaping, texturing, importing, exporting, and versioning Three.js assets without rewriting game source files.

> **Safety boundary:** cadJS does not write to the game's `src` directory, root `index.html`, or other production files. CAD edits, live-preview edits, downloaded projects, and asset packages stay separate until a developer intentionally integrates an approved export.

## Contents

1. [Capabilities and boundaries](#capabilities-and-boundaries)
2. [Requirements and startup](#requirements-and-startup)
3. [Application layout](#application-layout)
4. [First-use walkthrough](#first-use-walkthrough)
5. [Selection, navigation, and transforms](#selection-navigation-and-transforms)
6. [Creating and managing objects](#creating-and-managing-objects)
7. [Inspector reference](#inspector-reference)
8. [Geometry editing](#geometry-editing)
9. [Materials and textures](#materials-and-textures)
10. [Lights, cameras, and instances](#lights-cameras-and-instances)
11. [Repository catalogue](#repository-catalogue)
12. [Importing external models](#importing-external-models)
13. [Live game inspection](#live-game-inspection)
14. [Projects and persistence](#projects-and-persistence)
15. [Versioned asset packages](#versioned-asset-packages)
16. [Model and image exports](#model-and-image-exports)
17. [AI design agent](#ai-design-agent)
18. [Menus and shortcuts](#menus-and-shortcuts)
19. [Recommended workflows](#recommended-workflows)
20. [Troubleshooting](#troubleshooting)
21. [Security and privacy](#security-and-privacy)
22. [Developer checks](#developer-checks)

---

## Capabilities and boundaries

### Implemented capabilities

- Load the procedural Michi-Neko character into an isolated CAD scene.
- Scan the repository for Three.js source, builders, models, environments, and reference images.
- Traverse the live game scene exposed through `window.game.scene`.
- Select objects from the hierarchy, CAD viewport, or live game canvas.
- Move, rotate, and scale objects with gizmos or exact numeric values.
- Edit supported primitive geometry parameters.
- Apply undoable geometry distortions.
- Edit common object, material, texture, light, and camera properties.
- Add primitives, lights, and cameras.
- Inspect an `InstancedMesh` and extract an instance as an independent mesh.
- Import GLB, glTF, OBJ, and STL files.
- Export complete CAD projects, versioned asset packages, runtime overrides, GLB, OBJ, and PNG.
- Use a constrained AI design agent that returns validated CAD action plans.
- Undo and redo most edits made during the current session.

### Current boundaries

- cadJS is not yet a permanent game-asset importer. Exports are not automatically consumed by the game.
- The production cat uses articulated `THREE.Group` pivots and separate meshes, not `THREE.Skeleton`/`SkinnedMesh` animation.
- A dedicated rig inspector and animation timeline are planned but are not in the current UI.
- Active game animation may overwrite live runtime transforms on animated parts.
- Asset package schema 1 patches existing semantic objects only. Structural additions, removals, and reparenting are blocked.
- FBX, PLY, DAE, and 3DS can be catalogued, but the current preview loader supports GLB/glTF, OBJ, and STL.
- Browser project Save writes `localStorage`; use exported project JSON as the portable backup.

---

## Requirements and startup

### Requirements

- A modern WebGL 2 browser; current Chrome or Edge is recommended.
- Node.js available on the command line.
- The complete Michi-Neko repository.
- Network access when Three.js r160 and its addons must be loaded from the configured CDN.

The local server has no third-party Node dependencies, so no `npm install` step is required for cadJS itself.

### Start cadJS

From PowerShell:

```powershell
cd C:\Users\c1t1zen\Documents\GitHub\Michi-Neko-The-Cat-Philosophers-Path\cadJS
npm start
```

Open:

| Address | Purpose |
|---|---|
| `http://127.0.0.1:4173/cadJS/` | cadJS application |
| `http://127.0.0.1:4173/` | Original game through the same local server |
| `http://127.0.0.1:4173/api/health` | Server health information |

Do not open `cadJS/index.html` directly as a `file://` URL. The catalogue and live game bridge require the included server.

### Change the host or port

```powershell
$env:PORT = "5173"
$env:HOST = "127.0.0.1"
npm start
```

Keep the server bound to `127.0.0.1` unless network exposure is intentional and secured.

### Stop cadJS

Press `Ctrl+C` in the terminal running the server. Closing the browser does not stop Node.

---

## Application layout

### Top bar

- **FILE** — new/open/save and all export operations.
- **EDIT** — undo, redo, duplicate, remove, and reset transform.
- **OBJECT** — common object creation, isolate, and frame.
- **VIEW** — CAD/game switching, camera views, grid, and wireframe.
- **AI AGENT** — opens the agent or selects a provider preset.
- **INFO** — about, repository rescan, and game reload.
- **Discovered game elements** — quick access to catalogue entries.
- **SCAN** — rescans repository source and assets.
- **GAME / TAB** or **CAD / TAB** — switches the central viewport.

### Left tool rail

The rail contains Select, Move, Rotate, Scale, Orbit, AI Agent, Frame, Isolate, Clone, Remove, Box, Sphere, Cylinder, Cone, Torus, Capsule, Directional Light, and Perspective Camera.

Plane and icosahedron creation are supported internally and by AI actions, although they do not currently have dedicated rail buttons.

### Viewport toolbar

- Perspective, front, right, and top views
- Wireframe toggle
- Grid toggle
- Transform snapping

Snapping uses translation `0.1`, rotation `15°`, and scale `0.1`.

### Right panel

- **SCENE** — hierarchy, source selector, filter, and inspector.
- **CATALOG** — discovered source entries, models, environments, and images.

The **EDITOR/RUNTIME** button changes the hierarchy source. It does not switch the center viewport by itself.

### Status bar

The footer reports the latest operation or error, object count, approximate editor FPS, and axis colors: X red, Y green, Z blue.

---

## First-use walkthrough

1. Start the server and open the cadJS URL.
2. Wait for **PROCEDURAL CAT LOADED** and catalogue statistics.
3. Open **SCENE** and expand **Michi-Neko Character**.
4. Select the head, body, chest, hips, a leg, an ear, or a tail segment.
5. Press `W`, `E`, or `R` and use the viewport gizmo.
6. Enter exact values in the inspector.
7. Press `Ctrl+Z` to verify the edit can be undone.
8. Choose **FILE → Export project JSON** to create a portable backup.
9. Press `Tab` to view the live game.
10. Click **SCAN RUNTIME** to inspect the live scene.

---

## Selection, navigation, and transforms

### Select in the CAD viewport

Activate **SELECT** or press `Q`, then click a visible object. Internal helper objects are ignored when picking.

### Select in the hierarchy

- Click a row to select it.
- Click its triangle to expand/collapse children.
- Click the visibility icon to show/hide it.
- Use the hierarchy filter to search object names.

### Orbit, zoom, and pan

- Select or Orbit mode enables the standard Three.js orbit controls.
- Use mouse/trackpad controls to orbit and zoom.
- Arrow Up/Right zoom in.
- Arrow Down/Left zoom out.
- Shift + arrow pans the camera target.

### Frame a selection

Press `F`, click **FRAME**, or use **OBJECT → Frame selection**. cadJS calculates object bounds and moves the camera around the object.

### Standard views

| Key | View |
|---|---|
| `1` | Perspective |
| `2` | Front |
| `3` | Right |
| `4` | Top |

### Move, rotate, and scale

- `W` or **MOVE** — translate the selected editor object.
- `E` or **ROTATE** — rotate it; inspector values use degrees.
- `R` or **SCALE** — scale it by axis or uniformly.

Use the inspector's Position, Rotation, and Scale fields for exact values. Gizmos attach only to CAD workspace objects; runtime objects are edited through inspector fields.

### Reset transform

**RESET** or **EDIT → Reset transform** sets the selected object's local values to:

```text
Position  0, 0, 0
Rotation  0°, 0°, 0°
Scale     1, 1, 1
```

This is an identity reset, not a character rest-pose command. On an articulated part it may destroy the intended local placement; use Undo if necessary.

---

## Creating and managing objects

### Create

Use the left rail or **OBJECT** menu. Supported creation types are:

- Box, sphere, cylinder, cone, torus, capsule, plane, and icosahedron
- Directional light
- Perspective camera

New meshes receive a standard blue-gray material, are placed slightly above the origin, become selected, and switch to Move mode.

### Duplicate

Use `Ctrl+D`, **CLONE**, or **EDIT → Duplicate**. Geometry and materials are cloned and the duplicate is offset slightly along X.

### Remove

Use `Delete`, `Backspace`, **REMOVE**, or **EDIT → Remove**. Session Undo can restore the object.

### Isolate

Select an object and press `I` or click **ISOLATE**. Other top-level CAD assets are hidden and the camera frames the selection. Repeat to restore previous visibility.

---

## Inspector reference

The inspector adapts to the selected object.

### Object

- Name
- Visible
- Cast shadow
- Receive shadow
- Frustum culling
- Render order
- Source information

### Transform

- Position X/Y/Z
- Rotation X/Y/Z in degrees
- Scale X/Y/Z
- Calculated bounds
- Reset, Frame, Duplicate, and Isolate

### Metadata

- Current scene hierarchy path
- Number of direct children

Hierarchy paths are useful for inspection and runtime overrides. Versioned packages use stable semantic IDs instead.

### History

Most gizmo edits, inspector changes, geometry operations, texture operations, additions, removals, duplicates, AI plans, and package applications enter the in-memory Undo/Redo history.

History is session-based. Export projects frequently.

---

## Geometry editing

### Primitive parameters

For recognized primitives, the Geometry section shows editable constructor values and vertex/triangle counts. Rebuilding supports:

- `BoxGeometry`
- `SphereGeometry`
- `CylinderGeometry`
- `ConeGeometry`
- `PlaneGeometry`
- `TorusGeometry`
- `CapsuleGeometry`
- `IcosahedronGeometry`

### Distortion settings

- **Amount** — strength/direction
- **Axis** — X, Y, or Z
- **Frequency** — repetition/detail
- **Seed** — deterministic variation

### Distortion operations

| Tool | Effect |
|---|---|
| Twist | Progressive rotation around the selected axis |
| Bend | Curves geometry along the selected axis |
| Taper | Progressively narrows or widens geometry |
| Noise | Adds seeded radial surface displacement |
| Flatten | Compresses the selected axis |
| Inflate | Pushes vertices outward |
| Pinch | Narrows the center region |
| Shear | Progressively offsets vertices |
| Spherize | Moves vertices toward a spherical form |
| Reset Geo | Restores the recorded original geometry snapshot |

Distortions clone geometry and recalculate normals and bounds.

**RESET GEO** works only after cadJS recorded an original geometry snapshot during parameter rebuilding or distortion in the current editing context. Otherwise the status bar reports **NO ORIGINAL GEOMETRY SNAPSHOT**.

---

## Materials and textures

### Material fields

Depending on material type, cadJS can edit base color, emissive color, roughness, metalness, emissive intensity, opacity, transparency, wireframe, flat shading, and depth writing.

For multi-material objects, common changes are applied across the material list.

### Clone shared material

Use **CLONE SHARED MATERIAL** before making a unique appearance when multiple meshes may reference the same material.

### Upload a texture

1. Select a mesh.
2. Click **UPLOAD IMAGE**.
3. Choose PNG, JPEG, WebP, or GIF.
4. Adjust repeat, offset, rotation, and wrapping.

Uploaded textures are stored as data URLs in project/package JSON. Large images can create large files.

### Apply to a group

Select a character/group and click **APPLY TO PARTS**. cadJS traverses descendant meshes and assigns cloned textured materials.

### Texture controls

- Repeat X/Y
- Offset X/Y
- Rotation in degrees
- Repeat, Clamp, or Mirror wrapping
- **FIT UV** resets repeat to `1,1`, offset to `0,0`, center to `0.5,0.5`, and rotation to `0`.
- **CLEAR MAP** removes the selected mesh's texture map.

---

## Lights, cameras, and instances

### Lights

Available fields can include color, intensity, distance, decay, and shadow casting.

### Cameras

Available fields can include field of view, near/far clipping planes, and zoom. Projection matrices update after changes.

### Instanced meshes

An `InstancedMesh` inspector shows its count and an instance index. **EXTRACT INSTANCE AS MESH** clones the selected instance's geometry/material into an independent CAD mesh. The original instance remains in the source `InstancedMesh`.

---

## Repository catalogue

Press **SCAN** to refresh the repository catalogue. The server excludes `.git`, `node_modules`, `dist`, `build`, `.cache`, and cadJS itself from game-content scanning.

### Source discovery

For Three.js-related JavaScript/TypeScript source, cadJS detects exported classes, `build*`/`create*`/`make*`/`generate*`/`add*` methods, geometry/material constructors, and common scene object types.

Most source entries are metadata only. Except for the known procedural `Cat`, cadJS does not execute arbitrary discovered builders.

### File discovery

- Models: GLB, glTF, FBX, OBJ, STL, PLY, DAE, 3DS
- Environments: HDR, EXR
- Images: PNG, JPEG, WebP, GIF, SVG

Double-click a supported model to load it. Double-click an image to open it in another tab. Unsupported preview formats remain catalogue references.

---

## Importing external models

Choose **FILE → Open project / package…** and select a model.

| Format | Current behavior |
|---|---|
| `.glb` | Loaded with `GLTFLoader` |
| `.gltf` | Loaded with `GLTFLoader`; referenced files must resolve |
| `.obj` | Loaded with `OBJLoader` |
| `.stl` | Loaded with `STLLoader` and a default material |
| `.fbx` | Accepted by the chooser but currently reports not previewable |

After loading, cadJS selects and frames the model.

For external `.gltf`, keep referenced `.bin` and texture files at resolvable relative URLs, or convert the asset to self-contained GLB.

### Register an imported asset

1. Select its top-level object or descendant.
2. Open **ASSET PACKAGE** in the inspector.
3. Click **REGISTER + CAPTURE BASELINE**.
4. Enter a stable ID such as:

```text
prop.tea-house.kettle
character.luna-v2
environment.shrine-gate
```

Registration assigns stable semantic IDs and captures the current hierarchy/state as the package baseline.

---

## Live game inspection

### Switch and scan

Press `Tab` or click **GAME / TAB**, then click **SCAN RUNTIME**. cadJS traverses `window.game.scene` and labels known systems such as the player, Luna, Mochi, Kuro, NPC cats, interior, and sky dome.

### Pick a live object

Double-click a visible object on the game canvas. cadJS raycasts the live scene and selects the first visible non-sprite hit.

### Edit a live object

Use inspector fields for transforms, visibility, rendering, materials, lights, or cameras. Runtime edits affect only the embedded game instance and are captured as override records.

### Export/reapply overrides

Choose **FILE → Export game overrides**. Files use a name like:

```text
michi-neko-<timestamp>.overrides.json
```

Open an overrides JSON in cadJS to reapply resolvable records to the current game scene.

### Runtime limitations

- Reloading the iframe removes live changes until overrides are reapplied.
- Runtime paths use hierarchy indices and can break when the game hierarchy changes.
- Procedural updates may overwrite edited values every frame.
- Animated character parts, wings, fish tails, particles, and moving systems are especially likely to reset.
- Overrides are not automatically loaded by the production game.

Use runtime editing for visual experimentation and comparison, not as the only production archive.

---

## Projects and persistence

### New project

**FILE → New project** clears the current CAD workspace after confirmation, then reloads the starter platform and procedural cat. Current runtime overrides, baselines, and package lineage are cleared.

### Save browser project

**FILE → Save browser project** writes the serialized project to browser `localStorage` under:

```text
michi-neko-cadjs-project-v1
```

The current UI does not provide a dedicated Load Browser Project command or automatic startup restore. Use exported project JSON for portable, explicit restoration. Browser data can be erased by browser storage/privacy controls.

### Export project JSON

**FILE → Export project JSON** downloads:

```text
michi-neko-<timestamp>.cadjs.json
```

It contains the complete CAD scene, editor camera/target, grid and snap settings, runtime overrides, asset baselines, and last package lineage record. This is the recommended editable master format.

### Open a project

Choose **FILE → Open project / package…** and select `.cadjs.json`. The current CAD workspace is replaced. Export the current project first if it may be needed later.

### File-purpose summary

| File | Purpose | Re-editable | Automatically used by game |
|---|---|---:|---:|
| `.cadjs.json` | Complete editable workspace | Yes | No |
| `.cadasset.json` | Incremental compatible asset revision | Yes | No |
| `.overrides.json` | Temporary live-scene states | Yes | No |
| `.glb` | Portable 3D asset | Re-importable; not full CAD history | No |
| `.obj` | Geometry interchange | Re-importable; limited fidelity | No |
| `.png` | Viewport image | No | No |

---

## Versioned asset packages

Versioned packages provide safe cadJS-to-cadJS incremental interchange. The starter character is automatically registered as:

```text
character.michi-neko
```

### Package contents

Each `.cadasset.json` package includes:

- `format: "cadjs-asset-package"`
- Schema and asset-contract versions
- Semantic package version
- Stable asset and object IDs
- Baseline fingerprint
- Optional parent version/checksum lineage
- Sparse changed components
- Revision notes
- Deterministic checksum

Sparse changes can include transforms, render properties, geometry buffers, material values, and uploaded texture/UV data. Unchanged components are not duplicated merely because another component changed.

### Export

1. Select a registered asset or descendant.
2. Review Asset ID, baseline, and changed-object count in **ASSET PACKAGE**.
3. Click **EXPORT PACKAGE** or use **FILE → Export versioned asset package**.
4. Enter a semantic version such as `0.1.0`, `0.1.1`, or `0.2.0`.
5. Enter revision notes and save the file.

Example:

```text
character.michi-neko-0.2.0.cadasset.json
```

Suggested version meaning:

- Patch: small correction (`0.1.0` → `0.1.1`)
- Minor: meaningful compatible redesign (`0.1.1` → `0.2.0`)
- Major: approved milestone/new intentional contract (`0.9.0` → `1.0.0`)

Consecutive exports for the same asset record parent lineage.

### Import

1. Open a project containing the matching registered baseline.
2. Choose **FILE → Open project / package…**.
3. Select `.cadasset.json`.
4. Review the confirmation showing asset, version, change count, and checksum.
5. Confirm to apply it as one undoable transaction.

### Validation

cadJS rejects packages with unknown format, unsupported schema/contract, invalid semantic version or asset ID, missing baseline, checksum mismatch, wrong target, different baseline, missing semantic objects, type mismatches, or excessive object counts. It does not partially apply incompatible packages.

### Capture a new baseline

Use **CAPTURE NEW BASELINE** only when intentionally beginning a new compatibility line. Old-baseline packages then become incompatible by design. Export the full project and retain previous packages before rebasing.

### Structural limitation

Schema 1 patches existing semantic objects only. Added/removed parts change the semantic object set and block package export. Preserve structural work in `.cadjs.json` until a future schema supports explicit create/remove/reparent operations and migrations.

### Game boundary

The game does not yet permanently load `.cadasset.json`. Packages establish the validated format for a future game-side adapter and currently support compatible cadJS project exchange and revision auditing.

---

## Model and image exports

### GLB

**FILE → Export selected GLB** exports the selected object and descendants, or the workspace root when nothing is selected. Invisible objects are included. GLB usually preserves hierarchy/materials better than OBJ.

### OBJ

**FILE → Export selected OBJ** exports portable geometry with more limited material, hierarchy, texture, and animation fidelity.

### PNG

**FILE → Viewport PNG** downloads `cadjs-viewport.png`. It captures the CAD renderer, not the embedded game view.

---

## AI design agent

The agent turns natural-language instructions and optional references into a constrained JSON plan. It cannot execute arbitrary JavaScript, shell commands, or repository writes.

### Open

- Press `A`
- Click **AI AGENT** on the rail
- Use **AI AGENT → Open AI design agent**

### Providers

| Provider | Default base URL | Default model | Key |
|---|---|---|---|
| Local / llama-server | `http://127.0.0.1:8080/v1` | `local-model` | Normally none |
| MCP / custom gateway | `http://127.0.0.1:3000/v1` | `agent-model` | Gateway-dependent |
| OpenAI | `https://api.openai.com/v1` | `gpt-5.2` | Required |
| OpenRouter | `https://openrouter.ai/api/v1` | `openai/gpt-5.2` | Required |
| Anthropic | `https://api.anthropic.com/v1` | `claude-opus-4-6` | Required |

Base URLs and model IDs are editable and may need updates as provider availability changes.

Local llama.cpp example:

```powershell
llama-server -m C:\models\your-model.gguf --host 127.0.0.1
```

### Reference images

- PNG, JPEG, or WebP
- Up to 8 images
- Up to 8 MB each
- Upload or drag/drop

### Context

- Selection + nearby scene
- Whole selected character/group
- Whole workspace

### Execution modes

| Mode | Behavior |
|---|---|
| Plan only | Displays plan; execution disabled |
| Confirm before run | Waits for **RUN PLAN** |
| Auto-run valid plans | Runs only after protocol validation |

For important assets, use Plan Only or Confirm Before Run.

### Supported actions

Select, set transform/material, add primitive, duplicate, delete, distort, rename, set visibility, apply a reference texture, and frame. Plans are limited to 64 actions and applied as one undoable transaction; failed plans restore the previous workspace.

### Recommended agent sequence

1. Export/save first.
2. Select the narrowest target and context.
3. Add references if useful.
4. Give measurable instructions and constraints.
5. Generate and inspect the plan.
6. Run only when acceptable.
7. Inspect from multiple views.
8. Undo if needed.
9. Export a reviewed project/package.

Example prompt:

```text
Redesign the selected cat head only. Make it slightly rounder, enlarge both eye groups evenly,
preserve the muzzle position, keep all changes symmetric, and do not delete any parts.
```

---

## Menus and shortcuts

### File

New project; Open project/package; Save browser project; Export project JSON; Export versioned asset package; Export selected GLB; Export selected OBJ; Export game overrides; Viewport PNG.

### Edit

Undo; Redo; Duplicate; Remove; Reset transform.

### Object

Add box; Add sphere; Add cylinder; Add directional light; Isolate selection; Frame selection.

### View

CAD/game environment; Perspective; Front; Right; Top; Grid; Wireframe.

### AI Agent

Open agent and select Local, MCP, OpenAI, OpenRouter, or Anthropic.

### Info

About cadJS; Rescan repository; Reload game preview.

### Keyboard reference

| Shortcut | Action |
|---|---|
| `Q` | Select/orbit mode |
| `W` | Move |
| `E` | Rotate |
| `R` | Scale |
| `F` | Frame selected |
| `I` | Toggle isolation |
| `G` | Toggle grid |
| `X` | Toggle wireframe |
| `Tab` | Switch CAD/game viewport |
| `A` | Toggle AI agent |
| `1` | Perspective |
| `2` | Front |
| `3` | Right |
| `4` | Top |
| Arrow Up/Right | Zoom in |
| Arrow Down/Left | Zoom out |
| Shift + arrows | Pan target |
| `Ctrl+D` | Duplicate |
| `Delete` / `Backspace` | Remove |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |

Shortcuts are ignored while an input, select, or textarea has focus.

---

## Recommended workflows

### Character design

1. Export the clean project as a baseline backup.
2. Modify one visual area at a time.
3. Inspect perspective/front/right/top views.
4. Compare in the live environment with `Tab`.
5. Export the updated `.cadjs.json` master.
6. Export a semantic `.cadasset.json` revision.
7. Test package import in a clean compatible project.
8. Keep master and package together in source control.
9. Integrate into the game only in a separate reviewed step.

### Runtime environment adjustment

1. Switch to Game and scan runtime.
2. Select a mostly static object.
3. Make a small adjustment.
4. Play/view the result.
5. Export overrides.
6. Reload and reapply to test path resolution.
7. Translate the approved result into stable production code/data later.

### Imported model

1. Import GLB/glTF, OBJ, or STL.
2. Inspect hierarchy, bounds, orientation, and materials.
3. Normalize transform as needed.
4. Register a stable asset ID.
5. Export a complete project.
6. Make incremental edits and packages.
7. Export GLB when portable exchange is needed.

### AI-assisted design

1. Save/export before use.
2. Select a narrow target.
3. Use confirmation mode.
4. Review each action.
5. Inspect and undo if necessary.
6. Export only after manual approval.

---

## Troubleshooting

### Page does not load

- Confirm `npm start` is running.
- Check `/api/health`.
- Verify port 4173 is available.
- Do not use `file://`.

### Blank viewport or Three.js network errors

- Confirm network access to the configured CDN.
- Check browser Console/Network panels.
- Confirm WebGL 2 is enabled.
- Try current Chrome or Edge and reload without cache.

### Empty or stale catalogue

- Start through the Node server.
- Click **SCAN**.
- Review status-bar errors.
- Remember excluded directories are not scanned.

### Model is catalogued but not previewable

Convert FBX, PLY, DAE, or 3DS to GLB/glTF, OBJ, or STL.

### glTF textures are missing

Keep external `.bin`/image files at resolvable paths or convert to self-contained GLB.

### Transform gizmo is missing

Select an **EDITOR** object, not a runtime object, then press `W`, `E`, or `R`.

### Runtime edits snap back

The game is probably assigning that property every frame. Animated legs, heads, ears, tails, wings, fish, particles, and moving systems commonly do this.

### Reset Geo has no snapshot

The original geometry snapshot is created when geometry is first rebuilt or distorted in the current context. Use Undo or reopen a project if none exists.

### Package export reports structural changes

The semantic object set differs from its baseline. Save the full project, restore the original structure, or archive the old line and intentionally capture a new baseline.

### Package import is incompatible

Use the exact baseline from which it was created. Common causes include wrong asset ID, different baseline, changed hierarchy, missing object, type mismatch, checksum failure, or unsupported schema.

### AI provider fails

- Verify URL, model, and key.
- Confirm local services are running.
- Confirm image support if references are attached.
- Reduce image/token size.
- Inspect agent activity and server output.
- Ensure the provider returns the required JSON plan.

### Browser Save cannot be reopened

The current interface stores browser data but has no browser-load command. Use **Export project JSON** for explicit restoration.

---

## Security and privacy

- Keep the host on `127.0.0.1` unless exposure is intentional.
- API keys pass through the local cadJS proxy to the selected provider.
- Agent settings and keys are stored in browser `sessionStorage`, not project JSON.
- Review exported files for embedded texture data and metadata before sharing.
- Do not expose cadJS to untrusted users while paid-provider keys are present.
- The AI protocol rejects unsupported actions and provides no arbitrary shell/source-write access.
- Review AI plans and package diffs before production use.

---

## Developer checks

```powershell
cd C:\Users\c1t1zen\Documents\GitHub\Michi-Neko-The-Cat-Philosophers-Path\cadJS
npm test
npm run check
```

Tests cover catalogue behavior, path normalization, AI protocol/providers, asset-package hashes and IDs, tamper detection, baseline compatibility, and sparse incremental changes.

`npm run check` imports the server, catalogue, agent protocol, and asset package modules before running all assertions.

The repository's Node `v16.13.2` does not correctly support `node --check` for these ES modules. Use executable module loading through `npm run check`.

### File map

```text
cadJS/
├── index.html
├── styles.css
├── server.mjs
├── package.json
├── README.md
├── src/
│   ├── app.mjs
│   ├── catalog.mjs
│   ├── agent-panel.mjs
│   ├── agent-protocol.mjs
│   └── asset-package.mjs
└── tests/
    └── catalog.test.mjs
```

## Summary

Use `.cadjs.json` as the editable master, `.cadasset.json` for validated incremental revisions, `.overrides.json` for temporary live-scene experiments, GLB/OBJ for external interchange, and PNG for visual review. Keep changes small, version them, verify packages against clean compatible baselines, and treat permanent game integration as a separate reviewed step.