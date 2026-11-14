// Focused specimens for the tea house's own parts (lane v-interiors-a, L4):
// the frame, tokonoma, scroll, chabudai, zabuton, bonsai and the knick-knacks
// the game moves. Same shape as CRAFTS (craft.js merges them in): `build(root, finish)`
// fills `root` and returns { explode(v) }; `cam` / `look` frame the bench camera.
import * as THREE from 'three';
import { box, mesh, vessel } from './build.js';
import { material, plain, artwork } from './materials.js';

const lerp = THREE.MathUtils.lerp;
const layer = (root) => { const g = new THREE.Group(); root.add(g); return g; };
const slab = (g, w, h, d, m, x, y, z, r = 0) => box(g, w, h, d, m, x, y, z, r);

export const SPECIMENS = {
  frame: {
    jp: '柱と梁 / HASHIRA', title: 'A wall is four layers.', cam: [3.6, 2.6, 4.6], look: [0, 1.2, 0],
    description: 'The room is a timber post-and-beam frame. A nageshi rail ties the posts together, plaster fills between them, a skirting board meets the floor, and the ceiling is battened. The game’s classic room is plain slabs; the kit adds the rails.',
    slider: 'Separate the layers', finish: 'The timber', options: [['cedar', 'Cedar'], ['dark', 'Smoked timber']],
    key: ['Hashira: the structural post.', 'Nageshi: the rail that ties the posts.', 'Plaster between, skirting below, battens above.'],
    code: "post(1.2, 3.6);\nnageshi(y = 2.35);\nplaster(w, h, .3);\nskirting(y = .13);\nbattens(every = .5);",
    build(root, finish) {
      const wood = material('wood', finish), wall = layer(root), rails = layer(root), post = layer(root), cap = layer(root);
      slab(wall, 2.4, 2.4, .12, material('plaster', 'ochre'), 0, 1.2, 0);
      slab(rails, 2.4, .13, .08, wood, 0, 1.55, .09); slab(rails, 2.4, .1, .04, wood, 0, .1, .08);
      for (const x of [-1.2, 1.2]) slab(post, .22, 2.4, .22, wood, x, 1.2, 0, .01);
      for (let i = 0; i < 6; i++) slab(cap, .05, .03, .9, wood, -1.05 + i * .42, 2.42, 0);
      slab(cap, 2.8, .1, 1, material('wood', 'dark'), 0, 2.48, 0);
      return { explode(v) { wall.position.z = -v * .5; rails.position.z = v * .45; post.position.z = v * .1; cap.position.y = v * .5; } };
    }
  },
  tokonoma: {
    jp: '床の間 / TOKONOMA', title: 'A place for one beautiful thing.', cam: [4.0, 2.4, 5.2], look: [0, 1.1, 0],
    description: 'A raised floor board, an earthen back wall, a natural post at the front corner and a lintel that hides the ceiling. Nothing here is furniture. It is a frame for the scroll, and the guest never steps in.',
    slider: 'Open the alcove', finish: 'The wall earth', options: [['ochre', 'Ochre'], ['earth', 'Umber'], ['sage', 'Ash green']],
    key: ['Toko-gamachi: the raised floor board.', 'Tokobashira: a natural post, bark left on.', 'Otoshigake: the hanging lintel.'],
    code: "floor(3.2, .22, 1.2);\nearthWall(color);\ntokobashira(r = .07, natural);\notoshigake(y = 3.15);",
    build(root, finish) {
      const f = layer(root), back = layer(root), post = layer(root), head = layer(root), wood = material('wood', 'dark');
      slab(f, 2.4, .16, .9, wood, 0, .08, 0); slab(f, 2.4, .02, .04, material('wood', 'cedar'), 0, .17, .46);
      slab(back, 2.4, 2.2, .06, material('plaster', finish), 0, 1.25, -.46);
      mesh(post, new THREE.CylinderGeometry(.05, .06, 2.1, 8), material('wood', 'cedar'), 1.25, 1.2, .42);
      slab(head, 2.7, .14, .12, wood, 0, 2.3, .42);
      return { explode(v) { back.position.z = -v * .5; f.position.y = -v * .1; post.position.x = v * .4; head.position.y = v * .45; } };
    }
  },
  scroll: {
    jp: '掛軸 / KAKEJIKU', title: 'A painting that hangs.', cam: [2.2, 1.6, 4.6], look: [0, 1.1, 0],
    description: 'A scroll is a sandwich. A painted panel sits inside a silk mounting; two thin bands (ichimonji) frame it; a heavy roller at the foot keeps it straight and a slim one at the top carries the cord. Two streamers hang over the face.',
    slider: 'Unroll the layers', finish: 'The painting', options: [['landscape', 'Mist and pine'], ['maple', 'Maple branch']],
    key: ['Honshi: the painting.', 'Hyogu: the silk mounting and its bands.', 'Jikusaki: the weighted roller.'],
    code: "mount(1.2, 2.2);\npainting(.8, 1.3);\nichimonji(y = 1.93, .52);\nroller(top, bottom);",
    build(root, finish) {
      const silk = layer(root), art = layer(root), bands = layer(root), rollers = layer(root);
      slab(silk, 1.2, 2.2, .012, plain('#d8c89c'), 0, 1.1, 0);
      const m = new THREE.MeshStandardMaterial({ map: artwork(finish, 'green'), roughness: 1 });
      slab(art, .8, 1.3, .01, m, 0, 1.2, .012);
      for (const y of [1.93, .52]) slab(bands, 1.2, .035, .016, plain('#a98a3d'), 0, y, .008);
      for (const s of [-1, 1]) slab(bands, .03, .5, .008, plain('#6d4f2a'), s * .2, 1.95, .02);
      mesh(rollers, new THREE.CylinderGeometry(.02, .02, 1.3, 8).rotateZ(Math.PI / 2), plain('#3b2616'), 0, 2.2, .01);
      mesh(rollers, new THREE.CylinderGeometry(.03, .03, 1.36, 8).rotateZ(Math.PI / 2), plain('#2b1b10'), 0, .03, .01);
      return { explode(v) { art.position.z = v * .4; bands.position.z = v * .22; rollers.position.z = v * .1; silk.position.z = -v * .1; } };
    }
  },
  chabudai: {
    jp: '卓袱台 / CHABUDAI', title: 'A table you sit beside.', cam: [2.5, 1.3, 2.6], look: [0, .3, 0],
    description: 'Low, stepped and unadorned. The top is two slabs so the edge reads thin; four short legs stand on pads; aprons stiffen the frame. The cat’s paws land on the top, which is why every edge is where the game thinks it is.',
    slider: 'Lift the top', finish: 'The timber', options: [['cedar', 'Cedar'], ['dark', 'Smoked timber'], ['ochre', 'Pale ash']],
    key: ['Two slabs make a stepped edge.', 'Aprons tie the leg heads.', 'Foot pads keep end grain off the mat.'],
    code: "top = slab(1.8, .05) + slab(1.76, .05);\nlegs(4, h = .36, pad);\naprons(y = .355);",
    build(root, finish) {
      const wood = material('wood', finish), top = layer(root), frame = layer(root);
      slab(top, 1.8, .05, 1.3, wood, 0, .415, 0, .006); slab(top, 1.76, .05, 1.26, wood, 0, .465, 0, .006);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { slab(frame, .11, .36, .11, material('wood', 'dark'), sx * .75, .21, sz * .52); slab(frame, .15, .03, .15, material('wood', 'dark'), sx * .75, .015, sz * .52); }
      for (const sz of [-1, 1]) slab(frame, 1.4, .07, .03, material('wood', 'dark'), 0, .355, sz * .52);
      for (const sx of [-1, 1]) slab(frame, .03, .07, .94, material('wood', 'dark'), sx * .75, .355, 0);
      return { explode(v) { top.position.y = v * .5; } };
    }
  },
  zabuton: {
    jp: '座布団 / ZABUTON', title: 'The softest place in the room.', cam: [1.6, 1.1, 1.8], look: [0, .1, 0],
    description: 'A square stuffed pillow with a tufted button, piping on each edge and a gold tassel at every corner. The cat sleeps on it, so the top is a little crowned and the button leaves a dimple.',
    slider: 'Plump it up', finish: 'The cloth', options: [['rust', 'Crimson'], ['indigo', 'Indigo'], ['moss', 'Moss']],
    key: ['Crowned top, pinched corners.', 'A dimple at the button.', 'Four gold tassels.'],
    code: "box(.9, .16, .9, segs = 10);\ncrown(k = x²z²);\nbutton(dimple);\ntassels(4);",
    build(root, finish) {
      const g = new THREE.BoxGeometry(.9, .16, .9, 10, 2, 10), p = g.attributes.position;
      const cushion = new THREE.Mesh(g, material('cloth', finish)); cushion.position.y = .08; cushion.castShadow = true; root.add(cushion);
      const tass = layer(root); for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(tass, new THREE.SphereGeometry(.026, 8, 6), plain('#d9ad4c'), sx * .44, .08, sz * .44);
      const base = Float32Array.from(p.array);
      const set = (v) => { for (let i = 0; i < p.count; i++) { const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2], k = Math.max(0, 1 - (x / .45) ** 2) * Math.max(0, 1 - (z / .45) ** 2); p.setY(i, y > 0 ? y + .08 * v * k - .025 * Math.exp(-(x * x + z * z) / .012) : y); } g.computeVertexNormals(); p.needsUpdate = true; };
      set(.5);
      return { explode(v) { set(v); tass.position.y = v * .03; } };
    }
  },
  bonsai: {
    jp: '盆栽 / BONSAI', title: 'A pine, shrunk and shaped.', cam: [1.6, 1.1, 2.1], look: [0, .4, 0],
    description: 'A glazed pot, a skin of moss, a trunk that bends twice, three wired limbs, and foliage in four flat clouds. The clouds are lumpy icospheres squashed to pads; the flat underside is what makes them read as pine.',
    slider: 'Lift the foliage', finish: 'The foliage', options: [['green', 'Evergreen'], ['autumn', 'Autumn maple']],
    key: ['Pot: a lathe profile with a foot.', 'Trunk: a tapered tube along a curve.', 'Pads: squashed icospheres, flat below.'],
    code: "pot = lathe(profile);\ntrunk = tube(curve, taper);\nforeach pad: icosphere(2).scale(sx, sy, sz).flatBelow();",
    build(root, finish) {
      const pot = layer(root), wood = layer(root), pads = layer(root), cols = finish === 'autumn' ? ['#a8552a', '#c47a30', '#8c4a26', '#d09040'] : ['#3f6a35', '#4b7a3a', '#365d30', '#56853f'];
      mesh(pot, new THREE.LatheGeometry([[.001, 0], [.15, 0], [.19, .012], [.245, .06], [.25, .128], [.235, .14], [.22, .132], [.205, .112], [.001, .112]].map(([r, y]) => new THREE.Vector2(r, y)), 28), plain('#56707c'));
      mesh(pot, new THREE.CylinderGeometry(.215, .215, .012, 20), plain('#3a2d22'), 0, .116, 0);
      const curve = new THREE.CatmullRomCurve3([[0, .11, 0], [-.03, .22, .01], [.04, .34, -.01], [.01, .48, .02], [.08, .6, 0]].map((a) => new THREE.Vector3(...a)));
      mesh(wood, new THREE.TubeGeometry(curve, 16, .035, 7), plain('#4a3524'));
      [[-.18, .47, 0, .24, .075, .18], [.2, .55, .02, .22, .07, .17], [-.04, .66, -.02, .18, .065, .15], [.14, .75, 0, .14, .06, .12]].forEach(([x, y, z, sx, sy, sz], i) => {
        const m = mesh(pads, new THREE.IcosahedronGeometry(1, 2), plain(cols[i]), x, y, z); m.scale.set(sx, sy, sz);
      });
      return { explode(v) { pads.position.y = v * .4; wood.position.y = v * .12; } };
    }
  },
  knockables: {
    jp: '置物 / OKIMONO', title: 'Three small things, one very good paw.', cam: [1.8, 1.1, 2.2], look: [0, .6, 0],
    description: 'A cup, a bowl and a temari ball on the tabletop at 0.49 m. When the cat brushes one it takes a kick, tumbles, bounces on the mat with 0.3 restitution and settles. Slide to see the first half-second.',
    slider: 'Nudge the cup', finish: 'The glaze', options: [['cream', 'Ivory'], ['indigo', 'Indigo'], ['rust', 'Iron red']],
    key: ['Hollow lathe profiles, not cylinders.', 'Each is its own mesh: the game spins them.', 'Rest on the table at 0.49, fall to the mat at 0.08.'],
    code: "cup.rest = [x, .49 + h/2, z];\nkick = [1.3, 1.6];\ngravity = 18; bounce = .3;",
    build(root, finish) {
      const table = layer(root); slab(table, 1.6, .06, 1.1, material('wood', 'cedar'), 0, .46, 0, .006);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) slab(table, .1, .43, .1, material('wood', 'dark'), sx * .68, .215, sz * .43);
      const cup = vessel(root, 'cup', finish, 1), bowl = vessel(root, 'bowl', 'indigo', 1), ball = mesh(root, new THREE.SphereGeometry(.055, 16, 10), plain('#d04a3a'), .5, .545, .15);
      cup.position.set(-.45, .49, -.2); bowl.position.set(.3, .49, -.3);
      return { explode(v) { const t = Math.min(1, v * 1.4), fall = Math.max(0, v - .7) / .3; cup.position.set(lerp(-.45, .35, t) + fall * .35, lerp(.49, .08, fall * fall), -.2 + t * .5); cup.rotation.z = fall * 3; } };
    }
  }
};

/** CRAFTS-shaped records for the bench (craft.js spreads these in). */
export const SPECIMEN_CRAFTS = Object.fromEntries(Object.entries(SPECIMENS).map(([k, s]) => [k, { jp: s.jp, title: s.title, description: s.description, slider: s.slider, finish: s.finish, options: s.options, key: s.key, code: s.code, specimen: true }]));
