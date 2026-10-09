import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";

/**
 * A drawing space whose coordinates are output-frame pixels (x right, y down).
 * `parent` is the Object3D that pixel-space objects are attached to; `local` converts a frame
 * pixel into that parent's local coordinates (one local unit = one pixel, y up).
 */
export interface PixelSpace {
  readonly parent: THREE.Object3D;
  local(px: number, py: number, z?: number): THREE.Vector3;
}

/**
 * Pixel space of a 2D chapter: the orthographic view is set so that world (x, −y) is frame pixel (x, y).
 * The chapter calls `FlatPixelSpace.view(stage)` in every frame in which it uses the 2D camera.
 */
export class FlatPixelSpace implements PixelSpace {
  readonly parent: THREE.Object3D;

  constructor(stage: StageLayer) {
    this.parent = stage.root;
  }

  static view(stage: StageLayer): void {
    stage.setView2D(960, -540, 1080);
  }

  local(px: number, py: number, z = 0): THREE.Vector3 {
    return new THREE.Vector3(px, -py, z);
  }
}
