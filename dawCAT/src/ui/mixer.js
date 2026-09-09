/* dawCAT — mixer: channel strips with faders, pan, sends, meters */
import { el, fmtDb } from './common.js';

export class Mixer {
  constructor(app) {
    this.app = app;
    this.host = document.getElementById('mixer');
    this.app.state.addEventListener('project', () => this.render());
    this.app.state.addEventListener('selection', () => this.render());
    this.render();
    this.rafMeters();
  }

  render() {
    this.host.innerHTML = '';
    for (const t of this.app.state.project.tracks) {
      this.host.append(this.strip(t));
    }
    this.host.append(this.masterStrip());
  }

  strip(t) {
    const st = this.app.state;
    const selected = st.selection.trackId === t.id;
    const strip = el('div', { class: 'strip' + (selected ? ' selected' : '') });
    strip.append(el('div', { class: 'strip-color', style: `background:${t.color}` }));

    const name = el('div', { class: 'strip-name', text: t.name, title: 'Click to select' });
    name.addEventListener('click', () => st.select(t.id));
    strip.append(name);

    const db = el('div', { class: 'db-label dim', text: fmtDb(t.volume) });
    const meter = el('div', { class: 'meter-v', 'data-track': t.id }, el('div', { class: 'meter-v-fill' }));
    const fader = makeFader(t.volume, (v) => {
      st.updateTrack(t.id, { volume: v }, { undo: false });
      db.textContent = fmtDb(v);
    });
    strip.append(el('div', { class: 'fader-row' }, fader, meter, db));

    const pan = el('input', { type: 'range', min: '-1', max: '1', step: '0.01', value: String(t.pan || 0), title: 'Pan' });
    pan.addEventListener('input', () => st.updateTrack(t.id, { pan: parseFloat(pan.value) }, { undo: false }));
    pan.addEventListener('change', () => st.pushUndo());
    strip.append(el('div', { class: 'pan-row' }, el('span', { class: 'dim', text: 'L' }), pan, el('span', { class: 'dim', text: 'R' })));

    const sendA = el('input', { type: 'range', min: '0', max: '1', step: '0.01', value: String(t.sends ? t.sends.a : 0), title: 'Send A · reverb' });
    sendA.addEventListener('input', () => {
      st.updateTrack(t.id, { sends: { a: parseFloat(sendA.value), b: t.sends ? t.sends.b : 0 } }, { undo: false });
    });
    sendA.addEventListener('change', () => st.pushUndo());
    const sendB = el('input', { type: 'range', min: '0', max: '1', step: '0.01', value: String(t.sends ? t.sends.b : 0), title: 'Send B · delay' });
    sendB.addEventListener('input', () => {
      st.updateTrack(t.id, { sends: { a: t.sends ? t.sends.a : 0, b: parseFloat(sendB.value) } }, { undo: false });
    });
    sendB.addEventListener('change', () => st.pushUndo());
    strip.append(el('label', { class: 'send-row dim' }, 'A', sendA));
    strip.append(el('label', { class: 'send-row dim' }, 'B', sendB));

    const btns = el('div', { class: 'strip-btns' });
    const mBtn = el('button', { class: 'mini-btn' + (t.mute ? ' active mute' : ''), text: 'M' });
    mBtn.addEventListener('click', () => st.updateTrack(t.id, { mute: !t.mute }));
    const sBtn = el('button', { class: 'mini-btn' + (t.solo ? ' active solo' : ''), text: 'S' });
    sBtn.addEventListener('click', () => st.updateTrack(t.id, { solo: !t.solo }));
    btns.append(mBtn, sBtn);
    strip.append(btns);
    strip.dataset.trackId = t.id;
    return strip;
  }

  masterStrip() {
    const st = this.app.state;
    const strip = el('div', { class: 'strip master' });
    strip.append(el('div', { class: 'strip-name', text: 'Master' }));
    const dbEl = el('div', { class: 'db-label dim', text: fmtDb(st.project.master.volume) });
    const meter = el('div', { class: 'meter-v' }, el('div', { class: 'meter-v-fill' }));
    const fader = makeFader(st.project.master.volume, (v) => {
      st.project.master.volume = v;
      if (this.app.engine.pack) {
        this.app.engine.pack.master.gain.setTargetAtTime(v, this.app.engine.ctx.currentTime, 0.02);
      }
      dbEl.textContent = fmtDb(v);
    });
    strip.append(el('div', { class: 'fader-row' }, fader, meter));
    strip.append(dbEl);
    return strip;
  }

  rafMeters() {
    const tick = () => {
      const view = document.getElementById('view-mix');
      const inspBody = document.getElementById('insp-body');
      const hosts = [];
      if (view && view.classList.contains('active')) hosts.push(this.host);
      if (inspBody && inspBody.querySelector('.strip')) hosts.push(inspBody);
      for (const host of hosts) {
        for (const t of this.app.state.project.tracks) {
          const meter = host.querySelector(`.meter-v[data-track="${t.id}"] .meter-v-fill`);
          if (meter) meter.style.height = Math.round(this.app.engine.trackLevel(t.id) * 100) + '%';
        }
        const master = host.querySelector('.master .meter-v-fill');
        if (master) master.style.height = Math.round(this.app.engine.masterLevel() * 100) + '%';
      }
      requestAnimationFrame(() => tick());
    };
    requestAnimationFrame(() => tick());
  }
}

function makeFader(value, onChange) {
  let val = value;
  const fill = el('div', { class: 'fader-fill' });
  const thumb = el('div', { class: 'fader-thumb' });
  const track = el('div', { class: 'fader' }, fill, thumb);

  function render() {
    const f = Math.min(1.2, Math.max(0, val)) / 1.2;
    fill.style.height = (f * 100) + '%';
    thumb.style.bottom = `calc(${f * 100}% - 7px)`;
  }

  track.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const rect = track.getBoundingClientRect();
    const set = (ev) => {
      const f = 1 - (ev.clientY - rect.top) / rect.height;
      val = Math.min(1.2, Math.max(0, f * 1.2));
      render();
      onChange(val);
    };
    set(e);
    const move = (ev) => set(ev);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });

  render();
  return track;
}
