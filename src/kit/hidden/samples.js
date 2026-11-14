// Contract samples: the REAL layouts. HiddenPlaces draws the Moon Pool and then
// the Lantern Glade from one stream (mulberry 0x4d43) in a fixed order; these
// functions repeat that arithmetic (src/hidden_places.js layoutMoonPool() and
// layoutLanternGlade()), so a sample is the largest layout the game builds.
// Pure: no three.js, importable under Node.
const TAU = Math.PI * 2;

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POOL = { x: -20, z: -27, r: 3.0 };
const GLADE = { x: -31, z: -10, r: 6.0 };

function pool(rand) {
  const { x, z, r } = POOL;
  const marks = [];
  for (let i = 0; i < 260; i++) marks.push([60 + rand() * 40, 90 + rand() * 50, 50 + rand() * 30, 0.12 + rand() * 0.2, rand(), rand(), 2 + rand() * 4, 1 + rand() * 2]);
  const rings = [];
  for (let i = 0; i < 26; i++) {
    const cx = rand(), cy = rand(), rr = 5 + rand() * 13, copies = [];
    for (let k = 0; k < 9; k++) copies.push([0.55 + rand() * 0.3, rand() * 3]);
    rings.push({ cx, cy, rr, copies });
  }
  const stones = [];
  for (let i = 0; i < 46 && stones.length < 34; i++) {
    const a = (i / 46) * TAU + rand() * 0.06;
    const south = Math.abs(((a - Math.PI / 2 + Math.PI) % TAU) - Math.PI);
    if (south < 0.42) continue;
    const rr = r + 0.12 + rand() * 0.38, s = 0.65 + rand() * 0.9;
    const euler = [rand() * 0.6, rand() * TAU, rand() * 0.6];
    const hsl = [0.28 + rand() * 0.1, 0.1 + rand() * 0.12, 0.34 + rand() * 0.16];
    stones.push({ a, rr, s, euler, hsl });
  }
  const pads = [];
  for (let i = 0; i < 9; i++) {
    const a = rand() * TAU, rr = 0.5 + rand() * (r - 1.1), turn = rand() * TAU, scale = 0.7 + rand() * 0.8;
    pads.push({ index: i, x: Math.cos(a) * rr, y: 0.062, z: Math.sin(a) * rr, ry: turn, scale });
  }
  const lotus = [];
  for (let i = 0; i < 3; i++) {
    const a = 1.0 + i * 2.1 + rand() * 0.4, rr = 0.9 + rand() * 1.0;
    lotus.push({ index: i, x: Math.cos(a) * rr, y: 0.06, z: Math.sin(a) * rr, petals: 7 });
  }
  const motes = [];
  for (let i = 0; i < 42; i++) motes.push({ a: rand() * TAU, rr: rand() * (r - 0.2), y: rand() * 2.4, sp: 0.12 + rand() * 0.2, ph: rand() * TAU });
  const toroAngle = 0.55;
  return {
    index: 0, name: 'Moon Pool', x, y: 0, z, r,
    apron: { index: 0, x: 0, y: 0, z: 0, radius: r + 2.4, lift: 0.022, marks },
    water: { index: 0, x: 0, y: 0, z: 0, radius: r, surface: 0.05, rings },
    moon: { index: 0, x: r * 0.12, y: 0.09, z: -r * 0.1, size: r * 1.5 },
    rim: { index: 0, x: 0, y: 0, z: 0, capacity: 34, stones },
    pads, lotus,
    seat: { index: 0, x: 0, y: 0, z: r + 0.95, height: 0.09 },
    toro: { index: 0, x: Math.cos(toroAngle) * (r + 1.5), y: 0, z: Math.sin(toroAngle) * (r + 1.5), angle: toroAngle, glowY: 0.84 },
    motes: { index: 0, x: 0, y: 0, z: 0, list: motes }
  };
}

function glade(rand) {
  const { x, z, r } = GLADE;
  const litter = [];
  for (let i = 0; i < 320; i++) {
    const h = 60 + rand() * 30;
    litter.push([h, 30 + rand() * 25, 32 + rand() * 24, 0.25 + rand() * 0.3, rand(), rand(), rand() * 3, 2 + rand() * 6]);
  }
  const stalks = [], tops = [];
  for (let i = 0; i < 44; i++) {
    let a, rr;
    if (i < 36) {
      a = (i / 36) * TAU + (rand() - 0.5) * 0.12;
      const d = Math.abs(((a + Math.PI) % TAU) - Math.PI);
      if (d < 0.5) continue;
      rr = r - 0.4 + rand() * 1.5;
    } else { a = rand() * TAU; rr = r + 0.8 + rand() * 1.8; }
    const sx = Math.cos(a) * rr, sz = Math.sin(a) * rr, h = 6.0 + rand() * 3.2, lean = 0.04 + rand() * 0.05;
    const hsl = [0.24 + rand() * 0.06, 0.38 + rand() * 0.14, 0.42 + rand() * 0.12];
    tops.push({ x: sx + Math.cos(a) * lean * h, y: h, z: sz + Math.sin(a) * lean * h, a });
    const leaves = [];
    for (let k = 0; k < 6; k++) {
      const ly = h * (0.72 + (k % 3) * 0.12) + rand() * 0.2;
      const euler = [1.5 + rand() * 0.7, (k / 6) * TAU + rand() * 0.8];
      const length = 0.9 + rand() * 0.7;
      leaves.push({ ly, euler, length, hsl: [0.24 + rand() * 0.07, 0.42 + rand() * 0.18, 0.32 + rand() * 0.16] });
    }
    stalks.push({ a, sx, sz, h, lean, hsl, leaves });
  }
  const picks = tops.filter((_, i) => i % 3 === 0).slice(0, 11);
  const lanterns = picks.map((top, i) => {
    const hang = 2.1 + rand() * 1.4, ix = top.x * 0.8, iz = top.z * 0.8, phase = rand() * TAU;
    return { index: i, x: ix, y: hang, z: iz, hang, ix, iz, phase, onset: ((i * 0.618) % 1) * 0.42, string: [top.x, top.y * 0.62, top.z] };
  });
  const flies = [];
  for (let i = 0; i < 34; i++) flies.push({ a: rand() * TAU, rr: 0.4 + rand() * (r - 1.2), y: 0.4 + rand() * 2.6, sp: 0.2 + rand() * 0.4, ph: rand() * TAU });
  return {
    index: 0, name: 'Lantern Glade', x, y: 0, z, r,
    floor: { index: 0, x: 0, y: 0, z: 0, radius: r - 0.4, lift: 0.025, litter },
    bamboo: { index: 0, x: 0, y: 0, z: 0, stalks, tops, capacity: 44, leavesPerStalk: 6 },
    lanterns,
    seat: { index: 0, x: 0, y: 0, z: 0, boulder: { x: -1.7, y: 0.3, z: -0.9, scale: [1.2, 0.75, 1] } },
    flies: { index: 0, x: 0, y: 0, z: 0, list: flies }
  };
}

/** The pool and the glade layouts, drawn in the game's order from its seed. */
export function hiddenLayouts() {
  const rand = mulberry(0x4d43);
  const p = pool(rand);
  return { pool: p, glade: glade(rand) };
}
export const samplePool = () => hiddenLayouts().pool;
export const sampleGlade = () => hiddenLayouts().glade;
