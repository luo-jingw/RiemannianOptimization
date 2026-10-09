import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";

/** Perspective camera placement on a sphere of directions around a point (z up). */
export class Orbit {
  /**
   * Places the camera at azimuth `az`, elevation `el` and distance `dist` from `center`, aimed so that
   * `center` appears at frame pixel (sx, sy). Call in every frame of a 3D chapter.
   */
  static frame(stage: StageLayer, az: number, el: number, dist: number, fovDeg: number,
               center: THREE.Vector3, sx: number, sy: number): void {
    const d = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el));
    const forward = d.clone().negate();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 0, 1)).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();
    const unitsPerPixel = (2 * dist * Math.tan((fovDeg * Math.PI) / 360)) / 1080;
    const target = center.clone()
      .addScaledVector(right, (960 - sx) * unitsPerPixel)
      .addScaledVector(up, -(540 - sy) * unitsPerPixel);
    const position = target.clone().addScaledVector(d, dist);
    stage.setView3D(position, target, fovDeg);
  }
}
