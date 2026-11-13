# Operator decisions D1 to D8 (guide section 7, step P0.7)

Recorded 2026-11-13 by lane `p0-baseline` (part 1, `p0-checks`). Gate G-P0 needs "D1–D8 answered or defaulted in writing";
this file is that writing.

**Every answer below is an Integrator ruling (operator asleep; standing instruction: complete all phases) — operator may overturn.**
The operator asked for all phases to be completed overnight and was asleep when these questions came due, so the Integrator
ruled instead of waiting. Where a ruling equals the guide's default, the entry says so. The operator can change any answer by
editing its entry and telling the Integrator. Lanes already running keep working, and whatever was built on a changed ruling is
revisited at the next gate.

## Summary

| # | Decision | Guide default if unanswered | Ruling | What it unblocks |
|---|---|---|---|---|
| D1 | Accept the budgets from P0.5? | Lanes proceed; G-V1 cannot pass | **Accept, provisionally** | Gate G-V1 |
| D2 | Is the separate summit effort finished, so `s1` may edit `mountaintop.js` and the summit UI? | Phase 4 stays closed | **Phase 4 OPEN** | Lanes `s1` to `s4`, gate G-S |
| D3 | Roof Road unlock, and the four open questions in the spec's section 11 | `r6-game-wiring` stays closed; r1 to r5 proceed | **`r6-game-wiring` OPEN**, with the spec's own answer to each question | Lane `r6`, gate G-R |
| D4 | Period palette: keep modern props out of the default set? | Yes, period only | **Period only** (the default) | `v-alley`, every lab promotion |
| D5 | A new lab for trees? | Yes | **Yes, a new tree lab** (the default) | Lane `v-trees` |
| D6 | May `origin/graphics-overhaul` be ignored? | Ignored, not deleted | **Ignored, not deleted** (the default) | Nothing |
| D7 | Which models run the workers and the Integrator? | none | **Sonnet 5.5 workers; Opus 5.5 for system lanes, serial splits and the Integrator; Fable 5.1 for `f1`, gate reviews and Phase 9** | Dispatch |
| D8 | Hero images: real captures only? | Captures only in "From the build"; concept art kept in a labelled section | **The default** | Lanes `h1`, `h2` |

The default flip (guide section 16, X.1 to X.4) is not one of these eight. It is decided only after the Phase 9 go/no-go;
see the last section.

---

## D1. Budgets

**Question (guide section 7).** Accept the budgets from P0.5?

**Guide default if unanswered.** Lanes proceed; G-V1 cannot pass.

**Integrator ruling (operator asleep; standing instruction: complete all phases) — operator may overturn:** accept the P0.5
budgets provisionally. They are in `docs/fable/baseline/budgets.md`, written by lane part `p0-browser`, which carries the label
"proposals — accepted provisionally under ruling D1".

**Why.** Gate G-V1 requires that the "budgets (D1) hold with the eight families on `modular`". Without an accepted budget that
gate can never pass, and the standing instruction is to complete all phases.

**Limits that stay true.** The budgets come from measurements on one development machine (Apple M5 Max, Chromium, Metal). They
are not a phone or low-end GPU benchmark; the guide says so itself ("Not claimed by this guide: phone and low-end GPU numbers",
section 2). If the operator revises a figure, lanes merged earlier are re-measured at the next gate; G-V3 re-measures the four
spots on all three quality tiers.

---

## D2. The summit effort and `mountaintop.js`

**Question (guide section 7).** Is the separate summit effort finished, so `mountaintop.js` and the summit UI may be edited by
lane `s1`? `AGENTS.md` still forbids it.

**Guide default if unanswered.** Phase 4 stays closed.

**Integrator ruling (operator asleep; standing instruction: complete all phases) — operator may overturn:** Phase 4 is **OPEN**.
Lane `s1-summit-split` is the single writer of `src/mountaintop.js` for its duration; lanes `s2`, `s3` and `s4` follow it. The
summit UI in `index.html` and `ui.js` is no longer off limits either, but those are hot files (guide section 4.5) and change only
through the Integrator, for what the Phase 4 steps need. The summit ownership line in `AGENTS.md` ("Owned by a separate effort —
don't edit it, or the summit UI in `index.html`/`ui.js`, unless asked") is updated in the commit that starts lane `s1`, not
before.

**Why (as given with the ruling).** `origin/fix/hilltop-ground-transitions` is fully merged; the last substantive edit to
`src/mountaintop.js` was 2026-10-28 (`2243d67`) with only cache-tag bumps since; and the operator asked for all phases.

**Evidence re-checked from git when this file was written (`main` @ `ed9f5b9`), with one correction.**

- `git rev-list --left-right --count origin/main...origin/fix/hilltop-ground-transitions` prints `22 0`: the branch has no
  commit that `main` lacks. `origin/roof-road` prints `38 0`.
- The branch's last feature commit is `2243d67` (2026-10-28, "Hilltop ground transitions: stepped approach support, summit
  skirt, shoulder bank; cache tag 20261024b"). Commit `3874999` (2026-10-28) merged `main` into it.
- **Correction to "only cache-tag bumps since".** One later commit is not a tag bump. `c16aeb0` (2026-11-06 22:41, "Add interiors
  and machiya labs; cache tag bump to 20261106a") changed `src/mountaintop.js` by 558 insertions and 168 deletions: 726 changed
  lines in 45 hunks, of which only 8 lines are `?v=` import tags and 718 are code. 40 of the 45 hunks are inside the
  `SummitManager` class, two are the import lines, and three sit among the module's constants and `approachTopAt`. It was
  committed inside a labs commit. The last commit to touch the file is `efbfd8c` (2026-11-07), which changes four `?v=` strings
  (8 lines) and nothing else. Nothing has touched the file in the six days since.
- No branch holds an unmerged change to the file: the two branches above have no commit that `main` lacks, and the one
  unmerged commit on `origin/graphics-overhaul` (`9cbddf2`) does not touch it.
- What git cannot show is uncommitted work elsewhere. The ruling treats the effort as finished on the strength of the evidence
  above and the standing instruction.

**What it changes.** Phase 4 (guide section 11) may start once its dependencies allow: `s1` needs G-F and this ruling; `s2` to
`s4` need `s1` and the kits named on their cards. Rule 4 of guide section 5 still applies: no `this.rng()` draw in
`mountaintop.js` is added, removed or reordered.

---

## D3. Roof Road unlock and the four open questions

**Question (guide section 7).** Roof Road unlock: the Seven Posts railing walk, or one of the alternatives in the spec section
11? Answer all four open questions there. The spec is `docs/superpowers/specs/2026-10-24-rooftop-road-design.md`.

**Guide default if unanswered.** `r6-game-wiring` stays closed; r1 to r5 proceed.

**Integrator ruling (operator asleep; standing instruction: complete all phases) — operator may overturn:** lane
`r6-game-wiring` is **OPEN**. Each of the four open questions takes the spec's own answer, quoted below. Lanes `r1` to `r5` were
never blocked by D3.

**How "the spec's own answer" is read.** Section 11 asks the four questions and does not print a separate recommendation under
any of them. Each answer below is therefore the one the spec's own design already specifies, quoted word for word from the
section that specifies it (line breaks joined into spaces). Three of the four are stated outright by the design. **Question 3 is
the exception:** the spec says nothing about a villager entry, so the chosen answer is the one that adds nothing beyond the
design as written. The Integrator should confirm that reading.

### Question 1: the unlock

Spec section 11, item 1:

> Is the **Seven Posts** railing walk the unlock you want? Alternatives: ring the finished Offering Bells at the bridge, or only at dusk.

**Chosen answer: yes, the Seven Posts railing walk** (not the alternatives). Spec section 4, "The unlock: the Seven Posts":

> Walk the east railing from the north end to the south end without stepping off. As the cat passes each post, that giboshi warms to a glow and plays the next note of a rising pentatonic scale. Step off and the glows fade back: a quiet reset, no penalty. There's no time limit.

> The unlock is gated on noticing, not on quests. It's open from the start of the game, like the summit bell.

### Question 2: one run or a hub

Spec section 11, item 2:

> One continuous run (≈5–8 min), or a hub where each mouth is entered separately?

**Chosen answer: one continuous run.** Spec section 5, "The run: seven mouths", and section 7.3:

> The route is one polyline (the *rail*) with three right-angle turns filleted at 2.5 m. The arc-length parameter `s` runs 0 → 336.8 m.

> Lantern checkpoints sit at each mouth's start. R is a convenience, never needed.

### Question 3: Chidori

Spec section 11, item 3:

> Should Chidori become a valley villager afterwards, with a `PERSONALITIES` entry?

**Chosen answer: no, not now.** Chidori stays the Roof Road's guide cat and gets no `PERSONALITIES` entry; the work can be
revisited after `r6`. The spec gives her only this role, in section 6, item 10:

> **The guide cat.** **Chidori**, a small grey-and-white Pontochō cat named for the plover lanterns. She waits at perches and hops ahead when you come near.

and the game wiring in its section 8.2 table lists no villager or `PERSONALITIES` work. This is the one answer inferred from
the design's silence rather than stated by it (see above).

### Question 4: the finale's sky

Spec section 11, item 4:

> In-game, should the finale always be night, or follow the real clock?

**Chosen answer: always night; the sky follows the run, never the real clock.** Spec section 3 (the "No timers" row) and section
6, item 9:

> The sky advances with **distance along the route**, not seconds. Standing still stops time

> **Afternoon into night.** The sky turns gold over Nishiki, dusk on the laundry decks, lantern night in the float streets. It's driven by progress, so it's yours.

**What it changes.** `r6-game-wiring` (guide section 12, R6.1 to R6.8) implements the spec's section 8.2 table with the Seven
Posts as the unlock, one continuous run entered through the noren veil, Chidori staying on the Roof Road, and the finale's
sky driven by route progress. `r6` needs `r2` to `r5` merged first. `node tools/rooftop_test.mjs` (38 checks) must keep
passing throughout.

---

## D4. Period palette

**Question (guide section 7).** Period palette: keep modern props (bicycle, shop tanuki) out of the default set, as the labs
review did?

**Guide default if unanswered.** Yes, period only.

**Integrator ruling (operator asleep; standing instruction: complete all phases) — operator may overturn:** **period only**
(the default). Modern props stay out of the default set.

**Basis.** The labs review (`labs/REVIEW_2026-11-10.md`) already does this:

> Modern bicycles and shop tanuki remain selectable, outside the initial period palette.

**What it changes.** Lane `v-alley` (and any lane that promotes an Alley Lab specimen) keeps bicycles and shop tanuki out of
the default kit set. They stay selectable in the lab.

---

## D5. A new lab for trees

**Question (guide section 7).** Is a new lab allowed for trees (sakura, maple, pine)? They have review sheets but no lab.

**Guide default if unanswered.** Yes.

**Integrator ruling (operator asleep; standing instruction: complete all phases) — operator may overturn:** **yes, a new tree
lab** (the default).

**Basis.** The six tree rows in `labs/asset_inventory.json` (`sakura`, `maples`, `pines`, `rim-trees`, `tree-trunks`,
`tree-canopies`) have only review-sheet coverage (`tools/tree_preview.html`), and no lab exists for them; see
`docs/fable/baseline/swap_matrix.md`.

**What it changes.** Lane `v-trees` builds the new lab first ("New lab first (D5)", guide section 9 wave 2.3), then promotes
from it. The lab is the lane's own folder under `labs/`.

---

## D6. `origin/graphics-overhaul`

**Question (guide section 7).** May `origin/graphics-overhaul` (one unmerged commit, 2026-09-24) be ignored?

**Guide default if unanswered.** Ignored, not deleted.

**Integrator ruling (operator asleep; standing instruction: complete all phases) — operator may overturn:** **ignored, not
deleted** (the default).

**Basis.** `git rev-list --left-right --count origin/main...origin/graphics-overhaul` prints `123 1`: one commit the branch has
and `main` lacks (`9cbddf2`, 2026-09-24, "Graphics overhaul: foliage shader, PBR materials, post-processing, tabby fur, and
cadJS tools"), and 123 commits on `main` it lacks. It touches `src/countryside.js`, `src/foliage.js`, `src/interior.js`,
`src/main.js`, `src/vegetation.js` and others. The swarm branches from `fable/integration` (= `main`), which does not include it.

**What it changes.** Nothing. No lane reads, merges or deletes the branch. It stays on the remote untouched.

---

## D7. Models

**Question (guide section 7).** Which models run Workers A, B, C and the Integrator?

**Guide default if unanswered.** None given.

**Integrator ruling (operator asleep; standing instruction: complete all phases) — operator may overturn:**

| Role | Model |
|---|---|
| Workers (every lane not named in a row below) | Claude Sonnet 5.5 |
| System lanes `v-ground`, `v-water`, `v-sky` | Claude Opus 5.5 |
| Serial splits `f2-countryside-split`, `f3-systems-split`, `c1-rig-split`, `s1-summit-split`, `r1-roof-split`, `r6-game-wiring` | Claude Opus 5.5 |
| `f1-runtime`, every gate review, and the Phase 9 review (`z-final`) | Claude Fable 5.1 |
| Integrator and controller | Claude Opus 5.5 |

**Basis.** The guide asks for the strongest available model on the wave 2.3 system lanes ("the system lanes in wave 2.3
(`v-ground`, `v-water`, `v-sky`) are the hardest; give them to the strongest of the workers", section 6) and for `f1` and `c1`
(sections 8 and 10). The remaining serial splits are single-writer restructurings of the largest modules and are ruled to the
same tier as the system lanes. Each lane's status file records the model that ran it (guide section 4.4).

---

## D8. Hero images

**Question (guide section 7).** Hero images: real in-game captures only, concept art moved to its own labelled section or
removed?

**Guide default if unanswered.** Captures only in "From the build"; concept art kept in a labelled section.

**Integrator ruling (operator asleep; standing instruction: complete all phases) — operator may overturn:** **the default.**
"From the build" and the Phase 8 hero images are real frames from the game. Concept art stays, in its own clearly labelled
section, and is never presented as a capture. Nothing is removed.

**Basis.** `docs/images/README.md` already separates the two kinds:

> They are **concept/inspiration art** — the look the game's design plans to grow into — not in-game alpha captures.

**What it changes.** Lane `h1-hero` produces real captures only ("No generated or painted-over image is presented as a
capture (D8)", guide section 15), and lane `h2-readme` keeps the concept art in a labelled section of the rewritten README.

---

## The default flip is not decided here

Guide section 16 ends with "the default flip" (X.1 to X.4): a settings-menu entry "Asset set: Auto / Classic / Modular", the
default `assetSet` becoming `'auto'` (classic on `low`, modular otherwise), a cache-tag bump and merge of `fable/integration`
into `main`, and a one-line rollback. **It is decided only after the Phase 9 go/no-go** (`z-final`, step Z.9, a Fable review),
and needs the operator's approval. Until then `assetSet` stays `'classic'` (guide section 3.1), and nothing that changes the
default is merged to `main`.
