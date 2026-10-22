/* dawCAT — agent settings persistence model. Base URL and model are
   remembered per provider (switching between llama-server and a cloud API
   doesn't wipe either); generation settings are shared. API keys are NOT in
   this store — the panel keeps them in sessionStorage (or localStorage if the
   user opts in), keyed by provider. Pure: storage I/O lives in the panel. */
import { normalizeSettings, providerInfo } from './providers.js';

export const STORE_KEY = 'dawcat-agent-v2';
export const KEYS_KEY = 'dawcat-agent-keys-v2';
export const CHAT_KEY = 'dawcat-agent-chat-v2';
export const V1_KEY = 'michi-neko-dawcat-agent-settings-v1';

const COMMON = ['temperature', 'topP', 'maxTokens', 'reasoning', 'structured', 'repairAttempts', 'applyMode', 'contextDetail', 'stream'];

export function defaultStore() {
  return { v: 2, provider: 'local', mode: 'compose', perProvider: {}, common: {}, models: {}, lastTest: {}, rememberKeys: false, everConnected: false };
}

/* v1 kept one flat settings object (with the key) in sessionStorage. */
export function migrateV1(v1) {
  const store = defaultStore();
  const input = v1 && typeof v1 === 'object' ? v1 : {};
  const s = normalizeSettings(input);
  store.provider = s.provider;
  if (input.baseUrl || input.model) store.perProvider[s.provider] = { baseUrl: s.baseUrl, model: s.model };
  for (const k of COMMON) if (input[k] !== undefined) store.common[k] = s[k];
  return { store, key: s.apiKey };
}

export function resolveSettings(store, keys = {}, provider = store.provider) {
  const id = providerInfo(provider).id;
  return normalizeSettings({ provider: id, ...store.common, ...(store.perProvider[id] || {}), apiKey: keys[id] || '', rememberKey: store.rememberKeys });
}

/* Returns a new store with `patch` applied to `settings` (its provider). */
export function storeSettings(store, settings, patch = {}) {
  const next = JSON.parse(JSON.stringify(store));
  const s = normalizeSettings({ ...settings, ...patch });
  next.provider = s.provider;
  next.perProvider[s.provider] = { baseUrl: s.baseUrl, model: s.model };
  for (const k of COMMON) next.common[k] = s[k];
  return next;
}
