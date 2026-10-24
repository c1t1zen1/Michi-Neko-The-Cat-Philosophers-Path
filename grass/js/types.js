// The twenty grasses, in display order. A type's index here is its id inside
// GrassPatch; `slug` is its DOM id.
import { OURS } from './types_ours.js';
import { FIELD } from './types_field.js';
import { MIXED } from './types_mixed.js';
import { WILD } from './types_wild.js';

export const FAMILIES = [
  { key: 'ours', title: 'Ours, re-grown', sub: 'Five variations on the meadow the game ships today.' },
  { key: 'field', title: 'From the field', sub: 'Five techniques found in blogs, forums, talks and repos.' },
  { key: 'cross', title: 'Cross-bred', sub: 'Our meadow crossed with the best of the research.' },
  { key: 'wild', title: 'Strange & new', sub: 'Five experiments for places the game has not been yet.' }
];

// What each card counts ("items"): blades, cards, strands, ...
const UNITS = {
  'meadow-classic': 'blades', 'meadow-gpu': 'blades', 'meadow-tuft': 'blades', 'meadow-thicket': 'blades',
  'meadow-painted': 'blades', cards: 'cards', bezier: 'blades', triquad: 'blades', shell: 'strands',
  'ring-lod': 'instances', 'carpet-blades': 'instances', wildflowers: 'instances', pressed: 'blades',
  'halo-meadow': 'instances', mown: 'blades', lantern: 'fibers', susuki: 'plants', sumi: 'strokes',
  yarn: 'curls', moss: 'verts'
};

export const TYPES = [...OURS, ...FIELD, ...MIXED, ...WILD];
TYPES.forEach((t, i) => { t.index = i; t.slug = t.id; t.unit = t.unit || UNITS[t.id] || 'items'; });
