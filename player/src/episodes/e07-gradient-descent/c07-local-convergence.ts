import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { lerp } from "../../primitives/Easing";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Polyline, sampleCurve } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { TangentPlane } from "../../primitives/TangentPlane";
import { MiniPlot } from "../e06-gradient-retraction/lib/MiniPlot";
import { blendView, setOrbitView } from "../e06-gradient-retraction/lib/SphereCamera";
import type { OrbitView } from "../e06-gradient-retraction/lib/SphereCamera";
import type { SvgDot, SvgPath } from "../e06-gradient-retraction/lib/SvgOverlay";
import { SvgOverlay } from "../e06-gradient-retraction/lib/SvgOverlay";
import { RayleighSphere } from "./lib/RayleighSphere";
import { E3, L_RAYLEIGH, lift, retract, rgdFixed, spherePoint } from "./lib/rayleigh";
import { Tex } from "./lib/tex";

/**
 * E07 c07 — local convergence (Boumal §4.6, Defs. 4.14–4.15, Thm. 4.16, Cors. 4.17–4.18, Thms. 4.19–4.20,
 * Lemmas 4.21–4.22): the observed straight line of dist(x_k, e₃) (ratio 2/3), rates, the previewed tools (dist, Exp,
 * Hessian), retractions as local diffeomorphisms, the local contraction mapping theorem with ξ_k = Exp⁻¹(x_k) of the
 * actual iterates, DF(x*) = Id − Hess/L and its eigenvalues, L ≥ λ₁, and the counterexamples (2x, x − x³, the saddle
 * e₂, the step 2 on ½x²).
 * Sentence indices refer to content/episodes/e07-gradient-descent/story.en.json, scene c07-local-convergence.
 */

const X0 = spherePoint(55, 35);
const STEP = 1 / L_RAYLEIGH;
const K = 26;
const CX = 680;
const VIEW_WIDE: OrbitView = { azDeg: 30, elDeg: 40, distance: 5.6, fovDeg: 34, center: new THREE.Vector3(0, 0, 0.2), shift: 1.4, lift: 0.1 };
const VIEW_SADDLE: OrbitView = { azDeg: 55, elDeg: 30, distance: 5.4, fovDeg: 34, center: new THREE.Vector3(0, 0.5, 0.45), shift: -1.1, lift: 0 };

/** Exp⁻¹ at e₃ of a unit vector x near e₃, in the (e₁, e₂) coordinates of T_{e₃}S². */
function logE3(x: THREE.Vector3): { a: number; b: number } {
  const theta = Math.acos(Math.max(-1, Math.min(1, x.z)));
  const r = Math.hypot(x.x, x.y);
  if (r < 1e-15) return { a: 0, b: 0 };
  return { a: (theta * x.x) / r, b: (theta * x.y) / r };
}

export class LocalConvergenceScene implements Scene {
  readonly id = "c07-local-convergence";
  private stage!: StageLayer;

  private sphere!: RayleighSphere;
  private iterates: THREE.Vector3[] = [];
  private path!: Polyline;
  private dots: Dot[] = [];
  private geo!: Polyline;
  private plane!: TangentPlane;
  private ellipses: Polyline[] = [];
  private diskPlane!: Polyline;
  private diskSphere!: Polyline;
  private saddleRun: THREE.Vector3[] = [];
  private saddlePath!: Polyline;
  private saddleDot!: Dot;

  private svg!: SvgOverlay;
  private logPlot!: MiniPlot;
  private logRgd!: SvgPath;
  private logLin!: SvgPath;
  private logQuad!: SvgPath;
  private xiPlot!: MiniPlot;
  private xiPath!: SvgPath;
  private xiDots: SvgDot[] = [];
  private eigPlot!: MiniPlot;
  private eigBand!: SvgPath;
  private eigDots: SvgDot[] = [];
  private cobPlot!: MiniPlot;
  private cobF!: SvgPath;
  private cobId!: SvgPath;
  private cobWeb!: SvgPath;

  private fConfuse!: FormulaHandle;
  private fRatio!: FormulaHandle;
  private fRates!: FormulaHandle;
  private fTools!: FormulaHandle;
  private fIft!: FormulaHandle;
  private fThm!: FormulaHandle;
  private fProof!: FormulaHandle;
  private fThm2!: FormulaHandle;
  private fProof2!: FormulaHandle;
  private fL!: FormulaHandle;
  private fCase!: FormulaHandle;
  private fRemarks!: FormulaHandle;

  private ledger!: ProofLedger;
  private dist: number[] = [];

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    this.sphere = new RayleighSphere(stage);
    this.iterates = rgdFixed(X0, K, STEP);
    this.dist = this.iterates.map((p) => Math.acos(Math.min(1, p.z)));
    this.path = new Polyline(stage, this.iterates.map((p) => lift(p, 1.012)), { color: Palette.orange, width: 3.5 });
    this.iterates.slice(0, 14).forEach((p) => this.dots.push(new Dot(stage, lift(p, 1.014), Palette.orange, 0.02, "3d")));
    const d = new THREE.Vector3(1, 1, 0).normalize();
    this.geo = new Polyline(stage, sampleCurve((s) => lift(E3.clone().multiplyScalar(Math.cos(s)).addScaledVector(d, Math.sin(s)), 1.01), 0, 0.9, 50), { color: Palette.teal, width: 3.5 });
    this.plane = new TangentPlane(stage, Palette.green, 0.8);
    for (const lev of [0.02, 0.06, 0.12]) {
      // level sets ½(3a² + b²) = lev of ½⟨v, Hess v⟩ on T_{e₃}: Hess eigenvalues 4 − 1 = 3 along e₁, 2 − 1 = 1 along e₂
      this.ellipses.push(new Polyline(stage, sampleCurve((s) => new THREE.Vector3(Math.sqrt((2 * lev) / 3) * Math.cos(s), Math.sqrt(2 * lev) * Math.sin(s), 1.006), 0, 2 * Math.PI, 80),
        { color: Palette.yellow, width: 2.5 }));
    }
    const xD = spherePoint(45, 30);
    const east = new THREE.Vector3(-xD.y, xD.x, 0).normalize();
    const north = xD.clone().cross(east).normalize();
    const rr = 0.55;
    this.diskPlane = new Polyline(stage, sampleCurve((s) => xD.clone().addScaledVector(east, rr * Math.cos(s)).addScaledVector(north, rr * Math.sin(s)), 0, 2 * Math.PI, 80), { color: Palette.green, width: 3 });
    this.diskSphere = new Polyline(stage, sampleCurve((s) => lift(retract(xD, east.clone().multiplyScalar(rr * Math.cos(s)).addScaledVector(north, rr * Math.sin(s))), 1.01), 0, 2 * Math.PI, 80), { color: Palette.yellow, width: 3 });
    this.saddleRun = rgdFixed(new THREE.Vector3(0.02, 1, 0.02).normalize(), 40, STEP);
    this.saddlePath = new Polyline(stage, this.saddleRun.map((p) => lift(p, 1.012)), { color: Palette.red, width: 3.5 });
    this.saddleDot = new Dot(stage, this.saddleRun[0], Palette.red, 0.03, "3d");

    this.svg = new SvgOverlay(fl);
    this.logPlot = new MiniPlot(this.svg, fl, { x: 800, y: 430, w: 480, h: 260, xMin: 0, xMax: K, yMin: -8, yMax: 0.5, xLabel: "k", yLabel: "\\log_{10}\\varepsilon_k" });
    this.logLin = this.logPlot.curve({ color: Palette.purple, width: 2.5, dash: "8 6" });
    this.logQuad = this.logPlot.curve({ color: Palette.teal, width: 2.5, dash: "3 5" });
    this.logRgd = this.logPlot.curve({ color: Palette.orange, width: 3.5 });
    this.xiPlot = new MiniPlot(this.svg, fl, { x: 820, y: 420, w: 440, h: 300, xMin: -0.15, xMax: 0.95, yMin: -0.15, yMax: 0.7, xLabel: "e_1", yLabel: "e_2" });
    this.xiPath = this.xiPlot.curve({ color: Palette.orange, width: 2.5 });
    for (let i = 0; i < 12; i++) this.xiDots.push(this.svg.dot(Palette.orange, 6));
    this.eigPlot = new MiniPlot(this.svg, fl, { x: 820, y: 560, w: 440, h: 60, xMin: -1.6, xMax: 1.6, yMin: -1, yMax: 1, xLabel: "", yLabel: "" });
    this.eigBand = this.eigPlot.curve({ color: Palette.green, width: 8 });
    for (let i = 0; i < 2; i++) this.eigDots.push(this.svg.dot(i === 0 ? Palette.yellow : Palette.orange, 9));
    this.cobPlot = new MiniPlot(this.svg, fl, { x: 820, y: 420, w: 420, h: 300, xMin: -1.2, xMax: 1.2, yMin: -1.2, yMax: 1.2, xLabel: "x", yLabel: "F(x)" });
    this.cobId = this.cobPlot.curve({ color: Palette.muted, width: 2, dash: "6 6" });
    this.cobF = this.cobPlot.curve({ color: "#ffffff", width: 3 });
    this.cobWeb = this.cobPlot.curve({ color: Palette.orange, width: 2.5 });

    this.fConfuse = fl.add({ tex: "", x: CX, y: 400, size: 34, display: true });
    this.fRatio = fl.add({ tex: "", x: 1040, y: 780, size: 26 });
    this.fRates = fl.add({ tex: "", x: 1040, y: 300, size: 26, display: true });
    this.fTools = fl.add({ tex: "", x: 1000, y: 380, size: 26, display: true });
    this.fIft = fl.add({ tex: "", x: 1000, y: 380, size: 28, display: true });
    this.fThm = fl.add({ tex: "\\begin{gathered}\\textbf{Thm 4.19 (local contraction)}\\ \\ F:M\\to M,\\ F(x^*)=x^*,\\ \\|DF(x^*)\\|<1\\\\ \\Rightarrow\\ \\exists\\ \\text{neighborhood: stays, } x_k\\to x^*\\ \\text{linearly, factor}\\le\\|DF(x^*)\\|;\\ \\ DF(x^*)=0\\Rightarrow\\text{quadratic}\\end{gathered}",
      x: CX, y: 150, size: 26, display: true, boxed: true });
    this.fProof = fl.add({ tex: "", x: 400, y: 560, size: 25, display: true });
    this.fThm2 = fl.add({ tex: "\\begin{gathered}\\textbf{Thm 4.20}\\ \\ \\operatorname{grad}f(x^*)=0,\\ \\operatorname{Hess}f(x^*)\\succ0,\\ \\lambda_1\\ge\\cdots\\ge\\lambda_n>0,\\ \\kappa=\\lambda_1/\\lambda_n\\\\ F(x)=R_x(-\\tfrac1L\\operatorname{grad}f(x)),\\ L>\\tfrac{\\lambda_1}2\\ \\Rightarrow\\ \\text{local linear};\\ \\ L=\\lambda_1:\\ \\text{factor}\\le1-\\tfrac1\\kappa\\end{gathered}",
      x: CX, y: 150, size: 26, display: true, boxed: true });
    this.fProof2 = fl.add({ tex: "", x: 400, y: 560, size: 25, display: true });
    this.fL = fl.add({ tex: "", x: CX, y: 420, size: 30, display: true });
    this.fCase = fl.add({ tex: "", x: 420, y: 520, size: 28, display: true });
    this.fRemarks = fl.add({ tex: "", x: CX, y: 420, size: 30, display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "\\text{retraction} = \\text{local diffeo near } 0", at: cue.e(26) },
      { label: "2", tex: "\\|DF(x^*)\\|<1\\Rightarrow\\text{linear, factor}\\le\\|DF(x^*)\\|", at: cue.e(41) },
      { label: "3", tex: "DF(x^*)=\\mathrm{Id}-\\tfrac1L\\operatorname{Hess}f(x^*)", at: cue.e(55) },
      { label: "4", tex: "L=\\lambda_1:\\ \\text{factor}\\le1-1/\\kappa", at: cue.e(60) },
      { label: "5", tex: "\\text{A4.3}\\Rightarrow L\\ge\\lambda_1", at: cue.e(62) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    setOrbitView(this.stage, blendView(VIEW_WIDE, VIEW_SADDLE, c.p(68, 1.0) * (1 - c.p(71, 0.8))));

    // ---- s0–s2: two confusions
    const cn = Tex.count(t, [c.s(0), c.s(1), c.s(2)]);
    this.fConfuse.setContent(Tex.rows([
      "\\text{global convergence: converges from every } x_0",
      `${Tex.color(Palette.red, "\\neq")}\\ \\text{convergence to a global minimizer}`,
      "\\text{so far: accumulation points are critical (not convergence)}",
    ], cn));
    this.fConfuse.set({ opacity: (cn > 0 ? 1 : 0) * (1 - c.p(3, 0.5)) });

    // ---- sphere: observed RGD (s3–s11), preview (s12–s21), retraction disk (s22–s26), saddle (s68–s70)
    const sphO = c.p(3, 0.8) * (1 - c.p(27, 0.6)) + c.p(68, 0.8) * (1 - c.p(71, 0.6));
    this.sphere.setOpacity(sphO, 1, sphO);
    const runO = c.p(3, 0.6) * (1 - c.p(12, 0.6));
    const shown = Math.min(14, 1 + Math.floor(c.over(3, 0.05, 0.9) * 13 + 1e-9));
    this.path.setPoints(this.iterates.slice(0, Math.max(2, shown)).map((p) => lift(p, 1.012)));
    this.path.setOpacity(shown >= 2 ? runO : 0);
    this.dots.forEach((d, k) => d.setOpacity(k < shown ? runO : 0));
    const toolO = c.p(12, 0.6) * (1 - c.p(22, 0.6));
    this.geo.setOpacity(toolO * c.p(14, 0.5));
    this.geo.setProgress(c.over(14, 0.1, 0.9));
    this.plane.place(E3.clone().multiplyScalar(1.004), E3);
    this.plane.setOpacity(0.6 * toolO * c.p(16, 0.5));
    this.ellipses.forEach((e) => e.setOpacity(toolO * c.p(21, 0.5)));
    const diskO = c.p(23, 0.6) * (1 - c.p(27, 0.6));
    this.diskPlane.setOpacity(diskO * c.p(25, 0.5));
    this.diskSphere.setOpacity(diskO * c.p(25, 0.5, 0.8));
    const sadO = c.p(68, 0.6) * (1 - c.p(71, 0.6));
    const ns = Math.min(this.saddleRun.length, 2 + Math.floor(c.over(70, 0.05, 0.9) * (this.saddleRun.length - 2)));
    this.saddlePath.setPoints(this.saddleRun.slice(0, ns).map((p) => lift(p, 1.012)));
    this.saddlePath.setOpacity(sadO * c.p(70, 0.3));
    this.saddleDot.setPosition(lift(this.saddleRun[Math.max(0, ns - 1)], 1.014));
    this.saddleDot.setOpacity(sadO);

    // ---- log panel (s3–s11)
    const logO = c.p(3, 0.6) * (1 - c.p(12, 0.6));
    this.logPlot.setOpacity(logO);
    const up = Math.floor(c.over(3, 0.05, 0.9) * K);
    this.logRgd.setPoints(this.dist.slice(0, up + 1).map((v, k) => this.logPlot.px(k, Math.max(-8, Math.log10(v)))));
    this.logRgd.setOpacity(logO);
    this.logPlot.plot(this.logLin, (k) => -k * Math.log10(2), 0, K, 2);
    this.logLin.setOpacity(logO * c.p(10, 0.5));
    this.logPlot.plot(this.logQuad, (k) => -(2 ** k) * Math.log10(2), 0, 4.5, 60);
    this.logQuad.setOpacity(logO * c.p(11, 0.5));
    const r = this.dist[20] / this.dist[19];
    this.fRatio.setContent(`${Tex.color(Palette.orange, `\\varepsilon_{k+1}/\\varepsilon_k\\to${r.toFixed(3)}`)}\\qquad ${Tex.color(Palette.purple, "2^{-k}")}\\qquad ${Tex.color(Palette.teal, "2^{-2^k}")}`);
    this.fRatio.set({ opacity: logO * c.p(4, 0.5) });
    const rn = Tex.count(t, [c.s(6), c.s(8), c.s(9)]);
    this.fRates.setContent(Tex.rows([
      "\\textbf{linear: } \\mathrm{dist}(a_k,a^*)\\le\\varepsilon_k,\\ \\ \\tfrac{\\varepsilon_{k+1}}{\\varepsilon_k}\\to\\mu<1",
      "\\inf\\mu:\\ \\text{factor};\\ \\ \\mu=0:\\ \\text{superlinear}",
      "\\textbf{quadratic: } \\tfrac{\\varepsilon_{k+1}}{\\varepsilon_k^2}\\to\\mu<\\infty",
    ], rn));
    this.fRates.set({ opacity: (rn > 0 ? 1 : 0) * (1 - c.p(12, 0.5)) });

    // ---- preview tools (s12–s21)
    const tn = Tex.count(t, [c.s(12), c.s(13), c.s(14), c.s(16), c.s(17), c.s(19), c.s(21)]);
    this.fTools.setContent(Tex.rows([
      `${Tex.color(Palette.muted, "\\text{preview (defined later in the series)}")}`,
      "\\mathrm{dist}:\\ \\text{Riemannian distance}",
      "\\mathrm{Exp}_x:\\ \\mathrm{dist}(x,\\mathrm{Exp}_x v)=\\|v\\|\\ \\ (\\text{small } v)",
      "\\operatorname{Hess}f(x^*):\\ \\text{self-adjoint on } T_{x^*}M",
      "f(R_{x^*}(v))=f(x^*)+\\tfrac12\\langle v,\\operatorname{Hess}f(x^*)[v]\\rangle+O(\\|v\\|^3)",
      "D(\\operatorname{grad}f)(x^*)=\\operatorname{Hess}f(x^*);\\ \\ \\succ0\\Rightarrow\\text{strict local min}",
      `${Tex.color(Palette.yellow, "e_3:\\ \\operatorname{Hess}=A-\\lambda_{\\min}I\\ \\text{on } T_{e_3},\\ \\text{eigenvalues } 1,\\,3")}`,
    ], tn));
    this.fTools.set({ opacity: (tn > 0 ? 1 : 0) * (1 - c.p(22, 0.5)) });

    // ---- inverse function theorem on manifolds (s22–s26)
    const iq = Tex.count(t, [c.s(23), c.s(24), c.s(25), c.s(26)]);
    this.fIft.setContent(Tex.rows([
      "DF(x)\\ \\text{invertible}\\ \\Rightarrow\\ F|_U:U\\to V\\ \\text{diffeomorphism}",
      `${Tex.color(Palette.muted, "\\text{charts reduce it to episode 3}")}`,
      "DR_x(0)=\\mathrm{id}\\ \\Rightarrow\\ R_x:B(x,r)\\to R_x(B(x,r))\\ \\text{diffeomorphism}",
      `${Tex.color(Palette.green, "\\text{near } x,\\ R_x\\ \\text{is a coordinate system}")}`,
    ], iq));
    this.fIft.set({ opacity: (iq > 0 ? 1 : 0) * (1 - c.p(27, 0.5)) });

    // ---- Thm 4.19 and proof (s27–s41), ξ_k of the actual iterates
    this.fThm.set({ opacity: c.p(27, 0.6) * (1 - c.p(42, 0.6)) });
    const pr = Tex.count(t, [c.s(31), c.s(32), c.s(33), c.s(34), c.s(36), c.s(37), c.s(38), c.s(39), c.s(41)]);
    this.fProof.setContent(Tex.rows([
      "R_{x^*}:B(x^*,r)\\to U\\ \\text{diffeo}",
      "F^{-1}(U)\\ \\text{open}\\ni x^*\\ \\Rightarrow\\ r'\\le r",
      "x_k=R_{x^*}(\\xi_k),\\ \\ \\xi_k\\in T_{x^*}M",
      "\\xi_{k+1}=\\tilde F(\\xi_k),\\ \\ \\tilde F=R_{x^*}^{-1}\\circ F\\circ R_{x^*}",
      "\\tilde F(0)=0,\\ \\ D\\tilde F(0)=DF(x^*)",
      "\\tilde F(v)=DF(x^*)[v]+E(v),\\ \\ \\|E(v)\\|\\le c\\|v\\|^2",
      "\\|\\xi_{k+1}\\|\\le(\\|DF(x^*)\\|+c\\|\\xi_k\\|)\\,\\|\\xi_k\\|",
      "\\|DF(x^*)\\|+cr'<1\\ \\Rightarrow\\ \\text{stays},\\ \\tfrac{\\|\\xi_{k+1}\\|}{\\|\\xi_k\\|}\\to\\le\\|DF(x^*)\\|",
      "DF(x^*)=0:\\ \\|\\xi_{k+1}\\|\\le c\\|\\xi_k\\|^2",
    ], pr));
    this.fProof.set({ opacity: (pr > 0 ? 1 : 0) * (1 - c.p(42, 0.5)) });
    const xiO = c.p(33, 0.6) * (1 - c.p(42, 0.6));
    this.xiPlot.setOpacity(xiO);
    const xi = this.iterates.slice(0, 12).map((p) => logE3(p));
    const nx = Math.min(12, 1 + Math.floor(c.over(33, 0.1, 1) * 4 + c.over(37, 0, 1) * 4 + c.over(38, 0, 1) * 3));
    this.xiPath.setPoints(xi.slice(0, nx).map((v) => this.xiPlot.px(v.a, v.b)));
    this.xiPath.setOpacity(xiO);
    this.xiDots.forEach((d, i) => {
      const q = this.xiPlot.px(xi[i].a, xi[i].b);
      d.set(q.x, q.y, i < nx ? xiO : 0);
    });

    // ---- Thm 4.20 and proof (s42–s60)
    this.fThm2.set({ opacity: c.p(42, 0.6) * (1 - c.p(61, 0.6)) });
    const p2 = Tex.count(t, [c.s(47), c.s(49), c.s(50), c.s(52), c.s(53), c.s(54), c.s(55), c.s(56), c.s(57), c.s(58)]);
    this.fProof2.setContent(Tex.rows([
      "F(x^*)=R_{x^*}(0)=x^*",
      "\\textbf{L4.21}\\ \\ DR(x,0)[(u,v)]=u+v",
      "(c(t),0)\\mapsto c(t):\\ u\\quad(R_x(0)=x)",
      "(x,tv)\\mapsto R_x(tv):\\ v\\quad(DR_x(0)=\\mathrm{id})",
      "G=-\\tfrac1L\\operatorname{grad}f,\\ \\ G(x^*)=0",
      "DF(x^*)[v]=v+DG(x^*)[v]",
      `${Tex.color(Palette.yellow, "DF(x^*)=\\mathrm{Id}-\\tfrac1L\\operatorname{Hess}f(x^*)")}`,
      "\\text{eigenvalues } 1-\\lambda_i/L",
      "\\|DF\\|=\\max(|1-\\tfrac{\\lambda_1}L|,|1-\\tfrac{\\lambda_n}L|)",
      "\\lambda_n>0,\\ L>\\tfrac{\\lambda_1}2\\Rightarrow\\|DF\\|<1",
    ], p2));
    this.fProof2.set({ opacity: (p2 > 0 ? 1 : 0) * (1 - c.p(61, 0.5)) });
    // eigenvalue line: L slides from 3 down to 1.2 (s56–s59), then back to λ₁ = 3 (s60)
    const eO = c.p(56, 0.6) * (1 - c.p(61, 0.6));
    this.eigPlot.setOpacity(eO);
    this.eigPlot.plot(this.eigBand, () => 0, -1, 1, 2);
    this.eigBand.setOpacity(eO);
    const Lnow = t < c.s(60) ? lerp(3, 1.2, c.over(59, 0.1, 0.9)) : lerp(1.2, 3, c.over(60, 0, 0.5));
    [3, 1].forEach((lam, i) => {
      const v = 1 - lam / Lnow;
      const q = this.eigPlot.px(Math.max(-1.6, v), 0);
      this.eigDots[i].setColor(v <= -1 ? Palette.red : i === 0 ? Palette.yellow : Palette.orange);
      this.eigDots[i].set(q.x, q.y, eO);
    });

    // ---- Lemma 4.22 and the Rayleigh numbers (s61–s64)
    const ln = Tex.count(t, [c.s(61), c.s(62), c.s(63), c.s(64)]);
    this.fL.setContent(Tex.rows([
      "f(R_{x^*}(tv))\\le f(x^*)+L\\tfrac{t^2}2\\|v\\|^2\\quad\\text{vs}\\quad f(x^*)+\\tfrac{t^2}2\\langle v,\\operatorname{Hess}v\\rangle+O(t^3)",
      "\\Rightarrow\\ \\langle v,\\operatorname{Hess}f(x^*)[v]\\rangle\\le L\\|v\\|^2\\ \\Rightarrow\\ L\\ge\\lambda_1",
      "\\text{Rayleigh: } L=3=\\lambda_1,\\ \\ \\kappa=3",
      `${Tex.color(Palette.yellow, `1-\\tfrac1\\kappa=\\tfrac23\\approx0.667\\ \\ (\\text{measured } ${r.toFixed(3)})`)}`,
    ], ln));
    this.fL.set({ opacity: (ln > 0 ? 1 : 0) * (1 - c.p(65, 0.5)) });

    // ---- counterexamples (s65–s72): cobwebs and the saddle
    const cobO = c.p(65, 0.6) * (1 - c.p(68, 0.6)) + c.p(71, 0.6) * (1 - c.p(73, 0.6));
    this.cobPlot.setOpacity(cobO);
    const mode = t < c.s(66) ? 0 : t < c.s(68) ? 1 : 2;
    const F = mode === 0 ? (x: number) => 2 * x : mode === 1 ? (x: number) => x - x * x * x : (x: number) => -x;
    const x0 = mode === 0 ? 0.08 : mode === 1 ? 0.95 : 0.8;
    this.cobPlot.plot(this.cobF, F, -1.2, 1.2, 120);
    this.cobF.setOpacity(cobO);
    this.cobPlot.plot(this.cobId, (x) => x, -1.2, 1.2, 2);
    this.cobId.setOpacity(cobO);
    const web: { x: number; y: number }[] = [this.cobPlot.px(x0, 0)];
    let xw = x0;
    const steps = mode === 0 ? 4 : mode === 1 ? 14 : 6;
    const startT = mode === 0 ? c.s(65) : mode === 1 ? c.s(66) : c.s(72);
    const nw = Math.min(steps, Math.floor((t - startT) / 0.5) + 1);
    for (let i = 0; i < nw; i++) {
      const y = F(xw);
      if (Math.abs(y) > 1.2) break;
      web.push(this.cobPlot.px(xw, y), this.cobPlot.px(y, y));
      xw = y;
    }
    this.cobWeb.setPoints(web);
    this.cobWeb.setColor(mode === 1 ? Palette.orange : Palette.red);
    this.cobWeb.setOpacity(cobO * (mode === 2 && t < c.s(72) ? 0 : 1));
    const cs = Tex.count(t, [c.s(65), c.s(66), c.s(67), c.s(68), c.s(69), c.s(71), c.s(72)]);
    this.fCase.setContent(Tex.rows([
      `${Tex.color(Palette.red, "F(x)=2x")}:\\ \\ x^*=0\\ \\text{repels}`,
      "F(x)=x-x^3:\\ \\ F'(0)=1",
      "x_k\\approx1/\\sqrt{2k}:\\ \\text{not linear}",
      `${Tex.color(Palette.red, "e_2")}:\\ \\operatorname{Hess}\\ \\text{eigenvalues } 2,\\,-1`,
      "DF\\ \\text{eigenvalue } 1+\\tfrac1L>1\\ \\Rightarrow\\ \\text{pushed to } e_3",
      `${Tex.color(Palette.red, "L\\le\\lambda_1/2")}:\\ \\text{step too long}`,
      "\\tfrac12x^2,\\ \\alpha=2:\\ x\\mapsto-x",
    ], cs));
    this.fCase.set({ opacity: (cs > 0 ? 1 : 0) * (1 - c.p(73, 0.5)) });

    // ---- remarks (s73–s75)
    const rm = Tex.count(t, [c.s(73), c.s(74), c.s(75)]);
    this.fRemarks.setContent(Tex.rows([
      "\\text{proof retraction (Exp)}\\neq\\text{algorithm retraction}",
      "\\text{backtracking: } F\\ \\text{may be non-smooth; still linear (other tools)}",
      `${Tex.color(Palette.yellow, "DF(x^*)=0\\ \\Rightarrow\\ \\text{quadratic: Newton's method, later}")}`,
    ], rm));
    this.fRemarks.set({ opacity: rm > 0 ? 1 : 0 });

    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
