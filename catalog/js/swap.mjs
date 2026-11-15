import { listKitAssets } from './asset-loader.mjs';
import { paramRow, readParam } from './param-controls.mjs';
import { emptyOverrides, setEntry, removeEntry, validateOverrides, serializeOverrides } from './kit-overrides.mjs';

const $ = (s) => document.querySelector(s);
const API = new URL('../../api/asset-library/kit-overrides', import.meta.url);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let kit = [], doc = emptyOverrides(), revision = 'none', server = false, dirty = false;
const status = (m) => { $('#swap-state').textContent = m; };

async function loadDoc() {
  try {
    const res = await fetch(API, { cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json(); doc = data.overrides; revision = data.revision; server = true;
    status(data.exists ? 'Connected to the local server: kit-overrides.json loaded.' : 'Connected to the local server: no kit-overrides.json yet.');
  } catch {
    server = false; revision = 'none';
    try { const res = await fetch(new URL('../../kit-overrides.json', import.meta.url), { cache: 'no-store' }); doc = res.ok ? validateOverrides(await res.json()) : emptyOverrides(); } catch { doc = emptyOverrides(); }
    status('Static host: saving downloads the file; commit it to the repo root.');
  }
  dirty = false;
}
const defaultsOf = (a) => Object.fromEntries(Object.entries(a.params).map(([k, p]) => [k, p.default]));
function rowMarkup(a) {
  const entry = doc.assets[a.id], variant = entry?.variant || 'classic', values = { ...defaultsOf(a), ...(entry?.params || {}) };
  const preview = new URL('../preview.html', import.meta.url); preview.searchParams.set('asset', a.id); preview.searchParams.set('variant', 'production'); const changed = entry?.params; if (changed) preview.searchParams.set('params', JSON.stringify(changed));
  return `<section class="swap-row${entry ? ' changed' : ''}" id="${a.id}" data-id="${a.id}"><div class="swap-head"><h2>${esc(a.label)} <small>${esc(a.id)} · ${esc(a.family)}</small></h2><div class="swap-seg" role="group" aria-label="Variant for ${esc(a.label)}"><button type="button" data-variant="classic" class="${variant === 'classic' ? 'active' : ''}">Classic</button><button type="button" data-variant="modular" class="${variant === 'modular' ? 'active' : ''}">Modular</button></div><a href="${esc(preview.href)}" target="_blank" rel="noopener">Preview ↗</a></div><div class="swap-params">${Object.entries(a.params).map(([k, p]) => paramRow(k, p, values[k])).join('') || '<small>No parameters.</small>'}</div></section>`;
}
function render() { $('#swap-board').innerHTML = kit.map(rowMarkup).join(''); }
function readRow(row) {
  const a = kit.find((k) => k.id === row.dataset.id), params = {};
  row.querySelectorAll('[data-param]').forEach((input) => { params[input.dataset.param] = readParam(a.params[input.dataset.param], input); });
  return { a, params, variant: row.querySelector('[data-variant].active')?.dataset.variant || 'classic' };
}
function commit(row) {
  const { a, params, variant } = readRow(row), defaults = defaultsOf(a);
  const changedParams = Object.keys(params).some((k) => params[k] !== defaults[k]);
  doc = variant === 'classic' && !changedParams ? removeEntry(doc, a.id) : setEntry(doc, a.id, { variant, params }, defaults);
  row.classList.toggle('changed', Boolean(doc.assets[a.id])); dirty = true; status('Unsaved changes.');
}
$('#swap-board').addEventListener('click', (e) => {
  const button = e.target.closest('[data-variant]'); if (!button) return;
  const row = button.closest('.swap-row'); row.querySelectorAll('[data-variant]').forEach((b) => b.classList.toggle('active', b === button)); commit(row);
});
$('#swap-board').addEventListener('input', (e) => {
  const input = e.target.closest('[data-param]'); if (!input) return;
  const row = input.closest('.swap-row'), out = row.querySelector(`[data-out="${input.dataset.param}"]`); if (out) out.textContent = input.value;
  // Tuning a parameter implies the modular kit: it has no effect on a classic build.
  row.querySelectorAll('[data-variant]').forEach((b) => b.classList.toggle('active', b.dataset.variant === 'modular')); commit(row);
});
function download() {
  const text = serializeOverrides(validateOverrides(doc, kit.map((k) => k.id))), url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), a = document.createElement('a');
  a.href = url; a.download = 'kit-overrides.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function save() {
  if (!server) { download(); status('Downloaded. Put kit-overrides.json at the repo root and commit it.'); return; }
  const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ overrides: doc, revision }) });
  const data = await res.json();
  if (!res.ok) { status(data.error || 'Not saved.'); return; }
  doc = data.overrides; revision = data.revision; dirty = false; status('Saved to kit-overrides.json at the repo root.');
}
$('#swap-save').onclick = () => save().catch((e) => status(e.message));
$('#swap-download').onclick = () => { try { download(); } catch (e) { status(e.message); } };
$('#swap-reload').onclick = async () => { await loadDoc(); render(); };
(async () => {
  try {
    kit = await listKitAssets(); await loadDoc(); render();
    if (!kit.length) status('No kit assets are registered.');
    window.__swapBoard = { kit, get doc() { return doc; }, get revision() { return revision; }, save, ready: true };
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  } catch (e) { status('The kit registry could not load: ' + e.message); window.__swapBoard = { ready: false, error: e.message }; }
})();
