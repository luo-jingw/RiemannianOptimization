import * as THREE from "three";

/**
 * Geometry of the running example: the unit sphere S² ⊂ ℝ³ with the height function f(x) = x₃
 * and the embedded metric g_x(u, v) = uᵀv.
 */

const DEG = Math.PI / 180;

/** Point on S² with polar angle `polarDeg` from e₃ and azimuth `azDeg`. */
export function spherePoint(polarDeg: number, azDeg: number): THREE.Vector3 {
  const p = polarDeg * DEG;
  const a = azDeg * DEG;
  return new THREE.Vector3(Math.sin(p) * Math.cos(a), Math.sin(p) * Math.sin(a), Math.cos(p));
}

/** Base point x = (sin 50° cos 30°, sin 50° sin 30°, cos 50°). */
export const X0: THREE.Vector3 = spherePoint(50, 30);

export const E3: THREE.Vector3 = new THREE.Vector3(0, 0, 1);

/** Riemannian gradient of f(x) = x₃ for the embedded metric: e₃ − x₃ x. */
export function heightGrad(x: THREE.Vector3): THREE.Vector3 {
  return E3.clone().sub(x.clone().multiplyScalar(x.z));
}

/** Tangential projection of w onto x^⊥ (x a unit vector). */
export function projectTangent(x: THREE.Vector3, w: THREE.Vector3): THREE.Vector3 {
  return w.clone().sub(x.clone().multiplyScalar(x.dot(w)));
}

/** Normalization retraction R_x(v) = (x + v)/‖x + v‖. */
export function normalizeRetract(x: THREE.Vector3, v: THREE.Vector3): THREE.Vector3 {
  return x.clone().add(v).normalize();
}

/** Orthonormal tangent frame at x: east = e₃ × x normalized, north = x × east (north points toward e₃). */
export function tangentFrame(x: THREE.Vector3): { east: THREE.Vector3; north: THREE.Vector3 } {
  const east = new THREE.Vector3(-x.y, x.x, 0);
  if (east.lengthSq() < 1e-12) east.set(0, 1, 0);
  east.normalize();
  const north = x.clone().cross(east).normalize();
  return { east, north };
}

/** Point x + a·east + b·north of the tangent plane at x. */
export function tangentPoint(x: THREE.Vector3, a: number, b: number): THREE.Vector3 {
  const { east, north } = tangentFrame(x);
  return x.clone().add(east.multiplyScalar(a)).add(north.multiplyScalar(b));
}

/** Great circle through x with initial velocity v (v ⊥ x): cos(t‖v‖) x + sin(t‖v‖) v/‖v‖. */
export function greatCircle(x: THREE.Vector3, v: THREE.Vector3, t: number): THREE.Vector3 {
  const s = v.length();
  if (s < 1e-12) return x.clone();
  return x.clone().multiplyScalar(Math.cos(t * s)).add(v.clone().multiplyScalar(Math.sin(t * s) / s));
}

/** Rotation of the tangent plane at x by angle θ (counterclockwise seen from outside): Q_θ v. */
export function rotateTangent(x: THREE.Vector3, v: THREE.Vector3, theta: number): THREE.Vector3 {
  return v.clone().applyAxisAngle(x.clone().normalize(), theta);
}

/** Lift a point slightly off the unit sphere so lines drawn on it are not hidden by the surface. */
export function lift(p: THREE.Vector3, r = 1.006): THREE.Vector3 {
  return p.clone().multiplyScalar(r / p.length());
}
