/* dawCAT — top bar: menus, transport, tempo, position, system meters */
import { el, toast, showModal, closeModal, download } from './common.js';

export function buildTopbar(app) {
  buildMenus(app);
  wireTransport(app);
  startMeters(app);
}

/* ---------------- menus ---------------- */

function buildMenus(app) {
  const host = document.getElementById('menus');
  const menus = [
    {
      name: 'File',
      entries: [
        { label: 'New Empty Project', onClick: () => app.newProject('empty') },
        { label: 'New Starter Sketch', onClick: () => app.newProject('starter') },
        'sep',
        { label: 'Open Project (JSON)…', onClick: () => app.openProjectDialog() },
        { label: 'Save Project (download)', onClick: () => app.saveProjectFile() },
        { label: 'Save to Browser', key: 'Ctrl+S', onClick: () => app.persistProject() },
        'sep',
        { label: 'Export WAV…', onClick: () => app.exportWav() },
        { label: 'Export Project JSON', onClick: () => app.exportProjectJSON() },
        'sep',
        { label: 'Export to Game…', onClick: () => app.exportToGameDialog() },
        'sep',
        { label: 'Rescan Game Cues', onClick: () => app.rescanCues() }
      ]
    },
    {
      name: 'Edit',
      entries: [
        { label: 'Undo', key: 'Ctrl+Z', onClick: () => app.state.undo() },
        { label: 'Redo', key: 'Ctrl+Shift+Z', onClick: () => app.state.redo() },
        'sep',
        { label: 'Duplicate Clip', key: 'Ctrl+D', onClick: () => app.duplicateSelection() },
        { label: 'Delete Selected', key: 'Del', onClick: () => app.deleteSelection() }
      ]
    },
    {
      name: 'View',
      entries: [
        { label: 'Zoom In', onClick: () => app.zoomBy(1.25) },
        { label: 'Zoom Out', onClick: () => app.zoomBy(0.8) },
        { label: 'Fit Project', onClick: () => app.zoomFit() },
        'sep',
        { label: 'Toggle Browser', onClick: () => togglePanel('#browser') },
        { label: 'Toggle Inspector', onClick: () => togglePanel('#inspector') },
        { label: 'Toggle Device Chain', onClick: () => togglePanel('#devicechain') }
      ]
    },
    {
      name: 'Audio',
      entries: [
        { label: 'Enable Audio', onClick: () => app.enableAudio() },
        { label: 'Toggle Metronome', onClick: () => app.toggleMetronome() },
        'sep',
        { label: 'Preview Game SFX ▸', onClick: () => app.previewSfxDialog() }
      ]
    },
    {
      name: 'Help',
      entries: [
        { label: 'Keyboard Shortcuts', onClick: () => app.showShortcuts() },
        { label: 'How to Import into the Game', onClick: () => app.showImportHelp() },
        'sep',
        { label: 'About dawCAT', onClick: () => app.showAbout() }
      ]
    }
  ];

  for (const menu of menus) {
    const item = el('div', { class: 'menu-item', text: menu.name });
    const drop = el('div', { class: 'menu-drop' });
    for (const entry of menu.entries) {
      if (entry === 'sep') { drop.append(el('div', { class: 'menu-sep' })); continue; }
      const row = el('div', { class: 'menu-entry' },
        el('span', { text: entry.label }),
        entry.key ? el('span', { class: 'key', text: entry.key }) : null
      );
      row.addEventListener('click', () => { closeMenus(); entry.onClick(); });
      drop.append(row);
    }
    item.append(drop);
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasOpen = item.classList.contains('open');
      closeMenus();
      if (!wasOpen) item.classList.add('open');
    });
    item.addEventListener('mouseenter', () => {
      if (document.querySelector('.menu-item.open')) {
        closeMenus();
        item.classList.add('open');
      }
    });
    host.append(item);
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu-item')) closeMenus();
  });
  function closeMenus() {
    document.querySelectorAll('.menu-item.open').forEach((n) => n.classList.remove('open'));
  }
  function togglePanel(sel) {
    const node = document.querySelector(sel);
    if (node) node.classList.toggle('hidden');
  }
}

/* ---------------- transport buttons ---------------- */

function wireTransport(app) {
  const btnPlay = document.getElementById('btn-play');
  const btnStop = document.getElementById('btn-stop');
  const btnRewind = document.getElementById('btn-rewind');
  const btnRecord = document.getElementById('btn-record');
  const btnLoop = document.getElementById('btn-loop');
  const btnMetro = document.getElementById('btn-metronome');

  btnPlay.addEventListener('click', () => app.transport.toggle());
  btnStop.addEventListener('click', () => { app.transport.stop(); app.transport.seek(app.transport.position); });
  btnRewind.addEventListener('click', () => app.transport.rewind());
  btnRecord.addEventListener('click', () => {
    app.transport.recording = !app.transport.recording;
    app.transport.emitState();
  });
  btnLoop.addEventListener('click', () => {
    const p = app.state.project;
    p.loop.on = !p.loop.on;
    app.state.emit('project');
    app.transport.emitState();
  });
  btnMetro.addEventListener('click', () => {
    const p = app.state.project;
    p.metronome = !p.metronome;
    btnMetro.classList.toggle('active', p.metronome);
  });

  app.transport.addEventListener('playstate', (e) => {
    btnPlay.textContent = e.detail.playing ? '⏸' : '▶';
    btnPlay.classList.toggle('active', e.detail.playing);
    btnRecord.classList.toggle('active', e.detail.recording);
    btnLoop.classList.toggle('active', app.state.project.loop.on);
    btnMetro.classList.toggle('active', app.state.project.metronome);
  });
  app.state.addEventListener('project', () => {
    btnLoop.classList.toggle('active', app.state.project.loop.on);
    btnMetro.classList.toggle('active', app.state.project.metronome);
  });

  // Tempo editing
  const tempoVal = document.getElementById('tempo-val');
  const tempoField = tempoVal.parentElement;
  tempoField.addEventListener('click', () => {
    if (tempoField.querySelector('input')) return;
    const input = document.createElement('input');
    input.value = app.state.project.tempo.toFixed(2);
    tempoVal.textContent = '';
    tempoVal.append(input);
    input.focus();
    input.select();
    const commit = () => {
      const bpm = Math.min(300, Math.max(30, parseFloat(input.value) || app.state.project.tempo));
      app.transport.setTempo(bpm);
      tempoVal.textContent = bpm.toFixed(2);
      app.state.emit('project');
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') input.blur();
      if (ev.key === 'Escape') { input.value = ''; input.blur(); }
    });
  });
}

/* ---------------- position + system meters ---------------- */

function startMeters(app) {
  const posEl = document.getElementById('pos-val');
  const cpuBar = document.getElementById('cpu-bar');
  const cpuVal = document.getElementById('cpu-val');
  const voxBar = document.getElementById('vox-bar');
  const voxVal = document.getElementById('vox-val');
  const sigVal = document.getElementById('sig-val');

  function raf() {
    const beat = Math.max(0, app.transport.position);
    const bar = Math.floor(beat / 4) + 1;
    const beatIn = Math.floor(beat % 4) + 1;
    const six = Math.floor((beat % 1) * 4) + 1;
    posEl.textContent = `${bar} . ${beatIn} . ${six}`;
    const cpu = Math.round(app.engine.cpu || 0);
    cpuBar.style.width = Math.min(100, cpu) + '%';
    cpuVal.textContent = cpu + '%';
    const vox = app.engine.voiceCount || 0;
    voxBar.style.width = Math.min(100, vox * 4) + '%';
    voxVal.textContent = String(vox);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  sigVal.textContent = `${app.state.project.timeSigNum} / ${app.state.project.timeSigDen}`;
  app.state.addEventListener('project', () => {
    sigVal.textContent = `${app.state.project.timeSigNum} / ${app.state.project.timeSigDen}`;
  });
}
