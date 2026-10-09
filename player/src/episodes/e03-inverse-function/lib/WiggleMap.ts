/**
 * The C¹-failure example of chapter c04: F(x) = x + 2x² sin(1/x), F(0) = 0.
 * F'(0) = 1, and for x ≠ 0, F'(x) = 1 + 4x sin(1/x) − 2 cos(1/x).
 */
export class WiggleMap {
  static value(x: number): number {
    return x === 0 ? 0 : x + 2 * x * x * Math.sin(1 / x);
  }

  static derivative(x: number): number {
    return x === 0 ? 1 : 1 + 4 * x * Math.sin(1 / x) - 2 * Math.cos(1 / x);
  }

  /** x_k = 1/(2kπ), where F'(x_k) = −1. */
  static xk(k: number): number {
    return 1 / (2 * k * Math.PI);
  }

  /** y_k = 1/((2k+1)π), where F'(y_k) = 3. */
  static yk(k: number): number {
    return 1 / ((2 * k + 1) * Math.PI);
  }

  /** Roots of F(x) = level in [a, b], located by sign changes on n samples and refined by bisection. */
  static crossings(level: number, a: number, b: number, n: number): number[] {
    const out: number[] = [];
    let x0 = a;
    let f0 = WiggleMap.value(x0) - level;
    for (let i = 1; i <= n; i++) {
      const x1 = a + ((b - a) * i) / n;
      const f1 = WiggleMap.value(x1) - level;
      if (f0 === 0) out.push(x0);
      else if (f0 * f1 < 0) {
        let lo = x0;
        let hi = x1;
        for (let k = 0; k < 60; k++) {
          const mid = (lo + hi) / 2;
          if ((WiggleMap.value(lo) - level) * (WiggleMap.value(mid) - level) <= 0) hi = mid;
          else lo = mid;
        }
        out.push((lo + hi) / 2);
      }
      x0 = x1;
      f0 = f1;
    }
    return out;
  }
}
