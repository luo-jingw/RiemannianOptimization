import type * as THREE from "three";
import type { FormulaHandle } from "../../../layers/FormulaLayer";
import type { StageLayer } from "../../../layers/StageLayer";

/** Places formula handles at projected world points (call after the frame's view is set). */
export class Anchor {
  constructor(private readonly stage: StageLayer) {}

  place(h: FormulaHandle, world: THREE.Vector3, opacity: number, dx = 0, dy = 0): void {
    const p = this.stage.project(world);
    h.set({ x: p.x + dx, y: p.y + dy, opacity });
  }
}
