const PORTRAITS = {
  'Luna': '🐈‍⬛',
  'You': '🐱'
};

export class Dialogue {
  constructor() {
    this.box = document.createElement('div');
    this.box.style.cssText = 'position:absolute;bottom:85px;left:50%;transform:translateX(-50%);width:92%;max-width:560px;background:linear-gradient(175deg,rgba(249,240,226,0.96) 0%,rgba(236,220,195,0.94) 100%);color:#2d1d12;padding:14px 20px;border-radius:6px;font-family:Georgia,serif;display:none;z-index:250;user-select:none;box-shadow:0 8px 30px rgba(20,10,5,0.5),inset 0 0 20px rgba(160,110,60,0.12);border-left:4px solid #c8402a;border-right:2px solid #7c4c28;border-top:1px solid rgba(120,80,40,0.25);border-bottom:1px solid rgba(120,80,40,0.25);';

    // Header row: portrait + name
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:8px;';

    this.portraitEl = document.createElement('div');
    this.portraitEl.style.cssText = 'width:44px;height:44px;border-radius:8px;background:linear-gradient(160deg,#f7e6c8,#e3c9a0);border:2px solid #7c4c28;display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:inset 0 0 8px rgba(120,80,40,0.25),0 2px 6px rgba(0,0,0,0.25);flex-shrink:0;';

    const nameWrap = document.createElement('div');
    this.title = document.createElement('div');
    this.title.style.cssText = 'font-weight:bold;color:#b8321e;font-size:15px;letter-spacing:1px;';
    const subtitle = document.createElement('div');
    subtitle.style.cssText = 'font-size:10px;color:#8a684c;letter-spacing:3px;';
    subtitle.textContent = 'はなす · SPEAKING';
    nameWrap.appendChild(this.title);
    nameWrap.appendChild(subtitle);
    header.appendChild(this.portraitEl);
    header.appendChild(nameWrap);

    this.text = document.createElement('div');
    this.text.style.cssText = 'font-size:14px;color:#2c1b12;line-height:1.65;min-height:46px;';

    this.hint = document.createElement('div');
    this.hint.style.cssText = 'font-size:11px;color:#8a684c;margin-top:10px;text-align:right;border-top:1px dashed rgba(120,80,40,0.25);padding-top:4px;';
    this.hint.textContent = 'Tap or press E / Space to continue 🐾';

    this.box.appendChild(header);
    this.box.appendChild(this.text);
    this.box.appendChild(this.hint);
    document.body.appendChild(this.box);

    this.lines = [];
    this.currentLine = 0;
    this.active = false;
    this.onComplete = null;

    // Typewriter state
    this.revealCount = 0;
    this.typeSpeed = 42;      // chars per second
    this.typeAccum = 0;
    this.fullyRevealed = false;

    this.box.addEventListener('click', () => this.advance());
  }

  show(name, lines, onComplete) {
    this.title.textContent = name;
    this.portraitEl.textContent = PORTRAITS[name] || '🐾';
    this.lines = lines;
    this.currentLine = 0;
    this.onComplete = onComplete;
    this.active = true;
    this.box.style.display = 'block';
    this.startLine();
  }

  startLine() {
    if (this.currentLine >= this.lines.length) {
      this.close(true);
      return;
    }
    this.revealCount = 0;
    this.typeAccum = 0;
    this.fullyRevealed = false;
    this.text.textContent = '';
    this.hint.style.visibility = 'hidden';
  }

  /** Per-frame typewriter tick. */
  update(dt) {
    if (!this.active || this.fullyRevealed) return;
    const full = this.lines[this.currentLine];
    this.typeAccum += dt * this.typeSpeed;
    const n = Math.min(full.length, Math.floor(this.typeAccum));
    if (n !== this.revealCount) {
      this.revealCount = n;
      this.text.textContent = full.slice(0, n);
    }
    if (this.revealCount >= full.length) {
      this.fullyRevealed = true;
      this.hint.style.visibility = '';
    }
  }

  advance() {
    if (!this.active) return;
    if (!this.fullyRevealed) {
      // First press: reveal the rest of the current line instantly
      this.revealCount = this.lines[this.currentLine].length;
      this.text.textContent = this.lines[this.currentLine];
      this.fullyRevealed = true;
      this.hint.style.visibility = '';
      return;
    }
    this.currentLine++;
    this.startLine();
  }

  close(completed = false) {
    if (completed && this.onComplete) this.onComplete();
    this.active = false;
    this.box.style.display = 'none';
  }
}