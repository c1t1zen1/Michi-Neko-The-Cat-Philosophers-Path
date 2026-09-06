import { normalizeAgentSettings } from './agent-protocol.mjs';

const SETTINGS_KEY = 'michi-neko-cadjs-agent-settings-v1';
const $ = (selector, root = document) => root.querySelector(selector);

const PRESETS = {
  local: { baseUrl: 'http://127.0.0.1:8080/v1', model: 'local-model' },
  mcp: { baseUrl: 'http://127.0.0.1:3000/v1', model: 'agent-model' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-5.2' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-5.2' },
  anthropic: { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-6' }
};

function escapeHtml(value) { return String(value ?? '').replace(/[&<>\"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[char]); }
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
    this.plan = null;
    this.controller = null;
    this.bind();
    this.loadSettings();
    this.renderReferences();
    this.log('Agent harness initialized');
  }

  bind() {
    $('#agent-close').addEventListener('click', () => this.close());
    $('#agent-provider').addEventListener('change', () => { const preset = PRESETS[$('#agent-provider').value]; $('#agent-base-url').value = preset.baseUrl; $('#agent-model').value = preset.model; this.saveSettings(); });
    for (const id of ['agent-base-url','agent-model','agent-api-key','agent-temperature','agent-top-p','agent-max-tokens','agent-reasoning','agent-autonomy','agent-context']) $(`#${id}`).addEventListener('change', () => this.saveSettings());
    $('#agent-autonomy').addEventListener('change', () => this.renderPlan());
    $('#agent-upload').addEventListener('click', () => $('#agent-image-input').click());
    $('#agent-image-input').addEventListener('change', async (event) => { await this.addFiles([...event.target.files]); event.target.value = ''; });
    $('#agent-clear-images').addEventListener('click', () => { this.references = []; this.renderReferences(); });
    const strip = $('#agent-references');
    strip.addEventListener('dragover', (event) => { event.preventDefault(); strip.classList.add('drag'); });
    strip.addEventListener('dragleave', () => strip.classList.remove('drag'));
    strip.addEventListener('drop', async (event) => { event.preventDefault(); strip.classList.remove('drag'); await this.addFiles([...event.dataTransfer.files]); });
    $('#agent-send').addEventListener('click', () => this.generate());
    $('#agent-stop').addEventListener('click', () => this.stop());
    $('#agent-run').addEventListener('click', () => this.run());
    $('#agent-undo').addEventListener('click', () => this.callbacks.undo?.());
    $('#agent-export-plan').addEventListener('click', () => this.plan && download(`cadjs-agent-plan-${Date.now()}.json`, JSON.stringify(this.plan, null, 2)));
  }

  open() { $('#agent-panel').classList.add('open'); $('#agent-prompt').focus(); }
  close() { $('#agent-panel').classList.remove('open'); }
  toggle() { $('#agent-panel').classList.contains('open') ? this.close() : this.open(); }

  settings() {
    return normalizeAgentSettings({ provider:$('#agent-provider').value, baseUrl:$('#agent-base-url').value, model:$('#agent-model').value, apiKey:$('#agent-api-key').value, temperature:$('#agent-temperature').value, topP:$('#agent-top-p').value, maxTokens:$('#agent-max-tokens').value, reasoning:$('#agent-reasoning').value, autonomy:$('#agent-autonomy').value });
  }

  saveSettings() {
    const settings = this.settings();
    sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  loadSettings() {
    let saved = {}; try { saved = JSON.parse(sessionStorage.getItem(SETTINGS_KEY) || '{}'); } catch {}
    const settings = normalizeAgentSettings(saved);
    $('#agent-provider').value = settings.provider; $('#agent-base-url').value = settings.baseUrl; $('#agent-model').value = settings.model; $('#agent-api-key').value = settings.apiKey;
    $('#agent-temperature').value = settings.temperature; $('#agent-top-p').value = settings.topP; $('#agent-max-tokens').value = settings.maxTokens; $('#agent-reasoning').value = settings.reasoning; $('#agent-autonomy').value = settings.autonomy;
  }

  async addFiles(files) {
    try {
      for (const file of files.slice(0, 8 - this.references.length)) this.references.push(await imageRecord(file));
      this.renderReferences(); this.log(`${files.length} reference image(s) added`);
    } catch (error) { this.state(error.message, 'error'); }
  }

  renderReferences() {
    const host = $('#agent-references');
    if (!this.references.length) { host.innerHTML = '<span>Drop or upload PNG/JPEG/WebP references.</span>'; return; }
    host.innerHTML = this.references.map((item, index) => `<div class="reference-card"><img src="${item.dataUrl}" alt=""><button data-remove-reference="${index}">×</button><small>${escapeHtml(item.name)}</small></div>`).join('');
    host.querySelectorAll('[data-remove-reference]').forEach((button) => button.addEventListener('click', () => { this.references.splice(Number(button.dataset.removeReference), 1); this.renderReferences(); }));
  }

  async generate() {
    const instruction = $('#agent-prompt').value.trim();
    if (!instruction) return this.state('Describe the design task first.', 'error');
    this.stop(); this.controller = new AbortController(); this.state('Building context and contacting model…', 'busy'); $('#agent-send').disabled = true;
    try {
      const settings = this.settings(); this.saveSettings();
      const response = await fetch('/api/agent', { method:'POST', headers:{ 'content-type':'application/json' }, signal:this.controller.signal, body:JSON.stringify({ settings, instruction, context:this.callbacks.getContext($('#agent-context').value), references:this.references }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || `Agent HTTP ${response.status}`);
      this.plan = data.plan; this.renderPlan(); this.state(`Plan ready: ${this.plan.actions.length} validated action(s).`); this.log(`${data.provider}/${data.model}: ${this.plan.summary}`);
      if (settings.autonomy === 'auto') await this.run();
    } catch (error) { if (error.name !== 'AbortError') this.state(error.message, 'error'); else this.state('Request stopped.'); }
    finally { this.controller = null; $('#agent-send').disabled = false; }
  }

  stop() { this.controller?.abort(); }

  renderPlan() {
    const host = $('#agent-plan'); $('#agent-run').disabled = !this.plan?.actions?.length || this.settings().autonomy === 'plan';
    if (!this.plan) { host.innerHTML = '<span>No plan generated.</span>'; return; }
    host.innerHTML = `<div class="plan-summary">${escapeHtml(this.plan.summary)}</div>${this.plan.actions.map((action, index) => `<div class="plan-action"><b>${index + 1}. ${escapeHtml(action.type)}</b> → ${escapeHtml(action.target)}<br>${escapeHtml(JSON.stringify(action.params))}</div>`).join('')}${this.plan.notes.map((note) => `<div>NOTE: ${escapeHtml(note)}</div>`).join('')}`;
  }

  async run() {
    if (!this.plan) return;
    try { const count = await this.callbacks.executePlan(this.plan, this.references); this.state(`Applied ${count} action(s). Use Undo Last or Ctrl+Z to revert.`); this.log(`Executed plan with ${count} action(s)`); }
    catch (error) { this.state(error.message, 'error'); }
  }

  state(message, mode = '') { const node = $('#agent-state'); node.textContent = message; node.className = `agent-state ${mode}`.trim(); }
  log(message) { const host = $('#agent-log'); const row = document.createElement('div'); row.textContent = `${new Date().toLocaleTimeString()} · ${message}`; host.prepend(row); }
}