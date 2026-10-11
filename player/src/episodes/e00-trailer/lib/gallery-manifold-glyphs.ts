import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";
import { Polyline, circlePoints, sampleCurve } from "../../../primitives/Polyline";

const PX = 120;                                   // px per stage unit (view height 9 over 1080 px)
const GLYPH_PX = 110;                             // glyph radius in px at its middle size
const COLOR = "#cfe6ff";

function ellipse(cx: number, cy: number, rx: number, ry: number): THREE.Vector3[] {
  return sampleCurve((s) => new THREE.Vector3(cx + rx * Math.cos(s), cy + ry * Math.sin(s), 0), 0, 2 * Math.PI, 96);
}

function segment(ax: number, ay: number, bx: number, by: number): THREE.Vector3[] {
  return [new THREE.Vector3(ax, ay, 0), new THREE.Vector3(bx, by, 0)];
}

/** Geodesic of the Poincaré disk between boundary angles a and b: an arc orthogonal to the unit circle. */
function poincareGeodesic(a: number, b: number): THREE.Vector3[] {
  const half = (b - a) / 2;
  const mid = (a + b) / 2;
  const d = 1 / Math.cos(half);
  const r = Math.tan(half);
  const cx = d * Math.cos(mid);
  const cy = d * Math.sin(mid);
  const start = mid + Math.PI - (Math.PI / 2 - half);
  const end = mid + Math.PI + (Math.PI / 2 - half);
  return sampleCurve((s) => new THREE.Vector3(cx + r * Math.cos(s), cy + r * Math.sin(s), 0), start, end, 48);
}

/** Line drawings of the manifold each gallery shot lives on, in unit coordinates (radius about 1). */
const GLYPHS: readonly (readonly THREE.Vector3[][])[] = [
  // SO(3): a sphere
  [circlePoints(0, 0, 1, 96), ellipse(0, 0, 1, 0.3)],
  // SO(3)^n: a row of spheres
  [-1.1, 0, 1.1].flatMap((x) => [circlePoints(x, 0, 0.45, 64), ellipse(x, 0, 0.45, 0.14)]),
  // Stiefel: orthonormal frames on a sphere
  [circlePoints(0, 0, 1, 96), ellipse(0, 0, 1, 0.3), segment(0, 0, 0.8, 0.3), segment(0, 0, -0.3, 0.8)],
  // Poincaré disk: boundary circle and geodesics
  [circlePoints(0, 0, 1, 96), poincareGeodesic(0.3, 2.2), poincareGeodesic(2.6, 4.4), poincareGeodesic(4.7, 6.0)],
  // SPD matrices: the open cone
  [segment(0, -1, -0.9, 0.6), segment(0, -1, 0.9, 0.6), ellipse(0, 0.6, 0.9, 0.25)],
  // Grassmann: a plane through the origin and its normal line
  [[new THREE.Vector3(-1, -0.35, 0), new THREE.Vector3(0.6, -0.55, 0), new THREE.Vector3(1, 0.35, 0),
    new THREE.Vector3(-0.6, 0.55, 0), new THREE.Vector3(-1, -0.35, 0)], segment(0, 0, 0.12, 0.95)],
];

/** Brief outline of the incoming shot's manifold, drawn over the match point during a cut. */
export class ManifoldGlyphs {
  private readonly glyphs: Polyline[][];

  constructor(stage: StageLayer) {
    this.glyphs = GLYPHS.map((lines) => lines.map((pts) => {
      const line = new Polyline(stage, pts, { color: COLOR, width: 2.5, opacity: 0, depthTest: false });
      line.object.renderOrder = 20;
      line.object.position.z = 0.2;
      return line;
    }));
  }

  /**
   * Shows glyph `index` centred at frame uv `at` for cut progress `u` in [0, 1] (the hard cut is at 0.5):
   * it grows through the cut and is brightest at the cut. Every other glyph is hidden.
   */
  show(index: number, at: THREE.Vector2, u: number): void {
    const opacity = 0.85 * Math.sin(Math.PI * Math.max(0, Math.min(1, u))) ** 2;
    const scale = (GLYPH_PX * (0.8 + 0.45 * u)) / PX;
    this.glyphs.forEach((lines, k) => {
      for (const line of lines) {
        line.setOpacity(k === index ? opacity : 0);
        line.object.position.set((at.x - 0.5) * 16, (at.y - 0.5) * 9, 0.2);
        line.object.scale.setScalar(scale);
      }
    });
  }

  hide(): void {
    for (const lines of this.glyphs) for (const line of lines) line.setOpacity(0);
  }
}
