import type { FormulaHandle, FormulaLayer } from "../../../layers/FormulaLayer";
import { Palette } from "../../../primitives/Palette";

/** The series dependency chain shown as a narrow strip at the top of the frame. */
export class RoadSign {
  static readonly NODES: string[] = [
    "\\text{Inverse Function Thm}",
    "\\text{Implicit Function Thm}",
    "\\text{Regular level sets}",
    "T_pM=\\ker Dh",
    "O(n)",
  ];
  /** Node and arrow centers for font size 28, measured from the left end of the strip (total width 1410). */
  static readonly NODE_X: number[] = [145, 520, 875, 1175, 1380];
  static readonly ARROW_X: number[] = [330, 710, 1040, 1310];
  static readonly WIDTH = 1410;
  private readonly nodes: FormulaHandle[];
  private readonly arrows: FormulaHandle[];

  constructor(formulas: FormulaLayer, centerX: number, y = 34, size = 20) {
    const k = size / 28;
    const x0 = centerX - (RoadSign.WIDTH * k) / 2;
    this.nodes = RoadSign.NODES.map((tex, i) => formulas.add({ tex, x: x0 + RoadSign.NODE_X[i] * k, y, size, color: Palette.muted }));
    this.arrows = RoadSign.ARROW_X.map((ax) => formulas.add({ tex: "\\rightarrow", x: x0 + ax * k, y, size, color: Palette.muted }));
  }

  /** `focus` is the highlighted node; nodes before `done` are drawn as completed (green). */
  update(opacity: number, focus: number, done = 0, focusColor: string = Palette.yellow): void {
    this.nodes.forEach((h, i) => {
      const color = i === focus ? focusColor : i < done ? Palette.green : Palette.muted;
      h.set({ opacity: opacity * (i === focus || i < done ? 1 : 0.6), color });
    });
    this.arrows.forEach((h) => h.set({ opacity: opacity * 0.6 }));
  }
}
