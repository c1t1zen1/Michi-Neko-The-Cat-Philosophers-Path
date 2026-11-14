// The summit fūrin: the garden family's glass wind chime (buildWindChime),
// hung on its own thread under the old shade tree. The summit's per-frame code
// swings the `bell` part, so the chime pivots on its hook (half a metre above
// the glass); the paper strip and clapper flex inside the chime's own update().
// `sail` and `clapper` are empty anchors: the summit binds them, the chime
// already moves its own.
import * as THREE from 'three';
import { buildWindChime } from '../garden/build.js?v=20261113a';
import { castMesh } from '../shrine/util.js?v=20261113a';

const SCALE = 2.4;      // the classic fūrin is a 0.39 m bell; the garden chime's is 0.185 m

export function buildSummitFurin(ctx, layout, p) {
  const { kitMaterials: km } = ctx;
  const chime = buildWindChime(ctx, layout, { glass: p.glass, tanzaku: p.tanzaku });
  const rig = chime.group;
  rig.scale.setScalar(SCALE);
  rig.position.y = 0.5 * SCALE;                      // glass top at the layout point, as classic
  chime.parts.clapper.name = 'cord';
  const group = new THREE.Group();
  group.add(rig);
  const thread = castMesh(new THREE.CylinderGeometry(0.007, 0.007, 0.36, 5).translate(0, 0.18, 0), km.shared('cord'), { cast: false });
  if (ctx.tier !== 'far') rig.add(thread);
  const sail = new THREE.Group(), clapper = new THREE.Group();
  group.add(sail, clapper);
  return {
    group, sockets: {}, live: chime.live,
    parts: { bell: chime.parts.bell, cord: chime.parts.clapper, ...(ctx.tier !== 'far' ? { thread } : {}), sail, clapper },
    update: chime.update, setTier() {}, dispose: chime.dispose
  };
}
