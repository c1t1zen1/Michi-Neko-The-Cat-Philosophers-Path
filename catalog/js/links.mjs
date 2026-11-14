// Catalog links use project-relative paths so the tools work on localhost and
// under a GitHub Pages repository prefix. Never execute a source anchor as code.
const LABS = new Set(['ground', 'water', 'ranges', 'machiya', 'sky', 'shrine', 'moonpool', 'pagoda', 'summit', 'nest', 'lanterns', 'fences', 'rocks', 'garden', 'greenery', 'alley', 'keepsakes', 'critters', 'villagers', 'weather', 'interiors', 'komorebi', 'grass']);
const REPO = 'https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/blob/main/';

function projectPath(value) {
  const path = String(value || '');
  if (!path || path.startsWith('/') || path.includes('\\') || /[\u0000-\u0020]/.test(path)) throw new Error('Expected a project-relative path');
  let decoded;
  try { decoded = decodeURIComponent(path.split(/[?#]/)[0]); } catch { throw new Error('Invalid encoded path'); }
  if (decoded.includes('\\') || decoded.startsWith('/') || decoded.split('/').some((part) => part === '..' || part === '.')) throw new Error('Path must stay inside the project');
  const url = new URL(path, 'https://catalog.invalid/');
  if (url.origin !== 'https://catalog.invalid') throw new Error('External project link rejected');
  return path;
}

function fromProject(path, rootUrl) {
  const safe = projectPath(path);
  if (!rootUrl) return '../' + safe;
  const root = new URL(rootUrl);
  if (!['http:', 'https:'].includes(root.protocol) || root.username || root.password) throw new Error('Invalid project root URL');
  if (!root.pathname.endsWith('/')) root.pathname += '/';
  root.search = ''; root.hash = '';
  const url = new URL(safe, root);
  if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) throw new Error('Link escaped the project root');
  return url.href;
}

function selector(value) {
  const id = String(value || '');
  if (!/^[a-z0-9][a-z0-9_-]{0,99}$/i.test(id)) throw new Error('Invalid specimen selector');
  return id;
}

/** Open an actual named specimen, a bench or the inventory's review page. */
export function resolveTargetLink(target, { rootUrl } = {}) {
  if (!target || typeof target !== 'object') throw new Error('An evidence target is required');
  if (target.url) return fromProject(target.url, rootUrl);
  if (!LABS.has(target.lab)) throw new Error('Unknown lab: ' + target.lab);
  const id = selector(target.selector);
  let path;
  if (target.lab === 'ranges') {
    const anchors = { stack: 'stack', 'wall-mass': 'wall', edge: 'edge', foothills: 'stage', air: 'air', 'foothill-stands': 'life', village: 'life', mists: 'life' };
    if (!anchors[id]) throw new Error('Unknown ranges bench: ' + id);
    path = `labs/ranges/${id === 'wall-mass' ? '?wall4=mass' : ''}#${anchors[id]}`;
  } else if (target.lab === 'interiors') {
    if (target.kind === 'bench') {
      if (!['tatami', 'shoji', 'pottery', 'frame', 'tokonoma', 'scroll', 'chabudai', 'zabuton', 'bonsai', 'knockables'].includes(id)) throw new Error('Unknown interiors craft: ' + id);
      path = `labs/interiors/?craft=${id}#craft`;
    } else if (target.kind === 'interaction') {
      if (id !== 'bat-cup') throw new Error('Unknown interiors interaction: ' + id);
      path = 'labs/interiors/?room=garden#house';
    } else path = `labs/interiors/?room=${encodeURIComponent(id)}&specimen=${encodeURIComponent(id)}#specimen-${encodeURIComponent(id)}`;
  } else {
    const hash = target.lab === 'grass' ? id : ['ground', 'water'].includes(target.lab) ? 'v-' + id : 'specimen-' + id;
    path = `labs/${target.lab}/?specimen=${encodeURIComponent(id)}#${encodeURIComponent(hash)}`;
  }
  return fromProject(path, rootUrl);
}

/** GitHub source is a source link, never a substitute for a playable specimen. */
export function sourceLink(source, { line = null } = {}) {
  const file = projectPath(typeof source === 'string' ? source : source?.file).split(/[?#]/)[0];
  const n = Number(line);
  const suffix = Number.isInteger(n) && n > 0 ? '#L' + n : '';
  return REPO + file.split('/').map(encodeURIComponent).join('/') + suffix;
}

/** Existing game review contexts. The catalog's isolated viewer is separate. */
export function originalContextLink(asset, { rootUrl } = {}) {
  const id = String(asset?.id || ''), group = String(asset?.group || '');
  const files = (asset?.sources || []).map((s) => s.file).join(' ');
  let path = 'index.html', label = 'Open the game';
  let note = 'The game opens normally. This link does not teleport the player or alter save data.';
  if (/src\/mountaintop\.js/.test(files)) {
    path = 'tools/summit_preview.html?view=meditation'; label = 'Summit game review';
    note = 'The real summit scene. Use its camera, time and weather flags to inspect this asset in context.';
  } else if (['michi', 'luna', 'mochi', 'kuro'].includes(id) || group === 'Cat components' || /src\/cat(?:_|\.)/.test(files)) {
    const sheet = ['luna', 'mochi', 'kuro'].includes(id) ? 'npcs' : id === 'cat-face' ? 'face' : id === 'cat-coat' ? 'coat' : id === 'cat-collar' ? 'closeup' : 'anatomy';
    path = 'tools/cat_preview.html?sheet=' + sheet; label = 'Game cat review';
    note = 'Fixed review views use the real game Cat. Special cosmetics require their own isolated catalog adapter.';
  } else if (['sakura', 'maples', 'pines', 'rim-trees', 'tree-trunks', 'tree-canopies'].includes(id)) {
    path = 'tools/tree_preview.html?sheet=' + (id === 'rim-trees' ? 'rim' : 'hero'); label = 'Game tree review';
    note = 'Review sheets build the real game tree families with seeded randomness.';
  } else if (/src\/hidden_places\.js/.test(files)) {
    path = 'tools/hidden_preview.html?sheet=' + (id.startsWith('glade') || id === 'lantern-glade' ? 'glade' : 'pool'); label = 'Hidden-place game review';
    note = 'The complete original hidden place, with its surrounding props and effects.';
  } else if (id.startsWith('grass-') || id === 'meadow-system' || /src\/grass\.js/.test(files)) {
    path = 'tools/grass_preview.html?spot=meadow'; label = 'Game grass review';
    note = 'A real valley grass view. The whole meadow is shown, rather than an isolated recipe.';
  } else if (/src\/countryside\.js/.test(files)) {
    const landmarks = ['torii', 'shrine-hall', 'shimenawa', 'shrine-bell', 'offering-box', 'mist-altar', 'distant-pagoda'];
    const street = ['tea-house', 'residence', 'secret-house', 'street-house', 'village-street', 'kawara-roof', 'koushi', 'engawa', 'timber-frame', 'upper-windows', 'noren', 'namako', 'tea-bench'];
    path = 'tools/town_preview.html?sheet=' + (landmarks.includes(id) ? 'landmarks' : street.includes(id) ? 'street' : 'props'); label = 'Town game review';
    note = 'A fixed scene sheet built from the original Countryside. Its cameras may not frame this individual asset; use the isolated catalog viewer for exact inspection.';
  }
  const href = fromProject(path, rootUrl);
  return { href, url: href, label, note, wholeScene: true };
}
