// Add the summit transition overlay (CSS + markup) to index.html.
//
// index.html is CRLF and contains em-dashes / Japanese text, so this edits
// bytes via Node rather than PowerShell (see AGENTS.md).
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'index.html';
let html = readFileSync(path, 'utf8');
const nl = html.includes('\r\n') ? '\r\n' : '\n';

const CSS = [
  '',
  '    /* ============ Summit ascent transition (天上) ============ */',
  '    /* Full-screen veil for the climb to the mountain top. Three modes, driven',
  '       by classes from mountaintop.js:',
  '         .show      - veil visible',
  '         .fallback  - no video: a warm light bloom instead (never a black frame)',
  '         .quick     - the short return veil on the way down',
  '         .fade-out  - dissolving away',
  '       The video element is lazy: no src and no preload until it is first',
  '       needed, so an mp4 never sits in the cold-start payload. */',
  '    #summit-transition {',
  '      position: absolute; inset: 0; z-index: 560;',
  '      pointer-events: none; overflow: hidden;',
  '      display: none; align-items: center; justify-content: center;',
  '      background: #120d0a;',
  '      opacity: 0; transition: opacity 0.85s ease;',
  '    }',
  '    #summit-transition.show { display: flex; opacity: 1; }',
  '    #summit-transition.fade-out { opacity: 0; }',
  '    #summit-transition.fallback {',
  '      background: radial-gradient(circle at 50% 46%, #fff6e2 0%, #ffdfae 26%, #e8a86a 52%, #7d4a2c 78%, #241611 100%);',
  '    }',
  '    /* A quick return reads as a softer, cooler veil than the ascent. */',
  '    #summit-transition.quick {',
  '      background: radial-gradient(circle at 50% 50%, #f6ecdc 0%, #dcc6a4 40%, #6b4a34 75%, #1d1410 100%);',
  '      transition: opacity 0.4s ease;',
  '    }',
  '    #summit-video {',
  '      position: absolute; inset: 0;',
  '      width: 100%; height: 100%;',
  '      object-fit: cover;',
  '      /* Decoration behind the veil; it never takes pointer input. */',
  '      pointer-events: none;',
  '    }',
  '    #summit-transition:not(.fallback):not(.quick) #summit-video { opacity: 0.96; }',
  '    .summit-plate {',
  '      position: relative; z-index: 2; text-align: center;',
  '      opacity: 0; transform: scale(0.94);',
  '      transition: opacity 1.1s ease 0.35s, transform 1.1s ease 0.35s;',
  '      color: #fff6e4; text-shadow: 0 2px 14px rgba(60, 26, 8, 0.75);',
  '    }',
  '    #summit-transition.show .summit-plate { opacity: 1; transform: scale(1); }',
  '    .summit-plate-title { font-size: 40px; font-weight: bold; letter-spacing: 14px; }',
  '    .summit-plate-sub { font-size: 12px; letter-spacing: 6px; margin-top: 8px; opacity: 0.85; }',
  '    /* The plate fades out once the video is running, so it never sits over',
  '       the first frames of the new scene. */',
  '    #summit-transition.video-playing .summit-plate { opacity: 0; transition: opacity 0.8s ease; }',
  '    @media (prefers-reduced-motion: reduce) {',
  '      #summit-transition, #summit-transition.quick { transition: none; }',
  '      .summit-plate { transform: none; }',
  '    }',
  ''
].join(nl);

const MARKUP = [
  '',
  '  <!-- Summit ascent veil: full-screen transition up to the mountain top.',
  '       mountaintop.js adds .show / .fallback / .quick / .fade-out; the video',
  '       src is attached lazily on first use so it costs nothing at boot. -->',
  '  <div id="summit-transition">',
  '    <video id="summit-video" muted playsinline preload="none" aria-hidden="true"></video>',
  '    <div class="summit-plate">',
  '      <div class="summit-plate-title">天上</div>',
  '      <div class="summit-plate-sub">THE MOUNTAIN TOP</div>',
  '    </div>',
  '  </div>',
  ''
].join(nl);

// --- CSS: insert before the boot-screen comment block -------------------------
const cssAnchor = '    /* ============ Boot screen ============ */';
if (!html.includes(cssAnchor)) { console.error('CSS anchor missing'); process.exit(1); }
if (html.includes('#summit-transition')) { console.log('CSS already present — skipping'); }
else {
  html = html.replace(cssAnchor, CSS.replace(/\n$/, '') + nl + nl + cssAnchor);
}

// --- Markup: insert before the photo-mode hint -------------------------------
const markupAnchor = '  <!-- Photo mode -->';
if (!html.includes(markupAnchor)) { console.error('markup anchor missing'); process.exit(1); }
if (html.includes('id="summit-transition"')) { console.log('markup already present — skipping'); }
else {
  html = html.replace(markupAnchor, MARKUP.replace(/\n$/, '') + nl + markupAnchor);
}

writeFileSync(path, html);
console.log('index.html updated; length', html.length);
