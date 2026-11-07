// The stage: a 16 × 12 m corner of Michi's Kyoto. One layout object that the
// field painter, the props, the stones, the walkers and the cat all read.
//
//      north (−z)   machiya frontage · amaochi · inuyarai · gutter
//                   ishidatami street              | shrine sandō (tamajari, nobedan)
//                   ~~~~~~~~ the rutted lane, grass down its middle, a ditch ~~~~~~~~
//      south (+z)   roji: moss, tobi-ishi, tsukubai | karesansui: raked Shirakawa sand
import { CH, PAVE } from './field.js';
import { fbm, vnoise, sstep, clamp, polyDist, smoothLine, hash2i } from './util.js';

export const W = 16, D = 12;
export const laneZ = (x) => 0.35 + 0.42 * Math.sin(x * 0.3 + 0.4);

export const LAYOUT = {
  wallZ: -5.25, dripZ: -4.35, houseX1: 1.0, eaveY: 2.55,
  gutter: { z: -4.0, half: 0.12, depth: 0.11, x0: -8, x1: 1.35 },
  street: { z0: -3.82, z1: -1.72, x0: -8, x1: 1.5 },
  door: { x: -2.5, z: -4.65 },
  sando: { x0: 2.35, x1: 8, z0: -6, z1: -1.15, path: { z0: -3.55, z1: -2.85, x0: 3.1 } },
  lane: { half: 1.05, rut: 0.56, rutW: 0.17, shoulder: 1.7, ditch: 2.05, ditchW: 0.32, ditchD: 0.16 },
  roji: { x0: -8, x1: -0.7, z0: 2.55, z1: 6 },
  engawa: { x0: -8, x1: -3.7, z0: 5.38, z1: 6, y: 0.42 },
  kutsunugi: { x: -5.7, z: 5.0 },
  tsukubai: { x: -1.55, z: 4.55, r: 0.3 },
  maple: { x: -4.9, z: 3.35 },
  pine: { x: 6.3, z: -4.55 },
  sand: { x0: 1.7, x1: 7.6, z0: 2.75, z1: 5.65, rocks: [[4.75, 4.15, 0.55], [2.85, 3.45, 0.3], [6.55, 3.3, 0.22]] },
  barrier: { x: -6.65, z: 3.05 }
};

/** the tobi-ishi run of the roji: kutsunugi-ishi → junction → lane, branches to the tsukubai and to a closed corner */
export function rojiPaths() {
  const L = LAYOUT;
  const main = smoothLine([[L.kutsunugi.x + 0.35, L.kutsunugi.z - 0.42], [-4.6, 4.1], [-3.55, 3.75], [-2.9, 3.05], [-2.55, 2.3]], 3);
  const basin = smoothLine([[-3.55, 3.75], [-2.7, 4.15], [-1.95, 4.2]], 3);
  const closed = smoothLine([[-4.6, 4.1], [-5.6, 3.6], [-6.4, 3.15]], 3);
  return { main, basin, closed };
}

/** stepping stones along a polyline: chidori-gake (zig-zag), set 6 / 5 / 3 cm proud after Rikyū, Oribe, Enshū */
export function layStones(line, { spacing = 0.56, zig = 0.11, r = [0.17, 0.23], seed = 3, skipFirst = false } = {}) {
  const out = [];
  let acc = 0, side = 1, n = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    let t = acc === 0 && i === 0 ? (skipFirst ? spacing : 0) : spacing - acc;
    while (t <= len) {
      const x = ax + (bx - ax) * t / len, z = az + (bz - az) * t / len;
      const nx = -(bz - az) / len, nz = (bx - ax) / len, h = hash2i(seed + n * 7, n);
      out.push({ x: x + nx * zig * side, z: z + nz * zig * side, r: r[0] + (r[1] - r[0]) * h[0], rot: h[1] * Math.PI, seed: seed * 31 + n });
      side = -side; n++; t += spacing;
    }
    acc = len - (t - spacing);
  }
  return out;
}

const rect = (x, z, r) => sstep(0, 0.12, Math.min(x - r.x0, r.x1 - x, z - r.z0, r.z1 - z));

/** Paint the Kyoto corner into a 16 × 12 m field. */
export function paintStage(field) {
  const L = LAYOUT;
  field.clear();
  const { main, basin, closed } = rojiPaths();
  for (let j = 0; j < field.nz; j++) for (let i = 0; i < field.nx; i++) {
    const x = field.xOf(i), z = field.zOf(j), idx = j * field.nx + i, o = idx * 8;
    const S = field.S;
    const n1 = fbm(x * 0.6 + 11, z * 0.6, 3), n2 = vnoise(x * 2.3, z * 2.3 + 5);
    let base = (fbm(x * 0.21, z * 0.21 + 40, 3) - 0.5) * 0.05;
    let G0 = 0;
    const set = (m) => { for (let c = 0; c < 8; c++) S[o + c] = 0; for (const k in m) if (k in CH) S[o + CH[k]] = m[k]; };

    // the meadow is the default; a few bare scuffs and wild edges
    set({ grass: clamp(1 - sstep(0.62, 0.75, n1) * 0.7, 0, 1), wild: sstep(5.2, 7.6, Math.abs(x)) * 0.5 });

    // ---- the lane: two ruts, grass down the middle, worn shoulders, a ditch
    const lz = laneZ(x), dz = z - lz, ad = Math.abs(dz), C = L.lane;
    const edgeN = (vnoise(x * 1.3, 3) - 0.5) * 0.22 + (vnoise(x * 4.7, 9) - 0.5) * 0.12 + (vnoise(x * 11, 2) - 0.5) * 0.05;
    if (ad < C.shoulder + 0.4) {
      const rut = Math.max(0, 1 - Math.abs(ad - C.rut) / (C.rutW + 0.05));
      const lane = 1 - sstep(C.half - 0.15 + edgeN, C.half + 0.12 + edgeN, ad);
      const median = 1 - sstep(0.22, 0.36, ad);
      const shoulder = 1 - sstep(C.half, C.shoulder + edgeN, ad);
      const g = clamp(1 - lane * 0.92 + median * 0.85 * (1 - rut), 0, 1);
      set({ grass: g, gravel: lane * (1 - median) * 0.18 * sstep(0.4, 0.7, n2) });
      G0 = Math.max(rut * 0.96, lane * (0.62 - median * 0.5), shoulder * 0.22 * (1 - lane));
      base += -0.012 * lane;
    }
    // the ditch on the south side: wild grass on the banks, a damp floor
    const dd = z - (lz + C.ditch);
    if (Math.abs(dd) < C.ditchW + 0.5) {
      const bed = 1 - sstep(C.ditchW * 0.5, C.ditchW, Math.abs(dd));
      base -= C.ditchD * Math.pow(1 - Math.min(1, Math.abs(dd) / C.ditchW), 1.5);
      set({ grass: (1 - bed) * 0.6, wild: (1 - bed) * 0.9 * (1 - sstep(C.ditchW, C.ditchW + 0.5, Math.abs(dd))), moss: bed * 0.35 });
      field.wet[idx] = bed * 0.5;
    }

    // ---- machiya frontage: amaochi strip, gutter, the street of setts
    if (x < L.houseX1 + 0.6) {
      const fx = 1 - sstep(L.houseX1 + 0.2, L.houseX1 + 0.6, x);
      if (z < L.dripZ + 0.25) {
        set({ gravel: fx, grass: 1 - fx });
        if (Math.abs(x - L.door.x) < 0.75 + edgeN * 0.5 && z > L.wallZ - 0.1) { const t = 1 - sstep(0.55, 0.75, Math.abs(x - L.door.x)); set({ tataki: t * fx, gravel: (1 - t) * fx }); G0 = 0.55 * t * fx; }
      }
      const g = L.gutter;
      if (Math.abs(z - g.z) < g.half + 0.13 && x < g.x1) {
        const kerb = sstep(g.half, g.half + 0.02, Math.abs(z - g.z)) * fx;
        set({ paving: kerb, gravel: (1 - kerb) * 0.3 });
        field.style[idx] = PAVE.slabs;
        base -= g.depth * (1 - sstep(g.half - 0.02, g.half + 0.01, Math.abs(z - g.z))) * fx;
        field.wet[idx] = Math.max(field.wet[idx], (1 - kerb) * 0.9);
      }
      const s = L.street;
      const inS = sstep(0, 0.06, Math.min(z - s.z0, s.z1 - z)) * (1 - sstep(s.x1 - 0.9, s.x1 + 0.6 + edgeN * 3, x));
      if (inS > 0) {
        const broken = sstep(0.55, 0.75, vnoise(x * 3.1, z * 3.1)) * sstep(s.x1 - 1.6, s.x1, x);
        const pv = inS * (1 - broken);
        set({ paving: pv, moss: pv * 0.1 * sstep(0.5, 0.8, n2), grass: (1 - inS) * 0.8 });
        field.style[idx] = PAVE.setts;
        G0 = Math.max(G0, 0.35 * inS * (1 - sstep(0.2, 0.9, Math.abs(z - (s.z0 + s.z1) / 2))));
      }
    }

    // ---- shrine sandō: tamajari with granite kerbs and a nobedan walk down it
    const sd = L.sando;
    if (x > sd.x0 - 0.3 && z < sd.z1 + 0.3) {
      const inside = sstep(0, 0.08, Math.min(x - sd.x0, sd.z1 - z));
      const kerb = (1 - sstep(0.1, 0.13, Math.abs(x - sd.x0 + 0.06))) * (z < sd.z1 ? 1 : 0) + (1 - sstep(0.1, 0.13, Math.abs(z - sd.z1 + 0.06))) * (x > sd.x0 ? 1 : 0);
      if (inside > 0 || kerb > 0) {
        set({ gravel: inside * (1 - Math.min(1, kerb)), paving: Math.min(1, kerb), grass: (1 - inside) * (1 - Math.min(1, kerb)) });
        if (kerb > 0) field.style[idx] = PAVE.slabs;
        const p = sd.path;
        if (x > p.x0 && z > p.z0 && z < p.z1) {
          const e = sstep(0, 0.05, Math.min(z - p.z0, p.z1 - z, x - p.x0));
          set({ paving: e, gravel: 1 - e });
          field.style[idx] = PAVE.nobedan;
          G0 = 0.45 * e;
        }
      }
    }

    // ---- roji: moss, a gravel "sea" round the basin, needles under the pine-less corner
    const R = L.roji;
    const inR = rect(x, z, R);
    if (inR > 0) {
      const mossy = inR * (0.88 + 0.12 * n2);
      set({ moss: mossy, grass: (1 - mossy) * 0.7 });
      const t = L.tsukubai, dt = Math.hypot(x - t.x, z - t.z);
      if (dt < 0.95) {
        const umi = 1 - sstep(0.62, 0.8, dt);
        set({ gravel: umi, moss: (1 - umi) * mossy });
        base -= 0.06 * (1 - sstep(0.45, 0.8, dt));
      }
      const [dm] = polyDist(x, z, main), [db] = polyDist(x, z, basin), [dc] = polyDist(x, z, closed);
      // gardeners keep the moss between the stones; it only wears a little
      G0 = Math.max(G0, 0.08 * (1 - sstep(0.15, 0.4, Math.min(dm, db, dc))));
    }

    // ---- karesansui: a bed of Shirakawa sand with a tile edge
    const sb = L.sand;
    const inSand = rect(x, z, sb);
    if (inSand > 0 || (x > sb.x0 - 0.2 && x < sb.x1 + 0.2 && z > sb.z0 - 0.2 && z < sb.z1 + 0.2)) {
      const edge = Math.min(Math.abs(x - sb.x0), Math.abs(x - sb.x1), Math.abs(z - sb.z0), Math.abs(z - sb.z1));
      const kerb = 1 - sstep(0.07, 0.1, edge);
      set({ sand: inSand * (1 - kerb), paving: kerb, moss: (1 - inSand) * (1 - kerb) * 0.6, grass: (1 - inSand) * (1 - kerb) * 0.4 });
      if (kerb > 0) field.style[idx] = PAVE.slabs;
      base += 0.025 * inSand;
    }

    field.base[idx] = base;
    field.G0[idx] = G0;
    field.wear[idx] = G0;
  }
  field.paveStyle = PAVE.setts;
  field.touch();
  return { stones: rojiStones() };
}

export function rojiStones() {
  const { main, basin, closed } = rojiPaths();
  const s = layStones(main, { seed: 5, skipFirst: true }).concat(layStones(basin, { seed: 9, skipFirst: true }), layStones(closed, { seed: 13, skipFirst: true }));
  return s;
}

/** places the village cats like to go: the kemonomichi run between these */
export const POIS = [
  { id: 'engawa', x: -5.7, z: 4.55, w: 1.4, label: 'the warm stone by the engawa' },
  { id: 'basin', x: -2.05, z: 4.05, w: 1.2, label: 'the tsukubai, for a drink' },
  { id: 'door', x: -2.5, z: -3.35, w: 1.3, label: 'the fishmonger’s door' },
  { id: 'gate', x: 7.4, z: -2.55, w: 0.9, label: 'the shrine' },
  { id: 'rock', x: 4.3, z: 3.0, w: 1.0, label: 'the sun-warmed rock' },
  { id: 'west', x: -7.7, z: laneZ(-7.7), w: 0.8, label: 'the lane, west' },
  { id: 'east', x: 7.7, z: laneZ(7.7), w: 0.8, label: 'the lane, east' },
  { id: 'pine', x: 5.6, z: -3.9, w: 0.6, label: 'under the pine' }
];
