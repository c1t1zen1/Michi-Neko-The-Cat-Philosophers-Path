# t2-cadjs re-review, fix round 1

Verdict: finding 1 RESOLVED (two minor residuals), finding 2 RESOLVED. No new Critical/Important. Tests: `cd cadJS && npm test` run in worktree, kit tests 16/16 pass.

## Finding 1
- Recording: export adds `source.kit {variant, params}` when the kit group is the root; normalized in create and validate, inside the checksum, preserved by migration (`...input`). Test covers round trip, absent kit, bad variant/key.
- Rebuild on import: `alignKitForPackage` runs before the compatibility check; tries recorded state (params validated against the schema), then modular defaults; stops when the baseline fingerprint matches. Initial kit state is `kitState(id,'modular',values)`, so schema-1 and schema-2 packages without `source.kit` that were exported at defaults still match and import (named risk: holds by code read; the default candidate is always tried, and an already-matching baseline returns early).
- Warning: `commitKit` confirms when free-form edits (packageChanges + structure) exist or a package is loaded. Decline path: the preview is disposed and `before` reinstalled with register:false, inspector refreshed, returns false; `kitGesture` was already cleared and `before` was already the registered build, so it reverts cleanly (code read, not run in a browser). The align path passes warn:false, so no prompts on import.
- Residuals (minor, not blocking): (a) an old package exported from the classic variant, or from non-default params before this fix, cannot be matched (no recorded kit; only modular defaults tried) and fails with the compatibility error; the rebuild attempts also leave the kit rebuilt and on the undo stack after such a failed import. (b) A pending preview build is not ticket-invalidated on decline, so a late-landing preview could install after a decline (extremely narrow).

## Finding 2
History capped at 50. `dropRedo` disposes the discarded redo entry's build when it is not current; `dropOld` disposes the shifted-off entry's `before` when not current. Traced chain A(b0->e1), B(e1->e2): redo truncation frees e2 only, e1 stays referenced; cap frees b0 only. No double-dispose or live-build disposal found. The cap is global to History (all edits), acceptable.
