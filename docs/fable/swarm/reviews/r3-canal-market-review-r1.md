# r3-canal-market review r1
Spec: OK (8 of 19 ids promoted, 11 deferred with reasons). Quality: Approved. Critical 0 / Important 0 / Minor 3.
Ran: kit_contract_test --family roofcanal (560/0, merge OK 285->240, self-test OK); rooftop_golden classic EQUAL; golden assets=modular: only 42 pieces + 1 root + batches + 5 update samples change, no platforms/walls/lights; the self-test "routing FAILED" is its own other-pieces rule tripped by the lane's own piece types. Opened stones-c, cistern-d (plus classic stones-c): parity, legible, moss pad/hoops/ladder read.
Overhang: stripes/seams/finial/caps sit <=2.5 cm above platform tops except turtle head (roofcanal/index.js:~95, 8 cm at x=0.42w on turtle stones, 0.1 r sphere; check against classic).
Minor: 1) src/kit/roofcanal/index.js:1-8 header still says km.bag vertex colour; code uses ctx.MAT. 2) stepping-stone digest bounds differ ~0.1 m (no collider). 3) ?auto=1 stall s=1232.2124 on both per report; not re-run by reviewer.
