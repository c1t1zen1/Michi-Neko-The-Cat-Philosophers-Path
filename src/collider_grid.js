/**
 * Uniform XZ grid over the world's static collider boxes.
 *
 * The cat's collision resolve, the camera ray and the camera push-out each
 * used to walk the entire collider array — several hundred boxes fed by the
 * per-tree, per-bush and per-forest-trunk builders — four or five times a
 * frame. Every box in the valley was tested against a cat that can only ever
 * touch the handful within arm's reach.
 *
 * Colliders are fixed once the world has finished building, so they are
 * bucketed once and queried by rectangle after that. Boxes that straddle
 * many cells (a long fence run, a building footprint) are still bucketed
 * normally; only genuinely world-sized boxes fall back to an always-returned
 * list, so a query never silently misses one.
 */
export class ColliderGrid {
  constructor(cell = 8) {
    this.cell = cell;
    this.cells = new Map();
    this.boxes = [];
    this.oversized = [];
    this.marks = null;
    this.stamp = 0;
    this.source = null;
    this.builtLength = -1;
  }

  /**
   * Collision-free cell key for any world within ±32 km: the offset keeps
   * both halves non-negative, so no two cells can share a key (a hash would
   * only ever cost extra boxes, but exactness is free here).
   */
  key(cx, cz) { return (cx + 4096) * 8192 + (cz + 4096); }

  /**
   * Rebuild if the backing array changed identity or length. Vegetation
   * appends its trunk and bush boxes to the countryside's array after the
   * grid could first be touched, so the length check is what catches that.
   */
  sync(list) {
    if (list === this.source && list.length === this.builtLength) return this;
    this.build(list);
    return this;
  }

  build(list) {
    this.source = list;
    this.boxes = list;
    this.builtLength = list.length;
    this.cells.clear();
    this.oversized.length = 0;
    this.marks = new Int32Array(list.length);
    this.stamp = 0;
    const c = this.cell;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const x0 = Math.floor(b.min.x / c), x1 = Math.floor(b.max.x / c);
      const z0 = Math.floor(b.min.z / c), z1 = Math.floor(b.max.z / c);
      // A box wider than 16 cells on a side is world-scale, not architecture;
      // bucketing it would touch hundreds of cells for no filtering gain.
      if ((x1 - x0) > 16 || (z1 - z0) > 16) { this.oversized.push(b); continue; }
      for (let cx = x0; cx <= x1; cx++) {
        for (let cz = z0; cz <= z1; cz++) {
          const k = this.key(cx, cz);
          let bucket = this.cells.get(k);
          if (!bucket) { bucket = []; this.cells.set(k, bucket); }
          bucket.push(i);
        }
      }
    }
  }

  /**
   * Collect every collider whose cell overlaps the XZ rectangle into `out`
   * (cleared first) and return it. `out` is caller-owned so a per-frame query
   * allocates nothing.
   */
  query(minX, minZ, maxX, maxZ, out) {
    out.length = 0;
    for (let i = 0; i < this.oversized.length; i++) out.push(this.oversized[i]);
    if (!this.marks) return out;
    const c = this.cell;
    const stamp = ++this.stamp;
    const x0 = Math.floor(minX / c), x1 = Math.floor(maxX / c);
    const z0 = Math.floor(minZ / c), z1 = Math.floor(maxZ / c);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cz = z0; cz <= z1; cz++) {
        const bucket = this.cells.get(this.key(cx, cz));
        if (!bucket) continue;
        for (let n = 0; n < bucket.length; n++) {
          const idx = bucket[n];
          if (this.marks[idx] === stamp) continue;
          this.marks[idx] = stamp;
          out.push(this.boxes[idx]);
        }
      }
    }
    return out;
  }
}
