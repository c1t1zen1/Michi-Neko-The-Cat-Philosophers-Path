import { BASE, OUTPUT, launchBrowser, saveReport } from './browser-support.mjs';
// Exhaustively build and render each advertised original and each unique lab
// recipe. The game itself and repository metadata are never started or changed.
const html=`<!doctype html><meta charset="utf-8"><title>Asset adapter QA</title><script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}</script><body><script type="module">
import * as THREE from 'three';
import {getAssetCapabilities,loadCatalogAsset} from '/catalog/js/asset-loader.mjs';
const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:false});renderer.setSize(500,360);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;document.body.append(renderer.domElement);
renderer.debug.onShaderError=(gl,p,v,f)=>{throw new Error('SHADER: '+gl.getProgramInfoLog(p)+' VS:'+gl.getShaderInfoLog(v)+' FS:'+gl.getShaderInfoLog(f));};
const scene=new THREE.Scene();scene.background=new THREE.Color('#d9d9d2');scene.add(new THREE.HemisphereLight(0xe3f0ff,0x616045,2));const sun=new THREE.DirectionalLight(0xffe7ba,3);sun.position.set(4,8,5);scene.add(sun);
const camera=new THREE.PerspectiveCamera(42,500/360,.001,10000);
const inventory=await fetch('/labs/asset_inventory.json').then(r=>r.json());
const tests=[];for(const asset of inventory.assets){if(getAssetCapabilities(asset).original)tests.push({id:asset.id,variant:'original'});}
const unique=new Set();for(const asset of inventory.assets)for(const target of getAssetCapabilities(asset).targets){if(!unique.has(target.id)){unique.add(target.id);tests.push({id:asset.id,variant:'lab',targetId:target.id});}}
const prioritized=['larry','jade-paw','key','shrine-hall','torii','bamboo-groves','tea-interior','grass-near','grass-moss','grass-shell'];tests.sort((a,b)=>{const ai=prioritized.indexOf(a.id),bi=prioritized.indexOf(b.id);return (ai<0?1000:ai)-(bi<0?1000:bi);});
window.qa={THREE,renderer,scene,camera,tests,async run(test){let built;const start=performance.now();try{built=await loadCatalogAsset(test.id,{variant:test.variant,targetId:test.targetId,renderer});built.update?.(.016,.5);scene.add(built.group);built.group.updateMatrixWorld(true);let meshes=0,positions=0;built.group.traverse(o=>{if(o.isMesh||o.isPoints||o.isLine||o.isSprite)meshes++;const p=o.geometry?.attributes?.position;if(p){for(const v of p.array){if(!Number.isFinite(v))throw new Error('Non-finite geometry in '+o.name);positions++;}}if(o.instanceMatrix)for(const v of o.instanceMatrix.array)if(!Number.isFinite(v))throw new Error('Non-finite instance in '+o.name);});if(!meshes)throw new Error('No renderable objects');const box=new THREE.Box3().setFromObject(built.group);if(box.isEmpty()||![...box.min,...box.max].every(Number.isFinite))throw new Error('Invalid or empty object bounds');const c=box.getCenter(new THREE.Vector3()),s=box.getSize(new THREE.Vector3()),d=Math.max(s.x,s.y,s.z,.1)*1.9;camera.position.copy(c).add(new THREE.Vector3(d*.65,d*.6,d));camera.lookAt(c);camera.near=Math.max(.0001,d/10000);camera.far=Math.max(100,d*15);camera.updateProjectionMatrix();renderer.render(scene,camera);const gl=renderer.getContext();const code=gl.getError();if(code!==gl.NO_ERROR)throw new Error('WebGL error '+code);if(test.id==='jade-paw'){const reward=built.group.getObjectByName('Jade Paw Reward');if(!reward?.visible)throw new Error('Jade Paw is not revealed');}return {...test,pass:true,meshes,positions,ms:Math.round(performance.now()-start),caption:built.caption,fidelity:built.fidelity};}catch(e){return {...test,pass:false,error:e.stack||String(e),ms:Math.round(performance.now()-start)};}finally{if(built){scene.remove(built.group);built.dispose?.();}renderer.renderLists.dispose();}}};window.ready=true;
</script>`;

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
page.setDefaultTimeout(120000);
const errors = [], results = []; let current;
page.on('pageerror', e => errors.push({ current, error: e.message }));
page.on('console', message => { if(message.type() === 'error') errors.push({ current, error: message.text().slice(0,1000) }); });
try {
  await page.route('**/__asset_adapter_qa.html', route => route.fulfill({ body: html, contentType:'text/html' }));
  await page.goto(BASE + '/__asset_adapter_qa.html');
  await page.waitForFunction(() => window.ready, { timeout: 120000 });
  const cases = await page.evaluate(() => qa.tests);
  for(const item of cases) {
    current = item;
    const result = await page.evaluate(item => qa.run(item), item);
    results.push(result);
    console.log((result.pass ? 'PASS ' : 'FAIL ') + item.id + ' ' + item.variant + ' ' + (item.targetId || '') + (result.error ? '\n' + result.error : ''));
  }
  const passed = results.filter(r => r.pass).length;
  await saveReport('adapter-renders.json', { total: results.length, passed, results, errors });
  console.log(`${passed}/${results.length} runtime asset cases passed; ${errors.length} browser errors. Report: ${OUTPUT}`);
  if(passed !== results.length || errors.length) process.exitCode = 1;
} finally { await browser.close(); }
