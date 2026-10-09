/**
 * The running nonlinear map of chapters c02 and c03:
 * F(u, v) = (u + 0.3 sin v, v + 0.3 u²), with Jacobian [[1, 0.3 cos v], [0.6 u, 1]].
 */
export class BendMap {
  static apply(u: number, v: number): [number, number] {
    return [u + 0.3 * Math.sin(v), v + 0.3 * u * u];
  }

  /** Row-major Jacobian [a, b, c, d] = [[a, b], [c, d]]. */
  static jacobian(u: number, v: number): [number, number, number, number] {
    return [1, 0.3 * Math.cos(v), 0.6 * u, 1];
  }
}
