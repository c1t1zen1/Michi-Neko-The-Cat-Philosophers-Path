const KEY = 'catwalk_settings_v1';

const DEFAULTS = {
  master: 80,
  music: 70,
  sfx: 85,
  ambient: 75,
  sensitivity: 100,
  invertY: false,
  quality: 'auto',
  hints: true
};

export class SettingsManager {
  constructor() {
    this.values = { ...DEFAULTS };
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) Object.assign(this.values, JSON.parse(raw));
    } catch (e) { /* corrupted save -> defaults */ }
  }

  set(key, value) {
    this.values[key] = value;
    try { localStorage.setItem(KEY, JSON.stringify(this.values)); } catch (e) {}
  }

  get(key) { return this.values[key]; }

  /** Resolve 'auto' quality into a concrete preset based on device capability. */
  resolveQuality() {
    if (this.values.quality !== 'auto') return this.values.quality;
    const cores = navigator.hardwareConcurrency || 4;
    const dpr = window.devicePixelRatio || 1;
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    if (mobile) return cores >= 6 ? 'medium' : 'low';
    return (cores >= 8 && dpr <= 2.5) ? 'high' : 'medium';
  }
}