/* dawCAT test harness — dependency-free, Node 16 compatible (node:test only
   arrived in Node 18). Suites call test(); run.mjs imports every suite and
   then calls runAll(). */
import assert from 'assert/strict';

export { assert };

const tests = [];
let currentFile = '';

export function setFile(name) { currentFile = name; }

export function test(name, fn) { tests.push({ file: currentFile, name, fn }); }

export async function runAll({ filter = '' } = {}) {
  let pass = 0, fail = 0;
  const failures = [];
  for (const t of tests) {
    if (filter && !`${t.file} ${t.name}`.includes(filter)) continue;
    try {
      await t.fn();
      pass++;
    } catch (err) {
      fail++;
      failures.push({ t, err });
      console.log(`  ✗ ${t.file} › ${t.name}`);
    }
  }
  for (const { t, err } of failures) {
    console.log(`\n── ${t.file} › ${t.name}\n${err && err.stack ? err.stack : err}`);
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  return fail;
}

/* Node 16 has EventTarget and Event but not CustomEvent, which AppState and
   AgentSession dispatch. Install a minimal shim before importing them. */
export function installDomShims() {
  if (typeof globalThis.CustomEvent !== 'function') {
    globalThis.CustomEvent = class CustomEvent extends Event {
      constructor(type, init = {}) { super(type, init); this.detail = init.detail === undefined ? null : init.detail; }
    };
  }
}

/* Builds a fetch-compatible Response stand-in. `chunks` (array of strings)
   makes a streaming body readable via body.getReader(), mirroring how an SSE
   response arrives in pieces. */
export function fakeResponse({ status = 200, json, text, chunks, contentType } = {}) {
  const bodyText = json !== undefined ? JSON.stringify(json) : (text !== undefined ? text : (chunks || []).join(''));
  const type = contentType || (chunks ? 'text/event-stream' : 'application/json');
  const enc = new TextEncoder();
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h) => (h.toLowerCase() === 'content-type' ? type : null) },
    async text() { return bodyText; },
    async json() { return JSON.parse(bodyText); },
    body: {
      getReader() {
        const parts = (chunks || [bodyText]).map((c) => (typeof c === 'string' ? enc.encode(c) : c));
        let i = 0;
        return {
          async read() { return i < parts.length ? { done: false, value: parts[i++] } : { done: true, value: undefined }; },
          releaseLock() {},
          cancel() { i = parts.length; return Promise.resolve(); }
        };
      }
    }
  };
}
