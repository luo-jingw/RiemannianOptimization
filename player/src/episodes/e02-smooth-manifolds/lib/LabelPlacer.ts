import type * as THREE from "three";
import type { FormulaHandle } from "../../../layers/FormulaLayer";
import type { StageLayer } from "../../../layers/StageLayer";

/** Places formula handles at projected world points (call after the frame's view is set). */
export class LabelPlacer {
  constructor(private readonly stage: StageLayer) {}

  place(h: FormulaHandle, world: THREE.Vector3, dx: number, dy: number, opacity: number): void {
    const p = this.stage.project(world);
    h.set({ x: p.x + dx, y: p.y + dy, opacity });
  }
}
