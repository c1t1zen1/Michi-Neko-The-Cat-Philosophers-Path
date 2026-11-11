# Asset Library verification — 2026-11-11

The catalog, original/study factories and cadJS handoff were checked in
headless Chromium on macOS with Metal. Browser profiles and API fixture
directories were disposable. The repository metadata remains the empty
revision-zero starting workspace; QA notes and test keys were not persisted
into the checked-in data.

| Suite | Result | What was exercised |
|---|---:|---|
| Catalog unit/API tests | 37/37 | Search syntax, lifecycle/coverage distinctions, metadata validation, merges, collections, CSV escaping, constrained AI plans, provider request format, transient credentials, API persistence and revision conflicts |
| Coverage regression tests | 11/11 | Evidence anchors/selectors, ID integrity, module/method accounting, honest hidden-object and inactive-code classifications |
| Existing cadJS tests and module check | 15/15 | Existing catalog, provider, asset-package, baseline and procedural-agent contracts; server imports without starting a listener |
| Catalog browser workflows | 17/17 | Initial inventory, search/provenance, draft reload, notes/tags, favorites, collection management, list/board drag, AI review/apply, companion-settings import, CSV, workspace import/undo, repository-save protocol, conflict merge, saved views, exact lab link, embedded live preview, CAD return and mobile navigation |
| Runtime asset rendering | 195/195 | All 124 original adapters and 71 unique lab recipes, actual WebGL compilation/rendering, finite geometry/instance buffers and bounds, nonempty renderables, explicit hidden Jade Paw visibility |
| cadJS browser handoff | 12/12 | Larry startup, no starter-cat race, stable IDs/baselines, factory provenance, return link, updated fence import, live-object undo/redo, restored catalog lineage and invalid-ID workspace preservation |
| Catalog static checks | Passed | 17 ES modules, 190 entries, 120 audited evidence targets, thumbnail paths/provenance, 386 WebP files at 2.45 MB, 126 active entries with editing adapters |
| Full labs check | Passed | Lab syntax, registry, game-import boundary/cache tags and generated coverage report freshness |

The final runtime render and handoff runs reported zero browser/shader errors.
The catalog was visually inspected at 1440 × 1000 and 390 × 844; both layouts
fit without horizontal document overflow. Original, study and context image
labels remain visible. The live inspector screenshot was also reviewed.

The checks found and corrected two runtime defects: cloned built-in Three
materials lost game shader defines such as `CAT_PART`, and mobile navigation
did not close after rerendering its clicked item. Regression coverage now
exercises those paths. CAD handoff undo also restores the catalog lineage
alongside the original live object and baseline.

The optional summit GLB was present in this checkout and rendered successfully.
Its adapter reports a missing-file limit when that optional asset is absent.
Whole-scene effects without an isolated adapter retain source/review links.
No game source or protected summit implementation was changed.

Cloud API integration was tested against a mock provider using the real shared
dawCAT request builder; no paid provider credentials or requests were used.
The built-in local catalog guide was exercised through the browser. The
in-app user-facing browser host was unavailable; local Chromium supplied the
rendering and workflow evidence.

Reproduction commands and configurable Playwright paths are in
[README.md](README.md#verification). Detailed JSON results and screenshots are
written by those suites to `CATALOG_QA_DIR` (the system temporary directory by
default), rather than into the repository.
