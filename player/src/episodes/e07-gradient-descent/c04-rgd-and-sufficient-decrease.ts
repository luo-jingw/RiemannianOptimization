import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { MiniPlot } from "../e06-gradient-retraction/lib/MiniPlot";
import { setOrbitView } from "../e06-gradient-retraction/lib/SphereCamera";
import type { SvgDot, SvgPath } from "../e06-gradient-retraction/lib/SvgOverlay";
import { SvgOverlay } from "../e06-gradient-retraction/lib/SvgOverlay";
import { RayleighSphere } from "./lib/RayleighSphere";
import { F_MIN, L_RAYLEIGH, lift, lineSearch, rayleigh, rayleighGrad, rgdFixed, spherePoint } from "./lib/rayleigh";
import { Tex } from "./lib/tex";

/**
 * E07 c04 — RGD and sufficient decrease (Boumal §4.3, Alg. 4.1, (4.6)–(4.7), A4.1–A4.2, Prop. 4.7): the algorithm, the
 * line-search function, the telescoping sum as stacked decrease bars, the 1/√K bound against the measured gradients
 * (step 1/3, c = 1/(2L)), what the proposition does not say, and the counterexamples −x, ½x² with steps 1/(k+2)²,
 * and e^{−x}.
 * Sentence indices refer to content/episodes/e07-gradient-descent/story.en.json, scene c04-rgd-and-sufficient-decrease.
 */

const X0 = spherePoint(62, 25);
const STEP = 1 / 3;
const C_DEC = 1 / (2 * L_RAYLEIGH);
const K_BARS = 10;
const K_LOG = 30;
const CX = 680;

export class RgdSufficientDecreaseScene implements Scene {
  readonly id = "c04-rgd-and-sufficient-decrease";
  private stage!: StageLayer;

  private sphere!: RayleighSphere;
  private iterates: THREE.Vector3[] = [];
  private path!: Polyline;
  private dots: Dot[] = [];

  private svg!: SvgOverlay;
  private gPlot!: MiniPlot;
  private gCurve!: SvgPath;
  private bars: SvgPath[] = [];
  private inner: SvgPath[] = [];
  private stack: SvgPath[] = [];
  private totalLine!: SvgPath;
  private logPlot!: MiniPlot;
  private logMeasured!: SvgPath;
  private logBound!: SvgPath;
  private onePlots: MiniPlot[] = [];
  private oneCurves: SvgPath[] = [];
  private oneDots: SvgDot[] = [];

  private fAlgo!: FormulaHandle;
  private fStrat!: FormulaHandle;
  private fProp!: FormulaHandle;
  private fProof!: FormulaHandle;
  private fNot!: FormulaHandle;
  private fCounter!: FormulaHandle;
  private fRead!: FormulaHandle;
  private fAssume!: FormulaHandle;
  private barLabels: FormulaHandle[] = [];

  private ledger!: ProofLedger;
  private decreases: number[] = [];
  private grads: number[] = [];

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    this.sphere = new RayleighSphere(stage);
    this.iterates = rgdFixed(X0, K_LOG, STEP);
    this.path = new Polyline(stage, this.iterates.map((p) => lift(p, 1.012)), { color: Palette.orange, width: 3.5 });
    this.iterates.slice(0, 16).forEach((p) => this.dots.push(new Dot(stage, lift(p, 1.014), Palette.orange, 0.022, "3d")));
    for (let k = 0; k < K_LOG; k++) {
      this.decreases.push(rayleigh(this.iterates[k]) - rayleigh(this.iterates[k + 1]));
      this.grads.push(rayleighGrad(this.iterates[k]).length());
    }

    this.svg = new SvgOverlay(fl);
    this.gPlot = new MiniPlot(this.svg, fl, { x: 820, y: 440, w: 460, h: 240, xMin: 0, xMax: 1.2, yMin: 0.4, yMax: 1.6,
      xLabel: "t", yLabel: "g(t)=f(R_{x_k}(-t\\operatorname{grad}f(x_k)))" });
    this.gCurve = this.gPlot.curve({ color: "#ffffff", width: 3.5 });
    for (let k = 0; k < K_BARS; k++) {
      this.bars.push(this.svg.path({ color: Palette.orange, width: 1.5, fill: "rgba(255,169,77,0.35)" }));
      this.inner.push(this.svg.path({ color: Palette.green, width: 1.5, fill: "rgba(105,219,124,0.55)" }));
      this.stack.push(this.svg.path({ color: Palette.orange, width: 1.5, fill: "rgba(255,169,77,0.35)" }));
    }
    this.totalLine = this.svg.path({ color: Palette.red, width: 2.5, dash: "8 6" });
    this.barLabels.push(fl.add({ tex: "f(x_k)-f(x_{k+1})", x: 520, y: 800, size: 24, color: Palette.orange }));
    this.barLabels.push(fl.add({ tex: "\\ge c\\|\\operatorname{grad}f(x_k)\\|^2", x: 520, y: 832, size: 24, color: Palette.green }));
    this.barLabels.push(fl.add({ tex: "f(x_0)-f_{\\mathrm{low}}", x: 1110, y: 300, size: 24, color: Palette.red }));
    this.logPlot = new MiniPlot(this.svg, fl, { x: 800, y: 430, w: 480, h: 260, xMin: 0, xMax: K_LOG, yMin: -9, yMax: 1,
      xLabel: "k", yLabel: "\\log_{10}\\min_{j\\le k}\\|\\operatorname{grad}f(x_j)\\|" });
    this.logBound = this.logPlot.curve({ color: Palette.red, width: 2.5, dash: "8 6" });
    this.logMeasured = this.logPlot.curve({ color: Palette.orange, width: 3.5 });
    const box = { x: 760, y: 430, w: 520, h: 260, xLabel: "x" };
    this.onePlots = [
      new MiniPlot(this.svg, fl, { ...box, xMin: -1, xMax: 9, yMin: -9, yMax: 1.5, yLabel: "f(x)=-x" }),
      new MiniPlot(this.svg, fl, { ...box, xMin: -0.2, xMax: 1.2, yMin: 0, yMax: 0.6, yLabel: "f(x)=\\tfrac12x^2" }),
      new MiniPlot(this.svg, fl, { ...box, xMin: -0.5, xMax: 3.5, yMin: 0, yMax: 1.4, yLabel: "f(x)=e^{-x}" }),
    ];
    this.oneCurves = this.onePlots.map((pl) => pl.curve({ color: "#ffffff", width: 3 }));
    for (let i = 0; i < 9; i++) this.oneDots.push(this.svg.dot(Palette.orange, 7));

    this.fAlgo = fl.add({ tex: "\\begin{aligned}&\\textbf{RGD}\\ \\ (x_0\\in M,\\ \\text{retraction } R)\\\\ &\\textbf{for } k=0,1,2,\\ldots\\\\ &\\quad\\text{pick } \\alpha_k>0,\\ \\ s_k=-\\alpha_k\\operatorname{grad}f(x_k)\\\\ &\\quad x_{k+1}=R_{x_k}(s_k)\\end{aligned}",
      x: CX, y: 210, size: 28, display: true, boxed: true });
    this.fStrat = fl.add({ tex: "\\text{fixed}\\ \\ \\cdot\\ \\ \\text{exact } \\arg\\min g\\ \\ \\cdot\\ \\ \\text{backtracking (ch. 6)}", x: 1050, y: 780, size: 26, color: Palette.muted });
    this.fProp = fl.add({ tex: "\\begin{gathered}\\textbf{Prop 4.7}\\ \\ \\text{A4.1, A4.2}\\ \\Rightarrow\\ \\|\\operatorname{grad}f(x_k)\\|\\to0,\\ \\text{accumulation points critical}\\\\ \\min_{k<K}\\|\\operatorname{grad}f(x_k)\\|\\ \\le\\ \\sqrt{\\dfrac{f(x_0)-f_{\\mathrm{low}}}{c}}\\ \\dfrac{1}{\\sqrt K}\\end{gathered}",
      x: CX, y: 175, size: 28, display: true, boxed: true });
    this.fProof = fl.add({ tex: "", x: CX, y: 210, size: 28, display: true });
    this.fNot = fl.add({ tex: "", x: CX, y: 420, size: 32, display: true });
    this.fCounter = fl.add({ tex: "", x: 400, y: 520, size: 28, display: true });
    this.fRead = fl.add({ tex: "", x: 1020, y: 780, size: 26 });
    this.fAssume = fl.add({ tex: "", x: CX, y: 420, size: 36, display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "A1", tex: "f(x)\\ge f_{\\mathrm{low}}", at: cue.e(6) },
      { label: "A2", tex: "f(x_k)-f(x_{k+1})\\ge c\\|\\operatorname{grad}f(x_k)\\|^2", at: cue.e(8) },
      { label: "1", tex: "\\min_{k<K}\\|\\operatorname{grad}f\\|\\le\\sqrt{(f_0-f_{\\mathrm{low}})/c}\\,/\\sqrt K", at: cue.e(16) },
      { label: "2", tex: "\\|\\operatorname{grad}f(x_k)\\|\\to0;\\ \\text{acc. points critical}", at: cue.e(20) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    setOrbitView(this.stage, { azDeg: 22, elDeg: 34, distance: 5.8, fovDeg: 34, center: new THREE.Vector3(0, 0, 0.15), shift: 1.75, lift: 0.25 });

    // ---- the algorithm on the sphere (s0–s5)
    const sphereO = c.p(0, 0.8, -0.8) * (1 - c.p(6, 0.6));
    this.sphere.setOpacity(sphereO, 1, sphereO);
    const shown = Math.min(16, 1 + Math.floor(c.over(1, 0.1, 1) * 8 + c.over(2, 0, 1) * 7 + 1e-9));
    this.path.setPoints(this.iterates.slice(0, Math.max(2, shown)).map((p) => lift(p, 1.012)));
    this.path.setOpacity(shown >= 2 ? sphereO : 0);
    this.dots.forEach((d, k) => d.setOpacity(k < shown ? sphereO : 0));
    this.fAlgo.set({ opacity: c.p(0, 0.6) * (1 - c.p(6, 0.6)) });
    const gO = c.p(3, 0.6) * (1 - c.p(6, 0.6));
    this.gPlot.setOpacity(gO);
    this.gPlot.plot(this.gCurve, (a) => lineSearch(X0, a), 0, 1.2, 120);
    this.gCurve.setOpacity(gO);
    this.fStrat.set({ opacity: c.p(5, 0.6) * (1 - c.p(6, 0.6)) });

    const as = Tex.count(t, [c.s(6), c.s(7), c.s(9)]);
    this.fAssume.setContent(Tex.rows([
      "\\textbf{A4.1}\\ \\ f(x)\\ge f_{\\mathrm{low}}\\ \\ \\forall x\\in M",
      "\\textbf{A4.2}\\ \\ f(x_k)-f(x_{k+1})\\ \\ge\\ c\\,\\|\\operatorname{grad}f(x_k)\\|^2,\\ \\ c>0",
      `${Tex.color(Palette.muted, "\\text{A4.2: the line search's job (chapters 5, 6)}")}`,
    ], as));
    this.fAssume.set({ opacity: (as > 0 ? 1 : 0) * (1 - c.p(10, 0.5)) });

    // ---- proposition (s10–s11), telescoping bars (s12–s18)
    this.fProp.set({ opacity: c.p(10, 0.6) * (1 - c.p(12, 0.6)) });
    const barO = c.p(12, 0.6) * (1 - c.p(19, 0.6));
    const scale = 560;                 // px per unit of f
    const baseY = 770;
    const total = rayleigh(X0) - F_MIN;
    let acc = 0;
    for (let k = 0; k < K_BARS; k++) {
      const h = this.decreases[k] * scale;
      const hi = C_DEC * this.grads[k] ** 2 * scale;
      const x = 140 + 70 * k;
      const appear = c.p(12, 0.3, 0.25 * k);
      this.bars[k].setPoints([{ x, y: baseY }, { x: x + 46, y: baseY }, { x: x + 46, y: baseY - h }, { x, y: baseY - h }], true);
      this.bars[k].setOpacity(barO * appear);
      this.inner[k].setPoints([{ x: x + 6, y: baseY }, { x: x + 40, y: baseY }, { x: x + 40, y: baseY - hi }, { x: x + 6, y: baseY - hi }], true);
      this.inner[k].setOpacity(barO * c.p(14, 0.4, 0.15 * k));
      const sx = 1060;
      const stackIn = c.p(13, 0.4, 0.25 * k);
      this.stack[k].setPoints([{ x: sx, y: baseY - acc * scale }, { x: sx + 90, y: baseY - acc * scale }, { x: sx + 90, y: baseY - (acc + this.decreases[k]) * scale }, { x: sx, y: baseY - (acc + this.decreases[k]) * scale }], true);
      this.stack[k].setOpacity(barO * stackIn);
      acc += this.decreases[k];
    }
    this.totalLine.setPoints([{ x: 1030, y: baseY - total * scale }, { x: 1180, y: baseY - total * scale }]);
    this.totalLine.setOpacity(barO * c.p(13, 0.5));
    this.barLabels[0].set({ opacity: barO });
    this.barLabels[1].set({ opacity: barO * c.p(14, 0.5) });
    this.barLabels[2].set({ y: baseY - total * scale - 26, opacity: barO * c.p(13, 0.5) });
    const pr = Tex.count(t, [c.s(13), c.s(14), c.s(15), c.s(16), c.s(17), c.s(18), c.s(19), c.s(20)]);
    const n2 = "\\|\\operatorname{grad}f(x_k)\\|^2";
    this.fProof.setContent(Tex.rows([
      "f(x_0)-f_{\\mathrm{low}}\\ \\overset{\\text{A1}}{\\ge}\\ f(x_0)-f(x_K)=\\sum_{k<K}\\big(f(x_k)-f(x_{k+1})\\big)",
      `\\overset{\\text{A2}}{\\ge}\\ \\sum_{k<K}c\\,${n2}`,
      `\\ge\\ K\\,c\\,\\min_{k<K}${n2}`,
      `\\Rightarrow\\ ${Tex.color(Palette.yellow, "\\min_{k<K}\\|\\operatorname{grad}f(x_k)\\|\\le\\sqrt{(f(x_0)-f_{\\mathrm{low}})/c}\\ /\\sqrt K")}`,
      "\\textstyle\\sum_k (f(x_k)-f(x_{k+1}))\\le f(x_0)-f_{\\mathrm{low}}<\\infty",
      `\\Rightarrow\\ f(x_k)-f(x_{k+1})\\to0\\ \\Rightarrow\\ ${Tex.color(Palette.yellow, "\\|\\operatorname{grad}f(x_k)\\|\\to0")}`,
      "x_{k_j}\\to x,\\ \\ \\|\\operatorname{grad}f(\\cdot)\\|\\ \\text{continuous}",
      `\\Rightarrow\\ \\|\\operatorname{grad}f(x)\\|=\\lim_j\\|\\operatorname{grad}f(x_{k_j})\\|=0\\ \\ ${Tex.color(Palette.green, "\\text{critical}")}`,
    ], pr));
    this.fProof.set({ opacity: (pr > 0 ? 1 : 0) * (1 - c.p(21, 0.5)) });

    // ---- measured vs bound (s21–s22)
    const logO = c.p(21, 0.6) * (1 - c.p(23, 0.6));
    this.logPlot.setOpacity(logO);
    const g0 = Math.sqrt((rayleigh(X0) - F_MIN) / C_DEC);
    this.logPlot.plot(this.logBound, (k) => Math.log10(g0 / Math.sqrt(k + 1)), 0, K_LOG, 60);
    this.logBound.setOpacity(logO);
    const mins: { x: number; y: number }[] = [];
    let m = Infinity;
    const upto = Math.floor(c.over(21, 0.05, 0.9) * (K_LOG - 1));
    for (let k = 0; k <= upto; k++) {
      m = Math.min(m, this.grads[k]);
      mins.push(this.logPlot.px(k, Math.max(-9, Math.log10(m))));
    }
    this.logMeasured.setPoints(mins);
    this.logMeasured.setOpacity(logO);
    this.fRead.setContent(`${Tex.color(Palette.red, "\\text{bound } \\propto 1/\\sqrt{k}")}\\qquad ${Tex.color(Palette.orange, "\\text{measured, step } 1/3")}`);
    this.fRead.set({ opacity: logO });

    // ---- what it does not say (s23–s25)
    const nn = Tex.count(t, [c.s(23), c.s(24), c.s(25)]);
    this.fNot.setContent(Tex.rows([
      `\\text{any } x_0\\ ${Tex.color(Palette.green, "\\checkmark")}`,
      `x_k\\ \\text{converges?}\\ ${Tex.color(Palette.red, "\\times")}\\qquad \\text{to a minimizer?}\\ ${Tex.color(Palette.red, "\\times")}`,
      `\\text{accumulation points (if any) are critical}\\ ${Tex.color(Palette.green, "\\checkmark")}`,
    ], nn));
    this.fNot.set({ opacity: (nn > 0 ? 1 : 0) * (1 - c.p(26, 0.5)) });

    // ---- counterexamples (s26–s34)
    const cO = c.p(26, 0.6) * (1 - c.p(35, 0.6));
    const which = t < c.s(29) ? 0 : t < c.s(32) ? 1 : 2;
    const plot = this.onePlots[which];
    this.onePlots.forEach((pl, i) => pl.setOpacity(i === which ? cO : 0));
    this.oneCurves.forEach((cv, i) => cv.setOpacity(i === which ? cO : 0));
    let fn: (x: number) => number = (x) => -x;
    let xs: number[] = [];
    let readout = "";
    if (t < c.s(29)) {
      fn = (x) => -x;
      for (let k = 0; k < 9; k++) xs.push(k);
      const kk = Math.min(8, Math.floor(c.over(26, 0.1, 1) * 4 + c.over(27, 0, 1) * 4));
      readout = `f(x)=-x:\\ \\ x_k=${kk},\\ \\ f(x_k)=${-kk},\\ \\ \\operatorname{grad}=-1`;
      xs = xs.slice(0, kk + 1);
    } else if (t < c.s(32)) {
      fn = (x) => 0.5 * x * x;
      let x = 1;
      xs.push(x);
      for (let k = 0; k < 8; k++) {
        x *= 1 - 1 / ((k + 2) * (k + 2));
        xs.push(x);
      }
      const kk = Math.min(8, Math.floor(c.over(29, 0.2, 1) * 4 + c.over(30, 0, 1) * 4));
      xs = xs.slice(0, kk + 1);
      readout = `\\alpha_k=\\tfrac1{(k+2)^2}:\\ \\ x_k\\to\\tfrac12,\\ \\ \\operatorname{grad}f\\to\\tfrac12\\neq0`;
    } else {
      fn = (x) => Math.exp(-x);
      let x = 0;
      xs.push(x);
      for (let k = 0; k < 8; k++) {
        x += Math.exp(-x);
        xs.push(x);
      }
      const kk = Math.min(8, Math.floor(c.over(32, 0.2, 1) * 4 + c.over(33, 0, 1) * 4));
      xs = xs.slice(0, kk + 1);
      readout = `f=e^{-x}:\\ \\ x_k=${xs[xs.length - 1].toFixed(2)},\\ \\ |\\operatorname{grad}f|=${Math.exp(-xs[xs.length - 1]).toFixed(3)}`;
    }
    plot.plot(this.oneCurves[which], fn, plot.spec.xMin, plot.spec.xMax, 160);
    this.oneDots.forEach((d, i) => {
      const xv = i < xs.length ? xs[i] : 0;
      const q = plot.px(xv, fn(xv));
      d.set(q.x, q.y, i < xs.length ? cO * (0.35 + 0.65 * (i + 1) / xs.length) : 0);
    });
    const cn = Tex.count(t, [c.s(26), c.s(29), c.s(32)]);
    this.fCounter.setContent(Tex.rows([
      `${Tex.color(Palette.red, "\\text{no A4.1}")}:\\ f=-x,\\ \\alpha=1`,
      `${Tex.color(Palette.red, "\\text{no A4.2}")}:\\ \\tfrac12x^2,\\ \\alpha_k=\\tfrac1{(k+2)^2}`,
      `${Tex.color(Palette.purple, "\\text{no acc. point}")}:\\ e^{-x},\\ \\alpha=1,\\ c=1-\\tfrac1e`,
    ], cn));
    this.fCounter.set({ opacity: (cn > 0 ? 1 : 0) * (1 - c.p(35, 0.6)) });
    if (t >= c.s(26)) {
      this.fRead.setContent(readout);
      this.fRead.set({ opacity: cO });
    }

    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
