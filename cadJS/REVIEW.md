# cadJS Application Review

**Date:** 2026-11-08  
**Reviewer:** Cline (AI code analysis)  
**Scope:** Complete cadJS codebase (src/, server, tests, documentation)  
**Lines analyzed:** ~28,000 across 6 core modules + game-side integration

---

## 1. Executive Summary

cadJS is a mature, well-architected Three.js CAD workspace with impressive feature coverage for a game-asset-specific tool. The application provides a complete editing pipeline: **import → transform → reshape → texture → AI redesign → export/push-to-game**, with strong emphasis on procedural Kyoto-themed content and multi-provider AI integration.

**Key finding:** The v1.0 vision — "open any object, edit it, click Save to Game, see it change in `git diff`" — is **partially realized**. The editing and AI tools are production-quality, but the underlying "data-driven assets" architecture (writing directly to `src/assets/*.def.js`) remains aspirational. The current implementation uses an override layer (`cad-overrides.json`) that patches values at runtime rather than changing the source of truth.

---

## 2. Architecture Assessment

### 2.1 Module Structure

The codebase is organized into six core modules with clear separation of concerns:

| Module | Lines | Purpose |
|--------|-------|---------|
| `app.mjs` | 2,037 | Main application: editor viewport, hierarchy tree, property inspector, transform tools, import/export, live game bridge |
| `agent-protocol.mjs` | ~700 | AI provider integration, request construction, response parsing, plan validation, offline built-in copilot |
| `agent-panel.mjs` | ~330 | AI chat interface, recipe chips, plan preview, provider settings, conversation memory |
| `catalog.mjs` | 144 | Repository file scanning, Three.js symbol extraction, asset classification, descriptor fingerprinting |
| `asset-package.mjs` | 132 | Versioned asset diff/apply, stable hashing (FNV-1a), semantic versioning, baseline compatibility |
| `procedural-studio.mjs` | ~720 | 15 Kyoto prefabs, 16 procedural textures, 10 material palettes, 8 character poses |

### 2.2 Server Architecture

`server.mjs` (343 lines) is a lightweight Node.js HTTP server that:

- Serves the static cadJS UI (index.html, CSS, JS modules)
- Provides API endpoints for AI agent requests, catalog scanning, and override publishing
- Proxies AI requests to multiple providers (OpenAI, Anthropic, Gemini, local servers, etc.)
- Manages `cad-overrides.json` file writing with format validation

**API endpoints implemented:**
- `GET /api/health` — Server health check
- `GET /api/catalog` — Scan repository for Three.js assets
- `POST /api/agent` — Send design instruction to AI provider
- `GET /api/agent/probe` — Test AI provider connectivity
- `GET /api/agent/providers` — List available AI providers
- `GET /api/agent/schema` — Agent protocol schema
- `POST /api/overrides` — Publish design overrides to game

### 2.3 Game Integration

cadJS connects to the live game through two mechanisms:

1. **Live inspection (read-only):** An iframe loads the game (`window.game.scene`) for browsing and picking objects from the runtime scene
2. **Override publishing (write):** Design changes are written to `cad-overrides.json` at the repo root, which the game loads at boot via `src/cad_overrides.js`

The override format is name-keyed: the game traverses its scene looking for objects with matching `name` properties and applies transform, material, and visibility changes.
---

## 3. What is Working Well

### 3.1 AI Integration (Industry-Leading)

The AI agent system is the standout feature of cadJS. It supports:

**12 AI providers:**
- **Local:** llama-server (llama.cpp), Ollama, LM Studio
- **Cloud:** OpenAI (GPT-5.2), Anthropic (Claude Opus 4), Google Gemini, OpenRouter, Groq, DeepSeek, xAI (Grok), Mistral
- **Built-in:** "Instant CAD Copilot" (offline, regex-based)

**Safety architecture:**
- All AI plans are validated before execution
- Unsupported actions are rejected at the protocol level
- Three autonomy modes: Plan (preview only), Confirm (click to approve), Auto (run immediately)
- Per-step execution: users can run individual plan steps instead of the whole plan
- Full undo/redo support for AI changes

**Multi-modal support:**
- Image references (screenshot, upload) for vision-based models
- Conversation memory (clearable) for multi-turn design discussions
- Model-specific request formatting (OpenAI messages, Anthropic content blocks, Gemini parts)

**Offline capability:**
- The built-in copilot uses regex matching to parse design intent without any network
- Handles common patterns: "make a torii gate", "apply mossy stone texture", "pose the cat in a loaf"

### 3.2 Complete Transformation Toolkit

cadJS provides the full range of CAD editing operations:

**Transforms:** Move, rotate, scale gizmos (W/E/R hotkeys), numeric precision input in inspector, pivot point control (center, geometry, custom)

**Geometry distortion (9 modes):** Twist, bend, taper, noise displacement, flatten, inflate, pinch, shear, spherize — all undoable, applied via vertex manipulation

**Duplication and arrangement:** Mirror clone (X/Y/Z axis), linear array clone, radial array clone, scatter clone (randomized position/rotation/scale), align to ground/center/origin

**Object operations:** Group objects, explode groups, isolate selected (hide all others), hide/show individual objects, focus/frame selection, duplicate, delete, rename


### 3.3 Procedural Content Pipeline

The Procedural Studio provides game-specific content generation:

**15 Kyoto prefabs:** Torii Gate, Wooden Pagoda, Canal Footbridge, Wayside Hokora Shrine, Stone Lantern (Ishi-Doro), Tsukubai Water Basin, Matcha Chawan Set, Floating River Lantern, Ema Wishing Plaque Stand, Guardian Neko Statue, Bamboo Grove Cluster, Sakura Blossom Tree, Sculpted Pine Bonsai, Tobi-Ishi Stepping Stones, Zen Rock Cluster

**16 procedural textures (256px painterly):** Tabby Fur Stripes, Calico Fur Patches, Tortoiseshell Mottled, Soft Brushwork Fur, Weathered Kyoto Granite, Moss-Dappled Stone, Karesansui Raked Gravel, Hinoki Cedar Grain, Worn Teak, Red Lacquer, Woven Tatami, Silk Kimono Fabric, Brushed Copper, Cracked Tea Ceramic, Still Water

**10 material palettes:** Kyoto Shrine, Moss Garden, Sakura Spring, Autumn Temple, Moonlit Zen, Calico Cat, Golden Tabby, Midnight Kuro, Celadon Ceramic, Wabi-Sabi Rustic

**8 character poses:** Sit, Walk, Stretch, Loaf, Curious Tilt, Play Bow, Sleep Curl, Reset

### 3.4 Import/Export Pipeline

**Import:** GLB, glTF, OBJ, STL (fully previewable); FBX, PLY, DAE, 3DS (cataloged but not previewable)

**Export:** CAD project JSON (full workspace state, restorable), versioned asset packages (.cadasset.json — incremental changes only), runtime overrides JSON (.overrides.json — for live scene experimentation), GLB (binary glTF), OBJ (wavefront), PNG viewport screenshots

**Live game integration:** Push to game (applies changes via override file, persists across game boots), live preview in iframe, double-click picking from runtime scene

### 3.5 User Interface

- Professional dark-theme UI with glass-morphism panels
- Command palette (Ctrl+K) with fuzzy search for all actions, prefabs, textures, palettes, and game assets
- Responsive layout with adaptive panel sizes
- Contextual tool rail with 24+ tool buttons
- Keyboard shortcuts for all common operations
- Real-time FPS and object count statistics
- Switch guard dialog prevents accidental workspace loss

### 3.6 Testing and Documentation

- **15/15 unit tests passing** covering: path normalization and file classification, Three.js symbol extraction from source, catalog generation and sorting, AI provider request construction (OpenAI, Anthropic, Gemini, local), agent plan validation and action parsing, asset package hashing/validation/tamper detection, built-in copilot plan synthesis
- **README:** 900+ lines with complete feature documentation, menu shortcuts, troubleshooting
- **BUILD_GUIDE:** 600+ lines with detailed architecture decisions, file ownership matrix, wave-by-wave implementation plan
- Well-commented code with clear naming conventions
**Advanced geometry:** Subdivide geometry (Loop subdivision), simplify geometry (decimation), vertex color painting, texture coordinate painting
**Overall rating: 8/10** — excellent tool, partially realized vision.
---

## 4. What Needs Fixing

### 4.1 The Core v1.0 Goal Is Not Met

**The problem:** cadJS cannot edit the game's *source of truth*. It can only apply patches on top.

**Current implementation:**
- User edits object in cadJS
- Clicks "Push to Game"
- cadJS writes transform/material changes to `cad-overrides.json`
- Game reads this file at boot and applies changes via name-keyed lookup
- The actual game source code (`src/cat.js`, `src/countryside.js`, etc.) is unchanged

**Target implementation (from BUILD_GUIDE):**
- User edits object in cadJS
- Clicks "Save to Game"
- cadJS writes changes to `src/assets/cat.def.js` (pure data file)
- Game loads `cat.def.js` and builds the cat from that data
- `git diff` shows the actual changed values in the def file
- No override layer involved

**Why this matters:**
1. **Patch drift:** Overrides accumulate over time. Eventually the override file contains dozens of values that should be in the source.
2. **No true round-trip:** If you import a GLB, modify it, and export — you can't "save" those changes back because the source was code, not data.
3. **Confusion:** The BUILD_GUIDE describes "Save to Game" as writing to def files, but the UI says "Push to Game" and writes overrides.
4. **Scalability:** Name-keyed lookup is fragile. If the game changes an object name, all overrides for it break silently.

**Current status of required components:**

| Component | Status |
|-----------|--------|
| `src/assets/` directory | Does not exist |
| `src/assets/*.def.js` files | None created |
| `src/asset_runtime.js` (def → Three.js builder) | Not implemented |
| Server API: `GET/POST /api/assets/:id` | Not implemented |
| Hash-based conflict detection (HTTP 409) | Not implemented |
| Cat migration to def file (WS-3) | Not started |

### 4.2 Missing BUILD_GUIDE Components

The BUILD_GUIDE defines 9 workstreams. Current implementation covers only partial WS-2 (cadJS editor) and the override publishing that WS-8 is supposed to *retire*.

**Not implemented:**
- WS-1: Foundation (def file format spec exists, but no runtime)
- WS-3: Cat asset migration
- WS-4: Pose editor and animation framing
- WS-5: Countryside module split
- WS-6: Per-asset migrations (lantern, shrine, pagoda, etc.)
- WS-7: Layout editor and scene files
---

## 5. What Needs More Attention

### 5.1 AI Agent Limitations

**Intent parsing is fragile:**
The built-in copilot uses regex patterns like:
- `/\\b(doorway|torii)\\b/` → spawn torii
- `/\\b(rounder|thicker|wider)\\b/` → inflate distortion
- `/\\b(rough|grainy|pitted)\\b/` → weathered stone texture

This works for simple, literal prompts but fails on:
- Abstract concepts ("make it feel more peaceful")
- Contextual references ("that thing should be smaller")
- Negative space ("remove the sharp edges")
- Proportional reasoning ("the head should be bigger relative to the body")

**No learning or memory:**
- Each prompt is treated independently
- No understanding of design intent across sessions
- No ability to say "undo the last AI decision" as a single unit (multi-step plans)
- No constraint satisfaction (e.g., "make it taller but fit within 2m radius")

**Recommendations:**
1. Replace regex parsing with structured prompt engineering for cloud models
2. For built-in copilot, add a constraint solver for simple size/placement requests
3. Add "design intent" metadata to objects (what they're for, what constraints apply)
4. Implement multi-step plan atomicity (single undo for entire AI plan)
- WS-8: Retire overrides layer

### 5.2 Missing CAD Operations

Several standard CAD operations are absent or underdeveloped:

**Boolean/CSG operations:**
- Union, subtract, intersect
- Critical for organic modeling and sculpting
- Would require a CSG library (e.g., three-bvh-csg)

**Snapping:**
- Basic grid snapping exists
- No snap-to-object (faces, edges, vertices)
- No snap-to-selection (align to another object's features)

**Measurement tools:**
- No distance measurement between points
- No angle measurement
- No dimension lines or annotations

**Section/slice view:**
- No ability to clip an object to see interior
- Useful for verifying wall thickness, internal structure

**Baking:**
- No normal map baking
- No lightmap baking
- No shadow baking to textures

**UV editing:**
- No UV editor
- No UV seam marking
- Limited to applying textures, not authoring them

### 5.3 Inspector Limitations

**Geometry parameter editing:**
- Can edit primitive geometry parameters (sphere radius, box size, etc.)
- Cannot edit imported mesh parameters
- No per-vertex or per-face editing

### 5.4 Animation System

**Current state:**
- 8 pose presets (static rotation snapshots)
- Poses are applied by setting joint rotations directly
- No interpolation between poses
- No timeline UI

**What's missing for a complete animation pipeline:**
1. **Pose timeline UI** — keyframe editor with play/scrub controls
2. **Interpolation** — smooth transitions between poses
3. **Clip management** — save, rename, delete animation clips
4. **Export** — export animation data to the game
5. **Retargeting** — apply one character's animation to another

**Game architecture note:**
The game uses articulated `THREE.Group` pivots, not `THREE.Skeleton`/`SkinnedMesh`. This is simpler but means:
- No bone weight painting
- No automatic skin deformation
- Each joint is a separate mesh with manual parenting

This is a deliberate choice (D2 in BUILD_GUIDE) that works for the game's needs but limits animation complexity.

### 5.5 Versioning and Asset Packages

**Implemented:**
- FNV-1a hashing for stable value identification
- Semantic versioning for package versions
- Baseline compatibility checking
- Sparse object component diffing (only changed properties included)
- Tamper detection via checksum validation

**Missing:**
- No package registry (packages are local files only)
- Limited conflict resolution (no merge UI)
- No changelog or release notes
- No dependency management between packages

### 5.6 Performance Considerations

**Large scene handling:**
- Tree rebuild on every selection change
- No virtual scrolling in hierarchy (could be slow with 10,000+ objects)
- No level-of-detail switching for tree display

**Undo/redo:**
- Full workspace serialization on every undo step
- Could use diff-based undo for better performance
- No undo limit (could consume significant memory)
---

## 6. Feature Gap Analysis vs AAA CAD Tools

| Capability | cadJS | Blender | Maya | Target |
|------------|-------|---------|------|--------|
| **Transform tools** | Complete | Complete | Complete | met |
| **Primitive modeling** | Basic | Advanced | Advanced | adequate |
| **Parametric modeling** | Basic (primitive params) | Advanced (modifiers) | Advanced | limited |
| **Boolean/CSG** | None | Advanced | Advanced | missing |
| **Sculpting** | 9 distortion modes | 40+ brushes | Advanced | basic |
| **Rigging** | Pose presets | Complete | Complete | basic |
| **Animation timeline** | None | Complete | Complete | missing |
| **Texture painting** | Procedural only | Full UV | Full UV | limited |
| **NURBS surfaces** | None | Complete | Complete | not needed |
| **AI-assisted design** | Multi-provider | Plugins only | Plugins only | **exceeds** |
| **Procedural generation** | 15 game prefabs | Geometry Nodes | XGen | **exceeds for game** |
| **Live game preview** | iframe bridge | Plugins only | Plugins only | **exceeds** |
| **Version integration** | Asset packages | Git | Git | good |

**Conclusion:** cadJS is not trying to compete with Blender. It's a specialized tool for Michi-Neko's specific needs: procedural Kyoto game assets with AI assistance and live game integration. Its strengths (AI, procedural content, game integration) exceed traditional CAD tools; its weaknesses (booleans, animation, sculpting) are accepted trade-offs.

**Texture loading:**
- Procedural textures generated on demand
- No texture atlas or batching
---

## 7. Technical Health

### 7.1 Code Quality: High
- Clean ES6+ module syntax
- Consistent naming conventions
- Comprehensive error handling
- Good separation of concerns
- Minimal dependencies (Three.js via CDN, Node stdlib)
- No magic numbers or unexplained constants

### 7.2 Testing: Good (but could be better)
- 15/15 unit tests passing
- Tests cover core protocol and utility functions
- **Missing:** integration tests for server API endpoints
- **Missing:** UI/e2e tests for editor interactions
- **Missing:** snapshot tests for exported assets

### 7.3 Documentation: Excellent
- README is comprehensive (900+ lines)
- BUILD_GUIDE is detailed (600+ lines) with architecture decisions
- Code is well-commented
- Agent protocol is formally documented with JSON schema

### 7.4 Architecture: Well-Designed
- Modular and extensible
- Clear API boundaries
- Easy to add new AI providers
- Easy to add new procedural prefabs
- Override system cleanly separated from editor

### 7.5 Known Issues
- Node v16.13.2 doesn't correctly support `node --check` for ES modules (uses `npm run check` instead)
- Windows path handling requires special attention (PowerShell `Set-Content` corrupts encoding)
- Cache-busting tags must be manually synchronized across files
- Each texture is a separate draw call

**Material editor:**
- Limited to common MeshStandardMaterial properties
---

## 8. Recommendations

### Priority 1: Complete the v1.0 "Save to Game" Pipeline

**This is the foundational work that will transform cadJS from a "what-if" tool into the actual asset pipeline.**

1. **Create `src/assets/` directory** with subdirectories: `layouts/`, `meshes/`, `textures/`
2. **Implement `src/asset_runtime.js`** — the def file builder that reads JSON and creates Three.js objects
3. **Create `src/assets/cat.def.js`** — migrate cat geometry from `src/cat.js` to a def file
4. **Implement server API:**
   - `GET /api/assets` — list all def files with hashes
   - `GET /api/assets/:id` — get def file content
   - `POST /api/assets/:id` — save def file with hash conflict detection
   - `POST /api/assets/:id/preview` — validate def file without writing
5. **Rewrite cat builder** in `src/cat.js` to use `buildFromDef()`
6. **Update cadJS UI** to show "Save to Game" for def-backed assets
7. **Retire `cad-overrides.json`** for assets that are def-backed
8. **Add golden snapshot tests** for visual parity

### Priority 2: Improve AI Agent Intelligence

1. **Replace regex parsing** with structured prompt engineering for cloud models
2. **Add context awareness:** pass selected object's type, name, current transforms, material info
3. **Add constraint parameters:** size limits, palette constraints, placement rules
4. **Implement "redo with corrections":** allow users to refine AI output iteratively
5. **Add design intent metadata:** annotate objects with purpose and constraints

### Priority 3: Add Essential CAD Operations

1. **Boolean operations** (union, subtract, intersect) — integrate three-bvh-csg library
2. **Improved snapping:** snap to object faces/edges/vertices
3. **Measurement tools:** distance, angle, annotations
4. **Section/slice view:** clip objects to inspect interior
5. **Basic UV editor:** at least UV preview and simple seam marking

### Priority 4: Layout/Scene Editor

1. **Implement `src/assets/layouts/kyoto-village.def.js` schema**
2. **Build layout editor UI** in cadJS (drag-and-drop placement)
3. **Preview layout changes** in game iframe
4. **Implement `src/layout_runtime.js`** in game

### Priority 5: Animation/Pose Improvements

1. **Pose timeline UI** with keyframe editing
2. **Interpolation** between poses
3. **Save/export** pose sequences
4. **Apply poses** to multiple characters simultaneously
5. **Export animation data** to game

### Priority 6: Performance Optimization

1. **Virtual scrolling** in hierarchy tree for large scenes
2. **Diff-based undo/redo** instead of full serialization
3. **Texture atlas/batching** for procedural textures
4. **Level-of-detail** switching for tree display

---

## 9. Conclusion

cadJS is a genuinely impressive tool for its specific domain. The AI integration is ahead of what most traditional CAD tools offer, and the procedural content pipeline is perfectly tailored to Michi-Neko's Kyoto aesthetic. The code is clean, well-tested, and professionally documented.

However, the foundational architecture change — moving from code-defined geometry to data-defined assets — is the linchpin that will unlock cadJS's full potential. Without it, cadJS remains a powerful exploration tool that can't permanently change the game's assets. With it, cadJS becomes the actual production pipeline that the BUILD_GUIDE envisions.

**The work ahead is substantial but well-defined.** The BUILD_GUIDE already maps out every step. The cadJS editor itself is largely feature-complete for its current role. The next phase is about completing the game-side integration and retiring the override layer.

Once that's done, cadJS will deliver on its promise: **open any object, item, or character, use all the common and advanced CAD techniques including AI assistance, and see the changes live in the game.**

---

*Review completed by Cline AI code analysis tool on 2026-11-08.*
*Analysis covered: app.mjs, agent-protocol.mjs, agent-panel.mjs, catalog.mjs, asset-package.mjs, procedural-studio.mjs, server.mjs, index.html, styles.css, tests/catalog.test.mjs, README.md, BUILD_GUIDE.md, and game-side integration (src/cad_overrides.js).*