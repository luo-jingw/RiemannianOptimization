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
import { Polyline, sampleCurve } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { WorldLabel } from "../../primitives/WorldLabel";
import { MiniPlot } from "../e06-gradient-retraction/lib/MiniPlot";
import { blendView, setOrbitView } from "../e06-gradient-retraction/lib/SphereCamera";
import type { OrbitView } from "../e06-gradient-retraction/lib/SphereCamera";
import type { SvgDot, SvgPath } from "../e06-gradient-retraction/lib/SvgOverlay";
import { SvgOverlay } from "../e06-gradient-retraction/lib/SvgOverlay";
import { RayleighSphere } from "./lib/RayleighSphere";
import type { RgdStep } from "./lib/rayleigh";
import { L_RAYLEIGH, arcPath, backtrack, lift, lineSearch, rayleigh, rayleighGrad, retract, rgdBacktracking, spherePoint } from "./lib/rayleigh";
import { Tex } from "./lib/tex";

/**
 * E07 c06 — backtracking line search (Boumal §4.5): the Armijo condition (4.12) on the plot of
 * g(α) = f(R_x(−α grad f(x))), Algorithm 4.2 with ᾱ = 2, τ = ½ (trials 2, 1, ½), Lemma 4.12 and its proof with the
 * accepted interval (0, 2(1 − r)/L], the trial count, Corollary 4.13, RGD with backtracking on the sphere,
 * scale-invariant initial steps (4.13), and the parameter counterexamples.
 * The picture uses r = 0.3 (the narration says so); x is at polar 40°, azimuth 45°, where 2 and 1 fail and ½ passes.
 * Sentence indices refer to content/episodes/e07-gradient-descent/story.en.json, scene c06-backtracking.
 */

const X0 = spherePoint(40, 45);
const R_DEMO = 0.3;
const TAU = 0.5;
const ALPHA_BAR = 2;
const A_MAX = 2.2;
const LEFT = 400;                 // center of the left column (formulas when the sphere is hidden)
const PANEL_X = 760;
const VIEW_SETUP: OrbitView = { azDeg: 35, elDeg: 32, distance: 6.6, fovDeg: 34, center: new THREE.Vector3(0, 0, 0.1), shift: 2.25, lift: -0.15 };
const VIEW_RUN: OrbitView = { azDeg: 40, elDeg: 60, distance: 3.6, fovDeg: 34, center: new THREE.Vector3(0.18, 0.18, 0.85), shift: 0.9, lift: -0.1 };

export class BacktrackingScene implements Scene {
  readonly id = "c06-backtracking";
  private stage!: StageLayer;

  private sphere!: RayleighSphere;
  private xDot!: Dot;
  private xLabel!: WorldLabel;
  private gArrow!: Arrow;
  private curve!: Polyline;
  private trialDots: Dot[] = [];
  private path!: Polyline;
  private pathScaled!: Polyline;
  private iterDots: Dot[] = [];
  private iterLabels: WorldLabel[] = [];
  private steps: RgdStep[] = [];

  private svg!: SvgOverlay;
  private gPlot!: MiniPlot;
  private gCurve!: SvgPath;
  private armijo!: SvgPath;
  private tangent!: SvgPath;
  private upper!: SvgPath;
  private safe!: SvgPath;
  private trialMarks: SvgDot[] = [];
  private trialRing: SvgDot[] = [];
  private qPlot!: MiniPlot;
  private qCurve!: SvgPath;
  private qMarks: SvgDot[] = [];

  private fArmijo!: FormulaHandle;
  private fR!: FormulaHandle;
  private fAlgo!: FormulaHandle;
  private fLemma!: FormulaHandle;
  private fProof!: FormulaHandle;
  private fCount!: FormulaHandle;
  private fCor!: FormulaHandle;
  private fInit!: FormulaHandle;
  private fBad!: FormulaHandle;
  private trialLabels: FormulaHandle[] = [];
  private safeLabel!: FormulaHandle;

  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    this.sphere = new RayleighSphere(stage);
    this.xDot = new Dot(stage, lift(X0, 1.01), Palette.orange, 0.032, "3d");
    this.xLabel = new WorldLabel(stage, fl, { tex: "x", size: 34, color: Palette.orange }, X0, { x: -18, y: -16 });
    const g = rayleighGrad(X0);
    this.gArrow = new Arrow(stage, X0, X0.clone().sub(g.clone().multiplyScalar(0.35)), "#ffffff", { mode: "3d", width: 6, headLength: 0.09 });
    this.curve = new Polyline(stage, sampleCurve((a) => lift(retract(X0, g.clone().multiplyScalar(-a))), 0, A_MAX, 90), { color: "#ffffff", width: 3 });
    for (let i = 0; i < 3; i++) this.trialDots.push(new Dot(stage, X0, Palette.red, 0.03, "3d"));

    this.steps = rgdBacktracking(X0, 8, { tau: TAU, r: 1e-4, l0: 1.0 });
    const scaled = rgdBacktracking(X0, 8, { tau: TAU, r: 1e-4, l0: 1.0, scale: 8 });
    this.path = new Polyline(stage, arcPath(this.steps.map((s) => s.x)), { color: Palette.orange, width: 3.5 });
    this.pathScaled = new Polyline(stage, arcPath(scaled.map((s) => s.x), 1.018), { color: Palette.purple, width: 3, dashed: true, dashSize: 0.04, gapSize: 0.03 });
    this.steps.forEach((s, k) => {
      this.iterDots.push(new Dot(stage, lift(s.x, 1.014), Palette.orange, k === 0 ? 0.03 : 0.022, "3d"));
      this.iterLabels.push(new WorldLabel(stage, fl, { tex: k === 0 ? "" : `${s.trials}`, size: 24, color: Palette.yellow }, s.x, { x: 14, y: -12 }));
    });

    this.svg = new SvgOverlay(fl);
    this.gPlot = new MiniPlot(this.svg, fl, { x: PANEL_X, y: 440, w: 520, h: 270, xMin: 0, xMax: A_MAX, yMin: 0, yMax: 1.3,
      xLabel: "\\alpha", yLabel: "g(\\alpha)=f(R_x(-\\alpha\\operatorname{grad}f(x)))" });
    this.safe = this.gPlot.curve({ color: Palette.green, width: 7 });
    this.tangent = this.gPlot.curve({ color: Palette.muted, width: 2, dash: "4 6" });
    this.upper = this.gPlot.curve({ color: Palette.purple, width: 2.5, dash: "9 6" });
    this.armijo = this.gPlot.curve({ color: Palette.orange, width: 3 });
    this.gCurve = this.gPlot.curve({ color: "#ffffff", width: 3.5 });
    for (let i = 0; i < 3; i++) {
      this.trialRing.push(this.svg.dot(Palette.red, 9));
      this.trialMarks.push(this.svg.dot(Palette.background, 5));
      this.trialLabels.push(fl.add({ tex: ["2", "1", "\\tfrac12"][i], x: 0, y: 0, size: 24, color: Palette.muted }));
    }
    this.safeLabel = fl.add({ tex: "\\alpha\\le\\tfrac{2(1-r)}{L}", x: 0, y: 0, size: 24, color: Palette.green });

    this.qPlot = new MiniPlot(this.svg, fl, { x: PANEL_X, y: 420, w: 520, h: 260, xMin: -1.2, xMax: 1.2, yMin: 0, yMax: 0.8,
      xLabel: "x", yLabel: "\\tfrac12x^2" });
    this.qCurve = this.qPlot.curve({ color: "#ffffff", width: 3 });
    for (let i = 0; i < 10; i++) this.qMarks.push(this.svg.dot(Palette.orange, 7));

    const norm = "\\|\\operatorname{grad}f(x)\\|^2";
    this.fArmijo = fl.add({ tex: `f(x)-f\\big(R_x(-\\alpha\\operatorname{grad}f(x))\\big)\\ \\ge\\ r\\,\\alpha\\,${norm}`, x: 700, y: 110, size: 34 });
    this.fR = fl.add({ tex: "r\\in(0,1),\\ \\text{often } 10^{-4}\\qquad(\\text{picture: } r=0.3)", x: 700, y: 175, size: 26, color: Palette.muted });
    this.fAlgo = fl.add({ tex: "\\begin{aligned}&\\textbf{Backtracking}\\ \\ (\\tau,r\\in(0,1))\\\\ &\\alpha\\leftarrow\\bar\\alpha\\\\ &\\textbf{while}\\ f(x)-f(R_x(-\\alpha\\operatorname{grad}f))<r\\alpha\\|\\operatorname{grad}f\\|^2:\\ \\ \\alpha\\leftarrow\\tau\\alpha\\\\ &\\textbf{return}\\ \\alpha\\end{aligned}",
      x: 1030, y: 250, size: 22, display: true, boxed: true });
    this.fLemma = fl.add({ tex: `\\begin{gathered}\\textbf{Lemma 4.12}\\ \\ \\text{A4.3 on } \\{(x,-\\alpha\\operatorname{grad}f(x)):\\alpha\\in[0,\\bar\\alpha]\\}\\\\ \\alpha\\ \\ge\\ \\min\\!\\Big(\\bar\\alpha,\\ \\tfrac{2\\tau(1-r)}{L}\\Big),\\qquad f(x)-f(x_+)\\ \\ge\\ r\\min\\!\\Big(\\bar\\alpha,\\tfrac{2\\tau(1-r)}{L}\\Big)${norm}\\end{gathered}`,
      x: 700, y: 245, size: 26, display: true, boxed: true });
    this.fProof = fl.add({ tex: "", x: LEFT, y: 560, size: 25, display: true });
    this.fCount = fl.add({ tex: "", x: LEFT, y: 560, size: 26, display: true });
    this.fCor = fl.add({ tex: "\\begin{gathered}\\textbf{Corollary 4.13}\\ \\ \\liminf_k\\bar\\alpha_k>0\\\\ c_k=r\\min\\!\\Big(\\bar\\alpha_k,\\tfrac{2\\tau(1-r)}{L}\\Big)\\ \\Rightarrow\\ \\|\\operatorname{grad}f(x_k)\\|\\to0,\\ \\ \\min_{k<K}\\|\\operatorname{grad}f(x_k)\\|=O(1/\\sqrt K)\\end{gathered}",
      x: 700, y: 245, size: 26, display: true, boxed: true });
    this.fInit = fl.add({ tex: "", x: 1020, y: 330, size: 26, display: true });
    this.fBad = fl.add({ tex: "", x: LEFT, y: 560, size: 26, display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: `f(x)-f(x_+)\\ge r\\alpha\\|\\operatorname{grad}f\\|^2`, at: cue.e(3) },
      { label: "2", tex: "\\alpha\\ge\\min(\\bar\\alpha,\\,2\\tau(1-r)/L)", at: cue.e(19) },
      { label: "3", tex: "n\\le\\max\\!\\big(1,\\,2+\\log_{1/\\tau}\\tfrac{\\bar\\alpha L}{2(1-r)}\\big)", at: cue.e(21) },
      { label: "4", tex: "\\liminf\\bar\\alpha_k>0\\Rightarrow\\|\\operatorname{grad}f(x_k)\\|\\to0", at: cue.e(25) },
      { label: "5", tex: "\\bar\\alpha_k=\\tfrac{2(f(x_{k-1})-f(x_k))}{\\|\\operatorname{grad}f(x_k)\\|^2}", at: cue.e(30) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    setOrbitView(this.stage, blendView(VIEW_SETUP, VIEW_RUN, c.p(26, 0.8, -0.6)));

    const g = rayleighGrad(X0);
    const g2 = g.lengthSq();
    const fx = rayleigh(X0);

    // ---- sphere: shown for the setup (s0–s13), hidden during the proof (s14–s25), back for the run (s26–s31)
    const sphereO = c.p(0, 0.8, -0.8) * (1 - c.p(14, 0.6)) + c.p(26, 0.8) * (1 - c.p(32, 0.6));
    this.sphere.setOpacity(sphereO, 1, 0.9 * c.p(26, 0.6));
    const xO = sphereO * (1 - c.p(26, 0.5));
    this.xDot.setOpacity(xO);
    this.xLabel.update(xO);
    this.gArrow.setOpacity(xO * c.p(0, 0.6));
    this.curve.setOpacity(xO * c.p(1, 0.6));
    this.curve.setProgress(c.over(1, 0.1, 0.9));
    const trials = backtrack(X0, ALPHA_BAR, TAU, R_DEMO).trials;
    const trialAt = [c.in(8, 0.35), c.in(9, 0.15), c.in(9, 0.6)];
    trials.slice(0, 3).forEach((tr, i) => {
      const on = t >= trialAt[i] ? 1 : 0;
      this.trialDots[i].setPosition(lift(retract(X0, g.clone().multiplyScalar(-tr.alpha)), 1.014));
      this.trialDots[i].setColor(tr.accepted ? Palette.green : Palette.red);
      this.trialDots[i].setOpacity(xO * on);
    });

    // RGD with backtracking (s26) and the scaled cost 8f + 3 (s27–s31)
    const run = c.over(26, 0.05, 0.85);
    const shown = Math.min(this.steps.length, 1 + Math.floor(run * (this.steps.length - 1) + 1e-9));
    const runO = c.p(26, 0.5) * (1 - c.p(32, 0.6));
    this.path.setPoints(arcPath(this.steps.slice(0, Math.max(2, shown)).map((s) => s.x)));
    this.path.setOpacity(shown >= 2 ? runO : 0);
    this.iterDots.forEach((d, k) => d.setOpacity(k < shown ? runO : 0));
    this.iterLabels.forEach((l, k) => l.update(k < shown && k > 0 ? runO * (1 - c.p(27, 0.5)) : 0));
    this.pathScaled.setOpacity(runO * c.p(28, 0.6));
    this.pathScaled.setProgress(c.over(28, 0.1, 0.8));

    // ---- plot of g with the Armijo line (s1–s19)
    const plotO = c.p(1, 0.6) * (1 - c.p(20, 0.6));
    this.gPlot.setOpacity(plotO);
    this.gPlot.plot(this.gCurve, (a) => lineSearch(X0, a), 0, A_MAX, 140);
    this.gCurve.setOpacity(plotO);
    this.gPlot.plot(this.tangent, (a) => fx - a * g2, 0, 0.85, 2);
    this.tangent.setOpacity(plotO * c.p(5, 0.5));
    this.gPlot.plot(this.armijo, (a) => fx - R_DEMO * a * g2, 0, A_MAX, 2);
    this.armijo.setOpacity(plotO * c.p(5, 0.6, 0.6));
    this.gPlot.plot(this.upper, (a) => fx - a * g2 + 0.5 * L_RAYLEIGH * a * a * g2, 0, A_MAX, 120);
    this.upper.setOpacity(plotO * c.p(14, 0.6));
    const aSafe = (2 * (1 - R_DEMO)) / L_RAYLEIGH;
    const p0 = this.gPlot.px(0, 0);
    const p1 = this.gPlot.px(aSafe, 0);
    this.safe.setPoints([{ x: p0.x, y: p0.y - 3 }, { x: p1.x, y: p1.y - 3 }]);
    this.safe.setOpacity(plotO * c.p(17, 0.6));
    this.safeLabel.set({ x: p1.x - 20, y: p1.y + 66, opacity: plotO * c.p(17, 0.6) });
    trials.slice(0, 3).forEach((tr, i) => {
      const q = this.gPlot.px(tr.alpha, tr.value);
      const on = (t >= trialAt[i] ? 1 : 0) * plotO;
      this.trialRing[i].setColor(tr.accepted ? Palette.green : Palette.red);
      this.trialRing[i].set(q.x, q.y, on);
      this.trialMarks[i].set(q.x, q.y, tr.accepted ? 0 : on);
      const base = this.gPlot.px(tr.alpha, 0);
      this.trialLabels[i].set({ x: base.x, y: base.y + 28, opacity: on });
    });

    // ---- formulas
    this.fArmijo.set({ opacity: c.p(2, 0.6) * (1 - c.p(10, 0.6)) });
    this.fR.set({ opacity: c.p(4, 0.6) * (1 - c.p(7, 0.4)) });
    this.fAlgo.set({ opacity: c.p(7, 0.6) * (1 - c.p(10, 0.6)) });
    this.fLemma.set({ opacity: c.p(11, 0.6) * (1 - c.p(20, 0.6)) });
    const n2 = "\\|\\operatorname{grad}f\\|^2";
    const pr = Tex.count(t, [c.s(14), c.s(15), c.s(16), c.s(18), c.s(19)]);
    this.fProof.setContent(Tex.rows([
      `\\text{A4.3: }\\ f(x)-f(x_+)\\ \\ge\\ (\\alpha-\\tfrac L2\\alpha^2)${n2}`,
      `\\text{rejected: }\\ f(x)-f(x_+)\\ <\\ r\\alpha${n2}`,
      `\\Rightarrow\\ \\alpha-\\tfrac L2\\alpha^2<r\\alpha\\ \\Rightarrow\\ ${Tex.color(Palette.red, "\\alpha>\\tfrac{2(1-r)}{L}")}`,
      `\\text{returned: } \\alpha=\\bar\\alpha\\ \\text{ or }\\ \\alpha=\\tau\\cdot(\\text{rejected})>\\tfrac{2\\tau(1-r)}{L}`,
      `\\Rightarrow\\ ${Tex.color(Palette.yellow, "\\alpha\\ge\\min(\\bar\\alpha,\\,2\\tau(1-r)/L)")}`,
    ], pr));
    this.fProof.set({ opacity: (pr > 0 ? 1 : 0) * (1 - c.p(20, 0.5)) });
    const cn = Tex.count(t, [c.s(20), c.s(21)]);
    this.fCount.setContent(Tex.rows([
      "\\alpha=\\bar\\alpha\\,\\tau^{\\,n-1}\\ \\Rightarrow\\ n=1+\\log_{1/\\tau}\\tfrac{\\bar\\alpha}{\\alpha}",
      "n\\ \\le\\ \\max\\!\\Big(1,\\ 2+\\log_{1/\\tau}\\tfrac{\\bar\\alpha L}{2(1-r)}\\Big)",
    ], cn));
    this.fCount.set({ opacity: (cn > 0 ? 1 : 0) * (1 - c.p(23, 0.5)) });
    this.fCor.set({ opacity: c.p(23, 0.6) * (1 - c.p(26, 0.6)) });
    const ini = Tex.count(t, [c.s(27), c.s(29), c.s(30), c.s(31)]);
    this.fInit.setContent(Tex.rows([
      `f\\ \\to\\ ${Tex.color(Palette.purple, "8f+3")}:\\ \\ \\text{same iterates}`,
      "\\bar\\alpha_0=\\dfrac{\\ell_0}{\\|\\operatorname{grad}f(x_0)\\|}",
      "\\bar\\alpha_k=\\dfrac{2\\,(f(x_{k-1})-f(x_k))}{\\|\\operatorname{grad}f(x_k)\\|^2}",
      "\\times\\tfrac1\\tau,\\ \\ \\text{floored away from } 0",
    ], ini));
    this.fInit.set({ opacity: (ini > 0 ? 1 : 0) * (1 - c.p(32, 0.6)) });

    // ---- counterexamples on ½x² (s32–s36)
    const qO = c.p(32, 0.6) * (1 - c.p(37, 0.6));
    this.qPlot.setOpacity(qO);
    this.qPlot.plot(this.qCurve, (x) => 0.5 * x * x, -1.2, 1.2, 100);
    this.qCurve.setOpacity(qO);
    // s32–s33: steps 1/(k+2)² from x = 1 stall at ½; s35: r = 0 accepts α = 2, x ↦ −x
    const stall: number[] = [1];
    for (let k = 0; k < 9; k++) stall.push(stall[k] * (1 - 1 / ((k + 2) * (k + 2))));
    const bounce = [0.9, -0.9, 0.9, -0.9];
    const inStall = t < c.s(34);
    const nStall = 1 + Math.floor(c.over(32, 0.1, 0.9) * 9 + 1e-9);
    const nBounce = 1 + Math.floor(c.over(35, 0.3, 0.95) * 3 + 1e-9);
    this.qMarks.forEach((m, i) => {
      const xs = inStall ? stall[i] : i < bounce.length ? bounce[i] : 0;
      const on = inStall ? (i < nStall ? 1 : 0) : t >= c.s(35) && t < c.s(36) && i < nBounce ? 1 : 0;
      const q = this.qPlot.px(xs, 0.5 * xs * xs);
      m.setColor(inStall ? Palette.orange : Palette.red);
      m.set(q.x, q.y, qO * on * (inStall ? 0.35 + 0.65 * (i + 1) / Math.max(1, nStall) : 1));
    });
    const bad = Tex.count(t, [c.s(32), c.s(33), c.s(34), c.s(35), c.s(36)]);
    this.fBad.setContent(Tex.rows([
      `\\bar\\alpha_k=\\tfrac1{(k+2)^2}\\to0:\\ \\ \\text{Armijo passes}\\ ${Tex.color(Palette.green, "\\checkmark")}`,
      `x_k\\to\\prod_{n\\ge2}\\big(1-\\tfrac1{n^2}\\big)=\\tfrac12\\ \\ ${Tex.color(Palette.red, "\\text{stalls}")}`,
      `r\\ge1:\\ \\ x^2(\\alpha-\\tfrac{\\alpha^2}2)\\ge r\\alpha x^2\\iff\\alpha\\le2(1-r)\\le0\\ \\ ${Tex.color(Palette.red, "\\text{never stops}")}`,
      `r=0:\\ \\ \\alpha=2,\\ x\\mapsto-x\\ \\ ${Tex.color(Palette.red, "\\text{no decrease}")}`,
      `\\tau=1:\\ \\ \\alpha\\ \\text{never shrinks}\\ \\ ${Tex.color(Palette.red, "\\text{never stops}")}`,
    ], bad));
    this.fBad.set({ opacity: (bad > 0 ? 1 : 0) * (1 - c.p(37, 0.6)) });

    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
