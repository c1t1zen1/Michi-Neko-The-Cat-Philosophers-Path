# h2-readme handoff

This lane rewrote `README.md` and updated `INSTALL.md`, `QUICKSTART.md`, `AGENTS.md` and `catalog/README.md`.
`labs/ASSET_COVERAGE.md` was regenerated with `node tools/labs_coverage.mjs --write`; it had no changes.
Nothing under `cadJS/` or `dawCAT/` was edited or staged (the operator's standing rule).

## 1. cadJS/README.md: proposed text for the operator to apply

Guide H2.2 asks for the "Game boundary" and "Structural limitation" sections. `t2-cadjs` already rewrote "Game boundary" and
replaced the structural limit with "Package schema 2 and structure". What is still stale is listed below, each as an exact
replacement. Line numbers are those of `cadJS/README.md` at `fable/integration` 865ca20.

### 1a. "Current boundaries" (lines 57–59): two bullets are no longer true

The game now consumes two kinds of cadJS output (`cad-overrides.json` and `kit-overrides.json`), and the cat is a skinned mesh,
not group pivots (`src/cat.js` facade over `src/characters/rig.js`; `THREE.Skeleton` + `SkinnedMesh`).

Replace:

```text
- cadJS is not yet a permanent game-asset importer. Exports are not automatically consumed by the game.
- The production cat uses articulated `THREE.Group` pivots and separate meshes, not `THREE.Skeleton`/`SkinnedMesh` animation.
```

with:

```text
- cadJS is not a general game-asset importer. The game consumes exactly two of its outputs: `cad-overrides.json` (pushed
  runtime edits to named objects, applied at load by `src/cad_overrides.js`) and `kit-overrides.json` (kit parameter values
  and the classic/modular variant per kit asset, read when the modular set is active). Packages, projects, GLB and OBJ
  exports are not loaded by the game.
- The game's cat is an SDF sculpt skinned to a `THREE.Skeleton` (`SkinnedMesh` parts, built in `src/characters/rig.js`
  behind the `Cat` facade). cadJS shows and moves its parts, but has no rig inspector or animation timeline yet.
```

(The next bullet, "A dedicated rig inspector and animation timeline are planned…", can then be removed, since the new second
bullet says it.)

### 1b. "Game boundary" (line 653, the first bullet's last sentence): when the game reads `kit-overrides.json`

The current text says the game reads the file "when the modular asset set is active (`?assets=modular`; …)". The runtime
(`src/kit/runtime.js`, `preload()`) reads it whenever the kit can be active, which also covers the `assetSet` setting and a
`?swap=` that asks for the kit, and never on quality `low` without an explicit `?assets=`.

Replace:

```text
The game reads this file when the modular asset set is active (`?assets=modular`; its runtime clamps or ignores anything unusable).
```

with:

```text
The game reads this file only when the kit can be active: `?assets=modular` (or `auto` above quality Low), the
`assetSet` setting, or a `?swap=<id>:modular`. Its runtime clamps or ignores anything unusable. The classic default
(and quality Low without an explicit `?assets=`) never fetches it. Classic is still the default asset set; making
modular the default is a later step that needs the final review and the operator's approval.
```

### 1c. "Structural limitation" (guide wording; now "Package schema 2 and structure", lines 633–639)

No change needed: it already says schema 2 creates, removes and reparents named parts, that schema 1 migrates, and that
`create` makes only Group and Mesh parts. One sentence to add at the end of its last paragraph, so a reader does not expect
the game to apply it:

```text
The game never applies structure operations: a package stays a cadJS-to-cadJS exchange, and kit assets change shape in the
game only through their `params` (in `kit-overrides.json`).
```

### 1d. "File map" (lines 943–960) and "Developer checks" (lines 929–941)

The file map lists five of the seven `src/` modules and one of the two tests (`ls cadJS/src cadJS/tests`, checked). Replace the block with:

```text
cadJS/
├── index.html
├── styles.css
├── server.mjs              # also serves the game, /catalog/ and /dawCAT/, and mounts catalog/server.mjs
├── package.json
├── README.md
├── src/
│   ├── app.mjs
│   ├── catalog.mjs
│   ├── agent-panel.mjs
│   ├── agent-protocol.mjs
│   ├── asset-package.mjs   # package schema 2
│   ├── kit-params.mjs      # kit param validation, panel model, kit AI actions (cache-tagged contract import)
│   └── procedural-studio.mjs
└── tests/
    ├── catalog.test.mjs
    └── kit.test.mjs        # every registered kit family's params, through a three.js stub
```


In "Developer checks", the last paragraph says the repository's Node is `v16.13.2`. The dev machine runs Node v26 and the
catalog asks for Node 22+. Suggested replacement:

```text
Use Node.js 22 or newer. `node --check` does not check these ES modules; `npm run check` loads them instead.
```

and the PowerShell path block can become a plain `cd cadJS && npm test && npm run check`.

## 2. Other stale text outside this lane's files

| File (owner) | Text | Suggested change |
|---|---|---|
| `labs/asset_inventory.json` (hot) `scope` | "and in the Roof Road prototype (rooftops/, its own page; the game does not load it yet)" | "and on the Roof Road (rooftops/; in the game since r6-game-wiring, and on its own sandbox page)". Then `node tools/labs_coverage.mjs --write`: the sentence is copied into `labs/ASSET_COVERAGE.md` |
| `catalog/js/links.mjs:107` (r6 handoff §2.3, optional) | "The Roof Road prototype page (not yet in the game)." | "The Roof Road sandbox page (the run is also in the game, past the valley bridge)." |
| `docs/images/README.md` first paragraph (h1-hero) | "This folder holds the inspiration images shown throughout the repository README. They are **concept/inspiration art** … not in-game alpha captures." | The folder now holds both. Suggested: "This folder holds the README's images: real hero captures (lane h1-hero, table below) and concept/inspiration art (listed first), which the README keeps in its own labelled section (decision D8)." |
| `rooftops/README.md` (sandbox) | "**1,082m**, with 14 street sections, 13 turns" | The rail is 1,709.5 m with 13 mouths (`buildLevel().rail.length`); the autopilot reaches the finale perch at s ≈ 1673. The street, turn, tunnel and pocket counts were not re-measured by this lane |
| `catalog/js/app.mjs` inspector (t1) | With the Production variant selected, the action button still reads "Edit original in cadJS" | Label it "Edit production in cadJS" when `state.variant === 'production'` |

## 3. Notes

- The README's teaser video keeps its `poster=` as an absolute `raw.githubusercontent.com/.../main/docs/images/...` URL, now
  `hero-torii-dusk.jpg` (the h1 reviewer's suggestion). It resolves once `main` has the hero images; until then GitHub shows
  the video without a poster on branches other than `main`.
- The README states that classic is the default and that the flip needs the final review and the operator's approval. When
  the flip lands, update: README "What is new" (the "Classic is still the default" paragraph), "Quality and compatibility"
  (the asset-set table), the Roadmap rows, INSTALL "Asset set", QUICKSTART "Settings", AGENTS `src/kit/` row and Status.
- When `b1-build-budget` merges, update the README's two "1.26–1.42 times" mentions and the Roadmap row "Modular
  world-build time", if it closes R66.
