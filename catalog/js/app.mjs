import { COVERAGE, STATUSES, PRIORITIES, emptyWorkspace, validateWorkspace, createRecords, searchAssets, parseQuery, summarize, updateAssets, mergeWorkspaces, exportCSV, makeSlug } from './model.mjs';
import { getAssetCapabilities } from './asset-loader.mjs';
import { resolveTargetLink, sourceLink, originalContextLink } from './links.mjs';
import { icon, mountIcons, groupIcon } from './icons.mjs';
import { PROVIDERS, normalizeSettings, builtinPlan, buildContext, callProvider, parsePlan, probeProvider, validatePlan } from './assistant.mjs';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const DRAFT_KEY = 'michi-asset-workspace-v1', VIEW_KEY = 'michi-asset-view-v1', AI_KEY = 'michi-asset-ai-v1', API_KEYS = 'michi-asset-api-keys-v1';
const API = new URL('../../api/asset-library/', import.meta.url);
const state = { inventory: null, thumbnails: { assets: {}, targets: {} }, workspace: emptyWorkspace(), records: [], visible: [], query: '', group: '', coverage: '', status: '', lifecycle: 'active', sort: 'label', layout: 'grid', view: 'all', collection: '', selectedId: 'torii', selected: new Set(), variant: 'original', targetId: '', inspectorTab: 'details', dirty: false, connected: false, conflict: false, undo: [], notesDraft: new Map(), plans: new Map(), aiHistory: [], aiSettings: { provider: 'builtin', maxTokens: 2048, reasoning: 'medium', transport: 'auto', perProvider: {}, rememberKeys: false }, keys: {}, aiController: null };
const sources = new Map();
let toastTimer, searchTimer;

function loadJSON(storage, key, fallback) { try { return JSON.parse(storage.getItem(key) || 'null') || fallback; } catch { return fallback; } }
function saveJSON(storage, key, value) { try { storage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
async function getJSON(url) { const res = await fetch(url); if (!res.ok) throw new Error(`Could not load ${url} (${res.status}).`); return res.json(); }
function download(name, text, type = 'application/json') { const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function toast(message, undo = false) { clearTimeout(toastTimer); $('#toast').innerHTML = `<span>${esc(message)}</span>${undo ? '<button data-undo>Undo</button>' : ''}`; $('#toast').hidden = false; toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 5500); }
function options(map, value) { return Object.entries(map).map(([id, label]) => `<option value="${esc(id)}"${id === value ? ' selected' : ''}>${esc(typeof label === 'object' ? label.label : label)}</option>`).join(''); }
function when(value) { if (!value) return 'Not yet updated'; const date = new Date(value); return Number.isFinite(+date) ? date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Unknown date'; }
function coverageBadge(a) { const c = COVERAGE[a.coverageLevel]; return `<span class="coverage-label ${c.color}" title="${esc(c.label)}">${esc(c.short)}</span>`; }
function statusBadge(a) { return `<span class="status-label status-${a.metadata.status}"><i class="status-dot"></i>${esc(STATUSES[a.metadata.status])}</span>`; }
function selectedIds() { return state.selected.size ? [...state.selected] : state.selectedId ? [state.selectedId] : []; }
function currentAsset() { return state.records.find((a) => a.id === state.selectedId); }
function thumbFor(asset, variant = null, targetId = '') {
  if (targetId && state.thumbnails.targets[targetId]) return state.thumbnails.targets[targetId];
  const base = state.thumbnails.assets[asset.id];
  if (variant === 'original') {
    const original = asset.targets.map((t) => state.thumbnails.targets[t.targetId]).find((t) => t?.kind === 'original');
    return original || base;
  }
  if (variant === 'lab') {
    const study = (asset.capabilities.targets || []).map((t) => state.thumbnails.targets[t.id]).find((t) => t?.kind === 'study');
    return study || base;
  }
  return base;
}
function thumbMarkup(asset, thumb = thumbFor(asset), { label = true } = {}) {
  if (!thumb) return `<div class="asset-thumb blank">${icon(groupIcon(asset.group))}<span>AWAITING CAPTURE</span></div>`;
  const kind = thumb.kind === 'original' ? 'GAME ORIGINAL' : thumb.kind === 'study' ? 'LAB STUDY' : 'SCENE REFERENCE';
  return `<div class="asset-thumb"><img src="${esc(thumb.src)}" width="360" height="300" loading="lazy" decoding="async" alt="${esc(thumb.label || asset.label)}">${label ? `<span class="thumb-kind ${thumb.kind}">${kind}</span>` : ''}</div>`;
}

function refreshRecords() { state.records = createRecords(state.inventory, state.workspace, getAssetCapabilities); }
function persistWorkspace() {
  state.dirty = true;
  if (!saveJSON(localStorage, DRAFT_KEY, state.workspace)) toast('Browser storage is full. Export the workspace to keep your changes.');
}
function changeWorkspace(next, message) {
  state.undo.push(structuredClone(state.workspace)); if (state.undo.length > 25) state.undo.shift();
  next.updatedAt = new Date().toISOString(); state.workspace = next; persistWorkspace(); refreshRecords(); render(); toast(message, true);
}
function patchAssets(ids, patch, action = 'Updated asset details') { changeWorkspace(updateAssets(state.workspace, ids, patch, { action }), `${action} · ${ids.length} asset${ids.length === 1 ? '' : 's'}`); }
function undo() { const previous = state.undo.pop(); if (!previous) return toast('Nothing to undo.'); previous.revision = state.workspace.revision; state.workspace = previous; persistWorkspace(); refreshRecords(); render(); toast('Last production change undone.'); }
function persistView() {
  const value = Object.fromEntries(['query', 'group', 'coverage', 'status', 'lifecycle', 'sort', 'layout', 'view', 'collection'].map((key) => [key, state[key]]));
  saveJSON(localStorage, VIEW_KEY, value);
  const url = new URL(location.href);
  url.searchParams.delete('asset');
  for (const [key, val] of Object.entries({ q: state.query, group: state.group, coverage: state.coverage, status: state.status, life: state.lifecycle === 'active' ? '' : state.lifecycle, layout: state.layout === 'grid' ? '' : state.layout, collection: state.collection, view: state.view === 'all' ? '' : state.view })) val ? url.searchParams.set(key, val) : url.searchParams.delete(key);
  url.hash = state.selectedId || ''; history.replaceState(null, '', url);
}
function setFocus(id, { open = true, scroll = false } = {}) {
  if (!state.records.some((a) => a.id === id)) return;
  stashNotes(); state.selectedId = id; state.variant = 'original'; state.targetId = ''; state.inspectorTab = 'details';
  if (open) $('#inspector').classList.add('open');
  renderInspector(); $$('.focused', $('#results')).forEach((el) => el.classList.remove('focused'));
  const card = $(`[data-asset-id="${id}"]`, $('#results')); if (card) { card.classList.add('focused'); if (scroll) card.scrollIntoView({ block: 'nearest', behavior: 'auto' }); }
  persistView(); updateAiContext();
}
function stashNotes() { const textarea = $('#asset-notes'); if (textarea && state.selectedId) state.notesDraft.set(state.selectedId, textarea.value); }
function resetFilters() { Object.assign(state, { query: '', group: '', coverage: '', status: '', lifecycle: 'active', view: 'all', collection: '' }); }
function chooseView(view) {
  resetFilters(); state.view = view;
  if (view === 'labs') state.coverage = 'direct';
  if (view === 'gaps') state.query = 'is:gap';
  if (view === 'cad') state.query = 'cad:yes';
  if (view === 'favorites') state.query = 'is:favorite';
  if (view === 'inactive') state.lifecycle = 'inactive';
  render();
}
function filtered() {
  const collection = state.workspace.collections.find((c) => c.id === state.collection);
  return searchAssets(state.records, { ...state, assetIds: collection?.assetIds || null });
}

function renderSidebar() {
  const stats = summarize(state.records);
  const items = [ ['all', 'grid', 'All assets', stats.active], ['labs', 'layers', 'Focused lab studies', stats.focused], ['gaps', 'flag', 'Needs a study', stats.gaps], ['cad', 'cube', 'Editable in cadJS', stats.editable], ['favorites', 'star', 'Favorites', state.records.filter((a) => a.metadata.favorite && a.lifecycle === 'active').length] ];
  $('#library-nav').innerHTML = items.map(([id, image, label, count]) => `<button class="side-link ${state.view === id && !state.collection ? 'active' : ''}" data-view="${id}">${icon(image)}<span>${label}</span><small>${count}</small></button>`).join('');
  const groups = [...new Set(state.records.filter((a) => a.lifecycle === 'active').map((a) => a.group))];
  $('#category-nav').innerHTML = groups.map((group) => `<button class="side-link ${state.group === group ? 'active' : ''}" data-group="${esc(group)}"><i class="category-dot"></i><span>${esc(group)}</span><small>${state.records.filter((a) => a.group === group && a.lifecycle === 'active').length}</small></button>`).join('') + `<button class="side-link ${state.lifecycle === 'inactive' ? 'active' : ''}" data-view="inactive">${icon('clock')}<span>Inactive code</span><small>${stats.inactive}</small></button>`;
  $('#collection-nav').innerHTML = state.workspace.collections.length ? state.workspace.collections.map((c) => `<div class="side-item"><button class="side-link ${state.collection === c.id ? 'active' : ''}" data-collection="${esc(c.id)}">${icon('folder')}<span>${esc(c.name)}</span><small>${c.assetIds.length}</small></button><button class="icon-button tiny side-manage" data-manage-collection="${esc(c.id)}" aria-label="Manage ${esc(c.name)}" title="Manage collection">${icon('settings')}</button></div>`).join('') : '<p class="side-empty">A home for your next art pass.</p>';
  $('#view-nav').innerHTML = state.workspace.views.length ? state.workspace.views.map((v) => `<div class="side-item"><button class="side-link" data-saved-view="${esc(v.id)}">${icon('search')}<span>${esc(v.name)}</span></button><button class="icon-button tiny side-manage" data-manage-view="${esc(v.id)}" aria-label="Manage ${esc(v.name)}" title="Manage saved view">${icon('settings')}</button></div>`).join('') : '<p class="side-empty">Save a search you come back to.</p>';
  $('.sidebar-foot p').textContent = `${state.records.length} authored entries · Three.js r160`;
  if ($('#group-filter').options.length === 1) $('#group-filter').insertAdjacentHTML('beforeend', groups.map((g) => `<option>${esc(g)}</option>`).join(''));
}
function renderOverview() {
  const s = summarize(state.records), percentage = (s.focused / s.active * 100).toFixed(1);
  $('#overview').innerHTML = [['all', s.active, 'Active assets', `${s.total} including inactive`, 'cube'], ['labs', s.focused, 'Focused studies', `${percentage}% of active entries`, 'layers'], ['gaps', s.gaps, 'Study opportunities', 'Evidence stays transparent', 'flag'], ['cad', s.editable, 'Ready for cadJS', 'Real source & study adapters', 'source']].map(([view, n, label, sub, image]) => `<button data-view="${view}"><strong>${n}</strong><span class="stat-icon">${icon(image)}</span><span class="stat-label">${label}</span><span class="stat-sub">${sub}</span></button>`).join('');
}
function card(asset) {
  return `<article class="asset-card ${asset.id === state.selectedId ? 'focused' : ''} ${state.selected.has(asset.id) ? 'multi-selected' : ''}" data-asset-id="${asset.id}" tabindex="0" aria-label="${esc(asset.label)}"><label class="asset-select" title="Select for bulk actions"><input type="checkbox" data-select="${asset.id}" ${state.selected.has(asset.id) ? 'checked' : ''} aria-label="Select ${esc(asset.label)}"></label><button class="favorite-button ${asset.metadata.favorite ? 'starred' : ''}" data-favorite="${asset.id}" aria-label="${asset.metadata.favorite ? 'Unfavorite' : 'Favorite'} ${esc(asset.label)}" aria-pressed="${asset.metadata.favorite}">${icon('star')}</button>${thumbMarkup(asset)}<div class="asset-card-text"><div class="asset-category"><span>${esc(asset.group)}</span>${asset.capabilities.original || asset.capabilities.lab ? '<i class="cad-dot" title="Editable adapter available"></i>' : ''}</div><h2 title="${esc(asset.label)}">${esc(asset.label)}</h2><div class="asset-id">${asset.id}</div><div class="asset-card-foot">${coverageBadge(asset)}${statusBadge(asset)}</div></div></article>`;
}
function renderList() {
  return `<table class="asset-table"><thead><tr><th><input type="checkbox" id="select-all" aria-label="Select all visible assets" ${state.visible.length && state.visible.every((a) => state.selected.has(a.id)) ? 'checked' : ''}></th><th>ASSET</th><th>CATEGORY</th><th>LAB COVERAGE</th><th>OWNER</th><th>STATUS</th></tr></thead><tbody>${state.visible.map((a) => { const t = thumbFor(a); return `<tr data-asset-id="${a.id}" class="${a.id === state.selectedId ? 'focused' : ''}" tabindex="0"><td><input type="checkbox" data-select="${a.id}" aria-label="Select ${esc(a.label)}" ${state.selected.has(a.id) ? 'checked' : ''}></td><td><div class="list-identity">${t ? `<img src="${esc(t.src)}" alt="" loading="lazy" width="48" height="44">` : `<span class="list-placeholder">${icon(groupIcon(a.group))}</span>`}<div><strong>${esc(a.label)}</strong><small>${a.id}</small></div></div></td><td>${esc(a.group)}</td><td>${coverageBadge(a)}</td><td>${esc(a.metadata.owner || '—')}</td><td>${statusBadge(a)}</td></tr>`; }).join('')}</tbody></table>`;
}
function renderBoard() {
  return `<div class="production-board">${Object.entries(STATUSES).map(([status, name]) => { const rows = state.visible.filter((a) => a.metadata.status === status); return `<section class="board-column" data-drop-status="${status}"><h2 class="status-${status}"><i class="status-dot"></i>${name}<small>${rows.length}</small></h2>${rows.map((a) => { const t = thumbFor(a); return `<article class="board-card ${a.id === state.selectedId ? 'focused' : ''}" data-asset-id="${a.id}" tabindex="0" draggable="true">${t ? `<img src="${esc(t.src)}" alt="" loading="lazy" width="360" height="200">` : ''}<strong>${esc(a.label)}</strong><p>${esc(a.metadata.owner || 'Unassigned')} ${a.metadata.priority !== 'normal' ? '· ' + esc(PRIORITIES[a.metadata.priority]) : ''}</p>${coverageBadge(a)}</article>`; }).join('') || '<div class="board-empty">Drop an asset here, or change its status in the inspector.</div>'}</section>`; }).join('')}</div>`;
}
function render() {
  stashNotes(); state.visible = filtered(); renderSidebar(); renderOverview();
  for (const [selector, key] of [['#search', 'query'], ['#group-filter', 'group'], ['#coverage-filter', 'coverage'], ['#status-filter', 'status'], ['#lifecycle-filter', 'lifecycle'], ['#sort', 'sort']]) $(selector).value = state[key];
  const names = { all: 'Asset library', labs: 'Focused lab studies', gaps: 'Study opportunities', cad: 'Ready for cadJS', favorites: 'Your favorites', inactive: 'Inactive code' };
  const collection = state.workspace.collections.find((c) => c.id === state.collection);
  $('#view-title').innerHTML = `${esc(collection?.name || names[state.view] || 'Asset library')}<span class="jp" lang="ja">素材帳</span>`;
  $('#view-description').textContent = collection ? `${collection.assetIds.length} assets gathered for this collection.` : state.view === 'gaps' ? 'Review sheets, embedded references, and the studies still waiting to be made.' : 'Every part of a little Kyoto. Find it, study it, make it yours.';
  const errors = parseQuery(state.query).errors; $('#query-error').hidden = !errors.length; $('#query-error').textContent = errors.join(' ');
  $('#results-count').innerHTML = `<strong>${state.visible.length}</strong> asset${state.visible.length === 1 ? '' : 's'}${state.query || state.group || state.coverage || state.status || state.collection ? ' in this view' : ` · ${state.lifecycle === 'all' ? 'including inactive' : state.lifecycle === 'inactive' ? 'dormant builders' : 'all categories'}`}`;
  $('#draft-state').textContent = state.conflict ? 'Repository changed · draft kept' : state.dirty ? 'Draft saved in browser' : state.connected ? `Repository r${state.workspace.revision}` : 'Browser workspace';
  $('#draft-state').classList.toggle('dirty', state.dirty || state.conflict);
  $('#save-repository').title = state.connected ? 'Save production notes and collections to catalog/metadata.json' : 'Start node cadJS/server.mjs for repository saves';
  $('#results').className = `asset-results ${state.layout === 'grid' ? 'asset-grid' : ''}`;
  $('#results').innerHTML = !state.visible.length ? `<div class="empty-state" style="grid-column:1/-1">${icon('search')}<h2>No assets in this view.</h2><p>Try a different search or clear a filter. Your inventory is still here.</p><button class="button" data-reset>Clear filters</button></div>` : state.layout === 'grid' ? state.visible.map(card).join('') : state.layout === 'list' ? renderList() : renderBoard();
  $$('[data-layout]').forEach((b) => { b.classList.toggle('selected', b.dataset.layout === state.layout); b.setAttribute('aria-pressed', b.dataset.layout === state.layout); });
  $('#selection-bar').hidden = !state.selected.size; $('#selection-count').textContent = `${state.selected.size} selected`;
  $('#remove-from-collection').hidden = !state.collection;
  $('#inventory-stamp').textContent = `Inventory reviewed ${state.inventory.reviewedAt} · original, study & context images labeled`;
  renderInspector(); persistView(); updateAiContext();
}

function renderInspector() {
  const a = currentAsset(); if (!a) return;
  const caps = a.capabilities, availableTargets = caps.targets || [];
  if (state.variant === 'lab' && !caps.lab) state.variant = 'original';
  if (state.variant === 'lab' && !availableTargets.some((t) => t.id === state.targetId)) state.targetId = availableTargets[0]?.id || '';
  const picture = thumbFor(a, state.variant, state.variant === 'lab' ? state.targetId : ''), canPreview = state.variant === 'lab' ? caps.lab : caps.original;
  const context = originalContextLink(a), mainTarget = a.targets.find((t) => t.level === 'direct') || a.targets[0];
  const mappedTarget = state.inventory.targets[state.targetId];
  const targetLab = state.targetId.split('/')[0], targetSelector = state.targetId.split('/').slice(1).join('/');
  const actualLabTarget = state.variant === 'lab' && state.targetId ? { ...mappedTarget, lab: targetLab, selector: targetSelector, kind: mappedTarget?.kind || (targetLab === 'interiors' && ['tatami', 'shoji', 'pottery'].includes(targetSelector) ? 'bench' : 'specimen') } : mainTarget;
  const labHref = actualLabTarget ? resolveTargetLink(actualLabTarget) : '';
  const caption = picture ? `${picture.kind === 'original' ? 'Original game specimen' : picture.kind === 'study' ? 'Lab study' : 'Context reference'} · ${picture.label || a.label}` : 'No image captured yet. Open the live original when an adapter is available.';
  const note = state.notesDraft.has(a.id) ? state.notesDraft.get(a.id) : a.metadata.notes;
  $('#inspector').innerHTML = `<div class="inspector-top"><span>ASSET INSPECTOR</span><div><button class="icon-button ${a.metadata.favorite ? 'starred' : ''}" data-favorite="${a.id}" title="Toggle favorite" aria-label="Toggle favorite">${icon('star')}</button><button class="icon-button inspector-close" data-action="close-inspector" aria-label="Close inspector">${icon('close')}</button></div></div><div class="inspector-body"><div class="detail-category">${esc(a.group)}${a.lifecycle === 'inactive' ? ' / INACTIVE' : ''}</div><h2 class="detail-title">${esc(a.label)}</h2><div class="detail-id">${a.id}<button class="icon-button" data-action="copy-id" aria-label="Copy asset ID">${icon('copy')}</button></div><div class="detail-preview">${thumbMarkup(a, picture, { label: false })}${canPreview ? `<button class="preview-launch" data-action="preview"><span>${icon('cube')}Inspect live in 3D ↗</span></button>` : ''}</div><p class="detail-caption">${icon('image')}<span>${esc(caption)}</span></p><div class="variant-switch" role="group" aria-label="Asset version"><button data-variant="original" class="${state.variant === 'original' ? 'active' : ''}">Game original</button><button data-variant="lab" class="${state.variant === 'lab' ? 'active' : ''}" ${!caps.lab ? 'disabled title="No isolated updated adapter; use the evidence links below"' : ''}>Lab study${caps.lab ? ' (' + availableTargets.length + ')' : ''}</button></div>${state.variant === 'lab' ? `<label class="sr-only" for="variant-select">Lab specimen</label><select class="dialog-field variant-select" id="variant-select">${availableTargets.map((t) => `<option value="${esc(t.id)}" ${state.targetId === t.id ? 'selected' : ''}>${esc(t.label || t.selector || t.id)}</option>`).join('')}</select>` : ''}<div class="detail-actions"><button class="button primary" data-action="cad" ${!canPreview ? `disabled title="${esc(caps.reason || 'No editable adapter for this type')}"` : ''}>${icon('cube')}Edit ${state.variant === 'lab' ? 'study' : 'original'} in cadJS${icon('external')}</button><div class="action-pair"><a class="button quiet" href="${esc(context.href)}" target="_blank" rel="noopener" title="${esc(context.note)}">${icon('eye')}Original scene ↗</a>${labHref ? `<a class="button quiet" href="${esc(labHref)}" target="_blank" rel="noopener">${icon('layers')}Open ${mainTarget?.kind === 'review' ? 'review' : 'lab'} ↗</a>` : '<button class="button quiet" disabled>No lab mapped</button>'}</div></div>${!canPreview ? `<p class="detail-note">${esc(caps.reason || 'This type is reviewed in its source scene; an isolated editing adapter is not available.')}</p>` : ''}<nav class="detail-tabs" aria-label="Inspector sections">${[['details', 'Details'], ['sources', 'Provenance'], ['activity', 'Activity']].map(([id, label]) => `<button data-inspector-tab="${id}" class="${state.inspectorTab === id ? 'active' : ''}">${label}</button>`).join('')}</nav><div class="detail-section">${state.inspectorTab === 'details' ? `<div class="coverage-box">${coverageBadge(a)}<p>${a.coverageLevel === 'direct' ? 'A focused lab specimen or bench is mapped to this asset. Studies and game integration are tracked separately.' : 'Evidence is recorded, with room for a focused study. This level describes lab coverage, not production approval.'}</p></div><div class="section-heading">PRODUCTION DETAILS<span>local overlay</span></div><div class="metadata-fields"><div class="field-pair"><label>Status<select data-metadata="status">${options(STATUSES, a.metadata.status)}</select></label><label>Priority<select data-metadata="priority">${options(PRIORITIES, a.metadata.priority)}</select></label></div><label>Owner<input data-metadata="owner" maxlength="120" value="${esc(a.metadata.owner)}" placeholder="Assign a person or team"></label><label>Tags<input data-metadata="tags" value="${esc(a.metadata.tags.join(', '))}" placeholder="kyoto, hero, needs-polish"></label>${a.metadata.tags.length ? `<div class="tag-list">${a.metadata.tags.map((t) => `<button class="tag" data-tag-search="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}<label>Art notes<textarea id="asset-notes" rows="4" maxlength="12000" placeholder="What should the next pass improve?">${esc(note)}</textarea></label><div class="note-actions"><small>${note !== a.metadata.notes ? 'Unsaved note draft' : a.metadata.updatedAt ? 'Updated ' + esc(when(a.metadata.updatedAt)) : 'Ready for your first note'}</small><button class="button small" data-action="save-note">Save note</button></div></div>${a.note ? `<div class="section-heading" style="margin-top:23px">INVENTORY NOTE</div><p class="detail-note">${esc(a.note)}</p>` : ''}` : state.inspectorTab === 'sources' ? `<div class="section-heading">GAME SOURCE</div><div class="detail-sources">${a.sources.map((s, i) => `<div class="source-entry"><a href="${esc(sourceLink(s))}" data-source-index="${i}" target="_blank" rel="noopener">${esc(s.file)} ↗</a><code>${esc(s.anchor.trim())}</code></div>`).join('')}</div><pre class="code-excerpt" id="source-excerpt">Reading the source anchor…</pre><div class="section-heading" style="margin-top:22px">INDIVIDUAL EVIDENCE<span>${a.targets.length} mapped</span></div>${a.targets.map((t) => `<a class="evidence-link" href="${esc(resolveTargetLink(t))}" target="_blank" rel="noopener"><strong>${esc(t.lab)} / ${esc(t.selector)} ↗</strong><small>${esc(t.level)} · ${esc(t.kind)}</small>${t.note ? `<p>${esc(t.note)}</p>` : ''}</a>`).join('') || '<p class="detail-note">No specimen or review target is mapped. The source record remains available.</p>'}<p class="detail-note">${esc(context.note)} Coverage provenance lives in the audited inventory; production notes do not rewrite it.</p>` : renderActivity(a)}</div></div>`;
  if (state.inspectorTab === 'sources') loadSourceExcerpt(a);
}
function renderActivity(a) {
  const rows = state.workspace.activity.filter((e) => e.assetIds.includes(a.id)).slice(-25).reverse();
  return `<div class="section-heading">WORKSPACE HISTORY</div>${rows.map((e) => `<div class="activity-item">${esc(e.action)}<time>${esc(when(e.at))}</time></div>`).join('') || '<p class="detail-note">No production changes yet. Notes, assignments and AI-applied updates will appear here.</p>'}<div class="activity-item">Added to the source coverage audit<time>${state.inventory.reviewedAt}</time></div>`;
}
async function loadSourceExcerpt(asset) {
  for (const [i, source] of asset.sources.entries()) {
    try {
      if (!sources.has(source.file)) sources.set(source.file, fetch(new URL('../../' + source.file, import.meta.url)).then((r) => { if (!r.ok) throw new Error('Source unavailable'); return r.text(); }));
      const text = await sources.get(source.file), index = text.indexOf(source.anchor), line = index < 0 ? null : text.slice(0, index).split('\n').length;
      if (state.selectedId !== asset.id || state.inspectorTab !== 'sources') return;
      const link = $(`[data-source-index="${i}"]`); if (link) { link.href = sourceLink(source, { line }); link.textContent = `${source.file}${line ? ':' + line : ''} ↗`; }
      if (i === 0 && $('#source-excerpt')) $('#source-excerpt').textContent = index < 0 ? 'The source anchor moved. Run the coverage checker to refresh this record.' : text.split('\n').slice(Math.max(0, line - 2), line + 14).map((l, n) => `${String(Math.max(1, line - 1) + n).padStart(4)}  ${l}`).join('\n');
    } catch { if (state.selectedId === asset.id && $('#source-excerpt')) $('#source-excerpt').textContent = 'The source file could not be read here. Open its repository link above.'; }
  }
}

function preview() {
  const a = currentAsset(); if (!a) return;
  const url = new URL('../preview.html', import.meta.url); url.searchParams.set('asset', a.id); url.searchParams.set('variant', state.variant); if (state.variant === 'lab' && state.targetId) url.searchParams.set('target', state.targetId);
  $('#preview-title').textContent = `${a.label} · ${state.variant === 'lab' ? 'Lab study' : 'Game original'}`;
  $('#preview-frame').src = url.href; $('#preview-popout').href = url.href; $('#preview-dialog').showModal();
}
function closePreview() { $('#preview-dialog').close(); $('#preview-frame').src = 'about:blank'; }
function openCad(asset = currentAsset(), variant = state.variant, target = state.targetId) {
  if (!asset) return;
  const url = new URL('../../cadJS/', import.meta.url); url.searchParams.set('asset', asset.id); url.searchParams.set('variant', variant); if (variant === 'lab' && target) url.searchParams.set('target', target);
  window.open(url.href, '_blank', 'noopener');
}
function dialog(title, content, { submit = null, button = 'Done' } = {}) {
  $('#dialog-content').innerHTML = `<form id="dialog-form"><h2>${esc(title)}</h2>${content}<div class="modal-actions">${submit ? '<button class="button quiet" type="button" id="dialog-cancel">Cancel</button>' : ''}<button class="button primary" type="submit">${esc(button)}</button></div></form>`;
  $('#dialog').showModal(); $('#dialog-cancel')?.addEventListener('click', () => $('#dialog').close());
  $('#dialog-form').addEventListener('submit', (event) => { event.preventDefault(); const data = new FormData(event.target); $('#dialog').close(); submit?.(data); });
  requestAnimationFrame(() => $('#dialog input')?.focus());
}
function createCollection(ids = []) {
  dialog('Gather a collection', `<p>Keep assets together for a place, an art pass, or a conversation. You can add more from any search.</p><label for="collection-name">Collection name</label><input class="dialog-field" id="collection-name" name="name" required maxlength="100" placeholder="The lantern pass" autocomplete="off"><p>${ids.length} selected asset${ids.length === 1 ? '' : 's'} will be included.</p>`, { button: 'Create collection', submit(data) {
    const next = structuredClone(state.workspace), name = String(data.get('name')).trim(); if (!name) return;
    const id = makeSlug(name, next.collections.map((c) => c.id)); next.collections.push({ id, name, assetIds: [...new Set(ids)] }); next.updatedAt = new Date().toISOString();
    changeWorkspace(next, `Created “${name}”`);
  } });
}
function addToCollection() {
  const ids = selectedIds(); if (!ids.length) return toast('Select at least one asset.');
  if (!state.workspace.collections.length) return createCollection(ids);
  dialog('Add to a collection', `<p>${ids.length} selected asset${ids.length === 1 ? '' : 's'}.</p><label>Collection<select class="dialog-field" name="collection">${state.workspace.collections.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label>`, { button: 'Add assets', submit(data) { const next = structuredClone(state.workspace), collection = next.collections.find((c) => c.id === data.get('collection')); collection.assetIds = [...new Set([...collection.assetIds, ...ids])]; next.activity.push({ at: new Date().toISOString(), action: `Added to collection: ${collection.name}`, assetIds: ids }); changeWorkspace(next, `Added to “${collection.name}”`); } });
}
function manageCollection(id, savedView = false) {
  const field = savedView ? 'views' : 'collections', entry = state.workspace[field].find((c) => c.id === id);
  if (!entry) return;
  dialog(savedView ? 'Manage saved view' : 'Manage collection', `<label>Name<input class="dialog-field" name="name" value="${esc(entry.name)}" required maxlength="100"></label>${savedView ? `<label>Search query<input class="dialog-field" name="query" value="${esc(entry.query)}" maxlength="2000"></label>` : `<p>${entry.assetIds.length} assets. Select members in the catalog to remove them from this collection.</p>`}<button class="text-button destructive" type="button" id="delete-entry">Delete ${savedView ? 'saved view' : 'collection'}</button><p class="fine-print">Deleting this organizational entry leaves the assets and art notes intact. Undo is available.</p>`, { button: 'Save changes', submit(data) { const next = structuredClone(state.workspace), item = next[field].find((c) => c.id === id); item.name = String(data.get('name')).trim(); if (savedView) { const query = String(data.get('query')); if (parseQuery(query).errors.length) return toast(parseQuery(query).errors.join(' ')); item.query = query; } changeWorkspace(next, 'Saved changes.'); } });
  $('#delete-entry').onclick = () => { const next = structuredClone(state.workspace); next[field] = next[field].filter((c) => c.id !== id); if (!savedView && state.collection === id) resetFilters(); $('#dialog').close(); changeWorkspace(next, `Deleted “${entry.name}”`); };
}
async function saveRepository() {
  if (!state.connected) return dialog('Enable repository saves', '<p>The catalog works on a static server. For repository saves, the AI relay and cadJS editing, run this from the repository root:</p><pre class="code-excerpt">node cadJS/server.mjs</pre><p>Then open <a href="http://127.0.0.1:4173/catalog/">http://127.0.0.1:4173/catalog/</a>. Export your browser workspace first if you are changing origins.</p>');
  if (state.conflict) return resolveRepositoryConflict();
  $('#save-repository').disabled = true;
  try {
    const res = await fetch(new URL('workspace', API), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace: state.workspace }) }); const data = await res.json();
    if (!res.ok) { if (res.status === 409) state.conflict = true; throw new Error(data.error || 'Repository save failed.'); }
    state.workspace = validateWorkspace(data.workspace, state.records.map((a) => a.id)); state.dirty = false; state.conflict = false; localStorage.removeItem(DRAFT_KEY); refreshRecords(); render(); toast(`Saved catalog/metadata.json · revision ${state.workspace.revision}`);
  } catch (error) { render(); toast(error.message); }
  finally { $('#save-repository').disabled = false; }
}
async function resolveRepositoryConflict() {
  try {
    const { workspace: latest } = await getJSON(new URL('workspace', API));
    const current = validateWorkspace(latest, state.records.map((a) => a.id));
    dialog('The repository has newer work', `<p>Your draft is based on revision ${state.workspace.revision}; the repository is at revision ${current.revision}. Your browser draft is still intact.</p><label>How should these versions meet?<select class="dialog-field" name="strategy"><option value="merge">Merge my draft over the repository, then save</option><option value="reload">Use the repository version</option></select></label><p class="fine-print">A merge keeps unrelated repository entries. For matching asset records, collections and saved views, your draft takes precedence. Export your draft first if you want a separate copy.</p>`, { button: 'Continue', submit(data) {
      if (data.get('strategy') === 'reload') { changeWorkspace(current, 'Loaded the repository version.'); state.conflict = false; state.dirty = false; localStorage.removeItem(DRAFT_KEY); render(); }
      else { changeWorkspace(mergeWorkspaces(current, state.workspace), 'Merged the browser draft over the current repository.'); state.conflict = false; saveRepository(); }
    } });
  } catch (error) { toast(error.message); }
}
function showHelp(searchOnly = false) {
  dialog(searchOnly ? 'Find the right thing.' : 'A small world. A useful library.', `${searchOnly ? '' : '<p>Browse the audited game inventory in a thumbnail grid, detailed list or production board. Source evidence and editable production metadata stay separate. Drag board cards to change their status, or select several assets for a shared update.</p>'}<p>Combine words with filters. Quotes keep phrases together; a minus excludes a term; <code>|</code> offers alternatives.</p><div class="search-examples">${['group:Shrine -coverage:direct', 'cad:original owner:none', 'status:research|modeling', 'source:interior tag:hero', 'is:favorite', 'lifecycle:inactive'].map((query) => `<button type="button" data-example-query="${esc(query)}">${esc(query)}</button>`).join('')}</div>${searchOnly ? '' : '<p>Original-scene links open the real game’s review sheets. A live 3D preview and cadJS handoff are available when an explicit adapter exists. Thumbnail labels identify originals, studies and scene references.</p><div class="help-shortcuts"><div><kbd>/</kbd> Search</div><div><kbd>⌘ K</kbd> Ask the library</div><div><kbd>↑ ↓</kbd> Browse assets</div><div><kbd>Esc</kbd> Close a panel</div><div><kbd>⌘ Z</kbd> Undo metadata</div><div><kbd>Enter</kbd> Inspect asset</div></div><p>Notes, owners, tags and collections are saved in this browser. Export a workspace to move it between machines; the local cadJS server can also save <code>catalog/metadata.json</code> for version control.</p><div class="about-references">Catalog patterns informed by <a target="_blank" rel="noopener" href="https://dev.epicgames.com/documentation/unreal-engine/content-browser-in-unreal-engine">Epic’s Content Browser</a> and <a target="_blank" rel="noopener" href="https://help.autodesk.com/cloudhelp/ENU/SG-Producer/files/pr-scheduling-tasks/SG_Producer_pr_scheduling_tasks_pr_tasks_pipeline_steps_html.html">Autodesk’s asset task workflows</a>. <a href="README.md" target="_blank" rel="noopener">Read the catalog guide ↗</a></div>'}`);
}

function toggleAssistant(open) { $('#assistant-panel').classList.toggle('open', open); $('#assistant-panel').setAttribute('aria-hidden', !open); if (open) $('#ai-prompt').focus(); else $('#open-assistant').focus(); }
function updateAiContext() { $('#ai-context-label').textContent = `${state.records.length || 'All'} assets · ${selectedIds().length} selected`; }
function currentSettings() {
  if (state.aiSettings.provider === 'builtin') return { provider: 'builtin' };
  const provider = $('#ai-provider').value;
  return { ...normalizeSettings({ provider, baseUrl: $('#ai-base-url').value, model: $('#ai-model').value, apiKey: $('#ai-key').value, maxTokens: $('#ai-tokens').value, reasoning: $('#ai-reasoning').value, structured: 'auto' }), transport: $('#ai-transport').value };
}
function saveAiSettings() {
  const provider = $('#ai-provider').value, before = state.aiSettings.provider;
  if (provider !== 'builtin') {
    state.aiSettings.perProvider[provider] = { baseUrl: $('#ai-base-url').value, model: $('#ai-model').value };
    state.keys[provider] = $('#ai-key').value;
  }
  Object.assign(state.aiSettings, { provider, maxTokens: +$('#ai-tokens').value || 2048, reasoning: $('#ai-reasoning').value, transport: $('#ai-transport').value, rememberKeys: $('#ai-remember').checked });
  saveJSON(localStorage, AI_KEY, state.aiSettings);
  saveJSON(sessionStorage, API_KEYS, state.keys);
  if (state.aiSettings.rememberKeys) saveJSON(localStorage, API_KEYS, state.keys); else localStorage.removeItem(API_KEYS);
  $('#ai-provider-label').textContent = provider === 'builtin' ? 'Local catalog guide · no model' : `${PROVIDERS.find((p) => p.id === provider)?.label || provider} / ${$('#ai-model').value}`;
  $('#api-fields').hidden = provider === 'builtin';
  if (before !== provider) $('#ai-connection').textContent = '';
}
function loadAiProvider(provider) {
  state.aiSettings.provider = provider; $('#ai-provider').value = provider;
  const s = normalizeSettings({ provider, ...(state.aiSettings.perProvider[provider] || {}) });
  $('#ai-base-url').value = s.baseUrl; $('#ai-model').value = s.model; $('#ai-key').value = state.keys[provider] || '';
  $('#api-fields').hidden = provider === 'builtin';
  saveAiSettings();
}
function importCompanion(which) {
  try {
    let input;
    if (which === 'cad') input = loadJSON(sessionStorage, 'michi-neko-cadjs-agent-settings-v1', null);
    else {
      const store = loadJSON(localStorage, 'dawcat-agent-v2', null) || loadJSON(sessionStorage, 'dawcat-agent-v2', null);
      if (store) { const keys = loadJSON(sessionStorage, 'dawcat-agent-keys-v2', loadJSON(localStorage, 'dawcat-agent-keys-v2', {})); input = { provider: store.provider, ...(store.common || {}), ...(store.perProvider?.[store.provider] || {}), apiKey: keys[store.provider] || '' }; }
    }
    if (!input) return toast(`No ${which === 'cad' ? 'cadJS' : 'dawCAT'} API settings are saved on this origin.`);
    if (input.provider === 'mcp') input.provider = 'custom';
    if (input.provider === 'gemini' && /generativelanguage\.googleapis\.com\/v1beta$/.test(input.baseUrl)) input.baseUrl += '/openai';
    const provider = input.provider === 'builtin' ? 'builtin' : normalizeSettings(input).provider;
    state.aiSettings.perProvider[provider] = { baseUrl: input.baseUrl, model: input.model }; state.keys[provider] = input.apiKey || '';
    loadAiProvider(provider); toast(`Imported ${which === 'cad' ? 'cadJS' : 'dawCAT'} connection settings. Keys remain in this session unless remembered.`);
  } catch (error) { toast(error.message); }
}
async function testAi() {
  saveAiSettings(); const settings = currentSettings(); $('#ai-connection').classList.remove('error'); $('#ai-connection').textContent = 'Testing the configured provider…'; $('#test-ai').disabled = true;
  try {
    let result;
    if (settings.provider === 'builtin') result = { models: ['catalog-guide'] };
    else if (state.connected && settings.transport !== 'direct') { const res = await fetch(new URL('probe', API), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings }), signal: AbortSignal.timeout(10000) }); result = await res.json(); if (!res.ok) throw new Error(result.error); }
    else result = await probeProvider(settings, { signal: AbortSignal.timeout(8000) });
    $('#ai-models').innerHTML = result.models.map((m) => `<option value="${esc(m)}">`).join(''); $('#ai-connection').textContent = `Connected · ${result.models.length} model${result.models.length === 1 ? '' : 's'} available.`;
  } catch (error) { $('#ai-connection').classList.add('error'); $('#ai-connection').textContent = `${error.message} ${!state.connected ? 'For CORS-restricted providers, run node cadJS/server.mjs and use its local relay.' : ''}`; }
  finally { $('#test-ai').disabled = false; }
}
function planDescription(action) {
  if (action.type === 'search') return `Search ${action.query || 'all assets'}${action.group ? ' · ' + action.group : ''}`;
  if (action.type === 'select') return `Select ${action.assetIds.length} asset${action.assetIds.length === 1 ? '' : 's'}`;
  if (action.type === 'annotate') return `Update ${action.assetIds.length} asset${action.assetIds.length === 1 ? '' : 's'} · ${Object.entries(action.patch).map(([k, v]) => k + ': ' + (Array.isArray(v) ? v.join(', ') : String(v).slice(0, 100))).join(' · ')}`;
  if (action.type === 'collection') return `Create “${action.name}” · ${action.assetIds.length} assets`;
  return `Open ${action.assetId} · ${action.destination}`;
}
function appendChat(role, text, { plan = null, error = false, provider = '' } = {}) {
  $('.assistant-welcome')?.remove(); const turn = document.createElement('article'); turn.className = 'chat-turn ' + role;
  turn.innerHTML = `<div class="chat-role">${role === 'user' ? 'YOU' : esc(provider || 'LIBRARY ASSISTANT')}</div><div class="chat-content ${error ? 'error' : ''}">${esc(text)}</div>`;
  if (plan) {
    const id = 'plan-' + Date.now().toString(36); state.plans.set(id, plan);
    turn.insertAdjacentHTML('beforeend', `<div class="plan-card"><h4>${esc(plan.summary)}</h4>${plan.actions.map((a) => `<div class="plan-action">${esc(planDescription(a))}</div>`).join('')}${plan.actions.length ? `<button class="button primary small" data-apply-plan="${id}">${icon('check')}Apply plan</button>` : '<div class="fine-print">No changes proposed.</div>'}</div>`);
  }
  $('#ai-chat').append(turn); $('#ai-chat').scrollTop = $('#ai-chat').scrollHeight;
}
async function sendPrompt(event) {
  event?.preventDefault(); const instruction = $('#ai-prompt').value.trim(); if (!instruction || state.aiController) return;
  saveAiSettings(); const settings = currentSettings(), ids = selectedIds(); $('#ai-prompt').value = ''; appendChat('user', instruction);
  const busy = document.createElement('div'); busy.className = 'thinking'; busy.textContent = 'Reading the catalog'; $('#ai-chat').append(busy);
  const controller = state.aiController = new AbortController(); $('#send-ai').disabled = true; $('#cancel-ai').hidden = false;
  try {
    let response, plan;
    if (settings.provider === 'builtin') { await new Promise((r) => setTimeout(r, 180)); plan = builtinPlan(instruction, state.records, ids); }
    else if (state.connected && settings.transport !== 'direct') {
      const res = await fetch(new URL('ai', API), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instruction, settings, workspace: state.workspace, selectedIds: ids, visibleIds: state.visible.map((a) => a.id), history: state.aiHistory }), signal: controller.signal });
      response = await res.json(); if (!res.ok) throw new Error(response.error || 'Assistant request failed.'); plan = validatePlan(response.plan, state.records);
    } else { response = await callProvider(settings, { instruction, context: buildContext(state.records, ids, state.visible.map((a) => a.id)), history: state.aiHistory }, { signal: controller.signal }); plan = parsePlan(response.text, state.records); }
    if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    appendChat('assistant', plan.answer || plan.summary, { plan, provider: settings.provider === 'builtin' ? 'LOCAL GUIDE · NO MODEL' : `${response.provider} / ${response.model}` });
    state.aiHistory.push({ role: 'user', content: instruction }, { role: 'assistant', content: plan.answer || plan.summary }); state.aiHistory = state.aiHistory.slice(-4);
  } catch (error) { appendChat('assistant', error.name === 'AbortError' ? 'Request cancelled. Your catalog is unchanged.' : `${error.message}${!state.connected && settings.provider !== 'builtin' ? '\nA direct-browser connection may be blocked by CORS. The local cadJS server provides an API relay.' : ''}`, { error: true }); }
  finally { busy.remove(); state.aiController = null; $('#send-ai').disabled = false; $('#cancel-ai').hidden = true; $('#ai-prompt').focus(); }
}
function applyPlan(plan) {
  plan = validatePlan(plan, state.records); let next = state.workspace, changed = false; const openings = [];
  for (const a of plan.actions) {
    if (a.type === 'search') { resetFilters(); Object.assign(state, a); delete state.type; }
    if (a.type === 'select') { state.selected = new Set(a.assetIds); state.selectedId = a.assetIds[0]; }
    if (a.type === 'annotate') { next = updateAssets(next, a.assetIds, a.patch, { action: 'AI plan: ' + plan.summary }); changed = true; }
    if (a.type === 'collection') { next = structuredClone(next); next.collections.push({ id: makeSlug(a.name, next.collections.map((c) => c.id)), name: a.name, assetIds: a.assetIds }); next.activity.push({ at: new Date().toISOString(), action: 'AI collection: ' + a.name, assetIds: a.assetIds }); changed = true; }
    if (a.type === 'open') openings.push(a);
  }
  if (changed) changeWorkspace(next, 'Applied “' + plan.summary + '”'); else { render(); toast('Applied catalog view.'); }
  for (const a of openings) {
    const asset = state.records.find((r) => r.id === a.assetId);
    if (a.destination === 'cad' && (asset.capabilities.original || asset.capabilities.lab)) openCad(asset, asset.capabilities.original ? 'original' : 'lab', asset.capabilities.targets?.[0]?.id || '');
    else if (a.destination === 'lab' && asset.targets[0]) window.open(resolveTargetLink(asset.targets[0]), '_blank', 'noopener');
    else if (a.destination === 'original') window.open(originalContextLink(asset).href, '_blank', 'noopener');
    else toast(`${asset.label}: no adapter or lab destination is available.`);
  }
}

function bind() {
  $('#coverage-filter').insertAdjacentHTML('beforeend', options(COVERAGE)); $('#status-filter').insertAdjacentHTML('beforeend', options(STATUSES));
  $('#search').addEventListener('input', (event) => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.query = event.target.value; state.view = 'all'; render(); }, 120); });
  for (const [id, key] of [['group-filter', 'group'], ['coverage-filter', 'coverage'], ['status-filter', 'status'], ['lifecycle-filter', 'lifecycle'], ['sort', 'sort']]) $('#' + id).addEventListener('change', (e) => { state[key] = e.target.value; if (key !== 'sort') state.view = 'all'; render(); });
  $('#reset-filters').onclick = () => { resetFilters(); render(); }; $('#clear-category').onclick = () => { state.group = ''; render(); };
  $('#toggle-sidebar').onclick = () => { const open = $('#sidebar').classList.toggle('open'); $('#toggle-sidebar').setAttribute('aria-expanded', open); };
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-view],[data-group],[data-collection],[data-saved-view],[data-manage-collection],[data-manage-view],[data-layout],[data-favorite],[data-tag-search],[data-undo],[data-reset],[data-example-query]');
    if (!button) return;
    const fromSidebar = Boolean(button.closest('#sidebar'));
    if (button.dataset.view) chooseView(button.dataset.view);
    if (button.dataset.group) { resetFilters(); state.group = button.dataset.group; render(); }
    if (button.dataset.collection) { resetFilters(); state.collection = button.dataset.collection; render(); }
    if (button.dataset.savedView) { const v = state.workspace.views.find((v) => v.id === button.dataset.savedView); resetFilters(); Object.assign(state, Object.fromEntries(['query', 'group', 'coverage', 'status', 'lifecycle'].map((key) => [key, v[key] || (key === 'lifecycle' ? 'active' : '')]))); render(); }
    if (button.dataset.manageCollection) manageCollection(button.dataset.manageCollection);
    if (button.dataset.manageView) manageCollection(button.dataset.manageView, true);
    if (button.dataset.layout) { state.layout = button.dataset.layout; render(); }
    if (button.dataset.favorite) { event.stopPropagation(); const a = state.records.find((a) => a.id === button.dataset.favorite); patchAssets([a.id], { favorite: !a.metadata.favorite }, a.metadata.favorite ? 'Removed favorite' : 'Added favorite'); }
    if (button.dataset.tagSearch) { resetFilters(); state.query = `tag:"${button.dataset.tagSearch.replace(/"/g, '')}"`; render(); }
    if (button.hasAttribute('data-undo')) undo();
    if (button.hasAttribute('data-reset')) { resetFilters(); render(); }
    if (button.dataset.exampleQuery) { $('#dialog').close(); resetFilters(); state.query = button.dataset.exampleQuery; if (state.query.includes('lifecycle:inactive')) state.lifecycle = 'all'; render(); }
    if (fromSidebar && innerWidth <= 800) { $('#sidebar').classList.remove('open'); $('#toggle-sidebar').setAttribute('aria-expanded', false); }
  });
  $('#results').addEventListener('click', (event) => { if (event.target.closest('input,label,button,a')) return; const card = event.target.closest('[data-asset-id]'); if (card) { if (event.metaKey || event.ctrlKey) { state.selected.has(card.dataset.assetId) ? state.selected.delete(card.dataset.assetId) : state.selected.add(card.dataset.assetId); render(); } else setFocus(card.dataset.assetId); } });
  $('#results').addEventListener('dblclick', (event) => { const card = event.target.closest('[data-asset-id]'); if (card && !event.target.closest('input,label,button')) { setFocus(card.dataset.assetId); if (currentAsset().capabilities.original) preview(); } });
  $('#results').addEventListener('change', (event) => { if (event.target.id === 'select-all') state.selected = new Set(event.target.checked ? state.visible.map((a) => a.id) : []); else if (event.target.dataset.select) event.target.checked ? state.selected.add(event.target.dataset.select) : state.selected.delete(event.target.dataset.select); else return; render(); });
  $('#results').addEventListener('dragstart', (event) => { const card = event.target.closest('[data-asset-id]'); if (card) event.dataTransfer.setData('text/x-michi-asset', card.dataset.assetId); });
  $('#results').addEventListener('dragover', (event) => { if (event.target.closest('[data-drop-status]')) event.preventDefault(); });
  $('#results').addEventListener('drop', (event) => { const column = event.target.closest('[data-drop-status]'), id = event.dataTransfer.getData('text/x-michi-asset'); if (column && state.records.some((a) => a.id === id)) { event.preventDefault(); patchAssets([id], { status: column.dataset.dropStatus }, 'Changed production status'); } });
  $('#clear-selection').onclick = () => { state.selected.clear(); render(); };
  $('#bulk-status').onclick = () => dialog('Set production status', `<p>Update ${state.selected.size} selected assets.</p><select class="dialog-field" name="status">${options(STATUSES)}</select>`, { button: 'Update assets', submit(data) { patchAssets([...state.selected], { status: data.get('status') }, 'Updated production status'); } });
  $('#add-to-collection').onclick = addToCollection; $('#new-collection').onclick = () => createCollection([...state.selected]);
  $('#remove-from-collection').onclick = () => { const next = structuredClone(state.workspace), collection = next.collections.find((c) => c.id === state.collection); if (!collection) return; collection.assetIds = collection.assetIds.filter((id) => !state.selected.has(id)); changeWorkspace(next, 'Removed selected assets from the collection.'); state.selected.clear(); render(); };
  $('#save-view').onclick = () => dialog('Save this view', '<p>Return to the same search and filters whenever you need them.</p><input class="dialog-field" name="name" placeholder="A name for this view" required maxlength="100">', { button: 'Save view', submit(data) { const next = structuredClone(state.workspace), name = String(data.get('name')).trim(); next.views.push({ id: makeSlug(name, next.views.map((v) => v.id)), name, ...Object.fromEntries(['query', 'group', 'coverage', 'status', 'lifecycle'].map((key) => [key, state[key]])) }); changeWorkspace(next, 'Saved view.'); } });
  $('#inspector').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action],[data-variant],[data-inspector-tab]'); if (!button) return;
    if (button.dataset.variant) { stashNotes(); state.variant = button.dataset.variant; state.targetId = ''; renderInspector(); return; }
    if (button.dataset.inspectorTab) { stashNotes(); state.inspectorTab = button.dataset.inspectorTab; renderInspector(); return; }
    if (button.dataset.action === 'close-inspector') $('#inspector').classList.remove('open');
    if (button.dataset.action === 'preview') preview();
    if (button.dataset.action === 'cad') openCad();
    if (button.dataset.action === 'copy-id') { try { await navigator.clipboard.writeText(state.selectedId); toast('Asset ID copied.'); } catch { toast('Asset ID: ' + state.selectedId); } }
    if (button.dataset.action === 'save-note') { const value = $('#asset-notes').value; state.notesDraft.delete(state.selectedId); patchAssets([state.selectedId], { notes: value }, 'Saved art note'); }
  });
  $('#inspector').addEventListener('change', (event) => { if (event.target.id === 'variant-select') { state.targetId = event.target.value; renderInspector(); } else if (event.target.dataset.metadata) { const key = event.target.dataset.metadata; try { patchAssets([state.selectedId], { [key]: key === 'tags' ? event.target.value.split(',').map((v) => v.trim()).filter(Boolean) : event.target.value }, 'Updated ' + key); } catch (error) { toast(error.message); } } });
  $('#inspector').addEventListener('input', (event) => { if (event.target.id === 'asset-notes') { state.notesDraft.set(state.selectedId, event.target.value); $('.note-actions small').textContent = 'Unsaved note draft'; } });
  $('#close-preview').onclick = closePreview; $('#preview-dialog').addEventListener('cancel', () => { $('#preview-frame').src = 'about:blank'; });
  $('#export-menu-button').onclick = () => { $('#export-menu').hidden = !$('#export-menu').hidden; $('#export-menu-button').setAttribute('aria-expanded', !$('#export-menu').hidden); };
  document.addEventListener('click', (event) => { if (!event.target.closest('.menu-anchor')) { $('#export-menu').hidden = true; $('#export-menu-button').setAttribute('aria-expanded', false); } });
  $('#export-workspace').onclick = () => download('michi-asset-workspace.json', JSON.stringify(state.workspace, null, 2));
  $('#export-csv').onclick = () => download('michi-assets.csv', exportCSV(state.visible), 'text/csv;charset=utf-8');
  $('#export-inventory').onclick = () => download('michi-asset-inventory.json', JSON.stringify(state.inventory, null, 2));
  $('#import-workspace').onclick = () => $('#workspace-file').click();
  $('#workspace-file').onchange = async (event) => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Workspace imports are limited to 2 MB.');
      const input = validateWorkspace(JSON.parse(await file.text()), state.records.map((a) => a.id));
      dialog('Import workspace', `<p>Merge ${Object.keys(input.assets).length} production records, ${input.collections.length} collections and ${input.views.length} saved views from <strong>${esc(file.name)}</strong>. Imported records take precedence for matching IDs. The source inventory stays unchanged.</p>`, { button: 'Merge workspace', submit() { changeWorkspace(mergeWorkspaces(state.workspace, input), 'Workspace imported.'); } });
    } catch (error) { toast(error.message); } finally { event.target.value = ''; }
  };
  $('#save-repository').onclick = saveRepository; $('#show-help').onclick = () => showHelp(); $('#query-help').onclick = () => showHelp(true);
  $('#open-assistant').onclick = () => toggleAssistant(true); $('#close-assistant').onclick = () => toggleAssistant(false);
  $('#toggle-ai-settings').onclick = () => { $('#ai-settings').hidden = !$('#ai-settings').hidden; };
  $('#ai-provider').insertAdjacentHTML('beforeend', PROVIDERS.map((p) => `<option value="${p.id}">${esc(p.label)}</option>`).join(''));
  $('#ai-provider').onchange = (e) => loadAiProvider(e.target.value);
  for (const id of ['ai-base-url', 'ai-model', 'ai-key', 'ai-tokens', 'ai-reasoning', 'ai-remember', 'ai-transport']) $('#' + id).addEventListener('change', saveAiSettings);
  $('#use-cad-settings').onclick = () => importCompanion('cad'); $('#use-daw-settings').onclick = () => importCompanion('daw'); $('#test-ai').onclick = testAi;
  $('#ai-form').onsubmit = sendPrompt; $('#cancel-ai').onclick = () => state.aiController?.abort();
  $('#ai-prompt').onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendPrompt(); } };
  $('#assistant-panel').addEventListener('click', (event) => { const suggestion = event.target.closest('[data-prompt]'); if (suggestion) { $('#ai-prompt').value = suggestion.dataset.prompt; $('#ai-prompt').focus(); } const apply = event.target.closest('[data-apply-plan]'); if (apply) { try { applyPlan(state.plans.get(apply.dataset.applyPlan)); apply.outerHTML = '<p class="plan-applied">✓ Applied to workspace</p>'; } catch (error) { toast(error.message); } } });
  document.addEventListener('keydown', (e) => {
    const input = e.target.closest('input,textarea,select,[contenteditable="true"]');
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); toggleAssistant(!$('#assistant-panel').classList.contains('open')); }
    if (!input && e.key === '/') { e.preventDefault(); $('#search').focus(); }
    if (!input && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    if (e.key === 'Escape' && !$('#dialog').open && !$('#preview-dialog').open) { $('#assistant-panel').classList.contains('open') ? toggleAssistant(false) : $('#inspector').classList.remove('open'); $('#sidebar').classList.remove('open'); }
    if (!input && ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key) && e.target.closest('#results')) { e.preventDefault(); const i = state.visible.findIndex((a) => a.id === state.selectedId); const offset = ['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : -1; const next = state.visible[Math.max(0, Math.min(state.visible.length - 1, i + offset))]; if (next) { setFocus(next.id, { scroll: true }); $(`[data-asset-id="${next.id}"]`, $('#results'))?.focus({ preventScroll: true }); } }
    if (!input && e.key === 'Enter' && e.target.closest('[data-asset-id]')) { e.preventDefault(); setFocus(e.target.closest('[data-asset-id]').dataset.assetId); }
  });
  window.addEventListener('hashchange', () => { const id = decodeURIComponent(location.hash.slice(1)); if (state.records.some((a) => a.id === id)) setFocus(id); });
}

async function init() {
  mountIcons(); $('#results').innerHTML = '<div class="loading-shell" style="grid-column:1/-1"><div></div><div></div><div></div></div>';
  if (location.protocol === 'file:') throw new Error('Serve the repository over HTTP: node cadJS/server.mjs, then open http://127.0.0.1:4173/catalog/.');
  const [inventory, thumbs, base] = await Promise.all([getJSON('../labs/asset_inventory.json'), getJSON('thumbnails.json').catch(() => ({ assets: {}, targets: {} })), getJSON('metadata.json').catch(() => emptyWorkspace())]);
  state.inventory = inventory; state.thumbnails = thumbs; const ids = inventory.assets.map((a) => a.id);
  state.workspace = validateWorkspace(base, ids);
  const draft = loadJSON(localStorage, DRAFT_KEY, null);
  if (draft) { try { state.workspace = validateWorkspace(draft, ids); state.dirty = true; state.conflict = draft.revision !== base.revision; } catch { toast('An older browser draft could not be loaded. The audited catalog is available.'); } }
  const savedView = loadJSON(localStorage, VIEW_KEY, {});
  for (const key of ['query', 'group', 'coverage', 'status', 'lifecycle', 'sort', 'layout', 'view', 'collection']) if (typeof savedView[key] === 'string') state[key] = savedView[key];
  const url = new URL(location.href);
  for (const [param, key] of [['q', 'query'], ['group', 'group'], ['coverage', 'coverage'], ['status', 'status'], ['life', 'lifecycle'], ['layout', 'layout'], ['collection', 'collection'], ['view', 'view']]) if (url.searchParams.has(param)) state[key] = url.searchParams.get(param);
  if (!['grid', 'list', 'board'].includes(state.layout)) state.layout = 'grid'; if (!['active', 'inactive', 'all'].includes(state.lifecycle)) state.lifecycle = 'active';
  state.selectedId = decodeURIComponent(url.hash.slice(1)) || url.searchParams.get('asset') || 'torii'; if (!ids.includes(state.selectedId)) state.selectedId = ids[0];
  state.aiSettings = { ...state.aiSettings, ...loadJSON(localStorage, AI_KEY, {}) }; state.keys = loadJSON(sessionStorage, API_KEYS, loadJSON(localStorage, API_KEYS, {}));
  refreshRecords(); bind(); $('#ai-tokens').value = state.aiSettings.maxTokens; $('#ai-reasoning').value = state.aiSettings.reasoning; $('#ai-transport').value = state.aiSettings.transport; $('#ai-remember').checked = state.aiSettings.rememberKeys; loadAiProvider(state.aiSettings.provider); render();
  // The API is optional. Static hosting uses browser drafts and direct provider
  // requests; local cadJS hosting enables an atomic repository save and relay.
  fetch(new URL('health', API)).then((r) => r.ok ? r.json() : null).then(async (health) => {
    if (!health?.ok) return; state.connected = true;
    const { workspace } = await getJSON(new URL('workspace', API));
    if (!state.dirty) { state.workspace = validateWorkspace(workspace, ids); refreshRecords(); } else state.conflict = state.workspace.revision !== workspace.revision;
    render();
  }).catch(() => {});
  window.assetLibrary = { ready: true, get records() { return state.records; }, get visible() { return state.visible; }, get workspace() { return structuredClone(state.workspace); }, get selectedId() { return state.selectedId; }, get connected() { return state.connected; }, setQuery(query) { resetFilters(); state.query = query; render(); }, selectAsset: setFocus, applyPlan, saveRepository, preview, closePreview, undo };
}
init().catch((error) => { $('#results').className = 'asset-results'; $('#results').innerHTML = `<div class="empty-state"><h2>The library could not open.</h2><p>${esc(error.message)}</p><p>From the repository root, run <code>node cadJS/server.mjs</code>.</p><button class="button" onclick="location.reload()">Try again</button></div>`; console.error(error); });
