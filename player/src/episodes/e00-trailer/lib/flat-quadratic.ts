import * as THREE from "three";

/**
 * The quadratic f(x) = 1/2 (λ1 u² + λ2 v²), where (u, v) are the coordinates of x in a frame
 * rotated by `angle` (u along the shallow axis, v along the steep axis).
 * Gradient descent with a fixed step α multiplies u by (1 - α λ1) and v by (1 - α λ2) per step;
 * with 1 < α λ2 < 2 the v-coordinate changes sign every step, which is the zig-zag.
 */
export class Quadratic {
  private readonly cu: number;
  private readonly su: number;

  constructor(readonly lambda1: number, readonly lambda2: number, readonly angle: number) {
    this.cu = Math.cos(angle);
    this.su = Math.sin(angle);
  }

  /** World (x, y) from frame coordinates (u, v). */
  fromFrame(u: number, v: number): THREE.Vector2 {
    return new THREE.Vector2(this.cu * u - this.su * v, this.su * u + this.cu * v);
  }

  /** Frame coordinates (u, v) of world (x, y). */
  toFrame(p: THREE.Vector2): THREE.Vector2 {
    return new THREE.Vector2(this.cu * p.x + this.su * p.y, -this.su * p.x + this.cu * p.y);
  }

  value(p: THREE.Vector2): number {
    const q = this.toFrame(p);
    return 0.5 * (this.lambda1 * q.x * q.x + this.lambda2 * q.y * q.y);
  }

  gradient(p: THREE.Vector2): THREE.Vector2 {
    const q = this.toFrame(p);
    const gu = this.lambda1 * q.x;
    const gv = this.lambda2 * q.y;
    return new THREE.Vector2(this.cu * gu - this.su * gv, this.su * gu + this.cu * gv);
  }

  /** Level set f = level: an ellipse with semi-axes sqrt(2 level / λ). */
  contour(level: number, samples: number): THREE.Vector2[] {
    const a = Math.sqrt((2 * level) / this.lambda1);
    const b = Math.sqrt((2 * level) / this.lambda2);
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= samples; i++) {
      const s = (2 * Math.PI * i) / samples;
      pts.push(this.fromFrame(a * Math.cos(s), b * Math.sin(s)));
    }
    return pts;
  }

  /** Iterates x_{k+1} = x_k - α ∇f(x_k), k = 0..steps (steps + 1 points). */
  descent(start: THREE.Vector2, alpha: number, steps: number): THREE.Vector2[] {
    const pts = [start.clone()];
    for (let k = 0; k < steps; k++) {
      const x = pts[pts.length - 1];
      pts.push(x.clone().sub(this.gradient(x).multiplyScalar(alpha)));
    }
    return pts;
  }
}
