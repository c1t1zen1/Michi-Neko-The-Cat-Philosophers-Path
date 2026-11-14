// Behavioural checks for chosen branch lanes; exercises the actual Runner.
import assert from 'node:assert/strict';
import { buildLevel } from '../rooftops/js/level.js';
import { Autopilot } from '../rooftops/js/autopilot.js';
import { Runner } from '../rooftops/js/physics.js';
import { Companion } from '../rooftops/js/companion.js';
import { alleyDepth } from '../rooftops/js/alleys.js';
const L=buildLevel(), dt=1/120;
for(const a of L.alleys) {
  for(const dir of [1,-1]) {
    const r=new Runner(L), c=new Companion(L);
    r.reset(dir>0?a.s0+.8:a.s1-.8,0); c.reset(r);
    r.step(dt,{downPressed:true},0);
    assert.equal(r.alley,a.id, a.name+' chooses from either entrance');
    let minDepth=Infinity, jumped=false, landed=false, t=0;
    for(let i=1;i<3600;i++) {
      t=i*dt;
      // Continuous floor run proves exits; one hop in each court proves
      // landing cannot accidentally switch back to an overlapping main roof.
      const jump = Math.abs(r.s-(a.s0+a.s1)/2)<.05 && !jumped;
      if(jump) jumped=true;
      r.step(dt,{move:dir,downHeld:true,jumpPressed:jump,jumpHeld:true},t);
      c.update(dt,r,t,true);
      if(r.alley!==null) {
        assert.equal(r.ground?.alley ?? r.lastGround?.alley,a.id);
        assert.ok(Math.abs(r.depth-alleyDepth(a,r.s))<1e-6);
        minDepth=Math.min(minDepth,r.depth);
        if(jumped&&r.grounded) landed=true;
      } else break;
    }
    assert.equal(r.alley,null,a.name+' rejoins street');
    assert.ok(minDepth < -5.5,a.name+' enters block interior');
    assert.ok(jumped&&landed,a.name+' permits a jumping route');
    // Let both cats leave, including a reverse run from the far noren.
    for(let i=0;i<300;i++) { t+=dt;r.step(dt,{move:dir,downHeld:true},t);c.update(dt,r,t,true); }
    assert.equal(c.runner.alley,null,'companion leaves alley');
    assert.ok(Math.abs(c.runner.s-r.s)<8,'guide stays close through chosen lane');
  }
  // Run the raised agility sequence too: crates, shelves, coping, ropes,
  // and the laundry futon use real jumps rather than graph-only promises.
  const order=[a.plats[0],...a.plats.slice(3),a.plats[2]];
  const fixture={...L,platforms:L.platforms.map(p=>({...p,route:undefined}))};
  order.forEach((id,i)=>{fixture.platforms[id].route=i;fixture.platforms[id].sprint=true;});
  const agile=new Runner(fixture), auto=new Autopilot(fixture);
  agile.reset(a.s0+.8,0);agile.enterAlley(a);
  const visited=new Set();
  for(let i=0;i<120*45;i++) {const t=i*dt;agile.step(dt,{...auto.input(agile,t,dt),jumpHeld:true},t);if(agile.ground?.route!==undefined)visited.add(agile.ground.route);if(agile.lastGround?.kind==='futon')visited.add(agile.lastGround.route);if(auto.done)break;}
  assert.ok(auto.done,a.name+' raised route completes');
  assert.ok(order.every((_,i)=>visited.has(i)),a.name+' lands on every agility surface');
  // Reversal halfway through returns through the same entrance.
  const r=new Runner(L);r.reset(a.s0+.8,0);r.step(dt,{downPressed:true},0);
  let farthest=r.s;
  for(let i=1;i<2400;i++) { const dir=i<460?1:-1;r.step(dt,{move:dir,downHeld:true},i*dt);farthest=Math.max(farthest,r.s);if(r.alley===null)break; }
  assert.ok(farthest>a.s0+12);assert.equal(r.alley,null,'backtracking is safe');
  // Main-lane cats never land on the other lane's shelves by accident.
  const main=new Runner(L);main.reset((a.s0+a.s1)/2,20);
  assert.equal(main.ground?.alley,undefined);
}
assert.equal(L.alleys.length,6);
console.log('PASS six alleys: both entrances, jumps, exits, guide following, reversal and lane isolation');
