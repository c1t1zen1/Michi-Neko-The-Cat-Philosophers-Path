// pieces/house.js — Roof Road piece 'house': a machiya: walls, façade, hira or tsuma roof, eave details, drying deck, festival lanterns, lit shoji.
// Lane r2-roofs-streets (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import { box, cyl, frameGroup } from './common.js';
import { hiraRoof, tsumaRoof, facade, streetEaveDetails } from './machiya.js';
import { hash1 } from '../level.js';

export const house = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(rail, sm);
  const x0 = pc.s0 - sm, x1 = pc.s1 - sm;
  const zF = pc.dFront, zB = pc.dFront - pc.depth;
  const look = pc.look;
  const far = pc.row === 'far';
  const wallMat = far && look > 0.55 ? M.bengara : (look > 0.7 ? M.plasterWarm : M.plaster);
  // Body: the walls up to the eave.
  g.add(box(x1 - x0, pc.eave, pc.depth, wallMat, 0, pc.eave / 2, (zF + zB) / 2));
  g.add(box(x1 - x0 + 0.12, 0.12, pc.depth + 0.12, M.timber, 0, pc.eave - 0.06, (zF + zB) / 2));
  facade(g, M, pc, x0, x1, zF, look);
  if (pc.style === 'hira') hiraRoof(g, M, x0, x1, zF, zB, pc.eave, pc.ridge);
  else tsumaRoof(g, M, x0, x1, zF, zB, pc.eave, pc.ridge);
  streetEaveDetails(g, M, pc, x0, x1, zF, look);
  if (pc.kaisho) {
    // The kaisho's second-floor opening onto the plank, curtained in festival red.
    g.add(box(1.4, 1.0, 0.06, M.tapestry, x1 - 0.9, 3.3, zF + 0.05));
  }
  if (pc.deck) {
    const dk = pc.deck;
    const zR = (zF + zB) / 2;
    const zD = zR + 0.9;
    const dx0 = dk.s0 - sm, dx1 = dk.s1 - sm, dxm = (dx0 + dx1) / 2;
    g.add(box(dx1 - dx0, 0.1, 2.0, M.timberMed, dxm, dk.y - 0.05, zD));
    for (const px of [dx0 + 0.1, dx1 - 0.1]) for (const pz of [zD - 0.9, zD + 0.9]) {
      g.add(box(0.1, dk.y - pc.ridge + 0.85, 0.1, M.timber, px, (pc.ridge + dk.y + 0.85) / 2 - 0.05, pz));
    }
    g.add(box(dx1 - dx0, 0.06, 0.06, M.timber, dxm, dk.y + 0.8, zD + 0.95));
    g.add(box(0.06, 0.06, 2.0, M.timber, dx0 + 0.1, dk.y + 0.8, zD));
    g.add(box(0.06, 0.06, 2.0, M.timber, dx1 - 0.1, dk.y + 0.8, zD));
    // A pole of washing over the deck.
    const pole = cyl(0.03, dx1 - dx0, M.bamboo, 'x', 6);
    pole.position.set(dxm, dk.y + 1.45, zD - 0.3);
    g.add(pole);
    for (let x = dx0 + 0.5, i = 0; x < dx1 - 0.4; x += 0.75, i++) {
      const cl = box(0.55, 0.7 + hash1(x + sm) * 0.25, 0.015, M.cloth[(i + Math.floor(look * 5)) % M.cloth.length], x, dk.y + 1.05, zD - 0.3);
      g.add(cl);
    }
    if (pc.futon) {
      const fx0 = pc.futon.s0 - sm, fx1 = pc.futon.s1 - sm, fxm = (fx0 + fx1) / 2, fw = fx1 - fx0;
      const zf = zR + 1.5;
      g.add(box(fw, 0.16, 0.9, M.futon, fxm, pc.futon.y - 0.08, zf));
      g.add(box(fw, 0.75, 0.12, M.futon, fxm, pc.futon.y - 0.45, zf + 0.42));
      g.add(box(fw, 0.75, 0.12, M.futon, fxm, pc.futon.y - 0.45, zf - 0.42));
    }
  }
  // Yoiyama: a pair of lanterns under the eave of the festival-street houses.
  if (pc.lanterns) {
    const ly = (pc.storeys === 2 ? pc.hisashi : pc.eave) - 0.38;
    for (const lx of [x0 + (x1 - x0) * 0.22, x1 - (x1 - x0) * 0.22]) {
      g.add(box(0.02, 0.2, 0.02, M.dark, lx, ly + 0.25, zF + 0.55));
      const l = cyl(0.13, 0.32, look > 0.5 ? M.lanternRed : M.lanternWhite, 'y', 10);
      l.position.set(lx, ly, zF + 0.55);
      g.add(l);
    }
    ctx.light(rail, sm, ly, zF + 0.9);
  }
  // Lit shoji upstairs at night.
  if (pc.storeys === 2 && !pc.covered) {
    g.add(box(Math.min(1.2, (x1 - x0) * 0.3), 0.5, 0.03, M.shoji, x0 + 0.9, (pc.hisashi + pc.eave) / 2 + 0.2, zF + 0.035));
  }
  ctx.add(g);
};
