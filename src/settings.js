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
    // Desktop: an integrated GPU (or unknown string) never gets 'high' —
    // Intel/Apple silicon iGPUs choke on 4x MSAA + 4096 shadows.
    if (cores >= 8 && dpr <= 2.5) return isDiscreteGPU() ? 'high' : 'medium';
    return 'medium';
  }
}

/**
 * Best-effort discrete-GPU detection via WEBGL_debug_renderer_info.
 * Returns true only when the GPU string clearly identifies a discrete
 * vendor part (NVIDIA GeForce/Quadro, AMD Radeon RX, Apple M-series Pro/Max,
 * Intel Arc). Unknown strings resolve to false so auto-tier stays modest.
 */
export function isDiscreteGPU() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const raw = ext
      ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    const s = String(raw || '');
    if (/nvidia|geforce|quadro|rtx|gtx/i.test(s)) return true;
    if (/radeon.*(rx|pro|9[0-9]{2})/i.test(s)) return true;
    if (/apple\s*m[1-9]\s*(pro|max|ultra)/i.test(s)) return true;
    if (/arc\s*[a-z]*\s*[3-9]/i.test(s)) return true;
    return false;
  } catch (e) {
    return false;
  }
}