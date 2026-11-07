import * as THREE from 'three';
import { CatWalker } from '../../shared/catwalk.js';
import { FLOOR,JUMP_SPEED,blockedAt,supportAt,advanceVertical,findPath,bat,contains } from './physics.js';

export class InteriorCat extends CatWalker {
  constructor({room,dom,camera,onMessage}) {
    const parent=new THREE.Group();room.scene.add(parent);
    super({parent,dom,camera,heightAt:()=>FLOOR,bounds:room.bounds,start:{x:-.55,z:room.d/2-.47,heading:Math.PI}});
    this.room=room;this.onMessage=onMessage;this.velocityY=0;this.grounded=true;this.route=[];this.intent=null;this.touring=false;this.tourIndex=0;this.sleeping=false;this.hop=null;this.y=FLOOR;
    this.blocked=(x,z)=>blockedAt(this.room,x,z,this.y);
    addEventListener('keydown',(e)=>{
      if(!this.active||e.metaKey||e.ctrlKey||e.altKey||e.target.closest?.('button,input,select,textarea,a'))return;
      if(e.code==='Space'){e.preventDefault();if(!e.repeat)this.jump();}
      if(e.code==='KeyE'){e.preventDefault();if(!e.repeat)this.batCup();}
    });
  }
  setRoom(room) {
    this.parent.removeFromParent();room.scene.add(this.parent);this.room=room;this.bounds=room.bounds;this.y=FLOOR;this.velocityY=0;this.grounded=true;this.cancel();this.pos.set(-.55,room.d/2-.47);this.root.position.set(this.pos.x,this.y,this.pos.y);this.eyeInit=false;
  }
  cancel(){this.route=[];this.intent=null;this.hop=null;this.touring=false;this.target=null;this.wp=null;this.speed=0;this.keys.clear();this.mode='drive';this.wake();}
  wake(){if(this.sleeping){this.sleeping=false;this.cat?.endIdleAction();}}
  goTo(x,z,{intent=null,keepTour=false}={}) {
    this.wake();this.hop=null;if(!keepTour)this.touring=false;
    const path=findPath(this.room,{x:this.pos.x,z:this.pos.y},{x,z},this.y);
    if(!path){this.onMessage('That path is closed. Slide the screens open, or try another patch of floor.');return false;}
    this.route=path;this.intent=intent;this.target=null;this.mode='drive';return true;
  }
  _click(e) {
    if(!this.clickToGo)return;
    const rect=this.dom.getBoundingClientRect();this.ray.setFromCamera({x:(e.clientX-rect.left)/rect.width*2-1,y:1-(e.clientY-rect.top)/rect.height*2},this.getCamera());
    const p=this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-FLOOR),new THREE.Vector3());if(!p)return;
    // Test the real top plane before the floor: perspective clicks agree with the image.
    let platform=null,nearest=this.ray.ray.origin.distanceTo(p);
    if(this.room.state.step>=5)for(const k of this.room.platforms){const top=this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-k.top),new THREE.Vector3());if(top&&contains(k,top.x,top.z)&&this.ray.ray.origin.distanceTo(top)<nearest){nearest=this.ray.ray.origin.distanceTo(top);platform=k;}}
    if(platform){this.hopOnto(platform);this.dom.focus({preventScroll:true});return;}
    this.goTo(THREE.MathUtils.clamp(p.x,this.bounds.x0,this.bounds.x1),THREE.MathUtils.clamp(p.z,this.bounds.z0,this.bounds.z1));
    this.dom.focus({preventScroll:true});
  }
  jump(){if(!this.grounded)return;this.wake();this.touring=false;this.velocityY=JUMP_SPEED;this.grounded=false;this.cat?.onJump();}
  hopOnto(platform=null) {
    if(this.room.state.step<5){this.onMessage('Add the furniture in construction pass 05 first.');return;}
    const p=platform||this.room.platforms.find(p=>/table|desk|workbench|futon/.test(p.name));
    if(!p){this.onMessage('This formal tea room leaves the floor open. Space still makes a lovely little jump.');this.jump();return;}
    const x=(p.x0+p.x1)/2,z=(p.z0+p.z1)/2;
    if(this.grounded&&Math.abs(this.y-p.top)<.04){this.onMessage('Already on the furniture. E gives a nearby cup a gentle nudge.');return;}
    const candidates=[{x,z:p.z1+.29},{x:p.x1+.29,z},{x:p.x0-.29,z},{x,z:p.z0-.29}].sort((a,b)=>Math.hypot(a.x-this.pos.x,a.z-this.pos.y)-Math.hypot(b.x-this.pos.x,b.z-this.pos.y));
    for(const approach of candidates)if(!blockedAt(this.room,approach.x,approach.z,FLOOR)&&this.goTo(approach.x,approach.z,{intent:{type:'hop',p,x,z}})){this.onMessage(`Michi is finding a good spot to jump onto the ${p.name}.`);return;}
    this.onMessage('Walk back onto the floor to find a clear approach.');
  }
  nap(){this.goTo(this.room.nap.x,this.room.nap.z,{intent:{type:'nap'}});this.onMessage('A cushion by the window. That will do nicely.');}
  tour(){this.cancel();this.touring=true;this.tourIndex=0;this.nextTour();this.onMessage('Michi is taking a quiet stroll. Walk or click to take over.');}
  nextTour(){const {w,d}=this.room;const points=[[-w/2+.6,d/2-.45],[w/2-.45,d/2-.4],[w/2-.35,-d/2+.37],[-.15,-d/2+.28],[-w/2+.6,d/2-.45]];for(let i=0;i<points.length;i++){const p=points[this.tourIndex++%points.length];if(this.goTo(p[0],p[1],{keepTour:true}))return;}this.touring=false;}
  batCup(){
    let nearest=null,dist=.65;
    for(const k of this.room.knockables){const d=Math.hypot(k.mesh.position.x-this.pos.x,k.mesh.position.z-this.pos.y);if(!k.active&&d<dist&&Math.abs(k.mesh.position.y-this.y)<.3){nearest=k;dist=d;}}
    if(nearest){bat(nearest,this.pos.x,this.pos.y);this.cat?.setMood('playful',2,2);this.cat?.triggerMeow?.();this.onMessage('A small nudge. The cups are unbreakable here.');}
    else this.onMessage('Hop up and get close to a cup, then press E. “Put the cups back” resets them.');
  }
  update(dt) {
    if(this.keys.size){this.route=[];this.intent=null;this.hop=null;this.touring=false;this.wake();}
    if(this.sleeping){this.speed=0;this.cat?.update(dt,0,true);return;}
    if(this.hop){
      this.velocityY-=14*dt;const nextY=this.y+this.velocityY*dt;
      const nx=this.pos.x+this.hop.vx*dt,nz=this.pos.y+this.hop.vz*dt;
      if(!blockedAt(this.room,nx,nz,nextY)){this.pos.set(nx,nz);}
      this.y=nextY;
      if(this.velocityY<0&&this.y<=this.hop.p.top&&supportAt([this.hop.p],this.pos.x,this.pos.y)>=this.hop.p.top){this.y=this.hop.p.top;this.velocityY=0;this.grounded=true;this.hop=null;this.cat?.onLand();this.onMessage('A soft landing. Move about, or press E near a cup.');}
      else if(this.y<=FLOOR){this.y=FLOOR;this.velocityY=0;this.grounded=true;this.hop=null;}
      this.speed=1;
    } else {
      if(this.route.length){const p=this.route[0];this.target=new THREE.Vector2(p.x,p.z);if(Math.hypot(this.pos.x-p.x,this.pos.y-p.z)<.19)this.route.shift();}
      this._steer(dt,this.getCamera(),false);
      if(this.route.length===0&&this.intent&&this.grounded){
        const action=this.intent;this.intent=null;this.target=null;this.speed=0;
        if(action.type==='nap'){this.sleeping=true;this.cat?.startIdleAction('sleep',3600);}
        if(action.type==='hop'){
          const t=(JUMP_SPEED+Math.sqrt(JUMP_SPEED**2-28*(action.p.top-this.y)))/14;
          this.hop={p:action.p,vx:(action.x-this.pos.x)/t,vz:(action.z-this.pos.y)/t};this.heading=Math.atan2(this.hop.vx,this.hop.vz);this.velocityY=JUMP_SPEED;this.grounded=false;this.cat?.onJump();
        }
      }
      if(this.touring&&this.route.length===0&&!this.target)this.nextTour();
      const platforms=this.room.state.step>=5?this.room.platforms:[];
      const next=advanceVertical(this.y,this.velocityY,dt,platforms,this.pos.x,this.pos.y);
      if(next.grounded&&!this.grounded)this.cat?.onLand();
      this.y=next.y;this.velocityY=next.velocity;this.grounded=next.grounded;
    }
    this.root.position.set(this.pos.x,this.y+.012,this.pos.y);this.root.rotation.y=this.heading;
    this.cat?.update(dt,this.hop?0:this.speed,this.grounded,this.sprintNow,this.turning);
  }
}
