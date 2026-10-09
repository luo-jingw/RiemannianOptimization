import * as THREE from "three";
import type { FormulaHandle, FormulaLayer } from "../../../layers/FormulaLayer";
import type { FramePoint, StageLayer } from "../../../layers/StageLayer";
import { Palette } from "../../../primitives/Palette";
import { Polyline } from "../../../primitives/Polyline";
import { Region } from "../../../primitives/Region";
import type { PixelSpace } from "./PixelSpace";
import { PxArrow } from "./PxArrow";
import { PxGroup } from "./PxGroup";

export interface PlotSpec {
  /** Panel size in pixels. */
  width: number;
  height: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xLabel: string;
  yLabel: string;
  /** Data coordinates of the axes crossing. */
  originX: number;
  originY: number;
}

/** A small 2D plot on a dark panel inside a pixel space; it can be moved and scaled as one piece. */
export class PlotPanel {
  readonly grp: PxGroup;
  private readonly background: Region;
  private readonly axes: PxArrow[];
  private readonly labels: { h: FormulaHandle; x: number; y: number }[];
  private readonly pad = 46;

  constructor(private readonly stage: StageLayer, formulas: FormulaLayer, space: PixelSpace, readonly spec: PlotSpec) {
    this.grp = new PxGroup(space);
    const w = spec.width / 2;
    const h = spec.height / 2;
    this.background = new Region(stage, [this.grp.v(-w, -h), this.grp.v(w, -h), this.grp.v(w, h), this.grp.v(-w, h)],
      Palette.panel, 0.92, -0.05);
    this.grp.adopt(this.background.object);
    this.background.object.position.z = -0.05;
    const ax = new PxArrow(stage, this.grp, Palette.axis, 14, 2.5);
    const o = this.px(spec.originX, spec.originY);
    const xEnd = this.px(spec.xMax, spec.originY);
    const xStart = this.px(spec.xMin, spec.originY);
    ax.set(xStart.x, o.y, xEnd.x + 16, o.y);
    const ay = new PxArrow(stage, this.grp, Palette.axis, 14, 2.5);
    const yEnd = this.px(spec.originX, spec.yMax);
    const yStart = this.px(spec.originX, spec.yMin);
    ay.set(o.x, yStart.y, o.x, yEnd.y - 16);
    this.axes = [ax, ay];
    this.labels = [
      { h: formulas.add({ tex: spec.xLabel, x: 0, y: 0, size: 28, color: Palette.muted, align: "left" }), x: xEnd.x + 24, y: o.y },
      { h: formulas.add({ tex: spec.yLabel, x: 0, y: 0, size: 28, color: Palette.muted, valign: "bottom" }), x: o.x, y: yEnd.y - 20 },
    ];
  }

  /** Pixel offset (from the panel center) of data point (X, Y). */
  px(X: number, Y: number): { x: number; y: number } {
    const s = this.spec;
    const iw = s.width - 2 * this.pad;
    const ih = s.height - 2 * this.pad;
    return {
      x: -iw / 2 + ((X - s.xMin) / (s.xMax - s.xMin)) * iw,
      y: ih / 2 - ((Y - s.yMin) / (s.yMax - s.yMin)) * ih,
    };
  }

  v(X: number, Y: number, z = 0): THREE.Vector3 {
    const p = this.px(X, Y);
    return this.grp.v(p.x, p.y, z);
  }

  frame(X: number, Y: number): FramePoint {
    const p = this.px(X, Y);
    return this.grp.toFrame(p.x, p.y);
  }

  /** A curve Y = fn(X) sampled on [a, b], attached to the panel. */
  curve(fn: (X: number) => number, a: number, b: number, n: number, color: string, width = 4): Polyline {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const X = a + ((b - a) * i) / n;
      pts.push(this.v(X, fn(X), 0.01));
    }
    const line = new Polyline(this.stage, pts, { color, width });
    this.grp.adopt(line.object);
    return line;
  }

  place(cx: number, cy: number, k = 1): void {
    this.grp.place(cx, cy, k);
  }

  draw(opacity: number): void {
    this.background.setOpacity(0.92 * opacity);
    this.axes.forEach((a) => a.setOpacity(opacity));
    for (const l of this.labels) {
      const f = this.grp.toFrame(l.x, l.y);
      l.h.set({ x: f.x, y: f.y, opacity, scale: this.grp.scale });
    }
  }
}
