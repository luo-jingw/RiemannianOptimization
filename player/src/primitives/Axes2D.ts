import * as THREE from "three";
import type { FormulaHandle, FormulaLayer } from "../layers/FormulaLayer";
import type { StageLayer } from "../layers/StageLayer";
import { Arrow } from "./Arrow";
import { Palette } from "./Palette";
import { Polyline } from "./Polyline";

export interface Axes2DSpec {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  origin?: THREE.Vector2;
  xLabel?: string;
  yLabel?: string;
  ticks?: number[];
  grid?: boolean;
}

/** Coordinate axes with optional grid and KaTeX axis labels. */
export class Axes2D {
  private readonly arrows: Arrow[];
  private readonly grid: Polyline[] = [];
  private readonly labels: FormulaHandle[] = [];
  private readonly labelAnchors: THREE.Vector3[] = [];

  constructor(private readonly stage: StageLayer, formulas: FormulaLayer, spec: Axes2DSpec) {
    const o = spec.origin ?? new THREE.Vector2(0, 0);
    if (spec.grid) {
      for (let x = Math.ceil(spec.xMin); x <= Math.floor(spec.xMax); x++) {
        this.grid.push(new Polyline(stage, [new THREE.Vector3(x, spec.yMin, -0.02), new THREE.Vector3(x, spec.yMax, -0.02)],
          { color: Palette.grid, width: 1.5 }));
      }
      for (let y = Math.ceil(spec.yMin); y <= Math.floor(spec.yMax); y++) {
        this.grid.push(new Polyline(stage, [new THREE.Vector3(spec.xMin, y, -0.02), new THREE.Vector3(spec.xMax, y, -0.02)],
          { color: Palette.grid, width: 1.5 }));
      }
    }
    this.arrows = [
      new Arrow(stage, new THREE.Vector3(spec.xMin, o.y, 0), new THREE.Vector3(spec.xMax, o.y, 0), Palette.axis, { width: 2.5, headLength: 0.18 }),
      new Arrow(stage, new THREE.Vector3(o.x, spec.yMin, 0), new THREE.Vector3(o.x, spec.yMax, 0), Palette.axis, { width: 2.5, headLength: 0.18 }),
    ];
    if (spec.xLabel) {
      this.labels.push(formulas.add({ tex: spec.xLabel, x: 0, y: 0, size: 34, color: Palette.muted, align: "left" }));
      this.labelAnchors.push(new THREE.Vector3(spec.xMax + 0.15, o.y, 0));
    }
    if (spec.yLabel) {
      this.labels.push(formulas.add({ tex: spec.yLabel, x: 0, y: 0, size: 34, color: Palette.muted, valign: "bottom" }));
      this.labelAnchors.push(new THREE.Vector3(o.x, spec.yMax + 0.12, 0));
    }
  }

  setOpacity(o: number): void {
    this.arrows.forEach((a) => a.setOpacity(o));
    this.grid.forEach((g) => g.setOpacity(o * 0.8));
    this.labels.forEach((l, i) => {
      const p = this.stage.project(this.labelAnchors[i]);
      l.set({ x: p.x, y: p.y, opacity: o });
    });
  }
}
