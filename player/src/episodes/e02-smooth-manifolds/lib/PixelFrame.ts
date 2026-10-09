import * as THREE from "three";

/**
 * Converts output-frame pixels to world points for the default 2D view
 * (stage.setView2D(0, 0, 9): 120 px per world unit, frame center at the world origin).
 */
export class PixelFrame {
  static readonly PX_PER_UNIT = 120;

  static world(px: number, py: number): THREE.Vector3 {
    return new THREE.Vector3((px - 960) / PixelFrame.PX_PER_UNIT, (540 - py) / PixelFrame.PX_PER_UNIT, 0);
  }

  /** A math-coordinate frame with origin at pixel (ox, oy) and `unitPx` pixels per math unit. */
  static frame(ox: number, oy: number, unitPx: number): (x: number, y: number) => THREE.Vector3 {
    const o = PixelFrame.world(ox, oy);
    const k = unitPx / PixelFrame.PX_PER_UNIT;
    return (x: number, y: number): THREE.Vector3 => new THREE.Vector3(o.x + k * x, o.y + k * y, 0);
  }
}
