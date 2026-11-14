// A tiny stand-in for 'three' so src/cad_overrides.js (which only needs
// BufferGeometry, BufferAttribute and TextureLoader) can run under Node in
// tools/cad_overrides_test.mjs. Resolved by tools/fixtures/three_stub_hooks.mjs.

export class BufferAttribute {
  constructor(array, itemSize, normalized = false) { this.array = array; this.itemSize = itemSize; this.normalized = normalized; this.count = array.length / itemSize; }
}

export class BufferGeometry {
  constructor() { this.type = 'BufferGeometry'; this.name = ''; this.index = null; this.attributes = {}; this.groups = []; this.drawRange = { start: 0, count: Infinity }; this.boundingBox = null; this.boundingSphere = null; this.disposed = false; }
  setIndex(attr) { this.index = attr; return this; }
  setAttribute(name, attr) { this.attributes[name] = attr; return this; }
  addGroup(start, count, materialIndex = 0) { this.groups.push({ start, count, materialIndex }); }
  setDrawRange(start, count) { this.drawRange = { start, count }; }
  computeBoundingBox() { this.boundingBox = { computed: true }; }
  computeBoundingSphere() { this.boundingSphere = { computed: true }; }
  dispose() { this.disposed = true; }
}

export class TextureLoader {
  async loadAsync(url) { return { url, name: '', clone() { return { ...this, repeat: { fromArray() {} }, offset: { fromArray() {} }, center: { set() {} } }; } }; }
}

export const Vector3 = class { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } };
