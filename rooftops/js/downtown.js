// Downtown craft kit. Geometry recipes adapted from labs/alley/js/props.js;
// actual leaf paint and nodal bamboo are reused from the Greenery/shared labs.
import * as THREE from 'three';
import { alleyDepth } from './alleys.js';
// Leaf paint adapted from labs/greenery/js/kit.js without importing its
// workshop material registry (which would eagerly load every game builder).
function leafTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#82a85a'; x.beginPath(); x.moveTo(64, 6);
  x.quadraticCurveTo(124, 90, 64, 250); x.quadraticCurveTo(4, 90, 64, 6); x.fill();
  x.strokeStyle = '#c3ce91'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(64, 12); x.lineTo(64, 240); x.stroke();
  x.globalAlpha = .5; x.lineWidth = 1;
  for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(64, 30 + i * 22); x.lineTo(28 + (i % 2) * 72, 44 + i * 22); x.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
import { culmGeometry } from '../../labs/shared/bamboo.js';
const UP = new THREE.Vector3(0, 1, 0);
const unitLeaf = new THREE.PlaneGeometry(1, 1, 1, 2);
const sphere = new THREE.SphereGeometry(1, 10, 7);
const bambooGeo = culmGeometry({ nodes: 6, radial: 7 });
const TAU = Math.PI * 2;

export function downtownMaterials(M, canvasTex) {
  const paint = (kind) => canvasTex(256, 256, (c, w, h) => {
    const palettes = { clay: ['#ac6c49', '#704933', '#d9a278'], wood: ['#77634b', '#463c31', '#aaa080'], cloth: ['#435b72', '#243951', '#a6b5b4'], rope: ['#ab9464', '#66583b', '#d8c491'] };
    const p = palettes[kind]; c.fillStyle = p[0]; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1350; i++) {
      const x = (Math.sin(i * 43.2 + 8) * 43758.5) % 1 * w;
      const y = (Math.cos(i * 18.4 + 2) * 17292.2) % 1 * h;
      c.globalAlpha = 0.05 + (i % 5) * 0.025; c.fillStyle = p[i % 2 + 1];
      c.fillRect(Math.abs(x), Math.abs(y), kind === 'wood' ? 1.5 : 2.5, kind === 'wood' ? 14 + i % 41 : 1 + i % 7);
    }
    c.globalAlpha = 0.3; c.strokeStyle = p[1]; c.lineWidth = 1;
    for (let y = 0; y < 256; y += kind === 'cloth' ? 4 : 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y + 1); c.stroke(); }
    c.globalAlpha = 1;
  }, [1, 1]);
  M.agedWood = new THREE.MeshStandardMaterial({ map: paint('wood'), roughness: 0.92 });
  M.terracotta = new THREE.MeshStandardMaterial({ map: paint('clay'), roughness: 0.95 });
  M.twine = new THREE.MeshStandardMaterial({ map: paint('rope'), roughness: 1 });
  const clothPaint = paint('cloth');
  M.workCloth = [0xffffff, 0xd9bca3, 0x849e88, 0xcca794].map(color => new THREE.MeshStandardMaterial({ color, map: clothPaint, roughness: 1 }));
  M.skin = [0xc58e68, 0xe0ad83, 0xae7658].map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.86 }));
  const leafPaint = leafTexture();
  M.leaves = [0x63884d, 0xa1a660, 0x406950].map(color => new THREE.MeshStandardMaterial({ map: leafPaint, color, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 1 }));
  M.wisteria = new THREE.MeshStandardMaterial({ color: 0xbda0c6, roughness: 1 });
  M.alleyEarth = new THREE.MeshStandardMaterial({ map: paint('clay'), color:0x6f7560, roughness:1 });
  M.alleyGravel = new THREE.MeshStandardMaterial({ map: paint('rope'), color:0xc4c0aa, roughness:1 });
  M.moss = new THREE.MeshStandardMaterial({ color: 0x5c7046, roughness: 1 });
  const paving = canvasTex(256, 256, c => {
    c.fillStyle = '#55594f'; c.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 4; row++) for (let col = -1; col < 5; col++) {
      const x = col * 64 + (row % 2) * 32, y = row * 64;
      const v = 132 + Math.sin(row * 47 + col * 19) * 12;
      const grad = c.createLinearGradient(x, y, x + 64, y + 64);
      grad.addColorStop(0, `rgb(${v + 14},${v + 13},${v + 1})`); grad.addColorStop(1, `rgb(${v - 7},${v - 5},${v - 13})`);
      c.fillStyle = grad; c.beginPath(); c.roundRect(x + 2, y + 2, 60, 60, 3); c.fill();
      c.strokeStyle = 'rgba(233,224,201,.28)'; c.lineWidth = 1; c.stroke();
    }
    for (let i = 0; i < 1800; i++) {
      c.fillStyle = i % 2 ? 'rgba(220,214,184,.06)' : 'rgba(50,59,44,.07)';
      c.fillRect((i * 43.7) % 256, (i * 19.3) % 256, 2 + i % 3, 1 + i % 5);
    }
    for (let y = 0; y < 256; y += 64) { c.fillStyle = 'rgba(62,83,43,.35)'; for (let x = 0; x < 256; x += 13) if ((x + y) % 3) c.fillRect(x, y, 5, 2); }
  }, [.5, .5]);
  for (const m of [M.cobble, M.slab]) { m.map = paving; m.normalMap = null; m.bumpMap = paving; m.bumpScale = .025; m.color.setHex(0xffffff); m.roughness = .86; }

  M.timber.map = M.agedWood.map; M.timber.color.setHex(0x735c46); M.timber.normalScale.setScalar(0.3);
  M.timberMed.map = M.agedWood.map; M.timberMed.color.setHex(0xc0aa88); M.timberMed.normalScale.setScalar(0.3);
  M.signs = ['茶', '氷', '祭', '錦', '酒', 'だんご'].map((word, i) => new THREE.MeshStandardMaterial({ map: canvasTex(128, 256, c => {
    c.fillStyle = i % 2 ? '#e7d6ae' : '#e6e0ca'; c.fillRect(0, 0, 128, 256);
    c.strokeStyle = '#91724f'; c.lineWidth = 8; c.strokeRect(5, 5, 118, 246);
    c.fillStyle = i === 1 ? '#3b7285' : '#6e3428'; c.font = 'bold 73px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (word.length === 1) c.fillText(word, 64, 126); else [...word].forEach((a, j) => c.fillText(a, 64, 48 + j * 77));
  }), roughness: 1 }));
}

// A light version of the Labs' painted finish: two stable world-space dabs
// and ground grime, without a post-process or a multi-octave noise pass.
export function paintDowntown(M) {
  for (const mat of [M.plaster, M.plasterWarm, M.bengara, M.stone, M.slab, M.wetStone, M.roof, M.agedWood, M.terracotta]) {
    mat.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRoofPaint;')
        .replace('#include <project_vertex>', `#include <project_vertex>
          vec4 paintP = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            paintP = instanceMatrix * paintP;
          #endif
          vRoofPaint = (modelMatrix * paintP).xyz;`);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vRoofPaint;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec3 paintCell = floor(vRoofPaint * vec3(11.0, 16.0, 11.0));
          float dab = fract(sin(dot(paintCell, vec3(12.9898, 78.233, 39.425))) * 43758.5453);
          float wash = fract(sin(dot(floor(vRoofPaint.xz * 2.1), vec2(127.1, 311.7))) * 17291.53);
          diffuseColor.rgb *= .95 + dab * .07 + wash * .035;
          float grime = (1.0 - smoothstep(.03, .72, vRoofPaint.y)) * (.5 + wash * .5);
          diffuseColor.rgb *= vec3(1.0) - vec3(.18, .15, .19) * grime;`);
    };
    mat.customProgramCacheKey = () => 'roof-painted-dabs-v1';
  }
}

export function installDowntown(B, H) {
  const { box, cyl, frameGroup, hiraRoof, ribbon, hash1, mergeParts } = H;
  const beam = (g, a, b, radius, mat) => {
    const v = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
    const m = cyl(radius, v.length(), mat, 'y', 7);
    m.position.copy(new THREE.Vector3(...a).addScaledVector(v, 0.5));
    m.quaternion.setFromUnitVectors(UP, v.normalize()); g.add(m); return m;
  };
  const leaves = (g, M, x, y, z, count, seed, scale = 1) => {
    for (let i = 0; i < count; i++) {
      const a = hash1(seed + i * 3.7) * TAU, rad = hash1(seed + i * 9.3) * 0.55 * scale;
      const l = new THREE.Mesh(unitLeaf, M.leaves[i % 3]);
      l.position.set(x + Math.cos(a) * rad, y + Math.sin(i * 2.1) * 0.23 * scale, z + Math.sin(a) * rad);
      l.scale.set(0.18 * scale, 0.35 * scale, 1); l.rotation.set(-0.4 + hash1(i + seed) * 1.2, a, Math.sin(a) * 0.7); g.add(l);
    }
  };
  const vine = (g, M, x0, x1, y, z, seed, flower = false) => {
    for (let x = x0; x < x1; x += 0.43) {
      const yy = y + Math.sin(x * 1.7 + seed) * 0.12;
      beam(g, [x, yy, z], [Math.min(x1, x + 0.46), yy + 0.07, z + 0.04], 0.018, M.bark);
      for(const side of [-1,1]) {
        const dx=.12+hash1(x+seed+side)*.2, drop=.2+hash1(x*3+seed)*.42;
        const end=[x+dx,yy-drop,z+side*.18];
        beam(g,[x,yy,z],end,.009,M.bark);leaves(g,M,...end,4,x+seed+side,1.05);
        if(hash1(x*17+side+seed)>.6) {const curl=new THREE.Mesh(new THREE.TorusGeometry(.055,.007,4,10,Math.PI*1.55),M.bark);curl.position.set(end[0]+.04,end[1]-.06,end[2]);curl.rotation.y=side*.4;g.add(curl);}
      }
      leaves(g, M, x, yy, z, 3, x + seed, 1.2);
      if (flower && hash1(x * 31 + seed) > 0.6) for (let j = 0; j < 4; j++) {
        const f = new THREE.Mesh(sphere, M.wisteria); f.scale.set(0.065 - j * 0.009, 0.075, 0.06 - j * 0.008); f.position.set(x, yy - 0.16 - j * 0.1, z); g.add(f);
      }
    }
  };
  const pot = (g, M, x, y, z, seed) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.14, 0.3, 10), M.terracotta);
    p.position.set(x, y + 0.15, z); g.add(p);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 5, 12), M.terracotta); rim.rotation.x = Math.PI / 2; rim.position.set(x, y + 0.29, z); g.add(rim);
    leaves(g, M, x, y + 0.48, z, 13, seed, 1.1);
  };
  const crate = (g, M, x, y, z, w, h, d) => {
    g.add(box(w, 0.06, d, M.agedWood, x, y + 0.03, z));
    for (let k = 0; k < 4; k++) {
      const yy = y + h * (k + 0.5) / 4;
      for (const a of [-1, 1]) { g.add(box(w, h * 0.19, 0.045, M.agedWood, x, yy, z + a * d / 2)); g.add(box(0.045, h * 0.19, d, M.agedWood, x + a * w / 2, yy, z)); }
    }
    for (const a of [-1, 1]) for (const b of [-1, 1]) g.add(box(0.06, h, 0.06, M.timber, x + a * w * 0.43, y + h / 2, z + b * d * 0.43));
    // Top slats make the physics landing surface unambiguous.
    for (let k = 0; k < 4; k++) g.add(box(w * 0.22, 0.045, d, M.agedWood, x + w * (k - 1.5) / 4, y + h - 0.022, z));
  };
  const cask = (g, M, x, y, z, h = 0.82, r = 0.32) => {
    const p = [[0.78 * r, 0], [r, h * 0.16], [r * 1.05, h * 0.5], [r, h * 0.84], [r * 0.78, h]];
    const m = new THREE.Mesh(new THREE.LatheGeometry(p.map(([a, b]) => new THREE.Vector2(a, b)), 12), M.agedWood); m.position.set(x, y, z); g.add(m);
    const lid = cyl(r * 0.8, 0.04, M.agedWood); lid.position.set(x, y + h - 0.02, z); g.add(lid);
    for (const yy of [0.1, 0.44, 0.75]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r * (yy === 0.44 ? 1.06 : 0.98), 0.018, 5, 16), M.twine); t.rotation.x = Math.PI / 2; t.position.set(x, y + h * yy / 0.82, z); g.add(t); }
  };
  B.crate = (pc, ctx) => { const g = frameGroup(ctx.rail, (pc.s0 + pc.s1) / 2); crate(g, ctx.M, 0, 0, pc.d, pc.s1 - pc.s0, pc.y, 0.65); ctx.add(g); };
  B.barrel = B.komodaru = (pc, ctx) => {
    const g = frameGroup(ctx.rail, (pc.s0 + pc.s1) / 2); cask(g, ctx.M, 0, 0, pc.d, pc.y, (pc.s1 - pc.s0) / 2); ctx.add(g);
  };
  B.zushiTunnel = (pc, ctx) => {
    const { M, rail } = ctx, sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0, g = frameGroup(rail, sm), d = pc.dFront;
    // Open street-side cutaway: the soffit is solid, but no wall conceals the
    // little shelf route. Full upper storey reads as a bridge over the roji.
    g.add(box(w, pc.eave - pc.tunnelH, pc.depth, M.plasterWarm, 0, (pc.eave + pc.tunnelH) / 2, d - pc.depth / 2));
    g.add(box(w + 0.15, 0.14, pc.depth + 0.4, M.timber, 0, pc.tunnelH + 0.07, d - pc.depth / 2));
    hiraRoof(g, M, -w / 2, w / 2, d, d - pc.depth, pc.eave, pc.ridge);
    g.add(box(w * 0.72, 0.64, 0.04, M.mushiko, 0, (pc.eave + pc.tunnelH) / 2, d + 0.03));
    g.add(box(w, 0.09, 0.8, M.roof, 0, pc.hisashi - 0.045, d + 0.5));
    // A rear plaster wall, interrupted timber bays and stone footing.
    g.add(box(w, pc.tunnelH, 0.1, M.plaster, 0, pc.tunnelH / 2, d - 2.3));
    for (let x = -w / 2 + 0.18; x < w / 2; x += 1.45) {
      g.add(box(0.12, pc.tunnelH, 0.14, M.timber, x, pc.tunnelH / 2, d - 2.16));
      g.add(box(0.11, 0.12, 4.4, M.agedWood, x, pc.tunnelH - 0.06, d - 0.2));
      const l = cyl(0.11, 0.25, M.lanternWhite, 'y', 10); l.position.set(x + 0.25, pc.tunnelH - 0.32, d - 0.8); g.add(l);
    }
    for (const p of Object.values(pc.plats)) {
      if (!/step|shelf/.test(p.label)) continue;
      const x = (p.s0 + p.s1) / 2 - sm, pw = p.s1 - p.s0;
      if (p.kind === 'deck') g.add(box(pw, 0.1, 0.7, M.agedWood, x, p.y0 - 0.05, p.d));
      else crate(g, M, x, 0, p.d, pw, p.y0, 0.65);
    }
    g.add(box(w, 0.06, 4.4, M.wetStone, 0, 0.02, d - 0.2));
    pot(g, M, -w / 2 - 0.25, 0, d - 0.4, sm);
    if (pc.vines) vine(g, M, -w / 2, w / 2, pc.eave - 0.2, d + 0.15, sm);
    ctx.add(g); ctx.light(rail, sm, pc.tunnelH - 0.3, d - 0.5);
  };
  B.alleyPocket = (pc, ctx) => {
    const { M, rail } = ctx, sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0, g = frameGroup(rail, sm), d = pc.d;
    const p = pc.plats.map(id => ctx.platforms[id]);
    g.add(box(w, 0.18, 2.0, M.wetStone, 0, 0.09, d));
    cask(g, M, (p[1].s0 + p[1].s1) / 2 - sm, 0.18, p[1].d, p[1].y0 - 0.18, 0.42);
    const fx = (p[2].s0 + p[2].s1) / 2 - sm, fw = p[2].s1 - p[2].s0;
    for (let x = fx - fw / 2; x < fx + fw / 2; x += 0.17) g.add(box(0.14, p[2].y0 - 0.2, 0.12, M.agedWood, x, (p[2].y0 - 0.2) / 2 + 0.18, p[2].d));
    g.add(box(fw + 0.1, 0.09, 0.24, M.timberMed, fx, p[2].y0 - 0.045, p[2].d));
    const sx = (p[3].s0 + p[3].s1) / 2 - sm, sw = p[3].s1 - p[3].s0;
    g.add(box(sw, 1.8, 0.9, M.koshi, sx, 1.08, p[3].d - 0.3)); g.add(box(sw + 0.18, 0.1, 1.5, M.roof, sx, pc.topY - 0.05, p[3].d));
    pot(g, M, -w * 0.1, 0.18, d + 0.66, sm); pot(g, M, -w * 0.32, 0.18, d - 0.65, sm + 3);
    vine(g, M, -w * 0.3, w * 0.4, 1.74, d - 0.3, sm);
    ctx.add(g);
  };
  B.alleyRoute = (pc, ctx) => {
    const { M, rail } = ctx, a = ctx.alleys[pc.alley], sm = (a.s0 + a.s1) / 2;
    const g = frameGroup(rail, sm), len = a.s1 - a.s0;
    // The same sampled curve drives both the visible paving and paw depth.
    const strip = (s0, s1, y, width, offset, mat) => {
      const vertices = [], uv = [], indices = [], n = Math.ceil((s1 - s0) * 4);
      for (let i = 0; i <= n; i++) {
        const s = s0 + (s1 - s0) * i / n, d = alleyDepth(a, s) + offset;
        vertices.push(s-sm, y, d-width/2, s-sm, y, d+width/2);
        uv.push((s-a.s0)*.5,0,(s-a.s0)*.5,width*.5);
        if(i<n) { const k=i*2; indices.push(k,k+1,k+2,k+1,k+3,k+2); }
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
      geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); geo.setIndex(indices); geo.computeVertexNormals();
      g.add(new THREE.Mesh(geo,mat));
    };
    strip(a.s0+3.5,a.s1-3.5,-.035,8,0,M.alleyEarth);
    strip(a.s0,a.s1,-.015,2.15,0,M.alleyEarth);
    for(let s=a.s0+5;s<a.s1-4;s+=3.3) {
      const x=s-sm,d=alleyDepth(a,s);
      for(const side of [-1,1]) {
        const moss=new THREE.Mesh(new THREE.CircleGeometry(.55+hash1(s)*.3,24),M.gardenMoss);moss.rotation.x=-Math.PI/2;moss.scale.x=1.4;moss.position.set(x,-.026,d+side*2.2);g.add(moss);
        const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.2,0),M.stone);rock.scale.set(1.5,.5,1);rock.position.set(x+.45,.04,d+side*2.0);g.add(rock);
        leaves(g,M,x,.28,d+side*2.5,9,s+side,.9);
      }
    }
    strip(a.s0,a.s1,.004,1.35,0,a.theme==='tea'||a.theme==='moss'?M.alleyGravel:M.slab);
    strip(a.s0,a.s1,.009,.14,.8,M.moss);
    for(let s=a.s0+.3;s<a.s1;s+=.85) {
      const x=s-sm,d=alleyDepth(a,s);
      // Damp drain bed and stepping stones, open to a miniature planted court.
      g.add(box(.72,.08,.18,M.wetStone,x,-.02,d-.84));
      if(a.theme==='tea'||a.theme==='moss') {
        const stone = cyl(.32,.065,M.stone,'y',7); stone.scale.x=1.35; stone.position.set(x,.035,d); stone.rotation.y=hash1(s)*2; g.add(stone);
      }
      if(s>a.s0+4&&s<a.s1-4) {
        g.add(box(.87,1.25,.10,M.plasterWarm,x,.55,d-1.12));
        g.add(box(.88,.085,.2,M.roof,x,1.2,d-1.12));
        if(Math.floor(s*2)%4===0) pot(g,M,x,.02,d-1.0,s);
      }
    }
    for(const id of a.plats) {
      const p=ctx.platforms[id]; if(p.kind==='street') continue;
      const mid=(p.s0+p.s1)/2, d=alleyDepth(a,mid), x=mid-sm;
      if(p.kind==='rope') {
        for(let s=p.s0;s<p.s1;s+=.35) {
          beam(g,[s-sm,p.y0-.025,alleyDepth(a,s)],[Math.min(p.s1,s+.35)-sm,p.y0-.025,alleyDepth(a,Math.min(p.s1,s+.35))],.033,M.twine);
        }
        for(const s of [p.s0,p.s1]) beam(g,[s-sm,0,alleyDepth(a,s)],[s-sm,p.y0+.2,alleyDepth(a,s)],.055,M.bamboo);
      } else {
        strip(p.s0,p.s1,p.y0,.7,0,p.kind==='futon'?M.cloth[0]:M.agedWood);
        for(let s=p.s0+.15;s<p.s1;s+=.55) {
          const d=alleyDepth(a,s);
          if(p.kind==='step') crate(g,M,s-sm,0,d,.5,p.y0-.015,.65);
          else { g.add(box(.06,p.y0,.06,M.timber,s-sm,p.y0/2,d-.26));g.add(box(.06,p.y0,.06,M.timber,s-sm,p.y0/2,d+.26)); }
          if(p.kind==='rack') { const l=cyl(.11,.28,M.lanternWhite,'y',10);l.position.set(s-sm,p.y0-.3,d-.25);g.add(l); }
        }
      }
      if(a.theme==='indigo'&&p.kind==='deck'||a.theme==='laundry'&&p.kind==='rope') {
        for(let s=p.s0+.2;s<p.s1;s+=.6) g.add(box(.38,.6,.025,M.workCloth[0],s-sm,p.y0-.35,alleyDepth(a,s)-.2));
      }
    }
    // A noren and beam over each entrance make the choice visible at cat height.
    for(const end of [a.s0+.45,a.s1-.45]) {
      const x=end-sm,d=alleyDepth(a,end);
      for(const z of [-.85,.85]) g.add(box(.10,a.tunnelH,.1,M.agedWood,x,a.tunnelH/2,d+z));
      g.add(box(.55,.12,1.95,M.timber,x,a.tunnelH-.06,d));
      const curtain=box(.035,.55,1.55,M.noren[a.theme==='festival'?'crimson':'indigo'],x,a.tunnelH-.4,d); g.add(curtain);
      const lamp=cyl(.13,.3,M.lanternWhite,'y',10);lamp.position.set(x+.25,1.45,d+.82);g.add(lamp);
      ctx.light(rail,end,1.45,d+.82);
    }
    for(const [lo,hi] of [[a.s0+.25,a.s0+3.6],[a.s1-3.6,a.s1-.25]]) {
      strip(lo,hi,a.tunnelH,1.95,0,M.timber);
      for(let s=lo;s<hi;s+=.7) g.add(box(.10,.15,1.95,M.agedWood,s-sm,a.tunnelH-.07,alleyDepth(a,s)));
    }
    const center=a.s0+len*.52, d=alleyDepth(a,center);
    vine(g,M,center-sm-2,center-sm+2,2.5,d-1.1,sm,a.theme==='festival');
    pot(g,M,center-sm,.02,d-.8,sm);
    if(a.theme==='bamboo') for(let i=0;i<7;i++) {
      const b=new THREE.Mesh(bambooGeo,M.bamboo);b.scale.set(.045,2.6+hash1(i+sm),.045);b.position.set(center-sm-1.3+i*.4,0,d-1.5);b.rotation.z=(hash1(i+3)-.5)*.12;g.add(b);
      leaves(g,M,b.position.x,2.8,d-1.5,12,sm+i,1.5);
    }
    if(a.theme==='tea'||a.theme==='moss') { cask(g,M,center-sm+2,0,d-.5,.58,.32);g.add(box(.6,.07,.5,M.stone,center-sm+2,.62,d-.5)); }
    ctx.add(g);
  };
  B.utilityPole = (pc, ctx) => {
    const { M, rail } = ctx, g = frameGroup(rail, pc.s), h = pc.highY + 0.7;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.115, h, 9), M.agedWood); pole.position.set(0, h / 2, pc.d); g.add(pole);
    for (const [y, w] of [[pc.lowY, 0.9], [pc.highY, 1.04]]) {
      g.add(box(w, 0.09, 0.11, M.agedWood, 0, y - 0.045, pc.d));
      for (const x of [-w * 0.4, w * 0.4]) { const ins = cyl(0.07, 0.18, M.shoji, 'y', 8); ins.position.set(x, y + 0.1, pc.d); g.add(ins); }
    }
    g.add(box(.3,.18,.3,M.stone,0,.09,pc.d));
    for(const y of [.45,pc.lowY-.18,pc.highY-.18]) {const band=cyl(.12,.05,M.steel,'y',9);band.position.set(0,y,pc.d);g.add(band);}
    for(const y of [pc.lowY,pc.highY]) for(const side of [-1,1]) {
      beam(g,[0,y-.48,pc.d],[side*.37,y-.07,pc.d],.025,M.agedWood);
      for(let i=0;i<3;i++){const ceramic=new THREE.Mesh(new THREE.TorusGeometry(.07-i*.005,.014,5,10),M.enamel);ceramic.rotation.x=Math.PI/2;ceramic.position.set(side*.4,y+.05+i*.045,pc.d);g.add(ceramic);}
    }
    const notice=box(.16,.28,.018,M.signs[2],.02,1.45,pc.d+.116);notice.rotation.z=.04;g.add(notice);
    for (let y = 0.7; y < pc.lowY; y += 0.6) g.add(box(0.3, 0.025, 0.045, M.steel, 0.12, y, pc.d));
    for (const z of [-0.17, 0.17]) {
      const pts = [];
      for (let j = 0; j <= 8; j++) { const u = j / 8; pts.push(new THREE.Vector3(u * pc.wireSpan, pc.highY + 0.16 - Math.sin(Math.PI * u) * 0.36, pc.d + z)); }
      if (pc.wireSpan) g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.012, 4, false), M.dark));
    }
    ctx.add(g);
  };
  B.trellis = (pc, ctx) => {
    const { M, rail } = ctx, sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0, g = frameGroup(rail, sm);
    for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) for (const z of [-0.65, 0.65]) {
      const culm = new THREE.Mesh(bambooGeo, M.bamboo); culm.scale.set(0.05, pc.y, 0.05); culm.position.set(x, 0, pc.d + z); g.add(culm);
    }
    for (const z of [-0.65, 0, 0.65]) g.add(box(w, 0.07, 0.07, M.bamboo, 0, pc.y - 0.035, pc.d + z));
    for (let x = -w / 2; x <= w / 2; x += 0.35) g.add(box(0.045, 0.05, 1.5, M.bamboo, x, pc.y - 0.025, pc.d));
    vine(g, M, -w / 2, w / 2, pc.y + 0.1, pc.d - 0.4, sm, pc.flower === 'wisteria');
    vine(g, M, -w / 2, w / 2, pc.y + 0.12, pc.d + 0.6, sm + 3, pc.flower === 'wisteria'); ctx.add(g);
  };
  B.willow = (pc, ctx) => {
    const { M, rail } = ctx, sm = (pc.s0 + pc.s1) / 2, g = frameGroup(rail, sm), b = pc.bough;
    const x0 = b.s0 - sm, x1 = b.s1 - sm;
    beam(g, [x0 - 0.7, 0, pc.d - 1.4], [x0, b.y - 0.18, pc.d], 0.12, M.bark);
    beam(g, [x0, b.y - 0.12, pc.d], [x1, b.y - 0.06, pc.d], 0.1, M.bark);
    for (let x = x0 - 0.3; x < x1 + 0.4; x += 0.38) {
      const drop = 0.65 + hash1(x + sm) * 1.3, z = pc.d - 0.1 + Math.sin(x * 4) * 0.5;
      beam(g, [x, b.y + 0.5, z], [x + 0.22, b.y + 0.5 - drop, z], 0.012, M.bark);
      for (let yy = 0; yy < drop; yy += 0.24) leaves(g, M, x + yy * 0.17, b.y + 0.5 - yy, z, 3, sm + x + yy, 0.8);
    }
    ctx.add(g);
  };
  B.culvertLedge = (pc, ctx) => {
    const g = frameGroup(ctx.rail, (pc.s0 + pc.s1) / 2), w = pc.s1 - pc.s0;
    g.add(box(w, pc.y + 0.35, 0.8, ctx.M.wetStone, 0, (pc.y - 0.35) / 2, pc.d));
    g.add(box(w, 0.035, 0.18, ctx.M.moss, 0, pc.y - 0.017, pc.d - 0.28)); ctx.add(g);
  };
  B.tenmanguGate = (pc, ctx) => {
    const { M, rail } = ctx, sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0, g = frameGroup(rail, sm);
    for (const x of [-w * 0.35, w * 0.35]) { const p = cyl(0.16, pc.y - 0.15, M.stone, 'y', 12); p.position.set(x, (pc.y - 0.15) / 2, pc.d); g.add(p); }
    g.add(box(w, 0.18, 0.45, M.stone, 0, pc.y - 0.09, pc.d)); g.add(box(w * 0.86, 0.13, 0.3, M.stone, 0, pc.y - 0.55, pc.d));
    const sign = box(0.4, 0.68, 0.08, M.signs[0], 0, pc.y - 0.8, pc.d + 0.18); g.add(sign);
    for (const x of [-w * 0.46, w * 0.46]) for (let yy = 0.8; yy < 2.6; yy += 0.48) { const l = cyl(0.17, 0.35, M.lanternWhite, 'y', 10); l.position.set(x, yy, pc.d - 0.7); g.add(l); }
    ctx.add(g); ctx.light(rail, sm, 2.0, pc.d);
  };
  B.yamaFloat = (pc, ctx) => {
    const { M, rail } = ctx, sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0, g = frameGroup(rail, sm);
    g.add(box(w, 0.18, 2.4, M.timberMed, 0, pc.deckY - 0.09, pc.d));
    for (const z of [-1.1, 1.1]) g.add(box(w, 1.4, 0.035, M.tapestry, 0, pc.deckY - 0.8, pc.d + z));
    for (const x of [-w * 0.3, w * 0.3]) for (const z of [-0.85, 0.85]) { const wheel = cyl(0.38, 0.12, M.timber, 'z', 12); wheel.position.set(x, 0.45, pc.d + z); g.add(wheel); }
    g.add(box(1.8, 0.09, 1.5, M.timber, 0, pc.deckY + 1.005, pc.d - 0.1));
    beam(g, [0, pc.deckY, pc.d - 0.5], [0.1, pc.pineY - 0.08, pc.d - 0.15], 0.09, M.bark);
    beam(g, [-0.65, pc.pineY - 0.06, pc.d - 0.15], [0.65, pc.pineY - 0.06, pc.d - 0.15], 0.08, M.bark);
    leaves(g, M, 0, pc.pineY + 0.15, pc.d - 0.35, 48, sm, 2); ctx.add(g);
  };
  B.villager = (pc, ctx) => {
    const { M, rail } = ctx, g = frameGroup(rail, pc.s), body = new THREE.Group();
    body.position.set(0, pc.y, pc.d - (pc.role === 'laundry' ? 0.36 : 0)); g.add(body);
    const cloth = M.workCloth[Math.floor(pc.look * 4) % 4], skin = M.skin[Math.floor(pc.look * 3) % 3];
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.24, 0.62, 9), cloth); torso.position.y = 0.87; body.add(torso);
    const apron = box(0.28, 0.58, 0.045, M.cloth[0], 0, 0.65, 0.15); body.add(apron);
    body.add(box(0.36, 0.07, 0.3, M.cloth[pc.role === 'laundry' ? 4 : 2], 0, 0.65, 0));
    for (const side of [-1, 1]) {
      const collar = box(0.045, 0.32, 0.035, M.cloth[0], side * 0.055, 1.02, .15);
      collar.rotation.z = side * -.35; body.add(collar);
    }
    for (const x of [-0.095, 0.095]) { body.add(box(0.11, 0.43, 0.14, cloth, x, 0.3, 0)); body.add(box(0.13, 0.07, 0.25, M.dark, x, 0.065, 0.04)); }
    const head=new THREE.Group();head.position.y=1.36;body.add(head);
    const face=new THREE.Mesh(sphere,skin);face.scale.set(.14,.18,.13);head.add(face);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.145, 10, 7, 0, TAU, 0, Math.PI * 0.64), M.dark); hair.position.set(0, .05, -.015); head.add(hair);
    if (pc.role === 'laundry') { const bun = new THREE.Mesh(sphere, M.dark); bun.scale.setScalar(0.07); bun.position.set(0, .12, -.13); head.add(bun); }
    else { const band = cyl(0.146, 0.055, M.cloth[0], 'y', 10); band.position.y = .07; head.add(band); }
    for (const x of [-0.052, 0.052]) { const eye = new THREE.Mesh(sphere, M.dark); eye.scale.set(0.012, 0.014, 0.01); eye.position.set(x, .02, .117); head.add(eye); }
    const nose = new THREE.Mesh(sphere, skin); nose.scale.set(.032, .035, .04); nose.position.set(0, -.01, .127); head.add(nose);
    head.add(box(.048, .009, .01, M.terracotta, 0, -.075, .121));
    const arms = [-1, 1].map(side => {
      const pivot = new THREE.Group(); pivot.position.set(side * 0.18, 1.09, 0);
      pivot.add(box(0.15, 0.24, 0.17, cloth, 0, -0.1, 0));
      const hand = new THREE.Mesh(sphere, skin); hand.scale.set(0.055, 0.13, 0.055); hand.position.set(0, -0.3, 0); pivot.add(hand); body.add(pivot); return pivot;
    });
    let towel=null;
    if(pc.role==='laundry') {
      towel=box(.42,.55,.02,M.cloth[3],0,-.4,0);arms[1].add(towel);
      const basket=new THREE.Mesh(new THREE.CylinderGeometry(.28,.21,.25,12,1,true),M.bamboo);basket.position.set(-.45,.14,.15);body.add(basket);
      for(let j=0;j<3;j++)body.add(box(.32,.045,.24,M.cloth[j],-.45,.21+j*.035,.15));
      g.add(box(1.5,.04,.04,M.bamboo,0,pc.y+1.62,pc.d+.12));
      for(const x of [-.7,.7])g.add(box(.035,1.65,.035,M.bamboo,x,pc.y+.82,pc.d+.12));
      for(const x of [-.45,.4]) {g.add(box(.35,.6,.02,M.cloth[2],x,pc.y+1.3,pc.d+.12));g.add(box(.03,.09,.04,M.agedWood,x,pc.y+1.59,pc.d+.15));}
    }
    if (pc.role === 'sweeper') { const broom = cyl(0.015, 1.25, M.bamboo); broom.position.y = -0.45; arms[0].add(broom); arms[0].add(box(0.22, 0.3, 0.06, M.straw, 0, -1.0, 0)); }
    if (pc.role === 'stallkeeper') {
      const ladle=cyl(.012,.36,M.bamboo);ladle.position.y=-.43;arms[1].add(ladle);
      const grill=/yaki|ayu/.test(pc.fare||'');
      if(grill)arms[1].add(box(.09,.1,.015,M.steel,0,-.62,0));
      else {const bowl=new THREE.Mesh(new THREE.SphereGeometry(.065,8,5,0,TAU,0,Math.PI/2),M.enamel);bowl.rotation.z=Math.PI; bowl.position.y=-.61;arms[1].add(bowl);}
      arms[0].add(box(.23,.025,.16,M.terracotta,0,-.32,.06));
    }
    const rigid=new THREE.Group();for(const child of [...body.children]) if(child!==head&&!arms.includes(child))rigid.add(child);
    body.add(mergeParts(rigid,false));const faceSource=new THREE.Group();for(const child of [...head.children])faceSource.add(child);head.add(mergeParts(faceSource,false));
    // Bake each rigid part while retaining just two animated shoulders. Root
    // update hides far-away workers; the whole kilometre never animates at once.
    body.rotation.y = pc.role === 'laundry' ? Math.PI * 0.12 : 0;
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    ctx.dynamic.people.push({ group: g, body, arms, head, s: pc.s, phase: pc.look * TAU, role: pc.role, y: pc.y, towel, fare:pc.fare });
    ctx.addDyn(g);
  };
  return {
    decorateHouse(pc, ctx) {

      const g = frameGroup(ctx.rail, (pc.s0 + pc.s1) / 2), w = pc.s1 - pc.s0, M = ctx.M;
      const d=pc.dFront, eave=pc.hisashi||pc.eave, seed=hash1(pc.s0*7.9);
      if(seed>.35) {
        // Rain cups, a ceramic receiver and weathered eave hardware.
        const x=w*.43;
        for(let y=.35;y<eave-.15;y+=.19) {const cup=new THREE.Mesh(new THREE.ConeGeometry(.045,.055,7,1,true),M.bronze);cup.rotation.x=Math.PI;cup.position.set(x,y,d+.48);g.add(cup);}
        const basin=new THREE.Mesh(new THREE.CylinderGeometry(.19,.14,.18,10,1,true),M.terracotta);basin.position.set(x,.1,d+.48);g.add(basin);
        g.add(box(.16,.035,.3,M.steel,x,eave-.12,d+.37));
      }
      if(seed<.3) {
        // Folding shop bench, parcels and a broom tucked safely by the wall.
        g.add(box(1.2,.07,.38,M.agedWood,-w*.26,.42,d+.4));
        for(const x of [-w*.26-.45,-w*.26+.45])g.add(box(.06,.4,.06,M.agedWood,x,.2,d+.4));
        crate(g,M,-w*.26,.46,d+.4,.42,.24,.32);
        beam(g,[w*.35,.12,d+.65],[w*.35-.18,1.3,d+.25],.017,M.bamboo);
        for(let i=0;i<8;i++)beam(g,[w*.35+(i-3.5)*.018,.04,d+.65],[w*.35,.35,d+.59],.008,M.straw);
      }
      if(seed>.72) {
        // Alley Lab bicycle recipe, simplified to two wheels and a useful frame.
        const bx=-w*.26, z=d+.37;
        for(const x of [bx-.38,bx+.38]) {const wheel=new THREE.Mesh(new THREE.TorusGeometry(.26,.018,5,16),M.dark);wheel.position.set(x,.28,z);g.add(wheel);for(let i=0;i<5;i++){const spoke=box(.51,.008,.008,M.steel,x,.28,z);spoke.rotation.z=i*Math.PI/5;g.add(spoke);}}
        const A=[bx-.38,.28,z],B=[bx-.1,.28,z],C=[bx-.2,.63,z],D=[bx+.2,.61,z],E=[bx+.38,.28,z];
        for(const [a,b]of [[A,B],[B,C],[C,A],[C,D],[D,B],[D,E]])beam(g,a,b,.017,M.bengara);
        beam(g,D,[bx+.16,.83,z],.016,M.steel);g.add(box(.28,.035,.12,M.dark,bx-.2,.66,z));
        crate(g,M,bx+.36,.59,z,.22,.18,.2);
      }
      if (pc.vines) { vine(g, M, -w * 0.48, -w * 0.05, (pc.hisashi || pc.eave) - 0.2, pc.dFront + 0.8, pc.s0); pot(g, M, -w * 0.42, 0, pc.dFront + 0.5, pc.s0); }
      if (pc.byobu) for (let i = 0; i < 4; i++) { const s = box(0.42, 0.94, 0.035, i % 2 ? M.tapestry : M.gold, -0.7 + i * 0.4, 0.63, pc.dFront + 0.15 + (i % 2) * 0.12); s.rotation.y = i % 2 ? -0.25 : 0.25; g.add(s); }
      ctx.add(g);
    },
    decorateStall(pc, ctx) {
      const { M, rail } = ctx, sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0, g = frameGroup(rail, sm), d = pc.d;
      const fare = pc.fare, ice = /kakigori|ramune|hiyashi/.test(fare);
      const board = box(.32, .66, .035, M.stallSigns[fare] || M.signs[ice ? 1 : /dango/.test(fare) ? 5 : 2], -w * .4, 1.45, d + .8);
      board.rotation.z = -.025; g.add(board);
      for(const side of [-1,1]) {
        beam(g,[side*w*.43,.92,d-.55],[side*w*.43,pc.y-.04,d+.7],.012,M.twine);
        const bowl=new THREE.Mesh(new THREE.SphereGeometry(.12,9,5,0,TAU,0,Math.PI/2),M.enamel);bowl.rotation.x=Math.PI;bowl.position.set(side*w*.32,.98,d+.4);g.add(bowl);
      }
      crate(g,M,-w*.4,0,d-.2,.52,.38,.45);
      for(let i=0;i<4;i++){const parcel=box(.16,.16,.15,M.goods[(i+2)%6],-w*.4+(i%2-.5)*.18,.48+Math.floor(i/2)*.14,d-.2);parcel.rotation.y=i*.3;g.add(parcel);}
      if(/wind/.test(fare))for(let i=-2;i<=2;i++) {
        const bell=new THREE.Mesh(new THREE.SphereGeometry(.095,10,6,0,TAU,0,Math.PI*.65),M.glass);bell.position.set(i*.3,pc.y-.3,d+.56);g.add(bell);
        beam(g,[i*.3,pc.y-.04,d+.56],[i*.3,pc.y-.48,d+.56],.006,M.twine);
        const paper=box(.065,.22,.009,M.cloth[(i+7)%5],i*.3,pc.y-.57,d+.56);paper.rotation.z=i*.07;g.add(paper);
      }
      if(/masks/.test(fare))for(let i=-2;i<=2;i++) {
        const face=new THREE.Mesh(sphere,M.enamel);face.scale.set(.095,.13,.035);face.position.set(i*.3,1.45,d+.85);g.add(face);
        for(const side of [-1,1]){const ear=new THREE.Mesh(new THREE.ConeGeometry(.035,.09,5),M.goods[3]);ear.position.set(i*.3+side*.065,1.57,d+.85);g.add(ear);g.add(box(.025,.012,.01,M.dark,i*.3+side*.037,1.46,d+.89));}
      }
      if (/kingyo/.test(fare)) {
        g.add(box(w * .58, .08, .5, M.bamboo, 0, .96, d + .42));
        g.add(box(w * .54, .015, .46, M.goods[5], 0, 1.01, d + .42));
        for (let i = 0; i < 7; i++) { const fish = new THREE.Mesh(sphere, M.goods[i % 2 ? 0 : 3]); fish.scale.set(.06, .025, .025); fish.position.set(-.55 + i * .18, 1.035, d + .36 + Math.sin(i * 3) * .12); g.add(fish); }
      } else if (/kakigori|cotton/.test(fare)) {
        for (let i = -2; i <= 2; i++) {
          const cup = new THREE.Mesh(new THREE.CylinderGeometry(.075, .04, .13, 9), M.goods[(i + 6) % 6]); cup.position.set(i * .24, 1.0, d + .55); g.add(cup);
          const snow = new THREE.Mesh(new THREE.SphereGeometry(.1, 9, 6, 0, TAU, 0, Math.PI / 2), M.cloth[0]); snow.position.set(i * .24, 1.07, d + .55); g.add(snow);
        }
      } else if (/takoyaki|okonomiyaki|yakisoba|ayu/.test(fare)) {
        g.add(box(w * .62, .06, .52, M.steel, 0, .98, d + .47));
        for (let i = 0; i < 12; i++) { const food = new THREE.Mesh(sphere, M.goods[1]); food.scale.set(/okono/.test(fare) ? .16 : .055, .035, .06); food.position.set(-w * .25 + (i % 6) * .24, 1.04, d + .35 + Math.floor(i / 6) * .22); g.add(food); }
        g.add(box(w * .6, .035, .07, M.goods[0], 0, .89, d + .55));
      } else if (/ringo|chestnuts/.test(fare)) {
        for (let i = -3; i <= 3; i++) { const apple = new THREE.Mesh(sphere, M.goods[3]); apple.scale.setScalar(.075); apple.position.set(i * .2, 1.16, d + .55); g.add(apple); const stick = cyl(.009, .27, M.bamboo); stick.position.set(i * .2, .99, d + .55); g.add(stick); }
      } else if (/wind|matcha/.test(fare)) {
        for (let i = -2; i <= 2; i++) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(.08, .06, .11, 10), M.terracotta); cup.position.set(i * .23, 1.0, d + .55); g.add(cup); }
      }
      ctx.add(g);
    },
    updatePeople(people, t, playerS, lowPower, reduceMotion) {
      for (const p of people) {
        p.group.visible = Math.abs(p.s - playerS) < (lowPower ? 24 : 42);
        if (!p.group.visible) continue;
        const u = t * (reduceMotion ? 0.25 : 1) + p.phase;
        p.body.rotation.z = Math.sin(u * 0.7) * 0.018;
        p.head.rotation.y = Math.abs(p.s-playerS)<3 ? Math.sign(playerS-p.s)*.38 : Math.sin(u*.45)*.16;
        if (p.towel) {p.towel.rotation.z=Math.sin(u*.8)*.14;p.towel.scale.y=.86+Math.sin(u*.8)*.14;}
        if (p.role === 'laundry') { p.arms[0].rotation.x = -1.6 + Math.sin(u * 0.8) * 0.65; p.arms[1].rotation.x = -1.8 + Math.sin(u * 0.8 + 0.5) * 0.6; }
        else if (p.role === 'sweeper') { p.arms[0].rotation.z = 0.4 + Math.sin(u) * 0.22; p.arms[0].rotation.x = -0.4; p.arms[1].rotation.x = -0.8; }
        else if (p.role === 'stallkeeper') { p.arms[0].rotation.x = -0.9 + Math.sin(u * 1.1) * 0.15; p.arms[1].rotation.x = -1.1 + Math.sin(u * 1.1) * 0.25; p.arms[1].rotation.z = Math.sin(u * 0.9) * 0.22; }
        else { p.arms[0].rotation.x = -0.3; p.arms[1].rotation.x = -0.6 + Math.sin(u * 0.7) * 0.12; }
      }
    }
  };
}
