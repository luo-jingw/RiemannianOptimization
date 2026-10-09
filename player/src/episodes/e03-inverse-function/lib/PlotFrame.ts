import type * as THREE from "three";
import { pxv } from "./PixelSpace";

export interface PixelPoint {
  x: number;
  y: number;
}

/** Affine map from mathematical coordinates (u, v) to output pixels: origin pixel plus scale, v up. */
export class PlotFrame {
  constructor(readonly ox: number, readonly oy: number, readonly sx: number, readonly sy: number = sx) {}

  px(u: number, v: number): PixelPoint {
    return { x: this.ox + this.sx * u, y: this.oy - this.sy * v };
  }

  v3(u: number, v: number, z = 0): THREE.Vector3 {
    const p = this.px(u, v);
    return pxv(p.x, p.y, z);
  }
}
