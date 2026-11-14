// Drift check: labs/trees/js/kit.js and src/kit/trees/build.js carry the same species table and trunk maths
// (labs may not be imported by the kit). Run: node labs/trees/drift_check.mjs
import { readFileSync } from 'node:fs';
const norm = (f, re) => [...readFileSync(f, 'utf8').matchAll(re)].map((m) => m[0].replace(/\s+/g, ''));
const A = 'labs/trees/js/kit.js', B = 'src/kit/trees/build.js';
let bad = 0;
const cmp = (label, re) => { const a = norm(A, re), b = norm(B, re); const ok = a.length && JSON.stringify(a) === JSON.stringify(b); console.log((ok ? 'OK   ' : 'FAIL ') + label); if (!ok) bad++; };
cmp('species trunk', /trunk: \{ rTop[^}]*\}/g);
cmp('species canopy', /canopy: \{ primaries[^}]*\}/g);
cmp('species leaves', /leaves: \{ habit[^}]*\}/g);
cmp('species masses', /masses: \{ twigs[^}]*\}/g);
cmp('species colors', /colors: \[0x[0-9a-f, x]*\]/g);
cmp('spine', /spineX = [^\n]*/g);
cmp('trunk tier detail', /radial: \d+, rings: \d+, roots: \d/g);
cmp('top taper and cap', /\(j === rings \? [\d.]+ : 1\)/g);
process.exit(bad ? 1 : 0);
