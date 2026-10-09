/** Small dense matrix helpers (row-major number[][]) used for numeric displays in E05. */
export class Mat {
  static mul(a: number[][], b: number[][]): number[][] {
    return a.map((row) => b[0].map((_, j) => row.reduce((s, v, k) => s + v * b[k][j], 0)));
  }

  static transpose(a: number[][]): number[][] {
    return a[0].map((_, j) => a.map((row) => row[j]));
  }

  static add(a: number[][], b: number[][]): number[][] {
    return a.map((row, i) => row.map((v, j) => v + b[i][j]));
  }

  static scale(a: number[][], s: number): number[][] {
    return a.map((row) => row.map((v) => v * s));
  }

  static rotZ(t: number): number[][] {
    return [[Math.cos(t), -Math.sin(t), 0], [Math.sin(t), Math.cos(t), 0], [0, 0, 1]];
  }

  static rotX(t: number): number[][] {
    return [[1, 0, 0], [0, Math.cos(t), -Math.sin(t)], [0, Math.sin(t), Math.cos(t)]];
  }

  static rot2(t: number): number[][] {
    return [[Math.cos(t), -Math.sin(t)], [Math.sin(t), Math.cos(t)]];
  }

  /** Fixed-decimal TeX for a number, with a proper minus sign and no "-0". */
  static fmt(v: number, digits: number): string {
    const r = Number(v.toFixed(digits));
    const s = Math.abs(r).toFixed(digits);
    return r < 0 ? `-${s}` : s;
  }
}
