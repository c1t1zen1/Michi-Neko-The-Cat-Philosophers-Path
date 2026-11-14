// Module resolve hook: maps the bare specifier 'three' to tools/fixtures/three_stub.mjs.
// Registered by tools/cad_overrides_test.mjs (module.registerHooks, or module.register
// on Node builds without the synchronous API).
export function resolve(specifier, context, nextResolve) {
  if (specifier === 'three') {
    return { url: new URL('./three_stub.mjs', import.meta.url).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
