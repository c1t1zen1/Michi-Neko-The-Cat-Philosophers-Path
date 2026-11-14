import * as THREE from 'three';

/**
 * The contact shadow: a soft painted blob under the cat that shrinks and
 * fades as the cat leaves the ground. One shared radial-gradient texture.
 *
 * Moved verbatim from src/cat.js (lane c1-rig-split). Sets `host.blob`, the
 * field the Cat always had (the catalog's `cat-shadow` adapter takes it).
 */

let _blobTex = null;

export function buildShadowBlob(host) {
  if (!_blobTex) {
    const blobCanvas = document.createElement('canvas');
    blobCanvas.width = 64;
    blobCanvas.height = 64;
    const bctx = blobCanvas.getContext('2d');
    const bgrad = bctx.createRadialGradient(32, 32, 4, 32, 32, 31);
    bgrad.addColorStop(0, 'rgba(20, 12, 6, 0.42)');
    bgrad.addColorStop(0.6, 'rgba(20, 12, 6, 0.18)');
    bgrad.addColorStop(1, 'rgba(20, 12, 6, 0)');
    bctx.fillStyle = bgrad;
    bctx.fillRect(0, 0, 64, 64);
    _blobTex = new THREE.CanvasTexture(blobCanvas);
  }
  host.blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 24),
    new THREE.MeshBasicMaterial({ map: _blobTex, transparent: true, depthWrite: false })
  );
  host.blob.rotation.x = -Math.PI / 2;
  host.blob.position.y = 0.025;
  host.blob.scale.set(0.85, 1.25, 1);
  host.blob.renderOrder = 1;
  host.group.add(host.blob);
}

export function updateShadow(host, heightAboveGround) {
  if (!host.blob) return;
  host.blob.position.y = 0.025 - heightAboveGround;
  const k = THREE.MathUtils.clamp(1 - heightAboveGround * 0.45, 0.35, 1);
  host.blob.scale.set(0.85 * k, 1.25 * k, 1);
  host.blob.material.opacity = k;
}
