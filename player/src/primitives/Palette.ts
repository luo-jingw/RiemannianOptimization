/** Series color palette. One meaning per color across all episodes. */
export const Palette = {
  background: "#0e1320",
  panel: "#161d2e",
  grid: "#26304a",
  axis: "#7b86a3",
  text: "#e8ecf4",
  muted: "#9aa4bf",
  /** The manifold / main object. */
  blue: "#5aa9ff",
  /** Points, the current step, highlights. */
  orange: "#ffa94d",
  /** Correct / established / tangent. */
  green: "#69db7c",
  /** Failure / counterexample. */
  red: "#ff6b6b",
  /** Secondary object (second chart, second metric). */
  purple: "#b197fc",
  /** Formulas being emphasized. */
  yellow: "#ffd43b",
  pink: "#f783ac",
  teal: "#3bc9db",
} as const;

export type PaletteColor = (typeof Palette)[keyof typeof Palette];
