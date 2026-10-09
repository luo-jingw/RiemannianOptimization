import type * as THREE from "three";
import type { FormulaHandle } from "../../../layers/FormulaLayer";
import type { StageLayer } from "../../../layers/StageLayer";

/** Positions a formula at the projection of a world point (call after the frame's view is set). */
export function placeAt(stage: StageLayer, h: FormulaHandle, world: THREE.Vector3, dx: number, dy: number, opacity: number): void {
  const p = stage.project(world);
  h.set({ x: p.x + dx, y: p.y + dy, opacity });
}
