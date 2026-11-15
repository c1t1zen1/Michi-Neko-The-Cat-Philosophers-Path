# r2b-roofs-streets

- Worker / model:     Claude Sonnet 5.5
- Claimed:            2026-11-15
- Branch:             fable/r2b-roofs-streets
- Base commit:        7b417f6 (fable/integration)
- State:              in progress

Part b of r2 (family `roofstreets`). Part a (7 props) merged as PR #47.

## Scope this PR (7 ids)
roof-machiya (includes the kawara roof, hira/tsuma, façade and eave details, deck, lanterns, dressing), roof-kura, roof-kido,
roof-river-steps, roof-komayose, roof-inuyarai, roof-tsuboniwa. Code: `src/kit/roofstreets/roofs.js` + `shared.js`.

## Deferred to part c
roof-bridge (115 lines, giboshi/ramp/piers, one instance), roof-corner-house, roof-roji, roof-balconies, roof-zushi, roof-alley-pockets,
roof-alley-routes, roof-street and roof-ground (ribbon/painted texture surfaces), roof-kawara-roofs and roof-facades as standalone ids
(built inside the machiya, they have no piece of their own).
