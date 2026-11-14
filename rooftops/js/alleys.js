// Optional routes through the interiors of downtown blocks. No renderer here.
// One down press at either noren chooses a lane; both ends return to the street.
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export function alleyDepth(a, s) {
  const u = Math.max(0, Math.min(1, (s - a.s0) / (a.s1 - a.s0)));
  const points = a.path;
  for (let i = 1; i < points.length; i++) if (u <= points[i][0]) {
    const [x0, d0] = points[i - 1], [x1, d1] = points[i];
    return d0 + (d1 - d0) * smooth((u - x0) / (x1 - x0));
  }
  return points.at(-1)[1];
}
export function alleyEntrance(level, s, y) {
  if (y > 1.25 || y < -0.3) return null;
  return level.alleys?.find(a => Math.abs(s - a.s0 - .8) < 1.05 || Math.abs(s - a.s1 + .8) < 1.05) || null;
}
export function addAlleys(L) {
  const legs = L.rail.segs.filter(p => p.type === 'line');
  const recipes = [
    [0, 32, 23, 'indigo', 'Indigo dyer’s court', '藍の庭', -6.1],
    [2, 5, 28, 'bamboo', 'Bamboo basket lane', '竹の路地', -6.8],
    [6, 12, 31, 'tea', 'Tea garden passage', '茶の庭', -7.0],
    [8, 10, 33, 'laundry', 'Tenugui wash lane', '洗い路地', -6.6],
    [10, 7, 31, 'moss', 'Moss and tile court', '苔の庭', -7.2],
    [12, 8, 32, 'festival', 'Lantern maker’s lane', '灯り路地', -6.3]
  ];
  L.alleys = [];
  recipes.forEach(([leg, offset, length, theme, name, kanji, deep], id) => {
    const s0 = legs[leg].s0 + offset, s1 = s0 + length;
    const a = { id, s0, s1, theme, name, kanji, tunnelH: 2.15,
      path: [[0, 2.2], [.20, deep + .8], [.45, deep], [.70, deep + 1.1], [1, 2.2]], plats: [] };
    L.alleys.push(a);
    const plat = (x0, x1, y, kind, label, portal = false) => {
      const p = { id: L.platforms.length, s0: s0 + x0, s1: s0 + x1, y0: y, y1: y,
        d: alleyDepth(a, s0 + (x0 + x1) / 2), depthPath: a, alley: id, portal, kind, label: name + ' ' + label };
      L.platforms.push(p); a.plats.push(p.id); return p;
    };
    // Continuous safe floors, with explicit graph portals at both street ends.
    plat(0, 2.2, 0, 'street', 'entrance', true);
    plat(2.2, length - 2.2, 0, 'street', 'paving');
    plat(length - 2.2, length, 0, 'street', 'exit', true);
    const patterns = {
      indigo: [[4,6,.65,'step'],[6.8,9,1.2,'deck'],[10,12,1.8,'cap'],[13.5,16,1.15,'deck'],[17,19,.65,'step']],
      bamboo: [[4,6,.7,'step'],[7,10,1.5,'cap'],[11,14,2.3,'rope'],[15,18,1.5,'cap'],[20,23,.7,'step']],
      tea: [[5,7,.45,'step'],[8,10,.95,'cap'],[11,15,1.7,'deck'],[16,19,2.5,'branch'],[21,24,1.3,'deck']],
      laundry: [[4,6,.65,'step'],[7,9,.85,'futon'],[11,14,2.5,'deck'],[15,18,2.7,'rope'],[20,23,1.65,'deck'],[25,27,.8,'step']],
      moss: [[4,6,.4,'step'],[7,9,1.1,'cap'],[10,13,1.85,'deck'],[14,17,2.6,'cap'],[18,22,1.8,'deck'],[24,27,.7,'step']],
      festival: [[4,7,.7,'step'],[8,11,1.5,'rack'],[12,15,2.4,'rope'],[16,19,1.65,'rack'],[21,25,.85,'step']]
    };
    patterns[theme].forEach(([x0,x1,y,kind]) => plat(x0,x1,y,kind,kind));
    // The entry/exit passages have real soffits; courtyard air stays open.
    for (const [x0,x1] of [[.25,3.6],[length-3.6,length-.25]]) {
      L.ceilings.push({ s0:s0+x0, s1:s0+x1, y:a.tunnelH, d0:-10, d1:4, alley:id });
    }
    L.pieces.push({ type: 'alleyRoute', s0, s1, alley: id });
  });
}
