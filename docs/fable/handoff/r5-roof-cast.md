# Handoff: r5-roof-cast

## 1. Inventory / registry
`src/kit/index.js` is NOT committed: run `node tools/kit_index.mjs` (family `roofcast`). Kit ids (family `roofcast`, tiers hero/mid/far): `roof-shoki`, `roof-treats` (param `size`), `roof-villagers` (no params). Part names: shoki `asset:roof-shoki/body`, `/sword`; treats `/dish`, `/fish`; villagers `/body`, `/head`, `/arm_l`, `/arm_r`, `/rack` (laundry only).
Production adapter row for `docs/fable/handoff/_production_adapters.md`:
`| r5-roof-cast | roofcast (roof-shoki, roof-treats, roof-villagers; part of 6 ids) | src/kit/roofcast/index.js assets |`
`roof-chidori` is a CharacterDef, not a kit asset (like luna/mochi/kuro): `src/characters/defs/chidori.js` (`CHIDORI`, Michi body, classic coat, blue kumihimo, suzu, dusk eye-shine in pale green, idle weights sit/stretch). Inventory row `roof-chidori`: add `"production": "src/characters/defs/chidori.js"` (adapter note: built with `new Cat({ def: CHIDORI })`).

## 2. Integrator patch: rooftops/js/game.js (r1's file), Chidori
Without it `?swap=roof-chidori:modular` changes nothing (the page builds `guide` by hand). In `loadCats()` replace the `guide = new mod.Cat({ fur: ... });` line (keep the text `guide = new mod.Cat(`: the inventory row `roof-chidori` anchors on it and `labs_check` fails on a stale anchor):
```js
    const chidoriModular = assets.setFor('roof-chidori') === 'modular' && !lowPower;
    const chidoriDef = chidoriModular ? (await import('../../src/characters/defs/chidori.js?v=20261114a')).CHIDORI : null;
    guide = new mod.Cat(chidoriDef ? { def: chidoriDef, quality: 'high' } : { fur: 0x8f9095, belly: 0xf3f1ec, accent: 0x55575e, eyeColor: 0x9fd0a8, stripeAmount: 0.55, ribbonColor: 0x3a6fa8 });
```
(the following `guide.group.scale.setScalar(0.86)` stays; the def's scale is the same 0.86). Every `guide.` call game.js makes (`group`, `update`, `onJump`, `onLand`, `setProwling`, `setLookTarget`, `startIdleAction`, `endIdleAction`, `idleAction`) is the Cat facade's own, so the def provides them all. The patch was applied locally to run the checks and left uncommitted (with it `labs_check` only reports the coverage report stale: run `node tools/labs_coverage.mjs --write`). Bump the tag with the others (cache tag is in the import string).

## 3. Deferred ids
- `roof-boatman`: lives inside the classic takasebune record (`pieces/boat.js`: `{ group, plat, d, boatman, pole, wake, bowRing, lastS, dir }`); `roof-takasebune` is deferred by r3 (r3-b), so no kit boat exists to carry a kit boatman and `build.js` does not route it on its own. Build it with the kit boat (r3-b): `boatman` and `pole` are the record's animated children.
- `roof-hayashi`: the musicians are inside `pieces/float.js` (`{ group, tassels, musicians }`), part of `roof-hoko` (r4-festival). Same reason.

## 4. Notes for the Integrator
- Shoki/treats are unmerged direct-child meshes on the root (extras): the game's greeting swaps the material of every direct child; the facade turns child 0 (`body`). Shoki and treats are small (contract budgets pass at every tier).
- Villagers: ONE new world material (`km.bag`, vertex colours; R52: live unmerged figures, replaces ~10 material draws per resident with the 4 hero, 2 mid, 1 far; meshes per hero resident 32 to ~11). The rooftop golden's routing self-test reports "materials identical" and "other root children identical" failing only for this (the 40 villager groups and the added material); nothing else differs.
- Needs `mergeByMaterial` colour fix? No: all kit meshes here are live (unmerged).
- Specimens: none added (no labs/registry change).
