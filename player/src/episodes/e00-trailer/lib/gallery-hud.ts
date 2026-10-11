import * as THREE from "three";
import { FRAME_HEIGHT, FRAME_WIDTH } from "../../../core/Frame";
import type { GalleryHud } from "./gallery-vignette";

/** Creates an empty screen-space overlay whose world units are output pixels with y measured upwards. */
export function createGalleryHud(): GalleryHud {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, FRAME_WIDTH, FRAME_HEIGHT, 0, -100, 100);
  camera.position.set(0, 0, 10);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return { scene, camera };
}

/** Converts an output-frame pixel (y down) to a HUD world point (y up). */
export function hudPoint(px: number, py: number, z = 0): THREE.Vector3 {
  return new THREE.Vector3(px, FRAME_HEIGHT - py, z);
}
