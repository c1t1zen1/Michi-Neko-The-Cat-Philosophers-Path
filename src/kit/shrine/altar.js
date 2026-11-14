// The Mist Altar and the five offering bells.
//
// mist-altar: the stone plinth, bell and spirit flame each keep their OWN
// transparent material, because Countryside.update() fades them with the mist
// (`_altarFadeMats` = plinth.material, bell.material, flame.material, in that
// order). Those three plus the always-visible foundation ring are the only
// live (unmerged) meshes: four draws, one altar.
//
// offering-bells: five collectibles. Each is ONE vertex-coloured mesh on a
// family-shared bronze material with the classic warm emissive, so the quest
// bells still glint at dusk (classic: 3 meshes each, 15 draws -> 5).
import * as THREE from 'three';
import { Bag } from '../craft.js?v=20261113a';
import { defineAsset } from '../contract.js?v=20261113a';
import { haloTexture } from '../lanterns/light.js?v=20261113a';
import { castMesh, byTier, sharedPrivate, tint } from './util.js?v=20261113a';

/* ------------------------------------------------------------- mist altar --- */

function buildMistAltar(ctx, layout, p) {
  const { THREE: T, tier, rng, kitMaterials: km } = ctx;
  const seg = byTier(tier, 20, 12, 8);
  const stoneMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.05, vertexColors: true, transparent: true, opacity: 0 });
  const bellMat = new T.MeshStandardMaterial({ color: 0xc9a86a, roughness: 0.35, metalness: 0.75, transparent: true, opacity: 0, emissive: 0x6a5426, emissiveIntensity: 0.4 });
  const flameMat = new T.SpriteMaterial({ map: haloTexture(km), color: 0xbfe8ff, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending });
  const ringMat = new T.MeshBasicMaterial({ color: 0x9aa8b4, transparent: true, opacity: 0.35 });
  const group = new T.Group(), parts = {};

  // weathered plinth (radius .82 -> .7, 0.5 tall) with a stepped foot, and the top slab (1.1 square, to 0.63)
  const st = new Bag();
  const col = () => tint(0x8a93a0, (rng() - 0.5) * 0.06);
  const prof = [[0.001, 0], [0.86, 0], [0.86, 0.06], [0.82, 0.08], [0.82, 0.22], [0.76, 0.26], [0.72, 0.42], [0.7, 0.47], [0.7, 0.49], [0.001, 0.49]];
  st.add(new T.LatheGeometry(prof.map(([x, y]) => new T.Vector2(x, y)), seg), { color: 0x8a93a0 });
  st.box(1.1, 0.14, 1.1, { y: 0.56, color: tint(0x8a93a0, 0.03) });
  if (tier !== 'far') {
    // moss at the foot, a carved rim on the slab, four little corner stones
    for (let i = 0; i < (tier === 'hero' ? 9 : 5); i++) {
      const a = rng() * Math.PI * 2, r = 0.78 + rng() * 0.05;
      st.sphere(0.07 + rng() * 0.05, { x: Math.cos(a) * r, y: 0.05, z: Math.sin(a) * r, sy: 0.55, color: tint(0x5b7a3c, (rng() - 0.5) * 0.08) });
    }
    st.box(1.14, 0.03, 1.14, { y: 0.495, color: 0x6f7782 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) st.box(0.1, 0.07, 0.1, { x: sx * 0.5, y: 0.665, z: sz * 0.5, color: col() });
  }
  parts.plinth = castMesh(st.geometry(), stoneMat);
  parts.plinth.receiveShadow = false;
  group.add(parts.plinth);

  // the little offering bell on the slab, with its cord ring (sphere r .16 at y .78, tag to .96)
  const bb = new Bag();
  const lathe = new T.LatheGeometry([[0.001, -0.16], [0.06, -0.15], [0.13, -0.09], [0.16, 0], [0.13, 0.09], [0.06, 0.15], [0.001, 0.16]].map(([x, y]) => new T.Vector2(x, y)), seg);
  bb.add(lathe, { y: 0.78, color: 0xc9a86a });
  bb.box(0.03, 0.22, 0.03, { y: 0.96, color: 0xc9a86a });
  if (tier !== 'far') bb.add(new T.TorusGeometry(0.035, 0.012, 6, 12).rotateX(Math.PI / 2), { y: 1.075, color: 0xc9a86a });
  // far: the bell shares the stone material (three fade handles, two materials); never built that far in practice
  const bell = new T.Mesh(bb.geometry(), tier === 'far' ? stoneMat : bellMat);
  bell.castShadow = true;
  parts.bell = bell; group.add(bell);

  // the spirit flame (sprite) breathing above the bell
  const flame = new T.Sprite(flameMat);
  flame.scale.set(0.8, 1.1, 1);
  flame.position.y = 1.25;
  parts.flame = flame; group.add(flame);

  // the faint foundation ring: always there, a quiet "something is here"
  const ring = tier === 'far' ? null : new T.Mesh(new T.TorusGeometry(1.15, 0.03, 6, byTier(tier, 48, 32, 20)), ringMat);
  if (ring) { ring.rotation.x = Math.PI / 2; ring.position.y = 0.03; parts.ring = ring; group.add(ring); }

  return {
    group, parts, sockets: {}, live: [parts.plinth, bell, flame, ring].filter(Boolean),
    dispose() { stoneMat.dispose(); bellMat.dispose(); flameMat.dispose(); ringMat.dispose(); }
  };
}

/* ---------------------------------------------------------- offering bell --- */

// classic dome r .11, ring on top, a short clapper below: about 0.2 m tall, hanging at the layout y
const BELL = [[0.001, 0.13], [0.03, 0.125], [0.07, 0.095], [0.092, 0.04], [0.095, -0.01], [0.082, -0.045], [0.04, -0.06], [0.001, -0.055]];

function buildOfferingBell(ctx, layout, p) {
  const { THREE: T, tier } = ctx;
  const mat = sharedPrivate(ctx.kitMaterials, 'offering-bell', () => new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.8, roughness: 0.35, emissive: 0x6a5426, emissiveIntensity: 0.5 }));
  const seg = byTier(tier, 20, 12, 8);
  const bag = new Bag(), gold = tint(0xc9a86a, p.warmth * 0.1 - 0.03);
  bag.add(new T.LatheGeometry([...BELL].reverse().map(([x, y]) => new T.Vector2(x, y)), seg), { color: gold });
  if (tier !== 'far') {
    bag.add(new T.TorusGeometry(0.036, 0.011, 6, 12), { y: 0.165, color: tint(gold, -0.04) });          // the loop it hangs by
    bag.add(new T.TorusGeometry(0.093, 0.006, 5, seg).rotateX(Math.PI / 2), { y: 0.0, color: tint(gold, -0.12) }); // the belt
    bag.box(0.12, 0.008, 0.02, { y: -0.035, z: 0.075, color: 0x1a1208 });                                  // the slit
    bag.sphere(0.014, { y: -0.075, color: tint(gold, 0.04) });                                              // the pea
    if (tier === 'hero') bag.cyl(0.006, 0.12, { y: -0.14, color: 0xb8322a });                               // a tied red cord
  }
  const mesh = castMesh(bag.geometry(), mat);
  const group = new T.Group();
  group.add(mesh);
  return { group, parts: { bell: mesh }, sockets: {}, live: [] };
}

export const assets = [
  defineAsset({
    id: 'mist-altar', family: 'shrine', lab: 'shrine/game-altar', label: 'Mist altar', legacyName: 'Mist Altar',
    params: {}, tiers: ['hero', 'mid', 'far'], floating: ['flame'], sample: { x: 0, y: 0, z: 0, index: 0, name: 'Mist Altar' }, build: buildMistAltar
  }),
  defineAsset({
    id: 'offering-bells', family: 'shrine', lab: 'shrine/bell-new', label: 'Offering bell', legacyName: 'Offering Bell',
    params: { warmth: { type: 'number', default: 0.5, min: 0, max: 1, step: 0.05, label: 'Bronze warmth' } },
    tiers: ['hero', 'mid', 'far'], floating: ['bell'], sample: { x: 0, y: 0.45, z: 0, ry: 0, index: 0, id: 100, name: 'Offering Bell 1' }, build: buildOfferingBell
  })
];
