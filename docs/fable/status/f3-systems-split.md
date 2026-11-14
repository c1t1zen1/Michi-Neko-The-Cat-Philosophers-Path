# f3-systems-split

- Worker / model:     Claude Opus 5.5 (claude-opus-5-5)
- Claimed:            2026-11-13 04:06 PST
- Branch:             fable/f3-systems-split
- Base commit:        5dc924a (fable/integration, includes the f1-golden footprint golden)
- State:              in progress

Lane: guide §8 "Lane f3-systems-split" (F3.1–F3.4). Layout / mesh split and
`placeAsset` routing for the 21 builders in `src/vegetation.js`,
`src/interior.js`, `src/hidden_places.js`, `src/ambient_life.js`,
`src/particles.js`; the footprint golden extended to the interior, the hidden
places, vegetation, ambient life and particles.

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| (none: Phase 1 split lane, no kit assets) | | | | | |

## Steps
- [x] F0 Claim (this file, pushed)
- [x] F3.3a Systems golden from the UNCHANGED code (`tools/golden/systems_classic.json`, 283,433 bytes), committed before any split
- [ ] F3.1 hidden_places.js: buildMoonPool, buildLanternGlade
- [ ] F3.1/F3.2 interior.js: buildInterior, buildKnockables
- [ ] F3.1 vegetation.js: buildSakuraGrove, buildDappledLight, buildPetalDrifts, buildBambooGrove, buildMaplesAndPines, buildMeadow
- [ ] F3.1 ambient_life.js: buildBirds, buildGuardianBirds, buildButterflies, buildKoi
- [ ] F3.1 particles.js: buildGodRays, buildRain, buildRiverPetals, buildPetals, buildFireflies, buildMotes, buildSnow
- [ ] F3.4 sky.js / postfx.js / grass.js untouched (checked)
- [ ] Checks, review sheets, headless boot, handoff, report, PR

## Checks run (command → real result)

### Systems golden (F3.3), generated from the unchanged code @ dbd2626
- `node tools/footprint_golden.mjs --systems --out …/sysN.json` ×3 (Metal) + `--gpu swiftshader` → the four digests share
  SHA-256 `9f4019c71bc072abbf25bd122aac8c86c17a83de63f407ab6ed72f0b7f3ae53e`; `volatile 0 leaves` (two same-seed builds per run agree)
- `node tools/footprint_golden.mjs --systems --write` → `WROTE`, 283,433 bytes; then `--systems` → `EQUAL … byte-identical`, `--systems --gpu swiftshader` → `EQUAL`
- counts: 156 objects · 376 members under 48 anchors · 10 baked · 135 colliders (8 interior + 127 vegetation) · 1 platform · 42 textures · 25 trees;
  rng: vegetation 249,867 draws (probe ok) · hidden 7,810 · Math.random particles 15,534, ambient 648
- `node tools/footprint_golden.mjs` (valley) → `EQUAL`, byte-identical (the hook does not touch the valley run)
- Perturbation (temporary edits, reverted): apron speckle width `rand() * 4` → `* 4.001` and god-ray phase `6.28` → `6.2801` →
  `DIFFERENT (13 changed, 1 added, 1 removed)`, exit 1: `particles.godRays[0..11]` exact hashes, the apron texture id, the apron member
- First Metal vs SwiftShader run differed only in textures.js plaster pixels (a `getImageData` read-back of rasterized cracks);
  ImageData arguments are now hashed by size only (documented in the module header)

## Deferred assets and why

## Footprint waivers requested

## Notes for the Integrator
