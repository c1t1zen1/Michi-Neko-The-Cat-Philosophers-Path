# Sky Lab — implementation research, 2026-11-07

The live lab is [index.html](index.html). This is a new investigation of the
current code and primary sources, beyond the October proposal preserved below.
The implementation is standalone: it does not change the valley or summit.

## First, correct the old baseline

Reading the current `src/sky.js` revealed that the clouds **do drift in x**,
with speed affected by weather and sprite index. The dome also has animated
procedural cirrus. The October note below saying the clouds do not move was
incomplete. They do not share a density field with terrain, deform into other
cloud types, or cast cloud shadows.

`js/original.js` constructs the real `Sky` without `attachRenderer()`, so we
retain `buildDome()`, `buildClouds()`, `buildStars()`, `buildMoon()`, the original
phase palettes and sun path without repeatedly baking an environment. It also
calls the actual tea-house, residence and village-house builders through the
shared game bridge. Static meshes are merged using the game's own merge pass;
materials are cloned before lab shader changes. Each of the four study families
starts with an explicitly labelled original. The original air specimen covers
`sky.js` fog, **not** all of `postfx.js`.

## Primary sources investigated anew

“Read” here means the relevant technique/code sections were opened and examined;
“abstract” is deliberately more limited. Runtime APIs are pinned to r160, not
the newer WebGPU examples returned by current searches.

| Source and access | Finding used in this lab | Boundary |
| --- | --- | --- |
| [Three.js r160 Sky.js](https://github.com/mrdoob/three.js/blob/r160/examples/jsm/objects/Sky.js), source read | Official analytic daylight is a useful physical comparison with exposed Rayleigh/Mie and turbidity controls. It is imported, not reimplemented. | Daylight model; use the lab night dome below the horizon. |
| [Three.js r160 volume example](https://github.com/mrdoob/three.js/blob/r160/examples/webgl2_volume_cloud.html), source read | A small `Data3DTexture`, bounded sampling and early termination can fit a browser study. | The lab uses a 64³ periodic value-noise volume rather than the example's 128³ Perlin volume. |
| [Peicho, part 1](https://davidpeicho.github.io/blog/cloud-raymarching-walkthrough-part1/), ray/bounds/accumulation sections read | Start at the volume boundary; composite front to back; gradients can supply form. | Our volume is a horizontal slab, not the article's unit cube. |
| [Peicho, part 2](https://davidpeicho.github.io/blog/cloud-raymarching-walkthrough-part2/), lighting/material sections read | Keep lighting positions in a consistent coordinate space, and make the material integration explicit. | Our cloud uses a directional sun rather than the article's point-light setup. |
| [Heckel, dreamy cloudscapes](https://blog.maximeheckel.com/posts/real-time-cloudscapes-with-volumetric-raymarching/), Beer/light sampling/phase sections read | Exponential attenuation plus short probes toward the sun gives more useful depth than alpha accumulation alone. A phase function produces directional scattering. | The lab uses two light probes, an HG-shaped forward term and a nonphysical powder adjustment. No multiple scattering, temporal history or claim of physical accuracy. |
| [Schneider & Vos, Nubis](https://www.guerrilla-games.com/read/nubis-authoring-real-time-volumetric-cloudscapes-with-the-decima-engine), publication abstract read | Author weather and animation as shared state rather than independent clouds. | Publication console timings do not predict browser timings. No claim to reproduce Nubis. |
| [Remo, stylised volume](https://remoooo.com/cloud/), pseudocode read | A height/thickness field and a controlled few-value palette suggest a cheaper stylised alternative. | Our thickness and paper studies use field gradients; the continuous volume is a separate renderer. |
| [Hillaire 2020](https://sebh.github.io/publications/egsr2020.pdf), abstract read | Distinguish an actual atmosphere solution from an art-directed gradient. | No Hillaire LUT system is implemented. Spring haze is a palette and layered-mist study. |
| [Mitchell, GPU Gems 3 chapter 13](https://developer.nvidia.com/gpugems/gpugems3/part-ii-light-and-shadows/chapter-13-volumetric-light-scattering-post-process), occlusion/sampling/caveats read | Light shafts depend on occlusion along paths toward the light; screen-space approaches have edge and foreground limits. | Our “sky-space rays” sample the weather field in angular space. They are **not** the book's full occlusion-prepass post-process. Roofs cover the sky but do not generate volumetric shafts. |
| [r160 direct-light chunk](https://github.com/mrdoob/three.js/blob/r160/src/renderers/shaders/ShaderChunk/lights_fragment_begin.glsl.js) and [world-position chunk](https://github.com/mrdoob/three.js/blob/r160/src/renderers/shaders/ShaderChunk/worldpos_vertex.glsl.js), source read | Insert cloud transmittance after directional-light lookup and before the lighting equation. Compute position after model/instance transforms. | Hooks are r160-specific; other shader hooks and their program cache keys must be preserved. |
| [JMA cloud observations](https://www.data.jma.go.jp/okinawa/kansyo/kansoku/ground/cloud.html), page read | High, middle and low cloud genera provide distinct silhouette families. | Cirrus, small scale-like cells, larger sheep-like cells and towers are stylised studies at compressed stage heights. |
| [JMA MRI sky watching](https://www.mri-jma.go.jp/Dep/typ/araki/sorawatch.html), cloud/optical-phenomenon index read | Cloud names and halo/rainbow references inform the atlas. | Seasonal postcards are authored moods, not a simulation or forecast of Kyoto weather. |

## What is actually built

**24 studies in four families.** Five sky models/palettes, nine cloud recipes,
five shadow modes, and five atmosphere options. All have an explanation, a
small original recipe snippet, links to their implementation module and primary
sources, and an explicit limit. These are a selected range of relevant methods,
not a claim to include every cloud shader on the internet.

**The shared field.** `js/field.js` makes a periodic 256² scalar weather map.
Cumulus uses remapped coherent noise; cirrus stretches it anisotropically;
cirrocumulus and altocumulus use jittered cellular distances at different
scales. Signed brush edits are kept separately, so resetting or saving does not
destroy the base recipe. Density texture and canvas painting use matching Y
orientation. Sampling uses world coordinates and one wind offset. The tiny
orange ring in the authoring map marks the world origin's *vertical* projection;
surface sunlight is projected along the sun, so its sample is offset from it.

**Cloud rendering choices.** The single-plane thickness/paper renderers cost
three weather lookups for a density and two gradients. The cached painting
stores RGB plus raw density in alpha; four height slices give it approximate
depth. It is repainted on field/light/pigment edits, not on every wind frame.
The volume uses a 40 m base with an 18 m slab (28 m for towers), 12/24 view
samples, two light probes per occupied sample, Beer attenuation, early exit
and stable spatial hash jitter. The volume noise is 64³ R8 (~256 KiB). The
jitter is **not blue noise**. Thin clouds are intentionally cheaper than volume.

**Projection.** `js/shadows.js` projects each receiving surface toward the sun
to the representative cloud height. Modes are off, hard threshold, five-tap
softened field, Beer-like column attenuation and false-colour density. The
same 2D field drives all new modes; volume shading adds 3D erosion, so the
projected column is an approximation to that volume, not an exact integral.
Below a low solar elevation the effect fades to avoid enormous sliding
shadows. Only directional light is attenuated; hemisphere, point lights,
emission and architectural PCF shadows remain independent. Original sprites
have no field, so their projection controls are disabled instead of showing
unrelated shadows.

**World and art direction.** Real game machiya and the real cat provide scale.
The forest wall reuses the Ranges Lab adapter to the game's leaf-mass canopy;
the ground, grass specimen and layered ridge silhouettes are lab scenery.
The goal is quiet, broad background painting with plausible light: cool shadow
values, cream highlights, restrained paper breakup and large blue openings.
The UI follows Grass Lab's open typography and live specimens, with a sun-path
instrument, paintable weather map and six seasonal postcards.

**Interaction and reproducibility.** Four cameras, cat walking/wandering,
pause/advance, before/after scissor comparison, eight build steps, source
drawers, JSON recipe export/restore, URL sharing and a 1200×750 PNG export.
Drop saved JSON onto the weather map to restore the signed brush. A copied URL
retains settings/time/offset; use JSON for hand-painted edits. Reduced-motion
starts paused. One renderer draws only visible specimens, with lazy creation.
Eco reduces grass, pixel ratio and volume steps. The HUD is an observed frame
rate and algorithm budget, not a cross-device benchmark.

The shared cat walker supplies a small reflection environment. Its contribution
now follows daylight so roofs and plaster do not stay bright at night. The
original stars retain their global cloud-cover fade; this lab does not add
per-star volume occlusion.

## Files and review entry points

* `index.html`, `style.css`: page and instruments.
* `js/data.js`: 24 recipes, six postcards, eight steps, cited sources.
* `js/field.js`: periodic authoring map, painting cache, 3D noise.
* `js/sky.js`: original/analytic/painterly sky composition and volume study.
* `js/shadows.js`: composable r160 directional-light hook.
* `js/original.js`: read-only game adapters.
* `js/world.js`: original houses, forest, foreground and ridges.
* `js/main.js`: views, cameras, authoring, comparison and exports.

Serve the repository root; open `/labs/sky/`. Useful captures:
`?scene=summer&shot=1&nohud=1`, `?scene=gold&shot=1&nohud=1`,
`?scene=night&shot=1&nohud=1`, `?cloud=volume&quality=study`,
`?cloud=field&shadow=map`, `?step=1..8`, `?cat=0`, `?at=30`,
`?view=valley|roof|eye|sun`. Console entry point: `window.__sky`.

See [verification.md](verification.md) for the actual validation record and
limits. The portal image is a capture of the real lab, not concept art.

---

# Historical proposal — 2026-10-25

The following is preserved as the earlier research brief, with its original
read/excerpt distinctions. Decisions above describe the implementation; the
historical proposal is not a list of features claimed as shipped.

Notes behind `labs/sky/` (Lab 05). 11 searches. "Read" = fetched and
summarised; "Excerpt" = only the search-result excerpt was available (claims
from it are limited to what the excerpt said).

What the game does today (`src/sky.js`): a 650 m dome with a gradient
material. The clouds are 26 sprites at fixed bearings and elevations, each
textured from one of three canvases of painted radial-gradient puffs (mauve
belly, cream body, gold rim). Each frame they are tinted toward the warm
colour on the sun's side. Weather moves between clear, cloudy, mist, rain
and snow palettes. The clouds don't move with the wind, don't change shape
and don't cast shadows on the valley.

## What the field agrees on

| Lever | What works | Where it came from |
|-------|-----------|--------------------|
| Volumetric cloudscapes | Ray-march a slab between two altitudes. The base shape comes from low-frequency Perlin-Worley noise, with high-frequency detail and curl-noise distortion on top, and a density-over-height profile per cloud type (stratus, cumulus, cumulonimbus), driven by a weather map. Target 2 ms on a PS4 | Schneider, *Real-time volumetric cloudscapes of Horizon Zero Dawn*, SIGGRAPH 2015 (excerpt, slides) |
| Cloud lighting | Three effects matter: the luminous directional scattering (Henyey-Greenstein phase), the silver lining when looking toward the sun, and the *dark edges* seen looking away from it. The last comes from the "powder" term: Beer's law alone makes edges bright, so multiply by `1 − exp(−2d)` | Schneider 2015 (excerpt) |
| Authoring | Nubis has no assets, only rules for where and what kind of cloud. Transitions are animated along a wind direction | Schneider & Vos, *Nubis*, SIGGRAPH 2017 (excerpt) |
| Browser budget | A tileable 128³ 3D texture holds 2–3 octaves; sample it at several frequencies for more. Space samples logarithmically with distance. Jitter the start (blue noise) to trade banding for noise. Jitter is slightly slower because it is cache-unfriendly | three.js forum *Efficient volumetric clouds* (excerpt), three.js volume cloud example and PR #20222 (excerpt), Peicho (excerpt) |
| Stylised slab | For a toon sky: treat noise as a cloud *thickness* around a centre plane (top and bottom heights from one 2D noise), march a few samples between two planes, and accumulate thickness and first-hit depth. Then shade by depth with a bright rim | Remo *Stylised cartoon volumetric clouds* (excerpt), Methodox raymarched slab (excerpt) |
| Presets | Cumulus: coverage 0.4, density 0.08 · stratus: 0.7 / 0.03 · stormy: 0.9 / 0.15 with a cool ambient | Strata cloud shaders (excerpt) |
| Sky model | Hillaire 2020: small LUTs (transmittance, multiple scattering, sky view, aerial perspective volume) instead of the older 4D tables. Real-time, mobile to PC, with the atmosphere changing dynamically | Hillaire, EGSR 2020 (abstract and excerpt) |
| God rays | Post-process: render an occlusion pass (light source bright, occluders black), radially blur it toward the sun's screen position with decaying samples, and add it to the image. Rays only show when the sun is in or near the frame | Mitchell, GPU Gems 3 ch. 13 (excerpt), screen-space-godrays (excerpt) |
| Cloud shadows | The same field the sky draws, projected along the sun onto the ground (see `labs/ranges/research.md`) | tosijs-3d, procedural PBR notes (excerpts) |

## Kyoto skies

* **Clouds by their old names** — *suji-gumo* (筋雲, cirrus), *iwashi-gumo* / *uroko-gumo* / *saba-gumo* (鰯・鱗・鯖雲: sardine, fish-scale and mackerel clouds, cirrocumulus at 5,000–15,000 m), *hitsuji-gumo* (羊雲, "sheep" altocumulus at 2,000–7,000 m, bigger puffs than uroko), *oboro-gumo* (朧雲, altostratus haze), *wata-gumo* (綿雲, cumulus), *nyūdō-gumo* (入道雲, cumulonimbus) and *kasa-gumo* (傘雲, a cap on a peak). Uroko-, saba-, iwashi- and hitsuji-gumo are all autumn season words. They often come before a low or front, and the folk saying goes "fish-scale clouds: rain within three days" (Suzuka dialect survey, All About, UVa haiku saijiki — excerpts).
* ***Aki takashi* 秋高し** — "autumn is high": the clear, spacious sky of autumn (UVa haiku saijiki — excerpt).
* **Kitayama shigure 北山時雨** — passing showers sweeping down from Kyoto's northern hills in early winter. Cold north-westerly winds carry clouds from the Japan Sea, and they rain on the basin. It comes and goes, with sun between showers, sometimes a rainbow. *Shigure* is a classic early-winter season word, and Bashō's death poem is set in one (tenki.jp, Kotobank, TKG dictionary — excerpts).

## Decisions for the Lab

1. **One cloud field, three renderers.** A shared 2D weather map (coverage, type, wind) feeds three renderers:
   - **painted sprites**: the game today, kept for comparison
   - **a stylised slab ray-march**: thickness around a centre plane, 8–24 steps with blue-noise jitter, Beer plus powder, and an HG silver lining
   - **an "almanac" impostor sky**: the slab baked to a dome texture every few seconds, for cheap devices
2. **Cloud shadows** from the same field: projected along the sun onto a grass-and-ground terrain, with soft edges and wind drift. This is the cheapest big win the visual plan names.
3. **Dial the sky**: drag the sun across the dome, change coverage, type (suji, uroko, hitsuji, wata, nyūdō, oboro) and wind. The lab names the cloud you made.
4. **God rays** as a screen-space radial blur from an occlusion pass of the clouds and the backdrop. Their strength is timed to a low sun behind broken cloud, with a toggle to show the occlusion buffer.
5. **Kyoto weather scenes**: aki-takashi autumn with uroko-gumo, a summer nyūdō-gumo afternoon, a Kitayama shigure passing over with the sun out and a rainbow, and oboro spring haze.

## Image references

* Stylised cartoon volumetric clouds (live, technique reference): <https://remoooo.com/cloud/>
* Cloud raymarching walkthrough (illustrated): <https://davidpeicho.github.io/blog/cloud-raymarching-walkthrough-part1/>
* Kitayama shigure (tenki.jp, with photos): <https://tenki.jp/suppl/m_yoshino/2018/11/27/28619.html>

## Sources

* Andrew Schneider — *The Real-Time Volumetric Cloudscapes of Horizon Zero Dawn* (SIGGRAPH 2015) — <https://www.guerrilla-games.com/read/the-real-time-volumetric-cloudscapes-of-horizon-zero-dawn> · slides <https://advances.realtimerendering.com/s2015/The%20Real-time%20Volumetric%20Cloudscapes%20of%20Horizon%20-%20Zero%20Dawn%20-%20ARTR.pdf> (excerpt)
* Schneider & Vos — *Nubis: Authoring Real-Time Volumetric Cloudscapes with the Decima Engine* (SIGGRAPH 2017) — <https://www.guerrilla-games.com/read/nubis-authoring-real-time-volumetric-cloudscapes-with-the-decima-engine> (excerpt)
* three.js — *webgl volume cloud* example — <https://threejs.org/examples/webgl_volume_cloud.html> · PR #20222 jittering — <https://github.com/mrdoob/three.js/pull/20222> (excerpts)
* David Peicho — *Behind the scene: cloud raymarching demo* — <https://davidpeicho.github.io/blog/cloud-raymarching-walkthrough-part1/> (excerpt)
* Three.js forum — *Efficient volumetric clouds* — <https://discourse.threejs.org/t/efficient-volumetric-clouds/66067> (excerpt)
* Remo — *风格化卡通体积云 (stylised cartoon volumetric clouds)* — <https://remoooo.com/cloud/> (excerpt)
* Methodox — *Shader example: raymarching cloud* — <https://wiki.methodox.io/Frameworks/ShaderLab/Examples/RaymarchingCloud/> (excerpt)
* Strata — *Cloud shaders* — <https://strata.game/shaders/clouds/> (excerpt)
* Sébastien Hillaire — *A Scalable and Production Ready Sky and Atmosphere Rendering Technique* (EGSR 2020) — <https://sebh.github.io/publications/egsr2020.pdf> (excerpt)
* Kenny Mitchell — *Volumetric Light Scattering as a Post-Process*, GPU Gems 3 ch. 13 — <https://developer.nvidia.com/gpugems/gpugems3/part-ii-light-and-shadows/chapter-13-volumetric-light-scattering-post-process> (excerpt)
* math-araujo — *screen-space-godrays* — <https://github.com/math-araujo/screen-space-godrays> (excerpt)
* Suzuka dialect survey — *雲の呼び方* — <https://www.ztv.ne.jp/web/cherry/11suzuka-hogen/03chiiiki-sizen/toppage-you/kumo.pdf> (excerpt)
* All About — *うろこ雲・さば雲・いわし雲・羊雲の見分け方* — <https://allabout.co.jp/gm/gc/220767/> (excerpt)
* UVa Japanese Text Initiative — *Haiku seasonal words, autumn* — <https://jti.lib.virginia.edu/japanese/texts/HigHaik/vol16.html> (excerpt)
* tenki.jp — *冬の雨「時雨」* — <https://tenki.jp/suppl/m_yoshino/2018/11/27/28619.html> (excerpt)
* Kotobank — *北山時雨* — <https://kotobank.jp/word/%E5%8C%97%E5%B1%B1%E6%99%82%E9%9B%A8-474496> (excerpt)
* TKG Japanese-English Learner's Dictionary — *時雨* — <https://www.tkgje.jp/entries/30500/30753_shigure.html> (excerpt)
