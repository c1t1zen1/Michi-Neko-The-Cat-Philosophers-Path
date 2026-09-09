/* dawCAT — inspector: track settings / clip properties */
import { el, toast, fmtDb } from './common.js';
import { TRACK_COLORS } from '../state.js';

export class Inspector {
  constructor(app) {
    this.app = app;
    this.body = document.getElementById('insp-body');
    this.app.state.addEventListener('project', () => this.render());
    this.app.state.addEventListener('selection', () => this.render());
    this.render();
  }

  render() {
    this.body.innerHTML = '';
    const st = this.app.state;
    const track = st.selectedTrack();
    const clip = st.selectedClip();

    if (track) this.trackSection(track);
    if (clip) this.clipSection(track, clip);
    if (!track && !clip) {
      this.body.append(el('div', { class: 'empty-hint', text: 'Select a track or clip to edit its settings.' }));
    }
  }

  section(title, ...children) {
    return el('div', { class: 'insp-section' }, el('div', { class: 'sec-title', text: title }), ...children);
  }

  trackSection(t) {
    const st = this.app.state;

    // name
    const nameInput = el('input', { type: 'text', value: t.name });
    nameInput.addEventListener('change', () => {
      if (nameInput.value.trim()) st.updateTrack(t.id, { name: nameInput.value.trim() });
    });
    const nameRow = el('div', { class: 'form-row' }, nameInput);

    // color swatches
    const colors = el('div', { class: 'swatches' });
    for (const c of TRACK_COLORS) {
      const sw = el('button', { class: 'swatch' + (t.color === c ? ' active' : ''), style: `background:${c}` });
      sw.addEventListener('click', () => st.updateTrack(t.id, { color: c }));
      colors.append(sw);
    }

    // M / S / arm
    const btns = el('div', { class: 'row-btns' });
    const mk = (label, key, cls) => {
      const b = el('button', { class: 'mini-btn' + (t[key] ? ' active ' + cls : ''), text: label });
      b.addEventListener('click', () => st.updateTrack(t.id, { [key]: !t[key] }));
      return b;
    };
    btns.append(mk('Mute', 'mute', 'mute'), mk('Solo', 'solo', 'solo'), mk('Arm', 'arm', 'arm'));

    // volume / pan / sends
    const vol = el('input', { type: 'range', min: '0', max: '1.2', step: '0.01', value: String(t.volume) });
    vol.addEventListener('input', () => st.updateTrack(t.id, { volume: parseFloat(vol.value) }, { undo: false }));
    vol.addEventListener('change', () => st.pushUndo());
    const pan = el('input', { type: 'range', min: '-1', max: '1', step: '0.01', value: String(t.pan || 0) });
    pan.addEventListener('input', () => st.updateTrack(t.id, { pan: parseFloat(pan.value) }, { undo: false }));
    pan.addEventListener('change', () => st.pushUndo());
    const sendA = el('input', { type: 'range', min: '0', max: '1', step: '0.01', value: String(t.sends ? t.sends.a : 0) });
    sendA.addEventListener('input', () => st.updateTrack(t.id, { sends: { a: parseFloat(sendA.value), b: t.sends ? t.sends.b : 0 } }, { undo: false }));
    const sendB = el('input', { type: 'range', min: '0', max: '1', step: '0.01', value: String(t.sends ? t.sends.b : 0) });
    sendB.addEventListener('input', () => st.updateTrack(t.id, { sends: { a: t.sends ? t.sends.a : 0, b: parseFloat(sendB.value) } }, { undo: false }));

    // drum kit selector for drum tracks
    let kitRow = null;
    if (t.kind === 'drum') {
      const kitSel = el('select', {});
      for (const k of ['soft', 'punch', 'lofi']) {
        kitSel.append(el('option', { value: k, text: k }));
      }
      kitSel.value = t.drumKit || 'soft';
      kitSel.addEventListener('change', () => st.updateTrack(t.id, { drumKit: kitSel.value }));
      kitRow = el('label', { class: 'form-row dim' }, 'Drum kit ', kitSel);
    }

    this.body.append(
      this.section('Track',
        el('label', { class: 'dim' }, 'Name ', nameInput),
        colors,
        btns,
        el('label', { class: 'dim' }, 'Volume ', vol),
        el('label', { class: 'dim' }, 'Pan ', pan),
        el('label', { class: 'dim' }, 'Send A · reverb ', sendA),
        el('label', { class: 'dim' }, 'Send B · delay ', sendB),
        kitRow,
        el('button', {
          class: 'btn danger',
          text: '🗑 Delete Track',
          onclick: () => { if (confirm(`Delete track "${t.name}"?`)) st.removeTrack(t.id); }
        })
      )
    );
  }

  clipSection(track, clip) {
    const st = this.app.state;
    const name = el('input', { type: 'text', value: clip.name || '' });
    name.addEventListener('change', () => st.updateClip(track.id, clip.id, { name: name.value.trim() }));
    const start = el('input', { type: 'number', min: '0', step: '1', value: String(clip.start) });
    start.addEventListener('change', () => st.updateClip(track.id, clip.id, { start: Math.max(0, parseFloat(start.value) || 0) }));
    const len = el('input', { type: 'number', min: '0.25', step: clip.kind === 'drum' ? '1' : '0.25', value: String(clip.length) });
    len.addEventListener('change', () => st.updateClip(track.id, clip.id, { length: Math.max(0.25, parseFloat(len.value) || 1) }));
    const gain = el('input', { type: 'range', min: '0', max: '1.5', step: '0.01', value: String(clip.gain) });
    gain.addEventListener('input', () => st.updateClip(track.id, clip.id, { gain: parseFloat(gain.value) }, { undo: false }));
    gain.addEventListener('change', () => st.pushUndo());
    const loop = el('input', { type: 'checkbox' });
    loop.checked = !!clip.loop;
    loop.addEventListener('change', () => st.updateClip(track.id, clip.id, { loop: loop.checked }));
    const loopLen = el('input', { type: 'number', min: '0.25', step: '0.25', value: String(clip.loopLen || 4) });
    loopLen.addEventListener('change', () => st.updateClip(track.id, clip.id, { loopLen: Math.max(0.25, parseFloat(loopLen.value) || 4) }));

    this.body.append(
      this.section('Clip',
        el('label', { class: 'dim' }, 'Name ', name),
        el('label', { class: 'dim' }, 'Start (bar) ', start),
        el('label', { class: 'dim' }, 'Length (bars) ', len),
        el('label', { class: 'dim' }, 'Gain ', gain),
        el('label', { class: 'dim' }, 'Loop ', loop),
        el('label', { class: 'dim' }, 'Loop length (beats) ', loopLen),
        clip.sample ? el('div', { class: 'dim', text: `Sample: ${clip.sample}` }) : null,
        el('div', { class: 'form-row' },
          el('button', {
            class: 'btn', text: '⧉ Duplicate',
            onclick: () => st.duplicateClip(track.id, clip.id)
          }),
          el('button', {
            class: 'btn danger',
            text: '🗑 Delete Clip',
            onclick: () => st.removeClip(track.id, clip.id)
          })
        )
      )
    );
  }
}
