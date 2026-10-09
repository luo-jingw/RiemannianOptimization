import type * as THREE from "three";
import type { FormulaHandle, FormulaLayer, FormulaSpec } from "../layers/FormulaLayer";
import type { StageLayer } from "../layers/StageLayer";

/** A KaTeX label pinned to a world point, re-projected every frame (follows 3D camera motion). */
export class WorldLabel {
  readonly handle: FormulaHandle;

  constructor(private readonly stage: StageLayer, formulas: FormulaLayer, spec: Omit<FormulaSpec, "x" | "y">,
              private anchor: THREE.Vector3, private readonly offset: { x: number; y: number } = { x: 0, y: 0 }) {
    this.handle = formulas.add({ ...spec, x: 0, y: 0 });
  }

  setAnchor(anchor: THREE.Vector3): void {
    this.anchor = anchor;
  }

  update(opacity: number): void {
    const p = this.stage.project(this.anchor);
    this.handle.set({ x: p.x + this.offset.x, y: p.y + this.offset.y, opacity });
  }
}
