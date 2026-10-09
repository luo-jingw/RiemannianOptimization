import type { FormulaHandle, FormulaLayer } from "../../../layers/FormulaLayer";
import type { StageLayer } from "../../../layers/StageLayer";
import { Arrow } from "../../../primitives/Arrow";
import { Palette } from "../../../primitives/Palette";
import type { PlotFrame } from "./PlotFrame";

export interface PlotAxesSpec {
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
  uLabel?: string;
  vLabel?: string;
}

/** Two axis arrows through the origin of a PlotFrame, with KaTeX labels at the arrow tips. */
export class PlotAxes {
  private readonly arrows: Arrow[];
  private readonly labels: FormulaHandle[] = [];

  constructor(stage: StageLayer, formulas: FormulaLayer, frame: PlotFrame, spec: PlotAxesSpec) {
    this.arrows = [
      new Arrow(stage, frame.v3(spec.uMin, 0), frame.v3(spec.uMax, 0), Palette.axis, { width: 2.5, headLength: 0.16 }),
      new Arrow(stage, frame.v3(0, spec.vMin), frame.v3(0, spec.vMax), Palette.axis, { width: 2.5, headLength: 0.16 }),
    ];
    if (spec.uLabel) {
      const p = frame.px(spec.uMax, 0);
      this.labels.push(formulas.add({ tex: spec.uLabel, x: p.x + 12, y: p.y + 2, size: 30, color: Palette.muted, align: "left" }));
    }
    if (spec.vLabel) {
      const p = frame.px(0, spec.vMax);
      this.labels.push(formulas.add({ tex: spec.vLabel, x: p.x, y: p.y - 8, size: 30, color: Palette.muted, valign: "bottom" }));
    }
  }

  setOpacity(o: number): void {
    this.arrows.forEach((a) => a.setOpacity(o));
    this.labels.forEach((l) => l.set({ opacity: o }));
  }
}
