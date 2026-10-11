import * as THREE from "three";
import { Palette } from "../../../primitives/Palette";
import { MiniLine, type MiniViz, disc, orthoCamera, saw, tileScene } from "./montage-kit";

const START = 1.9;
const NEWTON_ITERS = 6;
const GD_ITERS = 14;
const GD_STEP = 0.35;
const FLOOR = -10;                                // log10 error shown down to 1e-10
const PERIOD = 5;
const CIRCLE = new THREE.Vector2(-1.45, 0);
const PLOT = { x0: 0.35, x1: 2.95, y0: -1.3, y1: 1.3 };

function f(t: number): number { return -Math.cos(t - 0.4) + 0.35 * Math.cos(2 * t); }
function df(t: number): number { return Math.sin(t - 0.4) - 0.7 * Math.sin(2 * t); }
function d2f(t: number): number { return Math.cos(t - 0.4) - 1.4 * Math.cos(2 * t); }

/**
 * Riemannian Newton's method on the circle: f drawn as a radial profile; Newton's iterates reach the minimizer in a
 * few jumps while gradient descent creeps; the log-error plot shows quadratic against linear convergence.
 */
export class NewtonViz implements MiniViz {
  readonly label = "Riemannian Newton";
  readonly scene = tileScene();
  readonly camera = orthoCamera(3.5, -0.2, 0);
  private readonly newton: number[] = [];
  private readonly gd: number[] = [];
  private readonly newtonCurve = new MiniLine(this.scene, Palette.orange, 4);
  private readonly gdCurve = new MiniLine(this.scene, Palette.yellow, 3);
  private readonly newtonDot: THREE.Mesh;
  private readonly gdDot: THREE.Mesh;
  private readonly newtonMarks: THREE.Mesh[] = [];
  private readonly gdMarks: THREE.Mesh[] = [];
  private readonly theta0: number;

  constructor() {
    let m = 1.0;
    for (let k = 0; k < 40; k++) m -= df(m) / d2f(m);
    this.theta0 = m;
    let t = START;
    for (let k = 0; k <= NEWTON_ITERS; k++) { this.newton.push(t); t -= df(t) / d2f(t); }
    t = START;
    for (let k = 0; k <= GD_ITERS; k++) { this.gd.push(t); t -= GD_STEP * df(t); }
    // the circle and f as a radial profile around it
    const base = new MiniLine(this.scene, "#4a5878", 2);
    const prof = new MiniLine(this.scene, Palette.blue, 4);
    const bp: THREE.Vector3[] = [];
    const pp: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) {
      const a = (2 * Math.PI * i) / 160;
      bp.push(this.onCircle(a, 0.85));
      pp.push(this.onCircle(a, 0.85 + 0.25 * (f(a) + 1.4)));
    }
    base.setPoints(bp);
    prof.setPoints(pp);
    disc(this.scene, Palette.green, 0.05).position.copy(this.onCircle(this.theta0, 0.85)).setZ(0.05);
    // log-error axes
    const axes = new MiniLine(this.scene, "#6a7698", 2);
    axes.setPoints([new THREE.Vector3(PLOT.x0, PLOT.y1, 0), new THREE.Vector3(PLOT.x0, PLOT.y0, 0), new THREE.Vector3(PLOT.x1, PLOT.y0, 0)]);
    this.newtonCurve.setPoints(this.newton.map((x, k) => this.plotPoint(k, x)));
    this.gdCurve.setPoints(this.gd.map((x, k) => this.plotPoint(k, x)));
    for (let k = 0; k <= NEWTON_ITERS; k++) this.newtonMarks.push(disc(this.scene, Palette.orange, 0.035));
    for (let k = 0; k <= GD_ITERS; k++) this.gdMarks.push(disc(this.scene, Palette.yellow, 0.028));
    this.newtonDot = disc(this.scene, Palette.orange, 0.07);
    this.gdDot = disc(this.scene, Palette.yellow, 0.055);
  }

  private onCircle(a: number, r: number): THREE.Vector3 {
    return new THREE.Vector3(CIRCLE.x + r * Math.cos(a), CIRCLE.y + r * Math.sin(a), 0);
  }

  private plotPoint(k: number, theta: number): THREE.Vector3 {
    const e = Math.max(FLOOR, Math.log10(Math.abs(theta - this.theta0) + 1e-16));
    const x = PLOT.x0 + ((PLOT.x1 - PLOT.x0) * k) / GD_ITERS;
    const y = PLOT.y0 + ((PLOT.y1 - PLOT.y0) * (e - FLOOR)) / (0 - FLOOR);
    return new THREE.Vector3(x, Math.min(PLOT.y1, y), 0.02);
  }

  update(t: number): void {
    const u = Math.min(1, saw(t, PERIOD) * 1.15);
    const steps = u * GD_ITERS;                    // both methods advance one iteration per tick
    const kn = Math.min(NEWTON_ITERS, Math.floor(steps));
    const kg = Math.min(GD_ITERS, Math.floor(steps));
    const frac = steps - Math.floor(steps);
    const nextN = this.newton[Math.min(NEWTON_ITERS, kn + 1)];
    const nextG = this.gd[Math.min(GD_ITERS, kg + 1)];
    const ease = frac * frac * (3 - 2 * frac);
    this.newtonDot.position.copy(this.onCircle(this.newton[kn] + (nextN - this.newton[kn]) * ease, 0.85)).setZ(0.1);
    this.gdDot.position.copy(this.onCircle(this.gd[kg] + (nextG - this.gd[kg]) * ease, 0.85)).setZ(0.09);
    this.newtonCurve.setProgress(kn / NEWTON_ITERS);
    this.gdCurve.setProgress(kg / GD_ITERS);
    this.newtonMarks.forEach((m, k) => { m.visible = k <= kn; m.position.copy(this.plotPoint(k, this.newton[k])).setZ(0.05); });
    this.gdMarks.forEach((m, k) => { m.visible = k <= kg; m.position.copy(this.plotPoint(k, this.gd[k])).setZ(0.04); });
  }
}
