// The hub: static rows rendered from the registry (no WebGL).
import { TIERS, REASONS, LABS, EXTRAS } from './registry.js';

const $ = (s) => document.querySelector(s);
const nn = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const STATUS = { live: 'Open the lab →', next: 'Being built next', planned: 'Planned', elsewhere: 'Owned by the summit effort' };

const open = LABS.filter((l) => l.status === 'live').length;
const next = LABS.find((l) => l.status === 'next');
$('#progress').innerHTML = `<b>${open}</b> of ${LABS.length} labs open${next ? ` · next up: <b>${nn(next.n)} ${esc(next.title)}</b>` : ''}`;

const HOW = [
  ['Research', '10–15 sources, notes in docs/'],
  ['Lab', 'variants, a signature interaction, learn-by-building steps'],
  ['Review sheet', 'a seeded capture in tools/'],
  ['The game', 'the winner moves into src/']
];
$('#how').innerHTML = HOW.map(([t, s], i) => `<li><span class="n">${nn(i + 1)}</span><b>${t}</b><span>${s}</span></li>`).join('');

const extra = (e) => `<a class="x" href="${esc(e.href)}"><span class="jp x-jp">${e.jp}</span><span class="x-t">${esc(e.title)}</span><span class="x-r">${esc(e.romaji)}</span><span class="x-b">${esc(e.blurb)}</span></a>`;
const group = (kind) => EXTRAS.filter((e) => e.kind === kind).map(extra).join('');
$('#extras').innerHTML = `<h2 class="eyebrow">Already at the new standard</h2><div class="xrow">${group('standard')}</div>
  <h2 class="eyebrow">Prototypes</h2><div class="xrow">${group('prototype')}</div>`;

$('#tiers').innerHTML = TIERS.map((t) => `
  <section class="tier" style="--tier:${t.accent}">
    <div class="tier-head"><span class="tier-n">${t.n}</span><h2>${esc(t.title)}</h2><p>${esc(t.sub)}</p></div>
    <ol class="rows">${LABS.filter((l) => l.tier === t.n).map((l) => {
      const body = `<span class="r-n">${nn(l.n)}</span>
        <span class="r-main"><span class="r-title">${esc(l.title)} <span class="jp">${l.jp}</span> <i>${esc(l.romaji)}</i></span>
        <span class="r-q">${esc(l.question)}</span>
        <span class="r-chips">${l.reasons.map((r) => `<span class="chip" title="${esc(REASONS[r])}">${r}</span>`).join('')}</span>
        <code class="r-b">${l.builders.map(esc).join(' · ')}</code></span>
        <span class="r-s">${STATUS[l.status]}</span>${l.status === 'live' && l.poster ? `<img class="r-img" src="${l.poster}" alt="" loading="lazy" width="1200" height="750">` : ''}`;
      return `<li class="row ${l.status}">${l.status === 'live' && l.href ? `<a href="${l.href}">${body}</a>` : `<div>${body}</div>`}</li>`;
    }).join('')}</ol>
  </section>`).join('');
