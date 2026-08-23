import * as THREE from 'three';

const V = new THREE.Vector3();

/** Screen-space objective markers with distance labels + off-screen edge arrow. */
export class WaypointSystem {
  constructor() {
    this.container = document.createElement('div');
    this.container.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:145;overflow:hidden;';
    document.body.appendChild(this.container);

    this.camera = null;
    this.targets = [];          // [{id, icon, pos}]
    this.markerEls = new Map(); // id -> {wrap, iconEl, distEl}
    this.edgeArrow = document.getElementById('edge-arrow');
    this.edgeIcon = document.getElementById('edge-arrow-icon');
  }

  setCamera(camera) { this.camera = camera; }

  /** Replace active targets. Each: {id, icon, pos:Vector3}. */
  setTargets(targets) {
    this.targets = targets || [];
    const seen = new Set();
    for (const t of this.targets) {
      seen.add(t.id);
      if (!this.markerEls.has(t.id)) {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:absolute;left:0;top:0;display:none;text-align:center;transform:translate(-50%,-100%);';
        const icon = document.createElement('div');
        icon.style.cssText = 'font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.7));animation:bob-marker 2s ease-in-out infinite;';
        const keyframes = document.createElement('style');
        keyframes.textContent = '@keyframes bob-marker{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}';
        this.container.appendChild(keyframes);
        const dist = document.createElement('div');
        dist.style.cssText = 'font-size:10px;color:#ffe8b0;background:rgba(20,10,5,0.72);border-radius:8px;padding:1px 7px;margin-top:2px;display:inline-block;letter-spacing:0.5px;border:1px solid rgba(200,160,90,0.4);';
        wrap.appendChild(icon);
        wrap.appendChild(dist);
        this.container.appendChild(wrap);
        this.markerEls.set(t.id, { wrap, icon, dist });
      }
      const m = this.markerEls.get(t.id);
      m.icon.textContent = t.icon;
    }
    // Hide stale markers
    for (const [id, m] of this.markerEls) {
      if (!seen.has(id)) m.wrap.style.display = 'none';
    }
  }

  update(playerPos) {
    if (!this.camera) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    let primaryOffscreen = null;

    for (const t of this.targets) {
      const m = this.markerEls.get(t.id);
      if (!m) continue;
      V.copy(t.pos);
      V.y += 0.9; // float above ground/target
      const dist = V.distanceTo(playerPos);
      V.project(this.camera);

      const behind = V.z > 1;
      let sx = (V.x * 0.5 + 0.5) * w;
      let sy = (-V.y * 0.5 + 0.5) * h;
      const onScreen = !behind && sx > 40 && sx < w - 40 && sy > 60 && sy < h - 80;

      // Distance fade: fully visible up close, fading out between 12m and
      // 32m, completely hidden beyond 32m.
      const fadeNear = 12, fadeFar = 32;
      const alpha = dist <= fadeNear ? 1 : Math.max(0, 1 - (dist - fadeNear) / (fadeFar - fadeNear));

      if (onScreen && alpha > 0.02) {
        m.wrap.style.display = 'block';
        m.wrap.style.left = `${sx}px`;
        m.wrap.style.top = `${sy}px`;
        m.wrap.style.opacity = alpha.toFixed(2);
        m.dist.textContent = `${Math.round(dist)}m`;
        if (!primaryOffscreen && !this._primaryShown) { /* keep first */ }
      } else {
        m.wrap.style.display = 'none';
        // Off-screen: remember first target as edge-arrow candidate
        if (!primaryOffscreen) {
          if (behind) { sx = w - sx; sy = h - sy; }
          primaryOffscreen = { t, sx, sy };
        }
      }
    }

    // Edge arrow for first off-screen objective
    if (primaryOffscreen && this.edgeArrow) {
      const { t, sx, sy } = primaryOffscreen;
      const cx = w / 2;
      const cy = h / 2;
      const ang = Math.atan2(sy - cy, sx - cx);
      const rx = w / 2 - 56;
      const ry = h / 2 - 76;
      const px = cx + Math.cos(ang) * rx;
      const py = cy + Math.sin(ang) * ry;
      this.edgeArrow.classList.remove('hidden');
      this.edgeArrow.style.left = `${px}px`;
      this.edgeArrow.style.top = `${py}px`;
      this.edgeArrow.style.transform = `translate(-50%,-50%) rotate(${ang + Math.PI / 2}rad)`;
      this.edgeIcon.textContent = t.icon;
    } else if (this.edgeArrow) {
      this.edgeArrow.classList.add('hidden');
    }
  }
}

/** Horizontal compass strip with cardinal directions and POI icons. */
export class Compass {
  constructor() {
    this.el = document.getElementById('compass');
    this.range = 1.35; // radians visible half-width
    this.cardinals = [
      { label: 'N', bearing: 0 },
      { label: 'E', bearing: Math.PI / 2 },
      { label: 'S', bearing: Math.PI },
      { label: 'W', bearing: -Math.PI / 2 }
    ];
    this.pois = [];   // [{icon, pos}]
    this.itemEls = [];

    for (const c of this.cardinals) {
      const el = document.createElement('div');
      el.className = 'compass-item cardinal';
      el.textContent = c.label;
      this.el.appendChild(el);
      this.itemEls.push({ el, fixedBearing: c.bearing });
    }
    this.poiEls = [];
  }

  /** Replace POI list: [{icon, pos:Vector3}] */
  setPois(pois) {
    for (const p of this.poiEls) p.el.remove();
    this.poiEls = [];
    this.pois = pois || [];
    for (const p of this.pois) {
      const el = document.createElement('div');
      el.className = 'compass-item poi';
      el.textContent = p.icon;
      this.el.appendChild(el);
      this.poiEls.push({ el, pos: p.pos });
    }
  }

  update(cameraPos, cameraDir) {
    const heading = Math.atan2(cameraDir.x, -cameraDir.z);
    const place = (el, bearing, dist = 0) => {
      let off = bearing - heading;
      while (off > Math.PI) off -= Math.PI * 2;
      while (off < -Math.PI) off += Math.PI * 2;
      if (Math.abs(off) > this.range) { el.style.display = 'none'; return; }
      // Distance fade: invisible beyond ~32m, fading from 12m
      const distAlpha = dist <= 12 ? 1 : Math.max(0, 1 - (dist - 12) / 20);
      if (distAlpha <= 0.02) { el.style.display = 'none'; return; }
      const x = 50 + (off / this.range) * 48;
      el.style.display = '';
      el.style.left = `${x}%`;
      el.style.opacity = String(Math.max(0.25, 1 - Math.abs(off) / this.range) * distAlpha);
    };
    for (const item of this.itemEls) place(item.el, item.fixedBearing);
    for (let i = 0; i < this.poiEls.length; i++) {
      const p = this.pois[i];
      const b = Math.atan2(p.pos.x - cameraPos.x, -(p.pos.z - cameraPos.z));
      const d = Math.hypot(p.pos.x - cameraPos.x, p.pos.z - cameraPos.z);
      place(this.poiEls[i].el, b, d);
    }
  }
}