import * as THREE from "three";
import { sampleCurve } from "../../../primitives/Polyline";

/** Point sets shared by E02 scenes. */
export class Shapes {
  /** Arc of the circle centered (cx, cy) with radius r from angle a0 to a1. */
  static arc(cx: number, cy: number, r: number, a0: number, a1: number, n = 64): THREE.Vector3[] {
    return sampleCurve((s) => new THREE.Vector3(cx + r * Math.cos(s), cy + r * Math.sin(s), 0), a0, a1, n);
  }

  /** Closed irregular blob around (cx, cy) with radii rx, ry; `phase` varies the shape. */
  static blob(cx: number, cy: number, rx: number, ry: number, phase: number, n = 96): THREE.Vector3[] {
    return sampleCurve((s) => {
      const k = 1 + 0.09 * Math.sin(3 * s + phase) + 0.05 * Math.cos(5 * s - 2 * phase);
      return new THREE.Vector3(cx + rx * k * Math.cos(s), cy + ry * k * Math.sin(s), 0);
    }, 0, 2 * Math.PI, n);
  }

  /** Straight segment from a to b sampled with n intervals. */
  static segment(a: THREE.Vector3, b: THREE.Vector3, n = 2): THREE.Vector3[] {
    return sampleCurve((s) => a.clone().lerp(b, s), 0, 1, n);
  }
}
