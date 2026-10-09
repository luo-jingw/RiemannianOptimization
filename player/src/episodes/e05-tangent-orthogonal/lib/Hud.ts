import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";
import type { PixelSpace } from "./PixelSpace";

/**
 * Pixel-space overlay for 3D chapters: a group held at a fixed distance in front of the perspective
 * camera and scaled so that one local unit is one output pixel. `sync` is called in every frame,
 * after `stage.setView3D`, so the overlay follows the camera of that frame.
 */
export class Hud implements PixelSpace {
  readonly parent: THREE.Group;
  private readonly distance = 1;

  constructor(stage: StageLayer) {
    this.parent = new THREE.Group();
    stage.root.add(this.parent);
  }

  local(px: number, py: number, z = 0): THREE.Vector3 {
    return new THREE.Vector3(px - 960, 540 - py, z);
  }

  sync(stage: StageLayer, fovDeg: number): void {
    const cam = stage.camera;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    this.parent.position.copy(cam.position).addScaledVector(forward, this.distance);
    this.parent.quaternion.copy(cam.quaternion);
    const unitsPerPixel = (2 * this.distance * Math.tan((fovDeg * Math.PI) / 360)) / 1080;
    this.parent.scale.setScalar(unitsPerPixel);
    this.parent.updateMatrixWorld(true);
  }
}
