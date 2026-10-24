// Helpers shared by the grass recipes.
import { ribbonMaterial, hashField, packCell } from './kit.js';

/** Build the make() of a hash-placed ribbon-blade grass from its recipe. */
export function ribbonMake(def) {
  return (ctx, cell) => {
    const geo = ctx.cache(def.id + ':geo', def.geo);
    const mat = ribbonMaterial(ctx, cell, def);
    const mesh = hashField(ctx, cell, geo, mat, def.perM2, { maxInstances: def.max });
    mesh.userData.itemsPer = def.itemsPer || 1;
    return packCell([mesh]);
  };
}

/** The game's meadow palette (src/vegetation.js grassMaterial) */
export const MEADOW = { root: 0x36622a, mid: 0x669a3e, tip: 0xa6c65c };

/**
 * Meadow placement in GLSL: jittered grid, fbm patchiness (clearings thin
 * out, thick clumps grow tall) and the game's four colour flavours.
 */
export const MEADOW_ROOT = /* glsl */`
  B.root = gridPos(s, id);`;
export const MEADOW_BODY = /* glsl */`
  float n = fbm(B.root * 1.6 + uCell.w * 3.1);
  float thick = smoothstep(0.50, 0.70, n);
  float clear = 1.0 - smoothstep(0.26, 0.40, n);
  float r1 = rnd(s), r2 = rnd(s), r3 = rnd(s), r4 = rnd(s);
  if (rnd(s) < clear * 0.5) { B.alive = 0.0; return; }
  B.h = (0.22 + r1 * 0.24) * (1.0 + thick * (0.45 + r2 * 0.6)) * (1.0 - clear * 0.25);
  B.w = 0.012 + r2 * 0.009;
  B.yaw = r3 * 6.2832;
  B.lean = 0.12 + r4 * 0.30;
  B.rnd = r4;
  float fl = rnd(s);
  vec3 tint;
  if (fl < 0.30) tint = vec3(0.67, 0.87, 0.77);
  else if (fl < 0.60) tint = vec3(0.87, 1.02, 0.83);
  else if (fl < 0.82) tint = vec3(0.94, 0.99, 0.85);
  else tint = vec3(1.06, 1.0, 0.66);
  float br = 0.72 + rnd(s) * 0.26;
  if (thick > 0.5) br *= 0.82;
  B.tint = tint * br;
`;
export const PLACE_MEADOW = MEADOW_ROOT + MEADOW_BODY;

/** Update hook for meshes that only matter near the focus (cat / ball) */
export function nearFocusUpdate(mesh, cell, radius) {
  return (patch) => {
    const f = patch.U.uFocus.value;
    const dx = Math.max(cell.ox - f.x, 0, f.x - (cell.ox + cell.size));
    const dz = Math.max(cell.oz - f.z, 0, f.z - (cell.oz + cell.size));
    mesh.visible = dx * dx + dz * dz < radius * radius;
  };
}
