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
   response comes back, no separate confirm step. Opened by the "✦ AI Agent"
   button in the menu bar (one click, no dropdown); closing it does not cancel
   an in-flight request, so generation keeps running in the background and the
   panel just shows whatever state it's in when reopened. */
import { normalizeAgentSettings, normalizeBaseUrl, createProviderRequest, createModelsRequest, extractModelList, extractJson, extractProviderText, isTruncatedResponse, validateAgentPlan } from '../agent-protocol.js';

const SETTINGS_KEY = 'michi-neko-dawcat-agent-settings-v1';
const $ = (selector, root = document) => root.querySelector(selector);

const PRESETS = {
  local: { baseUrl: 'http://127.0.0.1:8080/v1', model: 'local-model' },
  custom: { baseUrl: 'http://127.0.0.1:3000/v1', model: 'custom-model' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-5.2' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-5.2' },
  anthropic: { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-opus-5' }
};

const MODE_HINTS = {
  remix: 'Remix — rework the song cue already loaded in the project: new takes on its clips, presets, FX and mix.',
  write: 'Write — compose a brand-new piece from your prompt, building fresh tracks and clips.',
  free: 'Free — adjust anything in the composition: add or remove tracks, clips, devices, mix and tempo.'
};

// Loopback is "potentially trustworthy" per the Secure Contexts spec, so it is
// exempt from mixed-content blocking — but a page on a public HTTPS origin is
// still stopped from opening connections into the local network by a separate
// rule, so https -> local fails either way, just for different reasons.
const LOOPBACK_HOST = /^(localhost|[^.]+\.localhost|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|\[?::1\]?)$/i;
const PRIVATE_LAN_HOST = /^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/;
const HTTP_SERVE_HINT = 'from the repo root run "python -m http.server 8000" and open http://localhost:8000/dawCAT/';

// llama-server reports a model by its absolute .gguf path — 100+ unreadable
// characters in a dropdown. Show just the filename for those, and leave
// ordinary ids (including OpenRouter's "vendor/model" form) exactly as they
// are. Only the label changes; the option's value stays the real id.
function modelLabel(id) {
  const text = String(id);
  const looksLikePath = /\.gguf$/i.test(text) || (text.length > 48 && text.split(/[\\/]/).length > 2);
  if (!looksLikePath) return text;
  return text.split(/[\\/]/).pop().replace(/\.gguf$/i, '') || text;
}

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
    this.setMode('free');
    this.log('Agent harness initialized');
    this.warnIfInsecureOrigin();
  }

  bind() {
    $('#agent-close').addEventListener('click', () => this.close());
    // Switching service swaps in that provider's defaults and drops the model
    // list from the previous one — those ids don't exist on the new endpoint.
    $('#agent-provider').addEventListener('change', () => {
      const preset = PRESETS[$('#agent-provider').value];
      $('#agent-base-url').value = preset.baseUrl;
      $('#agent-model').value = preset.model;
      this.setModelOptions([]);
      this.saveSettings();
    });
    for (const id of ['agent-base-url', 'agent-model', 'agent-api-key', 'agent-temperature', 'agent-top-p', 'agent-max-tokens', 'agent-reasoning']) $(`#${id}`).addEventListener('change', () => { this.syncBaseUrl(); this.saveSettings(); });
    // The text input is the source of truth; picking from the scanned list
    // just writes into it, so a typed id and a scanned id are the same thing.
    $('#agent-model-select').addEventListener('change', (e) => { if (e.target.value) { $('#agent-model').value = e.target.value; this.saveSettings(); } });
    $('#agent-scan-models').addEventListener('click', () => this.scanModels());
    document.querySelectorAll('.agent-modes button[data-mode]').forEach((button) => {
      button.addEventListener('click', () => this.setMode(button.dataset.mode));
    });
    $('#agent-send').addEventListener('click', () => this.generate());
    $('#agent-stop').addEventListener('click', () => this.stop());
    $('#agent-undo').addEventListener('click', () => this.callbacks.undo?.());
    $('#agent-export-plan').addEventListener('click', () => this.plan && download(`dawcat-agent-plan-${Date.now()}.json`, JSON.stringify(this.plan, null, 2)));
  }

  // Shows the address actually being called. Pasting llama-server's own
  // "http://0.0.0.0:8080" banner into Base URL is the natural thing to do and
  // silently wrong, so normalizeBaseUrl() rewrites the host — write the result
  // back into the field rather than calling one address while showing another.
  syncBaseUrl() {
    const field = $('#agent-base-url');
    const fixed = normalizeBaseUrl(field.value);
    if (fixed && fixed !== field.value.trim().replace(/\/+$/, '')) {
      this.log(`Base URL ${field.value} → ${fixed} (0.0.0.0 is a listen-on-everything address, not one you can connect to)`);
      field.value = fixed;
    }
  }

  // Says this up front rather than after a failed Send: served over HTTPS, no
  // local provider is reachable at all, and no Base URL edit changes that.
  warnIfInsecureOrigin() {
    if (location.protocol !== 'https:') return;
    this.state(`dawCAT is being served over HTTPS (${location.origin}), so the browser will block it from reaching any local AI server — loopback included. Cloud providers (OpenAI, Anthropic, OpenRouter) still work. To use a local llama-server, ${HTTP_SERVE_HINT}.`, 'error');
    this.log('Served over HTTPS — local providers are unreachable from this origin');
  }

  setMode(mode) {
    this.mode = MODE_HINTS[mode] ? mode : 'free';
    document.querySelectorAll('.agent-modes button[data-mode]').forEach((b) => b.classList.toggle('active', b.dataset.mode === this.mode));
    $('#agent-mode-hint').textContent = MODE_HINTS[this.mode];
  }

  // Fills the scanned-model dropdown. The first option is always the "no
  // list yet" placeholder, so an empty list (or a provider switch) leaves a
  // dropdown that explains itself rather than an empty one.
  setModelOptions(models) {
    const select = $('#agent-model-select');
    const head = models.length ? `<option value="">— ${models.length} model(s) from this API —</option>` : '<option value="">— scan to list this API\'s models —</option>';
    // llama-server reports a model by its full .gguf path, which is 100+
    // unreadable characters in a dropdown. Label it with the filename and
    // keep the real id as the value, since that is what gets sent.
    select.innerHTML = head + models.map((m) => `<option value="${escapeHtml(m)}" title="${escapeHtml(m)}">${escapeHtml(modelLabel(m))}</option>`).join('');
    select.value = models.includes($('#agent-model').value) ? $('#agent-model').value : '';
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

  // A browser throws the same opaque "Failed to fetch" TypeError whether the
  // server is down, on another port, blocked as mixed content, or answering
  // fine but without CORS headers. This works out which one it actually was
  // so the panel can say something useful, instead of listing all four and
  // leaving you to guess.
  //
  // The discriminator is a mode:"no-cors" probe: it reaches the server
  // without needing any CORS header back (the response is opaque, which is
  // fine — we only care that it resolved). If THAT succeeds, something is
  // listening and the real block was CORS. If it fails too, nothing answered
  // at that address at all.
  async diagnoseNetworkFailure(url) {
    let target;
    try { target = new URL(url); } catch { return `"${url}" is not a valid URL. It should look like http://127.0.0.1:8080/v1`; }
    const where = `${target.protocol}//${target.host}`;
    // These messages suggest a value for the Base URL field, so drop the
    // endpoint this request happened to append to it.
    const basePath = target.pathname.replace(/\/(models|chat\/completions|messages)$/, '');

    if (location.protocol === 'https:' && target.protocol === 'http:') {
      // Two different browser rules land here, and naming the wrong one sends
      // you chasing the wrong fix — the remedy is the same, but "just use
      // 127.0.0.1" is NOT it: a public HTTPS page can't reach loopback either.
      const mechanism = LOOPBACK_HOST.test(target.hostname)
        ? `Loopback addresses like ${target.hostname} are exempt from mixed-content blocking, but a browser still refuses to let a page on an HTTPS site open a connection into your local network, so switching between 127.0.0.1 and localhost will not help`
        : `A browser will not let an HTTPS page call a plain-http:// address like ${where} — the request is blocked as mixed content and never leaves the page`;
      const extra = [];
      if (PRIVATE_LAN_HOST.test(target.hostname)) {
        extra.push(`${target.hostname} is an address on your local network — if llama-server is running on this same machine, 127.0.0.1 is the address you want`);
        if (/\.1$/.test(target.hostname)) extra.push(`and ${target.hostname} specifically is the usual address of a home router, not of your own computer, so llama-server is very unlikely to be there`);
      }
      return `dawCAT is being served over HTTPS (${location.origin}) — that is what is blocking this, not llama-server. ${mechanism}. Serve dawCAT over plain http instead: ${HTTP_SERVE_HINT}.${extra.length ? ' Also: ' + extra.join(', ') + '.' : ''}`;
    }

    let reachable = false;
    try { await fetch(where, { mode: 'no-cors' }); reachable = true; } catch { /* really unreachable */ }

    if (reachable) {
      return `${where} is running and answering, but it did not allow this page to read the response — that's a CORS block, not a connection problem. Restart the server so it allows cross-origin requests from ${location.origin} (llama-server: it allows any origin by default, so check you're not behind a proxy that strips the headers).`;
    }

    const hints = [];
    if (target.hostname === 'localhost') hints.push(`try 127.0.0.1 instead of localhost — "localhost" can resolve to the IPv6 address ::1, and a server started with --host 0.0.0.0 is listening on IPv4 only, so nothing answers on ::1`);
    if (!target.port) hints.push(`no port in the Base URL, so this is going to ${target.protocol === 'https:' ? '443' : '80'} — llama-server's default is 8080, so you probably want ${target.protocol}//${target.hostname}:8080${basePath}`);
    if (target.port && target.port === location.port && target.hostname === location.hostname) hints.push(`that is the same address dawCAT itself is served from, so this request is hitting dawCAT's own static file server rather than llama-server — put llama-server on a different port`);
    hints.push('check the server is still running, and that the port matches the one it printed on startup');
    const detail = hints.join('; ');
    return `Nothing answered at ${where}. ${detail.charAt(0).toUpperCase()}${detail.slice(1)}.`;
  }

  // Something answered, but not with JSON. Overwhelmingly this means the Base
  // URL points at the wrong server — most often dawCAT's own static file
  // server, whose 404 page comes back as HTML — so say that rather than just
  // dumping the first 200 characters of someone's error page.
  notJsonHint(url, response, text) {
    let target; try { target = new URL(url); } catch { target = null; }
    const sameServer = target && target.host === location.host;
    const what = /^\s*</.test(text) ? 'an HTML page' : `"${text.slice(0, 80)}"`;
    if (sameServer) return `${target.host} answered with ${what} (HTTP ${response.status}), not JSON — that is the address dawCAT itself is served from, so this hit dawCAT's own file server instead of an AI provider. Point Base URL at the server running your model (llama-server's default is http://127.0.0.1:8080/v1).`;
    return `${url} answered with ${what} (HTTP ${response.status}), not JSON. Check the Base URL ends at the API root — for an OpenAI-compatible server that is the part before /models, e.g. http://127.0.0.1:8080/v1`;
  }

  async scanModels() {
    this.syncBaseUrl();
    const settings = this.settings(); this.saveSettings();
    const { url, headers } = createModelsRequest(settings);
    const button = $('#agent-scan-models');
    button.disabled = true;
    this.state(`Scanning models at ${url}…`, 'busy');
    try {
      let response;
      try { response = await fetch(url, { headers }); }
      catch { throw new Error(await this.diagnoseNetworkFailure(url)); }
      const text = await response.text();
      let data; try { data = JSON.parse(text); } catch { throw new Error(this.notJsonHint(url, response, text)); }
      if (!response.ok) throw new Error(data.error?.message || data.message || `Model list HTTP ${response.status}`);
      const models = extractModelList(data);
      this.setModelOptions(models);
      this.state(models.length ? `Loaded ${models.length} model(s) — pick one from the Model dropdown.` : 'Scan succeeded but this API returned no models — type a model id instead.');
      this.log(`Scanned ${models.length} model(s) from ${settings.baseUrl}`);
    } catch (error) {
      this.state(error.message, 'error');
    } finally {
      button.disabled = false;
    }
  }

  async generate() {
    const instruction = $('#agent-prompt').value.trim();
    if (!instruction) return this.state('Describe the melody, rhythm, or idea first.', 'error');
    this.stop(); this.controller = new AbortController(); this.state(`Contacting model (${this.mode})…`, 'busy'); $('#agent-send').disabled = true;
    try {
      this.syncBaseUrl();
      const settings = this.settings(); this.saveSettings();
      if (!['local', 'custom'].includes(settings.provider) && !settings.apiKey) throw new Error(`API key is required for ${settings.provider}`);
      const outbound = createProviderRequest(settings, { instruction, mode: this.mode, context: this.callbacks.getContext() });
      let response;
      try { response = await fetch(outbound.url, { method: 'POST', headers: outbound.headers, body: JSON.stringify(outbound.body), signal: this.controller.signal }); }
      catch (networkError) { if (networkError.name === 'AbortError') throw networkError; throw new Error(await this.diagnoseNetworkFailure(outbound.url)); }
      const text = await response.text();
      let data; try { data = JSON.parse(text); } catch { throw new Error(this.notJsonHint(outbound.url, response, text)); }
      if (!response.ok) throw new Error(data.error?.message || data.message || `Provider HTTP ${response.status}`);
      if (isTruncatedResponse(settings.provider, data)) throw new Error(`The model hit the Max tokens limit (${settings.maxTokens}) before it finished the plan. Reasoning models spend tokens thinking before they answer, so the budget has to cover both — raise Max tokens (try 8000), or set Reasoning to "none".`);
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
