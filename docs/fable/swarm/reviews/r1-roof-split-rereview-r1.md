# Re-review: r1-roof-split fix round 1 (28c4709 → ef1c04f)

Reviewer: Claude Opus 5.5. This review covers only the fix diff (`reviews/r1-roof-split-r2.diff`) and the report's "Fix round 1" section. I made no edits.

To keep the machine load low, I ran only the two commands the coordinator allowed, in the worktree at ef1c04f:

| Command | Result |
|---|---|
| `node tools/rooftop_test.mjs` | `40 passed, 0 failed` |
| `node tools/rooftop_golden.mjs` (classic) | `EQUAL`, byte-identical; 441 pieces (573 adds, 0 empty), 156 lights, 61 root children; `routing ok: stand-ins on 9 pieces (kido, rack, boat; legs +x -z -x +z) and 10 extras (pagodas, Shōki); 35/35 checks` |

The fix does not touch `tools/golden/`, `rooftops/js/pieces/`, `game.js` or `level.js` (`git diff --stat 28c4709 ef1c04f` on those paths is empty). The golden therefore still stands on the pre-split proof. `git status` in the worktree is clean.

## The r1 findings

- **Important 1 (five rows in the facade not routed): FIXED.** `rooftops/js/build.js` now builds each of them through `assets.build`:
  - the ground at :167;
  - the distant city at :179;
  - the three pagodas at :186;
  - the Shōki and treats at :191-208.

  Each call uses `extraLayout` (:73). A kit instance is placed by `placePiece(…, { merge: false })` (:87): unmerged, on the root, at the classic spot and heading. A kit pickup group becomes the pickup itself (`userData.pickup`, `dynamic.shoki`/`treats`).

  The classic code is unchanged:
  - the classic callbacks hold the original lines in the original order (ground, city, pagodas east/south/west, pickups);
  - `M.ground.map = M.gravel.map` stays inside the ground's classic callback, and only the ground uses `M.ground`, so a kit ground cannot change any other mesh;
  - the classic golden is still EQUAL.

  The routing self-test now covers the change. Its stand-ins for the pagodas and the Shōki are checked for position, heading, tier `far`/`near`, place among the root children and pickup registration. It also checks that the treats, which are not swapped, stay classic, and that every other root child is identical to the classic build.

  The test was extended, not loosened: the old instance-count condition moved into a stricter check (`routed + boats + extras`), and the "unregistered swap" check now asserts that no `roof-bridge` instance exists.
- **Minor 1 (PIECES read as text twice): FIXED.**
  - `readPieces()` (`tools/labs_coverage.mjs:37-40`) also counts every `piece(` call, and `validateInventory` fails when the count and the parsed entries differ.
  - `tools/fable_swap_matrix.mjs` imports the same reader and applies the same check. That import is safe because `labs_coverage.mjs` runs `main()` only when it is the entry script.
  - A new test injects a double-quoted entry and expects the failure.
- **Minor 2 (the missing-type error doesn't say how to fix it): FIXED.** `build.js:131` now names `rooftops/js/pieces/index.js` PIECES.
- **Minor 3 (the `dynamic` branch was untested): FIXED.** A stand-in `roof-takasebune` must:
  - append its record to `dynamic.boats` and fill the empty `boat` slot;
  - sit on the root;
  - move exactly as the classic boats under `world.update()` (visibility, transform, wake, heading).

  The report says a scratch copy whose `placePiece` ignores `dynamic` fails this check. I did not re-run that fault test (low-load rule).
- **Minor 5 (the hub card changed what it opens): FIXED.** The `labs/registry.js:44` blurb now says the card opens the shelf and the run is one more click.

## Minor 4, left as is: `?assets=modular` loads the whole valley kit on the Roof Road page

**This can wait; no action is needed before r2–r5.**
- It happens only under an explicit `?assets=modular`, never on classic.
- It cannot change the built world: there are zero `roof-*` ids, so modular builds the same world as classic (shown in r1).
- The cost is only load time.

The filter belongs with the first Roof Road family, as the lane says. At that point either:
- give the Roof Road page's `AssetRuntime` a `loadFamilies` that loads only the families registering a `roof-*` id (plus the families they import), or
- accept the full load if the r-lanes import valley families anyway.

## Handoff §5 "Porting outside `build.js` edits": can a worker follow it?

**Yes, with one correction (new Minor below).**

**What works:**
- The base to diff against is clear.
- "Keep the facade, apply the hunks by hand" is the right method.
- The table from old code to new module is complete: the 35 `B.<type>` builders, paint, common, machiya, pickups, skyline, `boatHullGeometry`, the downtown wiring in `index.js`, and `buildWorld` → the facade with the extras now inside classic callbacks.
- Because the bodies moved verbatim, `git apply --recount` against the rewritten path matches on context. Hunks whose context includes the head line are called out.
- The "new things" step covers the operator's work I saw in the main checkout:
  - the `cutaway.js` deletion: drop its `sourceFiles` and `ignoredBuilders` entries and the facade import;
  - the new `people.js`/`makeResident`, `alley-passages.js` and `camera-obstacles.js`: classify each module and give each `make…` an owner;
  - any new piece type: entry, row, shelf line, target and matrix row.
- The re-check step makes `--write` of the golden depend on all rooftop tests passing first, and on confirming that only the ported pieces changed.

**New Minor 6: the hunk header is not a reliable way to find a hunk's function.**
- **Where:** `docs/fable/handoff/r1-roof-split.md:237` ("The hunk header names the old function").
- **The problem:** git's hunk header shows the last function-like line *above* where the hunk starts, not the function the hunk edits. The operator's actual first `build.js` hunk is headed `@@ -889,7 +891,9 @@ B.corner = (pc, ctx) => {`, but it edits `B.bridge`: the head `B.bridge = …` is a context line inside the hunk. Followed literally, step 2 sends that hunk to `pieces/corner.js`.
- **Fix:** tell the worker to find the hunk's function from its old line range. Either take the first `B.<type> =` or `function` line inside the hunk's context, or scan upward from the hunk's old start line in the base `build.js`. Use the `@@` header only when neither applies.
- **Why it is only Minor:** a misplaced hunk would fail `git apply` (the context does not match `corner.js`), so the mistake is caught. It costs time, not correctness.

## Did the fix break anything?

Nothing that blocks. The classic build is byte-identical, the rooftop tests pass, and the R57 files are untouched.

One note that does not block: a kit Shōki is greeted by having the material of its **direct children** replaced (`game.js` `checkPickups`). If those children are Groups, nothing lights up. Handoff §2 documents this, so r5 must keep its meshes as direct children.

## Verdict

**APPROVED.**
- The Important finding and Minors 1, 2, 3 and 5 are fixed.
- Minor 4 can wait until the first Roof Road family.
- New Minor 6 is a wording fix in the handoff and does not block the merge.
- There are no new Critical or Important issues.
