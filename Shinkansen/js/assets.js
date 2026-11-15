import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {M,paintify} from '../../labs/shared/painted.js';

export async function loadKit(onProgress=()=>{}) {
  const gltf=await new GLTFLoader().loadAsync(new URL('../assets/eastbound-kit.glb',import.meta.url).href,e=>onProgress(e.total?e.loaded/e.total:0));
  const materials=new Map(),templates=new Map();
  const replace=m=>{
    if(materials.has(m.name))return materials.get(m.name);
    let out;
    switch(m.name){
      case 'timber':out=M.wood({base:0x987747,dark:0x58452b,brush:.07});break;
      case 'porcelain':out=paintify(new THREE.MeshStandardMaterial({color:0xf1f1dc,roughness:.42,metalness:.10}),{brush:.06,dab:12});break;
      case 'sage_cloth':out=M.cloth({color:0x63857b});break;
      case 'linen':out=M.plaster({tint:0xf0e1bc});break;
      case 'stone':out=M.stone({tint:0x8a9185});break;
      case 'window':out=new THREE.MeshStandardMaterial({color:0x537f8c,roughness:.24,metalness:.25});break;
      case 'brass':out=M.bronze({color:0xbd9859,metal:.55});break;
      case 'indigo':out=M.plain(0x244e6c,{rough:.5,brush:.07});break;
      case 'warm_light':out=new THREE.MeshStandardMaterial({color:0xffcf80,emissive:0xffb85e,emissiveIntensity:.65});break;
      case 'fuji':out=paintify(new THREE.MeshStandardMaterial({color:0x4d6f85,roughness:1}),{brush:.16,dab:.16});break;
      case 'snow':out=M.plain(0xe8efe5,{rough:1,brush:.12,dab:.3});break;
      default:out=paintify(m.clone(),{brush:.12,dab:m.name.startsWith('leaf')?2:8});
    }
    out.name=m.name;out.side=THREE.DoubleSide;materials.set(m.name,out);return out;
  };
  gltf.scene.traverse(o=>{
    if(o.isMesh){o.material=Array.isArray(o.material)?o.material.map(replace):replace(o.material);o.castShadow=true;o.receiveShadow=true;}
  });
  for(const c of gltf.scene.children)templates.set(c.name,c);
  return {templates,materials,clone(name){const t=templates.get(name);if(!t)throw Error('Missing Blender asset '+name);return t.clone(true);}};
}

/** Flatten a template into {geometry, material, local} batches — meshes only,
 *  inner InstancedMeshes expanded one entry per source instance. */
export function collectParts(root){
  const parts=[];root.updateMatrixWorld(true);
  root.traverse(o=>{
    if(o.isInstancedMesh){
      const im=new THREE.Matrix4();
      for(let j=0;j<o.count;j++){o.getMatrixAt(j,im);parts.push({geometry:o.geometry,material:o.material,local:new THREE.Matrix4().multiplyMatrices(o.matrixWorld,im)});}
    }else if(o.isMesh)parts.push({geometry:o.geometry,material:o.material,local:o.matrixWorld.clone()});
  });
  return parts;
}

/** Merge a template per material into a few draw-ready parts (geometry baked
 *  into template space). Groups by material so merged houses/torii/tōrō stay
 *  a handful of instanced draws. */
export function mergeTemplate(root){
  const buckets=new Map(),tmp=new THREE.Matrix4();
  const put=(geo,mat,world)=>{
    let g=geo.index?geo.toNonIndexed():geo.clone();
    g.applyMatrix4(world);
    for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
    if(!buckets.has(mat))buckets.set(mat,{material:mat,geos:[]});
    buckets.get(mat).geos.push(g);
  };
  root.updateMatrixWorld(true);
  root.traverse(o=>{
    if(o.isInstancedMesh){for(let j=0;j<o.count;j++){o.getMatrixAt(j,tmp);put(o.geometry,o.material,tmp.clone().premultiply(o.matrixWorld));}}
    else if(o.isMesh)put(o.geometry,o.material,o.matrixWorld);
  });
  // Split further by attribute signature — mergeGeometries needs identical
  // attribute sets, and map-less geometry must never join a mapped bucket.
  const parts=[];
  for(const {material,geos} of buckets.values()){
    const sigs=new Map();
    for(const g of geos){
      const sig=Object.keys(g.attributes).sort().join(',');
      if(!sigs.has(sig))sigs.set(sig,[]);
      sigs.get(sig).push(g);
    }
    for(const list of sigs.values()){
      const merged=mergeGeometries(list,false);
      for(const g of list)g.dispose();
      if(merged)parts.push({geometry:merged,material});
    }
  }
  return parts;
}

/** Instanced draw set from parts; the moving window's set(i,x,y,z,scale,rot). */
export function instancedParts(parts,count,parent){
  const batches=[];
  for(const p of parts){
    const mesh=new THREE.InstancedMesh(p.geometry,p.material,count);mesh.name='kit_instances';mesh.castShadow=false;mesh.receiveShadow=true;mesh.frustumCulled=false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);parent.add(mesh);batches.push({mesh,local:p.local||new THREE.Matrix4()});
  }
  const matrix=new THREE.Matrix4(),dummy=new THREE.Object3D();
  return {count,batches,set(i,x,y,z,scale=1,rot=0){dummy.position.set(x,y,z);dummy.scale.setScalar(scale);dummy.rotation.set(0,rot,0);dummy.updateMatrix();for(const b of batches){matrix.multiplyMatrices(dummy.matrix,b.local);b.mesh.setMatrixAt(i,matrix);}},commit(){for(const b of batches)b.mesh.instanceMatrix.needsUpdate=true;}};
}

export function instancedObject(root,count,parent){return instancedParts(collectParts(root),count,parent);}

export function instancedAsset(kit,name,count,parent) {
  const root=kit.templates.get(name);
  const set=instancedObject(root,count,parent);
  for(const b of set.batches)b.mesh.name=name+'_instances';
  return set;
}
