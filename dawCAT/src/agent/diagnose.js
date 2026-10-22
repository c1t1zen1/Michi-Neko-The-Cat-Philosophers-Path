/* dawCAT — turns opaque connection failures into specific, fixable messages.
   A browser throws the same "Failed to fetch" TypeError whether the server is
   down, on another port, blocked as mixed content, or answering without CORS
   headers — this works out which one it was. Pure apart from the injected
   fetch, so it runs under Node for tests. */

// Loopback is "potentially trustworthy" per the Secure Contexts spec, so it is
// exempt from mixed-content blocking — but a page on a public HTTPS origin is
// still stopped from opening connections into the local network by a separate
// rule, so https → local fails either way, just for different reasons.
const LOOPBACK_HOST = /^(localhost|[^.]+\.localhost|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|\[?::1\]?)$/i;
const PRIVATE_LAN_HOST = /^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/;
export const HTTP_SERVE_HINT = 'from the repo root run "python -m http.server 8000" and open http://localhost:8000/dawCAT/';

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* The discriminator is a mode:"no-cors" probe: it reaches the server without
   needing any CORS header back (the response is opaque, which is fine — we
   only care that it resolved). If THAT succeeds, something is listening and
   the real block was CORS. If it fails too, nothing answered at all. */
export async function diagnoseNetworkFailure(url, { pageOrigin, fetchImpl } = {}) {
  let target;
  try { target = new URL(url); } catch { return `"${url}" is not a valid URL. It should look like http://127.0.0.1:8080/v1`; }
  let page;
  try { page = new URL(pageOrigin); } catch { page = { protocol: 'http:', hostname: '', port: '', origin: String(pageOrigin || '') }; }
  const where = `${target.protocol}//${target.host}`;
  const basePath = target.pathname.replace(/\/(models|chat\/completions|messages|health|props)$/, '');

  if (page.protocol === 'https:' && target.protocol === 'http:') {
    const mechanism = LOOPBACK_HOST.test(target.hostname)
      ? `Loopback addresses like ${target.hostname} are exempt from mixed-content blocking, but a browser still refuses to let a page on an HTTPS site open a connection into your local network, so switching between 127.0.0.1 and localhost will not help`
      : `A browser will not let an HTTPS page call a plain-http:// address like ${where} — the request is blocked as mixed content and never leaves the page`;
    const extra = [];
    if (PRIVATE_LAN_HOST.test(target.hostname)) {
      extra.push(`${target.hostname} is an address on your local network — if the model server runs on this machine, 127.0.0.1 is the address you want`);
      if (/\.1$/.test(target.hostname)) extra.push(`and ${target.hostname} specifically is usually a home router, not your computer`);
    }
    return `dawCAT is being served over HTTPS (${page.origin}) — that is what is blocking this, not the model server. ${mechanism}. Serve dawCAT over plain http instead: ${HTTP_SERVE_HINT}.${extra.length ? ' Also: ' + extra.join(', ') + '.' : ''}`;
  }

  let reachable = false;
  try { await fetchImpl(where, { mode: 'no-cors' }); reachable = true; } catch { /* really unreachable */ }

  if (reachable && !(target.host === page.host)) {
    return `${where} is running and answering, but it did not allow this page to read the response — that's a CORS block, not a connection problem. Allow cross-origin requests from ${page.origin} (llama-server allows any origin by default; LM Studio: enable CORS in server settings; Ollama: set OLLAMA_ORIGINS=*), and check no proxy strips the headers.`;
  }

  const hints = [];
  if (target.port && target.port === page.port && target.hostname === page.hostname) {
    hints.push('that is the same address dawCAT itself is served from, so this request is hitting dawCAT\'s own static file server rather than your model — put the model server on a different port (llama-server\'s default is 8080)');
  }
  if (target.hostname === 'localhost') hints.push('try 127.0.0.1 instead of localhost — "localhost" can resolve to the IPv6 address ::1, and a server started with --host 0.0.0.0 listens on IPv4 only');
  if (!target.port) hints.push(`there is no port in the Base URL, so this goes to ${target.protocol === 'https:' ? '443' : '80'} — llama-server's default is 8080, so you probably want ${target.protocol}//${target.hostname}:8080${basePath}`);
  hints.push('check the server is still running and that the port matches the one it printed on startup');
  return `Nothing answered at ${where}. ${capitalize(hints.join('; '))}.`;
}

/* Something answered, but not with JSON. Overwhelmingly this means the Base
   URL points at the wrong server — most often dawCAT's own static file server. */
export function notJsonHint(url, status, text, pageHost) {
  let target; try { target = new URL(url); } catch { target = null; }
  const what = /^\s*</.test(text) ? 'an HTML page' : `"${String(text).slice(0, 80)}"`;
  if (target && target.host === pageHost) {
    return `${target.host} answered with ${what} (HTTP ${status}), not JSON — that is the address dawCAT itself is served from, so this hit dawCAT's own file server instead of an AI provider. Point Base URL at the server running your model (llama-server's default is http://127.0.0.1:8080/v1).`;
  }
  return `${url} answered with ${what} (HTTP ${status}), not JSON. Check the Base URL ends at the API root — for an OpenAI-compatible server that is the part before /models, e.g. http://127.0.0.1:8080/v1`;
}

/* Provider error message + a concrete next step for the common statuses. */
export function httpErrorHint(status, providerMessage, settings = {}) {
  const msg = String(providerMessage || '').trim();
  const lower = msg.toLowerCase();
  let hint = '';
  if (/context|too long|maximum.*tokens|prompt is too long|n_ctx|exceeds/.test(lower) || status === 413) {
    hint = 'The request is larger than the model\'s context window. Set Context detail to "compact" or "minimal", start a New chat, or raise the server\'s context size (llama-server --ctx-size 16384, OLLAMA_CONTEXT_LENGTH=16384).';
  } else if (status === 401 || status === 403) {
    hint = `The API key was rejected — check the key for ${settings.provider || 'this provider'} (and that it has access to ${settings.model || 'this model'}).`;
  } else if (status === 404) {
    hint = `Not found — either the Base URL is wrong or the model "${settings.model || ''}" doesn't exist on this endpoint. Use ⟳ Scan models to pick a real one.`;
  } else if (status === 429) {
    hint = 'Rate limited or out of credit — wait a moment and retry, or check your plan\'s limits.';
  } else if (status >= 500) {
    hint = 'The provider had a server error — retry in a moment. For local servers, check its console for a crash or out-of-memory error.';
  } else if (status === 400) {
    hint = 'The provider rejected the request shape. If this persists, try Structured output "off" or Reasoning "none" under Advanced.';
  }
  const head = msg ? `${msg} (HTTP ${status})` : `Provider HTTP ${status}`;
  return hint ? `${head}. ${hint}` : head;
}
