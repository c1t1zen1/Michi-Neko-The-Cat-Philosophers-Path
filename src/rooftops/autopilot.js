// src/rooftops/autopilot.js — the Roof Road's autopilot module for the game (BUILD_GUIDE_FABLE
// R6.4 under ruling R57): a re-export, not a copy. The one source stays
// rooftops/js/autopilot.js, so the sandbox page (kyoto-rooftops.html), the rooftop
// tests and the game run the same code. The import is untagged on purpose: the
// Roof Road's own modules import each other untagged, and this keeps one module
// instance of it in the game's graph.
export * from '../../rooftops/js/autopilot.js';
