/* dawCAT — shared UI helpers */

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'style') node.setAttribute('style', v);
    else node.setAttribute(k, v);
  }
  for (const child of children.flat()) {
    if (child == null) continue;
    node.append(child.nodeType ? child : document.createTextNode(child));
  }
  return node;
}

export function toast(msg, isErr = false) {
  const root = document.getElementById('toasts');
  const t = el('div', { class: 'toast' + (isErr ? ' err' : ''), text: msg });
  root.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 2600);
  setTimeout(() => t.remove(), 3000);
}

export function showModal({ title, body, buttons = [], wide = false }) {
  const root = document.getElementById('modal-root');
  root.innerHTML = '';
  const closeBtn = el('span', { class: 'modal-x', text: '✕', onclick: closeModal });
  const bodyEl = el('div', { class: 'modal-body' });
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else bodyEl.append(body);
  const box = el('div', { class: 'modal', style: wide ? 'max-width:860px' : '' },
    el('div', { class: 'modal-head' }, el('span', { text: title }), closeBtn),
    bodyEl
  );
  if (buttons.length) {
    const foot = el('div', { class: 'modal-foot' });
    for (const b of buttons) {
      foot.append(el('button', {
        class: 'btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : ''),
        text: b.label,
        onclick: () => { if (b.onClick) b.onClick(); if (b.close !== false) closeModal(); }
      }));
    }
    box.append(foot);
  }
  root.append(box);
  root.classList.add('open');
  return box;
}

export function closeModal() {
  const root = document.getElementById('modal-root');
  root.classList.remove('open');
  root.innerHTML = '';
}

export function ctxMenu(x, y, items) {
  const menu = document.getElementById('ctx-menu');
  menu.innerHTML = '';
  for (const item of items) {
    if (item === 'sep') { menu.append(el('div', { class: 'ctx-sep' })); continue; }
    const row = el('div', { class: 'ctx-item' },
      el('span', { text: item.label }),
      item.key ? el('span', { class: 'key', text: item.key }) : null
    );
    row.addEventListener('click', () => { hideCtxMenu(); if (item.onClick) item.onClick(); });
    menu.append(row);
  }
  menu.classList.remove('hidden');
  const mw = menu.offsetWidth || 170;
  const mh = menu.offsetHeight || 100;
  menu.style.left = Math.min(x, window.innerWidth - mw - 8) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - mh - 8) + 'px';
}

export function hideCtxMenu() {
  document.getElementById('ctx-menu').classList.add('hidden');
}

export function download(name, content, mime = 'application/octet-stream') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function fmtDb(v) {
  if (!v || v <= 0.0001) return '-∞ dB';
  return (20 * Math.log10(v)).toFixed(1) + ' dB';
}

/* Draggable knob control */
export function makeKnob({ label, min, max, value, step = 0.01, fmt, onChange, def, size = 34 }) {
  let val = value;
  const ind = el('div', { class: 'ind' });
  const dial = el('div', { class: 'knob-dial' }, ind);
  const valEl = el('div', { class: 'knob-val' });
  const knob = el('div', { class: 'knob' }, dial, el('div', { class: 'knob-label', text: label }), valEl);
  if (size !== 34) { dial.style.width = dial.style.height = size + 'px'; }

  function render() {
    const f = (val - min) / (max - min);
    ind.style.transform = `translateX(-50%) rotate(${-135 + f * 270}deg)`;
    valEl.textContent = fmt ? fmt(val) : val.toFixed(2);
  }

  dial.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startVal = val;
    const onMove = (ev) => {
      const dy = startY - ev.clientY;
      let v = startVal + dy * (max - min) / 140;
      v = Math.min(max, Math.max(min, v));
      v = Math.round(v / step) * step;
      val = v;
      render();
      onChange(val);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });
  dial.addEventListener('dblclick', () => {
    if (def != null) { val = def; render(); onChange(val); }
  });
  render();
  return { el: knob, set(v) { val = v; render(); } };
}
