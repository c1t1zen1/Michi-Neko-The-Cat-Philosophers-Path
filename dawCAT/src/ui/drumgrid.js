/* dawCAT — clip editor: drum step grid + live 42-rhythm groove switcher / sample clip props */
import { el, toast, showModal, closeModal } from './common.js';
import { DRUM_LANES, defaultSynthPreset, uid } from '../state.js';
import { DRUM_RHYTHMS, RHYTHM_CATEGORIES, getRhythm, humanizeSteps, rotateSteps, addDrumFill } from '../engine/rhythms.js';
import { DRUM_KIT_LIST } from '../engine/drums.js';
import { parseStepGrid, parseChordOrRoman, voiceLead, arpeggiate } from '../agent/theory.js';

function fullStepsFromGrid(grid) {
  const parsed = parseStepGrid(grid);
  const steps = {};
  for (const lane of DRUM_LANES) {
    steps[lane.id] = parsed[lane.id] ? parsed[lane.id].slice(0, 16) : new Array(16).fill(0);
  }
  return steps;
}

export class DrumGrid {
  constructor(app) {
    this.app = app;
    this.host = document.getElementById('clip-editor');
    this.curBar = 0;
    this.painting = null;
    this.categoryFilter = 'all';
    this.currentRhythmId = 'lofi';
    this.syncKitAndSwing = true;
    this._lastStep = -1;

    this.app.state.addEventListener('project', () => this.render());
    this.app.state.addEventListener('selection', () => this.render());
    this.render();
    this.startStepPlayheadLoop();
  }

  startStepPlayheadLoop() {
    const tick = () => {
      if (this.app.activeTab === 'clip' && this.app.transport.playing) {
        const beat = Math.max(0, this.app.transport.position);
        const step = Math.floor((beat % 4) * 4) % 16;
        if (step !== this._lastStep) {
          this._lastStep = step;
          this.highlightPlayheadStep(step);
        }
      } else if (this._lastStep !== -1) {
        this._lastStep = -1;
        this.highlightPlayheadStep(-1);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  highlightPlayheadStep(step) {
    if (!this.host) return;
    this.host.querySelectorAll('.dcell-head.playing, .dcell.playing').forEach((n) => n.classList.remove('playing'));
    if (step < 0) return;
    this.host.querySelectorAll(`[data-step="${step}"]`).forEach((n) => n.classList.add('playing'));
  }

  /* Finds or creates the primary drum track & clip in the current song so switching
     rhythms works from anywhere, even if a synth track was selected. */
  ensureSongDrumClip() {
    const st = this.app.state;
    let track = st.selectedTrack();
    if (!track || track.kind !== 'drum') {
      track = st.project.tracks.find((t) => t.kind === 'drum');
    }
    if (!track) {
      track = st.addTrack({ name: 'Drums', kind: 'drum', drumKit: 'soft', color: '#3b82f6' });
    }
    let clip = st.selectedClip();
    if (!clip || st.trackOfClip(clip.id)?.id !== track.id) {
      clip = track.clips[0] || st.addClip(track.id, { name: 'Beat A', start: 0, length: 8, loop: true, loopLen: 4 });
    }
    return { track, clip };
  }

  /* Switches the current song's drum clip to a pre-programmed rhythm immediately. */
  applyRhythmToCurrentSong(rhythmOrId, { syncTempo = false } = {}) {
    const r = typeof rhythmOrId === 'string' ? getRhythm(rhythmOrId) : rhythmOrId;
    if (!r) return;
    this.currentRhythmId = r.id;
    const st = this.app.state;
    const { track, clip } = this.ensureSongDrumClip();
    const steps = fullStepsFromGrid(r.grid);
    st.applyBatch(() => {
      st.updateClip(track.id, clip.id, { name: r.name, steps });
      if (this.syncKitAndSwing) {
        if (r.kit) st.updateTrack(track.id, { drumKit: r.kit });
        if (r.swing != null) st.project.swing = r.swing;
      }
      if (syncTempo && r.bpm) {
        this.app.transport.setTempo(r.bpm);
      }
    });
    st.select(track.id, clip.id);
    this.render();
    toast(`🥁 Rhythm → "${r.name}" (${r.kit} kit${syncTempo ? `, ${r.bpm} BPM` : ''})`);
  }

  /* Starts a brand-new song built around the chosen drum rhythm. */
  startNewSongWithRhythm(rhythmOrId) {
    const r = typeof rhythmOrId === 'string' ? getRhythm(rhythmOrId) : rhythmOrId;
    if (!r) return;
    this.currentRhythmId = r.id;
    const st = this.app.state;
    const p = st.project;
    st.applyBatch(() => {
      p.name = `${r.name} Session`;
      p.tempo = r.bpm || 110;
      p.swing = r.swing || 0;
      p.key = r.key || 'C';
      p.scale = r.scale || 'minor';
      p.tracks = [];

      const drums = st.addTrack({ name: `${r.name} Drums`, kind: 'drum', drumKit: r.kit || 'soft', color: '#3b82f6', volume: 0.85 });
      const dClip = st.addClip(drums.id, { name: r.name, start: 0, length: 8, loop: true, loopLen: 4, steps: fullStepsFromGrid(r.grid) });

      // Add a matching bassline and chord pad in the rhythm's key so the new song is immediately musical
      const bass = st.addTrack({ name: 'Groove Bass', kind: 'synth', preset: defaultSynthPreset('bass'), color: '#7c5ce6', volume: 0.75 });
      const chords = st.addTrack({ name: 'Warm Chords', kind: 'synth', preset: defaultSynthPreset('pad'), color: '#f59e0b', volume: 0.58, sends: { a: 0.28, b: 0.12 } });
      const pluck = st.addTrack({ name: 'Koto / Lead', kind: 'synth', preset: defaultSynthPreset('pluck'), color: '#ec4899', volume: 0.65 });

      const prog = ['i', 'VI', 'III', 'VII'];
      const voiced = voiceLead(prog.map((sym) => parseChordOrRoman(sym, p.key, p.scale, 3)));
      const chordNotes = [];
      const bassNotes = [];
      voiced.forEach((ch, idx) => {
        const beat0 = idx * 4;
        for (const n of arpeggiate(ch, { style: 'block', beats: 4, start: beat0, vel: 0.62 })) {
          chordNotes.push({ id: uid('n'), ...n });
        }
        const rootMidi = Math.max(30, Math.min(...ch) - 12);
        bassNotes.push(
          { id: uid('n'), midi: rootMidi, start: beat0, len: 1.5, vel: 0.88 },
          { id: uid('n'), midi: rootMidi, start: beat0 + 1.5, len: 0.5, vel: 0.68 },
          { id: uid('n'), midi: rootMidi + 7, start: beat0 + 2, len: 1.0, vel: 0.78 },
          { id: uid('n'), midi: rootMidi, start: beat0 + 3, len: 0.75, vel: 0.8 }
        );
      });
      st.addClip(bass.id, { name: 'Bass Groove', start: 0, length: 8, loop: true, loopLen: 16, notes: bassNotes });
      st.addClip(chords.id, { name: 'Pad Progression', start: 0, length: 8, loop: true, loopLen: 16, notes: chordNotes });
      st.addClip(pluck.id, { name: 'Melody Sketch', start: 0, length: 8, loop: true, loopLen: 8, notes: [] });

      st.select(drums.id, dClip.id);
    });
    this.app.transport.setTempo(r.bpm || 110);
    this.app.switchTab('clip');
    this.render();
    toast(`🆕 Started new song with "${r.name}" (${r.bpm} BPM, ${r.key} ${r.scale})`);
  }

  cycleRhythm(delta) {
    const list = this.filteredRhythms();
    if (!list.length) return;
    const idx = Math.max(0, list.findIndex((r) => r.id === this.currentRhythmId));
    const next = list[(idx + delta + list.length) % list.length];
    this.applyRhythmToCurrentSong(next);
  }

  filteredRhythms() {
    if (this.categoryFilter === 'all') return DRUM_RHYTHMS;
    return DRUM_RHYTHMS.filter((r) => r.category === this.categoryFilter);
  }

  openRhythmBrowserModal() {
    const wrap = el('div', { class: 'rb-modal' });
    let activeCat = 'all';

    const filterRow = el('div', { class: 'rb-cats' });
    const gridWrap = el('div', { class: 'rb-grid' });

    const renderCards = () => {
      filterRow.innerHTML = '';
      for (const cat of ['all', ...RHYTHM_CATEGORIES]) {
        const count = cat === 'all' ? DRUM_RHYTHMS.length : DRUM_RHYTHMS.filter((r) => r.category === cat).length;
        const b = el('button', {
          class: 'mini-btn' + (activeCat === cat ? ' active' : ''),
          text: `${cat === 'all' ? 'All Rhythms' : cat} (${count})`,
          onclick: () => { activeCat = cat; renderCards(); }
        });
        filterRow.append(b);
      }

      gridWrap.innerHTML = '';
      const list = activeCat === 'all' ? DRUM_RHYTHMS : DRUM_RHYTHMS.filter((r) => r.category === activeCat);
      for (const r of list) {
        const isCur = r.id === this.currentRhythmId;
        const mini = el('div', { class: 'rb-mini-steps' });
        for (const lane of ['kick', 'snare', 'hatC', 'tom']) {
          const pat = (r.grid[lane] || '................').padEnd(16, '.');
          const row = el('div', { class: 'rb-mini-row' });
          for (let s = 0; s < 16; s++) {
            const ch = pat[s];
            row.append(el('span', { class: 'rb-dot' + (ch !== '.' ? (ch === 'x' ? ' hi' : ' on') : '') }));
          }
          mini.append(row);
        }

        const card = el('div', { class: 'rb-card' + (isCur ? ' active' : '') },
          el('div', { class: 'rb-card-top' },
            el('strong', { text: r.name }),
            el('span', { class: 'rb-badges', text: `${r.bpm} BPM · ${r.kit}` })
          ),
          el('div', { class: 'rb-desc', text: r.desc }),
          mini,
          el('div', { class: 'rb-card-btns' },
            el('button', {
              class: 'mini-btn primary',
              text: '🥁 Use in Current Song',
              onclick: () => {
                this.applyRhythmToCurrentSong(r);
                closeModal();
              }
            }),
            el('button', {
              class: 'mini-btn',
              text: '⏱ + Match Tempo',
              title: `Switch rhythm and set project tempo to ${r.bpm} BPM`,
              onclick: () => {
                this.applyRhythmToCurrentSong(r, { syncTempo: true });
                closeModal();
              }
            }),
            el('button', {
              class: 'mini-btn',
              text: '🆕 Start New Song',
              title: 'Create a new song project built around this drum rhythm',
              onclick: () => {
                this.startNewSongWithRhythm(r);
                closeModal();
              }
            })
          )
        );
        gridWrap.append(card);
      }
    };

    renderCards();
    wrap.append(filterRow, gridWrap);
    showModal({
      title: `🥁 Drum Rhythm Explorer (${DRUM_RHYTHMS.length} Pre-Programmed Rhythms)`,
      wide: true,
      body: wrap,
      buttons: [{ label: 'Close' }]
    });
  }

  render() {
    this.host.innerHTML = '';
    const st = this.app.state;
    let track = st.selectedTrack();
    let clip = st.selectedClip();

    // If no clip is selected, check if there is a drum track clip in the project so the user
    // can immediately see & switch drum rhythms when opening the Clip tab!
    if (!track || !clip) {
      const drumTrack = st.project.tracks.find((t) => t.kind === 'drum' && t.clips.length);
      if (drumTrack) {
        track = drumTrack;
        clip = drumTrack.clips[0];
      } else {
        this.host.append(
          el('div', { class: 'empty-hint' },
            el('div', { text: 'No clip selected — pick a Drum Rhythm below to add drums to your song!' }),
            el('div', { class: 'form-row', style: 'justify-content:center;margin-top:10px' },
              el('button', { class: 'btn primary', text: '🥁 Browse 42 Drum Rhythms…', onclick: () => this.openRhythmBrowserModal() }),
              el('button', { class: 'btn', text: '🌊 Open Wave Lab (Audio Manipulator)', onclick: () => this.app.switchTab('wavelab') })
            )
          )
        );
        return;
      }
    }

    if (track.kind === 'drum' && clip.steps) this.renderDrums(track, clip);
    else if (clip.audio && clip.audio.assetId) this.renderAudioClip(track, clip);
    else if (clip.sample) this.renderSample(track, clip);
    else this.renderSynthNote(track, clip);
  }

  renderDrums(track, clip) {
    const st = this.app.state;

    // 1. Top Rhythm Switcher & Groove Bar
    const catSelect = el('select', { title: 'Filter rhythms by style/genre' },
      el('option', { value: 'all', text: `All Genres (${DRUM_RHYTHMS.length})` }),
      ...RHYTHM_CATEGORIES.map((c) => el('option', { value: c, text: c }))
    );
    catSelect.value = this.categoryFilter;
    catSelect.addEventListener('change', () => {
      this.categoryFilter = catSelect.value;
      this.render();
    });

    const rhythms = this.filteredRhythms();
    const rhythmSelect = el('select', { class: 'dg-rhythm-select', title: 'Switch the current drum clip to any pre-programmed rhythm' });
    for (const r of rhythms) {
      rhythmSelect.append(el('option', {
        value: r.id,
        text: `${r.name} (${r.bpm} BPM · ${r.kit})`
      }));
    }
    if (rhythms.some((r) => r.id === this.currentRhythmId)) {
      rhythmSelect.value = this.currentRhythmId;
    }
    rhythmSelect.addEventListener('change', () => {
      if (rhythmSelect.value) this.applyRhythmToCurrentSong(rhythmSelect.value);
    });

    const syncCheck = el('input', { type: 'checkbox' });
    syncCheck.checked = this.syncKitAndSwing;
    syncCheck.addEventListener('change', () => { this.syncKitAndSwing = syncCheck.checked; });

    const rhythmBar = el('div', { class: 'dg-rhythm-bar' },
      el('span', { class: 'dg-rhythm-label', text: '🥁 Rhythm:' }),
      catSelect,
      el('button', { class: 'mini-btn', text: '◀', title: 'Previous rhythm', onclick: () => this.cycleRhythm(-1) }),
      rhythmSelect,
      el('button', { class: 'mini-btn', text: '▶', title: 'Next rhythm', onclick: () => this.cycleRhythm(1) }),
      el('label', { class: 'sfx-toggle', title: 'Automatically set the drum kit and groove swing recommended for the rhythm' }, syncCheck, 'Sync Kit/Swing'),
      el('button', {
        class: 'mini-btn',
        text: '⏱ Match BPM',
        title: 'Set song tempo to match the selected rhythm\'s BPM',
        onclick: () => this.applyRhythmToCurrentSong(rhythmSelect.value || this.currentRhythmId, { syncTempo: true })
      }),
      el('button', {
        class: 'mini-btn primary',
        text: '📚 Browse All 42 Rhythms…',
        title: 'Open visual rhythm browser with step previews and categories',
        onclick: () => this.openRhythmBrowserModal()
      }),
      el('button', {
        class: 'mini-btn',
        text: '🆕 Start New Song',
        title: 'Start a fresh song with this drum rhythm, bassline and chords',
        onclick: () => this.startNewSongWithRhythm(rhythmSelect.value || this.currentRhythmId)
      })
    );
    this.host.append(rhythmBar);

    // 2. Clip Header & Kit / Swing / Pattern Tools
    const kitSelect = el('select', { title: 'Drum Kit voice character' },
      ...DRUM_KIT_LIST.map((k) => el('option', { value: k.id, text: k.name, title: k.desc }))
    );
    kitSelect.value = track.drumKit || 'soft';
    kitSelect.addEventListener('change', () => {
      st.updateTrack(track.id, { drumKit: kitSelect.value });
      this.app.engine.previewDrum('kick', kitSelect.value);
    });

    const gain = el('input', { type: 'range', min: '0', max: '1.5', step: '0.01', value: String(clip.gain), title: 'Clip gain' });
    gain.addEventListener('input', () => st.updateClip(track.id, clip.id, { gain: parseFloat(gain.value) }, { undo: false }));
    gain.addEventListener('change', () => st.pushUndo());

    const swingSlider = el('input', { type: 'range', min: '0', max: '0.45', step: '0.01', value: String(st.project.swing || 0), title: 'Project groove swing' });
    swingSlider.addEventListener('input', () => {
      st.project.swing = parseFloat(swingSlider.value) || 0;
      st.emit('project');
    });

    const loopBtn = el('button', { class: 'mini-btn' + (clip.loop ? ' active' : ''), text: clip.loop ? '🔁 Looping' : '🔁 Loop' });
    loopBtn.addEventListener('click', () => st.updateClip(track.id, clip.id, { loop: !clip.loop }));

    const head = el('div', { class: 'clip-head' },
      el('strong', { text: clip.name || 'Drum Clip' }),
      el('label', { class: 'dim' }, 'Kit ', kitSelect),
      el('label', { class: 'dim' }, 'Gain ', gain),
      el('label', { class: 'dim' }, 'Swing ', swingSlider),
      loopBtn,
      el('span', { class: 'wl-sep' }),
      el('button', {
        class: 'mini-btn',
        text: '🎲 Humanize',
        title: 'Subtly vary step velocities for a natural human feel',
        onclick: () => { st.updateClip(track.id, clip.id, { steps: humanizeSteps(clip.steps) }); toast('Humanized drum velocities'); }
      }),
      el('button', {
        class: 'mini-btn',
        text: '🥁 + Fill',
        title: 'Add a tom/snare turnaround fill on beat 4',
        onclick: () => { st.updateClip(track.id, clip.id, { steps: addDrumFill(clip.steps) }); toast('Added beat-4 drum fill'); }
      }),
      el('button', {
        class: 'mini-btn',
        text: '◀ Shift',
        title: 'Rotate all steps 1 sixteenth-note left',
        onclick: () => st.updateClip(track.id, clip.id, { steps: rotateSteps(clip.steps, -1) })
      }),
      el('button', {
        class: 'mini-btn',
        text: 'Shift ▶',
        title: 'Rotate all steps 1 sixteenth-note right',
        onclick: () => st.updateClip(track.id, clip.id, { steps: rotateSteps(clip.steps, 1) })
      }),
      el('button', {
        class: 'mini-btn x',
        text: '🧹 Clear All',
        title: 'Clear all drum steps in this clip',
        onclick: () => {
          const empty = {};
          for (const l of DRUM_LANES) empty[l.id] = new Array(16).fill(0);
          st.updateClip(track.id, clip.id, { steps: empty });
        }
      })
    );
    this.host.append(head);

    // 3. 8-Lane × 16-Step Sequencer Grid
    const grid = el('div', { class: 'dgrid' });
    grid.style.gridTemplateColumns = `118px repeat(16, minmax(18px, 1fr))`;

    grid.append(el('div', { class: 'dcell-head dim', text: 'LANE / STEP' }));
    for (let s = 0; s < 16; s++) {
      grid.append(el('div', {
        class: 'dcell-head' + (s % 4 === 0 ? ' beat' : '') + (s === this._lastStep ? ' playing' : ''),
        'data-step': String(s),
        text: String(s + 1)
      }));
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
          class: 'dcell' + (v > 0 ? ' on' : '') + (v >= 1 ? ' full' : '') + (s % 4 === 0 ? ' beat' : '') + (s === this._lastStep ? ' playing' : ''),
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

    const curRhythm = getRhythm(this.currentRhythmId);
    const foot = el('div', { class: 'clip-foot' },
      el('span', { class: 'dim', text: `Click: toggle · Shift+click: accent · Alt+click: ghost · Drag paints · Swing: ${Math.round((st.project.swing || 0) * 100)}%${curRhythm ? ` · Active Groove: ${curRhythm.name} (${curRhythm.desc})` : ''}` })
    );
    this.host.append(foot);
  }

  renderAudioClip(track, clip) {
    const a = clip.audio || {};
    const head = el('div', { class: 'clip-head' },
      el('strong', { text: clip.name || 'Audio Clip' }),
      el('span', { class: 'dim', text: `${track.name} · Audio Sample (${a.assetId})` }),
      el('button', {
        class: 'btn primary',
        text: '🌊 Edit Sound Physics in Wave Lab',
        onclick: () => {
          if (this.app.waveLab) this.app.waveLab.bindToClip(track.id, clip.id);
          this.app.switchTab('wavelab');
        }
      })
    );
    const info = el('div', { class: 'hintbox' },
      el('div', { text: `Stretch: ${Math.round((a.stretch || 1) * 100)}% · Speed: ${Math.round((a.speed || 1) * 100)}% · Pitch: ${a.pitchSemis || 0} st · Reverse: ${a.reverse ? 'Yes' : 'No'} · Loop: ${a.loop ? 'On' : 'Off'}` })
    );
    this.host.append(head, info);
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
      el('div', { class: 'clip-head' },
        el('strong', { text: clip.name || 'Clip' }),
        el('span', { class: 'dim', text: ' · synth clip — edit notes in the Piano Roll tab' }),
        el('button', { class: 'btn', text: '🎹 Open Piano Roll', onclick: () => this.app.switchTab('pianoroll') }),
        el('button', {
          class: 'btn primary',
          text: '🥁 Switch to Song Drum Grid',
          onclick: () => {
            const { track: dt, clip: dc } = this.ensureSongDrumClip();
            this.app.state.select(dt.id, dc.id);
            this.render();
          }
        })
      ),
      el('div', { class: 'empty-hint', text: 'Switch to the Piano Roll tab to edit notes, or click "🥁 Switch to Song Drum Grid" above to browse and switch drum rhythms.' })
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
