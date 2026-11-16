export const BOARD_ID = 'rooftops-stage-2';
export const CAPTURE_ID = 'route-elevations-20261115';
export const COLORS = ['#d54b3e', '#e5aa27', '#3c8468', '#397bb5', '#8b61b1', '#292d29', '#ffffff'];
export const clone = value => structuredClone(value);
export const uid = () => crypto.randomUUID();
export function emptyReview() {
  return { schemaVersion: 1, boardId: BOARD_ID, captureId: CAPTURE_ID, revision: 0, updatedAt: null, routes: {} };
}
export function routeReview(review, id) {
  return review.routes[id] ||= { strokes: [], notes: [] };
}
export function routeGeometry(route) {
  let x = 0;
  const frames = route.frames.map(frame => {
    const value = { ...frame, x, width: frame.width || 1200, height: frame.height || 750 };
    x += value.width;
    return value;
  });
  return { frames, width: x, height: Math.max(750, ...frames.map(f => f.height)) };
}
export function locatePoint(route, x, y) {
  const geometry = routeGeometry(route);
  const frame = geometry.frames.find(f => x >= f.x && x < f.x + f.width) || geometry.frames.at(-1);
  if (!frame) return null;
  const u = Math.max(0, Math.min(1, (x - frame.x) / frame.width));
  return { frameId: frame.id, u, v: Math.max(0, Math.min(1, y / frame.height)), s: frame.s0 + (frame.s1 - frame.s0) * u };
}
export function strokePath(points) {
  if (!points.length) return '';
  return points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
}
export function distanceToStroke(x, y, points) {
  let distance = Infinity;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[i + 1] || a, dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    distance = Math.min(distance, Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy));
  }
  return distance;
}
function fail(message) { throw new Error(message); }
function number(value, min, max, label) {
  if (!Number.isFinite(value) || value < min || value > max) fail(`Invalid ${label}.`);
}
function string(value, max, label) {
  if (typeof value !== 'string' || value.length > max) fail(`Invalid ${label}.`);
}
export function validateReview(input, manifest) {
  if (!input || input.schemaVersion !== 1 || input.boardId !== BOARD_ID) fail('This is not a Skretch Stage 2 review.');
  if (input.captureId !== CAPTURE_ID) fail('This review belongs to an older capture. Its marks cannot be positioned safely on the new board.');
  number(input.revision, 0, Number.MAX_SAFE_INTEGER, 'revision');
  if (!Number.isInteger(input.revision)) fail('Invalid revision.');
  if (!input.routes || typeof input.routes !== 'object' || Array.isArray(input.routes)) fail('Invalid routes.');
  const result = emptyReview(); result.revision = input.revision;
  result.updatedAt = typeof input.updatedAt === 'string' ? input.updatedAt : null;
  let totalPoints = 0;
  for (const [id, data] of Object.entries(input.routes)) {
    const route = manifest.routes.find(r => r.id === id);
    if (!route) fail(`Unknown route: ${id}`);
    const geometry = routeGeometry(route), output = { strokes: [], notes: [] }, ids = new Set();
    for (const type of ['strokes', 'notes']) {
      if (!Array.isArray(data[type]) || data[type].length > 10000) fail(`Invalid ${type}.`);
      for (const item of data[type]) {
        string(item.id, 100, 'annotation id');
        if (!item.id || ids.has(item.id)) fail('Duplicate annotation id.'); ids.add(item.id);
        string(item.updatedAt, 50, 'annotation date');
        if (!Number.isFinite(Date.parse(item.updatedAt))) fail('Invalid annotation date.');
        const base = { id: item.id, updatedAt: item.updatedAt, deleted: item.deleted === true };
        if (base.deleted) { output[type].push(base); continue; }
        if (!/^#[0-9a-f]{6}$/i.test(item.color)) fail('Invalid ink color.');
        if (type === 'strokes') {
          if (!['pen', 'pencil', 'marker'].includes(item.tool)) fail('Invalid drawing tool.');
          number(item.size, .5, 80, 'stroke size');
          if (!Array.isArray(item.points) || !item.points.length || item.points.length > 30000) fail('Invalid stroke points.');
          totalPoints += item.points.length; if (totalPoints > 500000) fail('Review exceeds 500,000 points. Export and start a new review.');
          const points = item.points.map(p => {
            if (!Array.isArray(p)) fail('Invalid point.');
            number(p[0], 0, geometry.width, 'point x'); number(p[1], 0, geometry.height, 'point y');
            number(p[2] ?? .5, 0, 1, 'pressure');
            return [p[0], p[1], p[2] ?? .5];
          });
          output.strokes.push({ ...base, tool: item.tool, size: item.size, color: item.color, points });
        } else {
          number(item.x, 0, geometry.width, 'note x'); number(item.y, 0, geometry.height, 'note y');
          string(item.title, 140, 'note title'); string(item.body, 12000, 'note text');
          if (!item.title.trim()) fail('Give your note a title.');
          if (!['layout', 'scenery', 'movement', 'other'].includes(item.category)) fail('Invalid category.');
          if (!['open', 'done'].includes(item.status)) fail('Invalid note status.');
          output.notes.push({ ...base, x: item.x, y: item.y, color: item.color, title: item.title.trim(), body: item.body, category: item.category, status: item.status, anchor: locatePoint(route, item.x, item.y) });
        }
      }
    }
    result.routes[id] = output;
  }
  return result;
}
// Stable ids and deletion records allow a disconnected phone to rejoin without
// reviving erased marks. Used only when the reviewer explicitly chooses Merge.
export function mergeReviews(remote, local) {
  const merged = clone(remote);
  for (const [routeId, data] of Object.entries(local.routes)) {
    const dest = routeReview(merged, routeId);
    for (const type of ['strokes', 'notes']) {
      const map = new Map(dest[type].map(item => [item.id, item]));
      for (const item of data[type]) {
        const previous = map.get(item.id);
        if (!previous || Date.parse(item.updatedAt) >= Date.parse(previous.updatedAt)) map.set(item.id, clone(item));
      }
      dest[type] = [...map.values()];
    }
  }
  return merged;
}
export function reviewMarkdown(review, manifest) {
  const lines = ['# Skretch — The Roof Road / Stage 2', '', `Revision: ${review.revision}  `, `Saved: ${review.updatedAt || 'browser draft'}  `, `Capture: ${manifest.capturedAt || 'unknown'}  `, '', 'Coordinates are in original capture pixels. Metres are approximate within a frame; turn views have a changing camera heading.', ''];
  for (const route of manifest.routes) {
    const data = review.routes[route.id]; if (!data) continue;
    const strokes = data.strokes.filter(s => !s.deleted), notes = data.notes.filter(n => !n.deleted);
    if (!strokes.length && !notes.length) continue;
    lines.push(`## ${route.name}`, '', `${strokes.length} ink strokes · ${notes.length} notes`, '');
    for (const note of notes) {
      const anchor = locatePoint(route, note.x, note.y), frame = route.frames.find(f => f.id === anchor.frameId);
      lines.push(`### [${note.status}] ${note.title.replace(/[\r\n]/g, ' ')}`, '', `Category: ${note.category} · Frame: ${anchor.frameId} · Route: ~${anchor.s.toFixed(1)} m · Pixel: (${note.x.toFixed(1)}, ${note.y.toFixed(1)})`, '', `Source image: ${frame.image}`, '', note.body, '');
    }
    for (const stroke of strokes) {
      const a = locatePoint(route, ...stroke.points[0]);
      lines.push(`- Ink ${stroke.id}: ${stroke.tool}, ${stroke.color}, ${stroke.size}px, ${stroke.points.length} points; begins in ${a.frameId} at ~${a.s.toFixed(1)} m.`);
    }
    lines.push('');
  }
  return lines.join('\n') + '\n';
}
