// build.js — the Roof Road's meshes, built from level.pieces.
//
// Every surface uses the game's painted procedural sets (src/textures.js):
// kawara, plaster, timber, namako, shoji, cobbles. Each piece is built in its
// own rail frame — local x along the rail (s − sMid), y up, z toward the
// camera (depth d) — then the static meshes are merged one per material, the
// way Countryside._mergeStatics() does it in the valley.
//
// Returns { root, dynamic: {...}, lights: [Vector3], update(t, night) }.

import * as THREE from 'three';
import { hash1 } from './level.js';
import { paintDowntown, installDowntown } from './downtown.js';
import { makeCutaway } from './cutaway.js';
import { makeMaterials } from './pieces/paint.js';
import { box, cyl, frameGroup, ribbon, mergeByMaterial } from './pieces/common.js';
import { hiraRoof } from './pieces/machiya.js';
import { street } from './pieces/street.js';
import { steps } from './pieces/steps.js';
import { bridge } from './pieces/bridge.js';
import { kido } from './pieces/kido.js';
import { house } from './pieces/house.js';
import { kura } from './pieces/kura.js';
import { corner } from './pieces/corner.js';
import { komayose } from './pieces/komayose.js';
import { inuyarai } from './pieces/inuyarai.js';
import { roji } from './pieces/roji.js';
import { tsuboniwa } from './pieces/tsuboniwa.js';
import { deck } from './pieces/deck.js';
import { balcony } from './pieces/balcony.js';
import { post } from './pieces/post.js';
import { water } from './pieces/water.js';
import { canalQuarter } from './pieces/canalQuarter.js';
import { steppingStone } from './pieces/steppingStone.js';
import { canalLanding } from './pieces/canalLanding.js';
import { canalBridge } from './pieces/canalBridge.js';
import { toro } from './pieces/toro.js';
import { cherry } from './pieces/cherry.js';
import { boat } from './pieces/boat.js';
import { canopy } from './pieces/canopy.js';
import { vent } from './pieces/vent.js';
import { shopfronts } from './pieces/shopfronts.js';
import { marketCrossing } from './pieces/marketCrossing.js';
import { rope } from './pieces/rope.js';
import { cistern } from './pieces/cistern.js';
import { chimney } from './pieces/chimney.js';
import { futonRack } from './pieces/futonRack.js';
import { yatai } from './pieces/yatai.js';
import { rack } from './pieces/rack.js';
import { float } from './pieces/float.js';
import { gate } from './pieces/gate.js';
import { tsuiji } from './pieces/tsuiji.js';
import { makeShoki, makeTreat } from './pieces/pickups.js';
import { buildDistantCity, buildPagoda } from './pieces/skyline.js';

/* ------------------------------------------------------------------ */
/*  Piece builders                                                      */
/* ------------------------------------------------------------------ */

const B = {};
Object.assign(B, { street, steps, bridge, kido, house, kura, corner, komayose, inuyarai, roji, tsuboniwa, deck, balcony, post });
Object.assign(B, { water, canalQuarter, steppingStone, canalLanding, canalBridge, toro, cherry, boat, canopy, vent, shopfronts, marketCrossing, rope, cistern, chimney, futonRack });
Object.assign(B, { yatai, rack, float, gate, tsuiji });

/* ------------------------------------------------------------------ */
/*  Assembly                                                            */
/* ------------------------------------------------------------------ */

const downtown = installDowntown(B, { box, cyl, frameGroup, hiraRoof, ribbon, hash1, mergeParts: mergeByMaterial });

export { makeShoki } from './pieces/pickups.js';

export function buildWorld(level, opts = {}) {
  const M = makeMaterials();
  paintDowntown(M);
  const setView = makeCutaway(M);
  const rail = level.rail;
  const motionScale = opts.reduceMotion ? 0.22 : 1;
  const staticGroup = new THREE.Group();
  const glassGroup = new THREE.Group();
  const root = new THREE.Group();
  const lights = [];
  const dynamic = { boat: null, boats: [], people: [], float: null, shoki: [], treats: [] };
  const ctx = {
    M, rail, dynamic, platforms: level.platforms, alleys: level.alleys,
    add: (o) => staticGroup.add(o),
    addGlass: (m) => { m.userData.glass = true; glassGroup.add(m); },
    addDyn: (o) => root.add(o),
    light: (r, s, y, d) => { const p = r.place(s, d); lights.push(new THREE.Vector3(p.x, y, p.z)); }
  };
  for (const pc of level.pieces) {
    const fn = B[pc.type];
    if (!fn) throw new Error('No Roof Road renderer for ' + pc.type);
    fn(pc, ctx);
    if (pc.type === 'house') downtown.decorateHouse(pc, ctx);
    if (pc.type === 'yatai') downtown.decorateStall(pc, ctx);
  }
  // Glass meshes were added inside frame groups: pull them out with their
  // world transforms so they merge into the transparent bucket.
  staticGroup.updateMatrixWorld(true);
  const glassFromFrames = [];
  staticGroup.traverse((o) => { if (o.isMesh && o.material === M.glass) glassFromFrames.push(o); });
  for (const m of glassFromFrames) {
    m.updateMatrixWorld(true);
    const c = new THREE.Mesh(m.geometry.clone().applyMatrix4(m.matrixWorld), m.material);
    glassGroup.add(c);
    m.parent.remove(m);
  }
  const fixedBatches = mergeByMaterial(staticGroup), glassBatches = mergeByMaterial(glassGroup, false);
  root.add(fixedBatches, glassBatches);

  // Only world-space scenery belongs to this distance culler. Boat and worker
  // batches are baked in their own local frames and move with their parents.
  const batches = [];
  for(const group of [fixedBatches,glassBatches]) group.traverse(o => { if (o.userData.spatialBatch) batches.push(o); });

  // Ground under everything, the distant roofscape and a pagoda on each side.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), M.ground);
  const groundUV=ground.geometry.attributes.uv, groundPosition=ground.geometry.attributes.position;
  for(let i=0;i<groundUV.count;i++)groundUV.setXY(i,groundPosition.getX(i)*.25,groundPosition.getY(i)*.25);
  M.ground.map=M.gravel.map;
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.7;
  ground.receiveShadow = true;
  root.add(ground);
  root.add(buildDistantCity(level, M));
  root.add(buildPagoda(M, 150, -78, 1.35));     // east, behind the float streets
  root.add(buildPagoda(M, -40, 150, 1.6));      // south, over the market roofs
  root.add(buildPagoda(M, -170, -30, 1.1));     // west

  // Shōki and treats stay live so they can be greeted.
  for (const k of level.pickups) {
    const p = rail.place(k.s, k.d);
    const t = rail.tangentAt(k.s);
    const obj = k.kind === 'shoki' ? makeShoki(M) : makeTreat(M);
    obj.position.set(p.x, k.y, p.z);
    obj.rotation.y = Math.atan2(-t.z, t.x) + (k.face || 0);   // face the camera, then turn away
    obj.scale.setScalar(k.kind === 'shoki' ? 1.6 : 1.4);
    obj.userData.pickup = k;
    root.add(obj);
    (k.kind === 'shoki' ? dynamic.shoki : dynamic.treats).push(obj);
  }

  return {
    root, dynamic, lights, M, setView,
    /** Advance moving pieces; night ∈ [0,1] kindles lanterns and windows. */
    update(t, night, platOffset, platforms, playerS = 0) {
      downtown.updatePeople(dynamic.people, t, playerS, opts.lowPower, opts.reduceMotion);
      const player = rail.pointAt(playerS);
      for (const batch of batches) {
        const b = batch.geometry.boundingSphere;
        const range = (opts.lowPower ? 48 : 82) + b.radius;
        batch.visible = (b.center.x - player.x) ** 2 + (b.center.z - player.z) ** 2 < range * range;
      }
      for (const boat of dynamic.boats) {
        const p = platforms[boat.plat];
        boat.group.visible=Math.abs((p.s0+p.s1)/2+platOffset(p,t)-playerS)<(opts.lowPower?42:70);
        const off = platOffset(p, t);
        const s = (p.s0 + p.s1) / 2 + off;
        const pos = rail.place(s, boat.d);
        const tg = rail.tangentAt(s);
        const dt = boat.lastT == null ? 1 / 60 : Math.max(1 / 240, t - boat.lastT);
        const velocity = boat.lastS == null ? 0 : (s - boat.lastS) / dt;
        if (Math.abs(velocity) > 0.035) boat.dir = Math.sign(velocity);
        const pace = Math.min(1, Math.abs(velocity) / 3.2);
        boat.group.position.set(pos.x, 0.005 + Math.sin(t * 1.35) * (0.012 + pace * 0.012), pos.z);
        boat.group.rotation.set(Math.sin(t * 0.9) * 0.012 * pace, Math.atan2(-tg.z, tg.x), Math.sin(t * 1.17) * 0.008 * pace);
        boat.wake.scale.x = boat.dir;
        boat.wake.visible = pace > 0.035;
        M.wake.opacity = 0.08 + pace * 0.34;
        boat.boatman.rotation.y = boat.dir < 0 ? Math.PI : 0;
        boat.pole.rotation.z = -0.48 + boat.dir * 0.14 + Math.sin(t * 1.5) * 0.12 * pace;
        boat.boatman.rotation.z = Math.sin(t * 1.5 + 0.7) * 0.035 * pace;
        boat.lastS = s;
        boat.lastT = t;
      }
      if (dynamic.float) {
        const hoko = dynamic.float;
        hoko.group.visible = Math.abs(playerS - level.mouths[6].s0) < 65;
        for (const tassel of hoko.tassels) {
          const u = t * motionScale + tassel.userData.phase;
          tassel.rotation.z = Math.sin(u * 1.35) * 0.055 * motionScale;
          tassel.rotation.x = Math.cos(u * 0.93) * 0.035 * motionScale;
        }
        for (const person of hoko.musicians) {
          const u = t * motionScale + person.userData.phase;
          person.rotation.z = Math.sin(u * 1.7) * 0.018 * motionScale;
          person.position.y = person.userData.baseY + Math.sin(u * 1.7) * 0.008 * motionScale;
        }
      }
      for (const water of [M.water, M.kamoWater]) {
        water.uniforms.uTime.value = t;
        water.uniforms.uNight.value = night;
      }
      for (const mat of [...M.cloth, ...Object.values(M.noren), ...M.brocade]) {
        if (mat.userData.windShader) mat.userData.windShader.uniforms.uRoofTime.value = t;
      }
      M.lanternRed.emissiveIntensity = 0.15 + night * 1.6;
      M.lanternWhite.emissiveIntensity = 0.15 + night * 1.5;
      M.shoji.emissiveIntensity = night * 0.9;
      M.koshi.emissiveIntensity = night * 0.5;
      for (const mat of [M.blossom, M.blossomPale, M.blossomRose]) mat.emissiveIntensity = night * 0.25;
      for (const s of dynamic.shoki) if (s.visible) s.children[0].rotation.y = Math.sin(t * 0.7 + s.position.x) * 0.06;
    }
  };
}
