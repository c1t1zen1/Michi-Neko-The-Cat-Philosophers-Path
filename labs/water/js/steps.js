// Build it up: twelve steps from the game's river to the lab's. Each sets
// part of the stage (BASE + state); `act` runs once when the step opens.

export const BASE = {
  water: 'kyoto', bridge: 'sanjo', flow: 1, phase: 1, foam: 1, depth: 1, caustic: 1, mirror: true,
  paint: 0.35, split: null, debug: 0, labels: false
};

export const STEPS = [
  {
    key: 'today', title: 'The river today',
    body: `<p>The game sweeps a 6.8 m ribbon along five spline points and shades it with two crossing trains of sine ripples in world X and Z. The bridge is a box deck a metre up on nothing; the paddies are tinted planes with cone rice.</p>
      <p>It reads as water from above. From the cat’s height it gives itself away: the ripples run the same way round every bend, the water is no deeper in the middle than at the edge, and nothing happens behind the stones.</p>`,
    code: `float r1 = sin(p.x * 2.1 - t * 1.4 + sin(p.y * 3. + t * .7) * .8);
float r2 = sin(p.y * 3.4 + p.x * .6 - t * 2.1);   // fixed directions
float bank = min(vUv.x, 1. - vUv.x);              // "depth" from the UV`,
    state: { water: 'game', bridge: 'game', paddyGame: true, paint: 0, mirror: false, caustic: 0 }
  },
  {
    key: 'bed', title: 'Give it a bed',
    body: `<p>The bed is now the carved terrain, so the shader knows how deep the water really is. Light is absorbed with depth (Beer–Lambert), so shallow water shows the stones and deep water closes over them. The colour shifts too, from the green of the shallows to the blue-teal of the pool.</p>
      <p>Drag the divider: on the left, a flat tint; on the right, real depth. The thalweg (the deepest line) leans to the outside of each bend, where the cut bank is, and the inside of the bend is a shallow point bar.</p>
      <span class="fact">Clear water passes roughly 77–80 % of light per metre (GPU Gems ch. 2). Here opacity = 1 − e<sup>−depth × 2.1</sup>.</span>`,
    code: `float depth = uLevel - field(p).r;          // R = bed height
float absorb = 1. - exp(-depth * uClarity);
vec3 body = mix(uShallow, uDeep, smoothstep(.05, .95, depth));`,
    state: { flow: 0, foam: 0, caustic: 0, mirror: false, paint: 0, split: 'depth' }
  },
  {
    key: 'flow', title: 'Read the current',
    body: `<p>Every texel of the field holds a flow vector: along the centreline, parabolic across the channel (fastest on the thalweg, still at the banks), slowed in the shallows. Rocks, piers and turtle stones bend it with potential flow, and an eddy forms behind each one, running back upstream.</p>
      <p>The arrows show it. Pick <b>Flow</b> in the tools and drag across the water to paint your own current, then switch the view back to <i>Final</i>.</p>`,
    code: `// around an obstacle of radius a, in the local frame of the current U
du = -U * a² * (ξ² - η²) / r⁴;   dv = -2U * a² * ξη / r⁴;
along *= 1. - 1.7 * wake;        // < 0 right behind: the eddy`,
    state: { debug: 1, paint: 0, mirror: false }, tool: 'flow'
  },
  {
    key: 'phase', title: 'Hide the seam',
    body: `<p>Push a normal map along the flow and it stretches into mush within seconds. Valve’s fix (Portal 2): restart the push every cycle, run a second layer half a cycle behind, and cross-fade so each restart happens while its layer is invisible.</p>
      <p>That leaves one artefact: the whole river “breathes” once a cycle, because every pixel restarts at once. Offset the phase per pixel with a noise lookup and the breathing disappears. Left: in step. Right: offset.</p>`,
    code: `float ph = t * rate + noise(p) * 1.9;  // per-pixel offset
float p0 = fract(ph), p1 = fract(ph + .5);
float w0 = 1. - abs(2. * p0 - 1.);   // zero at the restart
slope = layer(p0) * w0 + layer(p1) * (1. - w0);`,
    state: { foam: 0, mirror: false, paint: 0, split: 'phase' }
  },
  {
    key: 'rocks', title: 'Rocks in the current',
    body: `<p>A rock just under the surface lifts a <i>pillow</i> on its upstream face. Behind an exposed rock the water can only come back in from the sides, so an <i>eddy</i> forms, flowing upstream, with an <i>eddy line</i> where it shears against the main current. That is where foam collects.</p>
      <p>Choose <b>Rock</b> and click in the river to drop boulders: the field recomputes, the foam follows, and the petals and Michi feel it.</p>
      <span class="fact">River-runner terms from Kauffman’s swiftwater primer: pillow, hole, eddy, eddy line.</span>`,
    code: `foam += .85 * exp(-pow((r - a) / (.2 * a), 2.)) * upstream;   // pillow
foam += .6 * exp(-pow((abs(η) - wl) / (.22 * a), 2.)) * decay; // eddy line`,
    state: { debug: 3, paint: 0, mirror: false }, tool: 'rock'
  },
  {
    key: 'edge', title: 'Where water meets land',
    body: `<p>Two things happen at the waterline. The water thins to nothing, so it foams and laps (white where depth drops under about 7 cm). And the bank just above it is wet: darker, because water fills the gaps between grains and less light scatters back, and glossier, so its roughness drops.</p>
      <p>The same band, 22 cm high, is what makes a waterline read from across the valley. Rain wets everything.</p>`,
    code: `float shore = 1. - smoothstep(0., .075, depth);
float wet = 1. - smoothstep(0., uWetBand, h);   // above the water
col *= 1. - .42 * wet;  roughness = mix(rough, .28, wet);`,
    state: { mirror: false, paint: 0, caustic: 0 }
  },
  {
    key: 'light', title: 'Light on the bed',
    body: `<p>A rippled surface is a field of tiny lenses. Where they converge, the bed gets a bright net of light. Real caustics are strongest when the sun is high and the water shallow, so the lab fades them with depth and with the sun’s height. Set the hour to noon and look at the shallows by the stones.</p>
      <span class="fact">Evan Wallace’s WebGL Water refracts a light mesh and measures how much each triangle shrinks. Two multiplied Voronoi layers are the cheap cousin.</span>`,
    code: `float k = smoothstep(.02, .16, dep) * exp(-dep * 1.25)
        * smoothstep(0., .25, sunDir.y);
emissive += caustic(p, t) * sunCol * k;`,
    state: { mirror: false, paint: 0 }, hour: 12
  },
  {
    key: 'mirror', title: 'Reflections',
    body: `<p>The sky alone is cheap: reflect the view ray off the rippled normal and look up a gradient. But the bridge, the willow and the cat belong in the water too. A second camera, reflected through the surface, renders the scene at half resolution, with its near plane bent onto the water so nothing underneath leaks in.</p>
      <p>Left: sky only. Right: the mirror. The ripples break the reflection into vertical streaks, as a painter would break it.</p>`,
    code: `refl = skyColor(reflect(-V, N));
vec4 q = uMirrorMat * vec4(P, 1.);
refl = texture2D(uMirror, q.xy / q.w + N.xz * .03).rgb;`,
    state: { paint: 0, split: 'mirror' }
  },
  {
    key: 'paint', title: 'Paint it',
    body: `<p>Ghibli’s backgrounds were painted in Nicker poster colour, an opaque gouache, on a wet base; Kyoto Animation’s are digital, but the same idea holds: real light, painted surfaces. The lab finishes the frame with a Kuwahara filter, which averages the calmest of four windows around each pixel, so texture becomes flat brush patches but edges stay sharp. Paper tooth and pigment pooling at edges come after.</p>
      <p>Left: the photograph. Right: the painting. The slider in the controls mixes them; 0.35 is the lab’s choice.</p>`,
    code: `for each quadrant k: mean m[k], variance s[k]  (4 x 16 taps)
pick = m[argmin(variance)];
col = mix(src, pick * paper * (1. - edge * .22), uAmount);`,
    state: { paint: 0.75, split: 'paint' }
  },
  {
    key: 'bridge', title: 'The bridge, post by post',
    body: `<p>A Kyoto beam bridge, the way Sanjō Ōhashi is built: pier bents of round posts in the river, keta beams across them, planks laid with a gap, and a wayō kōran on each side. The kōran has a jifuku curb rail, tozuka struts on masu blocks, the hirageta middle rail and the round hokogi top rail. Its main posts carry bronze giboshi, the sacred-jewel finials.</p>
      <p>On Sanjō Ōhashi the top rail rots first, the north faces grow algae, and the wood under the bronze stays sound. The materials here weather the same way, by which way each face points.</p>`,
    code: `koran(P, { x, z0, z1, yAt, oya });  // jifuku, tozuka+masu, hirageta, hokogi
giboshi(P, x, y, z);                 // lathe: collar, ring, onion, point
algae = smoothstep(.25, .9, n.z);     // north faces`,
    state: { labels: true, bridge: 'sanjo', paint: 0.2 }
  },
  {
    key: 'paddies', title: 'The paddies through the year',
    body: `<p>Two terraces, the upper spilling into the lower through a notch in the ridge (the mizuguchi). In spring they are flooded mirrors (mizukagami). In early summer the seedlings go in on a 30 × 15 cm grid and the frogs start. By August the rice is taller than the cat and waves in the wind. In autumn the heads nod gold and the sheaves hang on the hasakake. In winter, stubble and ice.</p>
      <p>Use the <b>Season</b> buttons, and walk Michi along a ridge.</p>`,
    code: `for (x = ix0; x < ix1; x += .30)       // rows, 30 cm
  for (z = iz0; z < iz1; z += .15)     // hills, 15 cm
    hills.push(x, floor, z);           // ~22 hills per m²`,
    state: { paint: 0.3 }, season: 'early'
  },
  {
    key: 'jump', title: 'Jump in!',
    body: `<p>Michi walks to the middle of the bridge, hops onto the top rail, takes a long look down, and jumps. The splash scales with the impact speed. In deep water the cat floats with its head up, legs paddling, and the current carries it; every fifth of a second it leaves a ring, and strung out behind a swimmer the rings make a wake (Kelvin: 19.47°).</p>
      <p>Back on the bank the coat is darker (wet fur scatters less light). Michi shakes at about nine times a second, flinging drops off tangentially, then dries over half a minute, leaving wet paw prints.</p>
      <span class="fact">Dickerson, Mills &amp; Hu measured a 3.3 kg cat shaking at 9.4 Hz; smaller animals shake faster.</span>`,
    code: `if (vy <= 0 && depth > .12 && y < level) splash(impact = |vy| / 5);
swim:  vy += ((level - .25 - y) * 28 - vy * 5.5) * dt;
       pos += flow * .85 * dt;      // the current carries a cat
shake: root.rotation.z = sin(t * 2π * 9.4) * .32;`,
    state: { paint: 0.35 }, hour: 17.4, act: 'leap'
  }
];
