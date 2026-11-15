// Pure fixed-step motor; all setbacks stay on a solid, bounded surface.
import { CAR_LENGTH,CAR_PITCH,TRAIN_LENGTH,ENTRY,EXIT,FLOOR,clamp,inGap,roofHeight,windAt } from './route.js';
export const PHYS={ walk:2.9,sprint:4.5,jump:7.2,gravity:20,release:3.2,buffer:.15,halfWidth:.23 };
export class CatMotor {
  constructor() {
    this.s=10;this.x=-4.2;this.y=8.1;this.vx=0;this.vs=0;this.vy=0;
    this.mode='overpass';this.grounded=true;this.duck=false;this.recovery=0;this.jumpBuffer=0;
    this.boardTime=0;this.coachVisited=false;this.cafeVisited=false;this.hadTea=false;
    this.checkpoint={s:10,x:0};this.setbacks=0;this.lastEvent=null;this.distance=0;this.hoopCycle=null;
  }
  board() { if(this.mode!=='overpass')return false;this.mode='boarding';this.boardTime=0;return true; }
  interact() {
    if(this.mode==='overpass')return this.board()?'board':null;
    if(this.mode==='roof' && Math.abs(this.s-ENTRY)<3) {
      this.mode='interior';this.s=ENTRY;this.x=0;this.y=FLOOR;this.vy=0;this.grounded=true;
      this.coachVisited=true;return 'enter';
    }
    if(this.mode==='interior' && (Math.abs(this.s-ENTRY)<2.5||Math.abs(this.s-EXIT)<2.5)) {
      this.mode='roof';this.x=0;this.y=roofHeight(0);this.vy=0;this.grounded=true;
      this.checkpoint={s:this.s,x:0};return 'exit';
    }
    if(this.mode==='interior' && Math.abs(this.s-(8*CAR_PITCH+10))<4) {this.hadTea=true;return 'tea';}
    return null;
  }
  reset() {
    if(this.mode==='overpass'||this.mode==='boarding')return;
    this.mode='roof';this.s=this.checkpoint.s;this.x=this.checkpoint.x;this.y=roofHeight(this.x);
    this.vy=this.vx=this.vs=0;this.grounded=true;this.recovery=.8;
  }
  nudge(reason) {
    this.s=clamp(this.s-1.8,1,TRAIN_LENGTH-6);
    if(inGap(this.s))this.s=Math.floor(this.s/CAR_PITCH)*CAR_PITCH+CAR_LENGTH-.5;
    this.x=clamp(this.x,-1.4,1.4);this.y=roofHeight(this.x);this.vy=0;this.grounded=true;
    this.vs=0;this.recovery=1.1;this.setbacks++;this.lastEvent=reason;
  }
  step(dt,input,time) {
    this.lastEvent=null;this.recovery=Math.max(0,this.recovery-dt);
    if(this.mode==='boarding') {
      this.boardTime+=dt;const t=clamp(this.boardTime/1.45,0,1),u=t*t*(3-2*t);
      this.x=-4.2*(1-u);this.s=10+3*u;this.y=8.1+(roofHeight(0)-8.1)*u+Math.sin(t*Math.PI)*1.3;
      if(t===1){this.mode='roof';this.grounded=true;this.checkpoint={s:13,x:0};this.lastEvent='boarded';}return;
    }
    if(this.mode==='overpass') {if(input.jump)this.board();return;}
    this.duck=!!input.duck;
    if(input.jump)this.jumpBuffer=PHYS.buffer;else this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
    if(this.jumpBuffer>0&&this.grounded&&!this.duck&&this.recovery<.6) {
      this.vy=PHYS.jump;this.grounded=false;this.jumpBuffer=0;this.lastEvent='jump';
      // A small forward spring makes a standing seam jump forgiving too.
      if(Math.abs(input.s||0)>.1)this.vs=Math.sign(input.s)*Math.max(Math.abs(this.vs),2.4);
    }
    if(!input.holdJump&&this.vy>PHYS.release)this.vy=PHYS.release;
    let dx=input.x||0,ds=input.s||0;const len=Math.hypot(dx,ds);if(len>1){dx/=len;ds/=len;}
    const inside=this.mode==='interior',speed=(this.duck?1.1:input.sprint?PHYS.sprint:PHYS.walk)*(this.recovery>0?.3:1)*(inside?.8:1);
    const k=1-Math.exp(-dt*10);
    this.vx+=(dx*speed-this.vx)*k;this.vs+=(ds*speed-this.vs)*k;
    const oldS=this.s;
    this.x+=this.vx*dt+(!inside&&!this.duck?windAt(time)*dt*.24:0);
    this.s+=this.vs*dt;
    this.x=clamp(this.x,inside?-.56:-1.48,inside?.56:1.48);
    this.s=clamp(this.s,inside?ENTRY-1:1,inside?EXIT+1:TRAIN_LENGTH-5);
    if(!inside&&this.grounded&&inGap(this.s)) {
      this.s=oldS;this.vs=0;this.lastEvent='gap';
    }
    const floor=inside?FLOOR:roofHeight(this.x);
    if(!this.grounded) {
      this.vy-=PHYS.gravity*dt;this.y+=this.vy*dt;
      if(this.y<=floor){
        if(!inside&&inGap(this.s)){this.nudge('caught');}
        else{this.y=floor;this.vy=0;this.grounded=true;this.lastEvent='land';}
      }
    }else this.y=floor;
    if(inside&&this.s>8*CAR_PITCH)this.cafeVisited=true;
    const cycles=[0,1,2].map(i=>Math.floor((time*18+i*180-440)/540));
    if(this.hoopCycle&&!inside&&time>35&&time<1780&&this.recovery<=0&&cycles.some((v,i)=>v>this.hoopCycle[i])){
      if(this.duck)this.lastEvent='ducked';else this.nudge('hoop');
    }
    this.hoopCycle=cycles;
    if(this.grounded&&!inside&&!inGap(this.s)&&Math.abs(this.s-this.checkpoint.s)>24)this.checkpoint={s:this.s,x:0};
    this.distance+=Math.abs(this.s-oldS);
  }
  save() {
    return {s:this.s,x:this.x,mode:this.mode==='interior'?'interior':'roof',coachVisited:this.coachVisited,cafeVisited:this.cafeVisited,hadTea:this.hadTea};
  }
  restore(data) {
    if(!data||!Number.isFinite(data.s))return false;
    this.mode=data.mode==='interior'?'interior':'roof';
    this.s=clamp(data.s,this.mode==='interior'?ENTRY:1,this.mode==='interior'?EXIT:TRAIN_LENGTH-5);
    if(this.mode==='roof'&&inGap(this.s))this.s=Math.floor(this.s/CAR_PITCH)*CAR_PITCH+CAR_LENGTH-.5;
    this.x=clamp(Number(data.x)||0,-.5,.5);this.y=this.mode==='interior'?FLOOR:roofHeight(this.x);
    this.grounded=true;this.vy=this.vx=this.vs=0;this.recovery=0;this.jumpBuffer=0;this.duck=false;
    for(const k of ['coachVisited','cafeVisited','hadTea'])this[k]=!!data[k];
    this.checkpoint={s:this.s,x:0};this.hoopCycle=null;return true;
  }
}
