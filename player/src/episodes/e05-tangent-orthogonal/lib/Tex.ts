/** KaTeX string helpers used by the E05 scenes. */
export class Tex {
  /** Colored TeX fragment. */
  static c(color: string, body: string): string {
    return `\\textcolor{${color}}{${body}}`;
  }

  /** Shows the first n parts; the rest are phantoms, so the layout stays fixed while parts appear. */
  static reveal(parts: string[], n: number): string {
    return parts.map((s, i) => (i < n ? s : `\\phantom{${s}}`)).join("");
  }

  /** Lines of an aligned block; lines past n are phantoms. Each line is "left & right". */
  static revealLines(lines: string[], n: number): string {
    const hide = (s: string): string => {
      const k = s.indexOf("&");
      return k < 0 ? `\\phantom{${s}}` : `\\phantom{${s.slice(0, k)}}&\\phantom{${s.slice(k + 1)}}`;
    };
    const body = lines.map((s, i) => (i < n ? s : hide(s))).join("\\\\[4pt]");
    return `\\begin{aligned}${body}\\end{aligned}`;
  }
}
