# cadJS — Michi-Neko Three.js CAD Workspace

`cadJS` is a standalone, non-destructive browser CAD/editor for the Three.js content in Michi-Neko. No existing game file is changed or required to import the editor.

## Start

From the repository root:

```powershell
cd c:\Users\c1t1zen\Documents\GitHub\Michi-Neko-The-Cat-Philosophers-Path\cadJS
npm start
```

Open:

```text
http://127.0.0.1:4173/cadJS/
```

The included server has no third-party Node dependencies. It is used because browsers cannot enumerate repository files by themselves. Each request to the catalogue endpoint performs a fresh repository scan, so newly added source files, procedural builders, models, environments, and reference images appear after starting or pressing **SCAN**.

The original game remains available at:

```text
http://127.0.0.1:4173/
```

## Main workflow

1. Use the initial procedural Michi-Neko model or double-click a discovered catalogue item.
2. Select parts in the viewport or scene hierarchy.
3. Use `W`, `E`, and `R` for move, rotate, and scale gizmos.
4. Change exact values in the right inspector.
5. Press `Tab` to switch to the real game environment.
6. In the game view, press **SCAN RUNTIME** or double-click an object on the game canvas.
7. Adjust runtime objects with the inspector. These changes are temporary until exported as an override project.
8. Export a `.cadjs.json` project, runtime override JSON, GLB, OBJ, or PNG through **FILE**.

## AI design agent

Press `A`, choose **AI AGENT** in the top menu, or use the sparkle tool in the left rail. The agent workspace can redesign a selected mesh, a complete character/group, or the whole CAD workspace from natural-language instructions and up to eight PNG/JPEG/WebP reference images (8 MB each).

The model never executes JavaScript or shell commands. It receives a compact scene manifest and must return a constrained JSON plan. cadJS validates that plan against its supported action list, displays it for review, and applies it as one undoable transaction. Supported operations include selection, transforms, material edits, primitive creation, duplication/removal, detailed distortions, renaming, visibility, reference-image textures, and camera framing.

### Providers

| Provider | Default base URL | Notes |
|---|---|---|
| Local / llama-server | `http://127.0.0.1:8080/v1` | OpenAI-compatible llama.cpp server; no key required by default |
| MCP / custom gateway | `http://127.0.0.1:3000/v1` | An agent harness or MCP bridge that exposes an OpenAI-compatible chat-completions endpoint |
| OpenAI | `https://api.openai.com/v1` | API key required |
| OpenRouter | `https://openrouter.ai/api/v1` | API key required; model IDs use provider/model form |
| Anthropic | `https://api.anthropic.com/v1` | API key required; translated to the Messages API |

All base URLs and model names are editable. Controls are available for temperature, top-p, maximum output tokens, reasoning level, execution mode, and context scope. **Plan only** disables execution, **Confirm before run** requires the **RUN PLAN** button, and **Auto-run valid plans** runs only after schema validation.

API keys are sent to the local cadJS proxy and then directly to the selected provider. They are kept in browser `sessionStorage`, are not written to project JSON, and disappear when that browser session is closed. Do not expose the cadJS server to untrusted networks.

### Local llama-server example

Start a multimodal/instruct model using your llama.cpp installation, for example:

```powershell
llama-server -m C:\models\your-model.gguf --host 127.0.0.1 --port 8080
```

Then select **Local / llama-server**, keep `http://127.0.0.1:8080/v1`, and enter the model identifier expected by that server. Reference-image understanding requires a multimodal model and the corresponding llama-server projector/configuration.

### MCP and external harnesses

MCP is a tool protocol rather than a universal inference endpoint. cadJS therefore provides a safe bridge contract instead of assuming every MCP server accepts prompts:

- `GET /api/agent/schema` returns the supported CAD action protocol.
- `GET /api/agent/providers` returns provider capabilities exposed by this build.
- An MCP host or autonomous harness can expose an OpenAI-compatible `/v1/chat/completions` gateway and be selected as **MCP / custom gateway**.
- Returned actions still pass through cadJS validation and the undo transaction boundary.

This release intentionally does not grant the model arbitrary repository writes. Persistent game-source implementation remains an explicit developer step; agent changes affect the CAD project and its exports.

## Shortcuts

| Shortcut | Action |
|---|---|
| `Q` | Select/orbit mode |
| `W` | Move |
| `E` | Rotate |
| `R` | Scale |
| `F` | Frame selected |
| `I` | Isolate selected |
| `G` | Toggle grid |
| `X` | Toggle wireframe |
| `Tab` | Switch CAD/game environment |
| `A` | Open/close AI design agent |
| `Arrow Up` / `Arrow Right` | Zoom camera in |
| `Arrow Down` / `Arrow Left` | Zoom camera out |
| `Shift` + arrow keys | Pan camera target |
| `1` | Perspective view |
| `2` | Front view |
| `3` | Right view |
| `4` | Top view |
| `Ctrl+D` | Duplicate |
| `Delete` | Remove |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` or `Ctrl+Shift+Z` | Redo |

Shortcuts are ignored while entering values in a field.

## Supported editing

- Scene hierarchy, visibility, object naming, render order, shadows, and frustum culling
- Mouse gizmos and exact position/rotation/scale fields
- Geometry parameters for common Three.js primitives
- Parameterized, axis-aware twist, bend, taper, noise, flatten, inflate, pinch, shear, spherize, and geometry reset operations
- Material color, emissive color, roughness, metalness, opacity, transparency, wireframe, flat shading, and depth writing
- Uploaded image textures on one mesh or every mesh below a character/group, with repeat, offset, rotation, wrapping, UV reset, preview, and removal controls
- Light color, intensity, distance, decay, and shadows
- Camera FOV, clipping planes, and zoom
- Instanced-mesh inspection and extracting an instance as an independent mesh
- Primitive, light, and camera creation
- Box, sphere, cylinder, cone, torus, capsule, plane, and icosahedron creation through manual or agent actions
- GLB, glTF, OBJ, and STL preview loading
- GLB/OBJ export and PNG viewport capture
- Browser project save and downloadable project/override JSON

## Discovery behavior

The server scans the repository while excluding `.git`, `node_modules`, `dist`, `build`, and cache directories. It finds:

- Three.js source modules
- Exported classes
- `build*`, `create*`, `make*`, `generate*`, and `add*` methods
- Three.js geometry, material, object, light, and camera constructors
- `.glb`, `.gltf`, `.fbx`, `.obj`, `.stl`, `.ply`, `.dae`, and `.3ds` models
- `.hdr` and `.exr` environments
- common image/reference formats

The runtime scanner separately traverses `window.game.scene`, which the current game already exposes. This catches dynamically generated meshes, groups, sprites, particles, instanced vegetation, lights, and cameras that source scanning alone cannot enumerate as individual scene objects.

## Persistence boundary

Runtime edits affect only the game preview loaded by the CAD page. The editor never rewrites `src`, `index.html`, or another existing game file. Persistent production integration requires intentionally consuming the exported override JSON in the game at a later time.

## Checks

```powershell
npm test
npm run check
```

`npm run check` imports the server, catalogue, and AI protocol modules and runs the dependency-free assertions. The repository's current Node `v16.13.2` executable does not correctly support `node --check` for ES modules, so executable module loading is used instead.

## Browser/network note

Three.js r160 is loaded from the same CDN/import-map arrangement used by the game, so initial use requires network access unless those modules are later vendored locally.