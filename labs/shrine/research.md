# Torii, sandō and shrine (Hongu) research — 2026-11-06

Notes behind `labs/shrine/` (Lab 06). 6 searches. "Read" = fetched and
summarised; "Excerpt" = only the search-result excerpt was available (claims
from it are limited to what the excerpt said).

What the game does today (`src/countryside.js`): `buildTorii()` is a myōjin
gate with lacquer pillars (0.22→0.28 m radius, 4.6 m tall, 3.6 m apart), a
black kamebara collar at each foot, a swept kasagi built from a straight
centre beam plus two tilted wing boxes and a black shimaki cap, a nuki with
kusabi wedges, and a small box standing in for the gakuzuka. `buildShrine()`
is a stepped stone base, a timber hall, a shoji inset, a kawara gable with
chigi and katsuogi, a plain shimenawa rope (no shide), a hanging suzu bell, a
saisen box. Missing: komainu, chōzuya, a raked sandō, the shide, the name
tablet, the pillar lean.

## The gate (torii)

| Part | What it is | From |
|------|-----------|------|
| Families | **Shinmei**: straight kasagi, upright round posts, a nuki that does not project, no gakuzuka — the older, Ise form. **Myōjin**: upcurved (sorimashi) double lintel, posts leaning slightly inward, a nuki that passes through and projects about 1/5 its length. Dozens of Edo-period variants (Kasuga, Hachiman, Ryōbu, Miwa, Mihashira, Gekū…) | jref, Textbook of Architecture, Commons type chart (excerpts) |
| Parts | kasagi (top lintel), shimaki (second lintel riding under it; both end-cut with an inward slant), nuki (tie beam), kusabi (wedges driven above the nuki), gakuzuka (a central strut, often carrying the shrine-name tablet), hashira (posts) on kamebara (mound stone) or square daiishi bases, with an inward lean uchikorobi. A decorative daiwa ring sometimes wraps the post below the kasagi, and a black nemaki sleeve can replace the base stone | JAANUS *myōjin torii* (excerpt, has a labelled diagram), rachelstull (excerpt) |
| Proportions | In a myōjin torii the distance from ground to the underside of the nuki equals the clear span between the posts | JAANUS (excerpt) |
| Paint | Black and vermilion: only the kasagi and nemaki are black; the rest is vermilion. Vermilion (shu-iro, from cinnabar / mercury sulphide) preserves wood and deters insects; it is an amulet against evil and a lucky colour | rachelstull, JNTO, Fushimi Inari FAQ (excerpts) |
| Kyoto scale | Fushimi Inari alone has ~10,000 torii, donated since the Edo period, lining the mountain paths — the "senbon torii" (thousand gates) | Fushimi Inari FAQ and Senbon Torii page (excerpts) |

## The approach (sandō)

* The centre of the sandō is the **seichū**, the kami's path; visitors keep to the sides and bow slightly to cross it (Kego Shrine manners — excerpt).
* **Komainu** (lion-dogs) guard the entrance or the gate, in pairs with one mouth open (*a-gyō*, the first syllable) and one closed (*un-gyō*, the last) — together *a-un*, the beginning and end of all things, echoing the Niō guardians. Most are stone; one of a pair sometimes has a horn. Since the Edo period they have been placed along the sandō. Older pairs sit inside the precinct (*jinnai komainu*) (Wikipedia, Kokugakuin, Met Museum, JTA — excerpts).
* **Chōzuya / temizuya**: a roofed basin for purification. The ritual is fixed: scoop once with the hishaku (right hand), rinse the left hand, pass the ladle to the left and rinse the right, pass back and rinse the mouth from the cupped hand (never touching the ladle to the lips), rinse the left again, then stand the ladle upright so the last water runs down the handle (Ise Jingū, Kego, Sapporo — excerpts).

## The hall (haiden / honden)

* Prayer is **two bows, two claps, one bow** (exceptions: four claps at Izumo and Usa, eight at Ise). First a coin is dropped in the **saisen-bako**, then the **suzu** bell is rung gently — once to three times — as a "doorbell" greeting to the kami. Auspicious coins play on homophones: 5 yen = *go-en* ("connection"), 11 yen = *ii en* (nippon.com, japaniche — excerpts).
* **Shimenawa** marks sacred space; suspended ropes are thicker in the middle and taper to the ends, with tassels at intervals. It is woven from rice or wheat straw today (hemp historically) (nippon.com — excerpt).
* **Shide** are the white paper zigzags hung on the shimenawa. The zigzag is said to be a lightning bolt — *inazuma* "rice's wife", a good omen that ripens the rice. There are three folding schools: **Yoshida** (all folds to one side, most common), **Shirakawa** (alternating folds) and **Ise** (a different cut entirely) (Wikipedia, Ōtakiage Jinja — excerpts).
* Roof details already used by the game: **chigi** (crossed forked timbers at the ridge ends) and **katsuogi** (short logs laid along the ridge), which mark a Shinto roof.

## Decisions for the Lab

1. **Draw the kasagi.** A curve editor for the sorimashi sweep, switching between shinmei (straight) and myōjin (curved), showing the uchikorobi lean and the 1/5 nuki projection. Live labels on kasagi, shimaki, nuki, kusabi, gakuzuka, hashira, kamebara.
2. **Fold the shide.** A three-way chooser (Yoshida / Shirakawa / Ise) that folds a paper strip procedurally and hangs it on the shimenawa.
3. **Place the guardians.** Pick a komainu pair (a-gyō left / un-gyō right), in stone, bronze or lacquered wood, at the torii or along the sandō.
4. **Build the sandō.** Raked gravel between the mown lawns (reusing the ground lab's gravel and rake), with the seichū marked and a chōzuya whose ladle pours a little water.
5. **The mist altar** ties the whole precinct to the game's bell-ringing summit sequence.

## Image references

* Torii type chart (all ten variants in one SVG): <https://commons.wikimedia.org/wiki/File:Torii_gate_variation.svg>
* Torii category (materials, night, snow, shimenawa): <https://commons.wikimedia.org/wiki/Category:Torii>
* A vermilion myōjin torii, Tokyo (photo): <https://commons.wikimedia.org/wiki/File:Torii_gate,_Tokyo.jpg>
* Labelled myōjin-torii diagram: <https://www.aisf.or.jp/~jaanus/deta/m/myoujintorii.htm>
* Senbon torii tunnel, Fushimi Inari (category of photos): <https://commons.wikimedia.org/wiki/Category:Fushimi-Inari-taisha_sembon-torii>
* Komainu category: <https://commons.wikimedia.org/wiki/Category:Komainu>
* Komainu at Shiramine-jingū, Kyoto (category): <https://commons.wikimedia.org/wiki/Category:Shishi_komainu_in_Shiramine-jingu_(Kamigyo-ku,_Kyoto)>
* Kamakura komainu pair, Met Museum (object photos): <https://www.metmuseum.org/art/collection/search/53190>

## Sources

* JAANUS — *myoujin torii 明神鳥居* — <https://www.aisf.or.jp/~jaanus/deta/m/myoujintorii.htm> (excerpt)
* Japan Reference — *Torii* — <https://jref.com/articles/torii.33/> (excerpt)
* Textbook of Architecture — *Two families of torii* — <https://textbookofarchitecture.com/rule/torii-types> (excerpt)
* Rachel Stull — *Torii: structure and styles* — <https://racheldstull.github.io/j301-honors-contract/torii.html> (excerpt)
* Fushimi Inari Taisha — *FAQ* — <http://inari.jp/en/faq/> · *Senbon Torii* — <http://inari.jp/en/map/spot_07/> (excerpts)
* Japan National Tourism Organization — *The many types of torii in Japan* — <https://www.japan.travel/en/uk/inspiration/the-many-types-of-torii-in-japan/> (excerpt)
* Wikipedia — *Komainu* — <https://en.wikipedia.org/wiki/Komainu> (excerpt)
* Kokugakuin Digital Museum — *Komainu* — <https://d-museum.kokugakuin.ac.jp/eos/detail/id=9928> (excerpt)
* Metropolitan Museum of Art — *Guardian Lion-Dogs* — <https://www.metmuseum.org/art/collection/search/53190> (excerpt)
* Japan Tourism Agency — *Komainu guardian statues* — <https://www.mlit.go.jp/tagengo-db/en/H30-00887.html> (excerpt)
* Kego Shrine — *How to worship at a Shinto shrine* — <https://kegojinja.or.jp/en/taizen/manners/> (excerpt)
* Ise Jingū — *Pray / temizu* — <https://www.isejingu.or.jp/en/pray/> (excerpt)
* Nippon.com — *Shimenawa: the sacred rope* — <https://www.nippon.com/en/articles/-/12567> · *Haiden: the hall of worship* — <https://www.nippon.com/en/articles/-/12570> (excerpts)
* Wikipedia — *Shide (Shinto)* — <https://en.wikipedia.org/wiki/Shide_(Shinto)> (excerpt)
* Ōtakiage Jinja — *紙垂（しで）とは* — <https://otakiagejinja.com/media/3825> (excerpt)