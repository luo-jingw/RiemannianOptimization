import * as THREE from "three";

/** Orthonormal tangent basis (e1, e2) at a point p of the unit sphere, with e1 horizontal. */
export class TangentBasis {
  readonly e1: THREE.Vector3;
  readonly e2: THREE.Vector3;

  constructor(readonly p: THREE.Vector3) {
    const z = new THREE.Vector3(0, 0, 1);
    const seed = Math.abs(p.z) > 0.99 ? new THREE.Vector3(1, 0, 0) : z;
    this.e1 = new THREE.Vector3().crossVectors(seed, p).normalize();
    this.e2 = new THREE.Vector3().crossVectors(p, this.e1).normalize();
  }

  /** Point of the unit sphere reached from p by the great circle in tangent direction angle `beta`, arc length s. */
  geodesic(beta: number, s: number): THREE.Vector3 {
    const dir = this.e1.clone().multiplyScalar(Math.cos(beta)).addScaledVector(this.e2, Math.sin(beta));
    return this.p.clone().multiplyScalar(Math.cos(s)).addScaledVector(dir, Math.sin(s));
  }

  /** Unit vector with tangent angle `beta` and elevation `alpha` above the tangent plane. */
  direction(beta: number, alpha: number): THREE.Vector3 {
    return this.e1.clone().multiplyScalar(Math.cos(beta) * Math.cos(alpha))
      .addScaledVector(this.e2, Math.sin(beta) * Math.cos(alpha))
      .addScaledVector(this.p, Math.sin(alpha));
  }
}
