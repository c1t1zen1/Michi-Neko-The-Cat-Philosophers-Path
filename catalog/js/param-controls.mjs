/* Controls generated from a kit asset's `params` schema (number -> slider, enum -> select,
   boolean -> checkbox, color -> color input) plus the hero/mid/far tier switch.
   DOM only; values are coerced with the kit's own coerceParam when supplied. */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const hex = (n) => '#' + Number(n).toString(16).padStart(6, '0');

/** One control row's markup for a schema entry. */
export function paramRow(key, p, value) {
  const label = esc(p.label || key), v = value ?? p.default;
  if (p.type === 'number') return `<label class="param-row"><span>${label}<output data-out="${key}">${v}</output></span><input type="range" data-param="${key}" min="${p.min}" max="${p.max}" step="${p.step || (p.max - p.min) / 100}" value="${v}"></label>`;
  if (p.type === 'enum') return `<label class="param-row"><span>${label}</span><select data-param="${key}">${p.options.map((o) => `<option${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  if (p.type === 'boolean') return `<label class="param-row check"><input type="checkbox" data-param="${key}"${v ? ' checked' : ''}><span>${label}</span></label>`;
  if (p.type === 'color') return `<label class="param-row"><span>${label}</span><input type="color" data-param="${key}" value="${typeof v === 'number' ? hex(v) : esc(v)}"></label>`;
  return '';
}
export function readParam(p, input) {
  if (p.type === 'number') return Number(input.value);
  if (p.type === 'boolean') return input.checked;
  if (p.type === 'color') return parseInt(input.value.slice(1), 16);
  return input.value;
}
/** Render into `host`. Calls onTier(tier) and onParams(values) on change; `values` holds every parameter. */
export function controlsFor(host, { def, tier = 'mid', params = {}, onTier = () => {}, onParams = () => {} }) {
  const schema = def.params || {}, values = {};
  for (const [key, p] of Object.entries(schema)) values[key] = params[key] ?? (p.type === 'color' && typeof p.default === 'string' ? parseInt(p.default.replace('#', ''), 16) : p.default);
  host.innerHTML = `<h2>${esc(def.label)}</h2><p class="param-id">${esc(def.id)} · ${esc(def.family)}</p><div class="tier-seg" role="group" aria-label="Detail tier">${(def.tiers || ['hero', 'mid', 'far']).map((t) => `<button type="button" data-tier="${t}" class="${t === tier ? 'active' : ''}">${t}</button>`).join('')}</div><div class="param-list">${Object.entries(schema).map(([k, p]) => paramRow(k, p, values[k])).join('') || '<p class="param-id">This asset has no parameters.</p>'}</div><button type="button" class="button small" data-reset>Reset parameters</button>`;
  host.onclick = (e) => {
    const t = e.target.closest('[data-tier]');
    if (t) { host.querySelectorAll('[data-tier]').forEach((b) => b.classList.toggle('active', b === t)); onTier(t.dataset.tier); }
    if (e.target.closest('[data-reset]')) { host.querySelectorAll('[data-param]').forEach((input) => { const p = schema[input.dataset.param]; if (p.type === 'boolean') input.checked = p.default; else input.value = p.type === 'color' ? hex(p.default) : p.default; const out = host.querySelector(`[data-out="${input.dataset.param}"]`); if (out) out.textContent = input.value; }); for (const [k, p] of Object.entries(schema)) values[k] = p.default; onParams({ ...values }); }
  };
  host.oninput = host.onchange = (e) => {
    const input = e.target.closest('[data-param]'); if (!input) return;
    const key = input.dataset.param; values[key] = readParam(schema[key], input);
    const out = host.querySelector(`[data-out="${key}"]`); if (out) out.textContent = values[key];
    onParams({ ...values });
  };
  return { values };
}
