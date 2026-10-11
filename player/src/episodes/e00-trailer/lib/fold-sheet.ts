import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";
import { smoothstep } from "../../../primitives/Easing";
import { LineField } from "./fold-line-field";

/** Radius of the sphere the sheet closes into. */
export const SPHERE_RADIUS = 1;
/** Radius of the flat disk sheet: the geodesic distance from the south pole to the north pole. */
export const SHEET_RADIUS = Math.PI * SPHERE_RADIUS;
/** Center of the closed sphere (its south pole touches the plane at the origin). */
export const SPHERE_CENTER = new THREE.Vector3(0, 0, SPHERE_RADIUS);

const GRID_HALF_COUNT = 6;
const LINE_SAMPLES = 72;
const RIM_SAMPLES = 180;
const FILL_RINGS = 44;
const FILL_SPOKES = 112;

/**
 * Position of the plane point (x, y) when the sheet is bent to curvature fraction k in [0, 1].
 * The sheet is wrapped onto the sphere of radius SPHERE_RADIUS / k that touches the plane at the
 * origin, by the inverse azimuthal-equidistant map (distances from the origin are preserved).
 * k = 0 is the plane itself; k = 1 closes the disk of radius SHEET_RADIUS onto the unit sphere.
 */
export function foldPoint(x: number, y: number, k: number, target: THREE.Vector3): THREE.Vector3 {
  if (k < 1e-5) return target.set(x, y, 0);
  const rc = SPHERE_RADIUS / k;
  const r = Math.hypot(x, y);
  if (r < 1e-12) return target.set(0, 0, 0);
  const theta = r / rc;
  const s = (rc * Math.sin(theta)) / r;
  return target.set(x * s, y * s, rc * (1 - Math.cos(theta)));
}

/** Height of the middle of the bent sheet: 0 when flat, SPHERE_RADIUS (the sphere center) when closed. */
export function sheetMidHeight(k: number): number {
  if (k < 1e-5) return 0;
  return 0.5 * (SPHERE_RADIUS / k) * (1 - Math.cos((SHEET_RADIUS * k) / SPHERE_RADIUS));
}

/** Colors of the sheet's grid lines. */
export interface SheetLineStyle {
  inner: THREE.Color;
  outer: THREE.Color;
  /** Color the lines fade toward (the backdrop behind the sheet). */
  ground: THREE.Color;
  /** Overall intensity of the lines: 0 = ground color, 1 = full line color. */
  brightness: number;
  /** How much far-side lines are darkened, 0..1. */
  depthDim: number;
  /** Lines are shown inside this radius (fraction of SHEET_RADIUS) and fade out over 0.5 beyond it. */
  reveal: number;
}

/**
 * The disk sheet: a Cartesian grid clipped to the disk of radius SHEET_RADIUS, its rim circle and a
 * shaded fill. One curvature parameter bends all of it from the plane onto the sphere.
 */
export class FoldingSheet {
  private readonly lines: LineField;
  /** Plane coordinates of every segment endpoint, 4 floats per segment (x0, y0, x1, y1). */
  private readonly planeSegments: Float32Array;
  private readonly fillGeometry: THREE.BufferGeometry;
  private readonly fillPlane: Float32Array;
  private readonly fillMaterial: THREE.MeshStandardMaterial;
  readonly fill: THREE.Mesh;

  constructor(stage: StageLayer, lineWidth: number, fillColor: string) {
    const segs: number[] = [];
    const spacing = SHEET_RADIUS / (GRID_HALF_COUNT + 1);
    for (let j = -GRID_HALF_COUNT; j <= GRID_HALF_COUNT; j++) {
      const c = j * spacing;
      const half = Math.sqrt(SHEET_RADIUS * SHEET_RADIUS - c * c);
      for (let i = 0; i < LINE_SAMPLES; i++) {
        const a = -half + (2 * half * i) / LINE_SAMPLES;
        const b = -half + (2 * half * (i + 1)) / LINE_SAMPLES;
        segs.push(c, a, c, b);
        segs.push(a, c, b, c);
      }
    }
    for (let i = 0; i < RIM_SAMPLES; i++) {
      const a = (2 * Math.PI * i) / RIM_SAMPLES;
      const b = (2 * Math.PI * (i + 1)) / RIM_SAMPLES;
      const r = SHEET_RADIUS * 0.999;
      segs.push(r * Math.cos(a), r * Math.sin(a), r * Math.cos(b), r * Math.sin(b));
    }
    this.planeSegments = new Float32Array(segs);
    this.lines = new LineField(stage, segs.length / 4, lineWidth);
    this.lines.setRenderOrder(3);

    const plane: number[] = [];
    const index: number[] = [];
    for (let i = 0; i <= FILL_RINGS; i++) {
      const r = (SHEET_RADIUS * i) / FILL_RINGS;
      for (let j = 0; j <= FILL_SPOKES; j++) {
        const a = (2 * Math.PI * j) / FILL_SPOKES;
        plane.push(r * Math.cos(a), r * Math.sin(a));
      }
    }
    const row = FILL_SPOKES + 1;
    for (let i = 0; i < FILL_RINGS; i++) {
      for (let j = 0; j < FILL_SPOKES; j++) {
        const a = i * row + j;
        const b = a + row;
        index.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    this.fillPlane = new Float32Array(plane);
    this.fillGeometry = new THREE.BufferGeometry();
    this.fillGeometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array((plane.length / 2) * 3), 3));
    this.fillGeometry.setIndex(index);
    this.fillMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(fillColor), roughness: 0.45, metalness: 0.1, side: THREE.DoubleSide,
      transparent: true, opacity: 0, depthWrite: true, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
    });
    this.fill = new THREE.Mesh(this.fillGeometry, this.fillMaterial);
    this.fill.frustumCulled = false;
    this.fill.renderOrder = 1;
    stage.root.add(this.fill);
  }

  /**
   * Bends the sheet to curvature fraction k and recolors the lines for the current camera.
   * Call every frame.
   */
  update(k: number, camera: THREE.Vector3, style: SheetLineStyle, lineOpacity: number, fillOpacity: number): void {
    const p = new THREE.Vector3();
    // Reference point: halfway up the bent sheet (the plane origin when flat, the sphere center when closed).
    const ref = camera.distanceTo(new THREE.Vector3(0, 0, sheetMidHeight(k)));
    const span = SHEET_RADIUS * (1 - k) + SPHERE_RADIUS * k;
    const pos = this.lines.positions;
    const col = this.lines.colors;
    const c = new THREE.Color();
    const n = this.lines.segmentCount;
    for (let s = 0; s < n; s++) {
      for (let e = 0; e < 2; e++) {
        const x = this.planeSegments[s * 4 + e * 2];
        const y = this.planeSegments[s * 4 + e * 2 + 1];
        foldPoint(x, y, k, p);
        const o = s * 6 + e * 3;
        pos[o] = p.x;
        pos[o + 1] = p.y;
        pos[o + 2] = p.z;
        const rr = Math.hypot(x, y) / SHEET_RADIUS;
        c.copy(style.inner).lerp(style.outer, smoothstep(0.15, 1, rr));
        const depth = (camera.distanceTo(p) - ref) / span;
        const dim = 1 - style.depthDim * smoothstep(-0.6, 1.0, depth);
        const m = style.brightness * dim * (1 - smoothstep(style.reveal - 0.5, style.reveal, rr));
        c.lerp(style.ground, 1 - m);
        col[o] = c.r;
        col[o + 1] = c.g;
        col[o + 2] = c.b;
      }
    }
    this.lines.commit();
    this.lines.setOpacity(lineOpacity);

    const attr = this.fillGeometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const count = this.fillPlane.length / 2;
    for (let i = 0; i < count; i++) {
      foldPoint(this.fillPlane[i * 2], this.fillPlane[i * 2 + 1], k, p);
      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    }
    attr.needsUpdate = true;
    this.fillGeometry.computeVertexNormals();
    this.fillMaterial.opacity = Math.max(0, Math.min(1, fillOpacity));
    this.fill.visible = this.fillMaterial.opacity > 0.001;
  }

  setFillColor(color: THREE.Color, emissive: THREE.Color): void {
    this.fillMaterial.color.copy(color);
    this.fillMaterial.emissive.copy(emissive);
  }
}
