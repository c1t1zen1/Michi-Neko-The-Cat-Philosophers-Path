/* dawCAT — device chain: list + editors (synth, EQ8, comp, delay, reverb, filter, chorus, utility) */
import { el, toast, makeKnob } from './common.js';
import { defaultSynthPreset } from '../state.js';
import { SYNTH_KINDS, OSC_TYPES } from '../engine/synth.js';

const DEVICE_NAMES = {
  eq8: 'EQ Eight', comp: 'Compressor', delay: 'Delay', reverb: 'Reverb',
  filter: 'Auto Filter', chorus: 'Chorus-Ensemble', utility: 'Utility'
};

export class Devices {
  constructor(app) {
    this.app = app;
    this.listEl = document.getElementById('device-list');
    this.editor = document.getElementById('device-editor');
    this.addSelect = document.getElementById('device-add-select');
    this.addSelect.addEventListener('change', () => this.onAdd());
    this.app.state.addEventListener('project', () => this.render());
    this.app.state.addEventListener('selection', () => this.render());
    this.render();
  }

  render() {
    const st = this.app.state;
    const t = st.selectedTrack();
    document.getElementById('dc-track-name').textContent = t ? `· ${t.name}` : '';
    this.listEl.innerHTML = '';
    this.editor.innerHTML = '';

    if (!t) {
      this.listEl.append(el('div', { class: 'empty-hint', text: 'Select a track to see its device chain.' }));
      return;
    }

    if (t.kind === 'synth') {
      const chip = el('div', { class: 'dev-chip' + (st.selection.deviceId === 'synth' ? ' selected' : '') },
        el('span', { text: `🎹 Analog (${(t.preset && t.preset.kind) || 'pluck'})` })
      );
      chip.addEventListener('click', () => { st.selection.deviceId = 'synth'; st.emit('selection'); });
      this.listEl.append(chip);
    }
    for (const d of t.devices) {
      const chip = el('div', { class: 'dev-chip' + (st.selection.deviceId === d.id ? ' selected' : '') + (d.on ? '' : ' off') },
        el('span', { text: DEVICE_NAMES[d.type] || d.type })
      );
      chip.addEventListener('click', () => { st.selection.deviceId = d.id; st.emit('selection'); });
      const power = el('button', { class: 'mini-btn' + (d.on ? ' active' : ''), text: d.on ? '⏻' : '○', title: 'Bypass' });
      power.addEventListener('click', (e) => { e.stopPropagation(); st.updateDevice(t.id, d.id, { on: !d.on }, { undo: false }); });
      const del = el('button', { class: 'mini-btn x', text: '×', title: 'Remove' });
      del.addEventListener('click', (e) => { e.stopPropagation(); st.removeDevice(t.id, d.id); });
      chip.append(power, del);
      this.listEl.append(chip);
    }

    const sel = st.selection.deviceId;
    if (t.kind === 'synth' && (sel === 'synth' || !t.devices.some((x) => x.id === sel))) {
      this.renderSynthEditor(t);
      return;
    }
    const dev = (t.devices || []).find((x) => x.id === sel);
    if (dev) this.renderDeviceEditor(t, dev);
    else this.editor.append(el('div', { class: 'empty-hint', text: 'Select a device to edit it.' }));
  }

  onAdd() {
    const st = this.app.state;
    const t = st.selectedTrack();
    const type = this.addSelect.value;
    this.addSelect.value = '';
    if (!t) { toast('Select a track first', true); return; }
    if (type === 'analog') {
      if (t.kind !== 'synth') { toast('Analog needs a synth track', true); return; }
      st.selection.deviceId = 'synth';
      st.emit('selection');
      return;
    }
    if (!type) return;
    st.addDevice(t.id, type);
  }

  /* ---------- synth (Analog) editor ---------- */

  renderSynthEditor(t) {
    const st = this.app.state;
    const p = t.preset || defaultSynthPreset('pluck');
    const setP = (patch) => {
      st.updateTrack(t.id, { preset: Object.assign({}, t.preset, patch) }, { undo: false });
    };

    const kindSel = el('select', {});
    for (const k of SYNTH_KINDS) kindSel.append(el('option', { value: k, text: k }));
    kindSel.value = p.kind || 'pluck';
    kindSel.addEventListener('change', () => {
      st.updateTrack(t.id, { preset: defaultSynthPreset(kindSel.value) });
      toast(`Preset: ${kindSel.value}`);
    });

    const oscSel = (key) => {
      const sel = el('select', {});
      for (const o of OSC_TYPES) sel.append(el('option', { value: o, text: o }));
      sel.value = p[key] || 'sine';
      sel.addEventListener('change', () => setP({ [key]: sel.value }));
      return sel;
    };

    const knobs = el('div', { class: 'knob-row' });
    const K = (label, key, min, max, step, fmt, def) => makeKnob({
      label, min, max, step, fmt, def,
      value: p[key] == null ? 0 : p[key],
      onChange: (v) => setP({ [key]: v })
    }).el;
    knobs.append(
      K('Detune', 'detune', 0, 30, 0.5, (v) => v.toFixed(0) + 'ct', 5),
      K('Attack', 'attack', 0.001, 3, 0.001, (v) => v.toFixed(2) + 's', 0.01),
      K('Decay', 'decay', 0.05, 4, 0.01, (v) => v.toFixed(2) + 's', 0.3),
      K('Sustain', 'sustain', 0, 1, 0.01, null, 0.5),
      K('Release', 'release', 0.02, 4, 0.01, (v) => v.toFixed(2) + 's', 0.3),
      K('Cutoff', 'cutoff', 80, 12000, 10, (v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0)) + 'Hz', 1200),
      K('Res', 'res', 0.1, 12, 0.1, null, 0.5),
      K('Level', 'gain', 0, 1, 0.01, null, 0.5)
    );

    this.editor.append(
      el('div', { class: 'dev-title' }, el('strong', { text: 'Analog' }), el('span', { class: 'dim', text: ` · ${t.name}` })),
      el('div', { class: 'form-row' },
        el('label', { class: 'dim' }, 'Preset ', kindSel),
        el('label', { class: 'dim' }, 'Osc 1 ', oscSel('osc1')),
        el('label', { class: 'dim' }, 'Osc 2 ', oscSel('osc2'))),
      knobs
    );
  }

  /* ---------- FX device editors ---------- */

  renderDeviceEditor(t, d) {
    const st = this.app.state;
    const set = (key, value) => st.setDeviceParam(t.id, d.id, key, value);
    const title = el('div', { class: 'dev-title' },
      el('strong', { text: DEVICE_NAMES[d.type] || d.type }),
      el('span', { class: 'dim', text: ` · ${t.name}` })
    );

    if (d.type === 'eq8') {
      this.editor.append(title, this.eq8Editor(t, d));
      return;
    }

    const knobs = el('div', { class: 'knob-row' });
    const K = (label, key, min, max, step, fmt, def) => makeKnob({
      label, min, max, step, fmt, def,
      value: d.params[key],
      onChange: (v) => set(key, v)
    }).el;

    if (d.type === 'comp') {
      knobs.append(
        K('Thresh', 'threshold', -60, 0, 0.5, (v) => v.toFixed(0) + 'dB', -20),
        K('Ratio', 'ratio', 1, 20, 0.1, (v) => v.toFixed(1) + ':1', 3),
        K('Attack', 'attack', 0.001, 0.5, 0.001, (v) => (v * 1000).toFixed(0) + 'ms', 0.01),
        K('Release', 'release', 0.01, 1, 0.01, (v) => v.toFixed(2) + 's', 0.25),
        K('Knee', 'knee', 0, 40, 0.5, (v) => v.toFixed(0) + 'dB', 12),
        K('Makeup', 'makeup', 0.5, 3, 0.01, (v) => v.toFixed(2) + 'x', 1.2)
      );
    } else if (d.type === 'delay') {
      const syncSel = el('select', {});
      for (const s of ['1/16', '1/8', '1/8D', '1/4', '1/4D', '1/2']) {
        syncSel.append(el('option', { value: s, text: s }));
      }
      syncSel.value = d.params.sync || '1/8';
      syncSel.addEventListener('change', () => set('sync', syncSel.value));
      knobs.append(
        K('Feedback', 'feedback', 0, 0.9, 0.01, null, 0.34),
        K('Dry/Wet', 'wet', 0, 1, 0.01, null, 0.3)
      );
      this.editor.append(title, el('div', { class: 'form-row' }, el('label', { class: 'dim' }, 'Sync ', syncSel)), knobs);
      return;
    } else if (d.type === 'reverb') {
      knobs.append(
        K('Size', 'size', 0.3, 6, 0.1, (v) => v.toFixed(1) + 's', 2.2),
        K('Decay', 'decay', 0.5, 6, 0.1, null, 2.4),
        K('Dry/Wet', 'wet', 0, 1, 0.01, null, 0.28)
      );
    } else if (d.type === 'filter') {
      const typeSel = el('select', {});
      for (const ft of ['lowpass', 'highpass', 'bandpass']) typeSel.append(el('option', { value: ft, text: ft }));
      typeSel.value = d.params.type || 'lowpass';
      typeSel.addEventListener('change', () => set('type', typeSel.value));
      knobs.append(
        K('Freq', 'freq', 40, 12000, 10, (v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0)) + 'Hz', 1200),
        K('Res', 'q', 0.1, 12, 0.05, null, 0.8)
      );
      this.editor.append(title, el('div', { class: 'form-row' }, el('label', { class: 'dim' }, 'Type ', typeSel)), knobs);
      return;
    } else if (d.type === 'chorus') {
      knobs.append(
        K('Rate', 'rate', 0.05, 6, 0.01, (v) => v.toFixed(2) + 'Hz', 0.6),
        K('Depth', 'depth', 0, 1, 0.01, null, 0.4),
        K('Mix', 'mix', 0, 1, 0.01, null, 0.35)
      );
    } else if (d.type === 'utility') {
      knobs.append(K('Gain', 'gain', 0, 2, 0.01, null, 1));
    }
    this.editor.append(title, knobs);
  }

  /* ---------- EQ Eight ---------- */

  eq8Editor(t, d) {
    const st = this.app.state;
    const wrap = el('div', { class: 'eq8' });
    const canvas = el('canvas', { class: 'eq-canvas', width: '560', height: '150' });

    const bandBtns = el('div', { class: 'row-btns' });
    d.params.bands.forEach((b, i) => {
      const bb = el('button', {
        class: 'mini-btn band' + (st.selection.eqBand === i ? ' active' : ''),
        text: String(i + 1),
        title: `${b.type} ${Math.round(b.freq)}Hz`
      });
      bb.addEventListener('click', () => { st.selection.eqBand = i; st.emit('selection'); });
      bandBtns.append(bb);
    });

    const setBand = (key, v) => {
      const b = d.params.bands[st.selection.eqBand];
      if (!b) return;
      b[key] = v;
      st.emit('chain', t.id);
      draw();
    };
    const setParam = (key, value) => {
      d.params[key] = value;
      st.emit('chain', t.id);
      draw();
    };

    const band = d.params.bands[st.selection.eqBand] || d.params.bands[1];
    const freq = makeKnob({ label: 'Freq', min: 20, max: 20000, value: band.freq, step: 1, fmt: (v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0)) + 'Hz', onChange: (v) => setBand('freq', v) }).el;
    const gain = makeKnob({ label: 'Gain', min: -15, max: 15, value: band.gain, step: 0.1, fmt: (v) => v.toFixed(1) + 'dB', onChange: (v) => setBand('gain', v) }).el;
    const q = makeKnob({ label: 'Q', min: 0.1, max: 10, value: band.q, step: 0.05, onChange: (v) => setBand('q', v) }).el;

    const typeSel = el('select', {});
    for (const bt of ['lowshelf', 'peaking', 'highshelf', 'lowpass', 'highpass']) {
      typeSel.append(el('option', { value: bt, text: bt }));
    }
    typeSel.value = band.type;
    typeSel.addEventListener('change', () => setBand('type', typeSel.value));

    const hp = el('input', { type: 'checkbox' });
    hp.checked = !!d.params.hpOn;
    hp.addEventListener('change', () => { d.params.hpOn = hp.checked; st.emit('chain', t.id); draw(); });
    const hpFreq = makeKnob({
      label: 'HP Freq', min: 20, max: 500, value: d.params.hpFreq, step: 1,
      fmt: (v) => v.toFixed(0) + 'Hz',
      onChange: (v) => { d.params.hpFreq = v; st.emit('chain', t.id); draw(); }
    }).el;

    function draw() { drawEqCurve(canvas, d.params, st.selection.eqBand); }
    draw();

    wrap.append(
      canvas,
      bandBtns,
      el('div', { class: 'knob-row' }, freq, gain, q, el('div', { class: 'knob' }, el('div', { class: 'knob-label', text: 'Shape' }), typeSel)),
      el('div', { class: 'form-row' }, el('label', { class: 'dim' }, 'HP filter ', hp), hpFreq)
    );
    return wrap;
  }
}

/* ---------------- EQ curve drawing ---------------- */

function drawEqCurve(canvas, params, selBand) {
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  g.fillStyle = '#0c111e';
  g.fillRect(0, 0, W, H);

  const fMin = 20, fMax = 20000;
  const logMin = Math.log2(fMin), logMax = Math.log2(fMax);
  const xOf = (f) => ((Math.log2(f) - Math.log2(fMin)) / Math.log2(fMax / fMin)) * W;
  const fOf = (x) => Math.pow(2, (x / W) * Math.log2(fMax / fMin) + Math.log2(fMin));

  g.strokeStyle = '#1c2438';
  for (const f of [50, 100, 200, 500, 1000, 2000, 5000, 10000]) {
    const x = xOf(f);
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
    g.fillStyle = '#44557a';
    g.font = '8px system-ui';
    g.fillText(f >= 1000 ? (f / 1000) + 'k' : String(f), x + 2, 10);
  }
  g.strokeStyle = '#232c44';
  g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();

  const widthOf = (q) => Math.max(0.15, 1.2 / Math.max(0.1, q));
  const yOf = (db) => H / 2 - (db / 18) * (H / 2 - 8);

  g.strokeStyle = '#5aa2ff';
  g.lineWidth = 2;
  g.beginPath();
  for (let px = 0; px <= W; px += 2) {
    const f = fOf(px);
    let db = 0;
    for (const b of params.bands) {
      const oct = Math.log2(f / b.freq);
      if (b.type === 'peaking') {
        const w = widthOf(b.q);
        db += b.gain * Math.exp(-(oct * oct) / (2 * w * w));
      } else if (b.type === 'lowshelf') {
        const k = Math.min(1, Math.max(0, (b.freq - f) / (b.freq * 0.7)));
        db += b.gain * k;
      } else if (b.type === 'highshelf') {
        const k = Math.min(1, Math.max(0, (f - b.freq) / (b.freq * 0.5)));
        db += b.gain * k;
      } else if (b.type === 'lowpass') {
        db -= Math.min(24, Math.max(0, oct) * 12);
      } else if (b.type === 'highpass') {
        db -= Math.min(24, Math.max(0, -oct) * 12);
      }
    }
    const y = yOf(Math.max(-15, Math.min(15, db)));
    if (px === 0) g.moveTo(px, y);
    else g.lineTo(px, y);
  }
  g.stroke();
  g.lineWidth = 1;

  // band handles
  params.bands.forEach((b, i) => {
    const x = xOf(b.freq);
    const y = yOf(Math.max(-15, Math.min(15, b.gain)));
    g.fillStyle = i === selBand ? '#ffffff' : '#5aa2ff';
    g.beginPath();
    g.arc(x, y, i === selBand ? 5 : 3.5, 0, Math.PI * 2);
    g.fill();
  });
}
