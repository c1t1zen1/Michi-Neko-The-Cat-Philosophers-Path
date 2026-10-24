// A typographic dropdown: no native <select>, no boxes — a serif label that
// opens a floating index of options, grouped, with keyboard support.

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
