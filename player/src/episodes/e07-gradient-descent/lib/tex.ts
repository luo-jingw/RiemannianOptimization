/** KaTeX helpers shared by the E07 chapter scenes. */
export class Tex {
  /** `body` in `color`. */
  static color(color: string, body: string): string {
    return `\\textcolor{${color}}{${body}}`;
  }

  /**
   * Rows of a gathered/aligned block; rows at index ≥ n are phantoms so the layout is stable. In an aligned block each
   * &-cell is hidden separately (rows must then not contain matrices); in a gathered block the whole row is hidden.
   */
  static rows(list: string[], n: number, env = "gathered"): string {
    const hide = (r: string): string => env === "aligned"
      ? r.split("&").map((cell) => (cell.length ? `\\phantom{${cell}}` : "")).join("&")
      : `\\phantom{${r}}`;
    return `\\begin{${env}}${list.map((r, i) => (i < n ? r : hide(r))).join("\\\\ ")}\\end{${env}}`;
  }

  /** Number of rows revealed at time t, given the reveal time of each row. */
  static count(t: number, times: number[]): number {
    let n = 0;
    for (const at of times) if (t >= at) n++;
    return n;
  }
}
