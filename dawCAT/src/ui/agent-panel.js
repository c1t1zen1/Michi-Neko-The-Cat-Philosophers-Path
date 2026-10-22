/* dawCAT — AI assistant panel: a streaming, multi-turn chat over AgentSession.

   Talks to the provider DIRECTLY from the browser (no proxy): local servers
   (llama-server, LM Studio, Ollama, any OpenAI-compatible endpoint) and cloud
   APIs (OpenAI, Anthropic, OpenRouter, Gemini, Groq, Mistral, DeepSeek, xAI).
   The session does the hard parts — streaming, structured output, history,
   self-repair, parameter adaptation; this file is the UI: settings with a
   connection test, modes with quick-start prompts, the transcript of turn
   cards (live thinking/output, what changed, Apply/Undo/Retry/Listen), and a
   diagnostics log. Closing the panel never cancels a request in flight. */
import { PROVIDERS, providerInfo, normalizeBaseUrl, buildProbeRequests, parseModelList, parseProps, REASONING_LEVELS, STRUCTURED_MODES, CONTEXT_DETAILS } from '../agent/providers.js';
import { diagnoseNetworkFailure, notJsonHint, httpErrorHint, HTTP_SERVE_HINT } from '../agent/diagnose.js';
import { AgentSession } from '../agent/session.js';
import { MODES, MODE_IDS, buildSystemPrompt, compactContext, chooseDetail, estimateTokens } from '../agent/prompt.js';
import { describeAction } from '../agent/describe.js';
import { STORE_KEY, KEYS_KEY, CHAT_KEY, V1_KEY, defaultStore, migrateV1, resolveSettings, storeSettings } from '../agent/settings-store.js';
import { SFX_TEMPLATE_IDS } from '../sfx/patches.js';
import { el, toast } from './common.js';

const store = {
  get(area, key) { try { return JSON.parse(window[area].getItem(key) || 'null'); } catch { return null; } },
  set(area, key, value) { try { window[area].setItem(key, JSON.stringify(value)); } catch { /* quota / private mode */ } },
  remove(area, key) { try { window[area].removeItem(key); } catch { /* ignore */ } }
};

const STATUS_LABEL = { streaming: 'Thinking', repairing: 'Fixing its plan', applied: 'Applied', review: 'Review', answered: 'Answer', failed: 'Failed', stopped: 'Stopped', undone: 'Undone' };

// llama-server reports a model by its absolute .gguf path — 100+ unreadable
// characters. Label it by filename; the real id stays the option's value.
function modelLabel(id) {
  const text = String(id);
  const looksLikePath = /\.gguf$/i.test(text) || (text.length > 48 && text.split(/[\\/]/).length > 2);
  return looksLikePath ? (text.split(/[\\/]/).pop().replace(/\.gguf$/i, '') || text) : text;
}

const fmtK = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

export class AgentPanel {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('agent-panel');
    this.loadStores();
    this.mode = MODES[this.cfg.mode] ? this.cfg.mode : 'compose';
    this.models = this.cfg.models[this.cfg.provider] || [];
    this.logLines = [];
    this.session = new AgentSession({
      fetchImpl: (url, init) => fetch(url, init),
      getSettings: () => this.formSettings(),
      getContext: (opts) => this.app.getAgentContext(opts),
      executePlan: (plan) => this.execute(plan),
      pageOrigin: location.origin,
      pageHost: location.host,
      sfxTemplates: SFX_TEMPLATE_IDS,
      log: (m) => this.log(m)
    });
    const test = this.cfg.lastTest[this.cfg.provider];
    if (test && test.nCtx) this.session.nCtx = test.nCtx;
    this.session.addEventListener('turn', (e) => this.onTurn(e.detail));
    this.session.addEventListener('busy', (e) => this.onBusy(e.detail));
    this.session.addEventListener('delta', (e) => this.onDelta(e.detail));
    this.build();
    this.fillForm();
    this.restoreChat();
    this.setMode(this.mode);
    this.renderTranscript();
    this.updatePill();
    this.log('Assistant ready');
  }

  /* ---------------- persistence ---------------- */

  loadStores() {
    let cfg = store.get('localStorage', STORE_KEY);
    let keys = store.get(cfg && cfg.rememberKeys ? 'localStorage' : 'sessionStorage', KEYS_KEY) || {};
    if (!cfg) {
      const v1 = store.get('sessionStorage', V1_KEY);
      if (v1) {
        const { store: migrated, key } = migrateV1(v1);
        cfg = migrated;
        if (key) keys = { ...keys, [migrated.provider]: key };
      }
    }
    this.cfg = Object.assign(defaultStore(), cfg || {});
    this.keys = keys;
  }

  saveStores() {
    store.set('localStorage', STORE_KEY, this.cfg);
    if (this.cfg.rememberKeys) { store.set('localStorage', KEYS_KEY, this.keys); store.remove('sessionStorage', KEYS_KEY); }
    else { store.set('sessionStorage', KEYS_KEY, this.keys); store.remove('localStorage', KEYS_KEY); }
  }

  restoreChat() {
    const turns = store.get('sessionStorage', CHAT_KEY);
    if (Array.isArray(turns)) this.session.load(turns);
  }

  saveChat() { store.set('sessionStorage', CHAT_KEY, this.session.toJSON()); }

  /* ---------------- DOM ---------------- */

  $(id) { return this.root.querySelector(`#${id}`); }

  build() {
    const r = this.root;
    r.innerHTML = '';
    const providerSelect = el('select', { id: 'agent-provider' });
    for (const group of ['local', 'cloud']) {
      const og = el('optgroup', { label: group === 'local' ? 'Local (free, private)' : 'Cloud APIs (key required)' });
      for (const p of PROVIDERS.filter((x) => x.group === group)) og.append(el('option', { value: p.id, text: p.label }));
      providerSelect.append(og);
    }
    const sel = (id, values, labels = {}) => el('select', { id }, ...values.map((v) => el('option', { value: v, text: labels[v] || v })));

    this.settingsEl = el('section', { class: 'ag-settings hidden', id: 'agent-settings' },
      el('label', {}, 'Service', providerSelect),
      el('div', { class: 'ag-hint', id: 'agent-provider-hint' }),
      el('label', {}, 'Base URL', el('input', { id: 'agent-base-url', spellcheck: 'false', autocomplete: 'off' })),
      el('label', {}, el('span', { id: 'agent-key-label', text: 'API key' }), el('input', { id: 'agent-api-key', type: 'password', autocomplete: 'off', placeholder: 'Stays in this browser — sent only to the Base URL above' })),
      el('label', { class: 'ag-check', title: 'Off: the key is forgotten when this tab closes. On: kept in this browser\'s local storage on this device.' }, el('input', { id: 'agent-remember-key', type: 'checkbox' }), 'Remember API keys on this device'),
      el('label', {}, 'Model',
        el('div', { class: 'ag-row' },
          el('select', { id: 'agent-model-select', title: 'Models this API offers (⟳ Scan)' }),
          el('button', { id: 'agent-scan-models', class: 'ag-btn small', type: 'button', text: '⟳ Scan', title: 'Load the model list (GET /models)' })),
        el('input', { id: 'agent-model', spellcheck: 'false', autocomplete: 'off', placeholder: '…or type a model id' })),
      el('div', { class: 'ag-row' },
        el('button', { id: 'agent-test', class: 'ag-btn primary', type: 'button', text: '⚡ Test connection' }),
        el('div', { class: 'ag-hint', text: 'Checks the server, lists models and reads the context size.' })),
      el('div', { id: 'agent-test-result', class: 'ag-test hidden' }),
      el('details', {},
        el('summary', { text: 'Advanced' }),
        el('div', { class: 'ag-grid', style: 'margin-top:8px' },
          el('label', { title: 'Higher = more adventurous. Ignored by models that don\'t support it.' }, 'Temperature', el('input', { id: 'agent-temperature', type: 'number', min: '0', max: '2', step: '0.05' })),
          el('label', {}, 'Top P', el('input', { id: 'agent-top-p', type: 'number', min: '0.01', max: '1', step: '0.05' })),
          el('label', { title: 'Reply budget. Reasoning models need room to think AND answer — 8000+ is safe.' }, 'Max tokens', el('input', { id: 'agent-max-tokens', type: 'number', min: '256', max: '128000', step: '256' })),
          el('label', { title: 'Thinking effort. "none" is fastest; on Claude it means the lightest effort.' }, 'Reasoning', sel('agent-reasoning', REASONING_LEVELS)),
          el('label', { title: 'How strongly to force JSON output. Auto picks what the provider supports; dawCAT falls back if a server rejects it.' }, 'Structured output', sel('agent-structured', STRUCTURED_MODES, { auto: 'auto', json_schema: 'JSON schema', json_object: 'JSON mode', off: 'off (prompt only)' })),
          el('label', { title: 'When a plan is invalid or fails to apply, send the error back and ask for a fix this many times.' }, 'Self-repair tries', sel('agent-repair', ['0', '1', '2', '3'])),
          el('label', { title: 'Auto applies plans immediately (undo in one step). Review shows the plan first with Apply / Discard.' }, 'Apply plans', sel('agent-apply-mode', ['auto', 'review'], { auto: 'automatically', review: 'after I review' })),
          el('label', { title: 'How much of the project to send. Auto fits it to the model\'s context window.' }, 'Context detail', sel('agent-context-detail', CONTEXT_DETAILS))
        ),
        el('label', { class: 'ag-check', style: 'margin-top:6px' }, el('input', { id: 'agent-stream', type: 'checkbox' }), 'Stream replies live')
      ),
      el('details', {},
        el('summary', { text: 'Diagnostics' }),
        el('div', { class: 'ag-row', style: 'margin-top:6px' },
          el('button', { id: 'agent-copy-exchange', class: 'ag-btn small', type: 'button', text: 'Copy last request + response', title: 'For debugging a model or server — the API key is redacted' }),
          el('button', { id: 'agent-clear-log', class: 'ag-btn small', type: 'button', text: 'Clear log' })),
        el('div', { id: 'agent-log', class: 'ag-log' }))
    );

    this.modesEl = el('div', { class: 'ag-modes' }, ...MODE_IDS.map((m) => el('button', { type: 'button', 'data-mode': m, text: MODES[m].label, title: MODES[m].hint })));
    this.transcriptEl = el('div', { class: 'ag-transcript', id: 'agent-transcript' });
    this.promptEl = el('textarea', { id: 'agent-prompt', spellcheck: 'true', placeholder: 'Describe a cue, a sound, or ask a question…  (Enter to send · Shift+Enter for a new line)' });

    r.append(
      el('header', { class: 'ag-head' },
        el('div', { class: 'ag-title' }, el('b', { text: '✦ AI ASSISTANT' }), el('button', { id: 'agent-pill', class: 'ag-pill', type: 'button', title: 'Connection — click for settings' })),
        el('div', { class: 'ag-head-btns' },
          el('button', { id: 'agent-new', class: 'ag-icon', type: 'button', text: 'New chat', title: 'Start a fresh conversation (the project is untouched)' }),
          el('button', { id: 'agent-settings-btn', class: 'ag-icon', type: 'button', text: '⚙', title: 'Provider & model settings' }),
          el('button', { id: 'agent-expand', class: 'ag-icon', type: 'button', text: '⇔', title: 'Wider panel' }),
          el('button', { id: 'agent-close', class: 'ag-icon', type: 'button', text: '×', title: 'Close (requests keep running)' }))),
      this.settingsEl,
      this.modesEl,
      el('div', { class: 'ag-mode-hint', id: 'agent-mode-hint' }),
      this.transcriptEl,
      el('footer', { class: 'ag-composer' },
        this.promptEl,
        el('div', { class: 'ag-composer-row' },
          el('div', { id: 'agent-state', class: 'agent-state' }),
          el('button', { id: 'agent-stop', class: 'ag-btn hidden', type: 'button', text: '■ Stop' }),
          el('button', { id: 'agent-send', class: 'ag-btn primary', type: 'button', text: 'Send ➤' })))
    );
    if (this.cfg.wide) r.classList.add('wide');
    this.bind();
  }

  bind() {
    this.$('agent-close').addEventListener('click', () => this.close());
    this.$('agent-expand').addEventListener('click', () => { this.cfg.wide = this.root.classList.toggle('wide'); this.saveStores(); });
    this.$('agent-settings-btn').addEventListener('click', () => this.toggleSettings());
    this.$('agent-pill').addEventListener('click', () => this.toggleSettings(true));
    this.$('agent-new').addEventListener('click', () => this.newChat());
    this.$('agent-provider').addEventListener('change', () => this.switchProvider(this.$('agent-provider').value));
    for (const id of ['agent-base-url', 'agent-model', 'agent-api-key', 'agent-temperature', 'agent-top-p', 'agent-max-tokens', 'agent-reasoning', 'agent-structured', 'agent-repair', 'agent-apply-mode', 'agent-context-detail', 'agent-stream']) {
      this.$(id).addEventListener('change', () => this.saveForm());
    }
    this.$('agent-remember-key').addEventListener('change', () => { this.cfg.rememberKeys = this.$('agent-remember-key').checked; this.saveForm(); if (this.cfg.rememberKeys) toast('API keys will be kept in this browser on this device'); });
    this.$('agent-model-select').addEventListener('change', (e) => { if (e.target.value) { this.$('agent-model').value = e.target.value; this.saveForm(); this.updatePill(); } });
    this.$('agent-scan-models').addEventListener('click', () => this.testConnection());
    this.$('agent-test').addEventListener('click', () => this.testConnection());
    this.$('agent-copy-exchange').addEventListener('click', () => this.copyExchange());
    this.$('agent-clear-log').addEventListener('click', () => { this.logLines = []; this.$('agent-log').innerHTML = ''; });
    this.modesEl.querySelectorAll('button[data-mode]').forEach((b) => b.addEventListener('click', () => this.setMode(b.dataset.mode)));
    this.$('agent-send').addEventListener('click', () => this.send());
    this.$('agent-stop').addEventListener('click', () => this.session.stop());
    this.promptEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); this.send(); }
      if (e.key === 'Escape') { e.preventDefault(); this.close(); }
    });
    // The transcript's buttons are re-rendered often, so delegate.
    this.transcriptEl.addEventListener('click', (e) => this.onTranscriptClick(e));
  }

  /* ---------------- settings ---------------- */

  fillForm() {
    const s = resolveSettings(this.cfg, this.keys);
    this.$('agent-provider').value = s.provider;
    this.$('agent-base-url').value = s.baseUrl;
    this.$('agent-model').value = s.model;
    this.$('agent-api-key').value = s.apiKey;
    this.$('agent-remember-key').checked = !!this.cfg.rememberKeys;
    this.$('agent-temperature').value = s.temperature;
    this.$('agent-top-p').value = s.topP;
    this.$('agent-max-tokens').value = s.maxTokens;
    this.$('agent-reasoning').value = s.reasoning;
    this.$('agent-structured').value = s.structured;
    this.$('agent-repair').value = String(s.repairAttempts);
    this.$('agent-apply-mode').value = s.applyMode;
    this.$('agent-context-detail').value = s.contextDetail;
    this.$('agent-stream').checked = s.stream;
    this.setModelOptions(this.models);
    this.updateProviderHint();
  }

  formSettings() {
    const v = (id) => this.$(id).value;
    return resolveSettings(storeSettings(this.cfg, resolveSettings(this.cfg, this.keys), {
      provider: v('agent-provider'), baseUrl: v('agent-base-url'), model: v('agent-model'),
      temperature: v('agent-temperature'), topP: v('agent-top-p'), maxTokens: v('agent-max-tokens'),
      reasoning: v('agent-reasoning'), structured: v('agent-structured'), repairAttempts: v('agent-repair'),
      applyMode: v('agent-apply-mode'), contextDetail: v('agent-context-detail'), stream: this.$('agent-stream').checked
    }), { ...this.keys, [v('agent-provider')]: v('agent-api-key') });
  }

  saveForm() {
    // Show the address actually being called — pasting llama-server's own
    // "http://0.0.0.0:8080" banner is natural and silently wrong.
    const field = this.$('agent-base-url');
    const fixed = normalizeBaseUrl(field.value);
    if (fixed && fixed !== field.value.trim().replace(/\/+$/, '')) {
      this.log(`Base URL ${field.value} → ${fixed} (0.0.0.0 means "listen everywhere"; connect via 127.0.0.1)`);
      field.value = fixed;
    }
    const s = this.formSettings();
    this.cfg = storeSettings(this.cfg, s);
    this.keys = { ...this.keys, [s.provider]: s.apiKey };
    this.saveStores();
    this.updateEstimate();
  }

  switchProvider(id) {
    this.cfg.provider = providerInfo(id).id;
    this.models = this.cfg.models[this.cfg.provider] || [];
    const test = this.cfg.lastTest[this.cfg.provider];
    this.session.nCtx = test && test.nCtx ? test.nCtx : null;
    this.fillForm();
    this.saveStores();
    this.$('agent-test-result').classList.add('hidden');
    this.updatePill();
    this.updateEstimate();
  }

  updateProviderHint() {
    const info = providerInfo(this.$('agent-provider').value);
    const hint = this.$('agent-provider-hint');
    hint.innerHTML = '';
    if (info.group === 'local') {
      hint.append('Runs on your machine — free and private. ');
      if (info.hint) hint.append('Start it with ', el('code', { text: info.hint }), ' ');
      hint.append(el('button', { class: 'ag-btn small', type: 'button', text: 'Copy', onclick: () => navigator.clipboard && navigator.clipboard.writeText(info.hint || '').then(() => toast('Copied')) }));
      if (location.protocol === 'https:') hint.append(el('div', { class: 'ag-error', text: `This page is served over HTTPS, so the browser blocks local servers. Serve dawCAT over http: ${HTTP_SERVE_HINT}.` }));
    } else {
      hint.append(`${info.label} — paste an API key from your ${info.label} account. Keys never leave this browser except to ${new URL(info.baseUrl).host}.`);
    }
    this.$('agent-key-label').textContent = info.needsKey ? 'API key (required)' : 'API key (optional)';
  }

  setModelOptions(models) {
    const select = this.$('agent-model-select');
    const current = this.$('agent-model').value;
    select.innerHTML = '';
    select.append(el('option', { value: '', text: models.length ? `— ${models.length} model(s) — pick one —` : '— ⟳ Scan to list models —' }));
    for (const m of models) select.append(el('option', { value: m, title: m, text: modelLabel(m) }));
    select.value = models.includes(current) ? current : '';
  }

  toggleSettings(force) {
    const show = force === undefined ? this.settingsEl.classList.contains('hidden') : force;
    this.settingsEl.classList.toggle('hidden', !show);
    this.$('agent-settings-btn').classList.toggle('on', show);
  }

  updatePill() {
    const pill = this.$('agent-pill');
    const s = this.formSettings();
    const info = providerInfo(s.provider);
    const test = this.cfg.lastTest[s.provider];
    const model = test && test.model ? test.model : modelLabel(s.model);
    const ctx = this.session.nCtx ? ` · ${fmtK(this.session.nCtx)} ctx` : '';
    pill.className = 'ag-pill' + (test ? (test.ok ? ' ok' : ' bad') : '');
    pill.textContent = `${test ? (test.ok ? '●' : '●') : '○'} ${info.label.split(' (')[0]} · ${model}${ctx}`;
  }

  /* Probes the configured server: model list (all providers), plus /health
     and /props on llama-server for the loaded model and its context size. */
  async testConnection() {
    this.saveForm();
    const s = this.formSettings();
    const info = providerInfo(s.provider);
    const box = this.$('agent-test-result');
    const setBox = (cls, nodes) => { box.className = `ag-test ${cls}`; box.innerHTML = ''; box.append(...[].concat(nodes)); };
    if (info.needsKey && !s.apiKey) { setBox('bad', `${info.label} needs an API key first.`); return; }
    setBox('busy', `Contacting ${s.baseUrl}…`);
    this.$('agent-test').disabled = true;
    this.$('agent-scan-models').disabled = true;
    const found = { models: null, health: null, props: null };
    let failure = null;
    try {
      for (const probe of buildProbeRequests(s)) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        let res;
        try { res = await fetch(probe.url, { headers: probe.headers, signal: controller.signal }); }
        catch (err) {
          if (probe.label === 'models') { failure = err.name === 'AbortError' ? `${probe.url} did not answer within 8 s.` : await diagnoseNetworkFailure(probe.url, { pageOrigin: location.origin, fetchImpl: (u, i) => fetch(u, i) }); break; }
          continue;
        } finally { clearTimeout(timer); }
        const text = await res.text();
        let data = null;
        try { data = JSON.parse(text); } catch { if (probe.label === 'models') { failure = notJsonHint(probe.url, res.status, text, location.host); break; } continue; }
        if (!res.ok) {
          if (probe.label === 'models') { failure = httpErrorHint(res.status, (data.error && data.error.message) || data.message || '', s); break; }
          if (probe.label === 'health') found.health = data.status || data.error?.message || `HTTP ${res.status}`;
          continue;
        }
        if (probe.label === 'models') found.models = parseModelList(data);
        if (probe.label === 'health') found.health = data.status || 'ok';
        if (probe.label === 'props') found.props = parseProps(data);
      }
    } finally {
      this.$('agent-test').disabled = false;
      this.$('agent-scan-models').disabled = false;
    }
    if (failure) {
      this.cfg.lastTest[s.provider] = { ok: false, at: Date.now() };
      this.saveStores();
      setBox('bad', failure);
      this.log(`Connection test failed: ${failure.slice(0, 160)}`);
      this.updatePill();
      return;
    }
    const models = found.models || [];
    this.models = models;
    this.cfg.models[s.provider] = models.slice(0, 400);
    let note = '';
    if (models.length && !models.includes(s.model) && info.group === 'local' && s.provider !== 'local') {
      this.$('agent-model').value = models[0];
      note = ` Selected "${modelLabel(models[0])}" — "${s.model}" isn't loaded here.`;
    }
    this.setModelOptions(models);
    const nCtx = found.props && found.props.nCtx;
    if (nCtx) this.session.nCtx = nCtx;
    const model = (found.props && found.props.model) || modelLabel(this.$('agent-model').value);
    this.cfg.lastTest[s.provider] = { ok: true, at: Date.now(), model, nCtx: nCtx || null };
    this.cfg.everConnected = true;
    this.saveForm();
    const lines = [`✓ Connected to ${info.label} at ${s.baseUrl}.`, models.length ? ` ${models.length} model(s) available.` : ' The server listed no models — type the model id.'];
    if (found.health && found.health !== 'ok') lines.push(` Health: ${found.health} (a model may still be loading).`);
    if (nCtx) lines.push(` Context window: ${nCtx.toLocaleString()} tokens${nCtx < 8192 ? ' — small; dawCAT will send a compact project summary. Restart with --ctx-size 16384 for better results.' : '.'}`);
    if (s.provider === 'ollama') lines.push(' Tip: Ollama defaults to a 4k context; set OLLAMA_CONTEXT_LENGTH=16384 for bigger projects.');
    setBox('ok', lines.join('') + note);
    this.log(`Connected: ${info.label}, ${models.length} model(s)${nCtx ? `, n_ctx ${nCtx}` : ''}`);
    this.updatePill();
    this.updateEstimate();
    this.renderTranscript();
  }

  /* ---------------- modes / composer ---------------- */

  setMode(mode) {
    this.mode = MODES[mode] ? mode : 'compose';
    this.cfg.mode = this.mode;
    this.saveStores();
    this.modesEl.querySelectorAll('button[data-mode]').forEach((b) => b.classList.toggle('active', b.dataset.mode === this.mode));
    this.$('agent-mode-hint').textContent = MODES[this.mode].hint;
    this.renderChips();
    this.updateEstimate();
  }

  renderChips() {
    const host = this.transcriptEl.querySelector('.ag-chips');
    if (!host) return;
    host.innerHTML = '';
    for (const c of MODES[this.mode].chips) host.append(el('button', { class: 'ag-chip', type: 'button', 'data-chip': c, text: c }));
  }

  /* Rough size of what Send would transmit, against the model's window. */
  updateEstimate() {
    if (!this.isOpen() || this.session.busy) return;
    try {
      const s = this.formSettings();
      const nCtx = this.session.nCtx || providerInfo(s.provider).nCtx;
      const ctx = this.app.getAgentContext({ mode: this.mode });
      const detail = s.contextDetail === 'auto' ? chooseDetail(JSON.stringify(ctx).length, nCtx) : s.contextDetail;
      const tokens = estimateTokens(buildSystemPrompt(this.mode, { sfxTemplates: SFX_TEMPLATE_IDS })) + estimateTokens(JSON.stringify(compactContext(ctx, detail)));
      const ratio = tokens / nCtx;
      this.state(`~${fmtK(tokens)} prompt tokens (${detail} context) of ${fmtK(nCtx)}${this.session.nCtx ? '' : ' (assumed)'} · ${s.applyMode === 'review' ? 'review before applying' : 'applies automatically · Ctrl+Z undoes'}`, ratio > 0.8 ? 'warn' : '');
    } catch { /* context unavailable during startup */ }
  }

  send(text) {
    const prompt = (text ?? this.promptEl.value).trim();
    if (!prompt) { this.state('Describe what you want first — or pick one of the suggestions.', 'error'); this.promptEl.focus(); return; }
    this.saveForm();
    this.promptEl.value = '';
    this.session.send(prompt, this.mode);
  }

  newChat() {
    if (this.session.busy) this.session.stop();
    this.session.reset();
    this.saveChat();
    this.renderTranscript();
    this.updateEstimate();
    this.promptEl.focus();
  }

  /* ---------------- execution ---------------- */

  execute(plan) {
    const result = this.app.executeAgentPlan(plan);
    return { ...result, undoDepth: this.app.state.undoStack.length };
  }

  /* ---------------- transcript ---------------- */

  onBusy(busy) {
    document.getElementById('menu-ai-agent')?.classList.toggle('busy', busy);
    this.$('agent-stop').classList.toggle('hidden', !busy);
    this.$('agent-send').textContent = busy ? 'Send (replaces) ➤' : 'Send ➤';
    if (busy) {
      if (!this._tick) this._tick = setInterval(() => this.refreshStreaming(), 500);
    } else {
      if (this._tick) { clearInterval(this._tick); this._tick = null; }
      const last = this.session.turns[this.session.turns.length - 1];
      if (last && last.status === 'failed') this.state('That didn\'t work — details are on the card above.', 'error');
      else this.updateEstimate();
    }
  }

  onTurn(turn) {
    this.renderTranscript();
    if (!turn) return;
    if (['applied', 'answered', 'review', 'failed', 'stopped', 'undone'].includes(turn.status)) {
      this.saveChat();
      if (turn.status === 'applied') this.log(`Applied ${turn.result?.count ?? turn.plan.actions.length} action(s): ${turn.plan.summary}`);
      if (turn.status === 'failed') this.log(`Failed: ${turn.message.slice(0, 200)}`);
      if (!this.isOpen() && turn.status !== 'stopped') toast(turn.status === 'failed' ? 'AI request failed — open ✦ AI Agent for details' : `AI: ${turn.plan?.summary || STATUS_LABEL[turn.status]}`, turn.status === 'failed');
    } else {
      this.state(turn.status === 'repairing' ? `The model's plan had a problem — asking it to fix it (attempt ${turn.attempts})…` : 'Waiting for the model…', 'busy');
    }
  }

  onDelta() {
    if (this._deltaFrame) return;
    this._deltaFrame = requestAnimationFrame(() => { this._deltaFrame = null; this.refreshStreaming(); });
  }

  /* Updates only the live turn's streaming text, thinking and meta in place. */
  refreshStreaming() {
    const turn = this.session.turns[this.session.turns.length - 1];
    if (!turn || !['streaming', 'repairing'].includes(turn.status)) return;
    const card = this.transcriptEl.querySelector(`[data-turn="${turn.id}"]`);
    if (!card) return;
    const meta = card.querySelector('.ag-meta');
    if (meta) { meta.innerHTML = ''; meta.append(...this.metaNodes(turn)); }
    const stream = card.querySelector('.ag-stream');
    if (stream) { stream.textContent = turn.text ? turn.text.slice(-1600) : '…'; stream.scrollTop = stream.scrollHeight; }
    const think = card.querySelector('.ag-thinking');
    if (turn.thinking) {
      if (!think) { this.renderTranscript(); return; }
      think.querySelector('summary').textContent = `Thinking (${fmtK(turn.thinking.length)} chars)`;
      const pre = think.querySelector('pre');
      pre.textContent = turn.thinking.slice(-2400);
      pre.scrollTop = pre.scrollHeight;
    }
    this.scrollToBottom(true);
  }

  metaNodes(turn) {
    const nodes = [el('span', { class: `ag-status ${turn.status}` }, STATUS_LABEL[turn.status] || turn.status, ['streaming', 'repairing'].includes(turn.status) ? el('span', { class: 'ag-dots' }) : null)];
    const secs = ((turn.finishedAt || Date.now()) - turn.startedAt) / 1000;
    nodes.push(el('span', { text: `${secs.toFixed(1)} s` }));
    const out = turn.usage ? turn.usage.output : Math.round((turn.text.length + turn.thinking.length) / 3.5);
    if (out) nodes.push(el('span', { text: `${turn.usage ? '' : '~'}${fmtK(out)} tokens out${turn.usage && turn.usage.input ? ` · ${fmtK(turn.usage.input)} in` : ''}` }));
    if (turn.attempts > 1) nodes.push(el('span', { text: `attempt ${turn.attempts}` }));
    if (turn.detail) nodes.push(el('span', { text: `${turn.detail} context` }));
    return nodes;
  }

  names() {
    const p = this.app.state.project;
    const tracks = {}; const sfx = {};
    for (const t of p.tracks) tracks[t.id] = t.name;
    for (const s of p.sfx || []) sfx[s.id] = s.name;
    return { tracks, sfx };
  }

  renderTranscript() {
    const host = this.transcriptEl;
    const nearBottom = host.scrollHeight - host.scrollTop - host.clientHeight < 80;
    host.innerHTML = '';
    const turns = this.session.turns;
    if (!turns.length) host.append(this.renderWelcome());
    const names = this.names();
    const lastApplied = [...turns].reverse().find((t) => t.status === 'applied');
    for (const turn of turns) host.append(this.renderTurn(turn, names, turn === lastApplied));
    if (turns.length) host.append(el('div', { class: 'ag-chips' }));
    this.renderChips();
    if (nearBottom || this.session.busy) this.scrollToBottom();
  }

  scrollToBottom(onlyIfNear = false) {
    const host = this.transcriptEl;
    if (onlyIfNear && host.scrollHeight - host.scrollTop - host.clientHeight > 160) return;
    host.scrollTop = host.scrollHeight;
  }

  renderWelcome() {
    const wrap = el('div', { class: 'ag-welcome' },
      el('h4', { text: 'Design Michi-Neko\'s audio by describing it.' }),
      el('div', { text: 'Compose cues, remix what\'s here, design sound effects, polish the mix or just ask. Every change is one Ctrl+Z away.' }));
    if (!this.cfg.everConnected) {
      wrap.append(el('div', { class: 'ag-onboard' },
        el('button', { type: 'button', 'data-onboard': 'local' }, '🖥 Local model with llama-server', el('small', { text: 'Free and private. Run llama-server with any instruct model (7B+ works; 14B+ is great), then Test connection.' })),
        el('button', { type: 'button', 'data-onboard': 'lmstudio' }, '🧩 LM Studio or Ollama', el('small', { text: 'Already use one? Pick it in Settings — dawCAT knows their default ports.' })),
        el('button', { type: 'button', 'data-onboard': 'cloud' }, '☁ Cloud API', el('small', { text: 'Anthropic, OpenAI, Gemini, OpenRouter, Groq, Mistral, DeepSeek or xAI with your own key.' }))));
    }
    wrap.append(el('div', { class: 'ag-hint', text: 'Try one of these:' }), el('div', { class: 'ag-chips' }));
    return wrap;
  }

  renderTurn(turn, names, isLastApplied) {
    const user = el('div', { class: 'ag-user' }, el('span', { class: 'ag-mode-tag', text: (MODES[turn.mode] || MODES.free).label }), turn.prompt);
    const card = el('div', { class: `ag-card ${turn.status}` }, el('div', { class: 'ag-meta' }, ...this.metaNodes(turn)));
    const live = ['streaming', 'repairing'].includes(turn.status);
    if (turn.thinking) {
      const d = el('details', { class: 'ag-thinking' }, el('summary', { text: `Thinking (${fmtK(turn.thinking.length)} chars)` }), el('pre', { text: turn.thinking.slice(-2400) }));
      if (live && !turn.text) d.open = true;
      card.append(d);
    }
    if (live) card.append(el('pre', { class: 'ag-stream', text: turn.text ? turn.text.slice(-1600) : '…' }));
    const plan = turn.plan;
    if (!live && plan) {
      if (plan.reply) card.append(el('div', { class: 'ag-reply', text: plan.reply }));
      if (plan.summary && plan.actions.length) card.append(el('div', { class: 'ag-summary', text: plan.summary }));
      if (plan.actions.length) {
        const items = plan.actions.map((a) => el('li', { title: JSON.stringify(a.params), text: describeAction(a, names) }));
        if (items.length > 10) {
          card.append(el('ul', { class: 'ag-actions-list' }, ...items.slice(0, 8)),
            el('details', {}, el('summary', { class: 'ag-hint', text: `${items.length - 8} more change(s)` }), el('ul', { class: 'ag-actions-list' }, ...items.slice(8))));
        } else card.append(el('ul', { class: 'ag-actions-list' }, ...items));
      }
      for (const c of plan.caveats || []) card.append(el('div', { class: 'ag-caveat', text: `⚠ ${c}` }));
    }
    if (turn.status === 'failed' || turn.status === 'stopped') card.append(el('div', { class: 'ag-error', text: turn.message }));
    if (turn.repairs && turn.repairs.length && !live) {
      card.append(el('details', { class: 'ag-repairs' }, el('summary', { text: turn.status === 'failed' ? `${turn.repairs.length} problem(s) it couldn't fix` : `Self-repaired ${turn.attempts - 1} time(s)` }),
        el('ul', { class: 'ag-actions-list' }, ...turn.repairs.slice(0, 12).map((r) => el('li', { text: r })))));
    }
    const btns = el('div', { class: 'ag-buttons' });
    const b = (action, text, title, primary) => el('button', { class: `ag-btn small${primary ? ' primary' : ''}`, type: 'button', 'data-action': action, 'data-turn-id': turn.id, text, title });
    if (turn.status === 'review') btns.append(b('apply', '✓ Apply', 'Apply this plan (one undo step)', true), b('discard', 'Discard', 'Throw this plan away'));
    if (turn.status === 'applied') {
      btns.append(b('listen', '▶ Listen', 'Play what was just made'));
      const canUndo = isLastApplied && turn.result && this.app.state.undoStack.length === turn.result.undoDepth;
      if (canUndo) btns.append(b('undo', '↶ Undo', 'Revert this whole plan'));
      if (turn.result && turn.result.created && turn.result.created.sfx.length) btns.append(b('open-sfx', '✦ Open in Sound Design', 'Fine-tune the new sound'));
    }
    if (!live) btns.append(b('retry', '↻ Retry', 'Ask again with the same prompt'));
    if (plan && plan.actions.length) btns.append(b('copy', 'Copy JSON', 'Copy the plan'));
    if (turn.status === 'failed' && /connect|answer|CORS|HTTPS|Nothing answered|API key|Base URL/i.test(turn.message)) btns.append(b('settings', '⚙ Settings', 'Check the provider settings'));
    if (btns.childNodes.length) card.append(btns);
    return el('div', { class: 'ag-turn', 'data-turn': turn.id }, user, card);
  }

  onTranscriptClick(e) {
    const chip = e.target.closest('[data-chip]');
    if (chip) { this.promptEl.value = chip.dataset.chip; this.promptEl.focus(); return; }
    const onboard = e.target.closest('[data-onboard]');
    if (onboard) {
      const kind = onboard.dataset.onboard;
      this.toggleSettings(true);
      if (kind === 'cloud') { this.switchProvider('anthropic'); this.$('agent-api-key').focus(); }
      else { this.switchProvider(kind); this.$('agent-test').focus(); }
      return;
    }
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const turn = this.session.turn(btn.dataset.turnId);
    if (!turn) return;
    const st = this.app.state;
    switch (btn.dataset.action) {
      case 'apply': this.session.applyTurn(turn.id); break;
      case 'discard': this.session.discardTurn(turn.id); break;
      case 'retry': this.session.retry(turn.id); break;
      case 'copy': navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(turn.plan, null, 2)).then(() => toast('Plan copied')); break;
      case 'settings': this.toggleSettings(true); break;
      case 'undo':
        st.undo();
        this.session.markUndone(turn.id);
        toast('Reverted the AI changes');
        break;
      case 'open-sfx':
        st.selectSfx(turn.result.created.sfx[0]);
        this.app.openSoundDesign();
        break;
      case 'listen': this.listen(turn); break;
      default: break;
    }
  }

  /* Plays what a turn made: its first new sound, or the arrangement from the
     earliest clip it created (else from the start). */
  listen(turn) {
    const app = this.app;
    const created = (turn.result && turn.result.created) || { sfx: [], clips: [] };
    const sfx = created.sfx.map((id) => app.state.sfxById(id)).filter(Boolean);
    if (sfx.length) {
      app.engine.resume().then(() => sfx.forEach((s, i) => setTimeout(() => app.engine.previewSfx(s), i * 900)));
      return;
    }
    let startBar = 0;
    const starts = [];
    for (const t of app.state.project.tracks) for (const c of t.clips) if (created.clips.includes(c.id)) starts.push(c.start);
    if (starts.length) startBar = Math.min(...starts);
    app.transport.stop();
    app.transport.seek(startBar * 4);
    app.transport.play();
  }

  /* ---------------- misc ---------------- */

  copyExchange() {
    const x = this.session.lastExchange;
    if (!x) { toast('No request yet'); return; }
    const text = `POST ${x.url}\n${JSON.stringify(x.headers, null, 2)}\n\n${JSON.stringify(x.body, null, 2)}\n\n--- HTTP ${x.status} ---\n${x.responseText}`;
    navigator.clipboard && navigator.clipboard.writeText(text).then(() => toast('Copied (API key redacted)'));
  }

  state(message, mode = '') {
    const node = this.$('agent-state');
    node.textContent = message;
    node.className = `agent-state ${mode}`.trim();
  }

  log(message) {
    const line = `${new Date().toLocaleTimeString()} · ${message}`;
    this.logLines.unshift(line);
    this.logLines = this.logLines.slice(0, 200);
    const host = this.root && this.root.querySelector('#agent-log');
    if (host) host.prepend(el('div', { text: line }));
  }

  /* ---------------- open / close ---------------- */

  open(opts = {}) {
    if (opts.mode) this.setMode(opts.mode);
    this.root.classList.add('open');
    document.getElementById('menu-ai-agent')?.classList.add('on');
    if (opts.prompt) { this.promptEl.value = opts.prompt; }
    this.updateEstimate();
    requestAnimationFrame(() => { this.promptEl.focus(); this.promptEl.setSelectionRange(this.promptEl.value.length, this.promptEl.value.length); this.scrollToBottom(); });
  }

  close() {
    this.root.classList.remove('open');
    document.getElementById('menu-ai-agent')?.classList.remove('on');
  }

  toggle(opts) { if (this.isOpen() && !(opts && (opts.mode || opts.prompt))) this.close(); else this.open(opts); }
  isOpen() { return this.root.classList.contains('open'); }
}
