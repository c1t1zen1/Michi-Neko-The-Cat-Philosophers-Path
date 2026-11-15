/**
 * Non-cat characters (Phase 3, lane c4-creatures): Larry the turtle and the
 * three guardian crows. A CreatureDef is the data half, the builders in
 * `creatures/` are the rig half (a small Group hierarchy with named hinge
 * parts), and `src/kit/creatures` registers both as kit assets so the
 * runtime's `setFor(id)` / `?swap=` decides classic vs modular, exactly as
 * for the other ids. Behaviour never moves here: Larry's patrol is
 * Countryside.updateCorralGuardian, the crows' circling and swoops are
 * AmbientLife.updateGuardianBirds. Those read `group` (position, rotation)
 * and the `handles` named below, and nothing else.
 *
 *   {
 *     id: 'larry',                // the inventory id
 *     kind: 'turtle' | 'crow',    // which rig builder
 *     label: 'Larry the turtle',
 *     palette: { ...colours },    // 0xRRGGBB, per kind (see the defs)
 *     scale: 1,                   // body scale on top of the layout's
 *     handles: ['wing_l', ...]    // parts the behaviour code binds (must exist at every tier)
 *   }
 */
export const CREATURE_KINDS = Object.freeze(['turtle', 'crow']);
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PART_RE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const DEF_KEYS = ['id', 'kind', 'label', 'palette', 'scale', 'handles'];
const isColour = (v) => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 0xffffff;

export function validateCreatureDef(def) {
  const errors = [];
  if (!def || typeof def !== 'object' || Array.isArray(def)) return { ok: false, errors: ['a CreatureDef is an object'] };
  for (const k of Object.keys(def)) if (!DEF_KEYS.includes(k)) errors.push(`unknown field "${k}"`);
  if (typeof def.id !== 'string' || !ID_RE.test(def.id)) errors.push('id must be kebab-case');
  if (!CREATURE_KINDS.includes(def.kind)) errors.push(`kind must be one of ${CREATURE_KINDS.join(', ')}`);
  if (!def.palette || typeof def.palette !== 'object') errors.push('palette is an object of colours');
  else for (const [k, v] of Object.entries(def.palette)) if (!isColour(v)) errors.push(`palette.${k} must be 0xRRGGBB`);
  if (def.scale !== undefined && (typeof def.scale !== 'number' || !(def.scale > 0.2 && def.scale < 5))) errors.push('scale must be in (0.2, 5)');
  if (!Array.isArray(def.handles) || !def.handles.every((h) => PART_RE.test(h))) errors.push('handles: snake_case part names');
  return { ok: errors.length === 0, errors };
}

/** Validate and freeze a CreatureDef; throws with every problem listed. */
export function defineCreature(def) {
  const { ok, errors } = validateCreatureDef(def);
  if (!ok) throw new Error(`${def && def.id}: ${errors.join('; ')}`);
  return Object.freeze({
    id: def.id, kind: def.kind, label: def.label || def.id,
    palette: Object.freeze({ ...def.palette }), scale: def.scale ?? 1, handles: Object.freeze([...def.handles])
  });
}
