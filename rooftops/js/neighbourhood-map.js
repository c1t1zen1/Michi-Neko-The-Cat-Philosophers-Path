// Optional paper map: the same rail used by the player, with live cat marks.
const NS = 'http://www.w3.org/2000/svg';
export function neighbourhoodMap(level, onOpen = () => {}) {
  const panel = document.getElementById('neighbourhood-map');
  const button = document.getElementById('btn-map');
  const svg = document.getElementById('route-map');
  if (!panel || !button || !svg) return { update() {} };
  const add = (tag, attrs, text) => {
    const e = document.createElementNS(NS, tag);
    for (const [k,v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text) e.textContent = text;
    svg.append(e); return e;
  };
  const b = level.bounds;
  svg.setAttribute('viewBox', `${b.x0 - 12} ${b.z0 - 12} ${b.x1 - b.x0 + 24} ${b.z1 - b.z0 + 24}`);
  for (let x = b.x0; x <= b.x1; x += 28) add('path', { d:`M${x},${b.z0}V${b.z1}`, class:'map-grid' });
  for (let z = b.z0; z <= b.z1; z += 28) add('path', { d:`M${b.x0},${z}H${b.x1}`, class:'map-grid' });
  let d = '';
  for (let s = 0; s <= level.length; s += 1) { const p = level.rail.pointAt(s); d += `${s ? 'L' : 'M'}${p.x.toFixed(2)},${p.z.toFixed(2)}`; }
  add('path', {d, class:'map-streets'});
  const progress = add('path', {d, class:'map-travelled', pathLength:100});
  level.checkpoints.forEach(cp => {
    const p = level.rail.pointAt(cp.s);
    add('circle', {cx:p.x,cy:p.z,r:6,class:'map-lantern'});
    add('text', {x:p.x,y:p.z+.5,class:'map-number'}, String(cp.mouth));
  });
  const guide = add('circle', {r:4,class:'map-guide'}), cat = add('circle', {r:4,class:'map-cat'});
  const toggle = on => {
    panel.hidden = !on; button.setAttribute('aria-expanded', String(on));
    if (on) { onOpen(); document.getElementById('close-map').focus(); }
    else button.focus();
  };
  button.addEventListener('click', () => toggle(panel.hidden));
  document.getElementById('close-map').addEventListener('click', () => toggle(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { e.preventDefault(); e.stopImmediatePropagation(); toggle(false); } }, true);
  return {
    update(s, guideS) {
      if (panel.hidden) return;
      for (const [dot, at] of [[cat,s],[guide,guideS]]) { const p=level.rail.pointAt(at); dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.z); }
      progress.style.strokeDasharray = `${Math.min(100, Math.max(0, s / level.length * 100))} 100`;
    }
  };
}
