# b1-build-budget handoff (ruling R66: the modular world build)

What the lane changed is in-lane (granted files: `src/kit/materials.js`,
`src/kit/ground/layers.js`) and needs nothing applied. This file holds what
the lane measured but did not change, because it is in hot files or in family
files outside the grant, ranked by what it would buy. Numbers, commands and
loads are in `docs/fable/status/b1-build-budget.md`.

## 1. Lever 5, the Roof Road families at boot: measured, not applied

`src/main.js` constructs the game's `AssetRuntime` with no `families` filter,
so on `?assets=modular` `preload()` imports all 28 families, the four `roof*`
ones (rooffestival, roofcanal, roofstreets, roofcast: 20 modules, ~182 kB)
included, and `src/bootstrap.js` `prefetchKit()` starts their downloads with
main.js. Their share of the world build is about nothing:

- in a CPU profile of a modular medium boot (base ef6adad), everything under a
  `src/kit/roof*` or `rooftops/` frame inside the boot is 10 ms, and 8 ms of
  that is the r6 valley pieces (`buildOdoiThicket`, `buildSevenPosts`, both
  sets); the roof families' module top levels are ~1–2 ms;
- `preload()` itself takes ~16 ms of the world build (ctor → assembleWorld),
  because the prefetch has already downloaded and evaluated every family.

So it does not count against R66, and the lane changed nothing for it (the
pocket's `src/rooftops/pocket.js` keeps its own runtime and preload, which
finds the roof families in the module map). If the Integrator wants players
who never reach the Roof Road to skip the ~182 kB on a real network, the exact
patch is (both hot files; the pocket then downloads the roof families on its
first entry, inside the `await this.assets.preload()` it already has):

```diff
--- a/src/main.js
+++ b/src/main.js
@@ this.assets = new AssetRuntime({
       assetSet: this.settings.values.assetSet,
       search: location.search,
-      quality: this.initialQuality
+      quality: this.initialQuality,
+      // the Roof Road families are built only in its pocket (src/rooftops/pocket.js has its own runtime)
+      families: (name) => !name.startsWith('roof')
     });
--- a/src/bootstrap.js
+++ b/src/bootstrap.js
@@ function prefetchKit() {
     import('./kit/index.js?v=20261116a')
-      .then((m) => Promise.all([import('./kit/materials.js?v=20261116a'), ...Object.values(m.FAMILIES || {}).map((load) => load())]))
+      .then((m) => Promise.all([import('./kit/materials.js?v=20261116a'), ...Object.entries(m.FAMILIES || {}).filter(([name]) => !name.startsWith('roof')).map(([, load]) => load())]))
       .catch(() => {});   // the runtime imports (and reports) for real
```

Tried in a scratch worktree (`_scratch/b1-build-budget/noroof`, lane + this
patch): a modular high boot registers 24 families, none `roof*`, requests no
`src/kit/roof*` file, builds the same 261 instances with no console message,
and the street noon frame equals ef6adad's (`maxDelta 0`). The pocket entry
with it was not drilled (r6's Roof Road drill would be the check).

## 2. Family textures painted on first upload (exact patches, not applied)

Levers 1 and 2 move the kit's texture painting out of the world build. Three
more family textures are painted inside it, in files outside the grant. Each
patch below makes the texture at its final size at once and paints it on its
first upload with the helper `paintOnFirstUpload(texture, paint)` (lane commit
dd7ffcc, `src/kit/materials.js`, unit-tested), so the pixels are the same. The
patches were applied together in a scratch worktree on top of the lane
(`michi-wt/_scratch/b1-build-budget/fam`, the diff is
`_scratch/b1-build-budget/family_deferrals.patch`); their checks and what they
buy are in §3. Applying them is a family-owner (or Integrator) change.

What each moves out of the world build (CPU profile of a modular medium boot
at the lane head, load 3.3, so read the shares): the corral sign's painted face
(`faceTexture`, the CJK text, ~15 ms; the classic sign paints the same), the
Moon Pool's caustics (`causticPixels` and the upscale, ~13 ms) and the sky's
cloud field (`cloudField`, ~25 ms). The face and the caustics are drawn only
when the corral or the pool is in view, so at the usual spawn they are not
painted at boot at all; the cloud field is drawn in the first frame.

```diff
diff --git a/src/kit/fences/sign.js b/src/kit/fences/sign.js
index f3237ec..e75c82d 100644
--- a/src/kit/fences/sign.js
+++ b/src/kit/fences/sign.js
@@ -5,7 +5,7 @@
 import { defineAsset } from '../contract.js?v=20261116a';
 import { culmGeometry, knotGeometry, bake } from './culm.js?v=20261116a';
 import { canvas2d, canvasTexture } from '../craft.js?v=20261116a';
-import { KIT_SHARED, tintToward } from '../materials.js?v=20261116a';
+import { KIT_SHARED, tintToward, paintOnFirstUpload } from '../materials.js?v=20261116a';
 
 const matOr = (ctx, name, make) => (ctx.MAT && ctx.MAT[name]) || make();
 
@@ -13,12 +13,15 @@ let faceMap = null;   // one canvas texture for the page (shared: never disposed
 function faceTexture(THREE) {
   if (faceMap && faceMap.userData.rev === THREE.REVISION) return faceMap;
   const [c, x] = canvas2d(512, 160);
-  x.fillStyle = '#e7d0a4'; x.fillRect(0, 0, 512, 160);
-  for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(120,86,48,${0.025 + (i % 5) * 0.01})`; x.fillRect((i * 97) % 512, (i * 31) % 160, 90 + (i % 7) * 20, 2); }
-  x.strokeStyle = '#5a311d'; x.lineWidth = 12; x.strokeRect(6, 6, 500, 148);
-  x.fillStyle = '#7b2018'; x.font = 'bold 52px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
-  x.fillText('警告・凶暴な亀', 256, 80);
-  faceMap = canvasTexture(c);
+  // painted on the face's first upload (R66: out of the world build; materials.js paintOnFirstUpload)
+  faceMap = paintOnFirstUpload(canvasTexture(c), () => {
+    x.fillStyle = '#e7d0a4'; x.fillRect(0, 0, 512, 160);
+    for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(120,86,48,${0.025 + (i % 5) * 0.01})`; x.fillRect((i * 97) % 512, (i * 31) % 160, 90 + (i % 7) * 20, 2); }
+    x.strokeStyle = '#5a311d'; x.lineWidth = 12; x.strokeRect(6, 6, 500, 148);
+    x.fillStyle = '#7b2018'; x.font = 'bold 52px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
+    x.fillText('警告・凶暴な亀', 256, 80);
+    return c;
+  });
   faceMap.userData.rev = THREE.REVISION;
   return faceMap;
 }
diff --git a/src/kit/hidden/pool.js b/src/kit/hidden/pool.js
index a9d3a54..b5ea381 100644
--- a/src/kit/hidden/pool.js
+++ b/src/kit/hidden/pool.js
@@ -8,6 +8,7 @@ import { TAU, sstep, canvas2d, canvasTexture, merge, indexed, rockGeometry, with
 import { fitRock, variantRock, placed, bake, DETAIL, rockMaterials } from '../rocks/stone.js?v=20261116a';
 import { assets as lanternAssets } from '../lanterns/index.js?v=20261116a';
 import { defaultParams } from '../contract.js?v=20261116a';
+import { paintOnFirstUpload } from '../materials.js?v=20261116a';
 import {
   nightnessAt, dayLightAt, calmAt, hourOf, shared, glowTexture, leafMaterial, freePrivate,
   polarDisc, bakeAt, tint, glowPoints, compose, single
@@ -106,12 +107,15 @@ export function causticPixels(sites, N = 64, out = new Uint8ClampedArray(N * N *
 function causticTexture(km, L) {
   const sites = causticSites(L);
   return shared(km, 'caustic:' + sites.length + ':' + sites[0][0].toFixed(5), () => {
-    const N = 64, [c, x] = canvas2d(N, N), img = x.createImageData(N, N);
-    causticPixels(sites, N, img.data);
-    x.putImageData(img, 0, 0);
-    const [c2, x2] = canvas2d(128, 128);                           // a smooth upscale: soft lines, no pixel blocks
-    x2.imageSmoothingEnabled = true; x2.imageSmoothingQuality = 'high'; x2.drawImage(c, 0, 0, 128, 128);
-    const t = canvasTexture(c2, { repeat: true });
+    const [c2, x2] = canvas2d(128, 128);
+    // painted on the texture's first upload (R66: out of the world build; materials.js paintOnFirstUpload)
+    const t = paintOnFirstUpload(canvasTexture(c2, { repeat: true }), () => {
+      const N = 64, [c, x] = canvas2d(N, N), img = x.createImageData(N, N);
+      causticPixels(sites, N, img.data);
+      x.putImageData(img, 0, 0);
+      x2.imageSmoothingEnabled = true; x2.imageSmoothingQuality = 'high'; x2.drawImage(c, 0, 0, 128, 128);   // a smooth upscale: soft lines, no pixel blocks
+      return c2;
+    });
     t.repeat.set(2.4, 2.4); t.center.set(0.5, 0.5);
     return t;
   });
diff --git a/src/kit/sky/field.js b/src/kit/sky/field.js
index ed91e39..e441123 100644
--- a/src/kit/sky/field.js
+++ b/src/kit/sky/field.js
@@ -146,7 +146,51 @@ const cache = new Map();
 export function cloudField(seed) {
   const key = seed >>> 0;
   if (cache.has(key)) return cache.get(key);
-  const N = FIELD_SIZE, raw = new Float32Array(N * N * 4);
+  const N = FIELD_SIZE;
+  // The field is computed on its first use (R66, b1-build-budget: out of the
+  // world build): the texture's first upload, a CPU raw() read or `data`.
+  let data = null;
+  const compute = () => data || (data = paintField(key, N));
+  const texture = new THREE.DataTexture(null, N, N, THREE.RGBAFormat);
+  Object.defineProperty(texture.image, 'data', {
+    enumerable: true, configurable: true,
+    get: () => compute(),
+    set: (value) => { Object.defineProperty(texture.image, 'data', { value, writable: true, enumerable: true, configurable: true }); }
+  });
+  texture.name = 'kit-sky:cloud-field';
+  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
+  texture.magFilter = THREE.LinearFilter;
+  texture.minFilter = THREE.LinearMipmapLinearFilter;
+  texture.generateMipmaps = true;
+  texture.colorSpace = THREE.NoColorSpace;
+  texture.userData.shared = true;
+  texture.needsUpdate = true;
+  const field = {
+    size: N, texture, seed: key,
+    get data() { return compute(); },
+    /** Bilinear CPU read of the mixed field at tile coordinates (u, v) — the same arithmetic as kitCloudRaw(). */
+    raw(u, v, mix) {
+      const data = compute();
+      const fx = (u - Math.floor(u)) * N - 0.5, fy = (v - Math.floor(v)) * N - 0.5;
+      const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
+      const x0 = ((ix % N) + N) % N, x1 = (x0 + 1) % N, y0 = ((iy % N) + N) % N, y1 = (y0 + 1) % N;
+      const k00 = (y0 * N + x0) * 4, k10 = (y0 * N + x1) * 4, k01 = (y1 * N + x0) * 4, k11 = (y1 * N + x1) * 4;
+      let out = 0;
+      for (let c = 0; c < 4; c++) {
+        if (!mix[c]) continue;
+        const a = data[k00 + c], b = data[k10 + c], d = data[k01 + c], e = data[k11 + c];
+        out += mix[c] * (a + (b - a) * tx + (d - a) * ty + (a - b - d + e) * tx * ty) / 255;
+      }
+      return out;
+    }
+  };
+  cache.set(key, field);
+  return field;
+}
+
+/** The field's bytes for one key (the former body of cloudField, verbatim). */
+function paintField(key, N) {
+  const raw = new Float32Array(N * N * 4);
   const s1 = key ^ 0x51ed27, s2 = key ^ 0x2c1b3c6d, s3 = key ^ 0x297a2d39, s4 = key ^ 0x6b43a9b5;
   const warpU = lattice(4, 4, s1, 9), warpV = lattice(4, 4, s1, 10);
   const big6 = cellTable(6, s1), small14 = cellTable(14, s1 ^ 0x3a), alto10 = cellTable(10, s3);
@@ -180,35 +224,7 @@ export function cloudField(seed) {
       raw[k + 3] = fbm(u, v, stratusT, 2);
     }
   }
-  const data = equalize(raw);
-  const texture = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
-  texture.name = 'kit-sky:cloud-field';
-  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
-  texture.magFilter = THREE.LinearFilter;
-  texture.minFilter = THREE.LinearMipmapLinearFilter;
-  texture.generateMipmaps = true;
-  texture.colorSpace = THREE.NoColorSpace;
-  texture.userData.shared = true;
-  texture.needsUpdate = true;
-  const field = {
-    size: N, data, texture, seed: key,
-    /** Bilinear CPU read of the mixed field at tile coordinates (u, v) — the same arithmetic as kitCloudRaw(). */
-    raw(u, v, mix) {
-      const fx = (u - Math.floor(u)) * N - 0.5, fy = (v - Math.floor(v)) * N - 0.5;
-      const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
-      const x0 = ((ix % N) + N) % N, x1 = (x0 + 1) % N, y0 = ((iy % N) + N) % N, y1 = (y0 + 1) % N;
-      const k00 = (y0 * N + x0) * 4, k10 = (y0 * N + x1) * 4, k01 = (y1 * N + x0) * 4, k11 = (y1 * N + x1) * 4;
-      let out = 0;
-      for (let c = 0; c < 4; c++) {
-        if (!mix[c]) continue;
-        const a = data[k00 + c], b = data[k10 + c], d = data[k01 + c], e = data[k11 + c];
-        out += mix[c] * (a + (b - a) * tx + (d - a) * ty + (a - b - d + e) * tx * ty) / 255;
-      }
-      return out;
-    }
-  };
-  cache.set(key, field);
-  return field;
+  return equalize(raw);
 }
 
 /** The coverage threshold of kitCloudAt(), on the CPU (sun occlusion for the post chain). */
```

## 3. The §2 patches, checked in the scratch worktree

- Pixels: `?assets=modular`, ef6adad against lane + §2 patches, the R66 frames
  (street noon, shrine dusk, river night, meadow rain, the summit seat and
  arrival) plus the corral sign (noon, from 3 m) and the Moon Pool (noon, from
  above the rim): `maxDelta 0, pixelsOver8 0` on all eight.
- `node --test tools/a1_village_test.mjs` (the cloud field byte for byte
  against its oracle, read through the new lazy `field.data`): pass 6, fail 0.
- What leaves the build: each kit instance's own `buildMs` (AssetRuntime),
  `?assets=modular`, two boots per root and tier, load 2.41–2.76:

  | Instance | lane (medium / high, ms) | lane + §2 (medium / high) |
  |---|---|---|
  | `clouds` | 23.1, 36.4 / 32.5, 35.9 | 0.6, 0.7 / 1.3, 0.7 |
  | `moon-pool` | 17.6, 26.3 / 28.4, 32.8 | 8.5, 8.5 / 13.2, 13.4 |
  | `corral-sign` | 11.3, 15.8 / 15.0, 15.4 | 0.4, 0.4 / 0.6, 0.4 |

  About 45–65 ms a boot at that load. The world-build totals of these eight
  boots move by more than that between boots of the same root, so the gain is
  below what single boots can show on this machine; the instance times are the
  measurement. The cloud field paints in the first frame (the sky is always
  drawn); the face and the caustics only when the corral or the pool is drawn.

## 4. What is left, ranked by what it would buy

1. **Every valley tree's classic canopy is still built on modular** (hot:
   `src/vegetation.js`; shared: `src/foliage.js`). `Vegetation.layoutTree()`
   calls `buildCanopy(this.rng, …)` for every tree so the valley stream
   advances by the canopy's draws, and on modular the kit tree then builds its
   own canopy and the classic one is disposed unused (`canopyTree`, "A kit tree
   never uses the classic canopy built in the layout step"). In a quiet CPU
   profile of a modular high boot, `layoutTree` is 98 ms of the 236 ms the
   trees take (classic: 90 of 95). A draw-only canopy would keep the stream and
   drop the geometry: a `drawCanopy(rng, opts)` in foliage.js that runs
   buildLeafCanopy / buildClumpCanopy with the tube, tuft, card and merge steps
   skipped but every `rng()` call and the vector maths that decides a draw kept
   (`addSpray`'s `perp()` when `N` is degenerate, `pick()`, the `qRoll`
   angles), returning `{ top, radius }`; and in layoutTree, when
   `this.assets.setFor(id) === 'modular' && this.assets.has(id)`, record the
   draws on a tape (`const tape = []; const rec = () => { const v = this.rng(); tape.push(v); return v; }`)
   and call `drawCanopy(rec, …)`, so a kit build that falls back to classic can
   still build the exact classic canopy from `replay(tape)` in meshTreeClassic.
   Prove it with the footprint golden on both sets (the valley stream probe:
   `valley 49233 draws (probe ok)`), a draw-count test of buildCanopy against
   drawCanopy on every valley tree layout and a spread of seeds, and classic
   `game_shot` pairs. Estimated ~60–70 ms off the modular build at both tiers
   (the geometry share of `layoutTree`), real work, not moved.
2. **The §2 patches**: ~45–65 ms of instance time (above).
3. **The summit's kit after the first frame** (lever 4; `src/mountaintop.js`
   and `src/summit/*`): 24 instances, ~32 ms (medium) / ~60 ms (high)
   profiled, real work (the summit is not drawn before the tenth bell). Needs
   the summit builders split so the kit build of a routed id can run after its
   layout step without anything after it reading the instance (today the vista
   assembly is the parent, by name, of the layers built after it, and
   `layout.bind` fields are read by later builders), then `summit_kit_parity`
   and the routing test re-baselined.
4. **The hero and mid trees' fine wood** (`src/foliage.js` `buildLeafCanopy`,
   shared with the classic trees). `sakura` is the largest kit instance at high
   (13 trees, ~100 ms profiled; 44 ms at medium): every twig and sprig is a
   `flexTube` TubeGeometry, then `mergeGeometries`. Writing the fine wood
   straight into flat arrays, as the same function already does for the spray
   cards, would cut most of it with the same output (hash-test it against the
   current function); it speeds the classic trees too.
5. **The ground field** (`src/kit/ground/field.js` `cachedField`, ~24 ms
   profiled, plus its upload ~10 ms): the GroundField is needed by `bindWorld`
   (wear) after the build, and by the ground material's first draw, not by the
   build; it could bake on first use like the layers.
6. **The rest is hero/mid geometry spread over many families** (at high,
   quiet profile: `kawara-roof` 56, `street-bushes` 38 (the leaf-mass painting
   the classic bushes pay too), `yarn` 36, `mountains` 27, `maples` 25,
   `foothill-forest` 20, `path-shoulders` 16, `bamboo-fence` 16 ms …).

With 1 and 2 the high overhead (~420 ms) would come to ~300–320 ms against the
~350 ms the rule allows on a ~1,390 ms classic build (estimate, not measured).
