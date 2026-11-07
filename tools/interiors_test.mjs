// Node-only invariants for Kyoto room dimensions, click routes and jump/landing.
// Run: node tools/interiors_test.mjs
import assert from 'node:assert/strict';
import { LAYOUTS,ROOMS,UNIT,validateLayout } from '../labs/interiors/js/data.js';
import { FLOOR,JUMP_SPEED,GRAVITY,contains,supportAt,blockedAt,findPath,advanceVertical } from '../labs/interiors/js/physics.js';

let checks=0;
function check(name,fn){fn();checks++;console.log('OK   '+name);}
for(const [name,l]of Object.entries(LAYOUTS))check(`${name}: full coverage, no overlap, no four-corner junction`,()=>assert.ok(validateLayout(l)));
check('Kyōma module and six-mat footprint',()=>{assert.equal(UNIT,.955);assert.equal(LAYOUTS.six.w*UNIT,3.82);assert.ok(Math.abs(LAYOUTS.six.d*UNIT-2.865)<1e-9);});
check('A crossed four-mat junction is rejected',()=>assert.equal(validateLayout({w:4,d:2,mats:[[0,0,2,1],[2,0,2,1],[0,1,2,1],[2,1,2,1]]}),false));
check('Overlapping mats are rejected',()=>assert.equal(validateLayout({w:2,d:1,mats:[[0,0,2,1],[0,0,1,1]]}),false));
check('Twelve unique room studies, three per family',()=>{assert.equal(ROOMS.length,12);assert.equal(new Set(ROOMS.map(r=>r.id)).size,12);for(const f of ['tea','daily','season','night'])assert.equal(ROOMS.filter(r=>r.family===f).length,3);});
check('All recipes have a valid floor plan',()=>{for(const r of ROOMS)assert.ok(LAYOUTS[r.layout]);});
check('Formal tea uses the sparse ceremonial furnishing',()=>assert.equal(ROOMS.find(r=>r.id==='sukiya').furniture,'ceremony'));
const table={x0:-.8,x1:.6,z0:-.45,z1:.55,top:.59,name:'table'};
const chest={x0:-1.86,x1:-1.44,z0:-1.5,z1:-.74,top:.78,name:'chest'};
const fixture={w:3.82,d:3.82,bounds:{x0:-1.72,x1:2.67,z0:-1.72,z1:1.72},state:{step:6},solids:[table,chest],platforms:[table,chest],panels:[0,1,2,3].map(i=>({root:{position:{z:-1.91+.955*(i+.5)}}}))};
check('Floor support is stable',()=>assert.equal(supportAt(fixture.platforms,1,1),FLOOR));
check('Table support has the actual top height',()=>assert.equal(supportAt(fixture.platforms,0,0),.59));
check('A cat below a tabletop cannot teleport onto it',()=>assert.equal(supportAt(fixture.platforms,0,0,FLOOR),FLOOR));
check('Furniture blocks a walking cat',()=>assert.ok(blockedAt(fixture,0,0,FLOOR)));
check('A cat above the table can cross its edge',()=>assert.equal(blockedAt(fixture,0,0,.65),false));
check('Closed screens block access to engawa',()=>assert.ok(blockedAt(fixture,1.93,1.2,FLOOR)));
check('A closed screen cannot be crossed with an ordinary jump',()=>assert.ok(blockedAt(fixture,1.93,1.2,1.2)));
check('Room edges prevent falls',()=>assert.ok(blockedAt(fixture,4,4,1)));
check('Construction pass 01 has no invisible furniture',()=>{fixture.state.step=1;assert.equal(blockedAt(fixture,0,0,FLOOR),false);fixture.state.step=6;});
check('Click route navigates around the table',()=>{
  const path=findPath(fixture,{x:-1.1,z:1.2},{x:1.2,z:-1.2});assert.ok(path?.length>4);
  for(const p of path)assert.equal(blockedAt(fixture,p.x,p.z,FLOOR),false);
});
check('A click inside solid furniture is refused',()=>assert.equal(findPath(fixture,{x:-1,z:1.2},{x:0,z:0}),null));
check('Closed screen refuses a route to the veranda',()=>assert.equal(findPath(fixture,{x:1.2,z:1.2},{x:2.4,z:1.2}),null));
check('Opening screens makes the veranda reachable',()=>{fixture.panels.forEach((p,i)=>p.root.position.z-=i*.7);assert.ok(findPath(fixture,{x:1.2,z:1.2},{x:2.4,z:1.2}));});
check('Running jump has enough height for all furniture',()=>assert.ok(JUMP_SPEED**2/(2*GRAVITY)+FLOOR>chest.top));
for(const hz of [30,60,120])check(`Jump lands on the table at ${hz} Hz`,()=>{
  let y=FLOOR,velocity=JUMP_SPEED,landed=false,apex=y;
  for(let i=0;i<hz*3;i++){const next=advanceVertical(y,velocity,1/hz,[table],0,0);y=next.y;velocity=next.velocity;apex=Math.max(apex,y);if(next.grounded&&y===table.top){landed=true;break;}}
  assert.ok(landed);assert.ok(apex>table.top);
});
check('Walking off a platform falls back to the floor',()=>{let y=.59,v=0;for(let i=0;i<100;i++){const n=advanceVertical(y,v,1/60,[table],1.2,1.2);y=n.y;v=n.velocity;}assert.equal(y,FLOOR);assert.equal(v,0);});
check('Circular furniture uses a circular footprint',()=>{const p={...table,round:{x:0,z:0,r:.7}};assert.equal(contains(p,.65,.65),false);assert.equal(contains(p,.4,.2),true);});
console.log(`\n${checks} interiors checks passed.`);
