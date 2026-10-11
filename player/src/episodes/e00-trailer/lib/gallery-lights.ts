import * as THREE from "three";

/**
 * Soft studio lighting for a z-up gallery shot: sky/ground hemisphere fill, a warm key from the front right,
 * and a cool rim from behind. `key` scales the key light.
 */
export function addGalleryLights(scene: THREE.Scene, key = 1.0): void {
  const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x1a2030, 1.15);
  hemi.position.set(0, 0, 1);
  scene.add(hemi);
  const keyLight = new THREE.DirectionalLight(0xfff1e0, 2.2 * key);
  keyLight.position.set(3, -4, 6);
  scene.add(keyLight);
  const rim = new THREE.DirectionalLight(0x8fb4ff, 1.4);
  rim.position.set(-4, 5, 3);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xb9c8ff, 0.35);
  fill.position.set(-5, -3, 1);
  scene.add(fill);
}
