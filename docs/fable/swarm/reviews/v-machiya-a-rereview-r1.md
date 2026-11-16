# v-machiya-a re-review r1 (a6186f4..07bd7f8)
Verdict: finding 1 CLOSED, minors CLOSED. No blocking issues. Two nits.

## (a) Shader survives _mergeStatics: yes (verified from code)
- Material comes from km.cloth({kit:'noren-sway'}) -> KitMaterials._once, which registers it as MAT['kit:<name>'], so Countryside matSet includes it. Memoised: one instance for the whole valley.
- Merge eligibility (index, position, normal, uv): mergePlanes sets all four; aSway and color are extra attributes. _mergeInto groups by material uuid + shadow flags + sorted attribute-name list, so only norens (all with aSway+color) merge together; mergeGeometries gets uniform attribute sets and keeps aSway/color. No live roots remain, so nothing excludes them.
- Phase uses modelMatrix * transformed. Merged mesh sits at scene level (identity) with world-baked positions, so phase equals world position, as intended. Normal attribute is baked to world too, so displacement along it is off the wall as claimed.
- Program cache key: paintify sets 'paint'+defines; wrapper appends 'sway', stable. onBeforeCompile chains prev (paint) then adds uniforms/shader; guarded by userData.sway so wrapped once. SWAY is a module-level shared uniform object, assigned by reference. vertexColors is a native program parameter, fine.

## (b) Frame-ms rise: likely not shader/update cost
- update() allocates nothing: two scalar writes per instance, ~10 instances/frame; the runtime's try/catch loop is negligible. Vertex shader adds ~2 sin and a matrix mul on a few hundred cloth vertices (rows 8/4/1 by tier). Neither explains +2.3 ms.
- Plausible real causes, not the noren: (1) merging makes big baked kit meshes (whole-street per material) that defeat frustum culling and re-draw fully in the shadow pass, which the report says dominates; fewer draws but more vertices per draw and no culling; (2) tris +0.8%, roofs now plain meshes. (3) Single-session laptop variance. Report's own split (GPU wait 6.3 -> 8.5) points to GPU/shadow, consistent with (1). Cannot prove from code; the Integrator's perf gate should do an A/B with noren hidden or a repeat run. Not a blocker attributable to this fix.

## (c) Rod fixed: yes
aSway = clamp((top-0.04-y)/hang), 0 at the cloth top row; displacement is aSway^2 * ..., so zero at the pole line. Rod, finials and hem band are in the trim bag on bagMat (not swayed).

## Nits
1. Hem band is static trim at z 0.004 (0.012 thick) while the cloth hem moves 1.5 to 4 cm along its normal, so the band can detach from or poke through the hem at rest wind peaks. Cosmetic; consider moving the band into the swayed mesh or skipping it.
2. Shadow depth material has no sway (shadow is static); invisible at cm scale.

## Minors from round 1
- Roof triangle reconciliation: derived (classic ~2.4k vs kit 7,960 x 11 roofs), marked estimate, consistent with +62k net. Accepted.
- Roof Road callers must pass layout.band: in handoff. Accepted.
