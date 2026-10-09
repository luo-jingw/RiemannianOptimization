/** KaTeX helpers shared by the E01 chapter scenes. */

/** Wraps a TeX body in a color. */
export function tc(color: string, body: string): string {
  return `\\textcolor{${color}}{${body}}`;
}

/** Shows the first `count` parts and keeps the remaining parts as phantoms, so the layout does not shift. */
export function reveal(parts: string[], count: number): string {
  return parts.map((s, i) => (i < count ? s : `\\phantom{${s}}`)).join("");
}
