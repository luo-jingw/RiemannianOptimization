import * as THREE from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import type { StageLayer } from "../../../layers/StageLayer";

/**
 * A fixed number of screen-space-width line segments with per-vertex colors, updated in place.
 * Callers write `positions` (6 floats per segment: start xyz, end xyz) and `colors`
 * (6 floats per segment, linear RGB) and then call commit(). The buffers are never reallocated.
 */
export class LineField {
  readonly object: LineSegments2;
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  readonly segmentCount: number;
  private readonly geometry: LineSegmentsGeometry;
  private readonly material: LineMaterial;

  constructor(stage: StageLayer, segmentCount: number, width: number, opts: { depthTest?: boolean; depthWrite?: boolean } = {}) {
    this.segmentCount = segmentCount;
    this.positions = new Float32Array(segmentCount * 6);
    this.colors = new Float32Array(segmentCount * 6);
    this.geometry = new LineSegmentsGeometry();
    this.geometry.setPositions(this.positions);
    this.geometry.setColors(this.colors);
    this.material = new LineMaterial({
      linewidth: width,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthTest: opts.depthTest ?? true,
      depthWrite: opts.depthWrite ?? false,
      worldUnits: false,
    });
    this.material.resolution.copy(stage.resolution);
    this.object = new LineSegments2(this.geometry, this.material);
    this.object.frustumCulled = false;
    stage.root.add(this.object);
  }

  /** Uploads the current contents of `positions` and `colors`. */
  commit(): void {
    const start = this.geometry.getAttribute("instanceStart") as THREE.InterleavedBufferAttribute;
    start.data.needsUpdate = true;
    const color = this.geometry.getAttribute("instanceColorStart") as THREE.InterleavedBufferAttribute;
    color.data.needsUpdate = true;
  }

  setOpacity(o: number): void {
    this.material.opacity = Math.max(0, Math.min(1, o));
    this.object.visible = this.material.opacity > 0.001;
  }

  setWidth(px: number): void {
    this.material.linewidth = px;
  }

  setRenderOrder(order: number): void {
    this.object.renderOrder = order;
  }
}
