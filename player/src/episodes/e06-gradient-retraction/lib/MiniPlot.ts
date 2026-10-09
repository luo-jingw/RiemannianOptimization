import type { FormulaHandle, FormulaLayer } from "../../../layers/FormulaLayer";
import { Palette } from "../../../primitives/Palette";
import type { SvgOverlay, SvgPath, SvgStroke } from "./SvgOverlay";

/** Placement and data range of a small function plot. */
export interface MiniPlotSpec {
  /** Left, top, width, height of the plot area in frame pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xLabel: string;
  yLabel: string;
}

/** A flat function plot (panel, axes through the origin, labels) drawn on an SvgOverlay. */
export class MiniPlot {
  private readonly panel: SvgPath;
  private readonly xAxis: SvgPath;
  private readonly yAxis: SvgPath;
  private readonly xLabel: FormulaHandle;
  private readonly yLabel: FormulaHandle;

  constructor(private readonly svg: SvgOverlay, formulas: FormulaLayer, readonly spec: MiniPlotSpec) {
    const pad = 18;
    this.panel = svg.path({ color: "#2b3550", width: 1, fill: "rgba(22, 29, 46, 0.88)" });
    this.panel.setPoints([
      { x: spec.x - pad, y: spec.y - pad }, { x: spec.x + spec.w + pad, y: spec.y - pad },
      { x: spec.x + spec.w + pad, y: spec.y + spec.h + pad }, { x: spec.x - pad, y: spec.y + spec.h + pad },
    ], true);
    this.xAxis = svg.path({ color: Palette.axis, width: 2 });
    this.yAxis = svg.path({ color: Palette.axis, width: 2 });
    const o = this.px(Math.max(spec.xMin, Math.min(spec.xMax, 0)), Math.max(spec.yMin, Math.min(spec.yMax, 0)));
    this.xAxis.setPoints([{ x: spec.x, y: o.y }, { x: spec.x + spec.w, y: o.y }]);
    this.yAxis.setPoints([{ x: o.x, y: spec.y }, { x: o.x, y: spec.y + spec.h }]);
    this.xLabel = formulas.add({ tex: spec.xLabel, x: spec.x + spec.w + 6, y: o.y, size: 28, color: Palette.muted, align: "left" });
    this.yLabel = formulas.add({ tex: spec.yLabel, x: o.x, y: spec.y - 8, size: 28, color: Palette.muted, valign: "bottom" });
  }

  /** Data point → frame pixel. */
  px(t: number, v: number): { x: number; y: number } {
    const s = this.spec;
    return { x: s.x + ((t - s.xMin) / (s.xMax - s.xMin)) * s.w, y: s.y + s.h - ((v - s.yMin) / (s.yMax - s.yMin)) * s.h };
  }

  /** A new curve path styled by `stroke`. */
  curve(stroke: SvgStroke): SvgPath {
    return this.svg.path(stroke);
  }

  /** Samples v = fn(t) on [a, b] into `path`, keeping only the samples inside the vertical range. */
  plot(path: SvgPath, fn: (t: number) => number, a: number, b: number, n = 120): void {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= n; i++) {
      const t = a + ((b - a) * i) / n;
      const v = fn(t);
      if (v >= this.spec.yMin - 1e-9 && v <= this.spec.yMax + 1e-9) pts.push(this.px(t, v));
    }
    path.setPoints(pts);
  }

  setOpacity(o: number): void {
    this.panel.setOpacity(o);
    this.xAxis.setOpacity(o);
    this.yAxis.setOpacity(o);
    this.xLabel.set({ opacity: o });
    this.yLabel.set({ opacity: o });
  }
}
