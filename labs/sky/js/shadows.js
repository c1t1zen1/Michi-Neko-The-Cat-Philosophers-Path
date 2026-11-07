import { FIELD_GLSL } from './field.js';

const SHADOW_GLSL=/*glsl*/`
${FIELD_GLSL}
uniform float uCloudShade, uShadowMode;
varying vec3 vCloudWorld;
float projectedDensity() {
  vec2 p=vCloudWorld.xz+uSun.xz*(uCloudBase+uCloudDepth*0.45-vCloudWorld.y)/max(uSun.y,0.08);
  vec2 uv=cloudUV(p);
  float d=fieldDensity(uv);
  if(uShadowMode>1.5 && uShadowMode<2.5) {
    vec2 e=vec2(0.009,0.0);
    d=(d*2.0+fieldDensity(uv+e)+fieldDensity(uv-e)+fieldDensity(uv+e.yx)+fieldDensity(uv-e.yx))/6.0;
  }
  return d;
}
float skyTransmittance() {
  if(uShadowMode<0.5)return 1.0;
  float d=projectedDensity();
  float amount=smoothstep(0.02,0.18,uSun.y)*uCloudShade;
  if(uShadowMode<1.5)return 1.0-amount*step(0.15,d);
  if(uShadowMode<2.5)return 1.0-amount*smoothstep(0.02,0.6,d);
  return mix(1.0,exp(-d*2.1/max(uSun.y,0.18)),amount);
}
`;

export const SHADOW_MODES={game:0,hard:1,soft:2,beer:3,map:4};
// Patch cloned, lab-owned Lambert/Standard/Physical materials. The inserted
// attenuation touches directional illumination only, before RE_Direct. It
// composes with PCF building shadows and leaves hemisphere/point lights alone.
export function cloudReceiver(material,uniforms) {
  if(material.userData.skyLabReceiver)return;
  if(!material.isMeshLambertMaterial&&!material.isMeshStandardMaterial&&!material.isMeshPhongMaterial)return;
  material.userData.skyLabReceiver=true;
  const prior=material.onBeforeCompile;
  const priorKey=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{
    prior?.call(material,shader,renderer);
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='varying vec3 vCloudWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      vec4 cloudWorld=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        cloudWorld=instanceMatrix*cloudWorld;
      #endif
      vCloudWorld=(modelMatrix*cloudWorld).xyz;`);
    shader.fragmentShader=SHADOW_GLSL+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',rendererChunk());
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      if(uShadowMode>3.5)outgoingLight=mix(vec3(.14,.36,.55),vec3(1.0,.78,.4),projectedDensity());
      #include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=>`sky-lab-cloud-receiver-r160-${material.type}-${priorKey}`;
  material.needsUpdate=true;
}

// ShaderChunk is resolved before compilation. Importing it here avoids a
// second full copy of the pinned Three.js lighting implementation.
import { ShaderChunk } from 'three';
function rendererChunk() {
  return ShaderChunk.lights_fragment_begin.replace('getDirectionalLightInfo( directionalLight, directLight );',
    'getDirectionalLightInfo( directionalLight, directLight );\n directLight.color *= skyTransmittance();');
}
export function receiveClouds(root,uniforms) {
  root.traverse(o=>{if(o.material)for(const m of [].concat(o.material))cloudReceiver(m,uniforms);});
}
