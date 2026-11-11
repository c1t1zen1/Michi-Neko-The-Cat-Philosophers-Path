// Shared deep links from the asset catalog. This does not construct a tile or
// change a recipe: the lab's existing lazy renderer handles the revealed card.
const SAFE_ID = /^[a-z0-9][a-z0-9_-]{0,99}$/i;

export function requestedSpecimen(location = globalThis.location) {
  if (!location) return null;
  const value = new URLSearchParams(location.search || '').get('specimen');
  if (value) return SAFE_ID.test(value) ? value : null;
  let hash;
  try { hash = decodeURIComponent(String(location.hash || '').replace(/^#/, '')); } catch { return null; }
  return hash.startsWith('specimen-') && SAFE_ID.test(hash.slice(9)) ? hash.slice(9) : null;
}

/** Register stable card IDs, then reveal an exact catalog selection once. */
export function mountSpecimenLinks(items, { getId = (item) => item.id, getElement = (item) => item.card, onSelect = null, location = globalThis.location, document = globalThis.document } = {}) {
  if (!document) return null;
  for (const item of items) {
    const id = getId(item), element = getElement(item);
    if (element && SAFE_ID.test(String(id))) {
      element.id ||= 'specimen-' + id;
      element.dataset.specimen = id;
    }
  }
  const id = requestedSpecimen(location);
  const selected = id && items.find((item) => String(getId(item)) === id);
  const element = selected && getElement(selected);
  if (!element) return null;
  element.hidden = false;
  let parent = element.parentElement;
  while (parent && parent !== document.body) { parent.hidden = false; parent = parent.parentElement; }
  element.classList.add('catalog-specimen-focus');
  element.style.scrollMarginTop = '6rem';
  element.style.outline = '3px solid #b77c38';
  element.style.outlineOffset = '6px';
  if (!element.hasAttribute('tabindex')) element.tabIndex = -1;
  onSelect?.(selected);
  const reveal = () => { element.scrollIntoView({ block: 'center', behavior: 'instant' }); element.focus({ preventScroll: true }); };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(reveal));
  else reveal();
  return selected;
}
