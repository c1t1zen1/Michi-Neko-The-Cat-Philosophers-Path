export class SaveManager {
  constructor(key = 'catwalk_save_v1') {
    this.key = key;
  }

  save(data) {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('[SaveManager] Save failed:', e);
      return false;
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('[SaveManager] Load failed:', e);
      return null;
    }
  }

  clear() {
    localStorage.removeItem(this.key);
  }
}
