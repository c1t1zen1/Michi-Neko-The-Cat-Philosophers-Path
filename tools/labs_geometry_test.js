import * as THREE from 'three';
import * as C from '../labs/shared/craft.js';
import * as Gate from '../labs/shrine/js/gate.js';
import * as Shrine from '../labs/shrine/js/recipes.js';
import { M } from '../labs/shared/painted.js';
import * as Garden from '../labs/garden/js/kit.js';
import * as Lanterns from '../labs/lanterns/js/kit.js';
import * as Critters from '../labs/critters/js/kit.js';
import * as Fences from '../labs/fences/js/kit.js';
import { gableRoofGeometry } from '../labs/shared/architecture.js';
const review = { THREE, C, Gate, Garden, Lanterns, Critters, Fences };

// Browser-side geometric regressions use raycasts and bounds, not source matching.
function runChecks() {
 const {THREE:T,C,Gate,Garden,Lanterns,Critters,Fences}=review;const results=[];const check=(name,condition,detail='')=>results.push({name,pass:!!condition,detail});
 const down=(geo,x,z,top=10)=>{const m=new T.Mesh(geo,new T.MeshBasicMaterial({side:T.DoubleSide}));m.updateMatrixWorld();const ray=new T.Raycaster(new T.Vector3(x,top,z),new T.Vector3(0,-1,0));return ray.intersectObject(m).map(h=>h.point.y)};
 for(const [kind,sori] of [['myojin',Gate.SORI.myojin],['myojin',Gate.SORI.deep],['ishi',Gate.SORI.gentle],['shinmei',Gate.SORI.straight],['kasuga',Gate.SORI.gentle]]) {
  const opts={kind,sori,lean:kind==='shinmei'?0:.03};const parts=Gate.gateParts(opts);const beam=parts.find(p=>p.name===(kind==='shinmei'||kind==='kasuga'?'kasagi':'shimaki'));
  for(const sign of [-1,1]) {const x=sign*(1.8-opts.lean*4.6);const ys=down(beam.geo,x,0);const gap=Math.min(...ys)-4.6;check(`${kind} ${sori[4]} post ${sign} bears on lintel`,gap<.005&&gap>-.08,`gap ${gap.toFixed(4)} m`);}
 }
 const weatherRoof=gableRoofGeometry(6.6,4.2,1);check('Weather roof ridge sheds to both eaves',down(weatherRoof,0,.001)[0]>down(weatherRoof,0,2)[0]&&down(weatherRoof,0,.001)[0]>down(weatherRoof,0,-2)[0]);
 const roof=Gate.hallRoofSurface({w:3.1,d:2.5,ridge:1.15,over:.55,sori:.2});check('Shrine roof ridge sheds to both eaves',down(roof,0,.001)[0]>down(roof,0,1.7)[0]&&down(roof,0,.001)[0]>down(roof,0,-1.7)[0]);
 const k={THREE:T,...C,M};
 for(const [style,depth] of [['nagare',2.5],['shinmei',2.6],['kasuga',2.3]]) {
  const hall=Shrine.hallOf(k,style);hall.updateMatrixWorld(true);
  const approach=new T.Raycaster(new T.Vector3(0,1.1,depth/2+.28),new T.Vector3(0,0,-1));
  check(`${style} stair approach clears the railing`,approach.intersectObject(hall,true).every(h=>h.distance>.1));
  if(style==='kasuga') {
   const beam=hall.getObjectByName('Kasuga porch bearing beam'),roof=hall.getObjectByName('Kasuga porch roof');
   const beamBox=new T.Box3().setFromObject(beam);
   hall.children.filter(o=>o.name==='Kasuga porch pillar').forEach((post,i)=>{
    const box=new T.Box3().setFromObject(post);
    const ray=new T.Raycaster(new T.Vector3(post.position.x,4,post.position.z),new T.Vector3(0,-1,0));
    const soffit=Math.min(...ray.intersectObject(roof).map(h=>h.point.y));
    check(`Kasuga porch pillar ${i+1} carries beam and canopy`,box.max.y>=beamBox.min.y&&beamBox.max.y>=soffit-.005&&beamBox.max.y<soffit+.04);
   });
  }
 }
 const b=Critters.butterfly('#f0b42a',3);b.updateMatrixWorld(true);const l=new T.Box3().setFromObject(b.userData.wings[0]),r=new T.Box3().setFromObject(b.userData.wings[1]);check('Butterfly wings straddle thorax',l.min.x>=-.0001&&r.max.x<=.0001&&r.min.x<-.1&&l.max.x>.1);
 const koi=Critters.koiGeometry();koi.computeBoundingBox();check('Koi tail extends behind body',koi.boundingBox.min.z<-.75&&koi.boundingBox.max.z>.5);
 const lamp=Lanterns.toro('kotoji');const legs=lamp.userData.parts.leg;for(let i=0;i<legs.length;i++){legs[i].geometry.computeBoundingBox();check(`Kotoji leg ${i+1} reaches lamp`,legs[i].geometry.boundingBox.max.y>=.68);}
 const kasuga=Lanterns.toro('kasuga');kasuga.updateMatrixWorld(true);const a=Math.PI/6,ray=new T.Raycaster(new T.Vector3(Math.sin(a)*4,1.31,Math.cos(a)*4),new T.Vector3(-Math.sin(a),0,-Math.cos(a)));const hit=ray.intersectObject(kasuga,true)[0];check('Lantern aperture opens into firebox',hit&&hit.distance>3.94,hit?.distance.toFixed(3));
 const shishi=Garden.shishiOdoshi();const events=[];const s=Garden.shishiOdoshi({onClack:()=>events.push(1)});let min=9,max=-9;for(let i=0;i<1000;i++){s.update(1/60);min=Math.min(min,s.S.a);max=Math.max(max,s.S.a);}check('Sozu completes multiple clacks',events.length>=2,`${events.length} clacks`);check('Sozu tips then returns',min<-.55&&max>=.61,`${min.toFixed(2)} to ${max.toFixed(2)}`);
 if(s.pose){s.S.a=-.6;s.S.tipping=.6;s.pose();check('Pour mouth stays above basin water',s.mouth.y>.195);check('Feeder outlet above resting receiver',shishi.outlet.y>shishi.mouth.y);}
 const basin=Garden.gardenBasin?.();if(basin){const ys=down(basin.geometry,.05,0);check('Basin centre is recessed below rim',ys.length>0&&Math.max(...ys)<.1,JSON.stringify(ys));}
 for(const [label,obj] of [['torii',Gate.buildGate()],['shishi',shishi.group],['lamp',lamp],['fence',Fences.fence(Fences.straight(4),'koetsu')],['butterfly',b]]){let finite=true;obj.traverse(o=>{const a=o.geometry?.attributes.position?.array;if(a)for(const v of a)if(!Number.isFinite(v))finite=false;if(o.instanceMatrix)for(const v of o.instanceMatrix.array)if(!Number.isFinite(v))finite=false;});check(`${label} geometry finite`,finite);}
 return results;
};

window.__geometryResults = runChecks();
const failed = window.__geometryResults.filter(r => !r.pass);
document.title = failed.length ? 'FAIL: lab geometry' : 'PASS: lab geometry';
const list = document.querySelector('ol');
for (const result of window.__geometryResults) {
  const li = document.createElement('li');
  li.textContent = (result.pass ? 'PASS ' : 'FAIL ') + result.name + (result.detail ? ' — ' + result.detail : '');
  li.style.color = result.pass ? '#285a32' : '#a52920'; list.append(li);
}
document.querySelector('p').textContent = (window.__geometryResults.length - failed.length) + '/' + window.__geometryResults.length + ' passed';
console.log(JSON.stringify(window.__geometryResults));
