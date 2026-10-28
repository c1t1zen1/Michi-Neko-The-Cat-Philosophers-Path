// Every lab, in order. The hub and each lab's nav read this; no browser deps.
export const TIERS = [
  { n: 1, title: 'Biggest visual return', sub: 'Ground, water, sky and the forest wall are in nearly every frame.', accent: '#4d7c34' },
  { n: 2, title: 'Landmarks where players stop', sub: 'Places to sit, look around and take a screenshot.', accent: '#b5533a' },
  { n: 3, title: 'Props the cat walks past', sub: 'Seen from one to three metres away, and built many times over.', accent: '#4a6f8f' },
  { n: 4, title: 'Life, effects & interiors', sub: 'What moves, glows and makes the valley feel lived in.', accent: '#8a5a96' }
];
export const REASONS = {
  'screen share': 'How much of a typical frame it fills.',
  'cat-eye distance': 'The camera sits low and close; box edges and flat textures show from 1–3 m.',
  'landmark': 'A place where players stop, sit and take screenshots.',
  'repeats': 'Built many times over, so one fix lands everywhere.',
  'light carrier': 'Drives the time-of-day and weather look: glow, reflection, wetness.',
  'life': 'Moves, and makes the world feel inhabited.'
};
export const LABS = [
  { n: 1, slug: 'ground', tier: 1, title: 'Ground, path & shoulders', jp: '土と道', romaji: 'tsuchi to michi', status: 'live', href: 'ground/', poster: 'ground/poster.jpg', reasons: ['screen share', 'cat-eye distance'], question: 'How do earth, gravel, moss and cobble meet without seams, and where does the rain pool?', builders: ['buildGround', 'buildPath', 'buildPathShoulders', 'buildWalkwaySlabs'] },
  { n: 2, slug: 'water', tier: 1, title: 'River, bridge & paddies', jp: '川と田んぼ', romaji: 'kawa to tanbo', status: 'next', href: 'water/', reasons: ['screen share', 'light carrier'], question: 'How does water show which way it flows, how deep it is, and what it reflects?', builders: ['buildRiverAndBridge', 'createRiverWaterMaterial', 'buildPaddies', 'createPaddyWaterMaterial'] },
  { n: 3, slug: 'ranges', tier: 1, title: 'Forest wall & mountains', jp: '山並み', romaji: 'yamanami', status: 'planned', href: 'ranges/', reasons: ['screen share'], question: 'How do painters stack ridges into distance, and how cheap can a forest wall be?', builders: ['buildEdgeForest', 'buildFoothillForest', 'buildEdgeUndergrowth', 'buildMountains', 'buildMistRing'] },
  { n: 4, slug: 'machiya', tier: 1, title: 'Machiya', jp: '町家', romaji: 'machiya', status: 'planned', href: 'machiya/', reasons: ['landmark', 'cat-eye distance', 'repeats'], question: 'How is a Kyoto townhouse put together, post by post and tile by tile?', builders: ['buildMachiyaTeaHouse', 'buildMachiyaResidence', 'buildSecretMachiya', 'buildVillageHouse', 'createKawaraRoof', 'createKoushi', 'createEngawa'] },
  { n: 5, slug: 'sky', tier: 1, title: 'Sky, clouds & cloud shadows', jp: '空と雲', romaji: 'sora to kumo', status: 'planned', href: 'sky/', reasons: ['screen share', 'light carrier'], question: 'Can clouds look volumetric for the price of a few texture reads, and throw shadows on the grass?', builders: ['sky.js buildClouds / buildDome', 'postfx.js'] },
  { n: 6, slug: 'shrine', tier: 2, title: 'Torii, sandō & shrine', jp: '鳥居と参道', romaji: 'torii to sandō', status: 'planned', href: 'shrine/', reasons: ['landmark'], question: 'What gives a torii its lift, and what lines the approach to a shrine?', builders: ['buildTorii', 'buildShrine', 'buildMistAltar', 'buildOfferingBells'] },
  { n: 7, slug: 'moonpool', tier: 2, title: 'Moon Pool & Lantern Glade', jp: '月の池', romaji: 'tsuki no ike', status: 'planned', href: 'moonpool/', reasons: ['landmark', 'light carrier'], question: 'How does a moon reflection break up in ripples, and how does lantern light glow through paper?', builders: ['hidden_places.js'] },
  { n: 8, slug: 'pagoda', tier: 2, title: 'Distant pagoda', jp: '五重塔', romaji: 'gojū-no-tō', status: 'planned', href: 'pagoda/', reasons: ['landmark', 'screen share'], question: 'What makes a five-storey pagoda read from a kilometre away?', builders: ['buildDistantPagoda'] },
  { n: 9, slug: 'summit', tier: 2, title: 'Summit vista & gate', jp: '天上', romaji: 'tenjō', status: 'elsewhere', href: null, reasons: ['landmark'], question: 'The reward view. Owned by the summit effort, so it waits for them.', builders: ['mountaintop.js'] },
  { n: 10, slug: 'nest', tier: 2, title: "The cat's nest", jp: '巣', romaji: 'su', status: 'planned', href: 'nest/', reasons: ['landmark'], question: 'How do you weave a nest out of twigs, one stick at a time?', builders: ['buildBirdNest'] },
  { n: 11, slug: 'lanterns', tier: 3, title: 'Lanterns', jp: '灯籠と提灯', romaji: 'tōrō to chōchin', status: 'planned', href: 'lanterns/', reasons: ['repeats', 'light carrier'], question: 'How does light fall off through ribbed paper, and how does lichen settle on stone?', builders: ['buildToroLantern', 'createChochinLantern', 'buildLanterns'] },
  { n: 12, slug: 'fences', tier: 3, title: 'Fences & the corral', jp: '竹垣', romaji: 'takegaki', status: 'planned', href: 'fences/', reasons: ['cat-eye distance', 'repeats'], question: 'How is a bamboo fence lashed, and how does it lean as it ages?', builders: ['buildBambooFence', 'buildBambooCorral'] },
  { n: 13, slug: 'rocks', tier: 3, title: 'Rocks & boulders', jp: '石', romaji: 'ishi', status: 'planned', href: 'rocks/', reasons: ['cat-eye distance'], question: 'How do you sculpt a believable boulder from signed distances, and where does moss grow on it?', builders: ['buildPathBoulders', 'buildKeyHidingRock'] },
  { n: 14, slug: 'garden', tier: 3, title: 'Water-garden props', jp: '鹿威し', romaji: 'shishi-odoshi', status: 'planned', href: 'garden/', reasons: ['landmark', 'life'], question: 'How do the deer-scarer and the wind chime keep time with water and wind?', builders: ['buildShishiOdoshi', 'buildWindChime', 'buildOfferingBells'] },
  { n: 15, slug: 'greenery', tier: 3, title: 'Bushes, street greenery & bamboo', jp: '竹林', romaji: 'chikurin', status: 'planned', href: 'greenery/', reasons: ['repeats'], question: 'What does a bamboo culm look like up close: nodes, sheaths, scars?', builders: ['buildStreetBushes', 'buildStreetGreenery', 'buildBambooGrove'] },
  { n: 16, slug: 'alley', tier: 3, title: 'Climb crates & street clutter', jp: '路地', romaji: 'roji', status: 'planned', href: 'alley/', reasons: ['cat-eye distance'], question: 'What does a Kyoto alley really hold, at cat height?', builders: ['createClimbCrates', 'buildVillageStreet'] },
  { n: 17, slug: 'keepsakes', tier: 3, title: 'Yarn & the secret key', jp: '毛糸と鍵', romaji: 'keito to kagi', status: 'planned', href: 'keepsakes/', reasons: ['life'], question: 'How do you make a collectible read against busy grass without shouting?', builders: ['buildYarn', 'buildSecretKey'] },
  { n: 18, slug: 'critters', tier: 4, title: 'Koi, birds & butterflies', jp: '鯉・鳥・蝶', romaji: 'koi, tori, chō', status: 'planned', href: 'critters/', reasons: ['life'], question: 'How do koi school, birds flap in silhouette, and butterflies choose a flower?', builders: ['ambient_life.js'] },
  { n: 19, slug: 'villagers', tier: 4, title: 'Villager cats', jp: '村の猫', romaji: 'mura no neko', status: 'planned', href: 'villagers/', reasons: ['life'], question: 'How do cats groom, and why do their eyes shine at dusk?', builders: ['npc.js'] },
  { n: 20, slug: 'weather', tier: 4, title: 'Petals, rain, snow & motes', jp: '花びら・雨・雪', romaji: 'hanabira, ame, yuki', status: 'planned', href: 'weather/', reasons: ['light carrier'], question: 'Where does rain splash, where does snow settle, and where do petals collect?', builders: ['particles.js'] },
  { n: 21, slug: 'interiors', tier: 4, title: 'Interiors', jp: '座敷', romaji: 'zashiki', status: 'planned', href: 'interiors/', reasons: ['landmark'], question: 'How does light come through shoji onto tatami, and what can a cat knock over?', builders: ['interior.js'] },
  { n: 22, slug: 'komorebi', tier: 4, title: 'Dappled light & petal drifts', jp: '木漏れ日', romaji: 'komorebi', status: 'planned', href: 'komorebi/', reasons: ['light carrier'], question: 'How does sunlight through leaves become moving coins of light on the ground?', builders: ['buildDappledLight', 'buildPetalDrifts'] }
];
export const EXTRAS = [
  { slug: 'grass', kind: 'standard', title: 'Grass Lab', jp: '草', romaji: 'kusa', href: '../grass/', blurb: 'Twenty procedural grasses in live cubes, and a slab where Michi walks through them. Already in the game.' },
  { slug: 'cat', kind: 'standard', title: 'Cat review sheets', jp: '猫', romaji: 'neko', href: '../tools/cat_preview.html?sheet=anatomy', blurb: 'The sculpted cat, its coats, gaits and poses, from fixed angles.' },
  { slug: 'trees', kind: 'standard', title: 'Tree review sheets', jp: '木', romaji: 'ki', href: '../tools/tree_preview.html?sheet=hero', blurb: 'Hero trees in leaf sprays, rim trees in painted leaf masses.' },
  { slug: 'roofroad', kind: 'prototype', title: 'The Roof Road', jp: '屋根道', romaji: 'yane-michi', href: '../kyoto-rooftops.html', blurb: 'A side-scrolling run over old Kyoto roofs, past the valley bridge.' }
];
export const bySlug = (s) => LABS.find((l) => l.slug === s);
