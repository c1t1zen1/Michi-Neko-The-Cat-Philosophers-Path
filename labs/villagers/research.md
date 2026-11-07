# Villager cats research — 2026-11-06

Notes behind `labs/villagers/` (Lab 19). 5 searches. "Read" = fetched and
summarised; "Excerpt" = only the search-result excerpt was available (claims
from it are limited to what the excerpt said).

What the game does today (`src/npc.js`): each villager is a real `Cat` with a
`PERSONALITIES` entry (stripe amount, body scale, idle-verb weights and
pacing, greeting, startle, opt-in `sleepAtNight`), and the coats were rebuilt
in the cat pass. What's left for this lab is the life on top: eye shine at
dusk and idle grooming, and a coat-pattern chooser that mirrors the real
genetics.

## Why their eyes shine at dusk

* The **tapetum lucidum** ("shining layer") sits behind the retina and reflects
  light back through it for a second pass, so a cat sees in about **16 %** of
  the light a human needs, with pupils that open ~50 % wider than ours. In
  cats the reflecting compound is **riboflavin**, which is why the shine is
  usually **yellow-green** (The Conversation, TVMF, VCA — excerpts).
* The shine is **retroreflective**: it points back toward the light. So the
  lab rule is: a cat's eyes glow only when the camera, the eye and a light
  source (a lantern, the moon) line up, and only as the light dims.

## Grooming, by the numbers

* Grooming is ~4 % of a cat's daily time budget (some studies say 25–30 % of
  waking time). Face-washing is the single biggest piece — **31 %** of oral
  grooming — then hindlimb 21 %, sides/back 13 %, neck/chest 11 %,
  anogenital 10 %, abdomen 9 %, tail 5 %; bouts loop back and forth between
  parts (PMC grooming studies — excerpts).
* The mechanics: backward-curving **filiform papillae** make the tongue a
  rasp; the face and ears are washed by licking the **forepaw** and wiping it
  from the back of the head forward, against the hair growth (learnaboutcats
  — excerpt). That "lick paw, wipe face" loop is the readable idle.

## Coat genetics (the palette)

* Tabby is two features: a light *agouti* background (banded hairs) plus a
  darker unbanded component. The pattern gene gives **mackerel** (periodic
  vertical stripes, dominant *Mc*), **classic/blotched** (whorls, recessive
  *mc*), **spotted** (*Sp*, needs *Mc*), and **ticked** (*Ta*, which masks the
  others except on legs, tail and face). Non-agouti (*a/a*) suppresses
  ticking entirely into a solid coat (Kaelin, CFA, labgenvet — excerpts).

## Decisions for the Lab

1. **Eye shine that means something.** A dusk slider: as the light drops, a
   lantern behind the camera lights each villager's eyes yellow-green, and it
   winks out the moment the geometry no longer lines up.
2. **A groom loop.** Lick paw → wipe face (against the hair) → lick the flank
   → pause, weighted by the existing per-personality idle verbs.
3. **A coat chooser.** Mackerel, classic, spotted, ticked and solid, with the
   existing stripe amount as the agouti dial, kept in step with
   `tools/cat_preview.js` palettes.

## Image references

* Cat licking its paw (face-washing): <https://commons.wikimedia.org/wiki/File:Cat_licking_it%27s_paw_-_by_tracy.jpg>
* Tabby cat licking itself: <https://commons.wikimedia.org/wiki/File:Young_tabby_cat_licking_itself.jpg>
* Black cat with glowing eyes (tapetum): <https://commons.wikimedia.org/wiki/File:Black_cat_with_glowing_eyes.JPG>
* Cat's eyes glowing in the dark: <https://commons.wikimedia.org/wiki/File:Cat%27s_eyes_glowing_in_the_dark.jpg>

## Sources

* The Conversation — *Why do cats' eyes glow in the dark?* — <https://theconversation.com/why-do-cats-eyes-glow-in-the-dark-179531> (excerpt)
* TVMF — *Can cats see in the dark?* — <https://www.tvmf.org/articles/can-cats-see-in-the-dark/> (excerpt)
* VCA Hospitals — *Why do your pet's eyes glow in the dark?* — <https://vcahospitals.com/resources/conditions-dog/eyes-ears-nose/why-do-pet-s-eyes-glow-in-the-dark> (excerpt)
* learnaboutcats — *Lick / wash grooming behaviour* — <http://www.learnaboutcats.co.uk/chapters/1-maintenance-behaviour/e-Grooming/lick-wash.html> (excerpt)
* PMC — *Evaluation of grooming behaviour and apparent digestibility in cats* — <https://pmc.ncbi.nlm.nih.gov/articles/PMC10814636/> (excerpt)
* PMC — *Exploring normal to abnormal grooming behaviours in cats* — <https://pmc.ncbi.nlm.nih.gov/articles/PMC13569197/> (excerpt)
* Kaelin & Barsh — *Tabby pattern genetics* — <https://onlinelibrary.wiley.com/doi/10.1111/j.1755-148X.2010.00723.x> (excerpt)
* CFA — *Colors and patterns: an introduction to color genetics* — <https://cfa.org/wp-content/uploads/2024/02/ColorsPatternsGenetics.pdf> (excerpt)
* Labgenvet — *Cat genetics glossary* — <https://labgenvet.ca/en/cat-genetics-2-2-glossary-of-colour-and-coat-genetics/> (excerpt)