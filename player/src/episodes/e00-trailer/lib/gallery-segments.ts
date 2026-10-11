import * as THREE from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { FRAME_HEIGHT, FRAME_WIDTH } from "../../../core/Frame";

export interface GallerySegmentsStyle {
  /** Line width in output pixels. */
  width: number;
  opacity?: number;
  /** Additive blending: a colour fades out by scaling it towards black. */
  additive?: boolean;
  depthTest?: boolean;
  depthWrite?: boolean;
  dashed?: boolean;
  dashSize?: number;
  gapSize?: number;
}

/**
 * A fixed-capacity set of screen-space-width line segments with per-endpoint colours. Buffers are allocated once;
 * every frame writes segments with set() and then calls commit(count).
 */
export class GallerySegments {
  readonly object: LineSegments2;
  readonly material: LineMaterial;
  private readonly geometry: LineSegmentsGeometry;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly positionBuffer: THREE.InstancedInterleavedBuffer;
  private readonly colorBuffer: THREE.InstancedInterleavedBuffer;

  constructor(readonly capacity: number, style: GallerySegmentsStyle) {
    this.geometry = new LineSegmentsGeometry();
    this.positions = new Float32Array(capacity * 6);
    this.colors = new Float32Array(capacity * 6);
    this.geometry.setPositions(this.positions);
    this.geometry.setColors(this.colors);
    this.positionBuffer = (this.geometry.attributes.instanceStart as THREE.InterleavedBufferAttribute)
      .data as THREE.InstancedInterleavedBuffer;
    this.colorBuffer = (this.geometry.attributes.instanceColorStart as THREE.InterleavedBufferAttribute)
      .data as THREE.InstancedInterleavedBuffer;
    this.positionBuffer.setUsage(THREE.DynamicDrawUsage);
    this.colorBuffer.setUsage(THREE.DynamicDrawUsage);
    this.material = new LineMaterial({
      color: 0xffffff,
      vertexColors: true,
      linewidth: style.width,
      transparent: true,
      opacity: style.opacity ?? 1,
      blending: style.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthTest: style.depthTest ?? true,
      depthWrite: style.depthWrite ?? false,
      dashed: style.dashed ?? false,
      dashSize: style.dashSize ?? 0.1,
      gapSize: style.gapSize ?? 0.08,
      worldUnits: false,
    });
    this.material.resolution.set(FRAME_WIDTH, FRAME_HEIGHT);
    this.object = new LineSegments2(this.geometry, this.material);
    this.object.frustumCulled = false;
    this.geometry.instanceCount = 0;
  }

  /** Writes segment i from a to b with endpoint colours ca, cb (linear RGB, as stored by THREE.Color). */
  set(i: number, a: THREE.Vector3, b: THREE.Vector3, ca: THREE.Color, cb: THREE.Color): void {
    const p = this.positions;
    const c = this.colors;
    const k = i * 6;
    p[k] = a.x; p[k + 1] = a.y; p[k + 2] = a.z;
    p[k + 3] = b.x; p[k + 4] = b.y; p[k + 5] = b.z;
    c[k] = ca.r; c[k + 1] = ca.g; c[k + 2] = ca.b;
    c[k + 3] = cb.r; c[k + 4] = cb.g; c[k + 5] = cb.b;
  }

  /** Uploads the first `count` segments and draws exactly those. */
  commit(count: number): void {
    const n = Math.max(0, Math.min(this.capacity, count));
    this.positionBuffer.needsUpdate = true;
    this.colorBuffer.needsUpdate = true;
    this.geometry.instanceCount = n;
    if (this.material.dashed) this.object.computeLineDistances();
    this.object.visible = n > 0 && this.material.opacity > 0.001;
  }

  setOpacity(o: number): void {
    this.material.opacity = Math.max(0, Math.min(1, o));
    this.object.visible = this.geometry.instanceCount > 0 && this.material.opacity > 0.001;
  }
}
