/* dawCAT — comprehensive pre-programmed drum rhythm library & groove helpers.
   Pure module (no DOM), shared by the Drum Grid UI, Browser, Project Templates,
   and AI Agent (theory.js / schema.js / executor.js). */

export const RHYTHM_CATEGORIES = [
  'Kyoto & Traditional',
  'Lo-Fi & Chillhop',
  'Electronic & Club',
  'Breaks, Funk & Rock',
  'World & Jazz',
  'Ambient & Cinematic'
];

export const DRUM_RHYTHMS = [
  /* ==================== Kyoto & Traditional ==================== */
  {
    id: 'taiko',
    name: 'Taiko Matsuri',
    category: 'Kyoto & Traditional',
    bpm: 112,
    swing: 0,
    kit: 'taiko',
    key: 'D',
    scale: 'pentatonic minor',
    desc: 'Driving Japanese festival taiko drums with rim kakegoe accents',
    grid: {
      kick: 'x.....x.x...x...',
      tom: '....x.......x.x.',
      rim: 'g.g.g.g.g.g.g.g.',
      perc: 'x.......o.......'
    }
  },
  {
    id: 'gion-procession',
    name: 'Gion Procession',
    category: 'Kyoto & Traditional',
    bpm: 84,
    swing: 0,
    kit: 'taiko',
    key: 'C',
    scale: 'hirajoshi',
    desc: 'Slow ceremonial shrine procession with deep odaiko & kane bell',
    grid: {
      kick: 'x.......o.......',
      tom: '....o.....o.x...',
      rim: '..g...g...g...g.',
      perc: 'x.......x.......'
    }
  },
  {
    id: 'zen-temple',
    name: 'Zen Temple Pulse',
    category: 'Kyoto & Traditional',
    bpm: 72,
    swing: 0,
    kit: 'soft',
    key: 'C',
    scale: 'in sen',
    desc: 'Meditative temple garden pulse with wooden mokugyo & bamboo rim',
    grid: {
      kick: 'x.........o.....',
      rim: '....o.......o...',
      perc: 'o...g...o...g...',
      hatC: '..g...g...g...g.'
    }
  },
  {
    id: 'shishi-odoshi',
    name: 'Shishi-odoshi Bamboo',
    category: 'Kyoto & Traditional',
    bpm: 78,
    swing: 0.08,
    kit: 'soft',
    key: 'F',
    scale: 'pentatonic major',
    desc: 'Rhythmic bamboo water-fountain clapper cadence in a moss garden',
    grid: {
      kick: 'o.......o.....g.',
      rim: '....x..o....x...',
      tom: '..........o.....',
      perc: 'x..g..o.x..g..o.'
    }
  },
  {
    id: 'kagura-dance',
    name: 'Kagura Sacred Dance',
    category: 'Kyoto & Traditional',
    bpm: 118,
    swing: 0,
    kit: 'taiko',
    key: 'A',
    scale: 'hirajoshi',
    desc: 'Lively shrine dance with syncopated toms, claps, and bell',
    grid: {
      kick: 'x..o..x.x..o..x.',
      clap: '....x.......x...',
      tom: '..o...o...o.x.o.',
      rim: 'x.g.x.g.x.g.x.g.',
      perc: 'x.......o.......'
    }
  },
  {
    id: 'bon-odori',
    name: 'Bon Odori Summer',
    category: 'Kyoto & Traditional',
    bpm: 104,
    swing: 0.16,
    kit: 'taiko',
    key: 'G',
    scale: 'pentatonic major',
    desc: 'Traditional summer lantern dance rhythm with swung taiko & claps',
    grid: {
      kick: 'x..o..x...o.x...',
      clap: '....x..o....x...',
      tom: 'o.o...o.o.o...o.',
      rim: '..x...x...x...x.'
    }
  },
  {
    id: 'shamisen-groove',
    name: 'Shamisen Street Groove',
    category: 'Kyoto & Traditional',
    bpm: 116,
    swing: 0.05,
    kit: 'crisp',
    key: 'D',
    scale: 'in sen',
    desc: 'Sharp percussive bachi snap with rolling toms and tight kick',
    grid: {
      kick: 'x..x..o.x..x....',
      snare: '....x..g....x...',
      tom: '..........o.o.x.',
      rim: 'x.o.x.o.x.o.x.o.',
      perc: '....o.......o...'
    }
  },
  {
    id: 'festival',
    name: 'Kyoto Night Festival',
    category: 'Kyoto & Traditional',
    bpm: 122,
    swing: 0,
    kit: 'taiko',
    key: 'C',
    scale: 'pentatonic major',
    desc: 'Upbeat matsuri celebration with four-on-the-floor pulse & toms',
    grid: {
      kick: 'x...x...x...x...',
      tom: '..o...o...o.o.o.',
      clap: '....x.......x...',
      perc: 'x.g.x.g.x.g.x.g.'
    }
  },

  /* ==================== Lo-Fi & Chillhop ==================== */
  {
    id: 'lofi',
    name: 'Kyoto Rain Lo-Fi',
    category: 'Lo-Fi & Chillhop',
    bpm: 82,
    swing: 0.18,
    kit: 'lofi',
    key: 'C',
    scale: 'dorian',
    desc: 'Dusty swung chillhop beat with ghost snares and soft rim ticks',
    grid: {
      kick: 'x......x.x......',
      snare: '....x.......x..g',
      hatC: 'o.g.o.g.o.g.o.g.',
      rim: '..........g.....'
    }
  },
  {
    id: 'boom-bap',
    name: 'Golden Era Boom-Bap',
    category: 'Lo-Fi & Chillhop',
    bpm: 90,
    swing: 0.14,
    kit: 'punch',
    key: 'F',
    scale: 'minor',
    desc: 'Classic 90s head-nod hip-hop pocket with double kick pickup',
    grid: {
      kick: 'x......x..x.....',
      snare: '....x.......x...',
      hatC: 'x.o.x.o.x.o.x.oo'
    }
  },
  {
    id: 'tea-house-chill',
    name: 'Tea House Chillhop',
    category: 'Lo-Fi & Chillhop',
    bpm: 76,
    swing: 0.22,
    kit: 'lofi',
    key: 'Eb',
    scale: 'major',
    desc: 'Lazy late-night study groove with warm rimshot and brush hats',
    grid: {
      kick: 'x.......g.o.....',
      rim: '....x.......x..g',
      hatC: 'o.g.o.g.o.g.o.g.',
      hatO: '..............o.',
      perc: '..g.......g.....'
    }
  },
  {
    id: 'sakura-vinyl',
    name: 'Sakura Vinyl Beat',
    category: 'Lo-Fi & Chillhop',
    bpm: 85,
    swing: 0.15,
    kit: 'lofi',
    key: 'A',
    scale: 'minor',
    desc: 'Warm off-kilter boom-bap with open-hat sigh and woodblock ghost',
    grid: {
      kick: 'x..o....x.o.....',
      snare: '....x..g....x...',
      hatC: 'x.g.x.g.x.g.x.g.',
      hatO: '......o.......o.',
      perc: '...........g....'
    }
  },
  {
    id: 'jazz-hop',
    name: 'Jazz-Hop Pocket',
    category: 'Lo-Fi & Chillhop',
    bpm: 88,
    swing: 0.2,
    kit: 'acoustic',
    key: 'G',
    scale: 'dorian',
    desc: 'Skippy jazz-inflected hip-hop with ghosted snare and warm kick',
    grid: {
      kick: 'x..g..o...x..g..',
      snare: '....x..g.g..x..g',
      hatC: 'x..ox.o.x..ox.o.',
      hatO: '......o.........'
    }
  },
  {
    id: 'neo-soul',
    name: 'Neo-Soul Layback',
    category: 'Lo-Fi & Chillhop',
    bpm: 84,
    swing: 0.18,
    kit: 'acoustic',
    key: 'D',
    scale: 'dorian',
    desc: 'Deep pocket groove with layered clap/rim and syncopated kick',
    grid: {
      kick: 'x.....o...x..o..',
      snare: '....x.......x...',
      rim: '....o..g....o..g',
      hatC: 'o.g.o.g.o.g.o.g.',
      perc: '..o.......o.....'
    }
  },
  {
    id: 'lazy-sunday',
    name: 'Lazy Sunday Catnap',
    category: 'Lo-Fi & Chillhop',
    bpm: 70,
    swing: 0.2,
    kit: 'soft',
    key: 'C',
    scale: 'major',
    desc: 'Ultra-mellow sunlit afternoon pulse with soft shakers and rim',
    grid: {
      kick: 'x.........o.....',
      rim: '....o.......o...',
      hatC: 'o...o...o...o...',
      perc: '..g...g...g...g.'
    }
  },
  {
    id: 'midnight-alley',
    name: 'Midnight Pontocho Alley',
    category: 'Lo-Fi & Chillhop',
    bpm: 86,
    swing: 0.12,
    kit: '808',
    key: 'C',
    scale: 'minor',
    desc: 'Smoky nocturnal beat with deep 808 sub kick and crisp snare',
    grid: {
      kick: 'x..x....o.x.....',
      snare: '....x.......x...',
      hatC: 'x.o.x.xxx.o.x.o.',
      hatO: '......o.........',
      rim: '..............o.'
    }
  },

  /* ==================== Electronic & Club ==================== */
  {
    id: 'four-on-floor',
    name: 'Four-on-the-Floor',
    category: 'Electronic & Club',
    bpm: 124,
    swing: 0,
    kit: 'punch',
    key: 'A',
    scale: 'minor',
    desc: 'Classic house four-on-the-floor kick with offbeat hats and clap',
    grid: {
      kick: 'x...x...x...x...',
      clap: '....x.......x...',
      hatC: '..x...x...x...x.'
    }
  },
  {
    id: 'deep-house',
    name: 'Kyoto Deep House',
    category: 'Electronic & Club',
    bpm: 120,
    swing: 0.08,
    kit: 'crisp',
    key: 'F',
    scale: 'dorian',
    desc: 'Warm rolling deep house groove with open offbeat hats & perc',
    grid: {
      kick: 'x...x...x...x..o',
      clap: '....x.......x...',
      hatC: 'o.g.o.g.o.g.o.g.',
      hatO: '..x...x...x...x.',
      perc: '...o..o....o..o.'
    }
  },
  {
    id: 'uk-garage',
    name: '2-Step UK Garage',
    category: 'Electronic & Club',
    bpm: 130,
    swing: 0.18,
    kit: 'crisp',
    key: 'C',
    scale: 'minor',
    desc: 'Skippy syncopated 2-step garage rhythm with shuffled rim & hats',
    grid: {
      kick: 'x.....x...x.....',
      snare: '....x.......x...',
      rim: '..g......g....o.',
      hatC: 'x.o.x.o.x.o.x.o.',
      hatO: '..o.......o.....'
    }
  },
  {
    id: 'synthwave',
    name: 'Neon Arcade 80s',
    category: 'Electronic & Club',
    bpm: 108,
    swing: 0,
    kit: 'punch',
    key: 'A',
    scale: 'minor',
    desc: 'Driving retro synthwave beat with gated-style snare & tom fill',
    grid: {
      kick: 'x...o...x.o.....',
      snare: '....x.......x...',
      clap: '....o.......o...',
      hatC: 'x.o.x.o.x.o.x.o.',
      tom: '.............o.x'
    }
  },
  {
    id: 'liquid-dnb',
    name: 'Liquid Drum & Bass',
    category: 'Electronic & Club',
    bpm: 170,
    swing: 0,
    kit: 'crisp',
    key: 'F',
    scale: 'minor',
    desc: 'Fast atmospheric 170 BPM two-step roller for energetic runs',
    grid: {
      kick: 'x.........x.....',
      snare: '....x.......x...',
      hatC: 'x.o.x.o.x.o.x.o.',
      hatO: '....o.......o...',
      rim: '.......g.g......'
    }
  },
  {
    id: 'minimal-tech',
    name: 'Minimal Micro-Groove',
    category: 'Electronic & Club',
    bpm: 125,
    swing: 0.06,
    kit: '808',
    key: 'C',
    scale: 'minor',
    desc: 'Hypnotic micro-house clicks, rimshots, and sub kick pulse',
    grid: {
      kick: 'x...x...x...x...',
      rim: '....o..g....o...',
      hatC: '..o...o...o...o.',
      perc: '...g..o..g....o.'
    }
  },
  {
    id: 'trap-808',
    name: '808 Trap Bounce',
    category: 'Electronic & Club',
    bpm: 140,
    swing: 0,
    kit: '808',
    key: 'C',
    scale: 'minor',
    desc: 'Booming 808 sub kicks, half-time clap, and rapid hi-hat rolls',
    grid: {
      kick: 'x.....x...o...x.',
      clap: '........x.......',
      snare: '..............o.',
      hatC: 'x.x.xxx.x.x.xxxx',
      hatO: '....o.......o...'
    }
  },
  {
    id: 'downtempo-idm',
    name: 'Glitch Garden IDM',
    category: 'Electronic & Club',
    bpm: 96,
    swing: 0,
    kit: 'crisp',
    key: 'D',
    scale: 'dorian',
    desc: 'Intricate syncopated micro-percussion and melodic tom droplets',
    grid: {
      kick: 'x..o..x....o....',
      snare: '....x..g.o..x...',
      hatC: 'x.gxx.g.x.gxx.g.',
      tom: '...o.....o....o.',
      perc: '.g....o....g..x.'
    }
  },

  /* ==================== Breaks, Funk & Rock ==================== */
  {
    id: 'backbeat',
    name: 'Classic Backbeat',
    category: 'Breaks, Funk & Rock',
    bpm: 110,
    swing: 0,
    kit: 'acoustic',
    key: 'C',
    scale: 'major',
    desc: 'Solid 2 & 4 snare backbeat with steady eighth-note hi-hats',
    grid: {
      kick: 'x.......x.x.....',
      snare: '....x.......x...',
      hatC: 'x.o.x.o.x.o.x.o.'
    }
  },
  {
    id: 'breakbeat',
    name: 'Amen Breakbeat',
    category: 'Breaks, Funk & Rock',
    bpm: 136,
    swing: 0,
    kit: 'punch',
    key: 'C',
    scale: 'minor',
    desc: 'Syncopated classic breakbeat with ghost snares & open hat bark',
    grid: {
      kick: 'x.x.......x.....',
      snare: '....x..g.x..x...',
      hatC: 'x.x.x.x.x.x.x.x.',
      hatO: '..............x.'
    }
  },
  {
    id: 'funky-drummer',
    name: 'Funky Cat Strut',
    category: 'Breaks, Funk & Rock',
    bpm: 102,
    swing: 0.1,
    kit: 'acoustic',
    key: 'E',
    scale: 'dorian',
    desc: 'Busy 16th-note hats, ghost snares, and syncopated funk kick',
    grid: {
      kick: 'x.o...x...o..x..',
      snare: '....x..g.g..x..g',
      hatC: 'xoxoxox.xoxoxox.',
      hatO: '.......x.......x'
    }
  },
  {
    id: 'half-time',
    name: 'Half-Time Groove',
    category: 'Breaks, Funk & Rock',
    bpm: 110,
    swing: 0,
    kit: 'punch',
    key: 'C',
    scale: 'minor',
    desc: 'Spacious half-time feel with heavy snare on beat 3',
    grid: {
      kick: 'x.........x.....',
      snare: '........x.......',
      hatC: 'x.o.x.o.x.o.x.o.'
    }
  },
  {
    id: 'shuffle',
    name: 'Purr Shuffle',
    category: 'Breaks, Funk & Rock',
    bpm: 105,
    swing: 0.25,
    kit: 'acoustic',
    key: 'G',
    scale: 'major',
    desc: 'Bouncy swung shuffle groove for strolling down cobblestone lanes',
    grid: {
      kick: 'x.....x.x.......',
      snare: '....x.......x...',
      hatC: 'x..ox..ox..ox..o'
    }
  },
  {
    id: 'motown-stomp',
    name: 'Four-Corner Motown',
    category: 'Breaks, Funk & Rock',
    bpm: 116,
    swing: 0.08,
    kit: 'acoustic',
    key: 'C',
    scale: 'major',
    desc: 'Upbeat soul stomp with snare & clap on every quarter note',
    grid: {
      kick: 'x.o.x...x.o.x...',
      snare: 'x...x...x...x...',
      clap: '....x.......x...',
      hatC: 'x.o.x.o.x.o.x.o.',
      perc: '..o...o...o...o.'
    }
  },
  {
    id: 'indie-motorik',
    name: 'Krautrock Motorik',
    category: 'Breaks, Funk & Rock',
    bpm: 126,
    swing: 0,
    kit: 'punch',
    key: 'D',
    scale: 'major',
    desc: 'Relentless hypnotic driving 8th-note pulse for long journeys',
    grid: {
      kick: 'x.x.x...x.x.x...',
      snare: '....x.......x...',
      hatC: 'x.x.x.x.x.x.x.x.',
      hatO: '..............o.'
    }
  },

  /* ==================== World & Jazz ==================== */
  {
    id: 'bossa',
    name: 'Bossa Nova Cafe',
    category: 'World & Jazz',
    bpm: 118,
    swing: 0,
    kit: 'soft',
    key: 'F',
    scale: 'major',
    desc: 'Warm Brazilian surdo pulse and syncopated cross-stick clave',
    grid: {
      kick: 'x..xx..xx..xx..x',
      rim: 'x..x..x...x..x..',
      hatC: 'xoxoxoxoxoxoxoxo'
    }
  },
  {
    id: 'samba',
    name: 'Samba Batucada',
    category: 'World & Jazz',
    bpm: 124,
    swing: 0,
    kit: 'acoustic',
    key: 'G',
    scale: 'major',
    desc: 'Vibrant carnival surdo, tamborim rim, and 16th shaker groove',
    grid: {
      kick: 'o..xx..xo..xx..x',
      snare: '..g..o.g..g..o.g',
      rim: 'x.x.x.x.x.x.x.x.',
      tom: '...x.......x....',
      hatC: 'oxoxoxoxoxoxoxox'
    }
  },
  {
    id: 'afrobeat',
    name: 'Afrobeat Polyrhythm',
    category: 'World & Jazz',
    bpm: 112,
    swing: 0.08,
    kit: 'acoustic',
    key: 'A',
    scale: 'dorian',
    desc: 'Interlocking woodblock/rim clave, conversational toms & kick',
    grid: {
      kick: 'x..o..x...o...x.',
      snare: '....o..g....x...',
      rim: 'x..x..o...x..x..',
      tom: '......o..o....o.',
      hatC: 'x.o.x.o.x.o.x.o.',
      hatO: '..o.......o.....'
    }
  },
  {
    id: 'reggae-onedrop',
    name: 'Reggae One-Drop',
    category: 'World & Jazz',
    bpm: 78,
    swing: 0.15,
    kit: 'soft',
    key: 'A',
    scale: 'minor',
    desc: 'Laid-back sunshine groove with kick & cross-stick on beat 3',
    grid: {
      kick: '........x.......',
      rim: '........x.....g.',
      hatC: 'x.o.x.o.x.o.x.o.',
      perc: '..o...o...o...o.'
    }
  },
  {
    id: 'dub-steppers',
    name: 'Dub Steppers Echo',
    category: 'World & Jazz',
    bpm: 128,
    swing: 0,
    kit: 'lofi',
    key: 'C',
    scale: 'minor',
    desc: 'Four-on-the-floor dub steppers built for deep delay throws',
    grid: {
      kick: 'x...x...x...x...',
      snare: '........x.......',
      rim: '....o.......x...',
      hatC: '..x.o.x...x.o.x.',
      hatO: '......o.......o.'
    }
  },
  {
    id: 'jazz-ride',
    name: 'Jazz Club Swing',
    category: 'World & Jazz',
    bpm: 114,
    swing: 0.28,
    kit: 'acoustic',
    key: 'F',
    scale: 'major',
    desc: 'Swung jazz ride/hat pattern with feathered kick and rim comping',
    grid: {
      kick: 'g...g...g...g.o.',
      rim: '....o..g....o...',
      hatC: 'x..ox.o.x..ox.o.',
      hatO: '....o.......o...'
    }
  },

  /* ==================== Ambient & Cinematic ==================== */
  {
    id: 'ambient-pulse',
    name: 'Ambient Dewdrop',
    category: 'Ambient & Cinematic',
    bpm: 72,
    swing: 0,
    kit: 'soft',
    key: 'C',
    scale: 'pentatonic major',
    desc: 'Delicate breathing pulse with soft high-frequency shimmer',
    grid: {
      kick: 'o...............',
      perc: '........g.......',
      hatC: '....g.......g...'
    }
  },
  {
    id: 'heartbeat',
    name: 'Cat Heartbeat',
    category: 'Ambient & Cinematic',
    bpm: 68,
    swing: 0,
    kit: 'soft',
    key: 'C',
    scale: 'minor',
    desc: 'Warm double-thump heartbeat with distant chime percussion',
    grid: {
      kick: 'x.o.............',
      perc: '........g.......'
    }
  },
  {
    id: 'march',
    name: "Philosopher's March",
    category: 'Ambient & Cinematic',
    bpm: 104,
    swing: 0,
    kit: 'acoustic',
    key: 'C',
    scale: 'major',
    desc: 'Crisp snare rudiments over a steady walking bass drum',
    grid: {
      kick: 'x.......x.......',
      snare: 'x.gxx.g.x.gxx.xx'
    }
  },
  {
    id: 'stealth-paws',
    name: 'Stealth Paws Tiptoe',
    category: 'Ambient & Cinematic',
    bpm: 98,
    swing: 0.12,
    kit: 'soft',
    key: 'A',
    scale: 'harmonic minor',
    desc: 'Playful tiptoe rhythm with rim clicks and sneaky tom steps',
    grid: {
      kick: 'o.......o.....g.',
      rim: '..o...g...o...g.',
      tom: '....o.......o.o.',
      hatC: 'g.g.g.g.g.g.g.g.'
    }
  },
  {
    id: 'moonlit-shrine',
    name: 'Moonlit Shrine Mystery',
    category: 'Ambient & Cinematic',
    bpm: 80,
    swing: 0,
    kit: 'taiko',
    key: 'E',
    scale: 'in sen',
    desc: 'Deep ceremonial tom resonance with sparse metallic bell hits',
    grid: {
      kick: 'x...........o...',
      tom: '......o...o.....',
      rim: '....g.......g...',
      perc: 'x.......o.......'
    }
  }
];

export const RHYTHM_BY_ID = new Map(DRUM_RHYTHMS.map((r) => [r.id, r]));

/* Flat map { [id]: grid } compatible with theory.js GROOVES */
export const GROOVE_GRIDS = Object.fromEntries(DRUM_RHYTHMS.map((r) => [r.id, r.grid]));

export function getRhythm(idOrName) {
  if (!idOrName) return null;
  const s = String(idOrName).trim().toLowerCase();
  if (RHYTHM_BY_ID.has(s)) return RHYTHM_BY_ID.get(s);
  const squashed = s.replace(/[^a-z0-9]/g, '');
  return DRUM_RHYTHMS.find((r) =>
    r.id.replace(/[^a-z0-9]/g, '') === squashed ||
    r.name.toLowerCase().replace(/[^a-z0-9]/g, '') === squashed
  ) || null;
}

/* Pattern manipulation helpers for the Drum Grid editor */

export function humanizeSteps(steps, amount = 0.12) {
  const out = {};
  for (const [lane, arr] of Object.entries(steps || {})) {
    out[lane] = (arr || []).map((v, i) => {
      if (!v) return 0;
      const jitter = (Math.sin(i * 12.9898 + lane.charCodeAt(0) * 78.233) * 43758.5453) % 1;
      const delta = (jitter - 0.5) * 2 * amount;
      return Math.min(1, Math.max(0.15, Math.round((v + delta) * 100) / 100));
    });
  }
  return out;
}

export function rotateSteps(steps, shift = 1) {
  const out = {};
  for (const [lane, arr] of Object.entries(steps || {})) {
    const a = (arr || []).slice(0, 16);
    while (a.length < 16) a.push(0);
    out[lane] = a.map((_, i) => a[(i - shift + 160) % 16]);
  }
  return out;
}

export function addDrumFill(steps) {
  const out = JSON.parse(JSON.stringify(steps || {}));
  if (!Array.isArray(out.tom)) out.tom = new Array(16).fill(0);
  if (!Array.isArray(out.snare)) out.snare = new Array(16).fill(0);
  if (!Array.isArray(out.hatO)) out.hatO = new Array(16).fill(0);
  out.tom[12] = 0.75;
  out.tom[13] = 0.85;
  out.tom[14] = 0.9;
  out.tom[15] = 1.0;
  out.snare[11] = 0.45;
  out.snare[14] = 0.85;
  out.snare[15] = 0.95;
  out.hatO[15] = 0.85;
  return out;
}
