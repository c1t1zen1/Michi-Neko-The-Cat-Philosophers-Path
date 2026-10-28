// The slim lab bar and footer line, read from the registry.
import { LABS, bySlug } from '../registry.js';

export function mountLabChrome(slug) {
  const lab = bySlug(slug);
  if (!lab) return;
  const nn = (n) => String(n).padStart(2, '0');
  const link = (l, label) => (l && l.status === 'live' && l.href
    ? `<a href="../${l.href}">${label}</a>`
    : `<span>${label}${l ? ' <small>(planned)</small>' : ''}</span>`);
  const prev = LABS.find((l) => l.n === lab.n - 1), next = LABS.find((l) => l.n === lab.n + 1);
  const bar = document.createElement('nav');
  bar.className = 'labnav';
  bar.setAttribute('aria-label', 'Labs');
  bar.innerHTML = `<a class="brand" href="../">Michi-Neko Labs</a><span>Lab ${nn(lab.n)} of ${LABS.length}</span><span class="sp"></span>`
    + (prev ? link(prev, `← ${prev.title}`) : '') + (next ? link(next, `${next.title} →`) : '');
  document.body.prepend(bar);
  const foot = document.querySelector('.foot');
  if (foot) foot.insertAdjacentHTML('beforeend', `<p>Lab ${nn(lab.n)} · <span class="jp">${lab.jp}</span> · built with Three.js r160 · painted at load time</p>`);
}
