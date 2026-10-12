import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { ProofLedger } from "../../primitives/ProofLedger";
import { TangentPlane } from "../../primitives/TangentPlane";
import { WorldLabel } from "../../primitives/WorldLabel";
import { MiniPlot } from "../e06-gradient-retraction/lib/MiniPlot";
import { setOrbitView } from "../e06-gradient-retraction/lib/SphereCamera";
import type { SvgDot, SvgPath } from "../e06-gradient-retraction/lib/SvgOverlay";
import { SvgOverlay } from "../e06-gradient-retraction/lib/SvgOverlay";
import { RayleighSphere } from "./lib/RayleighSphere";
import { L_RAYLEIGH, lift, lineSearch, rayleigh, rayleighGrad, spherePoint } from "./lib/rayleigh";
import { Tex } from "./lib/tex";

/**
 * E07 c05 — the Lipschitz-type condition (Boumal §4.4, A4.3, Prop. 4.8, Cor. 4.9, (4.9)–(4.11), Ex. 4.11): the quadratic
 * upper bound on the pullback, the decrease coefficient α − (L/2)α², the dimension-free complexity, the Euclidean
 * origin, why gradients at two points cannot be subtracted, L = λmax − λmin for the Rayleigh quotient, and the
 * counterexamples (step outside (0, 2/L) on (L/2)x², x⁴ without a global L).
 * Sentence indices refer to content/episodes/e07-gradient-descent/story.en.json, scene c05-lipschitz-type-condition.
 */

const X = spherePoint(40, 45);
const Y = spherePoint(70, 150);
const CX = 680;

export class LipschitzTypeScene implements Scene {
  readonly id = "c05-lipschitz-type-condition";
  private stage!: StageLayer;

  private sphere!: RayleighSphere;
  private planeX!: TangentPlane;
  private planeY!: TangentPlane;
  private gx!: Arrow;
  private gy!: Arrow;
  private dx!: Dot;
  private dy!: Dot;
  private lx!: WorldLabel;
  private ly!: WorldLabel;

  private svg!: SvgOverlay;
  private gPlot!: MiniPlot;
  private gCurve!: SvgPath;
  private gLine!: SvgPath;
  private gUpper!: SvgPath;
  private aPlot!: MiniPlot;
  private aCurve!: SvgPath;
  private aWindow!: SvgPath;
  private aDot!: SvgDot;
  private qPlot!: MiniPlot;
  private qCurve!: SvgPath;
  private qDots: SvgDot[] = [];
  private x4Plot!: MiniPlot;
  private x4Curve!: SvgPath;
  private x4Safe!: SvgPath;
  private x4Dots: SvgDot[] = [];
  private x4Jump!: SvgPath;

  private fStep!: FormulaHandle;
  private fA3!: FormulaHandle;
  private fProp!: FormulaHandle;
  private fProof!: FormulaHandle;
  private fCor!: FormulaHandle;
  private fEuc!: FormulaHandle;
  private fCannot!: FormulaHandle;
  private fEx!: FormulaHandle;
  private fRead!: FormulaHandle;
  private fCase!: FormulaHandle;
  private fEnd!: FormulaHandle;

  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    this.sphere = new RayleighSphere(stage);
    this.planeX = new TangentPlane(stage, Palette.green, 0.7);
    this.planeY = new TangentPlane(stage, Palette.purple, 0.7);
    this.gx = new Arrow(stage, X, X, "#ffffff", { mode: "3d", width: 5, headLength: 0.08 });
    this.gy = new Arrow(stage, Y, Y, "#ffffff", { mode: "3d", width: 5, headLength: 0.08 });
    this.dx = new Dot(stage, lift(X, 1.01), Palette.orange, 0.03, "3d");
    this.dy = new Dot(stage, lift(Y, 1.01), Palette.orange, 0.03, "3d");
    this.lx = new WorldLabel(stage, fl, { tex: "\\operatorname{grad}f(x)\\in T_xM", size: 26, color: Palette.green }, X, { x: 20, y: -26 });
    this.ly = new WorldLabel(stage, fl, { tex: "\\operatorname{grad}f(y)\\in T_yM", size: 26, color: Palette.purple }, Y, { x: -20, y: 26 });

    this.svg = new SvgOverlay(fl);
    this.gPlot = new MiniPlot(this.svg, fl, { x: 800, y: 420, w: 480, h: 270, xMin: 0, xMax: 1.4, yMin: 0.2, yMax: 1.4,
      xLabel: "\\alpha", yLabel: "f(R_x(-\\alpha\\operatorname{grad}f(x)))" });
    this.gUpper = this.gPlot.curve({ color: Palette.purple, width: 2.5, dash: "9 6" });
    this.gLine = this.gPlot.curve({ color: Palette.yellow, width: 2.5, dash: "4 6" });
    this.gCurve = this.gPlot.curve({ color: "#ffffff", width: 3.5 });
    this.aPlot = new MiniPlot(this.svg, fl, { x: 800, y: 440, w: 480, h: 250, xMin: -0.1, xMax: 0.8, yMin: -0.12, yMax: 0.22,
      xLabel: "\\alpha", yLabel: "\\alpha-\\tfrac L2\\alpha^2" });
    this.aWindow = this.aPlot.curve({ color: Palette.green, width: 7 });
    this.aCurve = this.aPlot.curve({ color: "#ffffff", width: 3.5 });
    this.aDot = this.svg.dot(Palette.yellow, 8);
    this.qPlot = new MiniPlot(this.svg, fl, { x: 800, y: 440, w: 480, h: 250, xMin: -2.2, xMax: 2.2, yMin: 0, yMax: 2.6,
      xLabel: "x", yLabel: "\\tfrac L2x^2\\ (L=1)" });
    this.qCurve = this.qPlot.curve({ color: "#ffffff", width: 3 });
    for (let i = 0; i < 8; i++) this.qDots.push(this.svg.dot(Palette.orange, 7));
    this.x4Plot = new MiniPlot(this.svg, fl, { x: 800, y: 440, w: 480, h: 250, xMin: -4, xMax: 4, yMin: 0, yMax: 130, xLabel: "x", yLabel: "x^4" });
    this.x4Safe = this.x4Plot.curve({ color: Palette.green, width: 7 });
    this.x4Curve = this.x4Plot.curve({ color: "#ffffff", width: 3 });
    this.x4Jump = this.x4Plot.curve({ color: Palette.red, width: 2.5, dash: "6 6" });
    for (let i = 0; i < 2; i++) this.x4Dots.push(this.svg.dot(i === 0 ? Palette.orange : Palette.red, 8));

    this.fStep = fl.add({ tex: "f(x_{k+1})=f(x_k)+\\langle\\operatorname{grad}f(x_k),s_k\\rangle+O(\\|s_k\\|^2)", x: CX, y: 110, size: 34 });
    this.fA3 = fl.add({ tex: "\\begin{gathered}\\textbf{A4.3}\\ \\ \\exists L>0\\ \\ \\forall (x,s)\\in S:\\\\ f(R_x(s))\\ \\le\\ f(x)+\\langle\\operatorname{grad}f(x),s\\rangle+\\tfrac L2\\|s\\|^2\\end{gathered}",
      x: CX, y: 190, size: 30, display: true, boxed: true });
    this.fProp = fl.add({ tex: "\\begin{gathered}\\textbf{Prop 4.8}\\ \\ (x_k,s_k)\\in S,\\ \\ \\alpha_k\\in[\\alpha_{\\min},\\alpha_{\\max}]\\subset(0,2/L)\\\\ \\Rightarrow\\ \\text{A4.2 with } c=\\min\\big(\\alpha_{\\min}-\\tfrac L2\\alpha_{\\min}^2,\\ \\alpha_{\\max}-\\tfrac L2\\alpha_{\\max}^2\\big)\\end{gathered}",
      x: CX, y: 190, size: 28, display: true, boxed: true });
    this.fProof = fl.add({ tex: "", x: 420, y: 560, size: 26, display: true });
    this.fCor = fl.add({ tex: "", x: CX, y: 400, size: 32, display: true });
    this.fEuc = fl.add({ tex: "", x: CX, y: 380, size: 30, display: true });
    this.fCannot = fl.add({ tex: `\\operatorname{grad}f(y)-\\operatorname{grad}f(x)\\ \\ ${Tex.color(Palette.red, "\\text{undefined: different spaces}")}`, x: CX, y: 110, size: 32 });
    this.fEx = fl.add({ tex: "", x: CX, y: 380, size: 28, display: true });
    this.fRead = fl.add({ tex: "", x: CX, y: 780, size: 28 });
    this.fCase = fl.add({ tex: "", x: 400, y: 540, size: 28, display: true });
    this.fEnd = fl.add({ tex: "L\\ \\text{unknown, or huge from one bad region}\\ \\Rightarrow\\ \\text{adaptive steps}", x: CX, y: 440, size: 34, color: Palette.yellow });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "A3", tex: "f(R_x(s))\\le f(x)+\\langle\\operatorname{grad}f,s\\rangle+\\tfrac L2\\|s\\|^2", at: cue.e(4) },
      { label: "1", tex: "\\alpha\\in(0,2/L)\\Rightarrow\\text{A4.2};\\ \\ \\alpha=\\tfrac1L:\\ c=\\tfrac1{2L}", at: cue.e(14) },
      { label: "2", tex: "K\\ge 2L(f(x_0)-f_{\\mathrm{low}})/\\varepsilon^2", at: cue.e(18) },
      { label: "3", tex: "\\text{Rayleigh on } S^2:\\ L=\\lambda_{\\max}-\\lambda_{\\min}=3", at: cue.e(36) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    setOrbitView(this.stage, { azDeg: 70, elDeg: 22, distance: 5.6, fovDeg: 34, center: new THREE.Vector3(0, 0, 0.1), shift: 0.25, lift: -0.25 });
    const g = rayleighGrad(X);
    const g2 = g.lengthSq();
    const fx = rayleigh(X);

    // ---- the step and A4.3 on the line-search plot (s0–s5)
    this.fStep.set({ opacity: c.p(0, 0.6) * (1 - c.p(3, 0.5)) });
    this.fA3.set({ opacity: c.p(3, 0.6) * (1 - c.p(6, 0.5)) });
    const gO = c.p(0, 0.6, 0.5) * (1 - c.p(6, 0.6));
    this.gPlot.setOpacity(gO);
    this.gPlot.plot(this.gCurve, (a) => lineSearch(X, a), 0, 1.4, 120);
    this.gCurve.setOpacity(gO);
    this.gPlot.plot(this.gLine, (a) => fx - a * g2, 0, 0.6, 2);
    this.gLine.setOpacity(gO * c.p(2, 0.5));
    this.gPlot.plot(this.gUpper, (a) => fx - a * g2 + 0.5 * L_RAYLEIGH * a * a * g2, 0, 1.4, 120);
    this.gUpper.setOpacity(gO * c.p(4, 0.5));

    // ---- Prop 4.8 (s6–s14)
    this.fProp.set({ opacity: c.p(6, 0.6) * (1 - c.p(15, 0.5)) });
    const pr = Tex.count(t, [c.s(8), c.s(9), c.s(10), c.s(11), c.s(12), c.s(14)]);
    const n2 = "\\|\\operatorname{grad}f(x_k)\\|^2";
    this.fProof.setContent(Tex.rows([
      "s_k=-\\alpha_k\\operatorname{grad}f(x_k)",
      `\\langle\\operatorname{grad}f(x_k),s_k\\rangle=-\\alpha_k${n2}`,
      `\\tfrac L2\\|s_k\\|^2=\\tfrac L2\\alpha_k^2${n2}`,
      `f(x_k)-f(x_{k+1})\\ \\ge\\ \\big(\\alpha_k-\\tfrac L2\\alpha_k^2\\big)${n2}`,
      "\\text{roots } 0,\\ \\tfrac2L;\\ \\ \\max \\text{ at } \\tfrac1L",
      `\\alpha_k=\\tfrac1L:\\ \\ ${Tex.color(Palette.yellow, "c=\\tfrac1{2L}")}`,
    ], pr));
    this.fProof.set({ opacity: (pr > 0 ? 1 : 0) * (1 - c.p(15, 0.5)) });
    const aO = c.p(11, 0.6) * (1 - c.p(15, 0.6));
    const L = L_RAYLEIGH;
    this.aPlot.setOpacity(aO);
    this.aPlot.plot(this.aCurve, (a) => a - 0.5 * L * a * a, -0.05, 0.75, 120);
    this.aCurve.setOpacity(aO);
    this.aPlot.plot(this.aWindow, () => 0, 0.12, 0.55, 2);
    this.aWindow.setOpacity(aO * c.p(13, 0.5));
    const av = t >= c.s(14) ? 1 / L : 0.02 + (0.64) * (0.5 + 0.5 * Math.sin((t - c.s(12)) * 1.3 - Math.PI / 2));
    const aq = this.aPlot.px(av, av - 0.5 * L * av * av);
    this.aDot.set(aq.x, aq.y, aO * c.p(12, 0.5));

    // ---- complexity (s15–s18)
    const cn = Tex.count(t, [c.s(15), c.s(17), c.s(18)]);
    this.fCor.setContent(Tex.rows([
      "\\min_{k<K}\\|\\operatorname{grad}f(x_k)\\|\\ \\le\\ \\sqrt{2L(f(x_0)-f_{\\mathrm{low}})}\\ \\dfrac1{\\sqrt K}",
      `\\|\\operatorname{grad}f(x_k)\\|\\le\\varepsilon\\ \\text{ within }\\ ${Tex.color(Palette.yellow, "K\\ge\\dfrac{2L(f(x_0)-f_{\\mathrm{low}})}{\\varepsilon^2}")}`,
      `${Tex.color(Palette.green, "\\text{no dimension of } M")}`,
    ], cn));
    this.fCor.set({ opacity: (cn > 0 ? 1 : 0) * (1 - c.p(19, 0.5)) });

    // ---- Euclidean origin (s19–s24)
    const en = Tex.count(t, [c.s(19), c.s(20), c.s(21), c.s(22), c.s(23), c.s(24)]);
    this.fEuc.setContent(Tex.rows([
      "E,\\ \\ R_x(s)=x+s",
      "\\|\\operatorname{grad}f(y)-\\operatorname{grad}f(x)\\|\\le L\\|y-x\\|\\qquad(4.10)",
      "f(x+s)-f(x)=\\int_0^1\\langle\\operatorname{grad}f(x+ts),s\\rangle\\,dt",
      "|f(x+s)-f(x)-\\langle\\operatorname{grad}f(x),s\\rangle|\\le\\int_0^1\\|\\operatorname{grad}f(x+ts)-\\operatorname{grad}f(x)\\|\\|s\\|\\,dt",
      "\\le\\int_0^1Lt\\|s\\|^2\\,dt=\\tfrac L2\\|s\\|^2",
      `${Tex.color(Palette.yellow, "\\text{the quadratic upper bound (4.11)}")}`,
    ], en));
    this.fEuc.set({ opacity: (en > 0 ? 1 : 0) * (1 - c.p(25, 0.5)) });

    // ---- two tangent planes (s25–s28)
    const sphO = c.p(25, 0.8) * (1 - c.p(29, 0.6));
    this.sphere.setOpacity(sphO, 1, 0);
    this.planeX.place(X, X);
    this.planeY.place(Y, Y);
    this.planeX.setOpacity(0.7 * sphO);
    this.planeY.setOpacity(0.7 * sphO);
    const gy = rayleighGrad(Y);
    this.gx.set(lift(X, 1.012), lift(X, 1.012).addScaledVector(g, 0.35));
    this.gy.set(lift(Y, 1.012), lift(Y, 1.012).addScaledVector(gy, 0.35));
    this.gx.setOpacity(sphO);
    this.gy.setOpacity(sphO);
    this.dx.setOpacity(sphO);
    this.dy.setOpacity(sphO);
    this.lx.update(sphO);
    this.ly.update(sphO);
    this.fCannot.set({ opacity: c.p(26, 0.5) * (1 - c.p(27, 0.5)) });
    this.fRead.setContent(t < c.s(29) ? "\\text{a retraction is all A4.3 needs;\\ compact sublevel sets help verify it}"
      : `\\text{sampled }\\sup\\ \\tfrac{2(f(R_x(s))-f(x)-\\langle\\operatorname{grad}f,s\\rangle)}{\\|s\\|^2}\\approx2.999`);
    this.fRead.set({ opacity: c.p(27, 0.5) * (1 - c.p(29, 0.4)) + c.p(37, 0.5) * (1 - c.p(38, 0.5)) });

    // ---- Ex 4.11: L = λmax − λmin (s29–s37)
    const xn = Tex.count(t, [c.s(29), c.s(30), c.s(31), c.s(32), c.s(33), c.s(34), c.s(35), c.s(36)]);
    this.fEx.setContent(Tex.rows([
      "f(x)=\\tfrac12x^\\top Ax\\ \\text{on } S^2,\\quad R_x(s)=\\tfrac{x+s}{\\|x+s\\|}",
      "s\\perp x\\ \\Rightarrow\\ \\|x+s\\|^2=1+\\|s\\|^2",
      "s=\\rho u,\\ \\ a=x^\\top Ax,\\ \\ b=x^\\top Au,\\ \\ c=u^\\top Au",
      "f(R_x(s))-f(x)-\\langle\\operatorname{grad}f,s\\rangle=\\dfrac{\\rho^2\\big(\\tfrac12(c-a)-\\rho b\\big)}{1+\\rho^2}",
      "\\begin{pmatrix}a&b\\\\b&c\\end{pmatrix}=A\\big|_{\\mathrm{span}\\{x,u\\}}",
      "\\text{eigenvalues in }[\\lambda_{\\min},\\lambda_{\\max}]\\ \\Rightarrow\\ \\big(\\tfrac{c-a}2\\big)^2+b^2\\le\\big(\\tfrac\\Delta2\\big)^2",
      "\\tfrac12(c-a)-\\rho b\\le\\tfrac\\Delta2\\sqrt{1+\\rho^2}\\le\\tfrac\\Delta2(1+\\rho^2)",
      `${Tex.color(Palette.yellow, "L=\\Delta=\\lambda_{\\max}-\\lambda_{\\min}=4-1=3")}`,
    ], xn));
    this.fEx.set({ opacity: (xn > 0 ? 1 : 0) * (1 - c.p(38, 0.5)) });

    // ---- counterexamples (s38–s44)
    const qO = c.p(38, 0.6) * (1 - c.p(41, 0.6));
    this.qPlot.setOpacity(qO);
    this.qPlot.plot(this.qCurve, (x) => 0.5 * x * x, -2.2, 2.2, 120);
    this.qCurve.setOpacity(qO);
    const alpha = t < c.s(40) ? 1 : t < c.in(40, 0.55) ? 2 : 2.2;
    const color = alpha === 1 ? Palette.green : alpha === 2 ? Palette.orange : Palette.red;
    const tStart = t < c.s(40) ? c.s(39) : t < c.in(40, 0.55) ? c.s(40) : c.in(40, 0.55);
    const nq = 1 + Math.min(7, Math.floor((t - tStart) / 0.45));
    let xq = 1.0;
    this.qDots.forEach((d, i) => {
      const q = this.qPlot.px(Math.max(-2.2, Math.min(2.2, xq)), Math.min(2.6, 0.5 * xq * xq));
      d.setColor(color);
      d.set(q.x, q.y, qO * (i < nq ? 0.4 + 0.6 * (i + 1) / nq : 0) * (t >= c.s(39) ? 1 : 0));
      xq *= 1 - alpha;
    });
    const qn = Tex.count(t, [c.s(38), c.s(39), c.s(40), c.in(40, 0.55)]);
    this.fCase.setContent(Tex.rows([
      "f=\\tfrac L2x^2:\\ \\ x_{k+1}=(1-\\alpha L)\\,x_k",
      `${Tex.color(Palette.green, "\\alpha=\\tfrac1L:\\ \\text{one step to }0")}`,
      `${Tex.color(Palette.orange, "\\alpha=\\tfrac2L:\\ x\\mapsto-x,\\ f\\ \\text{constant}")}`,
      `${Tex.color(Palette.red, "\\alpha>\\tfrac2L:\\ \\text{diverges}")}`,
    ], qn));
    this.fCase.set({ opacity: (qn > 0 ? 1 : 0) * (1 - c.p(41, 0.5)) });
    const x4O = c.p(41, 0.6) * (1 - c.p(45, 0.6));
    this.x4Plot.setOpacity(x4O);
    this.x4Plot.plot(this.x4Curve, (x) => x ** 4, -4, 4, 200);
    this.x4Curve.setOpacity(x4O);
    this.x4Plot.plot(this.x4Safe, () => 0, -1, 1, 2);
    this.x4Safe.setOpacity(x4O * c.p(42, 0.5));
    const pts = [2.6, 2.6 - (4 / 12) * 2.6 ** 3];
    pts.forEach((xv, i) => {
      const q = this.x4Plot.px(xv, xv ** 4);
      this.x4Dots[i].set(q.x, q.y, x4O * (i === 0 ? c.p(43, 0.4) : c.p(43, 0.4, 2.0)));
    });
    const qa = this.x4Plot.px(pts[0], pts[0] ** 4);
    const qb = this.x4Plot.px(pts[1], pts[1] ** 4);
    this.x4Jump.setPoints([qa, qb]);
    this.x4Jump.setOpacity(x4O * c.p(43, 0.4, 2.0));
    if (t >= c.s(41)) {
      this.fCase.setContent(Tex.rows([
        "f=x^4:\\ \\text{no global } L",
        `${Tex.color(Palette.green, "[-1,1]:\\ L=12")}`,
        "x_0=2.6,\\ \\alpha=\\tfrac1{12}:\\ x_1=-3.26,\\ x_2=8.28,\\ \\ldots",
        `${Tex.color(Palette.red, "(x_k,s_k)\\notin S")}`,
      ], Tex.count(t, [c.s(41), c.s(42), c.s(43), c.s(44)])));
      this.fCase.set({ opacity: x4O });
    }

    this.fEnd.set({ opacity: c.p(45, 0.6) });
    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
