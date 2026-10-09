import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";

/**
 * A 2D view in which world coordinates equal output pixels divided by 100 (y pointing down on screen),
 * so stage objects and formula labels share one coordinate system.
 */
export class PixelSpace {
  static apply(stage: StageLayer): void {
    stage.setView2D(9.6, -5.4, 10.8);
  }

  /** World point of output pixel (px, py). */
  static p(px: number, py: number): THREE.Vector3 {
    return new THREE.Vector3(px / 100, -py / 100, 0);
  }

  /** Circle of radius r px around pixel (cx, cy). */
  static circle(cx: number, cy: number, r: number, n = 96): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * 2 * Math.PI;
      pts.push(PixelSpace.p(cx + r * Math.cos(a), cy + r * Math.sin(a)));
    }
    return pts;
  }
}
