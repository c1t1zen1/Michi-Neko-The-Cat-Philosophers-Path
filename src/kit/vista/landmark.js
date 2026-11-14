// Higashiyama's five-storey pagoda over the roofs (summit-pagoda).
// Built by the pagoda family's measured builder with the Yasaka-no-to preset
// (src/kit/pagoda, read-only), so the proportions, the swept roofs and the
// sorin come from the survey; only the height, the paint and the way the
// summit lights it are this asset's.
//
// Lighting: the summit recolours the classic pagoda's three materials from the
// sky palette every frame (pagodaWallMat, pagodaTimberMat, pagodaRoofMat). A
// kit tower is one vertex-coloured mesh, so the three anchors here are small
// proxies with the classic shape ({ color, emissive, emissiveIntensity,
// roughness }): update() reads them and sets the one real material, so the
// tower still follows dawn, noon, dusk, night and rain from the same palette.
// The evening lanterns have their own glow, lit by env.lanternOn.
import * as THREE from 'three';
import { buildPagoda } from '../pagoda/build.js?v=20261113a';
import { glowSprite, disposeAll } from './ground.js?v=20261113a';

const proxy = (hex) => ({ color: new THREE.Color(hex), emissive: new THREE.Color(0), emissiveIntensity: 0, roughness: 0.9 });

export function buildSummitPagoda(ctx, layout, p) {
  const { tier } = ctx;
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.02, fog: false });
  const { group: tower, dims } = buildPagoda({ preset: 'yasaka', H: p.height, storeys: 5, paint: p.paint, age: p.age }, { detail: tier, material });
  tower.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = false; });
  const group = new THREE.Group();
  group.add(tower);
  const parts = { pagoda: tower };

  // evening lanterns on each storey's front corners (the facade the city sees)
  let lanterns = null, lanternGeo = null, glow = null, lanternMat = null;
  if (p.lanterns) {
    const pos = [];
    for (const s of dims.S) {
      const y = s.y0 + s.h * 0.62, x = s.w * 0.36;
      pos.push(-x, y, -s.w * 0.5, x, y, -s.w * 0.5);
    }
    lanternGeo = new THREE.BufferGeometry();
    lanternGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    glow = glowSprite('255,205,112', 64);
    lanternMat = new THREE.PointsMaterial({
      map: glow, color: 0xffc56f, size: Math.max(0.3, p.height * 0.03), transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false
    });
    lanterns = new THREE.Points(lanternGeo, lanternMat);
    lanterns.renderOrder = 3;
    group.add(lanterns);
    parts.lanterns = lanterns;
  }

  const wall = proxy(0xc7b78e), timber = proxy(0x4b3428), roof = proxy(0x344853);
  let primed = false;
  const lum = (c) => (c.r + c.g + c.b) / 3;
  function follow() {
    // the classic wall colour at noon is a warm tan of luminance ~0.7; the
    // factor is what the palette adds on top of the painted vertex colours
    const k = Math.min(1.25, Math.max(0.3, lum(wall.color) / 0.62));
    const tint = new THREE.Color(wall.color).multiplyScalar(1 / Math.max(0.001, lum(wall.color))).lerp(new THREE.Color(1, 1, 1), 0.6);
    material.color.copy(tint).multiplyScalar(k);
    material.emissive.copy(wall.emissive);
    material.emissiveIntensity = wall.emissiveIntensity * 2.2 + roof.emissiveIntensity;
    material.roughness = Math.min(0.9, Math.max(0.5, 0.88 - (0.84 - roof.roughness) * 1));
  }
  return {
    group, parts, sockets: {}, live: lanterns ? [lanterns] : [], dims,
    footprint: {
      colliders: layout.footprint?.colliders || [], platforms: layout.footprint?.platforms || [], exclusions: [],
      anchors: { pagodaWallMat: wall, pagodaTimberMat: timber, pagodaRoofMat: roof }
    },
    update(dt, t, env) {
      // before the summit's first palette pass the proxies hold their defaults: start dim at night
      if (!primed) { primed = true; if (env && env.lanternOn) wall.color.setRGB(0.3, 0.28, 0.3); }
      follow();
      if (lanternMat) {
        const target = env && env.lanternOn ? 0.72 : 0;
        lanternMat.opacity += (target - lanternMat.opacity) * Math.min(1, dt * 0.9);
        lanterns.visible = lanternMat.opacity > 0.012;
      }
    },
    dispose() { disposeAll([material, lanternGeo, lanternMat, glow]); tower.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); }
  };
}
