import {clamp} from './route.js';
export class Input {
  constructor(canvas,actions) {
    this.keys=new Set();this.jumpQueued=false;this.useQueued=false;this.pad={x:0,s:0};this.touchJump=false;this.touchDuck=false;
    this.yaw=0;this.pitch=.12;this.distance=7.8;this.drag=null;this.gamepadOld=[];
    const controlKeys=new Set(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ControlLeft','ControlRight','KeyW','KeyA','KeyS','KeyD','KeyC','KeyE']);
    addEventListener('keydown',e=>{
      if(e.metaKey||e.altKey||e.ctrlKey&&!e.code.startsWith('Control')||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
      if(controlKeys.has(e.code))e.preventDefault();
      this.keys.add(e.code);
      if(e.repeat)return;
      if(e.code==='Space')this.jumpQueued=true;
      if(e.code==='KeyE')this.useQueued=true;
      if(e.code==='Escape'||e.code==='KeyP')actions.pause();
      if(e.code==='KeyM')actions.sound();
      if(e.code==='KeyR')actions.reset();
      if(e.code==='KeyF')actions.ride();
      if(e.code==='KeyQ'){this.yaw=0;this.pitch=.12;this.distance=7.8;}
    });
    addEventListener('keyup',e=>this.keys.delete(e.code));
    addEventListener('blur',()=>{this.clear();actions.blur();});
    canvas.addEventListener('pointerdown',e=>{this.drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{
      if(!this.drag||this.drag.id!==e.pointerId)return;
      this.yaw-=(e.clientX-this.drag.x)*.005;this.pitch=clamp(this.pitch+(e.clientY-this.drag.y)*.004,.05,.9);
      this.drag.x=e.clientX;this.drag.y=e.clientY;
    });
    const end=e=>{if(this.drag?.id===e.pointerId)this.drag=null;};
    canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
    canvas.addEventListener('wheel',e=>{e.preventDefault();this.distance=clamp(this.distance+e.deltaY*.008,4,14);},{passive:false});
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    const hold=(id,prop,queue)=>{
      const el=document.getElementById(id);let pointer=null;
      el.addEventListener('pointerdown',e=>{e.preventDefault();pointer=e.pointerId;el.setPointerCapture(pointer);this[prop]=true;if(queue)this[queue]=true;});
      const release=e=>{if(pointer===e.pointerId){this[prop]=false;pointer=null;}};
      el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);el.addEventListener('lostpointercapture',release);
    };
    hold('touch-jump','touchJump','jumpQueued');hold('touch-duck','touchDuck');
    document.getElementById('touch-use').addEventListener('pointerdown',e=>{e.preventDefault();this.useQueued=true;});
    const pad=document.getElementById('move-pad'),thumb=document.getElementById('thumb');let padId=null;
    const move=e=>{const b=pad.getBoundingClientRect(),x=clamp((e.clientX-b.x-b.width/2)/47,-1,1),s=clamp(-(e.clientY-b.y-b.height/2)/47,-1,1);this.pad={x,s};thumb.style.transform=`translate(${x*29}px,${-s*29}px)`;};
    pad.addEventListener('pointerdown',e=>{e.preventDefault();padId=e.pointerId;pad.setPointerCapture(padId);move(e);});
    pad.addEventListener('pointermove',e=>{if(e.pointerId===padId)move(e);});
    const release=e=>{if(e.pointerId===padId){padId=null;this.pad={x:0,s:0};thumb.style.transform='';}};
    pad.addEventListener('pointerup',release);pad.addEventListener('pointercancel',release);pad.addEventListener('lostpointercapture',release);
  }
  clear(){this.keys.clear();this.pad={x:0,s:0};this.touchJump=this.touchDuck=this.jumpQueued=this.useQueued=false;this.drag=null;}
  read(dt=1/60) {
    const k=this.keys;let x=(k.has('KeyD')||k.has('ArrowRight')?1:0)-(k.has('KeyA')||k.has('ArrowLeft')?1:0)+this.pad.x;
    let s=(k.has('KeyW')||k.has('ArrowUp')?1:0)-(k.has('KeyS')||k.has('ArrowDown')?1:0)+this.pad.s;
    let duck=this.touchDuck||k.has('KeyC')||k.has('ControlLeft')||k.has('ControlRight'),holdJump=this.touchJump||k.has('Space');
    let sprint=k.has('ShiftLeft')||k.has('ShiftRight')||Math.hypot(this.pad.x,this.pad.s)>.9;
    const gp=navigator.getGamepads?.()?.find(p=>p?.connected);
    if(gp){
      const dead=n=>Math.abs(n)>.15?n:0;x+=dead(gp.axes[0]);s-=dead(gp.axes[1]);
      this.yaw-=dead(gp.axes[2]||0)*dt*2;this.pitch=clamp(this.pitch+dead(gp.axes[3]||0)*dt,0.05,.9);
      if(gp.buttons[0]?.pressed&&!this.gamepadOld[0])this.jumpQueued=true;
      if(gp.buttons[2]?.pressed&&!this.gamepadOld[2])this.useQueued=true;
      holdJump ||= gp.buttons[0]?.pressed;duck ||= gp.buttons[1]?.pressed;sprint ||= gp.buttons[10]?.pressed;
      this.gamepadOld=gp.buttons.map(b=>b.pressed);
    }
    const jump=this.jumpQueued,use=this.useQueued;this.jumpQueued=this.useQueued=false;
    const cos=Math.cos(this.yaw),sin=Math.sin(this.yaw);
    return {x:x*cos-s*sin,s:s*cos+x*sin,jump,use,duck,holdJump,sprint};
  }
}
