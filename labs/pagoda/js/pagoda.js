// Distant pagoda (gojū-no-tō) builders for the lab.
// Multiple approaches: original game builder, silhouette LOD, correct sōrin,
// bracket cluster approximations, and Ghibli-style painterly variants.

import * as THREE from 'three';

const woodDark = new THREE.MeshStandardMaterial({ color: 0x2a1e18, roughness: 0.75 });

export function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function makeMaterials() {
  const wood = new THREE.MeshStandardMaterial({ color: 0x70442a, roughness: 0.68, metalness: 0.06 });
  const woodLight = new THREE.MeshStandardMaterial({ color: 0x8e6340, roughness: 0.65, metalness: 0.04 });
  const plaster = new THREE.MeshStandardMaterial({ color: 0xefe7d6, roughness: 0.8, metalness: 0.02 });
  const vermilion = new THREE.MeshStandardMaterial({ color: 0xc83e2b, roughness: 0.55, metalness: 0.1 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0xb5893d, roughness: 0.35, metalness: 0.7 });
  const bronzeAged = new THREE.MeshStandardMaterial({ color: 0x8a9e6f, roughness: 0.45, metalness: 0.6 });
  const roofDark = new THREE.MeshStandardMaterial({ color: 0x2c353b, roughness: 0.58, metalness: 0.15 });
  const roofGray = new THREE.MeshStandardMaterial({ color: 0x4a555e, roughness: 0.6, metalness: 0.1 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x7d8487, roughness: 0.85, metalness: 0.03 });
  const stoneMoss = new THREE.MeshStandardMaterial({ color: 0x6f7678, roughness: 0.88, metalness: 0.02 });
  return { wood, woodLight, plaster, vermilion, bronze, bronzeAged, roofDark, roofGray, stone, stoneMoss };
}

// Builder 1: Original game pagoda (src/countryside.js faithful reproduction)
export function buildOriginalPagoda(M, scale = 1) {
  const pagoda = new THREE.Group();
  pagoda.name = 'Original Game Pagoda';

  const roofTileDark = new THREE.MeshStandardMaterial({
    color: 0x202a2d, roughness: 0.62, metalness: 0.14, flatShading: true
  });
  const roofEdgeMat = new THREE.MeshStandardMaterial({ color: 0x151b1c, roughness: 0.58 });
  const warmWallMat = new THREE.MeshStandardMaterial({ color: 0x5a2e22, roughness: 0.9 });
  const finialMat = new THREE.MeshStandardMaterial({ color: 0x5d5140, metalness: 0.72, roughness: 0.3 });

  pagoda.add(box(5.6 * scale, 0.6 * scale, 5.6 * scale, M.stone, 0, 0.3 * scale, 0));
  pagoda.add(box(4.9 * scale, 0.32 * scale, 4.9 * scale, M.stoneMoss, 0, 0.76 * scale, 0));

  const tierWidths = [4.55, 4.05, 3.58, 3.12, 2.68];
  const tierHeights = [2.2, 2.05, 1.9, 1.78, 1.64];
  let baseY = 0.92;

  for (let tier = 0; tier < 5; tier++) {
    const width = tierWidths[tier] * scale;
    const storyH = tierHeights[tier] * scale;
    const isGroundTier = tier === 0;
    const bodyW = width * (isGroundTier ? 0.68 : 0.62);
    const bodyD = width * (isGroundTier ? 0.68 : 0.62);
    const bodyY = baseY + storyH / 2;

    pagoda.add(box(bodyW, storyH, bodyD, warmWallMat, 0, bodyY, 0));
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        pagoda.add(box(
          0.18 * scale, storyH + 0.22 * scale, 0.18 * scale, M.vermilion,
          sx * (bodyW / 2 - 0.06 * scale), bodyY, sz * (bodyD / 2 - 0.06 * scale)
        ));
      }
    }
    pagoda.add(box(bodyW + 0.24 * scale, 0.16 * scale, bodyD + 0.24 * scale, woodDark, 0, baseY + 0.18 * scale, 0));
    pagoda.add(box(bodyW + 0.34 * scale, 0.16 * scale, bodyD + 0.34 * scale, M.vermilion, 0, baseY + storyH - 0.14 * scale, 0));

    const roofSpan = width + 0.72 * scale;
    const roofH = (0.72 - tier * 0.045) * scale;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(roofSpan / Math.SQRT2, roofH, 4), roofTileDark);
    roof.position.y = baseY + storyH + roofH / 2 - 0.05 * scale;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1, 1, 0.9);
    pagoda.add(roof);

    const eaveY = baseY + storyH + 0.04 * scale;
    for (const s of [-1, 1]) {
      pagoda.add(box(roofSpan, 0.1 * scale, 0.14 * scale, roofEdgeMat, 0, eaveY, s * roofSpan * 0.36));
      pagoda.add(box(0.14 * scale, 0.1 * scale, roofSpan * 0.72, roofEdgeMat, s * roofSpan * 0.5, eaveY, 0));
    }
    baseY += storyH + roofH * 0.62;
  }

  const finialBaseY = baseY - 0.1 * scale;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.075 * scale, 0.075 * scale, 2.6 * scale, 8), finialMat);
  shaft.position.y = finialBaseY + 1.3 * scale;
  pagoda.add(shaft);
  for (let i = 0; i < 8; i++) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry((0.28 - i * 0.014) * scale, (0.28 - i * 0.014) * scale, 0.065 * scale, 12), finialMat);
    disc.position.y = finialBaseY + 0.42 * scale + i * 0.22 * scale;
    pagoda.add(disc);
  }
  return pagoda;
}

// Builder 2: Correct sōrin (finial) per Rachel Stull's research
export function buildCorrectSorin(M, scale = 1) {
  const g = new THREE.Group();
  g.name = 'Correct Sōrin';
  let y = 0;

  // Roban (base ring)
  g.add(box(0.8 * scale, 0.12 * scale, 0.8 * scale, M.bronze, 0, y, 0));
  y += 0.12 * scale;
  // Fukubachi (inverted bowl)
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.4 * scale, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.bronze);
  bowl.rotation.x = Math.PI;
  bowl.position.y = y;
  g.add(bowl);
  y += 0.15 * scale;
  // Ukebana (lotus petals, 8)
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const petal = new THREE.Mesh(new THREE.ConeGeometry(0.06 * scale, 0.18 * scale, 4), M.bronze);
    petal.position.set(Math.sin(angle) * 0.3 * scale, y + 0.09 * scale, Math.cos(angle) * 0.3 * scale);
    petal.rotation.z = Math.cos(angle) * 0.6;
    petal.rotation.x = -Math.sin(angle) * 0.6;
    g.add(petal);
  }
  y += 0.18 * scale;
  // Kurin (9 rings)
  for (let i = 0; i < 9; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry((0.22 - i * 0.018) * scale, 0.02 * scale, 8, 16), M.bronze);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y + i * 0.15 * scale;
    g.add(ring);
  }
  y += 9 * 0.15 * scale + 0.05 * scale;
  // Fūtaku (wind bells)
  for (const off of [-0.05, 0.05]) {
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, 0.06 * scale, 12), M.bronze);
    bell.position.set(off * scale, y, 0);
    g.add(bell);
  }
  y += 0.1 * scale;
  // Suien (water flame)
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.06 * scale, 0.25 * scale, 8), M.bronze);
  flame.position.y = y + 0.12 * scale;
  g.add(flame);
  y += 0.25 * scale;
  // Ryūsha (dragon wheel)
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.08 * scale, 0.015 * scale, 6, 16), M.bronze);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.y = y;
  g.add(wheel);
  y += 0.04 * scale;
  // Hōju (jewel)
  const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.05 * scale, 10, 8), M.bronze);
  jewel.position.y = y;
  g.add(jewel);
  return g;
}

// Builder 3: Kumimono bracket cluster (simplified silhouette)
export function buildKumimonoCluster(M, scale = 1) {
  const g = new THREE.Group();
  g.name = 'Kumimono Bracket Cluster';
  g.add(box(0.4 * scale, 0.08 * scale, 0.4 * scale, M.wood, 0, 0, 0));
  g.add(box(0.5 * scale, 0.06 * scale, 0.06 * scale, M.wood, 0, 0.04 * scale, 0));
  g.add(box(0.35 * scale, 0.07 * scale, 0.35 * scale, M.wood, 0, 0.08 * scale, 0));
  g.add(box(0.6 * scale, 0.05 * scale, 0.05 * scale, M.wood, 0, 0.12 * scale, 0));
  g.add(box(0.3 * scale, 0.06 * scale, 0.3 * scale, M.wood, 0, 0.15 * scale, 0));
  return g;
}

// Builder 4: Curved eave roof (spline-based)
export function buildCurvedEaveRoof(M, width, height, curve = 0.15, scale = 1) {
  const g = new THREE.Group();
  g.name = 'Curved Eave Roof';
  const points = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (t - 0.5) * width;
    const curveFactor = Math.pow(Math.abs(t - 0.5) * 2, 2);
    const y = curveFactor * curve * height;
    points.push(new THREE.Vector3(x * scale, y * scale, 0));
  }
  const spline = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  const segs = 16;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = spline.getPoint(t);
    for (let j = 0; j <= 1; j++) {
      const z = (j - 0.5) * width * 0.8 * scale;
      positions.push(p.x, p.y, z);
      uvs.push(t, j);
    }
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 2, b = a + 1, c = a + 3, d = a + 2;
    indices.push(a, b, c);
    indices.push(b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const roof = new THREE.Mesh(geo, M.roofDark);
  roof.castShadow = true;
  g.add(roof);
  const roofBack = roof.clone();
  roofBack.rotation.x = Math.PI;
  roofBack.position.y = -0.05 * scale;
  g.add(roofBack);
  return g;
}

// Builder 5: Painterly Ghibli-style pagoda (flat colors)
export function buildPainterlyPagoda(M, scale = 1) {
  const pagoda = new THREE.Group();
  pagoda.name = 'Painterly Pagoda';
  const paintWood = new THREE.MeshBasicMaterial({ color: 0x8B5E3C });
  const paintWall = new THREE.MeshBasicMaterial({ color: 0xF5ECD7 });
  const paintRoof = new THREE.MeshBasicMaterial({ color: 0x3C4A52 });
  const paintEave = new THREE.MeshBasicMaterial({ color: 0x1E2A30 });
  const paintFinial = new THREE.MeshBasicMaterial({ color: 0xC4A35A });
  const paintStone = new THREE.MeshBasicMaterial({ color: 0x8A9195 });
  pagoda.add(box(4 * scale, 0.5 * scale, 4 * scale, paintStone, 0, 0.25 * scale, 0));
  const tierW = [3.5, 3.1, 2.7, 2.3, 1.9];
  const tierH = [1.4, 1.2, 1.0, 0.9, 0.8];
  let y = 0.5 * scale;
  for (let i = 0; i < 5; i++) {
    const w = tierW[i] * scale;
    const h = tierH[i] * scale;
    pagoda.add(box(w * 0.55, h, w * 0.55, paintWall, 0, y + h / 2, 0));
    pagoda.add(box(w + 0.6 * scale, 0.08 * scale, w + 0.6 * scale, paintEave, 0, y + h, 0));
    pagoda.add(box(w + 0.6 * scale, 0.3 * scale, 0.08 * scale, paintEave, 0, y + h + 0.1 * scale, w * 0.4 + 0.2 * scale));
    pagoda.add(box(w + 0.6 * scale, 0.3 * scale, 0.08 * scale, paintEave, 0, y + h + 0.1 * scale, -(w * 0.4 + 0.2 * scale)));
    pagoda.add(box(0.08 * scale, 0.3 * scale, w + 0.6 * scale, paintEave, w * 0.4 + 0.2 * scale, y + h + 0.1 * scale, 0));
    pagoda.add(box(0.08 * scale, 0.3 * scale, w + 0.6 * scale, paintEave, -(w * 0.4 + 0.2 * scale), y + h + 0.1 * scale, 0));
    y += h + 0.25 * scale;
  }
  pagoda.add(box(0.12 * scale, 1.8 * scale, 0.12 * scale, paintFinial, 0, y + 0.9 * scale, 0));
  for (let i = 0; i < 7; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry((0.25 - i * 0.025) * scale, 0.02 * scale, 6, 12), paintFinial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y + 0.3 * scale + i * 0.16 * scale;
    pagoda.add(ring);
  }
  return pagoda;
}

// Builder 6: Wireframe silhouette (distance)
export function buildWireframePagoda(M, scale = 1) {
  const pagoda = new THREE.Group();
  pagoda.name = 'Wireframe Pagoda';
  const wireMat = new THREE.LineBasicMaterial({ color: 0x2C353B });
  const tierW = [3.5, 3.1, 2.7, 2.3, 1.9];
  const tierH = [1.4, 1.2, 1.0, 0.9, 0.8];
  let y = 0;
  for (let i = 0; i < 5; i++) {
    const w = tierW[i] * scale;
    const h = tierH[i] * scale;
    const bodyGeo = new THREE.BoxGeometry(w * 0.55, h, w * 0.55);
    const bodyWire = new THREE.Wireframe(bodyGeo);
    const bodyLine = new THREE.LineSegments(bodyWire, wireMat);
    bodyLine.position.y = y + h / 2;
    pagoda.add(bodyLine);
    const eaveW = w * 0.275 + 0.35 * scale;
    const eavePts = [[-eaveW, y + h, -eaveW], [eaveW, y + h, -eaveW], [eaveW, y + h, eaveW], [-eaveW, y + h, eaveW], [-eaveW, y + h, -eaveW]];
    const eaveGeo = new THREE.BufferGeometry();
    const eavePos = [];
    for (const p of eavePts) eavePos.push(p[0], p[1], p[2]);
    eaveGeo.setAttribute('position', new THREE.Float32BufferAttribute(eavePos, 3));
    pagoda.add(new THREE.Line(eaveGeo, new THREE.LineBasicMaterial({ color: 0x2C353B, linewidth: 2 })));
    y += h + 0.2 * scale;
  }
  const spireGeo = new THREE.BufferGeometry();
  spireGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, y, 0, 0, y + 2 * scale, 0], 3));
  pagoda.add(new THREE.Line(spireGeo, new THREE.LineBasicMaterial({ color: 0xC4A35A })));
  return pagoda;
}

// Builder 7: Tō-ji proportions (54.8 m, tallest wooden tower)
export function buildTojiPagoda(M, scale = 1) {
  const pagoda = new THREE.Group();
  pagoda.name = 'Tō-ji Proportions';
  pagoda.userData.height = 54.8 * scale;
  const firstFloorW = 9.48 * scale;
  const totalH = 54.8 * scale;
  const sorinH = totalH / 3.4;
  pagoda.add(box(firstFloorW * 0.8, 0.6 * scale, firstFloorW * 0.8, M.stone, 0, 0.3 * scale, 0));
  let y = 0.6 * scale;
  const tierHeights = [0.35, 0.28, 0.22, 0.18, 0.14];
  for (let i = 0; i < 5; i++) {
    const tierScale = Math.pow(0.82, i);
    const w = firstFloorW * tierScale;
    const bodyW = w * 0.45;
    const h = totalH * tierHeights[i];
    pagoda.add(box(bodyW, h, bodyW, M.plaster, 0, y + h / 2, 0));
    const roofGeo = new THREE.ConeGeometry(w * 0.65, h * 0.3, 4);
    const roof = new THREE.Mesh(roofGeo, M.roofDark);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = y + h + h * 0.15;
    roof.scale.z = 0.85;
    pagoda.add(roof);
    y += h + h * 0.3;
  }
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * scale, 0.15 * scale, sorinH * 0.6, 8), M.bronze);
  shaft.position.y = y + sorinH * 0.3;
  pagoda.add(shaft);
  for (let i = 0; i < 9; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry((0.4 - i * 0.04) * scale, 0.03 * scale, 8, 16), M.bronze);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y + i * 0.08 * sorinH;
    pagoda.add(ring);
  }
  return pagoda;
}

// LOD helper: return simplified version at distance
export function getPagodaLOD(type, M, distance, scale = 1) {
  if (distance > 200) return buildWireframePagoda(M, scale);
  if (distance > 80) return buildPainterlyPagoda(M, scale);
  return buildOriginalPagoda(M, scale);
}