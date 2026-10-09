import * as THREE from "three";
import { sampleCurve } from "../../../primitives/Polyline";

/** Point samples of planar shapes used by the E01 2D chapters (z = 0 plane). */
export class Shapes {
  /** Closed axis-aligned square of half-side h around (cx, cy), `perSide` samples per side. */
  static square(cx: number, cy: number, h: number, perSide = 16): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]];
    for (let k = 0; k < 4; k++) {
      const [ax, ay] = corners[k];
      const [bx, by] = corners[k + 1];
      for (let i = 0; i < perSide; i++) {
        const s = i / perSide;
        pts.push(new THREE.Vector3(cx + h * (ax + (bx - ax) * s), cy + h * (ay + (by - ay) * s), 0));
      }
    }
    pts.push(pts[0].clone());
    return pts;
  }

  /** Smooth star-shaped blob: radius r(θ) = base·(1 + a·sin(3θ + phase) + b·cos(5θ − phase)), squashed vertically by `squash`. */
  static blob(cx: number, cy: number, base: number, a: number, b: number, phase: number, squash = 1, n = 160): THREE.Vector3[] {
    return sampleCurve((s) => {
      const r = base * (1 + a * Math.sin(3 * s + phase) + b * Math.cos(5 * s - phase));
      return new THREE.Vector3(cx + r * Math.cos(s), cy + squash * r * Math.sin(s), 0);
    }, 0, 2 * Math.PI, n);
  }

  /** Distance from point p to the closest sample of a closed curve (used to size balls that fit inside a blob). */
  static distanceToCurve(p: THREE.Vector3, curve: THREE.Vector3[]): number {
    let best = Infinity;
    for (let i = 0; i + 1 < curve.length; i++) {
      const a = curve[i];
      const b = curve[i + 1];
      const ab = b.clone().sub(a);
      const s = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / Math.max(1e-12, ab.lengthSq())));
      best = Math.min(best, a.clone().add(ab.multiplyScalar(s)).distanceTo(p));
    }
    return best;
  }

  /** Arc of a circle around (cx, cy) of radius r from angle a0 to a1. */
  static arc(cx: number, cy: number, r: number, a0: number, a1: number, n = 48): THREE.Vector3[] {
    return sampleCurve((s) => new THREE.Vector3(cx + r * Math.cos(s), cy + r * Math.sin(s), 0), a0, a1, n);
  }

  /** Even-odd point-in-polygon test in the z = 0 plane. */
  static inside(p: THREE.Vector3, poly: THREE.Vector3[]): boolean {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i];
      const b = poly[j];
      if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
    }
    return c;
  }

  /** Maximal runs of consecutive samples of `curve` lying outside every polygon in `others` (pieces of a union boundary). */
  static outsideRuns(curve: THREE.Vector3[], others: THREE.Vector3[][]): THREE.Vector3[][] {
    const runs: THREE.Vector3[][] = [];
    let current: THREE.Vector3[] = [];
    for (const p of curve) {
      const out = others.every((o) => !Shapes.inside(p, o));
      if (out) current.push(p);
      else if (current.length) {
        runs.push(current);
        current = [];
      }
    }
    if (current.length) {
      // the curve is closed: join the last run with the first one when both touch the seam
      if (runs.length && others.every((o) => !Shapes.inside(curve[0], o))) runs[0] = [...current, ...runs[0]];
      else runs.push(current);
    }
    return runs.filter((r) => r.length >= 2);
  }

  /** Rounded capsule around the segment a–b with radius r. */
  static capsule(a: THREE.Vector3, b: THREE.Vector3, r: number, n = 24): THREE.Vector3[] {
    const d = b.clone().sub(a);
    const ang = Math.atan2(d.y, d.x);
    const pts = [
      ...Shapes.arc(b.x, b.y, r, ang - Math.PI / 2, ang + Math.PI / 2, n),
      ...Shapes.arc(a.x, a.y, r, ang + Math.PI / 2, ang + (3 * Math.PI) / 2, n),
    ];
    pts.push(pts[0].clone());
    return pts;
  }
}
