import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { lerp, smoothstep } from "../../primitives/Easing";
import { addStandardLights } from "../../primitives/Lights";
import { keyframes } from "../../primitives/Keyframes";
import { Palette } from "../../primitives/Palette";
import { Polyline, sampleCurve } from "../../primitives/Polyline";
import { CameraFrame } from "./lib/CameraFrame";
import { ColoredSphere } from "./lib/ColoredSphere";
import { placeAt } from "./lib/place";
import { reveal, tc } from "./lib/tex";

/**
 * E01 c01 — why optimization on a curved set needs a new language.
 * Running example: f(x) = xᵀAx on S², A = diag(1, 2, 3). The Euclidean gradient step at X0 cuts inside the
 * sphere (xᵀ∇f = 2f > 0); a tangent step of unit length leaves it outward. Then latitude/longitude coordinates
 * and their degeneration at the north pole.
 * Sentence indices refer to content/episodes/e01-topology/story.en.json, scene c01-why-curved.
 */

const X0 = new THREE.Vector3(0.404, -0.44, 0.803).normalize();   // near the upper-left limb of the default view
const GRAD = new THREE.Vector3(2 * X0.x, 4 * X0.y, 6 * X0.z);       // ∇f(x) = 2Ax
const ALPHA = 0.1;
const XPLUS = X0.clone().sub(GRAD.clone().multiplyScalar(ALPHA));
const VIEW_DIR = new THREE.Vector3(Math.cos(20 * Math.PI / 180) * Math.cos(40 * Math.PI / 180),
  Math.cos(20 * Math.PI / 180) * Math.sin(40 * Math.PI / 180), Math.sin(20 * Math.PI / 180));
const VIEW_RIGHT = VIEW_DIR.clone().negate().cross(new THREE.Vector3(0, 0, 1)).normalize();
/** Unit tangent at X0 lying in the screen plane of the default view; the step x − αg moves toward screen-left. */
const G_TAN = ((): THREE.Vector3 => {
  const g = X0.clone().cross(VIEW_DIR).normalize();
  return g.dot(VIEW_RIGHT) > 0 ? g : g.negate();
})();
const FOV = 34;
const DIST = 5.9;
const SPHERE_UP_PX = 70;
const DEG = Math.PI / 180;
const POLE_LAT = 80 * DEG;

/** Inset rectangle (λ, θ) ∈ [−π, π] × [−π/2, π/2], in output pixels. */
const INSET = { x0: 90, x1: 630, y0: 190, y1: 460 };
const GRID_R = 1.006;

const sph = (lat: number, lon: number, r = 1): THREE.Vector3 =>
  new THREE.Vector3(r * Math.cos(lat) * Math.cos(lon), r * Math.cos(lat) * Math.sin(lon), r * Math.sin(lat));
const insetPx = (lat: number, lon: number): { x: number; y: number } => ({
  x: lerp(INSET.x0, INSET.x1, (lon + Math.PI) / (2 * Math.PI)),
  y: lerp(INSET.y1, INSET.y0, (lat + Math.PI / 2) / Math.PI),
});

function heatColor(p: THREE.Vector3): THREE.Color {
  const f = p.x * p.x + 2 * p.y * p.y + 3 * p.z * p.z;      // in [1, 3]
  const s = (f - 1) / 2;
  const lo = new THREE.Color("#23306b");
  const mid = new THREE.Color("#2f9fb0");
  const hi = new THREE.Color("#ffd43b");
  return s < 0.5 ? lo.lerp(mid, s * 2) : mid.lerp(hi, (s - 0.5) * 2);
}

interface GridCurve {
  /** (lat, lon) samples. */
  samples: { lat: number; lon: number }[];
  still: Polyline;    // drawn in the inset
  moving: Polyline;   // carried from the inset onto the sphere
  onSphere: boolean;  // false for the inset's right edge (λ = π duplicates λ = −π on the sphere)
  isTop: boolean;
}

export class WhyCurvedScene implements Scene {
  readonly id = "c01-why-curved";
  private stage!: StageLayer;

  private heat!: ColoredSphere;
  private plain!: ColoredSphere;
  private e1Dots: Dot[] = [];
  private e1Labels: FormulaHandle[] = [];
  private xDot!: Dot;
  private xLabel!: FormulaHandle;
  private gradArrow!: Arrow;
  private xPlusDot!: Dot;
  private xPlusLabel!: FormulaHandle;
  private radiusX!: Polyline;
  private radiusXPlus!: Polyline;
  private normLabel!: FormulaHandle;
  private outLabel!: FormulaHandle;

  private tanLine!: Polyline;
  private tanArrow!: Arrow;
  private tanTip!: Dot;
  private tanReadout!: FormulaHandle;

  private problem!: FormulaHandle;
  private fBound!: FormulaHandle;
  private update!: FormulaHandle;
  private lines: FormulaHandle[] = [];
  private gradNote!: FormulaHandle;

  private grid: GridCurve[] = [];
  private insetFrame!: Polyline;
  private insetLabels: { h: FormulaHandle; x: number; y: number }[] = [];
  private coordFormula!: FormulaHandle;
  private poleDot!: Dot;
  private poleLabel!: FormulaHandle;
  private pDot!: Dot;
  private qDot!: Dot;
  private pInset!: Dot;
  private qInset!: Dot;
  private pLabel!: FormulaHandle;
  private qLabel!: FormulaHandle;
  private pInsetLabel!: FormulaHandle;
  private qInsetLabel!: FormulaHandle;
  private pqArc!: Polyline;
  private pqInsetLine!: Polyline;
  private nearLabel!: FormulaHandle;
  private farLabel!: FormulaHandle;
  private eulerNote!: FormulaHandle;
  private globalNote!: FormulaHandle;
  private localCap!: Polyline;
  private cardA!: FormulaHandle;
  private cardB!: FormulaHandle;

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    this.heat = new ColoredSphere(stage, heatColor, 0.62);
    this.plain = new ColoredSphere(stage, () => new THREE.Color("#2c5d99"), 0.92);
    for (const s of [1, -1]) {
      this.e1Dots.push(new Dot(stage, new THREE.Vector3(s, 0, 0), Palette.green, 0.045, "3d"));
      this.e1Labels.push(fl.add({ tex: s > 0 ? "e_1" : "-e_1", x: 0, y: 0, size: 34, color: Palette.green }));
    }
    this.xDot = new Dot(stage, X0, Palette.orange, 0.04, "3d");
    this.xLabel = fl.add({ tex: "x", x: 0, y: 0, size: 38, color: Palette.orange });
    this.gradArrow = new Arrow(stage, X0, XPLUS, Palette.orange, { width: 4, headLength: 0.09, mode: "3d" });
    this.xPlusDot = new Dot(stage, XPLUS, Palette.red, 0.035, "3d");
    this.xPlusLabel = fl.add({ tex: "x^+", x: 0, y: 0, size: 36, color: Palette.red });
    const o = new THREE.Vector3(0, 0, 0);
    this.radiusX = new Polyline(stage, [o, X0], { color: Palette.muted, width: 2, dashed: true, dashSize: 0.05, gapSize: 0.04 });
    this.radiusXPlus = new Polyline(stage, [o, XPLUS], { color: Palette.red, width: 2.5, dashed: true, dashSize: 0.05, gapSize: 0.04 });
    this.normLabel = fl.add({ tex: `\\|x^+\\|=${XPLUS.length().toFixed(2)}<1`, x: 0, y: 0, size: 32, color: Palette.red });
    this.outLabel = fl.add({ tex: "x^+\\notin S^2", x: 0, y: 0, size: 36, color: Palette.red });

    const tanEnd = X0.clone().sub(G_TAN.clone().multiplyScalar(0.8));
    this.tanLine = new Polyline(stage, [X0.clone().add(G_TAN.clone().multiplyScalar(0.25)), tanEnd.clone().sub(G_TAN.clone().multiplyScalar(0.15))],
      { color: Palette.green, width: 2, dashed: true, dashSize: 0.05, gapSize: 0.04 });
    this.tanArrow = new Arrow(stage, X0, tanEnd, Palette.green, { width: 4, headLength: 0.08, mode: "3d" });
    this.tanTip = new Dot(stage, tanEnd, Palette.red, 0.035, "3d");
    this.tanReadout = fl.add({ tex: this.readoutTex(0), x: 980, y: 770, size: 38, align: "left" });

    this.problem = fl.add({ tex: `\\min_{x\\in\\mathbb{R}^3}\\ f(x)=x^\\top A x\\quad\\text{s.t. } \\|x\\|=1,\\qquad A=\\operatorname{diag}(1,2,3)`, x: 960, y: 92, size: 40 });
    this.fBound = fl.add({ tex: "f(x)=x_1^2+2x_2^2+3x_3^2\\ \\ge\\ x_1^2+x_2^2+x_3^2=1", x: 960, y: 822, size: 38 });
    this.update = fl.add({ tex: `x^+=x-\\alpha\\,\\nabla f(x)\\qquad (\\nabla f=2Ax)`, x: 960, y: 822, size: 38, color: Palette.orange });
    this.lines = [
      fl.add({ tex: "\\|x-\\alpha g\\|^2=(x-\\alpha g)^\\top(x-\\alpha g)", x: 980, y: 290, size: 40, align: "left" }),
      fl.add({ tex: "\\phantom{\\|x-\\alpha g\\|^2}=x^\\top x-2\\alpha\\,x^\\top g+\\alpha^2 g^\\top g", x: 980, y: 370, size: 40, align: "left" }),
      fl.add({ tex: this.line3Tex(false), x: 980, y: 450, size: 40, align: "left" }),
      fl.add({ tex: this.line4Tex(0), x: 980, y: 560, size: 40, align: "left" }),
      fl.add({ tex: `x^\\top g\\neq 0:\\quad \\|x-\\alpha g\\|^2=1\\iff \\alpha=0\\ \\text{or}\\ \\alpha=\\frac{2\\,x^\\top g}{\\|g\\|^2}`, x: 980, y: 670, size: 38, align: "left" }),
    ];
    this.gradNote = fl.add({ tex: `g=\\nabla f(x):\\ \\ x^\\top g=2f(x)>0\\ \\Rightarrow\\ \\text{small steps cut inside}`, x: 980, y: 770, size: 32, color: Palette.muted, align: "left" });

    // ---- latitude / longitude
    const curves: { samples: { lat: number; lon: number }[]; onSphere: boolean; isTop: boolean; color: string }[] = [];
    for (let k = 0; k < 12; k++) {
      const lon = -Math.PI + (k * Math.PI) / 6;
      curves.push({ samples: Array.from({ length: 41 }, (_, i) => ({ lat: -Math.PI / 2 + (i * Math.PI) / 40, lon })), onSphere: true, isTop: false, color: Palette.text });
    }
    for (const latDeg of [-75, -45, -15, 15, 45, 75]) {
      curves.push({ samples: Array.from({ length: 73 }, (_, i) => ({ lat: latDeg * DEG, lon: -Math.PI + (i * 2 * Math.PI) / 72 })), onSphere: true, isTop: false, color: Palette.text });
    }
    curves.push({ samples: Array.from({ length: 41 }, (_, i) => ({ lat: -Math.PI / 2 + (i * Math.PI) / 40, lon: Math.PI })), onSphere: false, isTop: false, color: Palette.text });
    curves.push({ samples: Array.from({ length: 73 }, (_, i) => ({ lat: Math.PI / 2, lon: -Math.PI + (i * 2 * Math.PI) / 72 })), onSphere: true, isTop: true, color: Palette.red });
    curves.push({ samples: Array.from({ length: 73 }, (_, i) => ({ lat: -Math.PI / 2, lon: -Math.PI + (i * 2 * Math.PI) / 72 })), onSphere: false, isTop: false, color: Palette.text });
    this.grid = curves.map((c) => ({
      samples: c.samples,
      still: new Polyline(stage, c.samples.map((q) => sph(q.lat, q.lon)), { color: c.isTop ? Palette.red : "#8fa3c8", width: c.isTop ? 4 : 1.6, depthTest: false }),
      moving: new Polyline(stage, c.samples.map((q) => sph(q.lat, q.lon)), { color: c.isTop ? Palette.red : "#cfe0ff", width: c.isTop ? 4 : 1.6 }),
      onSphere: c.onSphere,
      isTop: c.isTop,
    }));
    this.insetFrame = new Polyline(stage, [o, o, o, o, o], { color: Palette.axis, width: 2, depthTest: false });
    const il = (tex: string, x: number, y: number, color: string = Palette.muted): { h: FormulaHandle; x: number; y: number } =>
      ({ h: fl.add({ tex, x, y, size: 28, color }), x, y });
    this.insetLabels = [
      il("\\lambda", (INSET.x0 + INSET.x1) / 2, INSET.y1 + 34),
      il("-\\pi", INSET.x0, INSET.y1 + 30),
      il("\\pi", INSET.x1, INSET.y1 + 30),
      il("\\theta", INSET.x0 - 46, (INSET.y0 + INSET.y1) / 2),
      il("\\tfrac{\\pi}{2}", INSET.x0 - 40, INSET.y0),
      il("-\\tfrac{\\pi}{2}", INSET.x0 - 44, INSET.y1),
    ];
    this.coordFormula = fl.add({ tex: "(\\theta,\\lambda)\\ \\mapsto\\ (\\cos\\theta\\cos\\lambda,\\ \\cos\\theta\\sin\\lambda,\\ \\sin\\theta)", x: 960, y: 92, size: 40 });
    this.poleDot = new Dot(stage, new THREE.Vector3(0, 0, 1.006), Palette.red, 0.04, "3d");
    this.poleLabel = fl.add({ tex: "\\lambda\\ \\text{undefined}", x: 0, y: 0, size: 32, color: Palette.red });
    const P = sph(POLE_LAT, 0, 1.006);
    const Q = sph(POLE_LAT, Math.PI, 1.006);
    this.pDot = new Dot(stage, P, Palette.orange, 0.035, "3d");
    this.qDot = new Dot(stage, Q, Palette.orange, 0.035, "3d");
    this.pInset = new Dot(stage, o, Palette.orange, 0.02, "3d");
    this.qInset = new Dot(stage, o, Palette.orange, 0.02, "3d");
    this.pLabel = fl.add({ tex: "P", x: 0, y: 0, size: 34, color: Palette.orange });
    this.qLabel = fl.add({ tex: "Q", x: 0, y: 0, size: 34, color: Palette.orange });
    this.pInsetLabel = fl.add({ tex: "P", x: 0, y: 0, size: 30, color: Palette.orange });
    this.qInsetLabel = fl.add({ tex: "Q", x: 0, y: 0, size: 30, color: Palette.orange });
    this.pqArc = new Polyline(stage, sampleCurve((s) => (s < 0 ? sph(Math.PI / 2 + s, 0, 1.01) : sph(Math.PI / 2 - s, Math.PI, 1.01)),
      -(Math.PI / 2 - POLE_LAT), Math.PI / 2 - POLE_LAT, 30), { color: Palette.green, width: 5 });
    this.pqInsetLine = new Polyline(stage, [o, o], { color: Palette.red, width: 3, dashed: true, dashSize: 0.02, gapSize: 0.015, depthTest: false });
    this.nearLabel = fl.add({ text: "near on S²", x: 0, y: 0, size: 30, color: Palette.green });
    this.farLabel = fl.add({ text: "far in (λ, θ)", x: (INSET.x0 + INSET.x1) / 2 + 140, y: INSET.y0 - 40, size: 30, color: Palette.red });
    this.eulerNote = fl.add({ text: "Euler angles for rotations: gimbal lock (analogy only)", x: 960, y: 800, size: 32, color: Palette.muted });
    this.globalNote = fl.add({ text: "No single coordinate system, continuous both ways, covers all of S²  (stated, not proved)", x: 960, y: 800, size: 32, color: Palette.text });
    this.localCap = new Polyline(stage, sampleCurve((s) => {
      const c = sph(25 * DEG, 50 * DEG);
      const e = new THREE.Vector3(0, 0, 1).cross(c).normalize();
      const n = c.clone().cross(e).normalize();
      const r = 0.38;
      return c.clone().multiplyScalar(Math.cos(r)).add(e.multiplyScalar(Math.sin(r) * Math.cos(s))).add(n.multiplyScalar(Math.sin(r) * Math.sin(s))).multiplyScalar(1.008);
    }, 0, 2 * Math.PI, 64), { color: Palette.green, width: 4 });
    this.cardA = fl.add({ tex: "\\text{locally like } \\mathbb{R}^n", x: 960, y: 380, size: 64, color: Palette.text });
    this.cardB = fl.add({ tex: "\\text{need: } \\textcolor{#ffd43b}{\\text{nearness without coordinates}}", x: 960, y: 520, size: 56 });
  }

  private readoutTex(alpha: number): string {
    const n = Math.sqrt(1 + alpha * alpha);
    return `\\alpha=${alpha.toFixed(2)}\\qquad \\|x-\\alpha g\\|=${tc(n > 1.0005 ? Palette.red : Palette.text, n.toFixed(3))}`;
  }

  private line3Tex(on: boolean): string {
    const body = `\\phantom{\\|x-\\alpha g\\|^2}=1-2\\alpha\\,x^\\top g+\\alpha^2\\|g\\|^2`;
    return on ? `${body}\\qquad ${tc(Palette.muted, "(x^\\top x=1)")}` : `${body}\\qquad \\phantom{(x^\\top x=1)}`;
  }

  private line4Tex(parts: number): string {
    return reveal([
      `x^\\top g=0:\\quad \\|x-\\alpha g\\|^2=1+`,
      tc(Palette.yellow, "\\alpha^2\\|g\\|^2"),
      `\\ >1\\quad (g\\neq 0)`,
    ], parts);
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const stage = this.stage;

    // ---- camera: az/el in degrees, sx = sphere center offset from the frame center in px
    const cam = keyframes(t, [
      { t: 0, v: { az: 95, el: 18, sx: 0 } },
      { t: c.s(0) + 0.2, v: { az: 40, el: 20, sx: 0 } },
      { t: c.s(8), v: { az: 40, el: 20, sx: -420 } },
      { t: c.s(18), v: { az: 40, el: 20, sx: 260 } },
      { t: c.s(22), v: { az: 40, el: 58, sx: 260 } },
      { t: c.s(29), v: { az: 40, el: 30, sx: 260 } },
      { t: c.s(33), v: { az: 40, el: 30, sx: 0 } },
    ], 3.0);
    const az = cam.az * DEG;
    const el = cam.el * DEG;
    const dir = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el));
    const right = dir.clone().negate().cross(new THREE.Vector3(0, 0, 1)).normalize();
    const wpp = (2 * DIST * Math.tan((FOV * DEG) / 2)) / 1080;
    const camUp = right.clone().cross(dir.clone().negate()).normalize();
    const target = right.clone().multiplyScalar(-cam.sx * wpp).sub(camUp.multiplyScalar(SPHERE_UP_PX * wpp));
    const pos = target.clone().add(dir.clone().multiplyScalar(DIST));
    stage.setView3D(pos, target, FOV);
    const frame = new CameraFrame(pos, target, FOV);

    const cardIn = c.p(33, 1.0);
    const stageDim = 1 - 0.85 * cardIn;

    // ---- phase 1: the problem and the Euclidean step (s0–s17)
    const heatOn = c.p(0, 1.2, -0.4) * (1 - c.p(18, 1.0));
    const plainOn = c.p(18, 1.0) * stageDim;
    const latLong = t >= c.s(18);
    this.heat.set(heatOn, false);
    this.plain.set(plainOn, latLong);
    const minOn = c.p(4, 0.6) * (1 - c.p(18, 0.8));
    this.e1Dots.forEach((d, i) => d.setOpacity(i === 0 ? minOn : 0));
    placeAt(stage, this.e1Labels[0], new THREE.Vector3(1.12, 0, 0.12), 0, 0, minOn);
    this.e1Labels[1].set({ opacity: 0 });
    const xOn = c.p(6, 0.6) * (1 - c.p(18, 0.8));
    this.xDot.setOpacity(xOn);
    placeAt(stage, this.xLabel, X0.clone().multiplyScalar(1.12), -6, -22, xOn);
    const step = c.p(7, 1.2, 0.2);
    const stepOn = xOn * (1 - c.p(11, 0.8));
    const tip = X0.clone().lerp(XPLUS, step);
    this.gradArrow.set(X0, tip);
    this.gradArrow.setOpacity(step > 0.02 ? stepOn : 0);
    const plusOn = stepOn * smoothstep(0.9, 1.0, step);
    this.xPlusDot.setOpacity(plusOn);
    placeAt(stage, this.xPlusLabel, XPLUS, 30, 24, plusOn);
    const radOn = plusOn * c.p(7, 0.8, 1.8);
    this.radiusX.setOpacity(radOn * 0.8);
    this.radiusXPlus.setOpacity(radOn);
    placeAt(stage, this.normLabel, new THREE.Vector3(0, 0, 0), 0, 44, radOn);
    placeAt(stage, this.outLabel, XPLUS, 150, 0, radOn * c.p(7, 0.6, 2.6));

    this.problem.set({ opacity: c.p(1, 0.8) * (1 - c.p(18, 0.8)) });
    this.fBound.set({ opacity: c.p(3, 0.6) * (1 - c.p(5, 0.6)) });
    this.update.set({ x: 960 + cam.sx, opacity: c.p(5, 0.8) * (1 - c.p(18, 0.8)) });
    const block = 1 - c.p(18, 0.8);
    this.lines[0].set({ opacity: c.p(8, 0.6, 1.0) * block });
    this.lines[1].set({ opacity: c.p(9, 0.6, 0.5) * block });
    this.lines[2].setContent(this.line3Tex(t >= c.in(10, 0.3)));
    this.lines[2].set({ opacity: c.p(10, 0.6, 0.5) * block });
    const l4 = t >= c.in(12, 0.55) ? 3 : t >= c.in(12, 0.2) ? 2 : t >= c.s(11) ? 1 : 0;
    this.lines[3].setContent(this.line4Tex(l4));
    this.lines[3].set({ opacity: (l4 > 0 ? 1 : 0) * block });
    this.lines[4].set({ opacity: c.p(16, 0.6, 0.8) * block });
    this.gradNote.set({ opacity: c.p(16, 0.6, 3.0) * block });

    // tangent step (s13–s17)
    const tanOn = c.p(13, 0.6) * (1 - c.p(18, 0.8));
    const alpha = 0.8 * c.over(14, 0.08, 0.92);
    const tanTip = X0.clone().sub(G_TAN.clone().multiplyScalar(alpha));
    this.tanLine.setOpacity(tanOn * 0.7);
    this.tanArrow.set(X0, tanTip);
    this.tanArrow.setOpacity(alpha > 0.01 ? tanOn : 0);
    this.tanTip.setPosition(tanTip);
    this.tanTip.setOpacity(alpha > 0.01 ? tanOn : 0);
    this.xDot.setOpacity(Math.max(xOn, tanOn));
    this.tanReadout.setContent(this.readoutTex(Math.round(alpha * 100) / 100));
    this.tanReadout.set({ opacity: c.p(14, 0.5) * (1 - c.p(16, 0.5)) });

    // ---- phase 2: latitude and longitude (s18–s32)
    const insetOn = c.p(19, 0.8) * stageDim;
    const wrap = c.over(21, 0.1, 0.9);
    const insetDist = 2.0;
    const toInset = (lat: number, lon: number): THREE.Vector3 => {
      const q = insetPx(lat, lon);
      return frame.at(q.x, q.y, insetDist);
    };
    const topRed = c.p(22, 0.6) > 0.5 && t < c.s(29);
    const topCollapse = c.over(23, 0.05, 0.85);
    for (const g of this.grid) {
      g.still.setPoints(g.samples.map((q) => toInset(q.lat, q.lon)));
      const stillColorRed = g.isTop && topRed;
      g.still.setColor(g.isTop ? (stillColorRed ? Palette.red : "#8fa3c8") : "#8fa3c8");
      g.still.setWidth(g.isTop && topRed ? 4 : 1.6);
      g.still.setOpacity(insetOn);
      if (g.isTop) {
        // The top edge is carried onto the sphere only when it is discussed (s23): it collapses to the pole.
        g.moving.setPoints(g.samples.map((q) => toInset(q.lat, q.lon).lerp(sph(q.lat, q.lon, GRID_R), topCollapse)));
        g.moving.setOpacity(topCollapse > 0.001 && t < c.s(29) ? stageDim : 0);
      } else {
        g.moving.setPoints(g.samples.map((q) => toInset(q.lat, q.lon).lerp(sph(q.lat, q.lon, GRID_R), wrap)));
        const vis = g.onSphere ? 1 : 1 - smoothstep(0.6, 1.0, wrap);
        g.moving.setOpacity(wrap > 0.001 ? 0.85 * vis * stageDim : 0);
      }
    }
    const corners = [toInset(-Math.PI / 2, -Math.PI), toInset(-Math.PI / 2, Math.PI), toInset(Math.PI / 2, Math.PI), toInset(Math.PI / 2, -Math.PI), toInset(-Math.PI / 2, -Math.PI)];
    this.insetFrame.setPoints(corners);
    this.insetFrame.setOpacity(insetOn * 0.6);
    for (const l of this.insetLabels) l.h.set({ x: l.x, y: l.y, opacity: insetOn });
    this.coordFormula.set({ opacity: c.p(20, 0.8) * (1 - c.p(33, 0.8)) });

    const poleOn = c.p(23, 0.6, 2.0) * (1 - c.p(29, 0.8)) * stageDim;
    this.poleDot.setOpacity(poleOn);
    placeAt(stage, this.poleLabel, new THREE.Vector3(0, 0, 1.0), 0, -125, c.p(24, 0.6) * (1 - c.p(25, 0.6)));
    const pqOn = c.p(25, 0.6) * (1 - c.p(29, 0.8)) * stageDim;
    this.pDot.setOpacity(pqOn);
    this.qDot.setOpacity(pqOn);
    placeAt(stage, this.pLabel, sph(POLE_LAT, 0, 1.0), 26, 20, pqOn);
    placeAt(stage, this.qLabel, sph(POLE_LAT, Math.PI, 1.0), -26, -18, pqOn);
    const arcOn = c.p(26, 0.6) * (1 - c.p(29, 0.8)) * stageDim;
    this.pqArc.setOpacity(arcOn);
    placeAt(stage, this.nearLabel, new THREE.Vector3(0, 0, 1.0), 0, -125, arcOn);
    const pIn = toInset(POLE_LAT, 0);
    const qIn = toInset(POLE_LAT, Math.PI);
    this.pInset.setPosition(pIn);
    this.qInset.setPosition(qIn);
    const farOn = c.p(27, 0.6) * (1 - c.p(29, 0.8)) * stageDim;
    this.pInset.setOpacity(Math.max(farOn, pqOn * c.p(25, 0.6, 1.5)));
    this.qInset.setOpacity(Math.max(farOn, pqOn * c.p(25, 0.6, 1.5)));
    const pPx = insetPx(POLE_LAT, 0);
    const qPx = insetPx(POLE_LAT, Math.PI);
    this.pInsetLabel.set({ x: pPx.x, y: pPx.y + 28, opacity: this.pInset.object.visible ? pqOn : 0 });
    this.qInsetLabel.set({ x: qPx.x - 24, y: qPx.y + 28, opacity: this.qInset.object.visible ? pqOn : 0 });
    this.pqInsetLine.setPoints([pIn, qIn]);
    this.pqInsetLine.setOpacity(farOn);
    this.farLabel.set({ opacity: farOn });

    this.eulerNote.set({ opacity: c.during(29, 30, 0.5) });
    this.globalNote.set({ opacity: c.p(30, 0.6) * (1 - c.p(33, 0.6)) });
    this.localCap.setOpacity(c.p(32, 0.8) * (1 - c.p(33, 0.8)));

    // ---- phase 3: the program (s33–s35)
    this.cardA.set({ opacity: cardIn });
    this.cardB.set({ opacity: c.p(34, 0.8) });
  }

  teardown(_layers: SceneLayers): void {}
}
