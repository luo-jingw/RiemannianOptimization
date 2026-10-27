import * as THREE from "three";

/**
 * Geometry on the unit sphere S² ⊂ ℝ³ with the induced metric, used across E08: tangential projection, great
 * circles, the exponential map, latitude circles, parallel transport along great-circle arcs, and the curves of two
 * retractions. The parallel transport equation on S² is Ż = −⟨Z, γ̇⟩γ (D/dt Z = Proj(Ż) = 0 with ⟨Z, γ⟩ = 0).
 */

/** Tangential part of w at x: w − ⟨x, w⟩x. */
export function proj(x: THREE.Vector3, w: THREE.Vector3): THREE.Vector3 {
  return w.clone().addScaledVector(x, -x.dot(w));
}

/** Point on the great circle through x with unit tangent u, at arc length s: cos s · x + sin s · u. */
export function greatCircle(x: THREE.Vector3, u: THREE.Vector3, s: number): THREE.Vector3 {
  return x.clone().multiplyScalar(Math.cos(s)).addScaledVector(u, Math.sin(s));
}

/** Velocity of greatCircle at arc length s: −sin s · x + cos s · u. */
export function greatCircleVelocity(x: THREE.Vector3, u: THREE.Vector3, s: number): THREE.Vector3 {
  return x.clone().multiplyScalar(-Math.sin(s)).addScaledVector(u, Math.cos(s));
}

/** Exp_x(v) = cos‖v‖ · x + sin‖v‖ · v/‖v‖. */
export function expMap(x: THREE.Vector3, v: THREE.Vector3): THREE.Vector3 {
  const n = v.length();
  if (n < 1e-12) return x.clone();
  return greatCircle(x, v.clone().divideScalar(n), n);
}

/** Point at polar angle θ (from e₃) and azimuth φ, both in radians. */
export function latitudePoint(theta: number, phi: number): THREE.Vector3 {
  return new THREE.Vector3(Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta));
}

/**
 * Parallel transport of z0 along the great-circle arc from p to q (RK4 on Ż = −⟨Z, γ̇⟩γ), returning `samples + 1`
 * points and transported vectors, endpoints included.
 */
export function transportArc(p: THREE.Vector3, q: THREE.Vector3, z0: THREE.Vector3, samples: number,
                             stepsPerSample = 40): { points: THREE.Vector3[]; vectors: THREE.Vector3[] } {
  const angle = Math.acos(Math.max(-1, Math.min(1, p.dot(q))));
  const u = q.clone().addScaledVector(p, -p.dot(q)).normalize();
  const f = (s: number, z: THREE.Vector3): THREE.Vector3 =>
    greatCircle(p, u, s).multiplyScalar(-z.dot(greatCircleVelocity(p, u, s)));
  const points: THREE.Vector3[] = [p.clone()];
  const vectors: THREE.Vector3[] = [z0.clone()];
  const h = angle / (samples * stepsPerSample);
  let z = z0.clone();
  let s = 0;
  for (let k = 0; k < samples; k++) {
    for (let i = 0; i < stepsPerSample; i++) {
      const k1 = f(s, z);
      const k2 = f(s + h / 2, z.clone().addScaledVector(k1, h / 2));
      const k3 = f(s + h / 2, z.clone().addScaledVector(k2, h / 2));
      const k4 = f(s + h, z.clone().addScaledVector(k3, h));
      z = z.clone().addScaledVector(k1, h / 6).addScaledVector(k2, h / 3).addScaledVector(k3, h / 3).addScaledVector(k4, h / 6);
      s += h;
    }
    points.push(greatCircle(p, u, s));
    vectors.push(z.clone());
  }
  return { points, vectors };
}

/** Normalization retraction curve c(t) = (x + tv)/‖x + tv‖. */
export function normalizationCurve(x: THREE.Vector3, v: THREE.Vector3, t: number): THREE.Vector3 {
  return x.clone().addScaledVector(v, t).normalize();
}

/** First-order-only retraction curve c(t) = (x + tv + ½t²‖v‖²w)/‖·‖, w a unit tangent orthogonal to v. */
export function sidewaysCurve(x: THREE.Vector3, v: THREE.Vector3, w: THREE.Vector3, t: number): THREE.Vector3 {
  return x.clone().addScaledVector(v, t).addScaledVector(w, 0.5 * t * t * v.lengthSq()).normalize();
}
