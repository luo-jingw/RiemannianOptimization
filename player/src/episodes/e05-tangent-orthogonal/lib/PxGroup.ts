import * as THREE from "three";
import type { FramePoint } from "../../../layers/StageLayer";
import type { PixelSpace } from "./PixelSpace";

/**
 * A movable group in a pixel space. Children use pixel offsets (dx right, dy down) from the
 * group origin; `place` moves the origin to frame pixel (ox, oy) and scales the group by k.
 */
export class PxGroup {
  readonly group: THREE.Group;
  private ox = 0;
  private oy = 0;
  private k = 1;

  constructor(private readonly space: PixelSpace) {
    this.group = new THREE.Group();
    space.parent.add(this.group);
    this.place(0, 0, 1);
  }

  place(ox: number, oy: number, k: number): void {
    this.ox = ox;
    this.oy = oy;
    this.k = k;
    this.group.position.copy(this.space.local(ox, oy));
    this.group.scale.setScalar(k);
  }

  /** Child-local coordinates of the pixel offset (dx, dy). */
  v(dx: number, dy: number, z = 0): THREE.Vector3 {
    return new THREE.Vector3(dx, -dy, z);
  }

  /** Frame pixel of the pixel offset (dx, dy) under the current placement. */
  toFrame(dx: number, dy: number): FramePoint {
    return { x: this.ox + this.k * dx, y: this.oy + this.k * dy };
  }

  get scale(): number {
    return this.k;
  }

  adopt(obj: THREE.Object3D): void {
    this.group.add(obj);
  }
}
