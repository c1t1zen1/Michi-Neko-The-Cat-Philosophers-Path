# Lane brief: c4-creatures (Phase 3 — Larry the turtle and the guardian crows as non-cat CharacterDefs)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/c4-creatures   Branch: fable/c4-creatures (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/c4-creatures-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_character.md, this card. Guide: §10 table row c4-creatures.
Also read docs/fable/status/c1-rig-split.md + handoff (CharacterDef contract), c3-villagers' status (a worked example of
defs), and the guardian-crow lab study v-critters added in labs/critters (Ruling R13: v-critters studies, c4 promotes).

- Scope: Larry the turtle and the guardian crows as non-cat `CharacterDef`s with their own simple rigs (a turtle: shell,
  plastron, four flippers/legs, head, tail; a crow: body, two hinged wings, tail fan, head, beak, legs). Character tiers
  per guide §10: hero full parts, mid simplified, far one merged mesh; quality low keeps the classic body.
- Inventory ids: `larry`, `guardian-crows` (both lack a focused study except the crow study v-critters added; add a
  Larry specimen to labs/critters or a creatures section of labs/villagers FIRST — L4).
- Behaviour stays where it is: Larry's patrol and the Jade Paw challenge logic stay in src/countryside.js; the crows'
  behaviour stays where it lives today (find it). ONLY the bodies are swapped. Every handle the behaviour code reads
  (positions, child meshes it animates, names) must exist on the modular body — prove it in a headless boot by driving
  the patrol / crow animation for a few seconds on modular and capturing a frame.
- Your files: NEW `src/characters/defs/{larry,crows}.js` and new parts/rig files for them in `src/characters/` (never edit
  c1's contract files), `labs/critters/**` or `labs/villagers/**` specimens, status/handoff files. The wiring point
  that builds the classic Larry/crows (countryside.js or ambient_life.js) is hot: write the exact patch in your handoff
  (route through the runtime like the villagers do), or, if a placeAsset id already routes them (check f2/f3 handoffs for
  `larry` / `guardian-crows`), use that and touch no hot file.
- Checks: _character.md's L7 list plus the footprint golden (classic EQUAL; modular swap: Larry's patrol bounds in the
  corral footprint unchanged) and `--systems`.
