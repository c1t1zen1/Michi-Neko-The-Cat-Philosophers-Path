# Water-garden props research — 2026-11-06

Notes behind `labs/garden/` (Lab 14). 4 searches. "Read" = fetched and
summarised; "Excerpt" = only the search-result excerpt was available (claims
from it are limited to what the excerpt said).

What the game does today (`src/countryside.js`): `buildShishiOdoshi()` is a
bamboo rocker that tips and clacks; `buildWindChime()` hangs a glass bell near
the tea house; `buildOfferingBells()` rings at the shrine. This lab gives each
prop its real mechanism and its sound.

## Shishi-odoshi / sōzu (the deer-scarer)

* It is a **lever on a pivot**, not a motor. A bamboo tube is cut diagonally
  at one end (the open scoop); a **node** inside closes off the water chamber;
  the pin passes through the tube just behind that node. With the chamber
  empty, the longer rear half is heavier and rests on a stone. A thin bamboo
  pipe drips water into the scoop until the front outweighs the rear; the tube
  tips, pours out, and the rear swings back to **strike the stone** — a sharp
  knock that repeats as long as the water runs (Nabunken, Wikipedia, Kyoto
  Journal, Last Codex — excerpts).
* It was a field noisemaker against deer and boar before it was a garden
  ornament; the oldest known mention is a 1305 poem about a sōzu's sound
  growing rare as its water slackens (Last Codex — excerpt).

## Fūrin (the wind-bell)

* A bowl-shaped **glass** bell hung in summer (the "Edo fūrin" tradition,
  free-blown at ~1,300 °C by the *chūbuki* method), with a paper strip called
  **tanzaku** hung from the clapper so a slight breeze makes it ring. The
  sound and the paper blowing are felt as *cooling* — a summer *fūbutsushi*
  (Wikipedia, Yomiuri, Japan Society — excerpts).
* Metal wind-bells came first, hung from temple eaves in the Heian period as
  talismans against evil; they still hang at shrines and temples (Wikipedia —
  excerpt).

## Offering bells (suzu)

* At the haiden, the bell is rung by a long rope to greet the kami — "a
  doorbell or a knock", rung gently once to three times (already covered in
  the shrine notes).

## Decisions for the Lab

1. **Build the rocker.** Show the three positions — filling, tipping,
   striking — driven by a real water mass accumulating in the chamber, so the
   interval is a consequence of the drip rate, not a timer. Tap the bamboo to
   hear the knock.
2. **A glass that rings with the wind.** The fūrin is a translucent glass
   bowl with a paper tanzaku; a wind slider swings the tanzaku, and the bell
   catches the light and rings (a small synthesized ring) only while the wind
   is up.
3. **One water, two sounds.** The shishi-odoshi's knock and the fūrin's ring
   share the game's soft synthesized SFX, paced to the water and the wind.

## Image references

* Fūrin (wind chimes) category: <https://commons.wikimedia.org/wiki/Category:F%C5%ABrin>
* A glass fūrin (photo): <https://commons.wikimedia.org/wiki/File:Furin_japanese_wind_chime.jpg>
* Shishi-odoshi, labelled diagram (parts): <https://lastcodex.org/en/inventions/water-scarecrow/>

## Sources

* Nabunken (Nara National Research Institute) — *deer-scarer 鹿おどし* — <https://www.nabunken.go.jp/org/bunka/jgd/pages/DeerScarer.html> (excerpt)
* Wikipedia — *Shishi-odoshi* — <https://en.wikipedia.org/wiki/Shishi-odoshi> (excerpt)
* Kyoto Journal — *The sound/silence of water* — <https://kyotojournal.org/gardens/the-soundsilence-of-water/> (excerpt)
* The Last Codex — *Water scarer* — <https://lastcodex.org/en/inventions/water-scarecrow/> (excerpt)
* Wikipedia — *Fūrin* — <https://en.wikipedia.org/wiki/F%C5%ABrin> (excerpt)
* The Japan News (Yomiuri) — *Japan's Edo fūrin wind chimes herald start of summer* — <https://japannews.yomiuri.co.jp/features/japan-focus/20230628-119072/> (excerpt)
* Japan Society — *Summer holiday activity pack (fūrin)* — <https://www.japansociety.org.uk/usercontent/79fdeaab3a73230e9504d9d562f1c8e4/SummerHolidayActivityPack.pdf> (excerpt)