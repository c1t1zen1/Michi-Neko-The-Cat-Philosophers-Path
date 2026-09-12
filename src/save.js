/**
 * Production-hardened save manager.
 *
 * - Schema-versioned payloads with migration functions (v1 -> v2).
 * - Primary + backup keys: the last good save is always kept, so a corrupted
 *   write (full localStorage, tab killed mid-write) can never destroy the
 *   only copy. `load()` falls back to the backup automatically.
 * - Validation on read: positions must be finite numbers, arrays must be
 *   arrays; anything malformed is treated as corrupt and skipped.
 * - Export/import the whole save as JSON (portable between devices).
 */
const SCHEMA_VERSION = 2;

const LEGACY_KEY = 'catwalk_save_v1';

function isValidSave(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  // Positions are the one field a NaN would soft-lock the game with.
  for (const k of ['x', 'y', 'z']) {
    if (data[k] !== undefined && !Number.isFinite(data[k])) return false;
  }
  if (data.collected !== undefined && !Array.isArray(data.collected)) return false;
  if (data.completed !== undefined && !Array.isArray(data.completed)) return false;
  if (data.xp !== undefined && !Number.isFinite(Number(data.xp))) return false;
  return true;
}

export class SaveManager {
  constructor(key = 'catwalk_save_v2', backupKey = 'catwalk_save_v2_backup') {
    this.key = key;
    this.backupKey = backupKey;
  }

  /** Migrate older payloads up to the current schema version. */
  migrate(data) {
    if (!data || typeof data !== 'object') return data;
    let out = data;
    const version = Number(data.version) || 1;
    if (version < 2) {
      // v1 saves had no journal / cosmetics / world flags.
      out = {
        ...data,
        version: 2,
        journal: data.journal || {
          places: [], quietMoments: [], photos: [], weatherMemories: [], keepsakes: []
        },
        cosmetics: data.cosmetics || {},
        worldFlags: data.worldFlags || {}
      };
    }
    return out;
  }

  save(data) {
    try {
      const payload = JSON.stringify({ ...data, version: SCHEMA_VERSION });
      // Rotate: the previous good write becomes the backup before the new
      // write, so a failure halfway through leaves one intact copy.
      const prev = localStorage.getItem(this.key);
      if (prev) {
        try { localStorage.setItem(this.backupKey, prev); } catch (e) {}
      }
      localStorage.setItem(this.key, payload);
      return true;
    } catch (e) {
      console.warn('[SaveManager] Save failed:', e);
      return false;
    }
  }

  /** Best-effort read with validation + backup fallback + migration. */
  load() {
    // 1. Current key
    const data = this.readKey(this.key);
    if (data) return data;
    // 2. Backup (main copy corrupt or a failed rotation)
    const backup = this.readKey(this.backupKey);
    if (backup) {
      console.warn('[SaveManager] Primary save unusable — restored from backup.');
      return backup;
    }
    // 3. Legacy v1 key (pre-versioning builds)
    const legacy = this.readKey(LEGACY_KEY, false);
    if (legacy) return this.migrate(legacy);
    return null;
  }

  readKey(key, migrate = true) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!isValidSave(data)) return null;
      return migrate ? this.migrate(data) : data;
    } catch (e) {
      return null;
    }
  }

  /** True when either the primary or the backup key holds a usable save. */
  hasSave() {
    return !!this.readKey(this.key) || !!this.readKey(this.backupKey) ||
      !!this.readKey(LEGACY_KEY, false);
  }

  clear() {
    try {
      localStorage.removeItem(this.key);
      localStorage.removeItem(this.backupKey);
      // The legacy key feeds load()'s fallback — leaving it behind would
      // resurrect a pre-versioning save on the next boot (new game reset).
      localStorage.removeItem(LEGACY_KEY);
    } catch (e) {}
  }

  /** Download the save as a .json file. */
  exportFile() {
    const data = this.load();
    if (!data) return false;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `michi-neko-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return true;
  }

  /** Replace the save from an uploaded JSON file. Returns the data or null. */
  importFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!isValidSave(data)) return resolve(null);
          const migrated = this.migrate(data);
          this.save(migrated);
          resolve(migrated);
        } catch (e) {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    });
  }
}
