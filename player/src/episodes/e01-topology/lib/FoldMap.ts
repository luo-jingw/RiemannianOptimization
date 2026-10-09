import * as THREE from "three";
import { PixelSpace } from "./PixelSpace";

/**
 * The explicit map f: X → Y used for the two-panel continuity pictures, in pixel coordinates.
 * Local coordinates (u, v) are measured from each panel center; f(u, v) = (u²/240 − 60, v) folds X along u = 0,
 * so the preimage of a disk away from the fold consists of two mirror-image pieces.
 */
export class FoldMap {
  constructor(readonly xCenter: { x: number; y: number }, readonly yCenter: { x: number; y: number }) {}

  /** Image in local Y coordinates of the local X point (u, v). */
  static local(u: number, v: number): { x: number; y: number } {
    return { x: (u * u) / 240 - 60, y: v };
  }

  /** World point in the X panel. */
  xPoint(u: number, v: number): THREE.Vector3 {
    return PixelSpace.p(this.xCenter.x + u, this.xCenter.y + v);
  }

  /** World point in the Y panel. */
  yPoint(x: number, y: number): THREE.Vector3 {
    return PixelSpace.p(this.yCenter.x + x, this.yCenter.y + y);
  }

  /** World position of f(u, v) in the Y panel. */
  image(u: number, v: number): THREE.Vector3 {
    const q = FoldMap.local(u, v);
    return this.yPoint(q.x, q.y);
  }

  /** The two boundary curves of f⁻¹(disk) for a disk (local Y center c, radius r) with c.x − r > −60. */
  preimageOfDisk(c: { x: number; y: number }, r: number, n = 96): THREE.Vector3[][] {
    const right: THREE.Vector3[] = [];
    const left: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * 2 * Math.PI;
      const x = c.x + r * Math.cos(a);
      const y = c.y + r * Math.sin(a);
      const u = Math.sqrt(240 * (x + 60));
      right.push(this.xPoint(u, y));
      left.push(this.xPoint(-u, y));
    }
    return [right, left];
  }
}
