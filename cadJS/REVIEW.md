# cadJS Application Review

**Date:** 2026-11-08  
**Reviewer:** Cline (AI code analysis)  
**Scope:** Complete cadJS codebase (src/, server, tests, documentation)  
**Lines analyzed:** ~28,000 across 6 core modules + game-side integration

---

## 1. Executive Summary

cadJS is a mature, well-architected Three.js CAD workspace with impressive feature coverage for a game-asset-specific tool. The application provides a complete editing pipeline: **import → transform → reshape → texture → AI redesign → export/push-to-game**, with strong emphasis on procedural Kyoto-themed content and multi-provider AI integration.

**Key finding:** The v1.0 vision — "open any object, edit it, click Save to Game, see it change in `git diff`" — is **partially realized**. The editing and AI tools are production-quality, but the underlying "data-driven assets" architecture (writing directly to `src/assets/*.def.js`) remains aspirational. The current implementation uses an override layer (`cad-overrides.json`) that patches values at runtime rather than changing the source of truth.

**Overall rating: 8/10** — excellent tool, partially realized vision.
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