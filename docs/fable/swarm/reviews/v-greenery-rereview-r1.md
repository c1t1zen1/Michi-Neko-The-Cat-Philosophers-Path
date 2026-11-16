# v-greenery re-review, fix round 1
Verdict: PASS (0 Critical, 0 Important, 2 Minor)

1. Triangle counts: re-derived from code (sampleGrove(7)=78 culms, 72 leaves each). Blade tris=(rows-1)*4+2 (rows3=10, rows2=6); lathe tris=nodes*ring*radial*2 (min 1 step).
   hero: 2 culms*216*78=33.7k + 720*78=56.2k = 89.9k (claimed 89.8k). mid: 2*8*78=1.2k + 24*6*78=11.2k = 12.5k. far: 1 culm*6*78=0.5k + 9*6*78=4.2k = 4.7k. Classic (vegetation.js: two 6-sided capped cylinders = 48, 72 leaves x 14 tris) = 82.3k. All match.
2. BUDGET_EXCEPTIONS request: key 'bamboo-groves' matches the inventory id; budgetFor spreads exception[tier] over base, so {triangles:92000/13000/5000} is valid and covers 89.9k/12.5k/4.7k (r5 groves smaller). `why` is ignored by budgetFor but is the documented convention. Machine-applicable (paste inside the empty object in src/kit/budgets.js). Not applied in the lane, correct (Integrator-owned). Minor: the snippet lacks the leading comma/placement note; hero is 9% over classic by design.
3. Draws: explanation consistent (grove 16 calls both, 600 hidden both, baseline varies 759-770). Medium rule: 773 shadow-refresh vs classic 770 (rule line says 774), mean 591; tris 6.96M < 8.11M. Holds, margin thin on peak calls. Minor.
4. R38: lower culms call km.bamboo({color:0xa9c06a, vcol:true, rough:0.5}); equals FINISHES.fresh args in fences, so _once returns the shared material (zero new). Tint via instance colour. km.moss the single new. lower.dispose() added. Good.
5. Images: mid-12 modular vs classic opened; same composition, modular sparser leaves, culms read fine.
Caveat: contract test cannot count instanceCount, so the grove cap is not machine-enforced; numbers rest on hand count (verified above).
