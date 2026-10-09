import * as THREE from "three";

/** Parametric pieces of the unit sphere used by the E04 chart pictures. Parameters (u, v) ∈ [0, 1]². */
export class SphereCharts {
  /**
   * The cap { x : sign · x[axis] ≥ cos(maxAngle) } of the sphere of radius `radius`;
   * maxAngle = π/2 gives the hemisphere.
   */
  static cap(axis: 0 | 1 | 2, sign: 1 | -1, radius: number, maxAngle = Math.PI / 2): (u: number, v: number, target: THREE.Vector3) => void {
    return (u, v, target) => {
      const theta = u * 2 * Math.PI;
      const phi = v * maxAngle;
      const a = radius * Math.sin(phi) * Math.cos(theta);
      const b = radius * Math.sin(phi) * Math.sin(theta);
      const n = sign * radius * Math.cos(phi);
      if (axis === 2) target.set(a, b, n);
      else if (axis === 1) target.set(b, n, a);
      else target.set(n, a, b);
    };
  }

  /**
   * Graph patch over a coordinate rectangle: the sphere points whose coordinates other than `axis`
   * lie in [c1 − h, c1 + h] × [c2 − h, c2 + h], on the side sign · x[axis] > 0.
   */
  static graphPatch(axis: 0 | 1 | 2, sign: 1 | -1, c1: number, c2: number, h: number, radius = 1.0):
  (u: number, v: number, target: THREE.Vector3) => void {
    return (u, v, target) => {
      const p = c1 - h + 2 * h * u;
      const q = c2 - h + 2 * h * v;
      const n = sign * Math.sqrt(Math.max(0, 1 - p * p - q * q)) * radius;
      SphereCharts.assemble(axis, p * radius, q * radius, n, target);
    };
  }

  /** Writes the point whose `axis` coordinate is n and whose other two coordinates are (p, q) in increasing index order. */
  static assemble(axis: 0 | 1 | 2, p: number, q: number, n: number, target: THREE.Vector3): void {
    if (axis === 2) target.set(p, q, n);
    else if (axis === 1) target.set(p, n, q);
    else target.set(n, p, q);
  }
}
