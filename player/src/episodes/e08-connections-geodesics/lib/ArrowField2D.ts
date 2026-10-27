import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";
import { Arrow } from "../../../primitives/Arrow";

/** A plane vector field drawn as arrows at fixed sample points; each arrow is the field value times `scale`. */
export class ArrowField2D {
  private readonly arrows: Arrow[];

  constructor(stage: StageLayer, private readonly points: THREE.Vector2[], private field: (p: THREE.Vector2) => THREE.Vector2,
              color: string, private readonly scale: number, width = 2.5, headLength = 0.09) {
    this.arrows = points.map(() => new Arrow(stage, new THREE.Vector3(), new THREE.Vector3(0.01, 0, 0), color, { width, headLength }));
    this.place();
  }

  /** Replaces the field and redraws. */
  setField(field: (p: THREE.Vector2) => THREE.Vector2): void {
    this.field = field;
    this.place();
  }

  setOpacity(o: number): void {
    this.arrows.forEach((a) => a.setOpacity(o));
  }

  private place(): void {
    this.points.forEach((p, i) => {
      const v = this.field(p).multiplyScalar(this.scale);
      const len = v.length();
      const to = len < 1e-4 ? new THREE.Vector2(p.x + 1e-4, p.y) : p.clone().add(v);
      this.arrows[i].set(new THREE.Vector3(p.x, p.y, 0), new THREE.Vector3(to.x, to.y, 0));
    });
  }
}

/** Grid of sample points [x0, x1] × [y0, y1] with nx × ny points. */
export function gridPoints(x0: number, x1: number, y0: number, y1: number, nx: number, ny: number): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      out.push(new THREE.Vector2(x0 + ((x1 - x0) * i) / Math.max(1, nx - 1), y0 + ((y1 - y0) * j) / Math.max(1, ny - 1)));
    }
  }
  return out;
}
