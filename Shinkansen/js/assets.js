import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
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

export function instancedAsset(kit,name,count,parent) {
  const root=kit.templates.get(name),batches=[];
  root.updateMatrixWorld(true);
  root.traverse(o=>{
    if(!o.isMesh)return;
    const mesh=new THREE.InstancedMesh(o.geometry,o.material,count);mesh.name=name+'_instances';mesh.castShadow=false;mesh.receiveShadow=true;mesh.frustumCulled=false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);parent.add(mesh);batches.push({mesh,local:o.matrixWorld.clone()});
  });
  const matrix=new THREE.Matrix4(),dummy=new THREE.Object3D();
  return {count,batches,set(i,x,y,z,scale=1,rot=0){dummy.position.set(x,y,z);dummy.scale.setScalar(scale);dummy.rotation.set(0,rot,0);dummy.updateMatrix();for(const b of batches){matrix.multiplyMatrices(dummy.matrix,b.local);b.mesh.setMatrixAt(i,matrix);}},commit(){for(const b of batches)b.mesh.instanceMatrix.needsUpdate=true;}};
}
