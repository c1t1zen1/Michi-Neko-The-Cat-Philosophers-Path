export class UI {
  constructor() {
    this.scoreEl = document.getElementById('score');
    this.rankEl = document.getElementById('rank');
    this.questNameEl = document.getElementById('quest-name');
    this.questFillEl = document.getElementById('quest-fill');
    this.modeEl = document.getElementById('mode');
    this.timeWeatherEl = document.getElementById('time-weather');
    this.badgeKey = document.getElementById('badge-key');
    this.badgeFeather = document.getElementById('badge-feather');
    this.xpFill = document.getElementById('xp-fill');
    this.xpLabel = document.getElementById('xp-label');
    this.toastStack = document.getElementById('toast-stack');
    this.debugOverlay = document.getElementById('debug-overlay');

    this.hintsEnabled = true;
    this.debugVisible = false;
    this.fpsAccum = 0;
    this.fpsFrames = 0;
    this.fps = 60;
    this.debugTimer = 0;

    // Hint pill button
    const hintBtn = document.getElementById('hint-toggle-btn');
    if (hintBtn) {
      hintBtn.addEventListener('click', () => {
        this.hintsEnabled = !this.hintsEnabled;
        hintBtn.textContent = `Hints: ${this.hintsEnabled ? 'ON' : 'OFF'}`;
        hintBtn.classList.toggle('off', !this.hintsEnabled);
        this.modeEl.style.display = this.hintsEnabled ? '' : 'none';
      });
    }

    // HUD parchment scroll (emakimono) unroll / roll-up toggle
    const scrollBtn = document.getElementById('scroll-toggle-btn');
    const hudScroll = document.getElementById('hud-scroll');
    const scrollArrow = document.getElementById('scroll-arrow');
    if (scrollBtn && hudScroll) {
      const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      if (isMobile) {
        hudScroll.classList.add('collapsed');
        if (scrollArrow) scrollArrow.textContent = '▼';
        scrollBtn.setAttribute('aria-expanded', 'false');
      }

      scrollBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const collapsed = hudScroll.classList.toggle('collapsed');
        if (scrollArrow) scrollArrow.textContent = collapsed ? '▼' : '▲';
        scrollBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      });
    }

    // F3 debug toggle
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        this.debugVisible = !this.debugVisible;
        this.debugOverlay.classList.toggle('hidden', !this.debugVisible);
      }
    });
  }

  setHints(enabled) {
    this.hintsEnabled = enabled;
    const btn = document.getElementById('hint-toggle-btn');
    if (btn) {
      btn.textContent = `Hints: ${enabled ? 'ON' : 'OFF'}`;
      btn.classList.toggle('off', !enabled);
    }
    this.modeEl.style.display = enabled ? '' : 'none';
  }

  setScore(score) { this.scoreEl.textContent = `Yarn: ${score}`; }

  setRank(text) { this.rankEl.textContent = text; }

  /** Progress bar between current rank threshold and next rank threshold. */
  setXpProgress(xp, floor, next) {
    let pct = next > floor ? Math.min(1, (xp - floor) / (next - floor)) : 1;
    this.xpFill.style.width = `${(pct * 100).toFixed(1)}%`;
    this.xpLabel.textContent = next > floor ? `XP ${xp} / ${next}` : `XP ${xp} · MAX`;
  }

  setQuest(text, current = null, target = null) {
    this.questNameEl.textContent = text;
    if (current != null && target != null && target > 0) {
      this.questFillEl.style.width = `${Math.min(100, (current / target) * 100)}%`;
    } else {
      this.questFillEl.style.width = '0%';
    }
  }

  setMode(text) { this.modeEl.textContent = text; }

  setTimeWeather(timeStr, weatherStr) {
    this.timeWeatherEl.textContent = `${timeStr} · ${weatherStr}`;
  }

  setInventory(hasKey, hasFeather) {
    this.badgeKey.classList.toggle('active', !!hasKey);
    this.badgeKey.textContent = hasKey ? '🔑 Key ✓' : '🔑 Key: 0';
    this.badgeFeather.classList.toggle('active', !!hasFeather);
    this.badgeFeather.textContent = hasFeather ? '🪶 Feather ✓' : '🪶 Feather: 0';
  }

  /** Stacked toast notifications (max 3 visible, auto-expire). */
  showToast(message, duration = 2600) {
    while (this.toastStack.children.length >= 3) {
      this.toastStack.removeChild(this.toastStack.firstChild);
    }
    const el = document.createElement('div');
    el.className = 'toast-item';
    el.textContent = message;
    this.toastStack.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 400);
    }, duration);
  }

  showPrompt(text) {
    const p = document.getElementById('prompt');
    p.textContent = text;
    p.style.display = 'block';
  }

  hidePrompt() {
    document.getElementById('prompt').style.display = 'none';
  }

  /** Per-frame HUD tick: FPS sampling + debug overlay refresh. */
  update(dt, score, extraDebug = null) {
    this.setScore(score);

    // FPS sampling
    this.fpsAccum += dt;
    this.fpsFrames++;
    if (this.fpsAccum >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsAccum);
      this.fpsAccum = 0;
      this.fpsFrames = 0;
    }

    // Debug overlay (throttled)
    if (this.debugVisible) {
      this.debugTimer -= dt;
      if (this.debugTimer <= 0) {
        this.debugTimer = 0.25;
        const info = window.game ? window.game.renderer.info : null;
        const lines = [
          `FPS      ${this.fps}`,
          info ? `Draws    ${info.render.calls} calls · ${(info.render.triangles / 1000).toFixed(0)}k tris` : '',
          info ? `GPU mem  ${info.memory.geometries} geo · ${info.memory.textures} tex` : '',
          extraDebug || ''
        ].filter(Boolean);
        this.debugOverlay.textContent = lines.join(String.fromCharCode(10));
      }
    }
  }
}