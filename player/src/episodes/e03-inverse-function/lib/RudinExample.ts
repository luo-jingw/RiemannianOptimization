/**
 * The worked example of the proof chapters (c07–c09):
 * f(u, v) = (u + v²/4, v + u²/4), base point a = 0, A = f'(0) = I, λ = 1/2,
 * f'(u, v) = [[1, v/2], [u/2, 1]], ‖f'(x) − A‖ = max(|u|, |v|)/2, so ‖f'(x) − A‖ < λ on the open unit ball U.
 * Frozen Newton map: φ_y(x) = x + A⁻¹(y − f(x)) = (y₁ − v²/4, y₂ − u²/4).
 */
export class RudinExample {
  static readonly LAMBDA = 0.5;

  static f(u: number, v: number): [number, number] {
    return [u + (v * v) / 4, v + (u * u) / 4];
  }

  /** Row-major derivative [[a, b], [c, d]]. */
  static jacobian(u: number, v: number): [number, number, number, number] {
    return [1, v / 2, u / 2, 1];
  }

  /** Operator norm of f'(u, v) − I. */
  static deviation(u: number, v: number): number {
    return Math.max(Math.abs(u), Math.abs(v)) / 2;
  }

  static phi(y: [number, number], u: number, v: number): [number, number] {
    return [y[0] - (v * v) / 4, y[1] - (u * u) / 4];
  }

  /** Iterates of φ_y starting at `start` (x₀ = start, ..., x_n). */
  static iterates(y: [number, number], start: [number, number], n: number): [number, number][] {
    const out: [number, number][] = [start];
    let x = start;
    for (let i = 0; i < n; i++) {
      x = RudinExample.phi(y, x[0], x[1]);
      out.push(x);
    }
    return out;
  }

  /** The inverse g(y): the fixed point of φ_y in the unit ball (80 iterations from 0). */
  static inverse(y: [number, number]): [number, number] {
    const it = RudinExample.iterates(y, [0, 0], 80);
    return it[it.length - 1];
  }
}
