import * as THREE from "three";
import type { StageLayer } from "../layers/StageLayer";
import { Arrow } from "./Arrow";
import { Polyline } from "./Polyline";

/** Quadratic Bezier arrow from `from` to `to`, bulging by `bend` (world units, perpendicular). */
export class CurvedArrow {
  private readonly body: Polyline;
  private readonly tip: Arrow;
  private points: THREE.Vector3[] = [];

  constructor(stage: StageLayer, from: THREE.Vector3, to: THREE.Vector3, bend: number, color: string, width = 3.5) {
    this.body = new Polyline(stage, [from, to], { color, width });
    this.tip = new Arrow(stage, from, to, color, { width, headLength: 0.16 });
    this.set(from, to, bend);
  }

  set(from: THREE.Vector3, to: THREE.Vector3, bend: number): void {
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const d = to.clone().sub(from);
    const normal = new THREE.Vector3(-d.y, d.x, 0).normalize().multiplyScalar(bend);
    const ctrl = mid.add(normal);
    this.points = [];
    for (let i = 0; i <= 40; i++) {
      const s = i / 40;
      const a = from.clone().multiplyScalar((1 - s) * (1 - s));
      const b = ctrl.clone().multiplyScalar(2 * s * (1 - s));
      const c = to.clone().multiplyScalar(s * s);
      this.points.push(a.add(b).add(c));
    }
    this.body.setPoints(this.points.slice(0, 38));
    this.tip.set(this.points[36], this.points[40]);
  }

  /** Grows the arrow from its start: 0 = hidden, 1 = complete. */
  setProgress(p: number, opacity = 1): void {
    this.body.setProgress(p);
    this.body.setOpacity(p > 0.001 ? opacity : 0);
    this.tip.setOpacity(p > 0.97 ? opacity : 0);
  }
}
