# a1-village handoff (Phase 7, the Kyoto village)

Patches for files this lane may not edit (hot files, guide §4.5). Each is
exact; apply as written.

## 1. Summit kit sounds reach the sink (R62): `src/mountaintop.js`

The one sink is installed in `src/main.js` (granted block). Valley kit
instances get `env.audio` from `Game.assetEnv()`; the summit's own
`SummitManager.assetEnv(sky)` builds a separate env without it, so the
summit fūrin (`summit-furin`, garden `buildWindChime`) and the summit toro
(`summit-entry`, lanterns `lampUpdate`) emit nothing. One line in
`assetEnv(sky)`, after `env.lanternOn = …`:

```js
    env.lanternOn = 1 - Math.max(0, sunY) * 5 > 0.5;
    // the kit sound hook (src/kit/audio.js): the summit's fūrin and toro play through the game's one sink (a1-village, R62)
    env.audio = (this.assets && this.assets.runtime && this.assets.runtime.audio) || null;
    return env;
```

`this.assets` there is the `scopeAssets()` view (its `runtime` is the
AssetRuntime). Classic: `scopeAssets` of the classic pass-through has no
`runtime`, so `env.audio` is null and no summit instance exists anyway.
The sink fades each event with distance from the cat, and the summit sits
1.2 km below the valley (`src/summit/common.js` ORIGIN), so valley and summit
never hear each other.
