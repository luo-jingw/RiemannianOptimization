import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";
import { smoothstep } from "../../../primitives/Easing";
import { LineField } from "./fold-line-field";

/** Radius of the round terrain patch drawn on screen. */
export const TERRAIN_RADIUS = 4.3;

interface Bump {
  cx: number;
  cy: number;
  /** Signed amplitude: positive = hill, negative = valley. */
  amp: number;
  /** Width parameter s in exp(-r²/s). */
  s: number;
}

const BUMPS: Bump[] = [
  { cx: -0.6, cy: 0.2, amp: 1.7, s: 1.2 },
  { cx: 1.7, cy: -0.9, amp: -1.2, s: 1.3 },
  { cx: -2.2, cy: -1.9, amp: -0.8, s: 1.0 },
  { cx: -1.0, cy: 2.4, amp: -0.7, s: 0.9 },
  { cx: 1.8, cy: 2.0, amp: 0.6, s: 1.2 },
];

/**
 * The height function h(x, y) whose graph is the curved terrain, a 2D manifold in R³:
 * a sum of Gaussian hills and valleys, a gentle ripple and a shallow bowl.
 */
export class HeightField {
  value(x: number, y: number): number {
    let h = 0.08 * Math.sin(1.3 * x + 0.4) * Math.cos(1.1 * y - 0.3) + 0.025 * (x * x + y * y);
    for (const b of BUMPS) h += b.amp * Math.exp(-((x - b.cx) ** 2 + (y - b.cy) ** 2) / b.s);
    return h;
  }

  /** Euclidean gradient (∂h/∂x, ∂h/∂y), analytic. */
  gradient(x: number, y: number): THREE.Vector2 {
    let gx = 0.08 * 1.3 * Math.cos(1.3 * x + 0.4) * Math.cos(1.1 * y - 0.3) + 0.05 * x;
    let gy = -0.08 * 1.1 * Math.sin(1.3 * x + 0.4) * Math.sin(1.1 * y - 0.3) + 0.05 * y;
    for (const b of BUMPS) {
      const e = b.amp * Math.exp(-((x - b.cx) ** 2 + (y - b.cy) ** 2) / b.s);
      gx += (e * -2 * (x - b.cx)) / b.s;
      gy += (e * -2 * (y - b.cy)) / b.s;
    }
    return new THREE.Vector2(gx, gy);
  }

  /** The surface point over (x, y), raised by `lift` along z. */
  point(x: number, y: number, lift = 0): THREE.Vector3 {
    return new THREE.Vector3(x, y, this.value(x, y) + lift);
  }

  /** Unit upward normal of the graph at (x, y). */
  normal(x: number, y: number): THREE.Vector3 {
    const g = this.gradient(x, y);
    return new THREE.Vector3(-g.x, -g.y, 1).normalize();
  }

  /** The tangent vector of the graph over the coordinate displacement (dx, dy): (dx, dy, ∇h · (dx, dy)). */
  tangent(x: number, y: number, dx: number, dy: number): THREE.Vector3 {
    const g = this.gradient(x, y);
    return new THREE.Vector3(dx, dy, g.x * dx + g.y * dy);
  }
}

/** Surface colors by height; the rim fades out through vertex alpha (see rimAlpha), not by darkening. */
const LOW = new THREE.Color("#0c2a55");
const MID = new THREE.Color("#2c6cc0");
const HIGH = new THREE.Color("#a9d6ff");

function surfaceColor(h: number, target: THREE.Color): THREE.Color {
  const u = smoothstep(-1.1, 1.6, h);
  if (u < 0.5) target.copy(LOW).lerp(MID, u * 2);
  else target.copy(MID).lerp(HIGH, (u - 0.5) * 2);
  return target;
}

/** Opacity of the terrain at radius r: solid in the middle, dissolving smoothly into the backdrop at the rim. */
const FADE_START = 2.2;
function rimAlpha(r: number): number {
  const u = smoothstep(FADE_START, TERRAIN_RADIUS, r);
  return 1 - u;
}

/** The shaded terrain mesh plus topographic contour lines draped on it. */
export class TerrainView {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly contours: LineField;

  constructor(stage: StageLayer, readonly field: HeightField) {
    const rings = 120;
    const spokes = 240;
    const pos: number[] = [];
    const col: number[] = [];
    const index: number[] = [];
    const c = new THREE.Color();
    for (let i = 0; i <= rings; i++) {
      const r = (TERRAIN_RADIUS * i) / rings;
      for (let j = 0; j <= spokes; j++) {
        const a = (2 * Math.PI * j) / spokes;
        const x = r * Math.cos(a);
        const y = r * Math.sin(a);
        const h = field.value(x, y);
        pos.push(x, y, h);
        surfaceColor(h, c);
        col.push(c.r, c.g, c.b, rimAlpha(r));
      }
    }
    const row = spokes + 1;
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < spokes; j++) {
        const a = i * row + j;
        index.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(col, 4));   // RGBA: alpha fades the rim
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.08,
      side: THREE.DoubleSide, transparent: true, opacity: 1, depthWrite: true });   // rings are drawn centre-out, so the faded rim blends over the interior
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = 1;
    stage.root.add(this.mesh);

    const segs = TerrainView.contourSegments(field);
    this.contours = new LineField(stage, segs.length / 4, 1.3);
    this.contours.setRenderOrder(2);
    const line = new THREE.Color("#cfe6ff");
    for (let s = 0; s < segs.length / 4; s++) {
      for (let e = 0; e < 2; e++) {
        const x = segs[s * 4 + e * 2];
        const y = segs[s * 4 + e * 2 + 1];
        const h = field.value(x, y);
        const o = s * 6 + e * 3;
        this.contours.positions[o] = x;
        this.contours.positions[o + 1] = y;
        this.contours.positions[o + 2] = h + 0.012;
        surfaceColor(h, c);
        // contour lines melt into the surface tone before the rim starts to dissolve
        const rim = smoothstep(FADE_START, FADE_START + 0.9, Math.hypot(x, y));
        c.lerp(line, 0.32 * (1 - rim));
        this.contours.colors[o] = c.r;
        this.contours.colors[o + 1] = c.g;
        this.contours.colors[o + 2] = c.b;
      }
    }
    this.contours.commit();
  }

  /** Marching squares over the disk: segments (x0, y0, x1, y1) of the levels -1.05, -0.9, ..., 1.65. */
  private static contourSegments(field: HeightField): number[] {
    const n = 150;
    const lo = -TERRAIN_RADIUS;
    const step = (2 * TERRAIN_RADIUS) / n;
    const hv: number[] = [];
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) hv.push(field.value(lo + i * step, lo + j * step));
    const at = (i: number, j: number): number => hv[j * (n + 1) + i];
    const out: number[] = [];
    for (let level = -1.05; level < 1.7; level += 0.15) {
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const x0 = lo + i * step;
          const y0 = lo + j * step;
          if (Math.hypot(x0 + step / 2, y0 + step / 2) > FADE_START + 0.9) continue;
          const v = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
          const corners = [[x0, y0], [x0 + step, y0], [x0 + step, y0 + step], [x0, y0 + step]];
          const cross: number[] = [];
          for (let k = 0; k < 4; k++) {
            const a = v[k] - level;
            const b = v[(k + 1) % 4] - level;
            if ((a < 0) !== (b < 0)) {
              const f = a / (a - b);
              const p = corners[k];
              const q = corners[(k + 1) % 4];
              cross.push(p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f);
            }
          }
          if (cross.length === 4) out.push(cross[0], cross[1], cross[2], cross[3]);
          else if (cross.length === 8) out.push(cross[0], cross[1], cross[2], cross[3], cross[4], cross[5], cross[6], cross[7]);
        }
      }
    }
    return out;
  }

  setOpacity(surface: number, contours: number): void {
    this.material.opacity = Math.max(0, Math.min(1, surface));
    this.mesh.visible = surface > 0.001;
    this.contours.setOpacity(contours);
  }
}
