# 🗄️ Archive — "Cat City FPS" (predecessor project)

**Nothing in this folder is part of Michi-Neko (道猫).** It is kept only for historical reference.

These are the design documents and prototype code for **Cat City FPS / "Cat Walk"** — an
earlier, abandoned concept: a **first-person** cat game set in an **8 km × 8 km procedurally
generated city** (chunked streaming, districts, downtown/suburbs/industrial blocks, Cannon.js
physics, Raspberry Pi 5 memory budget). It originated in the `Hermes-Jetson/Cat_Walk` repo and
its documents are dated 2026-07-10.

The game in this repository is a completely different design: a **third-person** cat strolling
a hand-tuned **Kyoto-inspired valley**, built with Three.js r160 and no physics library.

## Layout

| Path | What it is |
|------|------------|
| `docs/` | Root-level Cat City FPS design docs (architecture, game spec, gameplay, environment, neighborhoods, procedural generation, progression flow, asset-streaming guide) |
| `design/` | The earlier generation of the same Cat City spec set (this project originally lived in a `design/` folder) |
| `src/` | Dead prototype code: `city.js`, `SceneManager.js`, `AssetManager.js`, `StreamingManager.js`, `ARCHITECTURE.js`, `QUICKSTART.js`, and the `city_gen/` Python chunk generator |

Nothing in `index.html` or `src/` imports or links to any of this.

**Authoritative docs for the current game:** [`README.md`](../../README.md),
[`INSTALL.md`](../../INSTALL.md), [`QUICKSTART.md`](../../QUICKSTART.md),
[`NPC_TASKS_AND_ENDGAME_GUIDE.md`](../../NPC_TASKS_AND_ENDGAME_GUIDE.md),
[`FUTURE_QUESTS.md`](../../FUTURE_QUESTS.md).
