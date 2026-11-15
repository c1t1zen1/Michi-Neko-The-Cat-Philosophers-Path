// Soft, hand-painted Kyoto residents. Local Y is up, +Z faces the street.
// Cloth is shaped in rings and gently irregular folds rather than box limbs.
import * as THREE from 'three';
const TAU = Math.PI * 2;
const ball = new THREE.SphereGeometry(1, 16, 12);

export function residentMaterials(M, canvasTex) {
  M.hair = new THREE.MeshStandardMaterial({ color: 0x302c30, roughness: 1 });
  M.faces = M.skin.map((skin, index) => {
    const base = '#' + skin.color.getHexString();
    const map = canvasTex(256, 256, c => {
      c.fillStyle = base; c.fillRect(0, 0, 256, 256);
      // The front of a Three sphere is u=.25. The paint wraps around an oval
      // face, so profile and three-quarter views retain the same expression.
      const wash = c.createRadialGradient(64, 122, 4, 64, 125, 64);
      wash.addColorStop(0, 'rgba(255,228,194,.28)'); wash.addColorStop(1, 'rgba(130,69,54,.12)');
      c.fillStyle = wash; c.fillRect(0, 0, 256, 256);
      for (const x of [47,81]) {
        const blush = c.createRadialGradient(x, 137, 1, x, 137, 12);
        blush.addColorStop(0, 'rgba(191,91,75,.32)'); blush.addColorStop(1, 'rgba(191,91,75,0)');
        c.fillStyle = blush; c.fillRect(x-12,125,24,24);
      }
      c.lineCap = 'round'; c.strokeStyle = '#514039'; c.lineWidth = 2;
      for (const x of [52,76]) {
        c.beginPath(); c.moveTo(x-5,109); c.quadraticCurveTo(x,106-index,x+5,108); c.stroke();
        c.fillStyle = '#ede0cb'; c.beginPath(); c.ellipse(x,120,5,3,0,0,TAU); c.fill();
        c.fillStyle = '#3b302d'; c.beginPath(); c.ellipse(x+index*.4,120,2.1,3,0,0,TAU); c.fill();
        c.lineWidth = 1.5; c.beginPath(); c.moveTo(x-5,120); c.quadraticCurveTo(x,115,x+5,120); c.stroke();
        c.fillStyle = '#fff1cf'; c.fillRect(x,118,1,1);
      }
      c.strokeStyle = 'rgba(127,72,55,.65)'; c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(64,127); c.quadraticCurveTo(60,137,65,137); c.stroke();
      c.strokeStyle = '#8a5147'; c.beginPath(); c.moveTo(59,148); c.quadraticCurveTo(64,151+index,70,147); c.stroke();
      // Fine wash marks keep the face from reading as a glossy plastic toy.
      c.fillStyle = 'rgba(255,230,194,.06)';
      for (let i=0;i<170;i++) c.fillRect((i*47.3)%256,(i*29.7)%256,2,3);
    });
    return new THREE.MeshStandardMaterial({ map, roughness: 1 });
  });
}

export function makeResident(M, { look = .5, role = 'stallkeeper', seated = false } = {}) {
  const body = new THREE.Group(), head = new THREE.Group();
  body.name = 'Painted Kyoto resident';
  const variant = Math.floor(look * 4) % 4;
  const cloth = M.workCloth[variant], skin = M.skin[Math.floor(look * 3) % 3];
  const oval = (parent, mat, x,y,z, sx,sy,sz) => {
    const mesh = new THREE.Mesh(ball,mat); mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz); parent.add(mesh); return mesh;
  };
  const drape = (parent, mat, rings, depth = .7, phase = 0) => {
    const geo = new THREE.LatheGeometry(rings.map(([r,y]) => new THREE.Vector2(r,y)),20);
    const p = geo.attributes.position;
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i), z=p.getZ(i), y=p.getY(i), phi=Math.atan2(z,x);
      const fold=1+.025*Math.sin(phi*7+phase)+.018*Math.sin(phi*11+y*9);
      p.setXYZ(i,x*fold,y,z*fold*depth);
    }
    geo.computeVertexNormals(); const mesh = new THREE.Mesh(geo,mat); parent.add(mesh); return mesh;
  };
  // Tabi, soft sandals, and relaxed trouser legs with rounded knees.
  if (!seated) for(const side of [-1,1]) {
    const leg = drape(body,cloth,[[.065,.12],[.08,.18],[.09,.34],[.087,.52],[.105,.72]],.87,side);
    leg.position.set(side*.10,0,side*.022);
    oval(body,M.cloth[0],side*.10,.09,.025,.067,.065,.135);
    oval(body,M.agedWood,side*.10,.037,.05,.079,.025,.157);
    const strap = oval(body,M.dark,side*.10,.105,.085,.06,.018,.035); strap.rotation.z=side*.1;
  } else {
    oval(body,cloth,-.17,.12,.13,.17,.13,.28);
    oval(body,cloth,.17,.12,.13,.17,.13,.28);
  }
  const waist = seated ? -.46 : 0;
  const torso = new THREE.Group(); torso.position.y=waist; body.add(torso);
  drape(torso,cloth,[[.20,.58],[.225,.61],[.19,.72],[.17,.83],[.20,1.02],[.205,1.10],[.15,1.17],[.09,1.20]],.7,look*8);
  oval(torso,skin,0,1.215,0,.052,.065,.05);
  const sash = drape(torso,M.cloth[variant%2?2:4],[[.185,.70],[.185,.77],[.176,.79]],.73);
  sash.rotation.z = .035;
  // Overlapping kimono lapels curve over the chest, following its rounded form.
  for(const side of [-1,1]) {
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side*.095,1.18,.068),new THREE.Vector3(side*.05,1.06,.14),new THREE.Vector3(-side*.06,.86,.13)
    ]);
    torso.add(new THREE.Mesh(new THREE.TubeGeometry(path,12,.018,5,false),M.cloth[0]));
  }
  if(role==='laundry') drape(torso,cloth,[[.27,.17],[.25,.24],[.22,.45],[.19,.70]],.72,2);
  // A bowed apron panel with a loose, scalloped hem.
  const apronGeo = new THREE.PlaneGeometry(.30,.58,8,8), ap = apronGeo.attributes.position;
  for(let i=0;i<ap.count;i++) {
    const x=ap.getX(i), y=ap.getY(i);
    ap.setXYZ(i,x*(1-(y+.29)*.22),y+.52,.135+.035*Math.cos(x*17)+.009*Math.sin(y*32+x*23));
  }
  apronGeo.computeVertexNormals(); torso.add(new THREE.Mesh(apronGeo,M.cloth[0]));
  head.position.set(0,1.425+waist,.012); body.add(head);
  const face = oval(head,M.faces[Math.floor(look*3)%3],0,0,0,.136,.187,.13);
  // Taper the jaw and soften the cheeks without a separate mechanical chin.
  const hp=face.geometry===ball ? ball.clone() : face.geometry;
  face.geometry=hp; const pos=hp.attributes.position;
  for(let i=0;i<pos.count;i++) if(pos.getY(i)<-.1) pos.setX(i,pos.getX(i)*(.86+.14*(pos.getY(i)+1)/.9));
  hp.computeVertexNormals();
  oval(head,skin,0,-.018,.126,.016,.025,.022);
  for(const side of [-1,1]) {
    oval(head,M.cloth[0],side*.049,.024,.118,.025,.011,.009);
    oval(head,M.hair,side*.048,.024,.126,.008,.010,.004);
    const brow = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side*.027,.056,.119),new THREE.Vector3(side*.049,.061,.120),new THREE.Vector3(side*.070,.053,.110)
    ]);
    head.add(new THREE.Mesh(new THREE.TubeGeometry(brow,8,.0035,4,false),M.hair));
  }
  const smile = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.021,-.070,.117),new THREE.Vector3(0,-.075,.122),new THREE.Vector3(.023,-.067,.116)
  ]);
  head.add(new THREE.Mesh(new THREE.TubeGeometry(smile,10,.0028,4,false),M.terracotta));
  for(const side of [-1,1]) oval(head,skin,side*.134,-.015,-.005,.024,.041,.024);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(1,18,12,0,TAU,0,Math.PI*.62),M.hair);
  hair.scale.set(.145,.19,.143);hair.position.set(0,.025,-.015);head.add(hair);
  for(let i=0;i<5;i++) {
    const fringe=oval(head,M.hair,(i-2)*.043,.115+Math.sin(i+look)*.018,.091,.042,.068,.035);
    fringe.rotation.z=(i-2)*.2-.12;
  }
  if(role==='laundry') oval(head,M.hair,.025,.085,-.14,.079,.084,.06);
  else {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(.146,.145,.035,20,1,true),M.cloth[0]);
    band.scale.z=.94;band.position.y=.085;head.add(band);
    oval(head,M.cloth[0],-.13,.07,-.07,.04,.025,.025);
  }
  const arms = [-1,1].map(side => {
    const pivot=new THREE.Group(); pivot.position.set(side*.18,1.09+waist,0);body.add(pivot);
    oval(pivot,cloth,side*.012,-.045,0,.088,.115,.09);
    const sleeve = drape(pivot,cloth,[[.108,-.32],[.12,-.27],[.10,-.12],[.085,-.04]],.88,side);
    sleeve.rotation.z=side*-.10;
    const forearm=new THREE.Group();forearm.position.set(side*.022,-.28,.01);forearm.rotation.x=-.18;pivot.add(forearm);
    oval(forearm,skin,0,-.10,0,.047,.14,.047);
    oval(forearm,skin,0,-.23,.012,.051,.065,.037);
    oval(forearm,skin,-side*.042,-.212,.035,.021,.037,.021);
    pivot.rotation.z=side*.08;
    return pivot;
  });
  if(role==='sweeper') { torso.rotation.x=.065; head.rotation.x=.07; }
  body.scale.setScalar(.96+look*.07);
  return { body, head, arms };
}
