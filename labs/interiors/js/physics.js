// Pure navigation and collision helpers. These never import the main game.
export const FLOOR=.055, GRAVITY=14, JUMP_SPEED=5.6, CAT_RADIUS=.14;
export function contains(p,x,z,r=0) {
  if(p.round)return Math.hypot(x-p.round.x,z-p.round.z)<p.round.r+r;
  return x>p.x0-r&&x<p.x1+r&&z>p.z0-r&&z<p.z1+r;
}
export function supportAt(platforms,x,z,ceiling=Infinity) {
  let top=FLOOR;
  for(const p of platforms)if(!p.noLand&&p.top<=ceiling+.02&&contains(p,x,z,-.035))top=Math.max(top,p.top);
  return top;
}
export function blockedAt(room,x,z,y=FLOOR,r=CAT_RADIUS) {
  const b=room.bounds;
  if(x<b.x0||x>b.x1||z<b.z0||z>b.z1)return true;
  if(room.state.step>=5)for(const p of room.solids)if(y<p.top-.025&&contains(p,x,z,r))return true;
  if(room.state.step>=3&&Math.abs(x-room.w/2-.025)<r+.03) {
    for(const p of room.panels)if(Math.abs(z-p.root.position.z)<.955/2+r&&y<1.87)return true;
  }
  return false;
}

/** A small A* grid routes click-to-walk around the low furniture and screens. */
export function findPath(room,start,end,y=FLOOR) {
  const b=room.bounds,cell=.13,nx=Math.ceil((b.x1-b.x0)/cell)+1,nz=Math.ceil((b.z1-b.z0)/cell)+1;
  const at=(x,z)=>({x:Math.min(b.x1,b.x0+x*cell),z:Math.min(b.z1,b.z0+z*cell)});
  const snap=(p)=>[Math.max(0,Math.min(nx-1,Math.round((p.x-b.x0)/cell))),Math.max(0,Math.min(nz-1,Math.round((p.z-b.z0)/cell)))];
  const [sx,sz]=snap(start),[ex,ez]=snap(end),si=sz*nx+sx,ei=ez*nx+ex;
  if(blockedAt(room,end.x,end.z,y))return null;
  const open=[si],came=new Map(),g=new Map([[si,0]]),closed=new Set();
  const heuristic=(id)=>Math.hypot(id%nx-ex,Math.floor(id/nx)-ez);
  let rounds=0;
  while(open.length&&rounds++<5000) {
    let bi=0,best=Infinity;
    for(let i=0;i<open.length;i++){const score=g.get(open[i])+heuristic(open[i]);if(score<best){best=score;bi=i;}}
    const current=open.splice(bi,1)[0];
    if(current===ei){const path=[end];let id=current;while(came.has(id)){path.push(at(id%nx,Math.floor(id/nx)));id=came.get(id);}return path.reverse();}
    closed.add(current);const x=current%nx,z=Math.floor(current/nx);
    for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=nx||zz>=nz)continue;const id=zz*nx+xx;if(closed.has(id))continue;
      const p=at(xx,zz);if(blockedAt(room,p.x,p.z,y))continue;
      if(dx&&dz){const a=at(xx,z),bb=at(x,zz);if(blockedAt(room,a.x,a.z,y)||blockedAt(room,bb.x,bb.z,y))continue;}
      const score=g.get(current)+Math.hypot(dx,dz);
      if(score<(g.get(id)??Infinity)){came.set(id,current);g.set(id,score);if(!open.includes(id))open.push(id);}
    }
  }
  return null;
}

export function advanceVertical(y,velocity,dt,platforms,x,z) {
  const nextVelocity=velocity-GRAVITY*dt,nextY=y+nextVelocity*dt;
  const top=supportAt(platforms,x,z,y);
  if(nextVelocity<=0&&nextY<=top&&y>=top-.04)return {y:top,velocity:0,grounded:true};
  return {y:Math.max(FLOOR,nextY),velocity:nextY<FLOOR?0:nextVelocity,grounded:nextY<=FLOOR};
}

export function updateKnockables(room,dt,cat) {
  for(const k of room.knockables) {
    if(!k.active&&cat&&cat.y>.3&&Math.abs(cat.y-k.home.y)<.25&&Math.hypot(cat.pos.x-k.mesh.position.x,cat.pos.y-k.mesh.position.z)<.26&&cat.speed>.35)bat(k,cat.pos.x,cat.pos.y);
    if(!k.active||k.settled)continue;
    const oldY=k.mesh.position.y;k.velocity.y-=GRAVITY*dt;k.mesh.position.addScaledVector(k.velocity,dt);
    k.mesh.rotation.x+=k.spin.x*dt;k.mesh.rotation.z+=k.spin.z*dt;
    const surface=supportAt(room.platforms,k.mesh.position.x,k.mesh.position.z,oldY-.02)+.035;
    if(k.mesh.position.y<surface&&k.velocity.y<0){k.mesh.position.y=surface;k.velocity.y*=-.27;k.velocity.x*=.63;k.velocity.z*=.63;k.spin.multiplyScalar(.55);if(Math.abs(k.velocity.y)<.19){k.settled=true;k.velocity.set(0,0,0);}}
    k.mesh.position.x=Math.max(-room.w/2+.1,Math.min(room.w/2+.8,k.mesh.position.x));
    k.mesh.position.z=Math.max(-room.d/2+.1,Math.min(room.d/2-.1,k.mesh.position.z));
  }
}
export function bat(k,x,z) {
  if(k.active)return false;const dx=k.mesh.position.x-x,dz=k.mesh.position.z-z,dist=Math.hypot(dx,dz);
  k.active=true;k.settled=false;k.velocity.set((dist<.01?1:dx/dist)*1.35,1.65,(dist<.01?.4:dz/dist)*1.35);k.spin.set(3.5,0,5);return true;
}
