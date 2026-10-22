import { PROVIDER_CATALOG, normalizeAgentSettings, synthesizeBuiltinPlan } from './agent-protocol.mjs';

const SETTINGS_KEY = 'michi-neko-cadjs-agent-settings-v1';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const PRESETS = Object.fromEntries(
  Object.entries(PROVIDER_CATALOG).map(([key, item]) => [key, { baseUrl: item.baseUrl, model: item.model }])
);

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[char]); }
function download(name, text) { const url = URL.createObjectURL(new Blob([text], { type:'application/json' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

async function imageRecord(file) {
  if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) throw new Error(`${file.name}: unsupported image type`);
  if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name}: image exceeds 8 MB`);
  const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  const dimensions = await new Promise((resolve) => { const image = new Image(); image.onload = () => resolve({ width:image.naturalWidth, height:image.naturalHeight }); image.onerror = () => resolve({}); image.src = dataUrl; });
  return { name:file.name, type:file.type, size:file.size, dataUrl, ...dimensions };
}

export class AgentPanel {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.references = [];
    this.history = [];
    this.plan = null;
    this.controller = null;
    this.bind();
    this.loadSettings();
    this.populateModelSuggestions();
    this.renderReferences();
    this.log('Agent harness initialized');
    setTimeout(() => this.probeConnection(true), 400);
  }

  bind() {
    $('#agent-close')?.addEventListener('click', () => this.close());
    $('#agent-provider')?.addEventListener('change', () => {
      const provider = $('#agent-provider').value;
      const preset = PRESETS[provider] || PRESETS.local;
      $('#agent-base-url').value = preset.baseUrl;
      $('#agent-model').value = preset.model;
      this.populateModelSuggestions();
      this.saveSettings();
      this.probeConnection(true);
    });
    for (const id of ['agent-base-url','agent-model','agent-api-key','agent-temperature','agent-top-p','agent-max-tokens','agent-reasoning','agent-autonomy','agent-context','agent-fallback']) {
      $(`#${id}`)?.addEventListener('change', () => this.saveSettings());
    }
    $('#agent-autonomy')?.addEventListener('change', () => this.renderPlan());
    $('#agent-probe')?.addEventListener('click', () => this.probeConnection(false));
    $('#agent-fetch-models')?.addEventListener('click', () => this.probeConnection(false));
    $('#agent-snap-viewport')?.addEventListener('click', () => this.snapViewport());
    $('#agent-clear-chat')?.addEventListener('click', () => {
      this.history = [];
      this.updateMemoryButton();
      this.state('Conversation memory cleared.');
    });
    $$('#agent-recipes [data-recipe]').forEach((chip) => {
      chip.addEventListener('click', () => {
        $('#agent-prompt').value = chip.dataset.recipe;
        $('#agent-prompt').focus();
      });
    });
    $('#agent-prompt')?.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        this.generate();
      }
    });
    $('#agent-upload')?.addEventListener('click', () => $('#agent-image-input').click());
    $('#agent-image-input')?.addEventListener('change', async (event) => { await this.addFiles([...event.target.files]); event.target.value = ''; });
    $('#agent-clear-images')?.addEventListener('click', () => { this.references = []; this.renderReferences(); });
    const strip = $('#agent-references');
    strip?.addEventListener('dragover', (event) => { event.preventDefault(); strip.classList.add('drag'); });
    strip?.addEventListener('dragleave', () => strip.classList.remove('drag'));
    strip?.addEventListener('drop', async (event) => { event.preventDefault(); strip.classList.remove('drag'); await this.addFiles([...event.dataTransfer.files]); });
    $('#agent-send')?.addEventListener('click', () => this.generate());
    $('#agent-instant')?.addEventListener('click', () => this.generateInstantCopilot());
    $('#agent-stop')?.addEventListener('click', () => this.stop());
    $('#agent-run')?.addEventListener('click', () => this.run());
    $('#agent-undo')?.addEventListener('click', () => this.callbacks.undo?.());
    $('#agent-export-plan')?.addEventListener('click', () => this.plan && download(`cadjs-agent-plan-${Date.now()}.json`, JSON.stringify(this.plan, null, 2)));
  }

  open() { $('#agent-panel').classList.add('open'); $('#agent-prompt').focus(); }
  close() { $('#agent-panel').classList.remove('open'); }
  toggle() { $('#agent-panel').classList.contains('open') ? this.close() : this.open(); }

  settings() {
    return normalizeAgentSettings({
      provider: $('#agent-provider')?.value,
      baseUrl: $('#agent-base-url')?.value,
      model: $('#agent-model')?.value,
      apiKey: $('#agent-api-key')?.value,
      temperature: $('#agent-temperature')?.value,
      topP: $('#agent-top-p')?.value,
      maxTokens: $('#agent-max-tokens')?.value,
      reasoning: $('#agent-reasoning')?.value,
      autonomy: $('#agent-autonomy')?.value,
      fallbackToBuiltin: $('#agent-fallback') ? $('#agent-fallback').value !== 'false' : true
    });
  }

  saveSettings() {
    const settings = this.settings();
    sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  loadSettings() {
    let saved = {}; try { saved = JSON.parse(sessionStorage.getItem(SETTINGS_KEY) || '{}'); } catch {}
    const settings = normalizeAgentSettings(saved);
    if ($('#agent-provider')) $('#agent-provider').value = settings.provider;
    if ($('#agent-base-url')) $('#agent-base-url').value = settings.baseUrl;
    if ($('#agent-model')) $('#agent-model').value = settings.model;
    if ($('#agent-api-key')) $('#agent-api-key').value = settings.apiKey;
    if ($('#agent-temperature')) $('#agent-temperature').value = settings.temperature;
    if ($('#agent-top-p')) $('#agent-top-p').value = settings.topP;
    if ($('#agent-max-tokens')) $('#agent-max-tokens').value = settings.maxTokens;
    if ($('#agent-reasoning')) $('#agent-reasoning').value = settings.reasoning;
    if ($('#agent-autonomy')) $('#agent-autonomy').value = settings.autonomy;
    if ($('#agent-fallback')) $('#agent-fallback').value = settings.fallbackToBuiltin ? 'true' : 'false';
  }

  populateModelSuggestions(extraModels = []) {
    const list = $('#agent-model-list');
    if (!list) return;
    const provider = $('#agent-provider')?.value || 'local';
    const meta = PROVIDER_CATALOG[provider];
    const models = [...new Set([...extraModels, ...(meta?.popularModels || [])])];
    list.innerHTML = models.map((m) => `<option value="${escapeHtml(m)}"></option>`).join('');
  }

  updateMemoryButton() {
    const btn = $('#agent-clear-chat');
    if (btn) btn.textContent = `CLEAR MEMORY (${this.history.length})`;
  }

  async probeConnection(silent = false) {
    const badge = $('#agent-conn-badge');
    const bar = $('#agent-discovered-bar');
    const settings = this.settings();
    if (!silent) this.state('Probing AI provider & local llama-server endpoints…', 'busy');
    try {
      const response = await fetch('/api/agent/probe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      const data = await response.json();
      if (Array.isArray(data.models) && data.models.length) {
        this.populateModelSuggestions(data.models);
        if (data.online && ($('#agent-model').value === 'local-model' || !$('#agent-model').value)) {
          $('#agent-model').value = data.models[0];
        }
      }
      if (data.autoSwitched && data.baseUrl) {
        $('#agent-provider').value = data.provider;
        $('#agent-base-url').value = data.baseUrl;
        if (data.models?.[0]) $('#agent-model').value = data.models[0];
        this.saveSettings();
      }
      if (badge) {
        if (data.online) {
          badge.textContent = `${data.provider.toUpperCase()} ONLINE · ${data.latencyMs ?? 1}ms`;
          badge.className = 'conn-badge online';
        } else {
          badge.textContent = settings.fallbackToBuiltin ? 'COPILOT READY' : 'OFFLINE';
          badge.className = 'conn-badge offline';
        }
      }
      if (bar) {
        const discovered = data.discovered || [];
        if (discovered.length) {
          bar.classList.remove('hidden');
          bar.innerHTML = `<span>Detected Local Servers:</span>` + discovered.map((srv, idx) =>
            `<button type="button" data-disc-idx="${idx}">${escapeHtml(srv.label)} (${escapeHtml(srv.models?.[0] || 'model')})</button>`
          ).join('');
          $$('[data-disc-idx]', bar).forEach((btn) => {
            btn.addEventListener('click', () => {
              const srv = discovered[Number(btn.dataset.discIdx)];
              if (!srv) return;
              $('#agent-provider').value = srv.provider;
              $('#agent-base-url').value = srv.baseUrl;
              $('#agent-model').value = srv.models?.[0] || 'local-model';
              this.populateModelSuggestions(srv.models || []);
              this.saveSettings();
              this.state(`Switched to ${srv.label} (${$('#agent-model').value}).`);
            });
          });
        } else {
          bar.classList.add('hidden');
        }
      }
      if (!silent) {
        if (data.online) {
          const ctxNote = data.serverProps?.nCtx ? ` (ctx ${data.serverProps.nCtx})` : '';
          this.state(`Connected to ${data.label || data.provider}${ctxNote} — ${data.models?.length || 1} model(s) available.`);
          this.log(`Probed ${data.provider}: online (${data.latencyMs}ms)`);
        } else {
          this.state(data.hint || 'Endpoint offline. Smart Copilot Fallback is active.');
        }
      }
    } catch (error) {
      if (!silent) this.state(`Probe failed: ${error.message}`, 'error');
    }
  }

  async snapViewport() {
    try {
      const record = await this.callbacks.captureViewport?.();
      if (!record?.dataUrl) throw new Error('Viewport capture unavailable');
      if (this.references.length >= 8) this.references.shift();
      this.references.push(record);
      this.renderReferences();
      this.state('Captured 3D viewport snapshot into Vision References.');
      this.log(`Viewport snapshot added (${record.width}×${record.height})`);
    } catch (error) {
      this.state(error.message, 'error');
    }
  }

  async addFiles(files) {
    try {
      for (const file of files.slice(0, 8 - this.references.length)) this.references.push(await imageRecord(file));
      this.renderReferences(); this.log(`${files.length} reference image(s) added`);
    } catch (error) { this.state(error.message, 'error'); }
  }

  renderReferences() {
    const host = $('#agent-references');
    if (!host) return;
    if (!this.references.length) { host.innerHTML = '<span>Drop/upload PNG/JPEG/WebP or click SNAP VIEWPORT.</span>'; return; }
    host.innerHTML = this.references.map((item, index) => `<div class="reference-card"><img src="${item.dataUrl}" alt=""><button data-remove-reference="${index}">×</button><small>${escapeHtml(item.name)}</small></div>`).join('');
    host.querySelectorAll('[data-remove-reference]').forEach((button) => button.addEventListener('click', () => { this.references.splice(Number(button.dataset.removeReference), 1); this.renderReferences(); }));
  }

  async generateInstantCopilot() {
    const instruction = $('#agent-prompt').value.trim() || 'Build a Kyoto stone lantern on the ground and frame it';
    if (!$('#agent-prompt').value.trim()) $('#agent-prompt').value = instruction;
    try {
      const context = this.callbacks.getContext($('#agent-context').value);
      this.plan = synthesizeBuiltinPlan({ instruction, context, references: this.references });
      this.history.push({ role: 'user', content: instruction }, { role: 'assistant', content: this.plan.summary });
      this.updateMemoryButton();
      this.renderPlan();
      this.log(`Instant Copilot: ${this.plan.summary}`);
      await this.run();
    } catch (error) {
      this.state(error.message, 'error');
    }
  }

  async generate() {
    const instruction = $('#agent-prompt').value.trim();
    if (!instruction) return this.state('Describe the design task first (or click a Quick Recipe chip above).', 'error');
    this.stop(); this.controller = new AbortController(); this.state('Building scene context and contacting AI model…', 'busy'); $('#agent-send').disabled = true;
    try {
      const settings = this.settings(); this.saveSettings();
      const context = this.callbacks.getContext($('#agent-context').value);
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: this.controller.signal,
        body: JSON.stringify({
          settings,
          instruction,
          context,
          references: this.references,
          history: this.history
        })
      });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || `Agent HTTP ${response.status}`);
      this.plan = data.plan;
      this.history.push({ role: 'user', content: instruction }, { role: 'assistant', content: this.plan.summary });
      this.updateMemoryButton();
      this.renderPlan();
      const via = data.fallback ? 'Instant Copilot Fallback' : `${data.provider}/${data.model}`;
      this.state(`Plan ready (${via}): ${this.plan.actions.length} validated action(s).`);
      this.log(`${via}: ${this.plan.summary}`);
      if (settings.autonomy === 'auto') await this.run();
    } catch (error) {
      if (error.name !== 'AbortError') this.state(error.message, 'error');
      else this.state('Request stopped.');
    } finally {
      this.controller = null;
      $('#agent-send').disabled = false;
    }
  }

  stop() { this.controller?.abort(); }

  renderPlan() {
    const host = $('#agent-plan');
    const rBox = $('#agent-reasoning-box');
    $('#agent-run').disabled = !this.plan?.actions?.length || this.settings().autonomy === 'plan';
    if (rBox) {
      if (this.plan?.reasoning) {
        rBox.classList.remove('hidden');
        rBox.textContent = `THINKING TRACE:\n${this.plan.reasoning}`;
      } else {
        rBox.classList.add('hidden');
        rBox.textContent = '';
      }
    }
    if (!this.plan) { host.innerHTML = '<span>No plan generated.</span>'; return; }
    host.innerHTML = `<div class="plan-summary">${escapeHtml(this.plan.summary)}</div>${this.plan.actions.map((action, index) => `<div class="plan-action"><div><b>${index + 1}. ${escapeHtml(action.type)}</b> → ${escapeHtml(action.target)}<br>${escapeHtml(JSON.stringify(action.params))}</div><button type="button" data-run-step="${index}" title="Execute this single step">▶ STEP</button></div>`).join('')}${this.plan.notes.map((note) => `<div>NOTE: ${escapeHtml(note)}</div>`).join('')}`;
    $$('[data-run-step]', host).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idx = Number(btn.dataset.runStep);
        const step = this.plan?.actions?.[idx];
        if (!step) return;
        try {
          await this.callbacks.executePlan({ summary: `${step.type} (${idx + 1})`, actions: [step], notes: [] }, this.references);
          this.state(`Executed step ${idx + 1}: ${step.type}`);
        } catch (err) {
          this.state(err.message, 'error');
        }
      });
    });
  }

  async run() {
    if (!this.plan) return;
    try { const count = await this.callbacks.executePlan(this.plan, this.references); this.state(`Applied ${count} action(s). Use Undo Last or Ctrl+Z to revert.`); this.log(`Executed plan with ${count} action(s)`); }
    catch (error) { this.state(error.message, 'error'); }
  }

  state(message, mode = '') { const node = $('#agent-state'); if (!node) return; node.textContent = message; node.className = `agent-state ${mode}`.trim(); }
  log(message) { const host = $('#agent-log'); if (!host) return; const row = document.createElement('div'); row.textContent = `${new Date().toLocaleTimeString()} · ${message}`; host.prepend(row); }
}