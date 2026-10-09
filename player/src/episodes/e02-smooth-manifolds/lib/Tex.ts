/** KaTeX helpers used by E02 scenes. */
export class Tex {
  /** Wraps `body` in \textcolor. */
  static c(color: string, body: string): string {
    return `\\textcolor{${color}}{${body}}`;
  }

  /** Concatenates `parts`, rendering parts with index ≥ n as \phantom so the layout stays fixed. */
  static reveal(parts: string[], n: number): string {
    return parts.map((s, i) => (i < n ? s : `\\phantom{${s}}`)).join("");
  }
}
