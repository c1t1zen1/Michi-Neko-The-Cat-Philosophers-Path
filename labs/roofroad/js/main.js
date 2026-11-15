// The Roof Road lab (屋根道): a shelf of every piece type the run is built
// from, each the classic builder on the real level (js/shelf.js), in the
// shared workshop (labs/shared/workshop.js). Picking a tile says where that
// piece stands on the run and opens the run there (kyoto-rooftops.html?at=).
import { runLab } from '../../shared/workshop.js';
import { shelfEntries, buildEntry, roofRoad } from './shelf.js';

const PLAY = '../../kyoto-rooftops.html';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (s) => document.querySelector(s);

const FAMILIES = [
  { key: 'r2', title: 'Streets &amp; roofs <span class="jp">通りと屋根</span>', sub: 'Sanjō, Awataguchi and Pontochō: the bridge, the machiya and the alleys (lane r2-roofs-streets).' },
  { key: 'r3', title: 'Canal &amp; market <span class="jp">川と市場</span>', sub: 'Takase, Nishiki and the laundry sky (lane r3-canal-market).' },
  { key: 'r4', title: 'Festival <span class="jp">祭</span>', sub: 'Hoko-chō, the float and what lies beyond the run (lane r4-festival).' },
  { key: 'r5', title: 'The cast <span class="jp">人と鍾馗</span>', sub: 'The people and the things the cat greets (lane r5-roof-cast). Chidori is the game’s cat: see her on the run.' }
];

const SOURCES = {
  spec: ['The Roof Road design (rooftops spec)', '../../docs/superpowers/specs/2026-10-24-rooftop-road-design.md', 'design'],
  research: ['Roof Road research notes', '../../docs/ROOFTOPS_RESEARCH_2026-10-24.md', 'research'],
  downtown: ['Downtown pass', '../../docs/ROOFTOPS_DOWNTOWN_2026-11-13.md', 'notes'],
  agility: ['Alley agility pass', '../../docs/ROOFTOPS_AGILITY_2026-11-13.md', 'notes'],
  pieces: ['The PIECES table', '../../rooftops/js/pieces/index.js', 'source'],
  build: ['The buildWorld facade', '../../rooftops/js/build.js', 'source'],
  guide: ['Build guide, Phase 5', '../../BUILD_GUIDE_FABLE.md', 'plan']
};

const entries = shelfEntries();
const where = (e) => e.mouth ? `mouth ${e.mouth.id} · ${e.mouth.romaji} ${e.mouth.kanji}` : 'beyond the run';
const specimens = entries.map((e) => ({
  id: e.key, family: e.lane, original: true,
  name: e.name, jp: e.jp, blurb: e.blurb,
  tag: `${e.id} · ${e.count ? `${e.count} on the run, first at s = ${e.s.toFixed(1)} m, ${where(e)}` : where(e)}`,
  how: [
    `Inventory id ${e.id}; owner lane ${e.lane}.`,
    e.piece ? `buildWorld() builds it through assets.build('${e.id}', pieceLayout(piece), classic): classic until a kit asset registers that id.` : 'Built by buildWorld() around the run, not from a level piece.',
    `Source: rooftops/js/${e.file}.`
  ],
  use: e.piece ? `the ${e.count} ${e.key} pieces of the Roof Road` : 'the Roof Road around the route',
  game: e.piece ? () => e.piece.build : undefined,
  build(k) {
    const built = buildEntry(e);
    // Long pieces (the street ribbons, the canal, the canopy, the city) go
    // without a plinth: one sized to them would swallow the tile.
    built.group.updateMatrixWorld(true);
    const size = new k.THREE.Box3().setFromObject(built.group).getSize(new k.THREE.Vector3());
    this.plinth = Math.max(size.x, size.z) > 24 ? 'none' : 'stone';
    return { group: built.group, update: built.update };
  }
}));

function choose(spec) {
  const e = entries.find((x) => x.key === spec.id);
  if (!e) return;
  const play = e.s === null ? PLAY : `${PLAY}?at=${e.s.toFixed(1)}`;
  $('#pick-name').innerHTML = `${esc(e.name)} <span class="jp">${e.jp}</span>`;
  $('#pick-where').textContent = e.count ? `${e.count} on the run · first at s = ${e.s.toFixed(1)} m · ${where(e)}` : where(e);
  $('#pick-id').textContent = `${e.id} · lane ${e.lane} · rooftops/js/${e.file}`;
  $('#pick-play').href = play;
}

function mountMouths() {
  const { level } = roofRoad();
  $('#mouths').innerHTML = level.mouths.map((m) => `<li><a href="${PLAY}?mouth=${m.id}">${m.id} · <span class="jp">${m.kanji}</span> ${esc(m.romaji)}</a> <small>${esc(m.title)}</small></li>`).join('')
    + `<li><a href="${PLAY}?finale=1">The finale</a> <small>the five fires</small></li>`;
}

mountMouths();
choose({ id: entries[0].key });
const lab = await runLab({
  slug: 'roofroad', hour: 15.5, plinth: 'stone', families: FAMILIES, specimens, sources: SOURCES,
  chooseLabel: () => 'Where it stands', choose, stage: async () => null
});
// The workshop marks originals "In the game today"; the Roof Road is a prototype page.
for (const mark of document.querySelectorAll('#shelves .specimen-mark')) mark.textContent = 'On the Roof Road today';
window.__roofroad = { lab, entries };
