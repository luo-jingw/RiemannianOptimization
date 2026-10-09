/** KaTeX string helpers used by the E04 scenes. */
export class Tex {
  /** Colors a TeX fragment. */
  static color(color: string, body: string): string {
    return `\\textcolor{${color}}{${body}}`;
  }

  /** Joins `parts`, showing the first `shown` and keeping the rest as phantoms so the layout stays stable. */
  static reveal(parts: string[], shown: number): string {
    return parts.map((s, i) => (i < shown ? s : `\\phantom{${s}}`)).join("");
  }
}
