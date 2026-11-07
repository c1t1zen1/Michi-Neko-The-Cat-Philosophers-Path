// "The game today": the valley's ground as countryside.js builds it now, laid
// over this stage for the before/after split. buildGround (one tiling meadow
// texture, tinted by vertex colour), buildPathShoulders (a dirt strip whose
// edges fade by UV alpha) and buildPath (a cobble ribbon), at this stage's
// lane and street. Same textures, same numbers, scaled to the stage.
import * as THREE from 'three';
import { groundTextures, dirtTextures, cobbleTextures, texturedMaterial, worldNoise } from '../../shared/game.js';
import { LAYOUT, laneZ } from './scene.js';

function ribbon(points, width, y, uvStep) {
  const verts = [], uvs = [], idx = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i], q = points[Math.min(points.length - 1, i + 1)], o = points[Math.max(0, i - 1)];
    const tx = q[0] - o[0], tz = q[1] - o[1], l = Math.hypot(tx, tz) || 1, nx = -tz / l, nz = tx / l;
    const wob = Math.sin(i * 0.9) * 0.15;
    verts.push(p[0] - nx * (width / 2 + wob), y, p[1] - nz * (width / 2 + wob), p[0] + nx * (width / 2 - wob), y, p[1] + nz * (width / 2 - wob));
    uvs.push(0, i * uvStep, 1, i * uvStep);
    if (i < points.length - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export class GameToday {
  constructor(field, { lane = laneZ, street = true, laneW = 2.1, shoulderW = 3.4 } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'The game today';
    const { w, d, x0, z0 } = field;
    // buildGround: vertex-colour tint over groundTextures(6), repeat size / 3.2
    const geo = new THREE.PlaneGeometry(w, d, 64, 48);
    geo.rotateX(-Math.PI / 2);
    geo.translate(x0 + w / 2, 0, z0 + d / 2);
    const pos = geo.attributes.position, colors = [];
    const meadow = new THREE.Color(0x5d8442), gold = new THREE.Color(0x7a9448), moss = new THREE.Color(0x3d6030), dark = new THREE.Color(0x2c4a26), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const n1 = worldNoise(x, z, 0.05, 3, 3), n2 = worldNoise(x, z, 0.14, 2, 5), n3 = worldNoise(x, z, 0.028, 3, 7);
      c.copy(meadow).lerp(gold, n1 * 0.7).lerp(moss, n2 * 0.45);
      if (n3 > 0.58) c.lerp(dark, (n3 - 0.58) / 0.42 * 0.7);
      const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b, k = 0.5 / Math.max(0.05, lum);
      colors.push(c.r * k, c.g * k, c.b * k);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const gm = texturedMaterial(groundTextures(6), { roughness: 0.96, normalScale: 0.7, repeat: [w / 3.2, d / 3.2] });
    gm.vertexColors = true;
    gm.color.setHex(0xffffff);
    const ground = new THREE.Mesh(geo, gm);
    ground.receiveShadow = true;
    // the lane: buildPathShoulders' fading dirt strip under buildPath's cobble ribbon
    const pts = [];
    for (let x = x0; x <= x0 + w + 0.01; x += 0.2) pts.push([x, lane(x)]);
    const sm = texturedMaterial(dirtTextures(7), { color: 0xb9a37c, roughness: 1, transparent: true, normalScale: 0.6 });
    sm.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n vShoulderU = uv.x;').replace('void main() {', 'varying float vShoulderU;\nvoid main() {');
      shader.fragmentShader = shader.fragmentShader.replace('void main() {', 'varying float vShoulderU;\nvoid main() {')
        .replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\n diffuseColor.a *= smoothstep(0.0, 0.42, vShoulderU) * smoothstep(1.0, 0.58, vShoulderU) * 0.9;');
    };
    const shoulders = new THREE.Mesh(ribbon(pts, shoulderW, 0.018, 0.8 * 0.2 / 0.6), sm);
    shoulders.renderOrder = -1;
    shoulders.receiveShadow = true;
    const cob = texturedMaterial(cobbleTextures(4), { color: 0xe4dccc, roughness: 0.84, normalScale: 0.9, repeat: [0.6, 0.5] });
    const road = new THREE.Mesh(ribbon(pts, laneW, 0.03, 0.6 * 0.2 / 0.6), cob);
    road.receiveShadow = true;
    this.group.add(ground, shoulders, road);
    if (street) {
      // the street before the machiya, the same cobble ribbon
      const S = LAYOUT.street, spts = [];
      for (let x = S.x0; x <= S.x1; x += 0.2) spts.push([x, (S.z0 + S.z1) / 2]);
      const st = new THREE.Mesh(ribbon(spts, S.z1 - S.z0, 0.03, 0.6 * 0.2 / 0.6), cob);
      st.receiveShadow = true;
      this.group.add(st);
    }
  }
}
