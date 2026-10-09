import * as THREE from "three";
import type { StageLayer } from "../layers/StageLayer";

/** Standard soft lighting for 3D chapters. */
export function addStandardLights(stage: StageLayer): void {
  stage.root.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(4, -3, 6);
  stage.root.add(key);
  const rim = new THREE.DirectionalLight(0x88aaff, 0.6);
  rim.position.set(-5, 4, 2);
  stage.root.add(rim);
}
