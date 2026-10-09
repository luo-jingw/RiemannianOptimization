import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";
import { Polyline } from "../../../primitives/Polyline";

/** Wireframe of an axis-aligned box [min, max] in R³: two edge loops and four vertical edges. */
export class WireBox {
  private readonly lines: Polyline[];

  constructor(stage: StageLayer, min: THREE.Vector3, max: THREE.Vector3, color: string, width = 2.5) {
    const c = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
    const loop = (z: number): THREE.Vector3[] => [c(min.x, min.y, z), c(max.x, min.y, z), c(max.x, max.y, z), c(min.x, max.y, z), c(min.x, min.y, z)];
    this.lines = [
      new Polyline(stage, loop(min.z), { color, width }),
      new Polyline(stage, loop(max.z), { color, width }),
      new Polyline(stage, [c(min.x, min.y, min.z), c(min.x, min.y, max.z)], { color, width }),
      new Polyline(stage, [c(max.x, min.y, min.z), c(max.x, min.y, max.z)], { color, width }),
      new Polyline(stage, [c(max.x, max.y, min.z), c(max.x, max.y, max.z)], { color, width }),
      new Polyline(stage, [c(min.x, max.y, min.z), c(min.x, max.y, max.z)], { color, width }),
    ];
  }

  setOpacity(o: number): void {
    this.lines.forEach((l) => l.setOpacity(o));
  }
}
