// Live-wear regression for the kit valley ground (lane v-ground): the grass
// BiomeMask contract of src/kit/ground/ (valley.js bindWorld + wearUpdate,
// field.js wearGrassMask), on the real game booted headlessly twice.
//
//   node tools/ground_wear_test.mjs [--gpu metal|swiftshader] [--timeout <s>]
//
// Needs PLAYWRIGHT_MODULE (see tools/headless.mjs). About 20 s on Metal.
//
// What it proves:
//   classic (?assets=classic): no kit valley ground exists, and the cat
//     walking a meadow line for 90 real frames leaves the grass mask
//     byte-identical (the classic set has no wear path at all);
//   modular (?assets=modular): main.js bound the ground to the world (the
//     test never calls bindWorld); healed to rest, the mask equals the
//     classic boot's mask byte for byte; 60 laps of paws thin the meadow
//     where they pass (meadow red falls by half or more) and nowhere far from
//     the walked lines; the shrine's west lawn, walked as hard, keeps every
//     lawn texel (no texel with baked meadow 0 ever changes); after a long
//     regrowth the field has no live wear left and the mask is the baked
//     mask again, byte for byte.
// Both boots use ?shot=1 (seeded Math.random), so they bake the same mask.
import { openPage, waitForExpression } from './headless.mjs';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('usage: node tools/ground_wear_test.mjs [--gpu metal|swiftshader] [--timeout <s>]');
  process.exit(0);
}
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : dflt; };
const gpu = opt('--gpu', undefined), timeout = Number(opt('--timeout', 240));

const READY = 'window.game?.menu?.isPlaying && window.game?._bootDissolved';
const OPTIONAL_404 = /cad-overrides\.json/;          // optional CAD overrides file, absent by default

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

/** Boot the game with `query`, wait until playing, run `steps(page)`, close. */
async function boot(query, steps) {
  const s = await openPage('/index.html' + query, { gpu, timeout, session: { catwalk_autostart: 'new' } });
  try {
    await waitForExpression(s.page, READY, Date.now() + timeout * 1000);
    const out = await steps(s.page);
    const errors = s.errors.filter((e) => !OPTIONAL_404.test(e));
    return { ...out, errors };
  } finally { await s.close(); }
}

// Page-side helpers (serialised into each evaluate).
const HELPERS = `
  const grass = window.game.vegetation.grass;
  const tex = grass.U.uMask.value, rect = grass.U.uMaskRect.value;
  const res = tex.image.width, k = res / (1 / rect.z), data = tex.image.data;
  const texel = (x, z) => (Math.floor((z - rect.y) * k) * res + Math.floor((x - rect.x) * k)) * 4;
  const hash = (a) => { let h = 0x811c9dc5; for (let i = 0; i < a.length; i++) { h ^= a[i]; h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16) + ':' + a.length; };
`;

/* ------------------------------------------------------------- classic --- */

const classic = await boot('?assets=classic&shot=1', async (page) => {
  const before = await page.evaluate(`(() => { ${HELPERS}
    const ids = (game.city.assetInstances || []).map((i) => i.id);
    return { ground: ids.includes('valley-ground'), hash: hash(data), meadowR: data[texel(-12, 12)],
             lawnR: data[texel(-4.7, -27.2)], lawnG: data[texel(-4.7, -27.2) + 1] };
  })()`);
  // the cat walks the meadow line for 90 real frames (the game loop runs in between)
  await page.evaluate(`new Promise((done) => {
    const p = game.player.mesh.position; let f = 0;
    const tick = () => { p.set(-16 + (f % 40) * 0.2, p.y, 12); game.player.isGrounded = true;
      if (++f < 90) requestAnimationFrame(tick); else done(true); };
    requestAnimationFrame(tick);
  })`);
  const after = await page.evaluate(`(() => { ${HELPERS} return { hash: hash(data) }; })()`);
  return { before, after };
});

check('classic: no kit valley ground instance', classic.before.ground === false);
check('classic: the probe texels are meadow (-12, 12) and lawn (-4.7, -27.2)',
  classic.before.meadowR > 0 && classic.before.lawnR === 0 && classic.before.lawnG > 0,
  `meadow r ${classic.before.meadowR}, lawn r ${classic.before.lawnR} g ${classic.before.lawnG}`);
check('classic: walking the meadow leaves the grass mask untouched', classic.after.hash === classic.before.hash,
  `${classic.before.hash} → ${classic.after.hash}`);
check('classic: no page errors', classic.errors.length === 0, classic.errors.join(' | '));

/* ------------------------------------------------------------- modular --- */

const modular = await boot('?assets=modular&shot=1', (page) => page.evaluate(`(() => { ${HELPERS}
  const inst = (game.city.assetInstances || []).find((i) => i.id === 'valley-ground');
  if (!inst) return { error: 'no valley-ground instance' };
  const f = inst.field, T0 = f.T, p = game.player.mesh.position;
  const env = { hour: 12, wet: 0, snow: 0 };
  // heal to rest: whatever the villagers wore since the boot regrows and the baked meadow is put back
  const heal = () => { f.T = 60; p.set(30, 5, 30); for (let i = 0; i < 400; i++) inst.update(1, 0, env); };
  heal();
  const rest = data.slice(), restHash = hash(rest), restLive = f.live;
  const walk = (laps) => {
    for (let l = 0; l < laps; l++) for (let s = 0; s <= 40; s++) {           // a meadow line
      p.set(-16 + s * 0.2, 0, 12); game.player.isGrounded = true; inst.update(0.05, 0, env);
    }
    for (let l = 0; l < laps; l++) for (let s = 0; s <= 20; s++) {           // across the shrine's west lawn
      p.set(-6.2 + s * 0.15, 0, -27.2); game.player.isGrounded = true; inst.update(0.05, 0, env);
    }
  };
  f.T = T0;
  walk(60);
  inst.update(0.6, 0, env);                                                  // the mask clock (0.5 s)
  const at = texel(-12, 12), lawn = texel(-4.7, -27.2);
  // every changed texel, and whether it lies near a walked line (2 m) or on a lawn (baked meadow 0)
  let changed = 0, far = 0, lawnChanged = 0;
  for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
    const q = (j * res + i) * 4;
    if (data[q] === rest[q] && data[q + 1] === rest[q + 1] && data[q + 2] === rest[q + 2] && data[q + 3] === rest[q + 3]) continue;
    changed++;
    if (rest[q] === 0) lawnChanged++;
    const x = rect.x + (i + 0.5) / k, z = rect.y + (j + 0.5) / k;
    const near = (x > -18 && x < -6 && Math.abs(z - 12) < 2) || (x > -8.2 && x < -1.2 && Math.abs(z + 27.2) < 2);
    if (!near) far++;
  }
  const mid = { wear: f.sample(f.wear, -12, 12), lawnWear: f.sample(f.wear, -4.7, -27.2),
    maskR: data[at], restR: rest[at], lawnR: data[lawn], lawnG: data[lawn + 1], restLawnR: rest[lawn], restLawnG: rest[lawn + 1],
    changed, far, lawnChanged };
  heal();
  let diff = 0;
  for (let i = 0; i < data.length; i++) if (data[i] !== rest[i]) diff++;
  const after = { wear: f.sample(f.wear, -12, 12), live: f.live, hash: hash(data), diff };
  f.T = T0;
  return { restHash, restLive, mid, after };
})()`));

if (modular.error) check('modular: kit valley ground instance', false, modular.error);
else {
  const { mid, after } = modular;
  check('modular: healed to rest, the mask equals the classic boot\'s mask', modular.restHash === classic.before.hash,
    `${modular.restHash} vs classic ${classic.before.hash}`);
  check('modular: at rest the field has no live wear', modular.restLive === null, JSON.stringify(modular.restLive));
  check('modular: paws wear the meadow (bound by main.js)', mid.wear > 0.5, `wear ${mid.wear.toFixed(3)} at (-12, 12)`);
  check('modular: the meadow thins where paws passed', mid.restR > 0 && mid.maskR <= mid.restR * 0.5, `meadow r ${mid.restR} → ${mid.maskR}`);
  check('modular: only texels near the walked lines change', mid.changed > 0 && mid.far === 0, `${mid.changed} changed, ${mid.far} away from the lines`);
  check('modular: the lawn is worn as hard but stays', mid.lawnWear > 0.5 && mid.restLawnR === 0 && mid.lawnR === 0 && mid.lawnG === mid.restLawnG && mid.lawnG > 0,
    `lawn wear ${mid.lawnWear.toFixed(3)}, g ${mid.restLawnG} → ${mid.lawnG}`);
  check('modular: no lawn texel (baked meadow 0) changes anywhere', mid.lawnChanged === 0, `${mid.lawnChanged} lawn texels changed`);
  check('modular: after regrowth no live wear is left', after.live === null && after.wear < 0.01, `wear ${after.wear.toFixed(4)}, live ${JSON.stringify(after.live)}`);
  check('modular: the mask heals back to the baked mask exactly', after.diff === 0 && after.hash === modular.restHash, `${after.diff} bytes differ`);
}
check('modular: no page errors', modular.errors.length === 0, modular.errors.join(' | '));

console.log(`\nground wear: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
