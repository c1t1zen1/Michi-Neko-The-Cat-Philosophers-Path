// "Build it up": the machiya construction timeline, one step per coat and
// member, with the real numbers from research.md. The stepper teaches the
// order a carpenter follows; the hero stage above shows the finished house.
export const STEPS = [
  {
    key: 'soseki', title: 'Soseki 礎石 — the stones',
    body: '<p>One natural stone under each post (<i>ishibadate</i>), the post simply standing on it, not fastened. Engawa posts sit on half-buried stones, and the post foot is shaped to fit the stone. The ground underneath slopes away and is often paved, with a drain beyond.</p>',
    code: 'box(0.24, h - 0.1, 0.24, stoneMat, px, (h-0.1)/2, d/2 - 0.2);   // each plinth'
  },
  {
    key: 'hashira', title: 'Hashira 柱 — the posts',
    body: '<p>Post-and-beam framing (<i>jiku-gumi</i>). The standard column section is 4 <i>sun</i> (121\u2009mm); the <i>daikoku-bashira</i> is the main post. Joints are tenon and mortise, no metal.</p>',
    code: 'for (sx of [-1,1]) for (sz of [-1,1])\n  box(0.30, gh, 0.30, timber, sx*(hw-0.15), gh/2, sz*(hd-0.15));'
  },
  {
    key: 'nuki', title: 'Hari & nuki 梁・貫 — beams & ties',
    body: '<p>Horizontal <i>nuki</i> pass <i>through</i> the posts (about 105\u2009mm deep) and carry the wall lath. Beams tie the frame; the whole thing absorbs an earthquake by its tenacity (<i>nebari</i>) rather than resisting it rigidly.</p>',
    code: 'box(w + 0.12, 0.1, d + 0.12, timber, 0, gh - 0.05, 0);   // eave beam'
  },
  {
    key: 'komai', title: 'Komai 木舞 — the lath',
    body: '<p>Split bamboo lath lashed with rope over the <i>nuki</i>. This is the skeleton the clay will be pushed through. Cloth, paper or straw (<i>nuki-buse</i>) covers the nuki, because clay will not stick to wood.</p>',
    code: '// the lath is implied by the plaster texture\u2019s relief, not separate geometry'
  },
  {
    key: 'arakabe', title: 'Arakabe 荒壁 — rough clay',
    body: '<p>Rough Fukakusa clay with 10\u2009cm fermented straw (<i>susa</i>) is pushed through the lath, from both sides. Thin coats, many passes.</p>',
    code: 'const n = fbm(u, v, 6, 5, seed);   // coarse clay relief\nconst fine = fbm(u, v, 48, 2, seed + 5);'
  },
  {
    key: 'nakanuri', title: 'Nakanuri 中塗り — the middle coat',
    body: '<p>The middle coat, with finer straw, levels the wall (<i>mura-naoshi</i>). Then comes the top coat: white <i>shikkui</i>, or a <i>sabikabe</i> rust, <i>benikabe</i> soft red, or <i>jurakukabe</i> grey finish.</p>',
    code: 'const shade = 0.9 + n * 0.16 + (fine - 0.5) * 0.08;   // plaster mottling'
  },
  {
    key: 'shikkui', title: 'Shikkui 漆喰 — the top coat',
    body: '<p>The finished wall: soft mottling, hairline cracks, and a grime band along the sill where the rain splashes. A 256\u2009px canvas painted at load time becomes the albedo and the normal map.</p>',
    code: 'const cracks = bezierStrokes(size);   // 3 hairline cracks\nmix3(base, dark, max(0., 0.22 - v) * 2.2, out);   // sill grime'
  },
  {
    key: 'koushi', title: 'K\u014dshi 格子 — the lattice',
    body: '<p>You can see out but not in. The pattern names the trade: <i>itoya</i> thread (slat tops cut back to judge colours), <i>komeya</i> rice and <i>sakaya</i> sake (thick, cask-proof), <i>shimotaya</i> residence (thinner). <i>Bengara</i> iron-oxide red preserves the pine.</p>',
    code: 'const count = round(innerW / (slat + gap));   // pattern decides slat & gap\nnew THREE.InstancedMesh(slatGeo, mat, count);'
  },
  {
    key: 'kawara', title: 'Kawara 瓦 — the tiles',
    body: '<p>Clay fired above 1100\u2009\u00b0C. J-type <i>sangawara</i> lay about 235\u2009mm to the course on a 4.5/10 pitch (the 4-<i>sun</i> minimum). Uneven colour is natural, and moss grows on shaded, damp tiles.</p>',
    code: 'const rows = round(slopeLen / 0.235);   // 235 mm courses\nconst dome = sqrt(max(0., 1. - (cx*2.15)**2));   // the pan profile'
  },
  {
    key: 'ridge', title: 'Ridge, onigawara & Sh\u014dki 棟・鬼瓦・鍾馗',
    body: '<p>The <i>munagawara</i> ridge barrel, <i>onigawara</i> demon tiles at the gable ends, and a small clay <i>Sh\u014dki</i> (demon-queller) on the lower eave. Neighbours add one when you do, placed so their gazes never meet.</p>',
    code: 'const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,w+0.2,10), ridgeMat);'
  },
  {
    key: 'noren', title: 'Noren 暖簾 — the curtain',
    body: '<p>Three <i>shaku</i> by the cloth rule (113\u2009cm), a <i>han-noren</i> about 56\u2009cm. Kansai noren hide the hanging loops in one sewn sleeve \u2014 Kyoto\u2019s taste for hiding. It is both sign and threshold.</p>',
    code: 'noren(parent, w * 0.26, 0.75, indigo, 0, gh - 0.45, hd + 0.06);   // 0.75 m \u2248 2.5 shaku'
  },
  {
    key: 'weather', title: 'Keinen 経年 — the years',
    body: '<p>What weathers, and how: rain splash at the wall base, <i>bengara</i> fading, moss on the north tiles, <i>kakishibu</i> darkening with time. One slider drives all of it.</p>',
    code: 'mats.kawara.color.lerp(MOSS, t*0.55);\nmats.bengara.color.lerp(FADED, t*0.5);'
  }
];