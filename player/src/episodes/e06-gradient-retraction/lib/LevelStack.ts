import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";
import { Polyline } from "../../../primitives/Polyline";

/**
 * Picture of a covector ℓ(v) = n·v on a plane: the level lines {v : ℓ(v) = k·step} for integer k,
 * clipped to a disc of radius `radius` around the plane's origin. `map` sends plane coordinates
 * to world points (identity-like for a flat 2D view, the tangent-plane embedding in 3D).
 * The number of lines is fixed at construction; lines outside the disc are hidden.
 */
export class LevelStack {
  private readonly lines: Polyline[] = [];
  private readonly kMax: number;

  constructor(stage: StageLayer, private readonly map: (p: THREE.Vector2) => THREE.Vector3,
              private readonly radius: number, color: string, opts: { kMax?: number; width?: number } = {}) {
    this.kMax = opts.kMax ?? 12;
    for (let k = -this.kMax; k <= this.kMax; k++) {
      this.lines.push(new Polyline(stage, [new THREE.Vector3(), new THREE.Vector3(1, 0, 0)], { color, width: opts.width ?? 2.5 }));
    }
  }

  /** Index of the line with level value k·step in `lineFor`. */
  private index(k: number): number {
    return k + this.kMax;
  }

  /**
   * Shows the level lines of ℓ(v) = n·v at values k·step. `opacityOf(k)` gives each line's opacity
   * (e.g. to reveal lines one by one); lines that miss the disc are hidden.
   */
  update(n: THREE.Vector2, step: number, opacityOf: (k: number) => number): void {
    const len = n.length();
    for (let k = -this.kMax; k <= this.kMax; k++) {
      const line = this.lines[this.index(k)];
      if (len < 1e-6) {
        line.setOpacity(0);
        continue;
      }
      const nh = n.clone().divideScalar(len);
      const d = (k * step) / len;
      if (Math.abs(d) >= this.radius) {
        line.setOpacity(0);
        continue;
      }
      const h = Math.sqrt(this.radius * this.radius - d * d);
      const perp = new THREE.Vector2(-nh.y, nh.x);
      const foot = nh.clone().multiplyScalar(d);
      line.setPoints([this.map(foot.clone().addScaledVector(perp, -h)), this.map(foot.clone().addScaledVector(perp, h))]);
      line.setOpacity(opacityOf(k));
    }
  }

  setColor(color: string): void {
    this.lines.forEach((l) => l.setColor(color));
  }

  hide(): void {
    this.lines.forEach((l) => l.setOpacity(0));
  }

  /** Point on the level line with value k·step closest to the origin (for labels). */
  static footPoint(n: THREE.Vector2, step: number, k: number): THREE.Vector2 {
    const len2 = n.lengthSq();
    return n.clone().multiplyScalar((k * step) / Math.max(len2, 1e-12));
  }
}
