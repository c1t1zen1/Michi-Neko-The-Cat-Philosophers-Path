/*
 * Small, dependency-free launch boundary for the valley.
 *
 * The old entry point loaded the whole Three.js graph while the first paint
 * was blocked. If that CDN request failed (or index.html was opened through
 * file://), the decorative loader sat on screen forever. Keep this file free
 * of game imports: it can paint an honest entry/error state on every device.
 */

const AUTOSTART_KEY = 'catwalk_autostart';
const boot = document.getElementById('boot-screen');
const enterButton = document.getElementById('boot-enter');
const loadingText = document.getElementById('boot-loading-text');
const errorBox = document.getElementById('boot-error');

let engineModule = null;
let starting = false;

function setLoading(message, detail = '読み込み中') {
  if (!boot) return;
  boot.classList.remove('error');
  boot.classList.add('loading');
  if (enterButton) enterButton.disabled = true;
  if (loadingText) loadingText.innerHTML = `${message}<span>${detail}</span>`;
}

function showError(error) {
  starting = false;
  if (!boot || !errorBox) return;
  boot.classList.remove('loading');
  boot.classList.add('error');
  const offline = !navigator.onLine;
  const detail = offline
    ? 'You appear to be offline. This version needs a connection to fetch its 3D engine.'
    : 'The 3D engine could not be reached or started.';
  // Keep raw browser/network details out of the player-facing screen, but
  // leave them available to developers who open the console.
  console.error('Michi-Neko failed to start', error);
  errorBox.innerHTML = `<strong>The valley could not open.</strong><br>${detail}<br>` +
    '<button class="boot-enter" type="button" data-boot-retry>Try again</button>';
  const retry = errorBox.querySelector('[data-boot-retry]');
  if (retry) retry.addEventListener('click', () => location.reload(), { once: true });
}

function loadEngineModule() {
  if (!engineModule) {
    engineModule = import('./main.js?v=20261116a');
    prefetchKit();
  }
  return engineModule;
}

/**
 * When this boot will build the modular set (the URL asks for it, or the saved
 * setting does on a medium/high saved quality), fetch the kit's modules while
 * main.js and its graph download, so AssetRuntime.preload() finds them in the
 * module map instead of waiting on them inside the world build (a1-village,
 * ruling R66). Never on the classic set, never on a low-locked device: the
 * runtime's own rules decide what is built; this only starts downloads early.
 */
function prefetchKit() {
  try {
    const q = new URLSearchParams(location.search);
    const flag = q.get('assets');
    let set = flag, quality = null;
    if (!flag) {
      const saved = JSON.parse(localStorage.getItem('catwalk_settings_v1') || 'null') || {};
      set = saved.assetSet; quality = saved.quality;
      if (quality !== 'medium' && quality !== 'high') return;   // auto or low: let the runtime decide, no early fetch
    }
    if (set !== 'modular') return;   // 'auto' resolves by the GPU tier later: no early fetch
    import('./kit/index.js?v=20261116a')
      .then((m) => Promise.all([import('./kit/materials.js?v=20261116a'), ...Object.values(m.FAMILIES || {}).map((load) => load())]))
      .catch(() => {});   // the runtime imports (and reports) for real
  } catch { /* storage blocked: the runtime fetches as before */ }
}

async function start() {
  if (starting) return;
  starting = true;
  setLoading('Opening the valley…', '読み込み中');

  try {
    // Allow the button's pressed state and the loading copy to paint before
    // module evaluation begins. The full world is intentionally demand-loaded.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const { startGame } = await loadEngineModule();
    // startGame() resolves once the kit runtime has preloaded (nothing on the
    // classic set) and the valley is built.
    const game = await startGame();
    window.game = game;

    // Game has already surfaced the WebGL2 explanation behind the entry
    // screen. Let it show instead of trapping the player in a loader.
    if (!game || !game.renderer) {
      boot?.classList.add('dissolve');
      setTimeout(() => boot?.remove(), 550);
    }
  } catch (error) {
    showError(error);
  }
}

if (enterButton) enterButton.addEventListener('click', start);

// New game / recovery reloads carry this flag from main.js. They should still
// resume directly and never strand the player on a second title screen.
const autostart = sessionStorage.getItem(AUTOSTART_KEY);
if (autostart === 'new' || autostart === 'continue') start();

