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
import { MiniPlot } from "../e06-gradient-retraction/lib/MiniPlot";
import { setOrbitView } from "../e06-gradient-retraction/lib/SphereCamera";
import type { SvgPath } from "../e06-gradient-retraction/lib/SvgOverlay";
import { SvgOverlay } from "../e06-gradient-retraction/lib/SvgOverlay";
import { RayleighSphere } from "./lib/RayleighSphere";
import { applyA, lift, rayleigh, rayleighGrad, retract, spherePoint, tangentFrame } from "./lib/rayleigh";
import { Tex } from "./lib/tex";

/**
 * E07 c09 — numerically checking a gradient (Boumal §4.8, (4.38), Ex. 4.34, Fig. 4.1): E(t) on the line-search plot,
 * its log–log curve for the correct gradient (slope 2), a sign error (slope 1), the unreliable ends, the book's
 * Stiefel example shown on St(3, 1) = S² with f = −½xᵀAx, and the unprojected gradient Ax that passes the slope test but
 * fails the tangency check. All curves are computed in double precision.
 * Sentence indices refer to content/episodes/e07-gradient-descent/story.en.json, scene c09-checking-gradients.
 */

const X = spherePoint(50, 35);
const CX = 680;
const LOG_T = { min: -8, max: 0 };

/** log10 E(t) at t = 10^lt for the cost `fn`, retraction R_x, unit tangent v and a candidate gradient g. */
function logError(fn: (p: THREE.Vector3) => number, v: THREE.Vector3, g: THREE.Vector3, lt: number): number {
  const t = 10 ** lt;
  const e = Math.abs(fn(retract(X, v.clone().multiplyScalar(t))) - fn(X) - t * g.dot(v));
  return Math.log10(Math.max(e, 1e-18));
}

export class CheckingGradientsScene implements Scene {
  readonly id = "c09-checking-gradients";
  private stage!: StageLayer;
  private v = new THREE.Vector3();

  private sphere!: RayleighSphere;
  private xDot!: Dot;
  private vArrow!: Arrow;
  private curve!: Polyline;
  private ax!: Arrow;

  private svg!: SvgOverlay;
  private gPlot!: MiniPlot;
  private gCurve!: SvgPath;
  private gLine!: SvgPath;
  private gGap!: SvgPath;
  private lPlot!: MiniPlot;
  private lGood!: SvgPath;
  private lBad!: SvgPath;
  private lRef2!: SvgPath;
  private lRef1!: SvgPath;
  private shadeL!: SvgPath;
  private shadeR!: SvgPath;
  private stPlots: MiniPlot[] = [];
  private stCurves: SvgPath[] = [];
  private stRefs: SvgPath[] = [];

  private fTaylor!: FormulaHandle;
  private fProc!: FormulaHandle;
  private fWrong!: FormulaHandle;
  private fRead!: FormulaHandle;
  private fStiefel!: FormulaHandle;
  private fTan!: FormulaHandle;
  private stLabels: FormulaHandle[] = [];

  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);
    const { east, north } = tangentFrame(X);
    this.v = east.clone().multiplyScalar(0.6).addScaledVector(north, -0.8).normalize();

    this.sphere = new RayleighSphere(stage);
    this.xDot = new Dot(stage, lift(X, 1.01), Palette.orange, 0.03, "3d");
    this.vArrow = new Arrow(stage, X, X.clone().addScaledVector(this.v, 0.4), Palette.teal, { mode: "3d", width: 5, headLength: 0.08 });
    this.curve = new Polyline(stage, sampleCurve((s) => lift(retract(X, this.v.clone().multiplyScalar(s))), 0, 0.8, 60), { color: "#ffffff", width: 3 });
    this.ax = new Arrow(stage, X, X.clone().addScaledVector(applyA(X), 0.3), Palette.red, { mode: "3d", width: 5, headLength: 0.08 });

    this.svg = new SvgOverlay(fl);
    const fx = rayleigh(X);
    this.gPlot = new MiniPlot(this.svg, fl, { x: 800, y: 430, w: 480, h: 260, xMin: 0, xMax: 0.8, yMin: fx - 0.9, yMax: fx + 0.5, xLabel: "t", yLabel: "f(R_x(tv))" });
    this.gGap = this.gPlot.curve({ color: Palette.red, width: 4 });
    this.gLine = this.gPlot.curve({ color: Palette.yellow, width: 2.5, dash: "8 6" });
    this.gCurve = this.gPlot.curve({ color: "#ffffff", width: 3.5 });
    this.lPlot = new MiniPlot(this.svg, fl, { x: 800, y: 420, w: 480, h: 290, xMin: LOG_T.min, xMax: LOG_T.max, yMin: -17, yMax: 0.5,
      xLabel: "\\log_{10}t", yLabel: "\\log_{10}E(t)" });
    this.shadeL = this.svg.path({ color: "none", width: 0, fill: "rgba(154,164,191,0.16)" });
    this.shadeR = this.svg.path({ color: "none", width: 0, fill: "rgba(154,164,191,0.16)" });
    this.lRef2 = this.lPlot.curve({ color: Palette.muted, width: 2, dash: "8 6" });
    this.lRef1 = this.lPlot.curve({ color: Palette.red, width: 2, dash: "4 6" });
    this.lGood = this.lPlot.curve({ color: Palette.green, width: 3.5 });
    this.lBad = this.lPlot.curve({ color: Palette.red, width: 3.5 });
    for (let i = 0; i < 2; i++) {
      const pl = new MiniPlot(this.svg, fl, { x: 200 + 560 * i, y: 430, w: 420, h: 250, xMin: LOG_T.min, xMax: LOG_T.max, yMin: -17, yMax: 0.5,
        xLabel: "\\log_{10}t", yLabel: "\\log_{10}E(t)" });
      this.stPlots.push(pl);
      this.stRefs.push(pl.curve({ color: Palette.muted, width: 2, dash: "8 6" }));
      this.stCurves.push(pl.curve({ color: i === 0 ? Palette.red : Palette.green, width: 3.5 }));
      this.stLabels.push(fl.add({ text: i === 0 ? "wrong gradient (sign)" : "correct gradient", x: 410 + 560 * i, y: 750, size: 26, color: i === 0 ? Palette.red : Palette.green }));
    }

    this.fTaylor = fl.add({ tex: "", x: CX, y: 150, size: 30, display: true });
    this.fProc = fl.add({ tex: "", x: 400, y: 540, size: 26, display: true });
    this.fWrong = fl.add({ tex: "", x: 400, y: 540, size: 26, display: true });
    this.fRead = fl.add({ tex: "", x: 1040, y: 780, size: 26 });
    this.fStiefel = fl.add({ tex: "", x: CX, y: 150, size: 28, display: true });
    this.fTan = fl.add({ tex: "", x: 1020, y: 470, size: 32, display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "E(t)=O(t^2)\\ \\Rightarrow\\ \\text{slope 2}", at: cue.e(5) },
      { label: "2", tex: "\\text{wrong } g:\\ E(t)\\approx Ct,\\ \\text{slope 1}", at: cue.e(11) },
      { label: "3", tex: "\\text{first: }\\operatorname{grad}f(x)\\in T_xM", at: cue.e(25) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    setOrbitView(this.stage, { azDeg: 25, elDeg: 28, distance: 5.4, fovDeg: 34, center: new THREE.Vector3(0, 0, 0.2), shift: 1.45, lift: 0.05 });
    const g = rayleighGrad(X);
    const fx = rayleigh(X);
    const gv = g.dot(this.v);

    // ---- sphere and the E(t) gap (s0–s5), tangency (s20–s25)
    const sO = c.p(0, 0.8, -0.8) * (1 - c.p(6, 0.6)) + c.p(20, 0.6) * (1 - c.p(25, 0.6, 1.0));
    this.sphere.setOpacity(sO, 1, 0);
    this.xDot.setOpacity(sO);
    this.vArrow.setOpacity(sO * (t < c.s(6) ? c.p(1, 0.5) : 1));
    this.curve.setOpacity(sO * (t < c.s(6) ? c.p(1, 0.5) : 0));
    this.ax.setOpacity(c.p(21, 0.5) * (1 - c.p(25, 0.6, 1.0)));
    const tq = Tex.count(t, [c.s(1), c.s(3), c.s(4), c.s(5)]);
    this.fTaylor.setContent(Tex.rows([
      "f(R_x(tv))=f(x)+t\\langle\\operatorname{grad}f(x),v\\rangle_x+O(t^2)",
      "E(t)=\\big|f(R_x(tv))-f(x)-t\\langle\\operatorname{grad}f(x),v\\rangle_x\\big|",
      `${Tex.color(Palette.green, "\\text{correct gradient: } E(t)=O(t^2)")}`,
      "\\log E(t)\\approx2\\log t+\\text{const}",
    ], tq));
    this.fTaylor.set({ opacity: (tq > 0 ? 1 : 0) * (1 - c.p(16, 0.5)) });
    const gO = c.p(2, 0.6) * (1 - c.p(6, 0.6));
    this.gPlot.setOpacity(gO);
    this.gPlot.plot(this.gCurve, (s) => rayleigh(retract(X, this.v.clone().multiplyScalar(s))), 0, 0.8, 100);
    this.gCurve.setOpacity(gO);
    this.gPlot.plot(this.gLine, (s) => fx + s * gv, 0, 0.8, 2);
    this.gLine.setOpacity(gO);
    const ts = 0.6 - 0.45 * c.over(4, 0.1, 0.9);
    const a = this.gPlot.px(ts, rayleigh(retract(X, this.v.clone().multiplyScalar(ts))));
    const b = this.gPlot.px(ts, fx + ts * gv);
    this.gGap.setPoints([a, b]);
    this.gGap.setOpacity(gO * c.p(3, 0.5));

    // ---- log–log plot (s6–s15)
    const lO = c.p(8, 0.6) * (1 - c.p(16, 0.6));
    this.lPlot.setOpacity(lO);
    const sweep = LOG_T.max - (LOG_T.max - LOG_T.min) * c.over(8, 0.05, 0.95);
    const good: { x: number; y: number }[] = [];
    const bad: { x: number; y: number }[] = [];
    const wrong = g.clone().multiplyScalar(-1);
    for (let i = 0; i <= 160; i++) {
      const lt = LOG_T.max - ((LOG_T.max - LOG_T.min) * i) / 160;
      if (lt < sweep) break;
      good.push(this.lPlot.px(lt, logError(rayleigh, this.v, g, lt)));
      bad.push(this.lPlot.px(lt, logError(rayleigh, this.v, wrong, lt)));
    }
    this.lGood.setPoints(good);
    this.lGood.setOpacity(lO);
    this.lBad.setPoints(bad);
    this.lBad.setOpacity(lO * c.p(10, 0.5));
    this.lPlot.plot(this.lRef2, (lt) => 2 * lt - 0.8, -7, 0, 2);
    this.lRef2.setOpacity(lO * c.p(9, 0.5));
    this.lPlot.plot(this.lRef1, (lt) => lt - 0.1, -8, 0, 2);
    this.lRef1.setOpacity(lO * c.p(11, 0.5));
    const p0 = this.lPlot.px(LOG_T.min, -17);
    const p1 = this.lPlot.px(-6, 0.5);
    const q0 = this.lPlot.px(-1, -17);
    const q1 = this.lPlot.px(LOG_T.max, 0.5);
    this.shadeL.setPoints([{ x: p0.x, y: p0.y }, { x: p1.x, y: p0.y }, { x: p1.x, y: p1.y }, { x: p0.x, y: p1.y }], true);
    this.shadeR.setPoints([{ x: q0.x, y: q0.y }, { x: q1.x, y: q0.y }, { x: q1.x, y: q1.y }, { x: q0.x, y: q1.y }], true);
    this.shadeL.setOpacity(lO * c.p(13, 0.5));
    this.shadeR.setOpacity(lO * c.p(12, 0.5));
    this.fRead.setContent(`${Tex.color(Palette.green, "\\text{correct: slope }2")}\\qquad ${Tex.color(Palette.red, "\\text{wrong sign: slope }1")}`);
    this.fRead.set({ opacity: lO * c.p(9, 0.5) });
    const pr = Tex.count(t, [c.s(6), c.s(7), c.s(8)]);
    this.fProc.setContent(Tex.rows([
      "\\text{random } x,\\ \\text{unit } v\\in T_xM",
      "f(x),\\ \\operatorname{grad}f(x),\\ \\langle\\operatorname{grad}f(x),v\\rangle",
      "t\\in[10^{-8},1]\\ \\text{log-spaced: slope 2?}",
    ], pr));
    this.fProc.set({ opacity: (pr > 0 ? 1 : 0) * (1 - c.p(10, 0.5)) });
    const wn = Tex.count(t, [c.s(10), c.s(11), c.s(12), c.s(13), c.s(14), c.s(15)]);
    this.fWrong.setContent(Tex.rows([
      "E(t)=\\big|t\\langle\\operatorname{grad}f-g,v\\rangle+O(t^2)\\big|",
      `\\text{small } t:\\ E(t)\\approx Ct\\ \\Rightarrow\\ ${Tex.color(Palette.red, "\\text{slope 1}")}`,
      "\\text{large } t:\\ \\text{Taylor poor}",
      "\\text{tiny } t:\\ \\text{floating point}",
      "\\text{no slope 2 over 1--2 decades}\\Rightarrow\\text{bug}",
      "\\text{gradient, cost, retraction, or inner product}",
    ], wn));
    this.fWrong.set({ opacity: (wn > 0 ? 1 : 0) * (1 - c.p(16, 0.5)) });

    // ---- the book's example (s16–s19) on St(3,1) = S² with f = −½xᵀAx
    const stO = c.p(16, 0.6) * (1 - c.p(20, 0.6));
    const fNeg = (p: THREE.Vector3): number => -rayleigh(p);
    const gNeg = g.clone().multiplyScalar(-1);
    this.stPlots.forEach((pl, i) => {
      const o = stO * (i === 0 ? c.p(17, 0.5) : c.p(18, 0.5));
      pl.setOpacity(o);
      pl.plot(this.stCurves[i], (lt) => logError(fNeg, this.v, i === 0 ? g : gNeg, lt), LOG_T.min, LOG_T.max, 160);
      this.stCurves[i].setOpacity(o);
      pl.plot(this.stRefs[i], (lt) => 2 * lt - 0.8, -7, 0, 2);
      this.stRefs[i].setOpacity(o);
      this.stLabels[i].set({ opacity: o });
    });
    const sn = Tex.count(t, [c.s(16), c.s(17), c.s(18), c.s(19)]);
    this.fStiefel.setContent(Tex.rows([
      `f(X)=-\\tfrac12\\mathrm{Tr}(X^\\top AX)\\ \\text{on } \\mathrm{St}(n,p)\\quad ${Tex.color(Palette.muted, "\\text{(shown: } \\mathrm{St}(3,1)=S^2)")}`,
      `\\operatorname{grad}f(X)=\\mathrm{Proj}_X(-AX);\\ \\ ${Tex.color(Palette.red, "\\text{forgot the minus: slope 1}")}`,
      `${Tex.color(Palette.green, "\\text{fixed: slope 2}")}\\qquad\\texttt{checkgradient}`,
      `${Tex.color(Palette.muted, "\\text{remainder } O(t^k),\\ k>2:\\ \\text{slope } k\\ (\\text{rare})")}`,
    ], sn));
    this.fStiefel.set({ opacity: (sn > 0 ? 1 : 0) * (1 - c.p(20, 0.5)) });

    // ---- tangency (s20–s25)
    const ax = applyA(X);
    const tn = Tex.count(t, [c.s(21), c.s(22), c.s(23), c.s(24), c.s(25)]);
    const passes = logError(rayleigh, this.v, ax, -3) - logError(rayleigh, this.v, ax, -2);
    this.fTan.setContent(Tex.rows([
      `\\text{return } ${Tex.color(Palette.red, "Ax")}\\ \\text{(no projection)}`,
      "v\\in T_xM:\\ \\langle Ax,v\\rangle=\\langle(I-xx^\\top)Ax,v\\rangle",
      `\\text{slope test: } ${(-passes).toFixed(2)}\\ \\ ${Tex.color(Palette.green, "\\checkmark")}`,
      `x^\\top(Ax)=2f(x)=${(2 * fx).toFixed(3)}\\neq0\\ \\ ${Tex.color(Palette.red, "\\times")}`,
      `${Tex.color(Palette.yellow, "\\text{tangency first, then slope}")}`,
    ], tn));
    this.fTan.set({ opacity: tn > 0 ? 1 : 0 });

    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
