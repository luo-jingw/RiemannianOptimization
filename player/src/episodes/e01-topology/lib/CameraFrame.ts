import * as THREE from "three";
import { FRAME_HEIGHT, FRAME_WIDTH } from "../../../core/Frame";

/**
 * Basis of a perspective camera with z up (same convention as StageLayer.setView3D).
 * `at(px, py, dist)` returns the world point that projects to output pixel (px, py) at distance
 * `dist` along the viewing direction, so flat insets can be pinned to the screen while the camera moves.
 */
export class CameraFrame {
  readonly forward: THREE.Vector3;
  readonly right: THREE.Vector3;
  readonly up: THREE.Vector3;

  constructor(readonly position: THREE.Vector3, target: THREE.Vector3, readonly fovDeg: number) {
    this.forward = target.clone().sub(position).normalize();
    this.right = this.forward.clone().cross(new THREE.Vector3(0, 0, 1)).normalize();
    this.up = this.right.clone().cross(this.forward).normalize();
  }

  at(px: number, py: number, dist: number): THREE.Vector3 {
    const halfH = Math.tan((this.fovDeg * Math.PI) / 360) * dist;
    const halfW = (halfH * FRAME_WIDTH) / FRAME_HEIGHT;
    const nx = (px / FRAME_WIDTH) * 2 - 1;
    const ny = 1 - (py / FRAME_HEIGHT) * 2;
    return this.position.clone()
      .add(this.forward.clone().multiplyScalar(dist))
      .add(this.right.clone().multiplyScalar(nx * halfW))
      .add(this.up.clone().multiplyScalar(ny * halfH));
  }
}
