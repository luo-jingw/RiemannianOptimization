import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import type { StageLayer } from "../layers/StageLayer";

export interface PolylineStyle {
  color: string;
  /** Line width in output pixels. */
  width?: number;
  dashed?: boolean;
  dashSize?: number;
  gapSize?: number;
  opacity?: number;
  depthTest?: boolean;
}

/** Screen-space-width polyline (2D or 3D). Supports partial drawing via setProgress. */
export class Polyline {
  readonly object: Line2;
  private geometry: LineGeometry;
  private readonly material: LineMaterial;
  private segments = 0;
  private pointCount = -1;

  constructor(stage: StageLayer, points: THREE.Vector3[], style: PolylineStyle) {
    this.geometry = new LineGeometry();
    this.material = new LineMaterial({
      color: new THREE.Color(style.color).getHex(),
      linewidth: style.width ?? 4,
      dashed: style.dashed ?? false,
      dashSize: style.dashSize ?? 0.15,
      gapSize: style.gapSize ?? 0.1,
      transparent: true,
      opacity: style.opacity ?? 1,
      depthTest: style.depthTest ?? true,
      worldUnits: false,
    });
    this.material.resolution.copy(stage.resolution);
    this.object = new Line2(this.geometry, this.material);
    this.setPoints(points);
    stage.root.add(this.object);
  }

  setPoints(points: THREE.Vector3[]): void {
    // three.js caches an instanced geometry's maximum instance count at its first upload, so a buffer
    // that later grows would draw only its first segments. A new point count gets a new geometry.
    // setPoints always shows the full line; call setProgress afterwards for partial drawing.
    if (points.length !== this.pointCount && this.pointCount !== -1) {
      this.geometry.dispose();
      this.geometry = new LineGeometry();
      this.object.geometry = this.geometry;
    }
    this.pointCount = points.length;
    this.writePoints(points);
  }

  private writePoints(points: THREE.Vector3[]): void {
    const flat: number[] = [];
    for (const p of points) flat.push(p.x, p.y, p.z);
    if (points.length === 1) flat.push(points[0].x, points[0].y, points[0].z);
    this.geometry.setPositions(flat);
    this.segments = Math.max(1, points.length - 1);
    this.geometry.instanceCount = this.segments;
    if (this.material.dashed) this.object.computeLineDistances();
  }

  /** Draw only the first fraction p of the segments. */
  setProgress(p: number): void {
    const n = Math.round(Math.max(0, Math.min(1, p)) * this.segments);
    this.geometry.instanceCount = n;
    this.object.visible = n > 0 && this.material.opacity > 0.001;
  }

  setOpacity(o: number): void {
    this.material.opacity = Math.max(0, Math.min(1, o));
    this.object.visible = this.material.opacity > 0.001 && this.geometry.instanceCount > 0;
  }

  setColor(color: string): void {
    this.material.color.set(color);
  }

  setWidth(px: number): void {
    this.material.linewidth = px;
  }
}

/** Samples a parametric curve into points. */
export function sampleCurve(f: (s: number) => THREE.Vector3, a: number, b: number, n: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) pts.push(f(a + ((b - a) * i) / n));
  return pts;
}

/** Points of a circle of radius r around (cx, cy) in the z=0 plane. */
export function circlePoints(cx: number, cy: number, r: number, n = 128): THREE.Vector3[] {
  return sampleCurve((s) => new THREE.Vector3(cx + r * Math.cos(s), cy + r * Math.sin(s), 0), 0, 2 * Math.PI, n);
}
