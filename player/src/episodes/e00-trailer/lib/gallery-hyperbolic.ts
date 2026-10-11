import * as THREE from "three";

/** A point of the Poincaré disk as a complex number x + i y with x² + y² < 1. */
export interface DiskPoint {
  x: number;
  y: number;
}

/** Möbius isometry of the disk moving `a` to the origin: z -> (z - a) / (1 - conj(a) z). */
export function mobiusToOrigin(z: DiskPoint, a: DiskPoint): DiskPoint {
  const nx = z.x - a.x;
  const ny = z.y - a.y;
  // 1 - conj(a) z = 1 - (a.x - i a.y)(z.x + i z.y)
  const dx = 1 - (a.x * z.x + a.y * z.y);
  const dy = -(a.x * z.y - a.y * z.x);
  const d2 = dx * dx + dy * dy;
  return { x: (nx * dx + ny * dy) / d2, y: (ny * dx - nx * dy) / d2 };
}

/** Euclidean radius of the disk point at hyperbolic distance `rho` from the origin (curvature -1). */
export function diskRadiusOfDistance(rho: number): number {
  return Math.tanh(rho / 2);
}

/**
 * Samples the hyperbolic geodesic from p to q, truncated at arc fraction `upTo` (0..1), into `n + 1` points.
 * The geodesic is the arc of the circle through p and q orthogonal to the unit circle, or the straight segment
 * when p, q and the origin are collinear.
 */
export function geodesicPoints(p: DiskPoint, q: DiskPoint, n: number, upTo = 1): DiskPoint[] {
  const out: DiskPoint[] = [];
  const cross = p.x * q.y - p.y * q.x;
  const pp = p.x * p.x + p.y * p.y;
  const qq = q.x * q.x + q.y * q.y;
  if (Math.abs(cross) < 1e-9) {
    for (let i = 0; i <= n; i++) {
      const s = (upTo * i) / n;
      out.push({ x: p.x + (q.x - p.x) * s, y: p.y + (q.y - p.y) * s });
    }
    return out;
  }
  // Circle orthogonal to the unit circle: |c|² = r² + 1. Through p and q: 2 c·p = |p|² + 1, 2 c·q = |q|² + 1.
  const bp = (pp + 1) / 2;
  const bq = (qq + 1) / 2;
  const cx = (bp * q.y - bq * p.y) / cross;
  const cy = (p.x * bq - q.x * bp) / cross;
  const r = Math.sqrt(cx * cx + cy * cy - 1);
  const a0 = Math.atan2(p.y - cy, p.x - cx);
  let a1 = Math.atan2(q.y - cy, q.x - cx);
  let da = a1 - a0;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  a1 = a0 + da; // the short arc lies inside the disk
  for (let i = 0; i <= n; i++) {
    const ang = a0 + da * ((upTo * i) / n);
    out.push({ x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) });
  }
  return out;
}

/** Conformal factor of the disk metric: Euclidean length of a unit hyperbolic length at z is (1 - |z|²) / 2. */
export function conformalScale(z: DiskPoint): number {
  return (1 - (z.x * z.x + z.y * z.y)) / 2;
}

export function diskToVector(z: DiskPoint, scale: number, zHeight = 0): THREE.Vector3 {
  return new THREE.Vector3(z.x * scale, z.y * scale, zHeight);
}
