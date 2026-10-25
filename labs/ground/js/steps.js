// "Build it up": the Stepper content and the stage state each step applies.
export const BASE = { mode: 0, antiTile: 1, grid: 0, blendDepth: 0.18, split: false, rain: 0, lod: true, lodRing: false, prints: true, view: 'orbit', catPath: null, hudSplat: false };

export const STEPS = [
  {
    key: 'today', title: 'The ground today',
    body: '<p>In the game the valley floor is one 260 m plane with 150 × 150 squares. Each corner carries a colour (meadow, moss, loam, bank), and a single moss texture repeats 81 times across it. Under the grass that is fine; on paths and clearings it is the flattest thing on screen.</p>',
    code: 'c.copy(colMeadow).lerp(colGold, noise1 * 0.7).lerp(colMoss, noise2 * 0.45);\nif (noise3 > 0.58) c.lerp(colDark, (noise3 - 0.58) / 0.42 * 0.7);\n// ...that colour tints one tiling texture\ntexturedMaterial(groundTextures(6), { repeat: [size / 3.2, size / 3.2] })',
    state: { mode: 1, antiTile: 0, blendDepth: 0, lod: false, prints: false }
  },
  {
    key: 'tiled', title: 'One texture, tiled',
    body: '<p>Swap the tint for painted earth and the eye finds the repeat at once. The lines mark where each 1.6 m tile starts: the same pebbles turn up at every crossing.</p>',
    state: { mode: 2, antiTile: 0, grid: 1, blendDepth: 0, lod: false, prints: false }
  },
  {
    key: 'notile', title: 'Break the repeat',
    body: '<p>Inigo Quilez’s cheapest fix: a slow noise picks one of eight offsets for each spot, and the shader blends two neighbouring offsets. Two texture reads instead of one, and the grid no longer lines up with anything.</p>',
    code: '// Quilez, texture repetition, technique 3 (k: slow noise index, 2 taps)\nfloat k = vnoise2(0.37 * uv); float l = k * 8.0; float f = fract(l);\nvec2 offa = sin(vec2(3.0, 7.0) * floor(l)), offb = sin(vec2(3.0, 7.0) * (floor(l) + 1.0));\nvec4 a = textureGrad(tex, vec3(uv + offa, layer), dx, dy), b = textureGrad(tex, vec3(uv + offb, layer), dx, dy);\nfloat t = smoothstep(0.2, 0.8, f - 0.1 * dot(a.rgb - b.rgb, vec3(1.0)));',
    state: { mode: 2, antiTile: 1, grid: 1, blendDepth: 0, lod: false, prints: false }
  },
  {
    key: 'splat', title: 'Paint a splat map',
    body: '<p>Four weights in one RGBA texture say how much gravel, moss, stone and cobble each spot holds; earth is whatever is left. The map in the corner is the splat. On its own a splat cross-fades, so the stones look evenly dusted with sand.</p>',
    state: { mode: 0, blendDepth: 0, hudSplat: true, lod: false, prints: false }
  },
  {
    key: 'height', title: 'Blend by height',
    body: '<p>Give each layer a height and let the highest win, inside a narrow window. Sand settles between the stones and the tops stay clean (Andrey Mishkinis). Drag the divider: linear on the left, height blend on the right.</p>',
    code: '// v_i = h_i + w_i ; ma = max(v_i) - uBlendDepth ; b_i = max(v_i - ma, 0.0) * step(0.002, w_i) ; weights = b / sum(b)\n// uBlendDepth < 0.001 -> linear (weights = w)',
    state: { mode: 0, blendDepth: 0.18, split: true, hudSplat: true, lod: false, prints: false }
  },
  {
    key: 'rain', title: 'Make it rain',
    body: '<p>Wet ground goes through four states: dry, wet, drenched, puddle. Earth and moss darken as water fills their pores; stone darkens less and starts to shine. Water gathers in the lowest spots first, the puddles turn flat and mirror the sky, and every drop leaves a ring (Sébastien Lagarde, Water drop).</p>',
    state: { mode: 0, rain: 0.8, lod: false, prints: false }
  },
  {
    key: 'lod', title: 'Real stones near the paws',
    body: '<p>From a cat’s height a painted stone is still a flat picture. Within 2.4 m of Michi the shader’s stones become real instanced stones, at exactly the same spots, because the shader and the page share one hash. A dither cross-fades the hand-over, so the edge never shows.</p>',
    state: { mode: 0, rain: 0, lod: true, lodRing: true, prints: false, view: 'eye', catPath: 'lane' }
  },
  {
    key: 'prints', title: 'Paw prints',
    body: '<p>Every time a paw lands it is stamped into a 12 m trail buffer that stores surface height, so 1 means untouched. Overlapping prints combine with the GPU’s MIN blend and nothing is read back. A slow pass heals the ground: mud keeps a print for minutes, moss springs back in seconds, and wet paws leave dark prints on stone that dry.</p>',
    code: 'new THREE.ShaderMaterial({ blending: THREE.CustomBlending, blendEquation: THREE.MinEquation,\n  blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, ... })\n// fragment: untargeted channels write 1.0, which MIN ignores\ngl_FragColor = vec4(mix(1.0, 1.0 - depth * shape, isPrint), mix(1.0, 1.0 - 0.8 * shape, isWet), 1.0, 1.0);',
    state: { mode: 0, prints: true, lod: true, catPath: 'hollow' }
  },
  {
    key: 'turn', title: 'Your turn', tool: 'earth',
    body: '<p>Everything is on. Pick a brush, dig a hollow, make it rain, and follow Michi through it.</p>',
    state: { mode: 0, prints: true, lod: true, catPath: null }
  }
];
