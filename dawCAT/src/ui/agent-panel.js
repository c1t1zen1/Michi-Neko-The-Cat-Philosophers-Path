/* dawCAT — AI composition agent panel. Settings form, Remix/Write/Free Mode
   selector, prompt box, and validated plan preview. Calls the provider (local
   llama-server, a custom OpenAI-compatible endpoint, OpenAI, OpenRouter, or
   Anthropic) DIRECTLY from the browser — no server, no npm, no build step,
   same as every other part of dawCAT. That means it lives or dies by that
   provider's own CORS policy: local inference servers overwhelmingly allow
   cross-origin requests by default (that's the whole point of an OpenAI-
   compatible local endpoint), so this "just works" for the common llama-
   server case; a cloud provider that blocks browser origins will surface as
   a network error here, not a nicer one — there's no proxy left to hide it.

   Plan apply is automatic — the plan runs the instant a full, validated
   response comes back, no separate confirm step. Opened from the AI Agent
   menu; closing it does not cancel an in-flight request, so generation keeps
   running in the background and the panel just shows whatever state it's in
   when reopened. */
import { normalizeAgentSettings, createProviderRequest, createModelsRequest, extractModelList, extractJson, extractProviderText, validateAgentPlan } from '../agent-protocol.js';

const SETTINGS_KEY = 'michi-neko-dawcat-agent-settings-v1';
const $ = (selector, root = document) => root.querySelector(selector);

const PRESETS = {
  local: { baseUrl: 'http://127.0.0.1:8080/v1', model: 'local-model' },
  custom: { baseUrl: 'http://127.0.0.1:3000/v1', model: 'custom-model' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-5.2' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-5.2' },
  anthropic: { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-opus-4-6' }
};

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]); }
function download(name, text) { const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

export class AgentPanel {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.plan = null;
    this.controller = null;
    this.mode = 'free';
    this.bind();
    this.loadSettings();
    this.log('Agent harness initialized');
  }

  bind() {
    $('#agent-close').addEventListener('click', () => this.close());
    $('#agent-provider').addEventListener('change', () => { const preset = PRESETS[$('#agent-provider').value]; $('#agent-base-url').value = preset.baseUrl; $('#agent-model').value = preset.model; this.saveSettings(); });
    for (const id of ['agent-base-url', 'agent-model', 'agent-api-key', 'agent-temperature', 'agent-top-p', 'agent-max-tokens', 'agent-reasoning']) $(`#${id}`).addEventListener('change', () => this.saveSettings());
    $('#agent-scan-models').addEventListener('click', () => this.scanModels());
    document.querySelectorAll('.agent-modes button[data-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        this.mode = button.dataset.mode;
        document.querySelectorAll('.agent-modes button[data-mode]').forEach((b) => b.classList.toggle('active', b === button));
      });
    });
    $('#agent-send').addEventListener('click', () => this.generate());
    $('#agent-stop').addEventListener('click', () => this.stop());
    $('#agent-undo').addEventListener('click', () => this.callbacks.undo?.());
    $('#agent-export-plan').addEventListener('click', () => this.plan && download(`dawcat-agent-plan-${Date.now()}.json`, JSON.stringify(this.plan, null, 2)));
  }

  open() { $('#agent-panel').classList.add('open'); $('#agent-prompt').focus(); this.callbacks.onToggle?.(true); }
  close() { $('#agent-panel').classList.remove('open'); this.callbacks.onToggle?.(false); }
  toggle() { $('#agent-panel').classList.contains('open') ? this.close() : this.open(); }
  isOpen() { return $('#agent-panel').classList.contains('open'); }

  settings() {
    return normalizeAgentSettings({ provider: $('#agent-provider').value, baseUrl: $('#agent-base-url').value, model: $('#agent-model').value, apiKey: $('#agent-api-key').value, temperature: $('#agent-temperature').value, topP: $('#agent-top-p').value, maxTokens: $('#agent-max-tokens').value, reasoning: $('#agent-reasoning').value });
  }

  saveSettings() {
    const settings = this.settings();
    sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  loadSettings() {
    let saved = {}; try { saved = JSON.parse(sessionStorage.getItem(SETTINGS_KEY) || '{}'); } catch {}
    const settings = normalizeAgentSettings(saved);
    $('#agent-provider').value = settings.provider; $('#agent-base-url').value = settings.baseUrl; $('#agent-model').value = settings.model; $('#agent-api-key').value = settings.apiKey;
    $('#agent-temperature').value = settings.temperature; $('#agent-top-p').value = settings.topP; $('#agent-max-tokens').value = settings.maxTokens; $('#agent-reasoning').value = settings.reasoning;
  }

  // Turns a fetch()-level failure (wrong port, server not running, or a CORS
  // block) into a message that actually points at the fix, instead of the
  // opaque "Failed to fetch" TypeError the browser throws for all three.
  networkErrorHint(url) {
    return `Could not reach ${url}. Check that the server is running at that Base URL/port, and that it allows cross-origin requests from this page (CORS) — most local inference servers (llama-server, LM Studio, Ollama's OpenAI-compatible endpoint) allow this by default.`;
  }

  async scanModels() {
    const settings = this.settings(); this.saveSettings();
    const { url, headers } = createModelsRequest(settings);
    this.state(`Scanning models at ${url}…`, 'busy');
    try {
      let response;
      try { response = await fetch(url, { headers }); }
      catch { throw new Error(this.networkErrorHint(url)); }
      const text = await response.text();
      let data; try { data = JSON.parse(text); } catch { throw new Error('Model list response was not JSON.'); }
      if (!response.ok) throw new Error(data.error?.message || data.message || `Model list HTTP ${response.status}`);
      const models = extractModelList(data);
      const listEl = $('#agent-model-list');
      listEl.innerHTML = models.map((m) => `<option value="${escapeHtml(m)}">`).join('');
      this.state(models.length ? `Found ${models.length} model(s) — click the Model field to pick one.` : 'Scan succeeded but returned no models.');
      this.log(`Scanned ${models.length} model(s) from ${settings.baseUrl}`);
    } catch (error) {
      this.state(error.message, 'error');
    }
  }

  async generate() {
    const instruction = $('#agent-prompt').value.trim();
    if (!instruction) return this.state('Describe the melody, rhythm, or idea first.', 'error');
    this.stop(); this.controller = new AbortController(); this.state(`Contacting model (${this.mode})…`, 'busy'); $('#agent-send').disabled = true;
    try {
      const settings = this.settings(); this.saveSettings();
      if (!['local', 'custom'].includes(settings.provider) && !settings.apiKey) throw new Error(`API key is required for ${settings.provider}`);
      const outbound = createProviderRequest(settings, { instruction, mode: this.mode, context: this.callbacks.getContext() });
      let response;
      try { response = await fetch(outbound.url, { method: 'POST', headers: outbound.headers, body: JSON.stringify(outbound.body), signal: this.controller.signal }); }
      catch (networkError) { if (networkError.name === 'AbortError') throw networkError; throw new Error(this.networkErrorHint(outbound.url)); }
      const text = await response.text();
      let data; try { data = JSON.parse(text); } catch { throw new Error('Provider did not return JSON: ' + text.slice(0, 200)); }
      if (!response.ok) throw new Error(data.error?.message || data.message || `Provider HTTP ${response.status}`);
      this.plan = validateAgentPlan(extractJson(extractProviderText(settings.provider, data)));
      this.log(`${settings.provider}/${settings.model} [${this.mode}]: ${this.plan.summary}`);
      // Apply automatically — no confirmation step. A bad plan rolls the
      // project back completely (see AppState.applyBatch), so this can't
      // half-apply and leave a mess.
      await this.run();
    } catch (error) { if (error.name !== 'AbortError') this.state(error.message, 'error'); else this.state('Request stopped.'); }
    finally { this.controller = null; $('#agent-send').disabled = false; }
  }

  stop() { this.controller?.abort(); }

  renderPlan() {
    const host = $('#agent-plan');
    if (!this.plan) { host.innerHTML = '<span>No plan yet.</span>'; return; }
    host.innerHTML = `<div class="plan-summary">${escapeHtml(this.plan.summary)}</div>${this.plan.actions.map((action, index) => `<div class="plan-action"><b>${index + 1}. ${escapeHtml(action.type)}</b> → ${escapeHtml(action.target)}<br>${escapeHtml(JSON.stringify(action.params))}</div>`).join('')}${this.plan.caveats.map((note) => `<div>NOTE: ${escapeHtml(note)}</div>`).join('')}`;
  }

  async run() {
    if (!this.plan) return;
    try {
      const count = await this.callbacks.executePlan(this.plan);
      this.renderPlan();
      this.state(`Applied ${count} action(s). Use Undo Last or Ctrl+Z to revert.`);
      this.log(`Executed plan with ${count} action(s)`);
    } catch (error) {
      this.renderPlan();
      this.state(`Plan failed and was rolled back: ${error.message}`, 'error');
    }
  }

  state(message, mode = '') { const node = $('#agent-state'); node.textContent = message; node.className = `agent-state ${mode}`.trim(); }
  log(message) { const host = $('#agent-log'); const row = document.createElement('div'); row.textContent = `${new Date().toLocaleTimeString()} · ${message}`; host.prepend(row); }
}
