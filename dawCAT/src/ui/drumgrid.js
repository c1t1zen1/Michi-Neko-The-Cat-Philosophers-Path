/* dawCAT — clip editor: drum step grid / sample clip props */
import { el, toast } from './common.js';
import { DRUM_LANES } from '../state.js';

export class DrumGrid {
  constructor(app) {
    this.app = app;
    this.host = document.getElementById('clip-editor');
    this.curBar = 0;
    this.painting = null;
    this.app.state.addEventListener('project', () => this.render());
    this.app.state.addEventListener('selection', () => this.render());
    this.render();
  }

  render() {
    this.host.innerHTML = '';
    const st = this.app.state;
    const track = st.selectedTrack();
    const clip = st.selectedClip();
    if (!track || !clip) {
      this.host.append(el('div', { class: 'empty-hint', text: 'Select a clip in the Arrangement to edit it here.' }));
      return;
    }
    if (track.kind === 'drum' && clip.steps) this.renderDrums(track, clip);
    else if (clip.sample) this.renderSample(track, clip);
    else this.renderSynthNote(track, clip);
  }

  renderDrums(track, clip) {
    const st = this.app.state;
    const head = el('div', { class: 'clip-head' },
      el('strong', { text: clip.name || 'Drum Clip' }),
      el('span', { class: 'dim', text: `${track.name} · ${track.drumKit} kit · ${clip.length} bar${clip.length > 1 ? 's' : ''} · pattern repeats each bar` })
    );

    // clip gain
    const gain = el('input', { type: 'range', min: '0', max: '1.5', step: '0.01', value: String(clip.gain), title: 'Clip gain' });
    gain.addEventListener('input', () => st.updateClip(track.id, clip.id, { gain: parseFloat(gain.value) }, { undo: false }));
    gain.addEventListener('change', () => st.pushUndo());
    head.append(el('label', { class: 'dim' }, 'Gain ', gain));

    const loopBtn = el('button', { class: 'mini-btn' + (clip.loop ? ' active' : ''), text: clip.loop ? '🔁 Looping' : '🔁 Loop' });
    loopBtn.addEventListener('click', () => st.updateClip(track.id, clip.id, { loop: !clip.loop }));
    head.append(loopBtn);

    this.host.append(head);

    const grid = el('div', { class: 'dgrid' });
    grid.style.gridTemplateColumns = `110px repeat(16, minmax(18px, 1fr))`;

    // header row
    grid.append(el('div', { class: 'dcell-head dim', text: '' }));
    for (let s = 0; s < 16; s++) {
      grid.append(el('div', { class: 'dcell-head' + (s % 4 === 0 ? ' beat' : ''), text: String(s + 1) }));
    }

    for (const lane of DRUM_LANES) {
      const arr = clip.steps[lane.id] || new Array(16).fill(0);
      const label = el('div', { class: 'dlane-label' },
        el('button', { class: 'mini-btn', title: `Preview ${lane.name}`, onclick: () => this.app.engine.previewDrum(lane.id, track.drumKit), text: '▶' }),
        el('span', { text: lane.name }),
        el('button', { class: 'mini-btn x', title: 'Clear lane', onclick: () => { st.clearLane(track.id, clip.id, lane.id); this.render(); }, text: '×' })
      );
      grid.append(label);
      for (let s = 0; s < 16; s++) {
        const v = arr[s] || 0;
        const cell = el('div', {
          class: 'dcell' + (v > 0 ? ' on' : '') + (v >= 1 ? ' full' : '') + (s % 4 === 0 ? ' beat' : ''),
          'data-lane': lane.id,
          'data-step': String(s),
          style: v > 0 ? `--v:${v}` : null
        });
        grid.append(cell);
      }
    }

    grid.addEventListener('pointerdown', (e) => {
      const cell = e.target.closest('.dcell');
      if (!cell) return;
      e.preventDefault();
      const laneId = cell.dataset.lane;
      const step = parseInt(cell.dataset.step, 10);
      const cur = clip.steps[laneId][step] || 0;
      const next = e.shiftKey ? (cur > 0 ? 0 : 1) : e.altKey ? (cur > 0 ? 0 : 0.5) : (cur > 0 ? 0 : 0.85);
      st.setStep(track.id, clip.id, laneId, step, next, { undo: false });
      st.pushUndo();
      this.painting = next > 0 ? next : 0;
      this.app.engine.previewDrum(laneId, track.drumKit);
      this.render();
    });
    grid.addEventListener('pointerover', (e) => {
      if (this.painting == null) return;
      const cell = e.target.closest('.dcell');
      if (!cell) return;
      const laneId = cell.dataset.lane;
      const idx = parseInt(cell.dataset.step, 10) || 0;
      if ((clip.steps[laneId][idx] || 0) !== this.painting) {
        st.setStep(track.id, clip.id, laneId, idx, this.painting, { undo: false });
        this.render();
      }
    });
    window.addEventListener('pointerup', () => { this.painting = null; }, { once: true });

    this.host.append(grid);

    const foot = el('div', { class: 'clip-foot' },
      el('span', { class: 'dim', text: 'Click: toggle · Shift+click: full velocity · drag paints · swing: ' + Math.round(this.app.state.project.swing * 100) + '%' })
    );
    this.host.append(foot);
  }

  renderSample(track, clip) {
    const st = this.app.state;
    const isSfx = clip.sample.startsWith('sfx:');
    const head = el('div', { class: 'clip-head' },
      el('strong', { text: clip.name || 'Sample Clip' }),
      el('span', { class: 'dim', text: `${isSfx ? 'SFX' : 'Ambient'}: ${isSfx ? clip.sample.slice(4) : clip.sample}` })
    );
    this.host.append(head);

    const body = el('div', { class: 'sample-props' });
    const gain = el('input', { type: 'range', min: '0', max: '1.5', step: '0.01', value: String(clip.gain) });
    gain.addEventListener('input', () => st.updateClip(track.id, clip.id, { gain: parseFloat(gain.value) }, { undo: false }));
    gain.addEventListener('change', () => st.pushUndo());
    body.append(el('label', {}, 'Gain ', gain));

    const len = el('input', { type: 'number', min: '1', max: '64', value: String(clip.length) });
    len.addEventListener('change', () => st.updateClip(track.id, clip.id, { length: Math.max(1, parseInt(len.value, 10) || 1) }));
    body.append(el('label', {}, 'Length (bars) ', len));

    const previewBtn = el('button', { class: 'btn', text: '▶ Preview' });
    previewBtn.addEventListener('click', () => {
      const e = this.app.engine;
      e.resume();
      if (!e.ctx) { toast('Enable audio first', true); return; }
      if (isSfx) e.sfx(clip.sample.slice(4), e.ctx.currentTime + 0.05, clip.gain);
      else e.ambient(clip.sample, e.ctx.currentTime + 0.05, clip.length * 4 * (60 / this.app.state.project.tempo), clip.gain);
    });
    body.append(el('div', { class: 'form-row' }, loopToggle(st, track, clip), loopLenInput(st, track, clip), previewBtn));
    this.host.append(head, body);
  }

  renderSynthNote(track, clip) {
    this.host.append(
      el('div', { class: 'clip-head' }, el('strong', { text: clip.name || 'Clip' }),
        el('span', { class: 'dim', text: ' · synth clip — edit notes in the Piano Roll tab' })),
      el('div', { class: 'empty-hint', text: 'Switch to the Piano Roll tab to edit notes, or double-click the clip in the Arrangement.' })
    );
  }
}

function loopToggle(st, track, clip) {
  const btn = el('button', { class: 'btn' + (clip.loop ? ' primary' : ''), text: clip.loop ? '🔁 Looping' : '🔁 Loop' });
  btn.addEventListener('click', () => {
    st.updateClip(track.id, clip.id, { loop: !clip.loop });
  });
  return btn;
}

function loopLenInput(st, track, clip) {
  const input = el('input', { type: 'number', min: '0.25', step: '0.25', value: String(clip.loopLen || 4), title: 'Loop length (beats)' });
  input.addEventListener('change', () => {
    st.updateClip(track.id, clip.id, { loopLen: Math.max(0.25, parseFloat(input.value) || 4) });
  });
  return el('label', { class: 'dim' }, 'Loop len ', input);
}

function step16(cell) {
  return parseInt(cell.dataset.step, 10) || 0;
}
