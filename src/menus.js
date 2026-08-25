const $ = (id) => document.getElementById(id);

export class MenuSystem {
  /**
   * @param {object} opts
   *   settings   SettingsManager
   *   audio      AudioManager
   *   ui         UI
   *   callbacks  { onStartNewGame, onContinue, onResume, onQuitToTitle, onApplySettings, canPause }
   */
  constructor(opts) {
    this.settings = opts.settings;
    this.audio = opts.audio;
    this.ui = opts.ui;
    this.cb = opts.callbacks;
    this.mode = 'title';          // 'title' | 'playing' | 'paused'
    this.settingsReturnTo = 'title';

    this.titleEl = $('title-screen');
    this.pauseEl = $('pause-screen');
    this.settingsEl = $('settings-screen');

    $('btn-new-game').addEventListener('click', () => this.cb.onStartNewGame());
    $('btn-continue').addEventListener('click', () => this.cb.onContinue());
    $('btn-title-settings').addEventListener('click', () => this.openSettings('title'));
    $('btn-resume').addEventListener('click', () => this.resume());
    $('btn-pause-settings').addEventListener('click', () => this.openSettings('paused'));
    $('btn-save-quit').addEventListener('click', () => this.cb.onQuitToTitle());
    $('btn-settings-close').addEventListener('click', () => this.closeSettings());

    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Escape') return;
      if (!this.settingsEl.classList.contains('hidden')) { this.closeSettings(); return; }
      if (this.mode === 'playing' && (!this.cb.canPause || this.cb.canPause())) this.pause();
      else if (this.mode === 'paused') this.resume();
    });

    this.buildSettings();
    this.refreshContinueButton();
    document.body.classList.add('in-title');
  }

  refreshContinueButton() {
    const hasSave = !!localStorage.getItem('catwalk_save_v1');
    const btn = $('btn-continue');
    btn.disabled = !hasSave;
    btn.style.opacity = hasSave ? '' : '0.45';
    btn.style.cursor = hasSave ? '' : 'not-allowed';
  }

  /* ---------- Mode transitions ---------- */

  showTitle() {
    this.mode = 'title';
    document.body.classList.add('in-title');
    this.titleEl.classList.remove('hidden');
    this.pauseEl.classList.add('hidden');
    this.settingsEl.classList.add('hidden');
    this.titleEl.classList.remove('fade-out');
    this.refreshContinueButton();
  }

  startGame() {
    this.mode = 'playing';
    document.body.classList.remove('in-title');
    this.titleEl.classList.add('fade-out');
    this.pauseEl.classList.add('hidden');
    setTimeout(() => this.titleEl.classList.add('hidden'), 850);
  }

  pause() {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    this.pauseEl.classList.remove('hidden');
  }

  resume() {
    if (this.mode !== 'paused') return;
    this.mode = 'playing';
    this.pauseEl.classList.add('hidden');
    this.settingsEl.classList.add('hidden');
  }

  get isPlaying() { return this.mode === 'playing'; }

  /** True while the world should be frozen (pause menu open). */
  isPausedLike() { return this.mode === 'paused'; }

  /* ---------- Settings ---------- */

  openSettings(returnTo) {
    this.settingsReturnTo = returnTo;
    if (returnTo === 'paused') this.pauseEl.classList.add('hidden');
    else this.titleEl.classList.add('fade-out');
    this.syncSettingsInputs();
    this.settingsEl.classList.remove('hidden');
  }

  closeSettings() {
    this.settingsEl.classList.add('hidden');
    if (this.settingsReturnTo === 'paused') this.pauseEl.classList.remove('hidden');
    else this.titleEl.classList.remove('fade-out');
  }

  syncSettingsInputs() {
    const v = this.settings.values;
    $('set-master').value = v.master;
    $('set-music').value = v.music;
    $('set-sfx').value = v.sfx;
    $('set-ambient').value = v.ambient;
    $('set-sensitivity').value = v.sensitivity;
    $('set-inverty').checked = v.invertY;
    $('set-quality').value = v.quality;
    $('set-hints').checked = v.hints;
    this.updateValueLabels();
  }

  updateValueLabels() {
    const v = this.settings.values;
    $('val-master').textContent = `${v.master}%`;
    $('val-music').textContent = `${v.music}%`;
    $('val-sfx').textContent = `${v.sfx}%`;
    $('val-ambient').textContent = `${v.ambient}%`;
    $('val-sensitivity').textContent = `${v.sensitivity}%`;
  }

  buildSettings() {
    const bind = (id, key, parse = Number) => {
      $(id).addEventListener('input', (e) => {
        const val = parse(e.target.value);
        this.settings.set(key, val);
        this.updateValueLabels();
        this.cb.onApplySettings();
      });
    };
    bind('set-master', 'master');
    bind('set-music', 'music');
    bind('set-sfx', 'sfx');
    bind('set-ambient', 'ambient');
    bind('set-sensitivity', 'sensitivity');
    $('set-inverty').addEventListener('change', (e) => { this.settings.set('invertY', e.target.checked); this.cb.onApplySettings(); });
    $('set-quality').addEventListener('change', (e) => { this.settings.set('quality', e.target.value); this.cb.onApplySettings(); });
    $('set-hints').addEventListener('change', (e) => { this.settings.set('hints', e.target.checked); this.cb.onApplySettings(); });
  }
}