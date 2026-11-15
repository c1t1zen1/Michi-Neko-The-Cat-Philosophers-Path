// Focused specimens for the courtyard wall and the secret house's furnishings
// (lane v-interiors-b, L4). Same shape as specimens.js: `build(root, finish)`
// fills `root` and returns { explode(v) }; `cam` / `look` frame the bench camera.
import * as THREE from 'three';
import { box, mesh } from './build.js';
import { material, plain } from './materials.js';

const layer = (root) => { const g = new THREE.Group(); root.add(g); return g; };

export const SPECIMENS_B = {
  'courtyard-wall': {
    jp: '塀 / HEI', title: 'A wall that keeps the garden.', cam: [3.4, 2.4, 4.4], look: [0, 1.2, 0],
    description: 'The courtyard is closed by a timber wall on three sides. A stone plinth keeps the boards out of the splash, two nuki rails tie the faces, vertical battens hide the joints and a tiled coping sheds the rain. The classic wall is three bare slabs.',
    slider: 'Lift the coping', finish: 'The boards', options: [['dark', 'Smoked timber'], ['cedar', 'Cedar']],
    key: ['Plinth: stone under the boards.', 'Nuki: rails that tie the face.', 'Coping: tiles that shed the rain.'],
    code: "boards(0.3, 3.2);\nplinth(.22);\nnuki(y = [1.15, 2.4]);\nbattens(every = .6);\ncoping(.5, tiles);",
    build(root, finish) {
      const wood = material('wood', finish), body = layer(root), rails = layer(root), top = layer(root), foot = layer(root);
      box(body, 3.2, 3.0, .3, wood, 0, 1.5, 0);
      for (let i = 0; i < 6; i++) box(body, .07, 3.0, .03, plain('#2e1d12'), -1.5 + i * .6, 1.5, .165);
      for (const y of [1.15, 2.4]) box(rails, 3.1, .12, .06, plain('#4a3220'), 0, y, .18);
      box(foot, 3.4, .22, .42, plain('#6c685e'), 0, .11, 0);
      box(top, 3.4, .12, .5, plain('#4a5058'), 0, 3.06, 0); box(top, 3.46, .04, .56, plain('#2f353b'), 0, 3.14, 0);
      return { explode(v) { top.position.y = v * .5; rails.position.z = v * .4; foot.position.y = -v * .1; } };
    }
  },
  'secret-tatami': {
    jp: '畳 / TATAMI', title: 'Six mats, a size smaller.', cam: [3.6, 3.2, 4.2], look: [0, 0, 0],
    description: 'The hidden house is laid with six 1.15 by 2.3 m mats, a size under the tea room, in the usual no-four-corners pattern. The doko shows in each joint and a brocade heri runs along the long edges. Stand on it and the room feels closer.',
    slider: 'Pull the mats apart', finish: 'The rush', options: [['fresh', 'Fresh green'], ['aged', 'Aged straw']],
    key: ['Six mats, never four corners meeting.', 'Doko: the dark core in each joint.', 'Heri: brocade on the long edges.'],
    code: "mats = [[-1.15,-1.15], [1.15,-1.15], [-1.15,1.15], [1.15,1.15], [-2.3,0]r, [2.3,0]r];\nheri(long edges);",
    build(root, finish) {
      const list = [[-1.15, -1.15, 0], [1.15, -1.15, 0], [-1.15, 1.15, 0], [1.15, 1.15, 0], [-2.3, 0, 1], [2.3, 0, 1]], groups = [];
      for (const [x, z, r] of list) {
        const g = layer(root), w = r ? 2.3 : 1.15, d = r ? 1.15 : 2.3;
        box(g, w - .04, .08, d - .04, material('tatami', finish), x, .04, z);
        box(g, w, .064, d, plain('#2a3322'), x, .03, z);
        for (const s of [-1, 1]) box(g, r ? d - .07 : .05, .004, r ? .05 : d - .07, plain('#323f2a'), r ? x : x + s * (w / 2 - .05), .083, r ? z + s * (d / 2 - .05) : z);
        groups.push([g, x, z]);
      }
      return { explode(v) { for (const [g, x, z] of groups) { g.position.x = x * v * .18; g.position.z = z * v * .18; } } };
    }
  },
  'secret-table': {
    jp: '卓 / CHABUDAI', title: 'A small table for one good meal.', cam: [2.2, 1.4, 2.4], look: [0, .35, 0],
    description: 'A stepped top, four legs on pads, a low apron frame, a kyusu with two yunomi and the platter the fish lands on. The tabletop is the only surface in the room the cat is invited to stand on; the fish itself is its own object.',
    slider: 'Lift the top', finish: 'The timber', options: [['cedar', 'Cedar'], ['dark', 'Smoked timber']],
    key: ['Two slabs make a stepped edge.', 'Aprons tie the leg heads.', 'The platter is where the fish waits.'],
    code: "top = slab(1.5,.04) + slab(1.46,.04);\nlegs(4, h = .38, pad);\naprons(y = .33);\nkyusu + 2 yunomi;\nplatter(r = .2);",
    build(root, finish) {
      const wood = material('wood', finish), top = layer(root), frame = layer(root), set = layer(root);
      box(top, 1.5, .04, 1.1, wood, 0, .44, 0); box(top, 1.46, .04, 1.06, wood, 0, .40, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { box(frame, .1, .38, .1, material('wood', 'dark'), sx * .65, .19, sz * .45); box(frame, .14, .03, .14, material('wood', 'dark'), sx * .65, .015, sz * .45); }
      for (const sz of [-1, 1]) box(frame, 1.2, .06, .03, material('wood', 'dark'), 0, .33, sz * .45);
      for (const sx of [-1, 1]) box(frame, .03, .06, .8, material('wood', 'dark'), sx * .65, .33, 0);
      mesh(set, new THREE.LatheGeometry([[.001, 0], [.045, 0], [.07, .012], [.088, .045], [.09, .07], [.075, .1], [.05, .113], [.034, .12], [.001, .12]].map(([r, y]) => new THREE.Vector2(r, y)), 20), material('ceramic', 'sage'), -.35, .46, -.2);
      mesh(set, new THREE.CylinderGeometry(.2, .17, .016, 20), plain('#ede4d2'), .2, .468, .1);
      return { explode(v) { top.position.y = v * .5; set.position.y = v * .7; } };
    }
  },
  'secret-bed': {
    jp: '寝座 / NEZA', title: 'The cushion that was always for the cat.', cam: [1.4, 1.0, 1.6], look: [0, .07, 0],
    description: 'Smaller than the tea room zabuton, 0.75 m square, but the same pillow: a crowned top, a dimple under the button, four gold tassels. It sits on the tatami at the end of the room and the cat knows exactly why.',
    slider: 'Plump it up', finish: 'The cloth', options: [['rust', 'Crimson'], ['indigo', 'Indigo'], ['moss', 'Moss']],
    key: ['Crowned top, pinched corners.', 'A dimple at the button.', 'Four gold tassels.'],
    code: "box(.75, .14, .75, segs = 10);\ncrown(k = x²z²);\nbutton(dimple);\ntassels(4);",
    build(root, finish) {
      const g = new THREE.BoxGeometry(.75, .14, .75, 10, 2, 10), p = g.attributes.position, base = Float32Array.from(p.array);
      const cushion = new THREE.Mesh(g, material('cloth', finish)); cushion.castShadow = true; root.add(cushion);
      const tass = layer(root);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(tass, new THREE.SphereGeometry(.024, 8, 6), plain('#d9ad4c'), sx * .36, 0, sz * .36);
      const set = (v) => { for (let i = 0; i < p.count; i++) { const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2], k = Math.max(0, 1 - (x / .375) ** 2) * Math.max(0, 1 - (z / .375) ** 2); p.setY(i, y > 0 ? y + .07 * v * k - .02 * Math.exp(-(x * x + z * z) / .01) : y); } p.needsUpdate = true; g.computeVertexNormals(); };
      set(.5);
      return { explode(v) { set(v); tass.position.y = v * .03; } };
    }
  },
  'secret-andon': {
    jp: '行灯 / ANDON', title: 'A lamp you can read by, almost.', cam: [1.4, 1.1, 1.8], look: [0, .45, 0],
    description: 'A timber frame round four paper panes with a stepped cap and one flame in the middle. The kit andon is the lanterns family builder, fitted to the 0.72 m classic lamp, and it is lit by the valley\'s own dusk curve: dark by day, kindling at evening.',
    slider: 'Lift the cap', finish: 'The paper', options: [['cream', 'Cream'], ['sage', 'Pale green']],
    key: ['Four panes, a lattice of thin rails.', 'A flame at the middle lights all four.', 'It kindles at dusk, never by day.'],
    code: "frame(0.44, 0.88);\nrails(y = [.2, .43, .66]);\npanes(4, washi);\ncap(stepped);\nflame(dusk);",
    build(root, finish) {
      const wood = material('wood', 'dark'), foot = layer(root), pane = layer(root), cap = layer(root);
      box(foot, .44, .06, .44, wood, 0, .03, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(foot, .03, .77, .03, wood, sx * .18, .445, sz * .18);
      const paper = new THREE.MeshStandardMaterial({ color: finish === 'sage' ? '#dfe7cc' : '#fff1d6', emissive: '#ffb860', emissiveIntensity: .45, roughness: .9 });
      for (const [x, z, ry] of [[0, .178, 0], [0, -.178, 0], [.178, 0, 1], [-.178, 0, 1]]) { const m = mesh(pane, new THREE.PlaneGeometry(.33, .76), paper, x, .445, z); m.rotation.y = ry ? Math.PI / 2 : 0; }
      for (const y of [.2, .43, .66]) for (const s of [-1, 1]) { box(pane, .36, .014, .014, wood, 0, y, s * .18); box(pane, .014, .014, .36, wood, s * .18, y, 0); }
      box(cap, .42, .05, .42, wood, 0, .855, 0); box(cap, .26, .03, .26, wood, 0, .91, 0); box(cap, .1, .03, .1, wood, 0, .94, 0);
      return { explode(v) { cap.position.y = v * .4; pane.scale.set(1 + v * .25, 1, 1 + v * .25); } };
    }
  }
};

export const SPECIMEN_CRAFTS_B = Object.fromEntries(Object.entries(SPECIMENS_B).map(([k, s]) => [k, { jp: s.jp, title: s.title, description: s.description, slider: s.slider, finish: s.finish, options: s.options, key: s.key, code: s.code, specimen: true }]));
