// A small dollhouse opening in foreground architecture keeps deep alley routes
// readable. Opaque screen-door edges preserve depth/shadows and add no pass.
import * as THREE from 'three';
export function makeCutaway(M) {
  const uniforms = {
    uRoofPlayer: { value: new THREE.Vector3() },
    uRoofGuide: { value: new THREE.Vector3() },
    uRoofCamera: { value: new THREE.Vector3() }
  };
  const materials = [M.plaster, M.plasterWarm, M.bengara, M.namako, M.koshi, M.roof,
    M.ridge, M.stone, M.slab, M.wetStone, M.timber, M.timberMed, M.agedWood, M.shoji, M.mushiko, M.sujibei,
    M.tapestry, ...Object.values(M.noren)];
  for (const mat of materials) {
    const previous = mat.onBeforeCompile, previousKey = mat.customProgramCacheKey.bind(mat);
    const key = previousKey();
    mat.onBeforeCompile = shader => {
      previous?.(shader);
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRoofCutWorld;');
      shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
        vec4 cutWorld = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          cutWorld = instanceMatrix * cutWorld;
        #endif
        vRoofCutWorld = (modelMatrix * cutWorld).xyz;
        #include <project_vertex>`);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vRoofCutWorld;
        uniform vec3 uRoofPlayer, uRoofGuide, uRoofCamera;
        float roofOpening(vec3 subject, float radius) {
          vec3 ray = subject - uRoofCamera;
          vec3 pos = vRoofCutWorld - uRoofCamera;
          float len2 = dot(ray, ray);
          float t = dot(pos, ray) / max(0.001, len2);
          if (t <= 0.0 || t >= 1.0 - 0.13 / sqrt(max(0.001, len2))) return 1.0;
          float d = length(pos - ray * t) / max(0.01, radius * t);
          return smoothstep(0.8, 1.12, d);
        }`);
      shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float opening = min(roofOpening(uRoofPlayer, 0.80), roofOpening(uRoofGuide, 0.74));
        float screenDoor = fract(gl_FragCoord.x * 0.75487766 + gl_FragCoord.y * 0.56984029);
        if (opening < screenDoor) discard;`);
    };
    mat.customProgramCacheKey = () => key + ':roof-cutaway-v1';
  }
  return (camera, player, guide) => {
    uniforms.uRoofCamera.value.copy(camera.position);
    uniforms.uRoofPlayer.value.copy(player.position); uniforms.uRoofPlayer.value.y += 0.34;
    uniforms.uRoofGuide.value.copy(guide.position); uniforms.uRoofGuide.value.y += 0.3;
  };
}
