// Permanent, open passageways through the existing blocks. These are built
// once, in geometry: architecture never fades, clips or changes with the view.
// The old screen-door shader concealed solid walls crossing these lanes.
import * as THREE from 'three';
import { alleyDepth } from './alleys.js';

export function openAlleyPassages(group, level) {
  const passages = [];
  const routes=level.alleys.map(alley=>({s0:alley.s0,s1:alley.s1,at:s=>level.rail.place(s,alleyDepth(alley,s))}));
  // The safe street goes under the corner decks. Give it a genuine covered
  // gallery rather than leaving the lower route inside a solid house cube.
  for(const corner of level.pieces.filter(p=>p.type==='corner')) routes.push({
    s0:corner.s0-2,s1:corner.s1+2,corner:true,
    at:s=>{const floor=level.platforms.find(p=>p.kind==='street'&&p.alley===undefined&&s>=p.s0-.12&&s<=p.s1+.12);return level.rail.place(s,floor?.d??2.2);}
  });
  for (const route of routes) {
    for (let s = route.s0; s < route.s1; s += .5) {
      const end = Math.min(route.s1, s + .5);
      const a = route.at(s), b = route.at(end);
      const along = new THREE.Vector3(b.x-a.x,0,b.z-a.z), length=along.length(); along.normalize();
      const across = new THREE.Vector3(-along.z,0,along.x), center = new THREE.Vector3((a.x+b.x)/2,1.04,(a.z+b.z)/2);
      const axes = [along,new THREE.Vector3(0,1,0),across], extents = [length/2+.10,1.11,route.corner?1.2:.92];
      const planes = [];
      axes.forEach((axis,i) => { for(const sign of [-1,1]) { const n=axis.clone().multiplyScalar(sign);planes.push(new THREE.Plane(n,-n.dot(center)-extents[i])); } });
      const box = new THREE.Box3();
      for(const x of [-1,1]) for(const z of [-1,1]) for(const y of [-1,1]) box.expandByPoint(center.clone().addScaledVector(along,x*extents[0]).addScaledVector(across,z*extents[2]).addScaledVector(axes[1],y*extents[1]));
      passages.push({planes,box,center,axes,extents,corner:route.corner});
    }
  }
  group.updateMatrixWorld(true);
  const inverse=new THREE.Matrix4();
  group.traverse(mesh => {
    if (!mesh.isMesh) return;
    let parent=mesh;
    while(parent.parent!==group && parent.parent) parent=parent.parent;
    // Keep the lane's own paving, garden and agility structures intact.
    if (parent.userData.alleyRoute) return;
    mesh.geometry.computeBoundingBox();
    const bounds=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
    const nearby=passages.filter(p=>(!p.corner||parent.userData.corner)&&p.box.intersectsBox(bounds));
    if(!nearby.length) return;
    inverse.copy(mesh.matrixWorld).invert();
    const attributes=mesh.geometry.attributes, index=mesh.geometry.index;
    const vertices=[];
    const count=index?index.count:attributes.position.count;
    for(let i=0;i<count;i++) {
      const k=index?index.getX(i):i;
      vertices.push([attributes.position.getX(k),attributes.position.getY(k),attributes.position.getZ(k),
        attributes.normal?.getX(k)||0,attributes.normal?.getY(k)||0,attributes.normal?.getZ(k)||0,
        attributes.uv?.getX(k)||0,attributes.uv?.getY(k)||0]);
    }
    let triangles=vertices;
    const distance=(v,p)=>v[0]*p.normal.x+v[1]*p.normal.y+v[2]*p.normal.z+p.constant;
    function clip(poly,plane,inside) {
      const out=[];
      for(let i=0;i<poly.length;i++) {
        const a=poly[i],b=poly[(i+1)%poly.length],da=distance(a,plane),db=distance(b,plane);
        const keepA=inside?da<=1e-7:da>=-1e-7,keepB=inside?db<=1e-7:db>=-1e-7;
        if(keepA) out.push(a);
        if(keepA!==keepB) { const t=da/(da-db);out.push(a.map((v,k)=>v+(b[k]-v)*t)); }
      }
      return out;
    }
    function subtract(source, planes) {
      const out=[];
      for(let i=0;i<source.length;i+=3) {
        let poly=source.slice(i,i+3);
        if(planes.some(p=>poly.every(v=>distance(v,p)>-1e-7))) {out.push(...poly);continue;}
        for(const plane of planes) {
          const outside=clip(poly,plane,false);
          for(let k=1;k<outside.length-1;k++) out.push(outside[0],outside[k],outside[k+1]);
          poly=clip(poly,plane,true);
          if(poly.length<3) break;
        }
      }
      return out;
    }
    const cuts=nearby.map(p=>({passage:p,planes:p.planes.map(plane=>plane.clone().applyMatrix4(inverse))}));
    for(const cut of cuts) triangles=subtract(triangles,cut.planes);
    // Box walls get solid jambs and soffits on the new inner surfaces. Trim
    // these faces against the other passage sections so no seams block a bend.
    if(mesh.geometry.type==='BoxGeometry') {
      const box=mesh.geometry.boundingBox, boxPlanes=[];
      for(const axis of ['x','y','z']) for(const sign of [-1,1]) {
        const n=new THREE.Vector3();n[axis]=sign;
        boxPlanes.push(new THREE.Plane(n,sign<0?box.min[axis]:-box.max[axis]));
      }
      for(const cut of cuts) for(let axis=0;axis<3;axis++) for(const sign of [-1,1]) {
        const p=cut.passage, normal=cut.planes[axis*2+(sign>0?1:0)].normal.clone().negate();
        const u=(axis+1)%3,v=(axis+2)%3, faceCenter=p.center.clone().addScaledVector(p.axes[axis],sign*p.extents[axis]);
        let poly=[];
        for(const [su,sv] of [[-1,-1],[1,-1],[1,1],[-1,1]]) {
          const world=faceCenter.clone().addScaledVector(p.axes[u],su*p.extents[u]).addScaledVector(p.axes[v],sv*p.extents[v]);
          const local=world.clone().applyMatrix4(inverse);
          poly.push([...local.toArray(),...normal.toArray(),world.dot(p.axes[u])*.5,world.dot(p.axes[v])*.5]);
        }
        for(const plane of boxPlanes) poly=clip(poly,plane,true);
        if(poly.length<3) continue;
        const a=new THREE.Vector3(...poly[0].slice(0,3)),b=new THREE.Vector3(...poly[1].slice(0,3)),c=new THREE.Vector3(...poly[2].slice(0,3));
        if(b.sub(a).cross(c.sub(a)).dot(normal)<0) poly.reverse();
        let cap=[];
        for(let i=1;i<poly.length-1;i++) cap.push(poly[0],poly[i],poly[i+1]);
        for(const other of cuts) if(other!==cut) cap=subtract(cap,other.planes);
        triangles.push(...cap);
      }
    }
    const geo=new THREE.BufferGeometry(),pos=[],normals=[],uv=[];
    for(const v of triangles) {pos.push(...v.slice(0,3));normals.push(...v.slice(3,6));uv.push(...v.slice(6,8));}
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    mesh.geometry=geo;
  });
}
