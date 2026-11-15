import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {CatMotor,PHYS} from '../js/physics.js';
import {CHAPTERS,DURATION,CAR_LENGTH,CAR_PITCH,CAR_COUNT,TRAIN_LENGTH,ENTRY,EXIT,FLOOR,POSTCARDS,routeAt,inGap,roofHeight} from '../js/route.js';
const idle={x:0,s:0,jump:false,holdJump:false,duck:false,sprint:false};
function run(m,seconds,input={},start=0){for(let i=0;i<Math.ceil(seconds*120);i++)m.step(1/120,{...idle,...input},start+i/120);}
function onRoof(s=10){const m=new CatMotor();m.restore({s,mode:'roof'});return m;}

test('twelve continuous scenic chapters make an exact 30-minute journey',()=>{
  assert.equal(CHAPTERS.length,12);assert.equal(CHAPTERS[0].start,0);
  CHAPTERS.forEach((c,i)=>{assert.equal(c.end-c.start,150);if(i)assert.equal(c.start,CHAPTERS[i-1].end);assert.equal(routeAt(c.start+1).c,c);});
  assert.equal(CHAPTERS.at(-1).end,DURATION);assert.equal(DURATION,30*60);assert.equal(routeAt(DURATION+300).speed,0);
});
test('Fuji is left, sea is right, tunnels and viaducts have authored reveals',()=>{
  assert.equal(CHAPTERS.find(c=>c.id==='fuji').side,'left');assert.equal(CHAPTERS.find(c=>c.id==='suruga').side,'right');
  assert.equal(CHAPTERS.filter(c=>c.tunnel).length,2);assert.equal(CHAPTERS.filter(c=>c.bridge).length,2);
  for(const c of CHAPTERS.filter(c=>c.tunnel)){assert.equal(routeAt(c.start).tunnel,0);assert.ok(routeAt(c.start+75).tunnel>.9);assert.equal(routeAt(c.end-.1).tunnel,0);}
});
test('boarding lands on the rear roof with no fall state',()=>{
  const m=new CatMotor();assert.equal(m.board(),true);run(m,1.5);assert.equal(m.mode,'roof');assert.equal(m.grounded,true);assert.equal(m.s,13);assert.ok(Math.abs(m.y-roofHeight(m.x))<.01);
});
test('all fifteen gaps stop walking and remain jumpable in both directions',()=>{
  for(let car=0;car<CAR_COUNT-1;car++){
    const edge=car*CAR_PITCH+CAR_LENGTH;
    for(const direction of [-1,1]){
      const start=direction===1?edge-1:edge+(CAR_PITCH-CAR_LENGTH)+1;
      const m=onRoof(start);run(m,.8,{s:direction,duck:true},0);
      assert.equal(inGap(m.s),false,'walking is held safely before the seam');
      m.restore({s:start,mode:'roof'});m.step(1/120,{...idle,s:direction,jump:true,holdJump:true},0);
      run(m,.85,{s:direction,holdJump:true},.01);
      assert.ok(direction===1?m.s>edge+.85:m.s<edge,'jump reaches the next solid roof');
      assert.equal(m.grounded,true);assert.equal(m.setbacks,0);
    }
  }
});
test('short jumps which land in the seam catch a roof lip softly',()=>{
  const m=onRoof(24.5);m.grounded=false;m.y=4.4;m.vy=-1;m.s=25.4;run(m,.12);
  assert.equal(m.grounded,true);assert.equal(inGap(m.s),false);assert.equal(m.setbacks,1);assert.ok(m.y>=3.9);
});
test('roof edges are safe under extreme sideways input and half an hour of gusts',()=>{
  const m=onRoof(50);
  for(let i=0;i<DURATION*60;i++){
    m.step(1/60,{...idle,x:i%1200<600?1:-1},i/60);
    assert.ok(Math.abs(m.x)<=1.48);assert.ok(m.y>=3.8);assert.equal(m.mode,'roof');
  }
  assert.ok(m.setbacks>0,'un-ducked hoops only create bounded setbacks');
});
test('crouching passes every low hoop, standing creates a small recovery',()=>{
  const crouched=onRoof(100),standing=onRoof(100);
  run(crouched,120,{duck:true});run(standing,120);
  assert.equal(crouched.setbacks,0);assert.ok(standing.setbacks>=6);assert.ok(standing.s>70);
  assert.equal(standing.mode,'roof');
});
test('coach and café are a connected walkable interior with two working hatches',()=>{
  const m=onRoof(ENTRY);assert.equal(m.interact(),'enter');assert.equal(m.y,FLOOR);assert.equal(m.coachVisited,true);
  run(m,50,{s:1,sprint:true},600);assert.equal(m.cafeVisited,true);assert.ok(m.s>=EXIT-1);
  assert.equal(m.interact(),'exit');assert.equal(m.mode,'roof');assert.equal(m.y,roofHeight(0));
  m.restore({s:ENTRY,mode:'roof'});m.interact();m.step(1/60,{...idle,s:-1},700);assert.equal(m.interact(),'exit','rear hatch also provides a return route');
});
test('tea, postcards and save restoration survive an interior visit',()=>{
  const m=onRoof(ENTRY);m.interact();m.s=8*CAR_PITCH+10;assert.equal(m.interact(),'tea');assert.equal(m.hadTea,true);
  const copy=new CatMotor();assert.equal(copy.restore(JSON.parse(JSON.stringify(m.save()))),true);assert.equal(copy.mode,'interior');assert.equal(copy.hadTea,true);
  assert.equal(copy.coachVisited,true);assert.equal(copy.y,FLOOR);assert.equal(POSTCARDS.length,8);
});
test('invalid and out-of-range restored positions cannot put Michi off the train',()=>{
  const m=new CatMotor();assert.equal(m.restore({s:NaN}),false);
  m.restore({s:Infinity});assert.equal(m.mode,'overpass');m.restore({s:1e8,x:1e8});assert.equal(m.s,TRAIN_LENGTH-5);assert.ok(Math.abs(m.x)<=.5);
  m.restore({s:25.5});assert.equal(inGap(m.s),false);
  m.restore({s:-999,mode:'interior'});assert.equal(m.s,ENTRY);
});
test('an actual Blender GLB and editable source contain every required stage asset',()=>{
  const kit=readFileSync(new URL('../assets/eastbound-kit.glb',import.meta.url));assert.equal(kit.readUInt32LE(0),0x46546c67);assert.equal(kit.readUInt32LE(4),2);assert.equal(kit.readUInt32LE(8),kit.length);
  const manifest=JSON.parse(readFileSync(new URL('../assets/manifest.json',import.meta.url),'utf8'));
  for(const name of ['coach_shell','coach_roof','nose','seat_pair','cafe_counter','tea_set','tree','cottage','fuji','tunnel_ring','viaduct','tokyo_tower'])assert.ok(manifest.assets.find(a=>a.name===name&&a.triangles>0),name);
  assert.ok(statSync(new URL('../blender/eastbound.blend',import.meta.url)).size>100000);assert.ok(kit.length<1_500_000);
});
