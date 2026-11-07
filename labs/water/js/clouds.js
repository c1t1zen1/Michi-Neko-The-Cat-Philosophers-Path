// Painted cumulus for the stage sky (and so for every mirror): fbm cells
// projected onto a cloud deck, lit from the sun's side, crisp on top and
// soft underneath, the way Kyoto Animation skies are painted.
import * as THREE from 'three';
import { HASH, NOISE } from '../../shared/glsl.js';

export function cloudDome(rig) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uSunDir: { value: rig.sunDir }, uSunCol: { value: rig.palette.sun },
      uTop: { value: rig.palette.skyTop }, uHor: { value: rig.palette.horizon }, uNight: { value: 0 }, uCover: { value: 0.52 }
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: /* glsl */`
      ${HASH}
      ${NOISE}
      uniform float uTime, uNight, uCover;
      uniform vec3 uSunDir, uSunCol, uTop, uHor;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        if (d.y < 0.01) discard;
        vec2 p = d.xz / (d.y + 0.08) * 1.6 + vec2(uTime * 0.012, uTime * 0.004);
        float n = fbm2(p * 0.55, 5);
        float body = smoothstep(uCover, uCover + 0.22, n);
        if (body < 0.004) discard;
        // light from the sun's side of each cloud: sample a step toward the sun
        vec2 toSun = normalize(uSunDir.xz + 1e-4) * 0.09;
        float lit = clamp((n - fbm2((p + toSun) * 0.55, 5)) * 6. + 0.55, 0., 1.);
        float base = smoothstep(0.0, 0.5, body);
        vec3 shade = mix(uHor * 0.78 + uTop * 0.12, vec3(1.0, 0.99, 0.97), lit);
        shade = mix(shade, shade * uSunCol * 1.15, 0.35 * (1. - uNight));
        shade = mix(shade, vec3(0.16, 0.19, 0.27), uNight * 0.85);
        float horizon = smoothstep(0.01, 0.14, d.y);
        float a = base * horizon * (0.92 - uNight * 0.4);
        gl_FragColor = vec4(shade * a, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, transparent: true, premultipliedAlpha: true, depthWrite: false, fog: false
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(380, 48, 20, 0, Math.PI * 2, 0, Math.PI * 0.52), mat);
  mesh.renderOrder = -9;
  mesh.frustumCulled = false;
  mesh.name = 'clouds';
  return mesh;
}
