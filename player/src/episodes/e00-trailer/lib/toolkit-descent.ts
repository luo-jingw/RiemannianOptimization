import * as THREE from "three";
import type { HeightField } from "./toolkit-terrain";

/**
 * Riemannian gradient descent of the height h on its own graph M = {(x, y, h(x, y))} with the
 * metric induced from R³, written in the (x, y) chart.
 * Metric: G = I + ∇h ∇hᵀ, so the Riemannian gradient has coordinates G⁻¹∇h = ∇h / (1 + |∇h|²).
 * Retraction: R_p(v) = the graph point over (x, y) + (v_x, v_y), i.e. vertical projection back onto M.
 * Iteration: (x, y) ← (x, y) − α ∇h / (1 + |∇h|²).
 */
export class GraphDescent {
  constructor(private readonly field: HeightField, readonly alpha: number) {}

  /** Chart coordinates of the descent step −α grad h at (x, y). */
  stepCoordinates(p: THREE.Vector2): THREE.Vector2 {
    const g = this.field.gradient(p.x, p.y);
    return g.multiplyScalar(-this.alpha / (1 + g.lengthSq()));
  }

  /** Unit tangent vector in R³ of the steepest descent direction −grad h at (x, y). */
  descentDirection(p: THREE.Vector2): THREE.Vector3 {
    const d = this.stepCoordinates(p);
    return this.field.tangent(p.x, p.y, d.x, d.y).normalize();
  }

  /** Iterates p_0 .. p_steps in chart coordinates. */
  iterates(start: THREE.Vector2, steps: number): THREE.Vector2[] {
    const pts = [start.clone()];
    for (let k = 0; k < steps; k++) {
      const p = pts[pts.length - 1];
      pts.push(p.clone().add(this.stepCoordinates(p)));
    }
    return pts;
  }
}
