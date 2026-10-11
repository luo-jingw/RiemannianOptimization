import * as THREE from "three";

/** A 64 x 64 radial falloff texture (white, alpha = soft disc), computed numerically. */
export function createGlowTexture(): THREE.DataTexture {
  const n = 64;
  const data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const dx = (i + 0.5) / n - 0.5;
      const dy = (j + 0.5) / n - 0.5;
      const r = Math.sqrt(dx * dx + dy * dy) * 2;
      const a = Math.max(0, 1 - r) ** 2.2;
      const k = (j * n + i) * 4;
      data[k] = 255; data[k + 1] = 255; data[k + 2] = 255;
      data[k + 3] = Math.round(a * 255);
    }
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** An additive, camera-facing soft glow of world diameter `size`. */
export function createGlowSprite(texture: THREE.Texture, color: string, size: number): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({
    map: texture,
    color: new THREE.Color(color),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(size);
  return sprite;
}

/** Material of a flat additive soft disc (unit diameter on a 1 x 1 plane), for 2D layouts and instancing. */
export function createGlowMaterial(texture: THREE.Texture, color: string): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: texture,
    color: new THREE.Color(color),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}
