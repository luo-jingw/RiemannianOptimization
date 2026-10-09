import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";

/**
 * Pixel-aligned 2D view used by every E03 chapter: world (X, Y) is output pixel (100 X, −100 Y).
 * Stage objects and KaTeX formulas then share one coordinate system (pixels).
 */
export const PIXELS_PER_WORLD = 100;

export function usePixelView(stage: StageLayer): void {
  stage.setView2D(9.6, -5.4, 10.8);
}

/** World point at output pixel (x, y). */
export function pxv(x: number, y: number, z = 0): THREE.Vector3 {
  return new THREE.Vector3(x / PIXELS_PER_WORLD, -y / PIXELS_PER_WORLD, z);
}

/** World length of `px` pixels. */
export function pxl(px: number): number {
  return px / PIXELS_PER_WORLD;
}
