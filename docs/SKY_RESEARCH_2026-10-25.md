# Sky, clouds and cloud shadows research — 2026-10-25

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
| Cloud shadows | The same field the sky draws, projected along the sun onto the ground (see `docs/RANGES_RESEARCH_2026-10-25.md`) | tosijs-3d, procedural PBR notes (excerpts) |

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
