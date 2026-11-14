# Handoff: c1-rig-split

What the Integrator should wire or know when merging lane `c1-rig-split`
(guide §10, C1). Nothing here is required for the classic game to keep
working: the lane changes no hot file other than its granted `src/cat.js`,
and `src/npc.js` / `src/player.js` are untouched.

## 1. Files

| Path | What |
|---|---|
| `src/cat.js` | Facade. Same class, same 33 methods (same arity), same fields; every method delegates. New: `setAccessory(slot, part)`, `setTier(tier)`, options `def` / `tier` / `quality`, re-exports of the def helpers |
| `src/characters/character.js` | `CharacterDef` contract, part registry, accessory slots, assembly (`assembleCharacter`, `initCharacterState`), the frame update, tiers |
| `src/characters/rig.js` | sculpt lookup per body type (+ `sculptStats`), skeleton, leg IK wiring, `applyPose`, `layTailOnGround` |
| `src/characters/parts/{coat,face,collar,shadow}.js` | palette + fur + skinned coat/tail/head; face frame, nose, whiskers, eye markers, ears; collar/bell parts `kumihimo`, `suzu`, `suzu-master`; contact shadow |
| `src/characters/behaviour/{locomotion,poses,mood}.js` | gait/air/landing/prowl; rest + action poses, look-at, idle verbs; moods, sounds, face animation |
| `tools/cat_golden.html/.js/.mjs`, `tools/golden/cat_classic.json` | numeric golden of the Cat + 40 contract checks (`node tools/cat_golden.mjs`) |
| `labs/ASSET_COVERAGE.md` | regenerated (`labs_coverage.mjs --write`): only the `src/cat.js#L…` line links moved; every anchor string is verbatim |

## 2. Hot-file patches (Integrator)

### 2.1 `tools/check_syntax.mjs`: also walk `src/characters/`

It walks `src/*.js` and `src/kit/**` only, so the nine new modules are not
syntax-checked by G1. Exact patch (against `fable/integration` @ 619aab7):

```diff
-// Covers src/*.js and the kit, src/kit/**/*.js (every family folder).
+// Covers src/*.js, the kit (src/kit/**/*.js, every family folder) and the
+// characters (src/characters/**/*.js).
@@
 const files = [
   ...readdirSync('src').filter((f) => f.endsWith('.js')),
-  ...walk(join('src', 'kit')).map((p) => p.slice('src'.length + 1))
+  ...walk(join('src', 'kit')).map((p) => p.slice('src'.length + 1)),
+  ...walk(join('src', 'characters')).map((p) => p.slice('src'.length + 1))
 ];
```

Until then: `for f in $(find src/characters -name '*.js'); do node --input-type=module --check < $f || echo FAIL $f; done`.

### 2.2 Cache tags

The new modules import with `?v=20261107a` (the tag on `src/main.js`). The
current AGENTS.md one-liner (`find src -name '*.js' -exec sed …`) already
covers `src/characters/**`. Also bump by hand: `tools/cat_golden.html` (one
`?v=`) and `tools/cat_golden.js` (five literal `?v=` import URLs; no tag
constant). `tools/cat_preview.js` and `rooftops/js/game.js` still import
`cat.js?v=20261106a` (stale since before this lane); they work (the
characters modules load once, under `?v=20261107a`), and the next bump
should bring them in line as AGENTS.md already says for rooftops.

### 2.3 `AGENTS.md`

In the "Cat model review" paragraph, replace

> The cat is sculpted at load time (`src/cat_anatomy.js` → `src/cat_sdf.js`)
> and cached per body type; tweak proportions there, coat/face painting in
> `src/cat_shading.js`, gait and poses in `src/cat.js`.

with

> The cat is sculpted at load time (`src/cat_anatomy.js` → `src/cat_sdf.js`)
> and cached per body type; tweak proportions there, coat/face painting in
> `src/cat_shading.js`. `src/cat.js` is a facade over `src/characters/`
> (Phase 3): the rig and pose application in `rig.js`, parts in `parts/`
> (coat, face, collar + bell, shadow), gait in `behaviour/locomotion.js`,
> poses and idle verbs in `behaviour/poses.js`, moods and face animation in
> `behaviour/mood.js`, and the `CharacterDef` contract, accessory slots
> (`collar`, `bell`, `head`, `back`) and tiers in `character.js`. After any
> change there, `node tools/cat_golden.mjs` (numeric golden of the Cat, a
> few seconds on Metal) must say EQUAL, or `--write` with the reason in the
> commit.

and add a Layout row after `src/kit/`:

> | `src/characters/` | Modular characters (Phase 3). `character.js`: `CharacterDef` `{ id, build, palette, face, accessories, scale, personality }`, `defineCharacter`/`validateCharacterDef`, `MICHI`, accessory parts (`registerCharacterPart`) in slots `collar`/`bell`/`head`/`back`, `setAccessory` (never re-sculpts; `rig.js` `sculptStats` counts), tiers `hero`/`mid`/`far` (`setCharacterTier`, `onCharacterTier`, `characterTierFor`; quality `low` keeps the classic character). `src/cat.js` (`Cat`) is the facade every caller uses |

### 2.4 Guide Appendix C / gate G-C

Add `node tools/cat_golden.mjs` beside the review sheets (G2 or G4): it is
the numeric form of "cat sheets match" and runs in ~2 s.

## 3. For the lanes after C1

**Contract in one breath.** `new Cat({ def, audio, tier, quality })` builds
from a `CharacterDef`; `new Cat({ fur, … })` still works and goes through
`catDefFromOptions`. All state stays plain fields on the Cat. A def:

```js
{ id: 'luna', build: 'luna',
  palette: { fur: 0x7f8796, belly: 0xdadce2, accent: 0x474e5f, stripes: 0.3 },
  face: { eyes: 0xdec056, nose: null },
  accessories: [{ slot: 'collar', part: 'kumihimo', color: 0x2b3d63 }, { slot: 'bell', part: 'suzu' }],
  scale: 1.0,
  personality: { idle: { weights: { groom: 0.42, sit: 0.4, stretch: 0.1, yawn: 0.08 }, interval: [9, 16] } } }
```

- **c2-michi** (player parts): register new parts with
  `registerCharacterPart({ id, slot, materials?, build(host, entry, mount), swapTo?, setTier?, master? })`
  in `src/characters/parts/`; a bell part must name its Master Cat
  counterpart in `master` (that is all `setMasterCat()` reads; once a cat
  is a Master Cat, any bell part put on it is replaced by its `master`). A
  collar part that carries a bell must create `host.bellMount`: when the
  collar is swapped, the bell is hung again on the new mount (a same-part
  recolour of `kumihimo` repaints in place). A modular
  Michi is a second def beside `MICHI`; pick it per asset set in the place
  that builds the player (`src/player.js`, hot file → handoff), e.g.
  `game.assets.setFor('michi') === 'modular'`. Tier wiring (main loop):
  `cat.setTier(characterTierFor({ quality, set, distance }))` —
  `characterTierFor` is the kit's `TIER_POLICY` (src/kit/contract.js,
  imported, Integrator ruling): quality × band, with the camera distance cut
  at `BAND_RADII` (near < 39 m, rim < 80 m); it returns `hero` on quality
  `low` and on the classic set, so classic players never see a tier change.
  Note the policy puts `medium` at `mid` even near the camera. `mid` today
  hides the outline hulls (`host.outlines`) and the whiskers; `far` does the
  same until an `onCharacterTier(fn)` hook builds the single merged mesh.
  `new Cat({ quality: 'low' })` locks the tier at `hero`; it never picks the
  def (a modular def is built as given), so choose the classic def on low.
- **c3-villagers**: Luna / Mochi / Kuro as defs (personality can carry the
  whole `PERSONALITIES` entry: `greeting`, `startle`, `notice` are read by
  `npc.js`, `idle` by the Cat). `tools/cat_golden.js` already proves a Luna
  def builds the same cat as `npc.js`'s options from the same seed (check
  "a Luna CharacterDef is the Luna src/npc.js builds from options"): copy
  that pattern for Mochi and Kuro before switching `npc.js` over.
  `tools/cat_preview.js` can import the defs from `src/cat.js` (re-exported)
  instead of mirroring palettes.
- **c4-creatures**: `build` is a cat body type today (BUILDS key or
  proportions). Larry and the crows need their own host and rig; extending
  `build` to other rigs is a contract change for the Integrator (suggested:
  a `{ rig: 'turtle', … }` build kind dispatched in `assembleCharacter`).
  Not built here.
- **r5-roof-cast**: Chidori is `new Cat({ fur: 0x8f9095, belly: 0xf3f1ec,
  accent: 0x55575e, eyeColor: 0x9fd0a8, stripeAmount: 0.55, ribbonColor:
  0x3a6fa8 })` scaled 0.86; as a def that is `scale: 0.86` and the same
  palette.

**Order matters for the classic cat.** three.js draws four `Math.random`
values per object it makes, and the collar and bell textures draw their
noise from `Math.random`, so the classic assembly keeps the old Cat's call
order exactly (the seeded review sheets depend on it). Part swaps and tier
changes create objects lazily, never during the classic construction.

## 4. Notes

- **Merged, not rebased.** The coordinator asked for `git rebase
  fable/integration` twice; the claim commit was already on the remote, so a
  rebase would have needed a force-push, which the common rules forbid. The
  branch instead has two merge commits of `origin/fable/integration`
  (4bac869, 619aab7). The untracked `tools/headless.mjs` was deleted first;
  the tracked one from Phase 0 is used.
- Review fix round 1 (Integrator rulings): unknown `build` names fail
  `validateCharacterDef` (legacy constructor options stay lenient and fall
  back to Michi, as always); entries compare key-order-independently;
  removed slot fields are set to `undefined`, not deleted.
- The golden is taken on Metal. Under `--gpu swiftshader` the 38 canvas
  texture hashes differ (2D canvas rasterisation differs by backend);
  everything else is equal.
- `labs_coverage.mjs` classifies only `src/*.js`, so inventory rows for the
  cat components still point at the facade methods in `src/cat.js`
  (`buildCoat(`, `buildFace(`, `buildCollar(`, `setMasterCat(`,
  `buildShadowBlob(`…). Pointing them at `src/characters/parts/*.js` needs
  `sourceFiles()` to walk `src/characters/` first (Integrator / c2).
- Module singletons (the whisker material, the shadow-blob texture) moved
  with their code into `parts/face.js` and `parts/shadow.js`; one per page,
  as before (no page loads `cat.js` under two tags).
- `src/npc.js` and `src/player.js` were granted but are unchanged.
