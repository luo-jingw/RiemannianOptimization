import * as THREE from "three";
import { Palette } from "../../../primitives/Palette";
import { MiniLine, type MiniViz, disc, orthoCamera, tileScene } from "./montage-kit";

const START = new THREE.Vector2(-1.2, 1.05);
const RADIUS0 = 0.35;
const ITERS = 9;
const PHASE = 0.9;                                // seconds per iteration
const RING = 72;

interface TrStep {
  x: THREE.Vector2;
  radius: number;
  step: THREE.Vector2;
  accepted: boolean;
}

function f(x: number, y: number): number { return (1 - x) ** 2 + 5 * (y - x * x) ** 2; }
function grad(x: number, y: number): THREE.Vector2 {
  return new THREE.Vector2(-2 * (1 - x) - 20 * x * (y - x * x), 10 * (y - x * x));
}
function hess(x: number, y: number): [number, number, number] {
  return [2 - 20 * (y - x * x) + 40 * x * x, -20 * x, 10];
}

/**
 * Trust-region method: at each iterate the quadratic model is trusted inside a disk; the dogleg step to the model's
 * best point in the disk is accepted (the disk may grow) or rejected (the disk shrinks), on a curved valley.
 */
export class TrustRegionViz implements MiniViz {
  readonly label = "Trust regions";
  readonly scene = tileScene();
  readonly camera = orthoCamera(2.9, 0.0, 0.42);
  private readonly steps: TrStep[] = [];
  private readonly ring = new MiniLine(this.scene, Palette.green, 3, 1, true);
  private readonly stepLine = new MiniLine(this.scene, Palette.yellow, 3.5);
  private readonly trail = new MiniLine(this.scene, Palette.orange, 3.5);
  private readonly dot: THREE.Mesh;
  private readonly trial: THREE.Mesh;

  constructor() {
    this.scene.add(TrustRegionViz.contours());
    let x = START.clone();
    let radius = RADIUS0;
    const path: THREE.Vector3[] = [new THREE.Vector3(x.x, x.y, 0.03)];
    for (let k = 0; k < ITERS; k++) {
      const step = TrustRegionViz.dogleg(x, radius);
      const g = grad(x.x, x.y);
      const [a, b, c] = hess(x.x, x.y);
      const predicted = -(g.dot(step) + 0.5 * (a * step.x * step.x + 2 * b * step.x * step.y + c * step.y * step.y));
      const actual = f(x.x, x.y) - f(x.x + step.x, x.y + step.y);
      const rho = actual / predicted;
      const accepted = rho > 0.1;
      this.steps.push({ x: x.clone(), radius, step, accepted });
      if (rho < 0.25) radius *= 0.4;
      else if (rho > 0.75 && step.length() > 0.98 * radius) radius = Math.min(2 * radius, 0.9);
      if (accepted) {
        x = x.clone().add(step);
        path.push(new THREE.Vector3(x.x, x.y, 0.03));
      }
    }
    while (path.length < ITERS + 1) path.push(path[path.length - 1].clone());
    this.trail.setPoints(path);
    disc(this.scene, Palette.green, 0.04).position.set(1, 1, 0.02);
    this.dot = disc(this.scene, Palette.orange, 0.045);
    this.trial = disc(this.scene, Palette.yellow, 0.03);
  }

  /** Dogleg step: Newton point if it is inside the disk, otherwise along Cauchy point → Newton point to the boundary. */
  private static dogleg(x: THREE.Vector2, radius: number): THREE.Vector2 {
    const g = grad(x.x, x.y);
    const [a, b, c] = hess(x.x, x.y);
    const gHg = a * g.x * g.x + 2 * b * g.x * g.y + c * g.y * g.y;
    const det = a * c - b * b;
    const cauchy = g.clone().multiplyScalar(gHg > 0 ? -g.lengthSq() / gHg : -radius / g.length());
    if (cauchy.length() >= radius || det <= 0 || a <= 0) return cauchy.setLength(radius);
    const newton = new THREE.Vector2(-(c * g.x - b * g.y) / det, -(-b * g.x + a * g.y) / det);
    if (newton.length() <= radius) return newton;
    const d = newton.clone().sub(cauchy);
    const qa = d.lengthSq();
    const qb = 2 * cauchy.dot(d);
    const qc = cauchy.lengthSq() - radius * radius;
    const s = (-qb + Math.sqrt(qb * qb - 4 * qa * qc)) / (2 * qa);
    return cauchy.add(d.multiplyScalar(s));
  }

  /** Level sets of f by marching squares, as thin lines. */
  private static contours(): THREE.LineSegments {
    const n = 140;
    const x0 = -2.3;
    const x1 = 2.3;
    const y0 = -0.9;
    const y1 = 1.9;
    const hx = (x1 - x0) / n;
    const hy = (y1 - y0) / n;
    const pts: number[] = [];
    for (const level of [0.05, 0.2, 0.5, 1, 2, 4, 7, 11, 16, 22]) {
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const cx = [x0 + i * hx, x0 + (i + 1) * hx, x0 + (i + 1) * hx, x0 + i * hx];
          const cy = [y0 + j * hy, y0 + j * hy, y0 + (j + 1) * hy, y0 + (j + 1) * hy];
          const v = cx.map((xx, k) => f(xx, cy[k]) - level);
          const cross: number[] = [];
          for (let k = 0; k < 4; k++) {
            const a = v[k];
            const b = v[(k + 1) % 4];
            if ((a < 0) !== (b < 0)) {
              const s = a / (a - b);
              cross.push(cx[k] + (cx[(k + 1) % 4] - cx[k]) * s, cy[k] + (cy[(k + 1) % 4] - cy[k]) * s);
            }
          }
          if (cross.length >= 4) pts.push(cross[0], cross[1], 0, cross[2], cross[3], 0);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: new THREE.Color("#3d5a8f") }));
  }

  update(t: number): void {
    const cycle = ITERS * PHASE + 1.0;
    const local = t % cycle;
    const k = Math.min(ITERS - 1, Math.floor(local / PHASE));
    const u = Math.min(1, (local - k * PHASE) / PHASE);
    const s = this.steps[k];
    // 0–0.35: the disk opens; 0.35–0.65: trial step; 0.65–1: accept (move) or reject (disk shrinks)
    const open = Math.min(1, u / 0.35);
    const settle = Math.max(0, (u - 0.65) / 0.35);
    const next = this.steps[Math.min(ITERS - 1, k + 1)];
    const r = s.radius * open + (k + 1 < ITERS && !s.accepted ? (next.radius - s.radius) * settle : 0);
    const ring: THREE.Vector3[] = [];
    for (let i = 0; i <= RING; i++) {
      const a = (2 * Math.PI * i) / RING;
      ring.push(new THREE.Vector3(s.x.x + r * Math.cos(a), s.x.y + r * Math.sin(a), 0.02));
    }
    this.ring.setPoints(ring);
    this.ring.setColor(!s.accepted && u > 0.65 ? Palette.red : Palette.green);
    this.ring.setOpacity(s.accepted ? 1 - 0.7 * settle : 1);
    const reach = Math.min(1, Math.max(0, (u - 0.35) / 0.3));
    const tip = new THREE.Vector3(s.x.x + s.step.x * reach, s.x.y + s.step.y * reach, 0.04);
    this.stepLine.setPoints([new THREE.Vector3(s.x.x, s.x.y, 0.04), tip]);
    this.stepLine.setOpacity(reach > 0 ? 1 : 0);
    this.trial.position.copy(tip);
    this.trial.visible = reach > 0;
    const move = s.accepted ? settle * settle * (3 - 2 * settle) : 0;
    this.dot.position.set(s.x.x + s.step.x * move, s.x.y + s.step.y * move, 0.06);
    const accepted = this.steps.slice(0, k).filter((x) => x.accepted).length;
    this.trail.setProgress((accepted + move) / ITERS);
  }
}
