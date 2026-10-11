import * as THREE from "three";
import { FRAME_HEIGHT, FRAME_WIDTH } from "../../../core/Frame";

export interface OrbitView {
  /** Point the camera looks at (z up). */
  center: THREE.Vector3;
  /** Azimuth around +z in degrees (0 = camera on the +x side). */
  azimuth: number;
  /** Elevation above the xy plane in degrees. */
  elevation: number;
  distance: number;
  fov: number;
  /** Frame shift in output pixels: positive x moves the subject left, positive y moves it up. */
  shiftX: number;
  shiftY: number;
}

/** Places a z-up perspective camera on an orbit around `center`, with an off-centre framing shift. */
export function applyOrbitView(camera: THREE.PerspectiveCamera, v: OrbitView): void {
  const az = THREE.MathUtils.degToRad(v.azimuth);
  const el = THREE.MathUtils.degToRad(v.elevation);
  camera.position.set(
    v.center.x + v.distance * Math.cos(el) * Math.cos(az),
    v.center.y + v.distance * Math.cos(el) * Math.sin(az),
    v.center.z + v.distance * Math.sin(el),
  );
  camera.up.set(0, 0, 1);
  camera.fov = v.fov;
  camera.aspect = FRAME_WIDTH / FRAME_HEIGHT;
  camera.lookAt(v.center);
  camera.setViewOffset(FRAME_WIDTH, FRAME_HEIGHT, v.shiftX, v.shiftY, FRAME_WIDTH, FRAME_HEIGHT);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

/** A fresh perspective camera for a gallery shot. */
export function createGalleryCamera(): THREE.PerspectiveCamera {
  return new THREE.PerspectiveCamera(30, FRAME_WIDTH / FRAME_HEIGHT, 0.02, 100);
}
