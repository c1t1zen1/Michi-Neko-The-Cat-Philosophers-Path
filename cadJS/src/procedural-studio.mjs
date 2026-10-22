import * as THREE from 'three';

const RAD = Math.PI / 180;

export const PROCEDURAL_PREFABS = [
  { id: 'torii', label: 'Torii Gate', category: 'Architecture', icon: '⛩', description: 'Traditional vermilion Kyoto shrine gate with kasagi beam, nuki crossbar, and stone plinths' },
  { id: 'lantern', label: 'Stone Lantern (Ishi-Doro)', category: 'Props', icon: '🏮', description: 'Carved granite temple lantern with warm glowing firebox and lotus pedestal' },
  { id: 'pagoda', label: 'Wooden Pagoda', category: 'Architecture', icon: '🏯', description: 'Multi-tiered Kyoto temple pagoda with curved eaves and bronze sorin spire' },
  { id: 'bridge', label: 'Canal Footbridge', category: 'Architecture', icon: '🌉', description: 'Arched wooden Philosopher’s Path bridge with giboshi post finials' },
  { id: 'shrine', label: 'Wayside Hokora Shrine', category: 'Architecture', icon: '⛩', description: 'Small mossy roadside spirit shrine with wooden steps and offering box' },
  { id: 'bamboo', label: 'Bamboo Grove Cluster', category: 'Vegetation', icon: '🎋', description: 'Segmented green bamboo culms with node rings and layered foliage tufts' },
  { id: 'sakura', label: 'Sakura Blossom Tree', category: 'Vegetation', icon: '🌸', description: 'Gnarled cherry tree with spreading limbs and soft pink blossom clouds' },
  { id: 'bonsai', label: 'Sculpted Pine Bonsai', category: 'Vegetation', icon: '🪴', description: 'Twisted pine bonsai in a glazed ceramic rectangular tray with moss mound' },
  { id: 'water_basin', label: 'Tsukubai Water Basin', category: 'Props', icon: '🪨', description: 'Carved stone wash basin with bamboo kakehi water pipe and wooden ladle' },
  { id: 'stepping_stones', label: 'Tobi-Ishi Stepping Stones', category: 'Environment', icon: '🪨', description: 'Organic arrangement of flat garden path stones with moss rims' },
  { id: 'rock_garden', label: 'Zen Rock Cluster', category: 'Environment', icon: '⛰', description: 'Karesansui triad rock arrangement set on a raked gravel bed' },
  { id: 'teacup', label: 'Matcha Chawan Set', category: 'Props', icon: '🍵', description: 'Hand-thrown ceramic tea bowl with frothy green matcha and wooden coaster' },
  { id: 'cat_statue', label: 'Guardian Neko Statue', category: 'Characters', icon: '🐱', description: 'Sculpted stone/ceramic Maneki-Neko figurine with raised paw, red collar, and golden bell' },
  { id: 'toro_floating', label: 'Floating River Lantern', category: 'Props', icon: '🕯', description: 'Wooden base paper lantern (Toro Nagashi) with warm inner candle glow' },
  { id: 'ema_board', label: 'Ema Wishing Plaque Stand', category: 'Props', icon: '🪧', description: 'Shrine wooden rack hung with painted wishing plaques and protective roof' }
];

export const PROCEDURAL_TEXTURES = [
  { id: 'tabby_stripes', label: 'Tabby Fur Stripes', category: 'Character', primary: '#c9965b', secondary: '#5c3a1e', accent: '#f3e5ab' },
  { id: 'calico_patches', label: 'Calico Fur Patches', category: 'Character', primary: '#f4efe6', secondary: '#d47a34', accent: '#2b2623' },
  { id: 'tortoiseshell', label: 'Tortoiseshell Mottled', category: 'Character', primary: '#3b281e', secondary: '#d17b32', accent: '#e8c17d' },
  { id: 'soft_fur', label: 'Soft Brushwork Fur', category: 'Character', primary: '#d8b48a', secondary: '#b88f62', accent: '#f5e6d3' },
  { id: 'weathered_stone', label: 'Weathered Kyoto Granite', category: 'Stone', primary: '#7d8487', secondary: '#52585b', accent: '#a8b0b2' },
  { id: 'mossy_stone', label: 'Moss-Dappled Stone', category: 'Stone', primary: '#6f7678', secondary: '#4d6b3c', accent: '#799954' },
  { id: 'raked_sand', label: 'Karesansui Raked Gravel', category: 'Stone', primary: '#d9d6ce', secondary: '#b5b1a7', accent: '#efede8' },
  { id: 'cedar_wood', label: 'Hinoki Cedar Grain', category: 'Wood', primary: '#9e6b43', secondary: '#6e4526', accent: '#bf8b5e' },
  { id: 'lacquer_wood', label: 'Vermilion Shrine Lacquer', category: 'Wood', primary: '#c83e2b', secondary: '#8a2215', accent: '#e35d46' },
  { id: 'bamboo_grain', label: 'Fresh Bamboo Culm', category: 'Wood', primary: '#6b9349', secondary: '#48692d', accent: '#9ec274' },
  { id: 'shoji_paper', label: 'Warm Shoji Lattice', category: 'Interior', primary: '#f5ebd6', secondary: '#593e28', accent: '#fff8ea' },
  { id: 'tatami_weave', label: 'Igusa Tatami Weave', category: 'Interior', primary: '#b5ad72', secondary: '#8f8751', accent: '#2d4739' },
  { id: 'seigaiha_waves', label: 'Seigaiha Wave Pattern', category: 'Pattern', primary: '#2d536e', secondary: '#e8dfd1', accent: '#5fa4bd' },
  { id: 'sakura_petals', label: 'Painterly Sakura Canopy', category: 'Foliage', primary: '#f4b8c8', secondary: '#d97f98', accent: '#ffe6ed' },
  { id: 'autumn_momiji', label: 'Autumn Maple Foliage', category: 'Foliage', primary: '#c93b27', secondary: '#e07a26', accent: '#f2b738' },
  { id: 'gold_kintsugi', label: 'Ceramic + Gold Kintsugi', category: 'Ceramic', primary: '#30434e', secondary: '#1f2d36', accent: '#e6b84c' }
];

export const MATERIAL_PALETTES = {
  kyoto_shrine: {
    label: 'Kyoto Vermilion Shrine',
    colors: ['#c83e2b', '#26211e', '#d9a74a', '#7c8285', '#f2eadf'],
    roughness: 0.55,
    metalness: 0.1
  },
  sakura_spring: {
    label: 'Sakura Spring Blossom',
    colors: ['#f4b8c8', '#fde2e9', '#63483b', '#87a868', '#f5ebd8'],
    roughness: 0.72,
    metalness: 0.04
  },
  moss_garden: {
    label: 'Saiho-ji Moss Garden',
    colors: ['#577841', '#7d8487', '#3f5730', '#96ad68', '#524132'],
    roughness: 0.85,
    metalness: 0.02
  },
  autumn_temple: {
    label: 'Autumn Kiyomizu',
    colors: ['#c93b27', '#e07a26', '#6b4429', '#eab338', '#423833'],
    roughness: 0.68,
    metalness: 0.08
  },
  moonlit_zen: {
    label: 'Moonlit Silver Canal',
    colors: ['#587691', '#283847', '#9fc4dc', '#d5e4ed', '#1a232c'],
    roughness: 0.5,
    metalness: 0.2
  },
  calico_cat: {
    label: 'Warm Calico Neko',
    colors: ['#f4efe6', '#d47a34', '#2b2623', '#ebb02a', '#c83e2b'],
    roughness: 0.75,
    metalness: 0.05
  },
  golden_tabby: {
    label: 'Sunlit Ginger Tabby',
    colors: ['#d69447', '#f5e7cf', '#7a491d', '#78a856', '#315d80'],
    roughness: 0.75,
    metalness: 0.05
  },
  midnight_kuro: {
    label: 'Midnight Kuro Cat',
    colors: ['#22252a', '#353a42', '#e8b838', '#c83e2b', '#f0ede9'],
    roughness: 0.62,
    metalness: 0.12
  },
  celadon_ceramic: {
    label: 'Celadon Tea Glaze',
    colors: ['#7fa693', '#527364', '#d9d2c5', '#5e422b', '#d4af37'],
    roughness: 0.28,
    metalness: 0.15
  },
  warm_lantern: {
    label: 'Dusk Lantern Glow',
    colors: ['#747a7d', '#54595c', '#ffcf70', '#4a5d3b', '#ffaa33'],
    roughness: 0.82,
    metalness: 0.05
  }
};

export const CHARACTER_POSES = [
  { id: 'reset', label: 'Neutral Stand' },
  { id: 'sit', label: 'Polite Sit' },
  { id: 'walk', label: 'Strolling Stride' },
  { id: 'stretch', label: 'Morning Stretch' },
  { id: 'loaf', label: 'Cozy Cat Loaf' },
  { id: 'curious_tilt', label: 'Curious Head Tilt' },
  { id: 'play_bow', label: 'Playful Pounce' },
  { id: 'sleep_curl', label: 'Resting Curl' }
];

function seededRandom(seed = 1) {
  let state = (Number(seed) || 1) % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function mat(color, roughness = 0.7, metalness = 0.08, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness,
    ...extra
  });
}

function mesh(geometry, material, name, pos = [0, 0, 0], rotDeg = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Mesh(geometry, material);
  m.name = name;
  m.position.set(pos[0] || 0, pos[1] || 0, pos[2] || 0);
  m.rotation.set((rotDeg[0] || 0) * RAD, (rotDeg[1] || 0) * RAD, (rotDeg[2] || 0) * RAD);
  m.scale.set(scale[0] ?? 1, scale[1] ?? 1, scale[2] ?? 1);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const PREFAB_ALIASES = {
  'torii-gate': 'torii',
  'stone-lantern': 'lantern',
  'ishi-doro': 'lantern',
  'bamboo-grove': 'bamboo',
  'sakura-tree': 'sakura',
  'wooden-bridge': 'bridge',
  'tea-house': 'shrine',
  'komainu-cat': 'cat_statue',
  'maneki-neko': 'cat_statue',
  'floating-lantern': 'toro_floating',
  'stepping-stones': 'stepping_stones',
  'water-basin': 'water_basin',
  'rock-garden': 'rock_garden',
  'ema-board': 'ema_board'
};

export function buildProceduralAsset(prefab, options = {}) {
  const rawType = String(prefab || 'torii').toLowerCase().trim();
  const type = PREFAB_ALIASES[rawType] || rawType.replace(/-/g, '_');
  const seed = Number(options.seed ?? 1);
  const rand = seededRandom(seed);
  const group = new THREE.Group();
  group.userData.cadProceduralPrefab = type;
  group.userData.cadSourceModule = 'cadJS/src/procedural-studio.mjs';
  group.userData.cadSourceSymbol = `build:${type}`;

  if (type === 'torii') {
    group.name = options.name || 'Kyoto Torii Gate';
    const vermilion = mat(options.primaryColor || '#c83e2b', 0.52, 0.08);
    const darkStone = mat(options.secondaryColor || '#333638', 0.85, 0.05);
    const gold = mat('#d9a74a', 0.35, 0.65);

    const span = Number(options.width || 2.4);
    const height = Number(options.height || 2.8);
    const half = span * 0.5;

    group.add(mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.36, 20), darkStone, 'Left Plinth Kamebara', [-half, 0.18, 0]));
    group.add(mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.36, 20), darkStone, 'Right Plinth Kamebara', [half, 0.18, 0]));
    group.add(mesh(new THREE.CylinderGeometry(0.14, 0.165, height, 24), vermilion, 'Left Pillar Hashira', [-half, height * 0.5, 0], [0, 0, -2]));
    group.add(mesh(new THREE.CylinderGeometry(0.14, 0.165, height, 24), vermilion, 'Right Pillar Hashira', [half, height * 0.5, 0], [0, 0, 2]));
    group.add(mesh(new THREE.BoxGeometry(span + 0.9, 0.16, 0.18), vermilion, 'Lower Tie Beam Nuki', [0, height * 0.72, 0]));
    group.add(mesh(new THREE.BoxGeometry(span + 1.15, 0.16, 0.24), vermilion, 'Upper Tie Beam Shimaki', [0, height - 0.08, 0]));
    group.add(mesh(new THREE.BoxGeometry(span + 1.45, 0.18, 0.32), darkStone, 'Top Lintel Kasagi', [0, height + 0.08, 0]));
    group.add(mesh(new THREE.BoxGeometry(0.18, 0.42, 0.18), vermilion, 'Center Strut Gakuzuka', [0, height * 0.85, 0]));
    group.add(mesh(new THREE.BoxGeometry(0.32, 0.44, 0.06), gold, 'Name Tablet Gaku', [0, height * 0.85, 0.11]));
    return group;
  }

  if (type === 'lantern' || type === 'ishi_doro' || type === 'stone_lantern') {
    group.name = options.name || 'Stone Lantern';
    const stone = mat(options.primaryColor || '#7d8487', 0.88, 0.04);
    const moss = mat(options.secondaryColor || '#557342', 0.92, 0.02);
    const glow = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffdfa0'),
      emissive: new THREE.Color(options.accentColor || '#ffaa33'),
      emissiveIntensity: 1.6,
      roughness: 0.3
    });

    group.add(mesh(new THREE.CylinderGeometry(0.45, 0.52, 0.18, 6), stone, 'Base Kiso', [0, 0.09, 0]));
    group.add(mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.14, 6), moss, 'Lotus Collar', [0, 0.24, 0]));
    group.add(mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.75, 6), stone, 'Shaft Sao', [0, 0.68, 0]));
    group.add(mesh(new THREE.CylinderGeometry(0.36, 0.22, 0.16, 6), stone, 'Middle Platform Chudai', [0, 1.12, 0]));
    group.add(mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.34, 6), glow, 'Firebox Hibukuro', [0, 1.36, 0]));
    const roof = mesh(new THREE.ConeGeometry(0.56, 0.32, 6), stone, 'Umbrella Roof Kasa', [0, 1.68, 0]);
    group.add(roof);
    group.add(mesh(new THREE.SphereGeometry(0.1, 16, 12), moss, 'Finial Hoju Base', [0, 1.86, 0], [0, 0, 0], [1, 0.6, 1]));
    group.add(mesh(new THREE.ConeGeometry(0.08, 0.18, 12), stone, 'Finial Jewel Hoju', [0, 1.98, 0]));
    return group;
  }

  if (type === 'pagoda') {
    group.name = options.name || 'Kyoto Pagoda';
    const tiers = Math.min(7, Math.max(2, Math.round(Number(options.tiers || 3))));
    const wood = mat(options.primaryColor || '#70442a', 0.68, 0.06);
    const roofMat = mat(options.secondaryColor || '#2c353b', 0.58, 0.15);
    const plaster = mat('#efe7d6', 0.8, 0.02);
    const bronze = mat('#b5893d', 0.35, 0.7);

    group.add(mesh(new THREE.BoxGeometry(2.2, 0.26, 2.2), mat('#6c7376', 0.88, 0.04), 'Stone Foundation Platform', [0, 0.13, 0]));
    let y = 0.26;
    for (let i = 0; i < tiers; i++) {
      const ratio = Math.pow(0.82, i);
      const coreW = 1.35 * ratio;
      const coreH = 0.68 * Math.pow(0.9, i);
      const roofW = 2.15 * ratio;
      group.add(mesh(new THREE.BoxGeometry(coreW, coreH, coreW), plaster, `Tier ${i + 1} Wall Core`, [0, y + coreH * 0.5, 0]));
      group.add(mesh(new THREE.BoxGeometry(coreW + 0.08, coreH * 0.2, coreW + 0.08), wood, `Tier ${i + 1} Timber Frame`, [0, y + coreH * 0.15, 0]));
      y += coreH;
      const eave = mesh(new THREE.ConeGeometry(roofW * 0.78, 0.34 * ratio, 4), roofMat, `Tier ${i + 1} Eave Roof`, [0, y + 0.14 * ratio, 0], [0, 45, 0]);
      group.add(eave);
      y += 0.24 * ratio;
    }
    group.add(mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.75, 16), bronze, 'Sorin Spire Finial', [0, y + 0.36, 0]));
    return group;
  }

  if (type === 'bridge') {
    group.name = options.name || 'Canal Footbridge';
    const cedar = mat(options.primaryColor || '#9c643b', 0.68, 0.06);
    const redLacquer = mat(options.secondaryColor || '#b83728', 0.5, 0.1);
    const bronze = mat('#cfa34a', 0.32, 0.72);
    const planks = 11;
    const span = 3.2;

    for (let i = 0; i < planks; i++) {
      const t = i / (planks - 1) - 0.5;
      const x = t * span;
      const archY = Math.cos(t * Math.PI) * 0.38;
      const tiltZ = -Math.sin(t * Math.PI) * 14;
      group.add(mesh(new THREE.BoxGeometry(0.26, 0.06, 1.35), cedar, `Bridge Plank ${i + 1}`, [x, archY + 0.18, 0], [0, 0, tiltZ]));
    }
    for (const side of [-0.62, 0.62]) {
      const label = side < 0 ? 'North' : 'South';
      for (const p of [-0.46, 0, 0.46]) {
        const x = p * span;
        const archY = Math.cos(p * Math.PI) * 0.38;
        group.add(mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.62, 14), redLacquer, `${label} Post`, [x, archY + 0.46, side]));
        group.add(mesh(new THREE.SphereGeometry(0.07, 14, 12), bronze, `${label} Giboshi Finial`, [x, archY + 0.8, side]));
      }
      group.add(mesh(new THREE.BoxGeometry(span + 0.15, 0.055, 0.06), redLacquer, `${label} Top Handrail`, [0, 0.68, side]));
    }
    return group;
  }

  if (type === 'shrine') {
    group.name = options.name || 'Wayside Hokora Shrine';
    const stone = mat('#787f82', 0.86, 0.04);
    const wood = mat(options.primaryColor || '#8c5532', 0.68, 0.06);
    const roofMat = mat(options.secondaryColor || '#333d42', 0.6, 0.12);

    group.add(mesh(new THREE.BoxGeometry(1.2, 0.24, 1.2), stone, 'Stone Base Plinth', [0, 0.12, 0]));
    group.add(mesh(new THREE.BoxGeometry(0.76, 0.72, 0.72), wood, 'Sanctuary Chamber Honden', [0, 0.6, 0]));
    group.add(mesh(new THREE.ConeGeometry(0.78, 0.48, 4), roofMat, 'Gable Roof', [0, 1.16, 0], [0, 45, 0]));
    group.add(mesh(new THREE.BoxGeometry(0.42, 0.22, 0.26), wood, 'Saisen Offering Box', [0, 0.35, 0.48]));
    return group;
  }

  if (type === 'bamboo') {
    group.name = options.name || 'Bamboo Grove Cluster';
    const culmMat = mat(options.primaryColor || '#689146', 0.45, 0.08);
    const ringMat = mat('#48692d', 0.55, 0.06);
    const leafMat = mat(options.secondaryColor || '#7ea856', 0.75, 0.02);

    const offsets = [
      [0, 0, 3.2], [-0.28, 0.18, 2.7], [0.3, -0.14, 2.9], [-0.15, -0.26, 2.3], [0.22, 0.26, 2.5]
    ];
    offsets.forEach(([ox, oz, h], idx) => {
      const stalk = new THREE.Group();
      stalk.name = `Bamboo Culm ${idx + 1}`;
      stalk.position.set(ox, 0, oz);
      stalk.rotation.set((rand() - 0.5) * 4 * RAD, 0, (rand() - 0.5) * 4 * RAD);
      const segments = 5;
      const segH = h / segments;
      for (let s = 0; s < segments; s++) {
        const r = Math.max(0.035, 0.065 - s * 0.005);
        stalk.add(mesh(new THREE.CylinderGeometry(r * 0.96, r, segH * 0.96, 14), culmMat, `Segment ${s + 1}`, [0, (s + 0.5) * segH, 0]));
        stalk.add(mesh(new THREE.TorusGeometry(r * 1.04, 0.009, 8, 16), ringMat, `Node Ring ${s + 1}`, [0, (s + 1) * segH, 0], [90, 0, 0]));
      }
      stalk.add(mesh(new THREE.IcosahedronGeometry(0.34, 1), leafMat, `Foliage Tuft ${idx + 1}`, [0, h - 0.1, 0], [0, idx * 35, 0], [1.3, 0.65, 1.3]));
      group.add(stalk);
    });
    return group;
  }

  if (type === 'sakura') {
    group.name = options.name || 'Sakura Blossom Tree';
    const bark = mat(options.secondaryColor || '#593d30', 0.85, 0.03);
    const blossomMain = mat(options.primaryColor || '#f4b8c8', 0.78, 0.02);
    const blossomLight = mat('#ffd9e4', 0.75, 0.02);

    group.add(mesh(new THREE.CylinderGeometry(0.18, 0.32, 1.65, 14), bark, 'Trunk', [0, 0.82, 0], [0, 0, 3]));
    group.add(mesh(new THREE.CylinderGeometry(0.09, 0.16, 1.1, 10), bark, 'Left Bough', [-0.36, 1.75, 0.12], [12, 0, 34]));
    group.add(mesh(new THREE.CylinderGeometry(0.09, 0.15, 1.05, 10), bark, 'Right Bough', [0.38, 1.72, -0.1], [-10, 0, -32]));

    const clouds = [
      [0, 2.35, 0, 0.85, blossomMain],
      [-0.68, 2.1, 0.24, 0.65, blossomLight],
      [0.72, 2.08, -0.18, 0.68, blossomMain],
      [0.18, 2.2, 0.58, 0.58, blossomLight],
      [-0.22, 2.18, -0.55, 0.6, blossomMain]
    ];
    clouds.forEach(([x, y, z, r, m], idx) => {
      group.add(mesh(new THREE.IcosahedronGeometry(r, 2), m, `Blossom Crown ${idx + 1}`, [x, y, z], [0, idx * 28, 0], [1.25, 0.72, 1.2]));
    });
    return group;
  }

  if (type === 'bonsai') {
    group.name = options.name || 'Sculpted Pine Bonsai';
    const ceramic = mat(options.secondaryColor || '#335263', 0.28, 0.18);
    const moss = mat('#597d3f', 0.9, 0.02);
    const bark = mat('#66462f', 0.84, 0.04);
    const pine = mat(options.primaryColor || '#3b6638', 0.78, 0.04);

    group.add(mesh(new THREE.BoxGeometry(0.92, 0.16, 0.66), ceramic, 'Ceramic Pot Tray', [0, 0.08, 0]));
    group.add(mesh(new THREE.SphereGeometry(0.38, 18, 12), moss, 'Moss Soil Mound', [0, 0.16, 0], [0, 0, 0], [1.1, 0.28, 0.8]));
    group.add(mesh(new THREE.CylinderGeometry(0.055, 0.11, 0.52, 12), bark, 'Twisted Trunk Base', [-0.06, 0.36, 0], [0, 0, -18]));
    group.add(mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.42, 12), bark, 'Upper Trunk Sweep', [0.06, 0.66, 0.04], [8, 0, 24]));
    group.add(mesh(new THREE.IcosahedronGeometry(0.28, 2), pine, 'Lower Foliage Pad', [-0.24, 0.58, 0.06], [0, 0, 0], [1.45, 0.42, 1.15]));
    group.add(mesh(new THREE.IcosahedronGeometry(0.26, 2), pine, 'Right Foliage Pad', [0.26, 0.74, -0.05], [0, 0, 0], [1.35, 0.4, 1.1]));
    group.add(mesh(new THREE.IcosahedronGeometry(0.24, 2), pine, 'Apex Crown Pad', [0.04, 0.94, 0.02], [0, 0, 0], [1.3, 0.42, 1.1]));
    return group;
  }

  if (type === 'water_basin' || type === 'tsukubai') {
    group.name = options.name || 'Tsukubai Water Basin';
    const granite = mat('#747b7e', 0.86, 0.04);
    const water = mat('#4fa3b8', 0.12, 0.1, { transparent: true, opacity: 0.85 });
    const bambooMat = mat('#7ca152', 0.48, 0.06);

    group.add(mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.52, 18), granite, 'Stone Basin Bowl', [0, 0.26, 0]));
    group.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 18), water, 'Water Surface', [0, 0.51, 0]));
    group.add(mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.88, 12), bambooMat, 'Bamboo Stand Pipe', [-0.42, 0.44, 0]));
    group.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.52, 12), bambooMat, 'Bamboo Spout Kakehi', [-0.22, 0.72, 0], [0, 0, 72]));
    return group;
  }

  if (type === 'stepping_stones' || type === 'tobi_ishi') {
    group.name = options.name || 'Tobi-Ishi Stepping Stones';
    const stone = mat('#767d80', 0.86, 0.04);
    const coords = [
      [-0.9, 0.05, 0.15, 0.32],
      [-0.32, 0.05, -0.14, 0.28],
      [0.28, 0.05, 0.12, 0.35],
      [0.88, 0.05, -0.08, 0.3]
    ];
    coords.forEach(([x, y, z, r], idx) => {
      group.add(mesh(new THREE.CylinderGeometry(r, r * 1.08, 0.1, 10), stone, `Stepping Stone ${idx + 1}`, [x, y, z], [0, idx * 40, 0], [1.15, 1, 0.9]));
    });
    return group;
  }

  if (type === 'rock_garden' || type === 'karesansui') {
    group.name = options.name || 'Zen Rock Cluster';
    const sand = mat('#dad6cd', 0.92, 0.01);
    const darkRock = mat('#52585c', 0.88, 0.05);
    const moss = mat('#54733e', 0.9, 0.02);

    group.add(mesh(new THREE.CylinderGeometry(1.35, 1.4, 0.08, 32), sand, 'Raked Gravel Bed', [0, 0.04, 0]));
    group.add(mesh(new THREE.SphereGeometry(0.32, 16, 10), moss, 'Moss Island Ring', [0, 0.09, 0], [0, 0, 0], [1.9, 0.22, 1.4]));
    group.add(mesh(new THREE.DodecahedronGeometry(0.38, 1), darkRock, 'Principal Heaven Stone', [-0.12, 0.36, 0], [12, 25, -8], [0.9, 1.35, 0.85]));
    group.add(mesh(new THREE.DodecahedronGeometry(0.26, 1), darkRock, 'Companion Earth Stone', [0.34, 0.22, 0.14], [-10, 40, 15], [1.1, 0.85, 0.95]));
    group.add(mesh(new THREE.DodecahedronGeometry(0.2, 1), darkRock, 'Harmony Man Stone', [-0.42, 0.16, 0.18], [5, -20, 8], [1.2, 0.65, 1]));
    return group;
  }

  if (type === 'teacup' || type === 'matcha') {
    group.name = options.name || 'Matcha Chawan Set';
    const ceramic = mat(options.primaryColor || '#334550', 0.32, 0.14);
    const matcha = mat('#6aa144', 0.4, 0.02);
    const wood = mat('#855533', 0.72, 0.05);

    group.add(mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.04, 24), wood, 'Wooden Coaster Chaki', [0, 0.02, 0]));
    group.add(mesh(new THREE.CylinderGeometry(0.26, 0.16, 0.3, 24), ceramic, 'Chawan Tea Bowl', [0, 0.19, 0]));
    group.add(mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.02, 24), matcha, 'Frothy Matcha Surface', [0, 0.31, 0]));
    return group;
  }

  if (type === 'cat_statue' || type === 'maneki_neko') {
    group.name = options.name || 'Guardian Neko Statue';
    const bodyMat = mat(options.primaryColor || '#f2ece1', 0.55, 0.06);
    const collarMat = mat(options.secondaryColor || '#c83e2b', 0.48, 0.1);
    const goldMat = mat('#e3b43c', 0.28, 0.75);
    const eyeMat = mat('#262220', 0.25, 0.1);

    group.add(mesh(new THREE.BoxGeometry(0.68, 0.1, 0.58), collarMat, 'Seat Cushion Zabuton', [0, 0.05, 0]));
    group.add(mesh(new THREE.CapsuleGeometry(0.22, 0.26, 12, 20), bodyMat, 'Statue Torso', [0, 0.34, 0]));
    group.add(mesh(new THREE.SphereGeometry(0.22, 24, 18), bodyMat, 'Statue Head', [0, 0.68, 0.03], [0, 0, 0], [1.08, 0.96, 1]));
    group.add(mesh(new THREE.ConeGeometry(0.08, 0.16, 12), bodyMat, 'Left Ear', [-0.13, 0.88, 0.02], [0, 0, 18]));
    group.add(mesh(new THREE.ConeGeometry(0.08, 0.16, 12), bodyMat, 'Right Ear', [0.13, 0.88, 0.02], [0, 0, -18]));
    group.add(mesh(new THREE.TorusGeometry(0.16, 0.026, 10, 24), collarMat, 'Red Collar', [0, 0.51, 0.02], [90, 0, 0]));
    group.add(mesh(new THREE.SphereGeometry(0.042, 14, 12), goldMat, 'Golden Suzu Bell', [0, 0.49, 0.19]));
    group.add(mesh(new THREE.CapsuleGeometry(0.055, 0.18, 8, 12), bodyMat, 'Beckoning Right Paw', [0.22, 0.56, 0.12], [-25, 0, -15]));
    group.add(mesh(new THREE.CapsuleGeometry(0.055, 0.22, 8, 12), bodyMat, 'Seated Left Paw', [-0.14, 0.24, 0.18]));
    group.add(mesh(new THREE.SphereGeometry(0.026, 12, 10), eyeMat, 'Left Eye', [-0.08, 0.7, 0.22]));
    group.add(mesh(new THREE.SphereGeometry(0.026, 12, 10), eyeMat, 'Right Eye', [0.08, 0.7, 0.22]));
    return group;
  }

  if (type === 'toro_floating') {
    group.name = options.name || 'Floating River Lantern';
    const wood = mat('#875534', 0.7, 0.05);
    const paper = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#fff5dc'),
      emissive: new THREE.Color(options.primaryColor || '#ffb347'),
      emissiveIntensity: 1.35,
      roughness: 0.45
    });
    group.add(mesh(new THREE.BoxGeometry(0.56, 0.06, 0.56), wood, 'Floating Cedar Base', [0, 0.03, 0]));
    group.add(mesh(new THREE.BoxGeometry(0.36, 0.46, 0.36), paper, 'Washi Lantern Shade', [0, 0.29, 0]));
    group.add(mesh(new THREE.BoxGeometry(0.4, 0.03, 0.4), wood, 'Top Frame Ring', [0, 0.53, 0]));
    return group;
  }

  // Default / ema_board
  group.name = options.name || 'Ema Wishing Plaque Stand';
  const wood = mat(options.primaryColor || '#8c5835', 0.68, 0.06);
  const plaque = mat('#e8CFA6', 0.75, 0.02);
  const roof = mat('#323c42', 0.6, 0.12);

  group.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 12), wood, 'Left Post', [-0.75, 0.9, 0]));
  group.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 12), wood, 'Right Post', [0.75, 0.9, 0]));
  group.add(mesh(new THREE.BoxGeometry(1.75, 0.14, 0.46), roof, 'Canopy Roof', [0, 1.82, 0]));
  for (const rowY of [1.35, 0.95]) {
    group.add(mesh(new THREE.BoxGeometry(1.5, 0.04, 0.04), wood, `Crossbar ${rowY}`, [0, rowY, 0]));
    for (let i = -2; i <= 2; i++) {
      group.add(mesh(new THREE.BoxGeometry(0.2, 0.15, 0.02), plaque, `Ema Plaque ${rowY}-${i + 3}`, [i * 0.27, rowY - 0.12, 0.02]));
    }
  }
  return group;
}

/**
 * Generates a 256x256 painterly procedural texture data URL in browser environments
 * (or a deterministic SVG data URL fallback in headless Node tests).
 */
const TEXTURE_ALIASES = {
  'moss-stone': 'mossy_stone',
  'mossy-stone': 'mossy_stone',
  'weathered-stone': 'weathered_stone',
  'cedar-wood': 'cedar_wood',
  'lacquer-wood': 'lacquer_wood',
  'bamboo-grain': 'bamboo_grain',
  'shoji-paper': 'shoji_paper',
  'tatami-weave': 'tatami_weave',
  'seigaiha-waves': 'seigaiha_waves',
  'sakura-petals': 'sakura_petals',
  'autumn-momiji': 'autumn_momiji',
  'gold-kintsugi': 'gold_kintsugi',
  'tabby-stripes': 'tabby_stripes',
  'calico-patches': 'calico_patches',
  'raked-sand': 'raked_sand'
};

export function synthesizePainterlyTexture(options = {}) {
  const rawPattern = String(options.pattern || options.preset || 'mossy_stone').toLowerCase().trim();
  const pattern = TEXTURE_ALIASES[rawPattern] || rawPattern.replace(/-/g, '_');
  const preset = PROCEDURAL_TEXTURES.find((item) => item.id === pattern) || PROCEDURAL_TEXTURES[0];
  const primary = options.primaryColor || preset.primary || '#7d8487';
  const secondary = options.secondaryColor || preset.secondary || '#4d6b3c';
  const accent = options.accentColor || preset.accent || '#a8b0b2';
  const seed = Number(options.seed ?? 1);
  const rand = seededRandom(seed);

  if (typeof document === 'undefined') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="${primary}"/><circle cx="128" cy="128" r="80" fill="${secondary}" opacity="0.65"/><circle cx="96" cy="96" r="40" fill="${accent}" opacity="0.5"/></svg>`;
    return {
      name: `${preset.label} (256px)`,
      pattern,
      width: 256,
      height: 256,
      dataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    };
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Base fill
  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, 256, 256);

  // Soft painterly background wash
  for (let i = 0; i < 42; i++) {
    ctx.fillStyle = i % 2 === 0 ? secondary : accent;
    ctx.globalAlpha = 0.08 + rand() * 0.12;
    ctx.beginPath();
    ctx.ellipse(rand() * 256, rand() * 256, 18 + rand() * 48, 12 + rand() * 36, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  if (pattern === 'tabby_stripes') {
    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = secondary;
    for (let y = 12; y < 256; y += 26) {
      ctx.lineWidth = 8 + rand() * 6;
      ctx.beginPath();
      for (let x = 0; x <= 256; x += 16) {
        const wave = Math.sin((x / 256) * Math.PI * 2 + y * 0.1) * 7 + (rand() - 0.5) * 4;
        if (x === 0) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }
  } else if (pattern === 'calico_patches' || pattern === 'tortoiseshell') {
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = i % 2 === 0 ? secondary : accent;
      ctx.globalAlpha = 0.78;
      ctx.beginPath();
      ctx.ellipse(rand() * 256, rand() * 256, 20 + rand() * 44, 16 + rand() * 38, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pattern === 'cedar_wood' || pattern === 'bamboo_grain' || pattern === 'lacquer_wood') {
    for (let i = 0; i < 64; i++) {
      ctx.fillStyle = i % 3 === 0 ? accent : secondary;
      ctx.globalAlpha = 0.16 + rand() * 0.18;
      const x = rand() * 256;
      ctx.fillRect(x, 0, 2 + rand() * 6, 256);
    }
    if (pattern === 'bamboo_grain') {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = secondary;
      ctx.fillRect(0, 82, 256, 5);
      ctx.fillRect(0, 172, 256, 5);
    }
  } else if (pattern === 'shoji_paper' || pattern === 'tatami_weave') {
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = secondary;
    ctx.lineWidth = pattern === 'shoji_paper' ? 6 : 2;
    const step = pattern === 'shoji_paper' ? 64 : 8;
    for (let i = 0; i <= 256; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
      if (pattern === 'shoji_paper') {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(256, i);
        ctx.stroke();
      }
    }
  } else if (pattern === 'seigaiha_waves') {
    ctx.globalAlpha = 0.82;
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 3;
    for (let row = 0; row < 6; row++) {
      for (let col = -1; col < 5; col++) {
        const cx = col * 64 + (row % 2 ? 32 : 0);
        const cy = row * 48;
        for (let r = 30; r >= 8; r -= 8) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, Math.PI, 0);
          ctx.stroke();
        }
      }
    }
  } else if (pattern === 'gold_kintsugi') {
    ctx.globalAlpha = 0.92;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3.5;
    for (let v = 0; v < 4; v++) {
      ctx.beginPath();
      let x = rand() * 256;
      let y = 0;
      ctx.moveTo(x, y);
      while (y < 256) {
        y += 18 + rand() * 22;
        x += (rand() - 0.5) * 42;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else {
    // Painterly speckles / moss / petals / stone / autumn leaves
    for (let i = 0; i < 95; i++) {
      ctx.fillStyle = i % 3 === 0 ? accent : secondary;
      ctx.globalAlpha = 0.25 + rand() * 0.45;
      ctx.beginPath();
      ctx.arc(rand() * 256, rand() * 256, 3 + rand() * 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
  return {
    name: `${preset.label} (256px)`,
    pattern,
    width: 256,
    height: 256,
    dataUrl: canvas.toDataURL('image/png')
  };
}

/**
 * Applies a color harmony palette across a Three.js object or hierarchy.
 */
export function applyMaterialPaletteToObject(root, paletteId = 'kyoto_shrine') {
  const key = String(paletteId || 'kyoto_shrine').toLowerCase().replace(/-/g, '_');
  const palette = MATERIAL_PALETTES[key] || MATERIAL_PALETTES.kyoto_shrine;
  let index = 0;
  root?.traverse?.((node) => {
    if (!node.isMesh || !node.material) return;
    const materials = Array.isArray(node.material) ? node.material.map((m) => m.clone()) : [node.material.clone()];
    for (const matItem of materials) {
      const hex = palette.colors[index % palette.colors.length];
      if (matItem.color) matItem.color.set(hex);
      if ('roughness' in matItem) matItem.roughness = palette.roughness;
      if ('metalness' in matItem) matItem.metalness = palette.metalness;
      matItem.needsUpdate = true;
      index++;
    }
    node.material = Array.isArray(node.material) ? materials : materials[0];
  });
  return index;
}

/**
 * Poses a procedural cat or character rig by matching semantic/named parts.
 */
export function applyCharacterPose(root, pose = 'sit', intensity = 1) {
  if (!root) return 0;
  const k = Number.isFinite(Number(intensity)) ? Number(intensity) : 1;
  const parts = {};
  root.traverse((node) => {
    const tag = (node.userData?.characterPart || node.userData?.cadSemanticId || node.name || '').toLowerCase();
    if (tag.includes('head')) parts.head ||= node;
    if (tag.includes('body') || tag.includes('torso')) parts.body ||= node;
    if (tag.includes('hips')) parts.hips ||= node;
    if (tag.includes('chest')) parts.chest ||= node;
    if (tag.includes('tail.root') || tag.includes('tailroot') || tag === 'tail 1') parts.tail ||= node;
    if (tag.includes('ear.left') || tag.includes('ears 1') || tag.includes('left ear')) parts.earL ||= node;
    if (tag.includes('ear.right') || tag.includes('ears 2') || tag.includes('right ear')) parts.earR ||= node;
    if (tag.includes('leg.front.left') || tag.includes('legs 1')) parts.legFL ||= node;
    if (tag.includes('leg.front.right') || tag.includes('legs 2')) parts.legFR ||= node;
    if (tag.includes('leg.rear.left') || tag.includes('legs 3')) parts.legRL ||= node;
    if (tag.includes('leg.rear.right') || tag.includes('legs 4')) parts.legRR ||= node;
  });

  // Reset rotations first
  for (const part of Object.values(parts)) {
    if (part) part.rotation.set(0, 0, 0);
  }
  if (pose === 'reset') return Object.keys(parts).length;

  if (pose === 'sit') {
    if (parts.body) parts.body.rotation.x = -22 * RAD * k;
    if (parts.head) parts.head.rotation.x = 16 * RAD * k;
    if (parts.legRL) parts.legRL.rotation.x = -55 * RAD * k;
    if (parts.legRR) parts.legRR.rotation.x = -55 * RAD * k;
    if (parts.tail) parts.tail.rotation.z = 25 * RAD * k;
  } else if (pose === 'walk') {
    if (parts.legFL) parts.legFL.rotation.x = 28 * RAD * k;
    if (parts.legRR) parts.legRR.rotation.x = 28 * RAD * k;
    if (parts.legFR) parts.legFR.rotation.x = -24 * RAD * k;
    if (parts.legRL) parts.legRL.rotation.x = -24 * RAD * k;
    if (parts.tail) parts.tail.rotation.x = 18 * RAD * k;
  } else if (pose === 'stretch') {
    if (parts.body) parts.body.rotation.x = 16 * RAD * k;
    if (parts.head) parts.head.rotation.x = -14 * RAD * k;
    if (parts.legFL) parts.legFL.rotation.x = -42 * RAD * k;
    if (parts.legFR) parts.legFR.rotation.x = -42 * RAD * k;
    if (parts.tail) parts.tail.rotation.x = 35 * RAD * k;
  } else if (pose === 'loaf') {
    if (parts.legFL) parts.legFL.rotation.x = 75 * RAD * k;
    if (parts.legFR) parts.legFR.rotation.x = 75 * RAD * k;
    if (parts.legRL) parts.legRL.rotation.x = -75 * RAD * k;
    if (parts.legRR) parts.legRR.rotation.x = -75 * RAD * k;
    if (parts.tail) parts.tail.rotation.y = 45 * RAD * k;
  } else if (pose === 'curious_tilt') {
    if (parts.head) {
      parts.head.rotation.z = 24 * RAD * k;
      parts.head.rotation.y = 14 * RAD * k;
    }
    if (parts.earL) parts.earL.rotation.z = 12 * RAD * k;
    if (parts.earR) parts.earR.rotation.z = -8 * RAD * k;
  } else if (pose === 'play_bow') {
    if (parts.body) parts.body.rotation.x = 24 * RAD * k;
    if (parts.head) parts.head.rotation.x = -20 * RAD * k;
    if (parts.legFL) parts.legFL.rotation.x = -50 * RAD * k;
    if (parts.legFR) parts.legFR.rotation.x = -50 * RAD * k;
    if (parts.tail) parts.tail.rotation.x = 45 * RAD * k;
  } else if (pose === 'sleep_curl') {
    if (parts.body) parts.body.rotation.z = 18 * RAD * k;
    if (parts.head) {
      parts.head.rotation.y = -38 * RAD * k;
      parts.head.rotation.x = 22 * RAD * k;
    }
    if (parts.tail) parts.tail.rotation.y = -55 * RAD * k;
  }

  return Object.keys(parts).length;
}
