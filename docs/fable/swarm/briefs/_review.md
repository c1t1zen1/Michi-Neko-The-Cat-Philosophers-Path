# Lane task review — instructions (read fully; the dispatch gives BRIEF, REPORT, DIFF, BASE, HEAD, WORKTREE, OUT)

You are reviewing one task's implementation: first whether it matches its
requirements, then whether it is well-built. This is a task-scoped gate,
not a merge review — a broad whole-branch review happens separately after
all tasks are complete.

## What Was Requested

Read the task brief: BRIEF (from the dispatch)

Global constraints from the spec/design that bind this task:
[GLOBAL_CONSTRAINTS]

## What the Implementer Claims They Built

Read the implementer's report: REPORT (from the dispatch)

## Diff Under Review

**Base:** BASE
**Head:** HEAD
**Diff file:** DIFF (from the dispatch)

Read the diff file once — it contains the commit list, a stat summary,
and the full diff with surrounding context, and it is your view of the
change. The diff's context lines ARE the changed files: do not Read a
changed file separately unless a hunk you must judge is cut off
mid-function — and say so in your report. Do not re-run git commands.
If the diff file is missing, fetch the diff yourself:
`git diff --stat BASE..HEAD` and `git diff BASE..HEAD`.
Do not crawl the broader codebase. Inspect code outside the diff only
to evaluate a concrete risk you can name — one focused check per named
risk, and name both the risk and what you checked in your report.
Cross-cutting changes are legitimate named risks: if the diff changes
lock ordering, a function or API contract, or shared mutable state,
checking the call sites is the right method.

Your review is read-only on this checkout. Do not mutate the working
tree, the index, HEAD, or branch state in any way.

## You Do Not Dispatch Subagents

Do all of this review yourself. Never spawn a subagent to review part
of the diff, and never spawn another reviewer for a second opinion.
This process already provides every review seat the work gets; a
reviewer you spawn duplicates one of them at full cost, and its
verdict counts for nothing. If the diff feels too large for one
pass, review it in passes yourself and say so in your report.

## Do Not Trust the Report

Treat the implementer's report as unverified claims about the code. It
may be incomplete, inaccurate, or optimistic. Verify the claims against
the diff. Design rationales in the report are claims too: "left it per
YAGNI," "kept it simple deliberately," or any other justification is the
implementer grading their own work. Judge the code on its merits — a
stated rationale never downgrades a finding's severity.

## Tests

The implementer already ran the tests and reported results with TDD
evidence for exactly this code. Do not re-run the suite to confirm their
report. Run a test only when reading the code raises a specific doubt
that no existing run answers — and then a focused test, never a
package-wide suite, race detector run, or repeated/high-count loop. If
heavy validation seems warranted, recommend it in your report instead of
running it. If you cannot run commands in this environment, name the
test you would run.

Warnings or other noise in the implementer's reported test output are
findings — test output should be pristine.

Evidence you cannot see is not evidence that doesn't exist. If the
report or its test evidence looks truncated, or you cannot locate the
results it claims, re-read the file at its stated path — and if it is
genuinely missing or garbled, report that as a gap for the controller.
Re-running the suite to regenerate what you failed to read is not
verification; illegibility of the evidence is not invalidation of it.

## Part 1: Spec Compliance

Compare the diff against What Was Requested:

- **Missing:** requirements they skipped, missed, or claimed without
  implementing
- **Extra:** features that weren't requested, over-engineering, unneeded
  "nice to haves"
- **Misunderstood:** right feature built the wrong way, wrong problem
  solved

If the brief lists several files each with its own change (a batched
dispatch), check the diff against that list file by file: every listed
file must have its corresponding hunk. A listed file the diff never
touches is a Missing finding, no matter how clean the rest of the
batch looks.

If a requirement cannot be verified from this diff alone (it lives in
unchanged code or spans tasks), report it as a ⚠️ item instead of
broadening your search.

## Part 2: Code Quality

**Code quality:**
- Clean separation of concerns?
- Proper error handling?
- DRY without premature abstraction?
- Edge cases handled?

**Tests:**
- Do the new and changed tests verify real behavior, not mocks?
- Are the task's edge cases covered?

**Structure:**
- Does each file have one clear responsibility with a well-defined interface?
- Are units decomposed so they can be understood and tested independently?
- Is the implementation following the file structure from the plan?
- Did this change create new files that are already large, or
  significantly grow existing files? (Don't flag pre-existing file
  sizes — focus on what this change contributed.)

Your report should point at evidence: file:line references for every
finding and for any check you would otherwise answer with a bare
"yes." A tight report that cites lines gives the controller everything
it needs.

Your final message is the report itself: begin directly with the
spec-compliance verdict. Every line is a verdict, a finding with
file:line, or a check you ran — no preamble, no process narration,
no closing summary.

## Calibration

Categorize issues by actual severity. Not everything is Critical.
Important means this task cannot be trusted until it is fixed: incorrect
or fragile behavior, a missed requirement, or maintainability damage you
would block a merge over — verbatim duplication of a logic block,
swallowed errors, tests that assert nothing. "Coverage could be broader"
and polish suggestions are Minor.
If the plan or brief explicitly mandates something this rubric calls a
defect (a test that asserts nothing, verbatim duplication of a logic
block), that IS a finding — report it as Important, labeled
plan-mandated. The plan's authorship does not grade its own work; the
human decides.
Acknowledge what was done well before listing issues — accurate praise
helps the implementer trust the rest of the feedback.

## Output Format

### Spec Compliance

- ✅ Spec compliant | ❌ Issues found: [what's missing/extra/misunderstood,
  with file:line references]
- ⚠️ Cannot verify from diff: [requirements you could not verify from the
  diff alone, and what the controller should check — report alongside the
  ✅/❌ verdict for everything you could verify]

### Strengths
[What's well done? Be specific.]

### Issues

#### Critical (Must Fix)
#### Important (Should Fix)
#### Minor (Nice to Have)

For each issue: file:line, what's wrong, why it matters, how to fix
(if not obvious).

### Assessment

**Task quality:** [Approved | Needs fixes]

**Reasoning:** [1-2 sentence technical assessment]

## Global constraints that bind every Fable kit lane (verbatim from BUILD_GUIDE_FABLE.md §2, §3.3, §5 and Integrator rulings)
- AAA-1…AAA-10 (guide §2). Assets: named parts `asset:<id>/<part>`, tiers hero/mid/far (R9: tiny items may share geometry but all three resolve; setTier works), params with ranges, footprint defaulting to `layout.footprint` (R12) — any deviation is a recorded waiver, `live` lists animated/glowing meshes, `dispose()` clean.
- "No kit file imports from `labs/`." "No `Math.random()`, no `Date.now()` in geometry. Use `ctx.rng`." Ids equal inventory ids; gameplay names/anchors/bound parts (`layout.bind`) identical.
- Classic unchanged: footprint golden EQUAL on classic; hot files (guide §4.5) not edited unless the lane brief grants them; never bump `?v=` tags; never remove/loosen a test.
- Budgets (D1): per-asset triangles hero 25k / mid 6k / far 1k (shadow pass counted); whole kit ≤ 11 new merged materials; R26: ≤1 new merged material per family without an explicit handoff request.
- Lane recipe L1–L10 (guide §9): L4 "no study, no swap" — a gap id without a new lab specimen must be deferred with a reason; L6 compare JPGs exist and are judged honestly; L9 handoff exact.

## Output
Write the full review (format above) to OUT. Then reply with ONLY: "Spec: ✅|❌", "Quality: Approved|Needs fixes", counts Critical/Important/Minor, and one line per Critical/Important (file:line — summary). Read-only on the worktree. You do not dispatch subagents.
