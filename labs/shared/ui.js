// Lab UI kit: the typographic Dropdown (from the Grass Lab), seg / slider /
// toggle controls, the Stepper, the before/after Split and 3D Callouts.
import { reduceMotion } from './stage.js';

export class Dropdown {
  /**
   * items: [{ value, label, hint?, group?, swatch? }]  (group = heading text)
   * columns: lay the panel out in N columns (one per group when groups exist)
   */
  constructor(mount, { items, value, onChange, label = '', columns = 1, wide = false }) {
    this.items = items;
    this.value = value;
    this.onChange = onChange;
    this.open = false;
    this.root = document.createElement('div');
    this.root.className = 'dd' + (wide ? ' dd-wide' : '');
    this.btn = document.createElement('button');
    this.btn.type = 'button';
    this.btn.className = 'dd-btn';
    this.btn.setAttribute('aria-haspopup', 'listbox');
    this.btn.setAttribute('aria-expanded', 'false');
    if (label) this.btn.setAttribute('aria-label', label);
    this.labelEl = document.createElement('span');
    this.labelEl.className = 'dd-label';
    this.btn.append(this.labelEl);
    this.btn.insertAdjacentHTML('beforeend', '<svg class="dd-chev" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>');
    this.panel = document.createElement('div');
    this.panel.className = 'dd-panel';
    this.panel.setAttribute('role', 'listbox');
    this.panel.style.setProperty('--cols', columns);
    if (columns > 1) this.panel.classList.add('dd-multi');
    this.root.append(this.btn, this.panel);
    mount.append(this.root);
    this._renderOptions();
    this.set(value, false);

    this.btn.addEventListener('click', () => (this.open ? this.close() : this.show()));
    this.btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.show(); }
    });
    this.panel.addEventListener('keydown', (e) => this._key(e));
    document.addEventListener('pointerdown', (e) => { if (this.open && !this.root.contains(e.target)) this.close(); });
  }

  _renderOptions() {
    this.panel.textContent = '';
    this.optEls = [];
    let group = null, groupEl = null, n = 0;
    for (const it of this.items) {
      if (it.group !== undefined && it.group !== group) {
        group = it.group;
        groupEl = document.createElement('div');
        groupEl.className = 'dd-group';
        const h = document.createElement('div');
        h.className = 'dd-gh';
        h.textContent = group;
        groupEl.append(h);
        this.panel.append(groupEl);
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dd-opt';
      b.setAttribute('role', 'option');
      b.dataset.value = it.value;
      b.innerHTML = `${it.swatch ? `<i class="dd-sw" style="background:${it.swatch}"></i>` : ''}<span class="dd-n">${String(++n).padStart(2, '0')}</span><span class="dd-t">${it.label}</span>${it.hint ? `<em class="dd-h">${it.hint}</em>` : ''}`;
      b.addEventListener('click', () => { this.set(it.value, true); this.close(); this.btn.focus(); });
      (groupEl || this.panel).append(b);
      this.optEls.push(b);
    }
  }

  _key(e) {
    const i = this.optEls.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); this.close(); this.btn.focus(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); this.optEls[Math.min(this.optEls.length - 1, i + 1)].focus(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); this.optEls[Math.max(0, i - 1)].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); this.optEls[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); this.optEls[this.optEls.length - 1].focus(); }
  }

  show() {
    this.open = true;
    this.root.classList.add('open');
    this.btn.setAttribute('aria-expanded', 'true');
    const cur = this.optEls.find((o) => o.dataset.value === String(this.value)) || this.optEls[0];
    cur.focus({ preventScroll: true });
    // keep the panel on screen horizontally
    this.panel.style.left = '0px';
    const r = this.panel.getBoundingClientRect();
    const over = r.right - (window.innerWidth - 16);
    if (over > 0) this.panel.style.left = `${-over}px`;
    if (r.left < 16) this.panel.style.left = `${16 - r.left}px`;
  }

  close() {
    this.open = false;
    this.root.classList.remove('open');
    this.btn.setAttribute('aria-expanded', 'false');
  }

  set(value, emit = true) {
    this.value = value;
    const it = this.items.find((i) => String(i.value) === String(value)) || this.items[0];
    this.labelEl.textContent = it.label;
    for (const o of this.optEls) o.classList.toggle('on', o.dataset.value === String(value));
    if (emit && this.onChange) this.onChange(it.value);
  }
}

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/** items: [{ v, label, title? }] */
export function seg(mount, items, value, onPick) {
  const el = document.createElement('span');
  el.className = 'seg';
  el.innerHTML = items.map((i) => `<button type="button" data-v="${i.v}"${i.title ? ` title="${esc(i.title)}"` : ''}>${i.label}</button>`).join('');
  const set = (v) => el.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(v)));
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    const it = items.find((i) => String(i.v) === b.dataset.v);
    set(it.v);
    onPick && onPick(it.v);
  });
  set(value);
  mount.append(el);
  return { set, el };
}

export function slider(mount, { label, min, max, step, value, fmt = (v) => v, onInput }) {
  const el = document.createElement('label');
  el.className = 'ctl';
  el.innerHTML = `<span class="ctl-l">${label}</span><input class="range" type="range" min="${min}" max="${max}" step="${step}" aria-label="${esc(label)}"><span class="ctl-v"></span>`;
  const input = el.querySelector('input'), out = el.querySelector('.ctl-v');
  const set = (v) => { input.value = v; out.textContent = fmt(+input.value); };
  input.addEventListener('input', () => { set(input.value); onInput && onInput(+input.value); });
  set(value);
  mount.append(el);
  return { set, get: () => +input.value, el };
}

export function toggle(mount, { label, value = false, onChange }) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'tog';
  el.innerHTML = `<span class="tog-sw" aria-hidden="true"></span><span class="tog-l">${label}</span>`;
  let on = !!value;
  const set = (b) => { on = !!b; el.setAttribute('aria-pressed', on); };
  el.addEventListener('click', () => { set(!on); onChange && onChange(on); });
  set(on);
  mount.append(el);
  return { set, get: () => on, el };
}

export class Stepper {
  constructor(mount, { steps, start = 0, onStep }) {
    this.steps = steps;
    this.onStep = onStep;
    this.index = -1;
    this.timer = 0;
    const root = this.root = document.createElement('div');
    root.className = 'stepper';
    root.innerHTML = `<ol class="st-list">${steps.map((s, i) => `<li><button type="button" data-i="${i}"><span class="st-n">${String(i + 1).padStart(2, '0')}</span>${s.title}</button></li>`).join('')}</ol>
      <div class="st-main"><div class="st-body" aria-live="polite"></div><pre class="code" hidden><code></code></pre>
      <div class="st-bar"><button type="button" class="st-back">‹ Back</button><button type="button" class="st-play">Play ▸</button><button type="button" class="st-next">Next ›</button></div></div>`;
    mount.append(root);
    this.body = root.querySelector('.st-body');
    this.pre = root.querySelector('pre');
    this.playBtn = root.querySelector('.st-play');
    this.playBtn.disabled = reduceMotion;
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.classList.contains('st-play')) { if (this.timer) this.stop(); else this.play(); return; }
      this.stop();
      if (b.dataset.i) this.go(+b.dataset.i);
      else if (b.classList.contains('st-back')) this.prev();
      else if (b.classList.contains('st-next')) this.next();
    });
    root.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); this.stop(); this.next(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); this.stop(); this.prev(); }
    });
    this.go(start);
  }
  go(i) {
    i = Math.max(0, Math.min(this.steps.length - 1, i));
    this.index = i;
    const s = this.steps[i];
    this.root.querySelectorAll('.st-list button').forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-current', k === i ? 'step' : 'false'); });
    this.body.innerHTML = `<h3>${s.title}</h3>${s.body}`;
    this.pre.hidden = !s.code;
    if (s.code) this.pre.firstChild.textContent = s.code;
    this.root.querySelector('.st-back').disabled = i === 0;
    this.root.querySelector('.st-next').disabled = i === this.steps.length - 1;
    this.onStep && this.onStep(i, s);
  }
  next() { this.go(this.index + 1); }
  prev() { this.go(this.index - 1); }
  play(ms = 5200) {
    if (reduceMotion) return;
    this.stop();
    if (this.index >= this.steps.length - 1) this.go(0);
    this.playBtn.textContent = 'Pause ❚❚';
    this.timer = setInterval(() => { if (this.index >= this.steps.length - 1) this.stop(); else this.next(); }, ms);
  }
  stop() { clearInterval(this.timer); this.timer = 0; this.playBtn.textContent = 'Play ▸'; }
}

export class Split {
  constructor(stageEl, { value = 0.5, left = 'Before', right = 'After', onChange } = {}) {
    this.onChange = onChange;
    this.value = value;
    const el = this.el = document.createElement('div');
    el.className = 'split';
    el.hidden = true;
    el.innerHTML = '<span class="split-l"></span><span class="split-r"></span><div class="split-line"></div><button type="button" class="split-handle" role="slider" aria-label="Before and after divider" aria-valuemin="0" aria-valuemax="100"></button>';
    stageEl.append(el);
    this.handle = el.querySelector('.split-handle');
    this.setLabels(left, right);
    this._put();
    const move = (e) => {
      const r = stageEl.getBoundingClientRect();
      this.set((e.clientX - r.left) / r.width);
    };
    this.handle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.handle.setPointerCapture(e.pointerId);
      this.handle.addEventListener('pointermove', move);
    });
    const up = (e) => { e.stopPropagation(); this.handle.removeEventListener('pointermove', move); };
    this.handle.addEventListener('pointerup', up);
    this.handle.addEventListener('pointercancel', up);
    this.handle.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 0.02 : e.key === 'ArrowLeft' ? -0.02 : 0;
      if (d) { e.preventDefault(); this.set(this.value + d); }
    });
  }
  set(v) { this.value = Math.min(0.98, Math.max(0.02, v)); this._put(); this.onChange && this.onChange(this.value); }
  _put() {
    this.el.style.setProperty('--x', this.value * 100 + '%');
    this.handle.setAttribute('aria-valuenow', Math.round(this.value * 100));
  }
  get enabled() { return !this.el.hidden; }
  set enabled(b) { this.el.hidden = !b; }
  setLabels(l, r) {
    this.el.querySelector('.split-l').textContent = l;
    this.el.querySelector('.split-r').textContent = r;
  }
}

export class Callouts {
  constructor(stageEl, { onHover } = {}) {
    this.onHover = onHover;
    this.items = [];
    this.root = document.createElement('div');
    this.root.className = 'callouts';
    stageEl.append(this.root);
  }
  set(list) {
    this.root.textContent = '';
    this.items = list.map((c) => {
      const el = document.createElement('div');
      el.className = 'callout';
      el.innerHTML = `<i class="co-dot"></i><span class="co-t">${c.title}</span>${c.sub ? `<span class="co-s">${c.sub}</span>` : ''}`;
      el.addEventListener('pointerenter', () => this.onHover && this.onHover(c.id));
      el.addEventListener('pointerleave', () => this.onHover && this.onHover(null));
      this.root.append(el);
      return { ...c, el, v: c.pos.clone() };
    });
  }
  get visible() { return !this.root.hidden; }
  set visible(b) { this.root.hidden = !b; }
  update(camera, rect) {
    if (this.root.hidden) return;
    camera.updateMatrixWorld();
    for (const c of this.items) {
      c.v.copy(c.pos).project(camera);
      const x = (c.v.x * 0.5 + 0.5) * rect.width, y = (-c.v.y * 0.5 + 0.5) * rect.height;
      const show = c.v.z < 1 && c.v.z > -1 && x > 0 && x < rect.width && y > 0 && y < rect.height;
      c.el.style.visibility = show ? 'visible' : 'hidden';
      if (show) c.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  }
}
