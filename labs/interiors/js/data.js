// Dimensions are metres. Room names are fictional design studies, not replicas.
export const UNIT = 0.955;
export const LAYOUTS = {
  fourhalf: { name: '4½-mat spiral', w: 3, d: 3, mats: [[0,0,2,1],[2,0,1,2],[0,1,1,2],[1,1,1,1],[1,2,2,1]] },
  six: { name: '6-mat stagger', w: 4, d: 3, mats: [[0,0,2,1],[2,0,2,1],[0,1,1,2],[1,1,2,1],[3,1,1,2],[1,2,2,1]] },
  eight: { name: '8-mat enclosure', w: 4, d: 4, mats: [[0,0,1,2],[1,0,2,1],[3,0,1,2],[1,1,1,2],[2,1,1,2],[0,2,1,2],[3,2,1,2],[1,3,2,1]] }
};
export const SOURCES = [
  { title: 'Motoyama Tatami · the structure of a mat', url: 'https://kyo-tatami.com/world/about/structure/', note: 'Toko, omote, heri, rush and warp yarns.' },
  { title: 'Motoyama Tatami · sizes & questions', url: 'https://kyo-tatami.com/world/faq-list/', note: 'Kyōma: 191 × 95.5 × 5.5 cm.' },
  { title: 'Kyoto City · Kyomachiya no Iroha', url: 'https://kyomachiya.city.kyoto.lg.jp/wp-content/uploads/2022/01/iroha.pdf', note: 'Room proportions, sliding partitions and seasonal living. See research notebook for page notes.' },
  { title: 'Hachise · the interior of a Kyoto machiya', url: 'https://www.hachise.com/kyomachiya/features/featuresInterior.html', note: 'Engawa, box stairs, ceiling and tokonoma.' },
  { title: 'Asian Art Museum · the teahouse alcove', url: 'https://education.asianart.org/resources/teahouse-alcove-tokonoma/', note: 'Seasonal flowers, scroll and incense container.' },
  { title: 'eShoji · paper specifications', url: 'https://www.eshoji.com/faq/shoji-paper-specs/', note: 'Different papers transmit different amounts of light.' },
  { title: 'Takenaka · the carpentry tools museum', url: 'https://www.takenaka.co.jp/design/works/takenaka-carpentry-tools-museum/', note: 'Traditional timber craft, plaster and garden relationships.' },
  { title: 'Asahido · Kyo ware / Kiyomizu ware', url: 'https://www.asahido.co.jp/en/common/faq/', note: 'Kyoto ceramics have a broad range of designs.' },
  { title: 'Three.js r160 · multiple elements', url: 'https://github.com/mrdoob/three.js/blob/r160/examples/webgl_multiple_elements.html', note: 'One renderer, scissored views, offscreen culling.' },
  { title: 'Three.js r160 · canvas textures', url: 'https://github.com/mrdoob/three.js/blob/r160/manual/en/canvas-textures.html', note: '256 px colour maps plus separate linear bump data.' },
  { title: 'Three.js · LatheGeometry', url: 'https://threejs.org/docs/pages/LatheGeometry.html', note: 'Hollow ceramic profiles, foot rings and hand-shaped rims.' },
  { title: 'Three.js r160 · shadow maps', url: 'https://github.com/mrdoob/three.js/blob/r160/examples/webgl_shadowmap.html', note: 'Real sun and lattice shadows; painted diffusion is an art approximation.' }
];
const R = (id, name, jp, family, layout, furniture, screen, floor, wall, wood, accent, season, hour, note, detail, source = 3) => ({ id, name, jp, family, layout, furniture, screen, floor, wall, wood, accent, season, hour, note, detail, source });
export const ROOMS = [
  R('garden', 'The garden zashiki', '庭の座敷', 'tea', 'eight', 'round', 'shoji', 'fresh', 'ochre', 'cedar', 'rust', 'green', 16, 'Eight mats, an open veranda, and somewhere warm to sit.', 'A round chabudai, rust-red zabuton, an ink landscape, and a maple just beyond the paper. A domestic room for everyday tea.'),
  R('sukiya', 'One bowl of tea', '一服のお茶', 'tea', 'fourhalf', 'ceremony', 'fine', 'fresh', 'earth', 'dark', 'moss', 'green', 10, 'Four and a half mats. Space left for the gathering.', 'A sparse sukiya-inspired study with a portable brazier, kettle, bamboo whisk, and black tea bowl. The centre stays open.', 4),
  R('study', 'The rain reader', '雨の書斎', 'tea', 'six', 'desk', 'yukimi', 'aged', 'sage', 'cedar', 'indigo', 'rain', 14, 'A writing desk at the edge of a rainy garden.', 'A low writing desk, folded paper, brush rest, and viewing panes under a fine paper grid. The garden stays silver-green.', 5),
  R('potter', 'The potter’s pause', '陶工のひと休み', 'daily', 'six', 'workbench', 'shoji', 'aged', 'earth', 'dark', 'indigo', 'green', 15, 'A worn workbench and a little family of bowls.', 'A timber working strip, low bench, vessels on a stepped chest, and glaze studies in blue and white. Michi can inspect the samples.', 7),
  R('machiya', 'Afternoon at home', '町家の午後', 'daily', 'eight', 'square', 'fusuma', 'aged', 'ochre', 'cedar', 'rust', 'green', 16.5, 'A family table, a chest of drawers, and sliding painted doors.', 'Everyday life in a machiya: a square low table and a cedar tansu. Painted fusuma form the garden-side partition in this design study.'),
  R('indigo', 'The dyer’s room', '藍の間', 'daily', 'six', 'desk', 'fine', 'fresh', 'cream', 'dark', 'indigo', 'green', 11, 'Indigo cloth and pale paper against smoke-dark wood.', 'A folded textile stack, a writing desk, blue-and-white pottery, and fine kumiko. Contrast comes from materials rather than a heavy outline.'),
  R('summer', 'A breeze in August', '夏のしつらい', 'season', 'eight', 'round', 'sudare', 'fresh', 'cream', 'cedar', 'moss', 'summer', 13, 'Reed screens let the garden breathe into the room.', 'Thin horizontal reeds, a spare table, light cushions, and fresh green leaves. A seasonal screen study inspired by Kyoto’s summer fittings.'),
  R('autumn', 'Maple at the window', '紅葉の窓辺', 'season', 'six', 'square', 'shoji', 'gold', 'ochre', 'cedar', 'rust', 'autumn', 17, 'A russet maple, gold rush, and one branch in the alcove.', 'Autumn colour gathers around the veranda. A painted maple scroll and a restrained seasonal flower arrangement echo the garden.', 4),
  R('winter', 'Under the quilt', '冬のこたつ', 'season', 'eight', 'kotatsu', 'yukimi', 'gold', 'cream', 'dark', 'indigo', 'winter', 16, 'A low kotatsu, a quilt, and snow beyond the viewing panes.', 'The raised tabletop remains a jump surface. Draped indigo cloth and soft cushions bring warmth to the winter palette; the garden is dusted white.'),
  R('lantern', 'When the andon wakes', '行灯の夜', 'night', 'eight', 'round', 'shoji', 'gold', 'earth', 'dark', 'rust', 'green', 20, 'Paper lanterns gather the room into a small pool of amber.', 'Emissive paper is paired with a local warm light. Cool garden fill keeps the dark wood legible after sunset.'),
  R('moon', 'The moon-viewing room', '月見の間', 'night', 'six', 'square', 'yukimi', 'fresh', 'sage', 'dark', 'moss', 'autumn', 22, 'Silver at the threshold, and a small green tea bowl.', 'A quiet moon-viewing composition. The screen’s lower opening frames pale stones; amber lantern light balances the cool garden.'),
  R('guest', 'A place to stay', '旅の宿', 'night', 'eight', 'futon', 'fusuma', 'aged', 'ochre', 'cedar', 'indigo', 'rain', 19, 'A folded futon, a tray, and the last light in the garden.', 'An imagined guest room with a soft sleeping platform and a small side table. Rest beside the folded bedding, or investigate the tea tray.')
];
export const byId = (id) => ROOMS.find((r) => r.id === id) || ROOMS[0];
export const BUILD_STEPS = [
  ['The floor', 'Straw core, rush surface, and a border on the long edges. Every mat has its own grain direction.'],
  ['The frame', 'Posts, grooves, rails, and plaster infill. The ceiling can be lifted away for the cutaway.'],
  ['The screen', 'A moving frame with real kumiko, paper fibres, and a soft branch silhouette.'],
  ['The alcove', 'A raised display, an original ink scroll, and a small seasonal flower arrangement.'],
  ['The furniture', 'Hollow vessels, padded cushions, and low furniture with real landing surfaces.'],
  ['The atmosphere', 'A garden, soft window fill, dust, steam, and a warm paper lantern at dusk.']
];

/** Validate coverage and the no-four-corners rule without Three.js. */
export function validateLayout(layout) {
  const grid = Array.from({ length: layout.d }, () => Array(layout.w).fill(-1));
  for (let i = 0; i < layout.mats.length; i++) {
    const [x,z,w,d] = layout.mats[i];
    if (!((w === 2 && d === 1) || (w === 1 && d === 2) || (w === 1 && d === 1))) return false;
    for (let j=z;j<z+d;j++) for(let k=x;k<x+w;k++) {
      if (!grid[j] || k < 0 || k >= layout.w || grid[j][k] !== -1) return false;
      grid[j][k] = i;
    }
  }
  if (grid.some((r) => r.includes(-1))) return false;
  for(let z=1;z<layout.d;z++) for(let x=1;x<layout.w;x++) {
    if (new Set([grid[z-1][x-1],grid[z-1][x],grid[z][x-1],grid[z][x]]).size === 4) return false;
  }
  return true;
}
