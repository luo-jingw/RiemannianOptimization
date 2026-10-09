/** KaTeX string helpers for this episode. */
export class Tex {
  static color(color: string, body: string): string {
    return `\\textcolor{${color}}{${body}}`;
  }

  /** Shows the first n parts; the rest are rendered as phantoms so the layout never shifts. */
  static reveal(parts: string[], n: number): string {
    return parts.map((s, i) => (i < n ? s : `\\phantom{${s}}`)).join("");
  }
}
