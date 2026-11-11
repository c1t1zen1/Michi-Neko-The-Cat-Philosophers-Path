// The hub: static rows rendered from the registry (no WebGL).
import { TIERS, REASONS, LABS, EXTRAS } from './registry.js';

const $ = (s) => document.querySelector(s);
const nn = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const poster = (path) => `${path}?rev=20261110a`;

const STATUS = { live: 'Open the lab →', next: 'Being built next', planned: 'Planned', elsewhere: 'Owned by the summit effort' };

const open = LABS.filter((l) => l.status === 'live').length;
const next = LABS.find((l) => l.status === 'next');
$('#progress').innerHTML = `<b>${open}</b> of ${LABS.length} labs open${next ? ` · next up: <b>${nn(next.n)} ${esc(next.title)}</b>` : ''}`;

const HOW = [
  ['Research', '10–15 sources, notes in each lab\'s research.md'],
  ['Lab', 'variants, a signature interaction, learn-by-building steps'],
  ['Review sheet', 'a seeded capture in tools/'],
  ['The game', 'the winner moves into src/']
];
$('#how').innerHTML = HOW.map(([t, s], i) => `<li><span class="n">${nn(i + 1)}</span><b>${t}</b><span>${s}</span></li>`).join('');

// Every open lab without a hand-written card above gets one here, from the registry.
const CURATED = new Set(['pagoda', 'sky', 'ground', 'water', 'ranges', 'machiya', 'interiors', 'shrine', 'garden']);
const ALT = {
  shrine: 'A vermilion torii across a stone path, with a shrine hall, stone lanterns and tall cedars behind it.',
  moonpool: 'A dark pool at night, the moon broken into rippling light, with paper lanterns strung behind and reflected in the water.',
  summit: 'A city of thousands of small roofs in a basin at dusk, seen from a perch, with haze between the hills.',
  nest: 'A nest of woven twigs on a mossy stone below a tiled roof, with Michi curled up inside it.',
  lanterns: 'A stone-paved street at dusk lined with lit stone lanterns and paper lanterns hanging along plaster walls.',
  fences: 'A curving bamboo fence beside a gravel path, with Michi walking past and long shadows across the path.',
  rocks: 'A dry garden: groups of stones on raked gravel with cedars behind.',
  garden: 'A small courtyard with a bamboo deer-scarer over a stone basin, in late afternoon light against a plaster wall.',
  greenery: 'A grove of bamboo with Michi walking between the tall culms.',
  alley: 'A narrow Kyoto lane between two walls, with potted plants, barrels and a signboard along the paving.',
  keepsakes: 'Michi in a tall flowering meadow, with a small gold key half hidden in the grass.',
  critters: 'Painted koi gathering at the surface of a pond ringed with mossy stones.',
  villagers: 'Village cats in a square at dusk in front of a lit doorway.',
  weather: 'Rain falling on a stone-ringed pond beside a small house, with snow settled on the stones.',
  komorebi: 'Michi on a shaded forest floor scattered with round coins of sunlight.'
};
const fresh = LABS.filter((l) => l.status === 'live' && l.poster && !CURATED.has(l.slug)).sort((a, b) => a.n - b.n);
$('#new-labs').innerHTML = fresh.length ? `<h2 class="eyebrow">More live studies</h2><div class="new-grid">${fresh.map((l) => `
  <article class="new-card">
    <a class="new-main" href="${esc(l.href)}">
      <img src="${esc(poster(l.poster))}" width="1200" height="750" alt="${esc(ALT[l.slug] || l.title)}" loading="lazy">
      <p class="eyebrow">Lab ${nn(l.n)} · <span class="jp" lang="ja">${l.jp}</span></p>
      <h3>${esc(l.title)}</h3>
      <p class="new-q">${esc(l.question)}</p>
    </a>
    <nav class="feature-links" aria-label="${esc(l.title)} resources"><a href="${esc(l.href)}">Open the lab ↗</a><a href="${esc(l.href)}research.md">Read the research ↗</a></nav>
  </article>`).join('')}</div>` : '';

const extra = (e) => `<a class="x" href="${esc(e.href)}">${e.poster ? `<img class="x-preview" src="${esc(poster(e.poster))}" width="1200" height="750" loading="lazy" alt="Michi walking through a slab of procedural grass.">` : ''}<span class="jp x-jp">${e.jp}</span><span class="x-t">${esc(e.title)}</span><span class="x-r">${esc(e.romaji)}</span><span class="x-b">${esc(e.blurb)}</span></a>`;
const group = (kind) => EXTRAS.filter((e) => e.kind === kind).map(extra).join('');
$('#extras').innerHTML = `<h2 class="eyebrow">Already at the new standard</h2><div class="xrow">${group('standard')}</div>
  <h2 class="eyebrow">Prototypes</h2><div class="xrow">${group('prototype')}</div>`;

$('#tiers').innerHTML = TIERS.map((t) => `
  <section class="tier" style="--tier:${t.accent}">
    <div class="tier-head"><span class="tier-n">${t.n}</span><h2>${esc(t.title)}</h2><p>${esc(t.sub)}</p></div>
    <ol class="rows">${LABS.filter((l) => l.tier === t.n).map((l) => {
      const live = l.status === 'live' && l.href;
      const title = `${esc(l.title)} <span class="jp">${l.jp}</span> <i>${esc(l.romaji)}</i>`;
      const body = `<span class="r-n">${nn(l.n)}</span>
        <span class="r-main"><span class="r-title">${live ? `<a href="${esc(l.href)}">${title}</a>` : title}</span>
        <span class="r-q">${esc(l.question)}</span>
        <span class="r-chips">${l.reasons.map((r) => `<span class="chip" title="${esc(REASONS[r])}">${r}</span>`).join('')}</span>
        <code class="r-b">${l.builders.map(esc).join(' · ')}</code></span>
        <span class="r-actions">${live ? `<a class="r-s" href="${esc(l.href)}">${STATUS[l.status]}</a>` : `<span class="r-s">${STATUS[l.status]}</span>`}${l.href ? `<a class="r-research" href="${esc(l.href)}research.md" aria-label="Read ${esc(l.title)} research">Read research ↗</a>` : ''}</span>
        ${live && l.poster ? `<a class="r-poster" href="${esc(l.href)}" aria-label="Open ${esc(l.title)} lab"><img class="r-img" src="${esc(poster(l.poster))}" alt="" loading="lazy" width="1200" height="750"></a>` : ''}`;
      return `<li class="row ${l.status}" id="lab-${esc(l.slug)}"><div>${body}</div></li>`;
    }).join('')}</ol>
  </section>`).join('');
