import * as THREE from "three";
import { GallerySegments, type GallerySegmentsStyle } from "./gallery-segments";

/**
 * A polyline of at most `capacity` points drawn as segments with a colour gradient along its length.
 * Point counts may change from frame to frame without reallocating.
 */
export class GalleryPath {
  readonly segments: GallerySegments;
  private readonly ca = new THREE.Color();
  private readonly cb = new THREE.Color();

  constructor(capacity: number, style: GallerySegmentsStyle) {
    this.segments = new GallerySegments(Math.max(1, capacity - 1), style);
  }

  get object(): THREE.Object3D {
    return this.segments.object;
  }

  /**
   * Draws the path through `points`; `colorAt(s)` gives the colour at arc fraction s in [0, 1] (by index),
   * so a fading tail is a colour ramp towards black under additive blending.
   */
  setPoints(points: THREE.Vector3[], colorAt: (s: number, out: THREE.Color) => void): void {
    const n = Math.min(points.length, this.segments.capacity + 1);
    for (let i = 0; i + 1 < n; i++) {
      colorAt(i / Math.max(1, n - 1), this.ca);
      colorAt((i + 1) / Math.max(1, n - 1), this.cb);
      this.segments.set(i, points[i], points[i + 1], this.ca, this.cb);
    }
    this.segments.commit(n - 1);
  }

  setOpacity(o: number): void {
    this.segments.setOpacity(o);
  }
}
