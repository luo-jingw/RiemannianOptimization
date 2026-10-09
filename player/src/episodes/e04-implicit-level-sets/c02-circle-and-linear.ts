import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { clamp01, lerp, smoothstep } from "../../primitives/Easing";
import { keyframes } from "../../primitives/Keyframes";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Polyline, circlePoints, sampleCurve } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Surface } from "../../primitives/Surface";
import { Anchor } from "./lib/Anchor";
import { Tex } from "./lib/Tex";

/**
 * E04 c02 — solving locally on the circle f(x, y) = x² + y² − 1, and the linear case f = Ax + By.
 * Phase A (s0–s3, 3D): bowl z = f(x, y) cut by the plane z = 0. Phase B (s4–s20, 2D): local graph boxes,
 * failure at (1, 0), solving for x instead, four arcs. Phase C (s21–s30): the linear case. Phase D (s31–s37):
 * linearization D_x f ↔ A, D_y f ↔ B and the hypothesis of the implicit function theorem.
 * Sentence indices refer to content/episodes/e04-implicit-level-sets/story.en.json, scene c02-circle-and-linear.
 */

const VIEW = { cx: 0.66, cy: -0.22, h: 3.4 };       // 2D view: origin at pixel (750, 470), 318 px per unit
const LEFT_CENTER_X = 750;
const THETA_P = Math.atan2(0.8, 0.6);
const THETA_END = Math.atan2(0.31, 0.95);
const H_FAIL = 0.25;                                  // half side of the first red box at (1, 0)
const PLOT_L = new THREE.Vector2(-1.0, -0.22);        // linear-case plot centers (world)
const PLOT_R = new THREE.Vector2(1.0, -0.22);
const PLOT_HALF = 0.72;

const v3 = (x: number, y: number, z = 0): THREE.Vector3 => new THREE.Vector3(x, y, z);

function rectPoints(cx: number, cy: number, hw: number, hh: number): THREE.Vector3[] {
  return [v3(cx - hw, cy - hh), v3(cx + hw, cy - hh), v3(cx + hw, cy + hh), v3(cx - hw, cy + hh), v3(cx - hw, cy - hh)];
}

/** Half sizes of a valid local-graph box A × B around the upper-arc point (x0, y0): g(A) ⊆ B and no lower-branch points. */
function boxAt(x0: number, y0: number): { hw: number; hh: number } {
  const hh = Math.min(0.2, 0.65 * y0);
  const right = Math.sqrt(1 - (y0 - hh) * (y0 - hh)) - x0;
  const top = y0 + hh;
  const left = top >= 1 ? x0 + 1 : x0 - Math.sqrt(1 - top * top);
  return { hw: Math.min(0.18, 0.9 * right, 0.9 * left), hh };
}

export class CircleLinearScene implements Scene {
  readonly id = "c02-circle-and-linear";
  private stage!: StageLayer;
  private anchor!: Anchor;

  // Phase A
  private bowl!: Surface;
  private plane!: Surface;
  private cut!: Polyline;
  private fLabel!: FormulaHandle;

  // Phase B
  private axes: Arrow[] = [];
  private axisLabels: FormulaHandle[] = [];
  private circle!: Polyline;
  private vline!: Polyline;
  private vDots: Dot[] = [];
  private twoNote!: FormulaHandle;
  private pDot!: Dot;
  private pLabel!: FormulaHandle;
  private box!: Polyline;
  private boxArc!: Polyline;
  private graphLabel!: FormulaHandle;
  private boxDef!: FormulaHandle;
  private failBox!: Polyline;
  private failDot!: Dot;
  private testLeft!: Polyline;
  private testRight!: Polyline;
  private testDots: Dot[] = [];
  private twoY!: FormulaHandle;
  private noY!: FormulaHandle;
  private dyLabel!: FormulaHandle;
  private dxLabel!: FormulaHandle;
  private sideBox!: Polyline;
  private sideLines: Polyline[] = [];
  private sideDots: Dot[] = [];
  private xLabel!: FormulaHandle;
  private choiceNote!: FormulaHandle;
  private arcs: Polyline[] = [];
  private arcNote!: FormulaHandle;

  // Phase C
  private linEq!: FormulaHandle;
  private block!: FormulaHandle;
  private dims!: FormulaHandle;
  private deriv!: FormulaHandle;
  private solution!: FormulaHandle;
  private plotAxes: Arrow[] = [];
  private kerLine!: Polyline;
  private solLine!: Polyline;
  private solDot!: Dot;
  private kerArrow!: Arrow;
  private rangeLine!: Polyline;
  private targetDot!: Dot;
  private plotTitles: FormulaHandle[] = [];
  private plotNotes: FormulaHandle[] = [];
  private analogy!: FormulaHandle;

  // Phase D
  private approx!: FormulaHandle;
  private roles!: FormulaHandle;
  private hypothesis!: FormulaHandle;
  private localNote!: FormulaHandle;
  private iftNote!: FormulaHandle;
  private preview!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    this.anchor = new Anchor(stage);
    addStandardLights(stage);

    // ---- Phase A
    this.bowl = new Surface(stage, (u, v, target) => {
      const r = 1.3 * u;
      const th = 2 * Math.PI * v;
      target.set(r * Math.cos(th), r * Math.sin(th), r * r - 1);
    }, Palette.blue, { opacity: 0.5, wireframe: true, isoU: 12, isoV: 24, segments: 64 });
    this.plane = new Surface(stage, (u, v, target) => target.set(-1.6 + 3.2 * u, -1.6 + 3.2 * v, 0), Palette.muted, { opacity: 0.3, segments: 2 });
    this.cut = new Polyline(stage, circlePoints(0, 0, 1).map((p) => v3(p.x, p.y, 0.01)), { color: Palette.yellow, width: 6 });
    this.fLabel = fl.add({ tex: "z=f(x,y)=x^2+y^2-1", x: LEFT_CENTER_X, y: 110, size: 46, color: Palette.blue });

    // ---- Phase B
    const axis = (a: THREE.Vector3, b: THREE.Vector3): Arrow => new Arrow(stage, a, b, Palette.axis, { width: 2.5, headLength: 0.1 });
    this.axes = [axis(v3(-1.4, 0), v3(1.5, 0)), axis(v3(0, -1.15), v3(0, 1.2))];
    this.axisLabels = [fl.add({ tex: "x", x: 0, y: 0, size: 34, color: Palette.muted }), fl.add({ tex: "y", x: 0, y: 0, size: 34, color: Palette.muted })];
    this.circle = new Polyline(stage, circlePoints(0, 0, 1, 1440), { color: Palette.blue, width: 5 });
    this.vline = new Polyline(stage, [v3(-0.3, -1.2), v3(-0.3, 1.2)], { color: Palette.orange, width: 2.5, dashed: true, dashSize: 0.06, gapSize: 0.04 });
    const yv = Math.sqrt(1 - 0.09);
    this.vDots = [new Dot(stage, v3(-0.3, yv, 0.02), Palette.orange, 0.04), new Dot(stage, v3(-0.3, -yv, 0.02), Palette.orange, 0.04)];
    this.twoNote = fl.add({ tex: "\\text{two values of } y", x: 0, y: 0, size: 30, color: Palette.orange, align: "right" });
    this.pDot = new Dot(stage, v3(0.6, 0.8, 0.02), Palette.orange, 0.04);
    this.pLabel = fl.add({ tex: "p=(0.6,\\,0.8)", x: 0, y: 0, size: 30, color: Palette.orange, align: "left" });
    this.box = new Polyline(stage, rectPoints(0.6, 0.8, 0.18, 0.2), { color: Palette.green, width: 3 });
    this.boxArc = new Polyline(stage, sampleCurve((x) => v3(x, Math.sqrt(1 - x * x), 0.01), 0.42, 0.78, 40), { color: Palette.green, width: 8 });
    this.graphLabel = fl.add({ tex: "y=\\sqrt{1-x^2}", x: 0, y: 0, size: 32, color: Palette.green });
    this.boxDef = fl.add({ tex: `\\text{in } ${Tex.color(Palette.green, "A\\times B")}:\\quad f(x,y)=0\\iff y=g(x)`, x: 1190, y: 780, size: 34 });
    this.failBox = new Polyline(stage, rectPoints(1, 0, H_FAIL, H_FAIL), { color: Palette.red, width: 3 });
    this.failDot = new Dot(stage, v3(1, 0, 0.02), Palette.red, 0.04);
    this.testLeft = new Polyline(stage, [v3(0.9, -0.2), v3(0.9, 0.2)], { color: Palette.red, width: 2.5 });
    this.testRight = new Polyline(stage, [v3(1.1, -0.2), v3(1.1, 0.2)], { color: Palette.red, width: 2.5 });
    this.testDots = [new Dot(stage, v3(0.9, 0.1, 0.03), Palette.red, 0.035), new Dot(stage, v3(0.9, -0.1, 0.03), Palette.red, 0.035)];
    this.twoY = fl.add({ text: "two y's", x: 0, y: 0, size: 30, color: Palette.red });
    this.noY = fl.add({ text: "no y", x: 0, y: 0, size: 30, color: Palette.red });
    this.dyLabel = fl.add({ tex: `\\dfrac{\\partial f}{\\partial y}=2y=${Tex.color(Palette.red, "0")}`, x: 0, y: 0, size: 36, align: "left" });
    this.dxLabel = fl.add({ tex: `\\dfrac{\\partial f}{\\partial x}=2x=${Tex.color(Palette.green, "2\\neq 0")}`, x: 0, y: 0, size: 36, align: "left" });
    this.sideBox = new Polyline(stage, rectPoints(0.975, 0, 0.125, 0.3), { color: Palette.blue, width: 3 });
    this.sideLines = [-0.2, 0, 0.2].map((y) => new Polyline(stage, [v3(0.85, y), v3(1.1, y)], { color: Palette.teal, width: 2.5 }));
    this.sideDots = [-0.2, 0, 0.2].map((y) => new Dot(stage, v3(Math.sqrt(1 - y * y), y, 0.03), Palette.teal, 0.032));
    this.xLabel = fl.add({ tex: "x=\\sqrt{1-y^2}", x: 0, y: 0, size: 32, color: Palette.teal, align: "left" });
    this.choiceNote = fl.add({ text: "the derivative decides which variable to solve for", x: 750, y: 70, size: 30, color: Palette.text });
    const arc = (a: number, b: number, r: number, color: string): Polyline =>
      new Polyline(stage, sampleCurve((s) => v3(r * Math.cos(s), r * Math.sin(s), 0.01), a, b, 60), { color, width: 8 });
    const d = Math.PI / 180;
    this.arcs = [arc(25 * d, 155 * d, 1.0, Palette.green), arc(205 * d, 335 * d, 1.0, Palette.green),
      arc(-65 * d, 65 * d, 1.07, Palette.teal), arc(115 * d, 245 * d, 1.07, Palette.teal)];
    this.arcNote = fl.add({ tex: `\\begin{gathered}${Tex.color(Palette.green, "\\text{solve for } y")}\\\\ ${Tex.color(Palette.teal, "\\text{solve for } x")}\\end{gathered}`, x: 1220, y: 760, size: 34, display: true });

    // ---- Phase C
    this.linEq = fl.add({ tex: `f(x,y)=Ax+${Tex.color(Palette.yellow, "B")}y=0`, x: LEFT_CENTER_X, y: 150, size: 52 });
    this.block = fl.add({ tex: `\\begin{pmatrix}A & ${Tex.color(Palette.yellow, "B")}\\end{pmatrix}\\begin{pmatrix}x\\\\ ${Tex.color(Palette.yellow, "y")}\\end{pmatrix}=0`, x: LEFT_CENTER_X, y: 290, size: 48, display: true });
    this.dims = fl.add({ tex: `A\\in\\mathbb{R}^{k\\times d},\\qquad ${Tex.color(Palette.yellow, "B\\in\\mathbb{R}^{k\\times k}")},\\qquad x\\in\\mathbb{R}^d,\\ ${Tex.color(Palette.yellow, "y\\in\\mathbb{R}^k")}`, x: LEFT_CENTER_X, y: 420, size: 36, color: Palette.muted });
    this.deriv = fl.add({ tex: "By=-Ax", x: LEFT_CENTER_X, y: 530, size: 46 });
    this.solution = fl.add({ tex: "y=-B^{-1}Ax", x: LEFT_CENTER_X, y: 650, size: 52, boxed: true, color: Palette.green });
    const pax = (c: THREE.Vector2): Arrow[] => [
      new Arrow(stage, v3(c.x - PLOT_HALF, c.y), v3(c.x + PLOT_HALF, c.y), Palette.axis, { width: 2, headLength: 0.08 }),
      new Arrow(stage, v3(c.x, c.y - PLOT_HALF), v3(c.x, c.y + PLOT_HALF), Palette.axis, { width: 2, headLength: 0.08 }),
    ];
    this.plotAxes = [...pax(PLOT_L), ...pax(PLOT_R)];
    const kerDir = new THREE.Vector2(1, 0.5).normalize();
    const L = (c: THREE.Vector2, off: THREE.Vector2, dir: THREE.Vector2, s: number): THREE.Vector3 => v3(c.x + off.x + dir.x * s, c.y + off.y + dir.y * s);
    this.kerLine = new Polyline(stage, [L(PLOT_L, new THREE.Vector2(0, 0), kerDir, -0.7), L(PLOT_L, new THREE.Vector2(0, 0), kerDir, 0.7)], { color: Palette.muted, width: 2, dashed: true, dashSize: 0.05, gapSize: 0.04 });
    const solOff = new THREE.Vector2(-0.12, 0.3);
    this.solLine = new Polyline(stage, [L(PLOT_L, solOff, kerDir, -0.62), L(PLOT_L, solOff, kerDir, 0.55)], { color: Palette.green, width: 4 });
    this.solDot = new Dot(stage, L(PLOT_L, solOff, kerDir, 0), Palette.orange, 0.035);
    this.kerArrow = new Arrow(stage, L(PLOT_L, solOff, kerDir, 0), L(PLOT_L, solOff, kerDir, 0.3), Palette.orange, { width: 3, headLength: 0.07 });
    const rangeDir = new THREE.Vector2(1, -0.35).normalize();
    this.rangeLine = new Polyline(stage, [L(PLOT_R, new THREE.Vector2(0, 0), rangeDir, -0.7), L(PLOT_R, new THREE.Vector2(0, 0), rangeDir, 0.7)], { color: Palette.purple, width: 4 });
    this.targetDot = new Dot(stage, v3(PLOT_R.x + 0.25, PLOT_R.y + 0.4, 0.02), Palette.red, 0.04);
    this.plotTitles = [
      fl.add({ text: "non-unique", x: 0, y: 0, size: 32, color: Palette.orange }),
      fl.add({ text: "no solution", x: 0, y: 0, size: 32, color: Palette.red }),
    ];
    this.plotNotes = [
      fl.add({ tex: `\\{y: By=-Ax\\}=y+${Tex.color(Palette.muted, "\\ker B")}`, x: 0, y: 0, size: 28, color: Palette.green }),
      fl.add({ tex: `${Tex.color(Palette.red, "-Ax")}\\notin ${Tex.color(Palette.purple, "\\operatorname{range} B")}`, x: 0, y: 0, size: 28 }),
      fl.add({ tex: "y\\text{-space } \\mathbb{R}^2", x: 0, y: 0, size: 24, color: Palette.muted }),
      fl.add({ tex: "\\mathbb{R}^2\\ (k=2)", x: 0, y: 0, size: 24, color: Palette.muted }),
      fl.add({ tex: "w", x: 0, y: 0, size: 26, color: Palette.orange }),
    ];
    this.analogy = fl.add({ tex: `\\text{at }(1,0):\\ B=\\tfrac{\\partial f}{\\partial y}=0:\\quad ${Tex.color(Palette.orange, "\\text{two } y\\text{'s}")}\\leftrightarrow\\text{non-unique},\\quad ${Tex.color(Palette.red, "\\text{no } y")}\\leftrightarrow\\text{no solution}`, x: LEFT_CENTER_X, y: 800, size: 30 });

    // ---- Phase D
    this.approx = fl.add({ tex: `f(x,y)\\approx \\underbrace{D_xf(a,b)}_{\\textstyle A}\\,(x-a)+\\underbrace{${Tex.color(Palette.yellow, "D_yf(a,b)")}}_{\\textstyle ${Tex.color(Palette.yellow, "B")}}\\,(y-b)`, x: LEFT_CENTER_X, y: 300, size: 46, display: true });
    this.roles = fl.add({ text: "the partial derivatives play the roles of A and B", x: LEFT_CENTER_X, y: 450, size: 30, color: Palette.muted });
    this.hypothesis = fl.add({ tex: `${Tex.color(Palette.yellow, "D_yf(a,b)")}\\ \\text{invertible}`, x: LEFT_CENTER_X, y: 560, size: 48, boxed: true });
    this.localNote = fl.add({ text: "linear approximation holds only near (a, b)  ⇒  local conclusion", x: LEFT_CENTER_X, y: 680, size: 30, color: Palette.text });
    this.iftNote = fl.add({ text: "linear → nonlinear, locally: the inverse function theorem", x: LEFT_CENTER_X, y: 740, size: 30, color: Palette.orange });
    this.preview = fl.add({ tex: `Dg=-[D_yf]^{-1}D_xf\\quad\\longleftrightarrow\\quad -B^{-1}A`, x: LEFT_CENTER_X, y: 810, size: 36, color: Palette.green });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "B\\ \\text{invertible}\\iff \\text{unique } y", at: cue.s(25) + 1.5 },
      { label: "2", tex: "\\text{assume } D_yf(a,b)\\ \\text{invertible}", at: cue.s(34) + 1.2 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const stage = this.stage;
    const switchT = c.in(3, 0.7);
    const in3D = t < switchT;

    // ---- Phase A: bowl and plane (3D), camera turns to look straight down
    const top = c.over(3, 0.0, 0.7);
    if (in3D) {
      const el = lerp(0.5, 1.5698, smoothstep(0, 1, top));
      const az = lerp(-1.1, -Math.PI / 2, top);
      const dist = lerp(6.8, 6.34, top);
      const target = v3(lerp(0.2, VIEW.cx, top), lerp(0.2, VIEW.cy, top), lerp(-0.25, 0, top));
      const pos = v3(target.x + dist * Math.cos(el) * Math.cos(az), target.y + dist * Math.cos(el) * Math.sin(az), target.z + dist * Math.sin(el));
      stage.setView3D(pos, target, 30);
    } else {
      const zoom = keyframes(t, [
        { t: 0, v: { z: 1 } },
        { t: c.in(13, 0.05), v: { z: 0.5 } },
        { t: c.in(13, 0.5), v: { z: 0.25 } },
        { t: c.s(14), v: { z: 1 } },
      ], 1.0).z;
      const cx = 1 + (VIEW.cx - 1) * zoom;
      const cy = 0 + (VIEW.cy - 0) * zoom;
      stage.setView2D(cx, cy, VIEW.h * zoom);
    }
    const bowlOn = c.p(0, 0.8) * (1 - smoothstep(c.in(3, 0.1), c.in(3, 0.55), t));
    this.bowl.setOpacity(in3D ? bowlOn : 0);
    const planeZ = lerp(1, 0, c.over(1, 0.15, 0.85));
    this.plane.mesh.position.z = planeZ;
    this.plane.setOpacity(in3D ? c.p(1, 0.6) * (1 - smoothstep(c.in(3, 0.1), c.in(3, 0.55), t)) : 0);
    this.cut.setOpacity(in3D ? smoothstep(0.92, 1, c.over(1, 0.15, 0.85)) : 0);
    this.fLabel.set({ opacity: c.p(0, 0.8) * (1 - c.p(3, 0.8)) });

    // ---- Phase B: the circle in the plane
    const phaseB = (in3D ? 0 : 1) * (1 - c.p(21, 0.8));
    const zoomed = t >= c.in(13, 0.0) && t < c.s(14) + 0.8;
    this.axes.forEach((a) => a.setOpacity(phaseB * (zoomed ? 0 : 1)));
    this.anchor.place(this.axisLabels[0], v3(1.6, 0), phaseB * (zoomed ? 0 : 1));
    this.anchor.place(this.axisLabels[1], v3(0, 1.3), phaseB * (zoomed ? 0 : 1));
    this.circle.setOpacity(phaseB);
    this.circle.setColor(t < c.s(4) ? Palette.yellow : Palette.blue);
    const vOn = c.p(4, 0.6) * (1 - c.p(5, 0.6)) * phaseB;
    this.vline.setOpacity(vOn);
    this.vDots.forEach((dd) => dd.setOpacity(vOn * c.p(4, 0.5, 1.2)));
    this.anchor.place(this.twoNote, v3(-0.3, Math.sqrt(0.91)), vOn * c.p(4, 0.5, 1.2), -20, -30);

    // Sliding box (s5–s9)
    const slide = c.over(8, 0.1, 0.95);
    const theta = lerp(THETA_P, THETA_END, slide);
    const x0 = Math.cos(theta);
    const y0 = Math.sin(theta);
    const bx = boxAt(x0, y0);
    const boxOn = c.p(6, 0.6) * (1 - c.p(10, 0.6)) * phaseB;
    const pOn = c.p(5, 0.6) * (1 - c.p(10, 0.6)) * phaseB;
    this.pDot.setPosition(v3(x0, y0, 0.02));
    this.pDot.setOpacity(pOn);
    this.anchor.place(this.pLabel, v3(x0, y0), pOn * (1 - c.p(8, 0.4)), 70, -20);
    this.box.setPoints(rectPoints(x0, y0, bx.hw, bx.hh));
    this.box.setOpacity(boxOn);
    this.boxArc.setPoints(sampleCurve((x) => v3(x, Math.sqrt(Math.max(0, 1 - x * x)), 0.01), x0 - bx.hw, x0 + bx.hw, 40));
    this.boxArc.setOpacity(boxOn);
    this.anchor.place(this.graphLabel, v3(0.6, 1.0), c.p(5, 0.6, 1.5) * (1 - c.p(8, 0.4)) * phaseB, -60, -40);
    this.boxDef.set({ opacity: c.p(6, 0.6) * (1 - c.p(10, 0.5)) * phaseB });

    // Failure at (1, 0) (s10–s15): boxes shrink while the view zooms by the same factor
    const failOn = c.p(10, 0.6) * (1 - c.p(16, 0.6)) * phaseB;
    const hNow = H_FAIL * keyframes(t, [
      { t: 0, v: { z: 1 } },
      { t: c.in(13, 0.05), v: { z: 0.5 } },
      { t: c.in(13, 0.5), v: { z: 0.25 } },
      { t: c.s(14), v: { z: 1 } },
    ], 1.0).z;
    this.failBox.setPoints(rectPoints(1, 0, hNow, hNow));
    this.failBox.setOpacity(failOn);
    this.failDot.setOpacity(failOn);
    this.failDot.setScale(hNow / H_FAIL);
    const xl = 1 - 0.4 * hNow * hNow;          // vertical test line whose two hits lie at y ≈ ±0.9 h
    const yl = Math.sqrt(1 - xl * xl);
    const xr = 1 + 0.5 * hNow;
    this.testLeft.setPoints([v3(xl, -hNow), v3(xl, hNow)]);
    this.testRight.setPoints([v3(xr, -hNow), v3(xr, hNow)]);
    const testOnL = c.p(11, 0.6) * failOn;
    const testOnR = c.p(12, 0.6) * failOn;
    this.testLeft.setOpacity(testOnL);
    this.testRight.setOpacity(testOnR);
    this.testDots[0].setPosition(v3(xl, yl, 0.03));
    this.testDots[1].setPosition(v3(xl, -yl, 0.03));
    this.testDots.forEach((dd) => { dd.setOpacity(testOnL); dd.setScale(hNow / H_FAIL); });
    this.anchor.place(this.twoY, v3(1 - hNow, hNow), testOnL, -10, -26);
    this.anchor.place(this.noY, v3(1 + hNow, hNow), testOnR, 10, -26);
    this.anchor.place(this.dyLabel, v3(1.3, -0.45), c.p(14, 0.6) * (1 - c.p(16, 0.6)) * phaseB, 0, 0);
    this.anchor.place(this.dxLabel, v3(1.3, -0.8), c.p(15, 0.6) * (1 - c.p(19, 0.6)) * phaseB, 0, 0);

    // Solving for x instead (s16–s18)
    const sideOn = c.p(16, 0.6) * (1 - c.p(19, 0.6)) * phaseB;
    this.sideBox.setOpacity(sideOn);
    this.sideLines.forEach((l) => l.setOpacity(sideOn * c.p(17, 0.5)));
    this.sideDots.forEach((dd) => dd.setOpacity(sideOn * c.p(17, 0.5, 0.4)));
    this.anchor.place(this.xLabel, v3(1.1, 0.2), sideOn, 16, 0);
    this.choiceNote.set({ opacity: c.p(18, 0.6) * (1 - c.p(19, 0.5)) * phaseB });

    // Four arcs (s19–s20)
    const arcsOn = phaseB;
    for (let i = 0; i < 4; i++) {
      const grow = c.over(19, i * 0.2, i * 0.2 + 0.3);
      this.arcs[i].setOpacity(arcsOn * (grow > 0 ? 1 : 0));
      this.arcs[i].setProgress(grow);
    }
    this.arcNote.set({ opacity: c.p(19, 0.6, 0.8) * phaseB });

    // ---- Phase C: the linear case
    const phaseC = c.p(21, 0.8) * (1 - c.p(31, 0.8));
    this.linEq.set({ opacity: phaseC, y: lerp(150, 120, c.p(26, 0.8)) });
    const blockPart = 1 - c.p(26, 0.6);
    this.block.set({ opacity: c.p(21, 0.8, 0.8) * blockPart * phaseC });
    this.dims.set({ opacity: c.p(22, 0.6) * blockPart * phaseC });
    this.deriv.set({ opacity: c.p(24, 0.6) * blockPart * phaseC });
    this.solution.set({ opacity: c.p(25, 0.6) * blockPart * phaseC });
    const plots = c.p(26, 0.8) * (1 - c.p(31, 0.8));
    this.plotAxes.forEach((a, i) => a.setOpacity(plots * (i < 2 ? c.p(27, 0.6) : c.p(28, 0.6))));
    const kerOn = plots * c.p(27, 0.6);
    this.kerLine.setOpacity(kerOn);
    this.solLine.setOpacity(kerOn * c.p(27, 0.6, 1.0));
    const kerDir = new THREE.Vector2(1, 0.5).normalize();
    const slideK = 0.35 * Math.sin(clamp01((t - c.s(27) - 1.5) / 6) * 2 * Math.PI);
    const base = v3(PLOT_L.x - 0.12 + kerDir.x * slideK, PLOT_L.y + 0.3 + kerDir.y * slideK, 0.02);
    this.solDot.setPosition(base);
    this.solDot.setOpacity(kerOn * c.p(27, 0.6, 1.2));
    this.kerArrow.set(base, base.clone().add(v3(kerDir.x * 0.3, kerDir.y * 0.3)));
    this.kerArrow.setOpacity(kerOn * c.p(27, 0.6, 1.2));
    const rangeOn = plots * c.p(28, 0.6);
    this.rangeLine.setOpacity(rangeOn);
    this.targetDot.setOpacity(rangeOn * c.p(28, 0.6, 1.0));
    this.anchor.place(this.plotTitles[0], v3(PLOT_L.x, PLOT_L.y + PLOT_HALF + 0.15), kerOn);
    this.anchor.place(this.plotTitles[1], v3(PLOT_R.x, PLOT_R.y + PLOT_HALF + 0.15), rangeOn);
    this.anchor.place(this.plotNotes[0], v3(PLOT_L.x, PLOT_L.y - PLOT_HALF - 0.12), kerOn * c.p(27, 0.6, 1.0) * (1 - c.p(30, 0.5)));
    this.anchor.place(this.plotNotes[1], v3(PLOT_R.x, PLOT_R.y - PLOT_HALF - 0.12), rangeOn * c.p(28, 0.6, 1.0) * (1 - c.p(30, 0.5)));
    this.anchor.place(this.plotNotes[2], v3(PLOT_L.x + PLOT_HALF - 0.12, PLOT_L.y - 0.1), kerOn, -10, 0);
    this.anchor.place(this.plotNotes[3], v3(PLOT_R.x + PLOT_HALF - 0.12, PLOT_R.y - 0.1), rangeOn, -10, 0);
    this.anchor.place(this.plotNotes[4], base.clone().add(v3(kerDir.x * 0.3, kerDir.y * 0.3)), kerOn * c.p(27, 0.6, 1.2), 4, -22);
    this.analogy.set({ opacity: c.p(30, 0.6) * phaseC });

    // ---- Phase D: linearization and the hypothesis
    const phaseD = c.p(31, 0.8);
    this.approx.set({ opacity: c.p(31, 0.6, 1.0) * phaseD });
    this.roles.set({ opacity: c.p(33, 0.6) * phaseD });
    this.hypothesis.set({ opacity: c.p(34, 0.6) * phaseD });
    this.localNote.set({ opacity: c.p(35, 0.6) * phaseD });
    this.iftNote.set({ opacity: c.p(36, 0.6) * phaseD });
    this.preview.set({ opacity: c.p(37, 0.6) * phaseD });
    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
