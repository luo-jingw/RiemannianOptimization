import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { lerp } from "../../primitives/Easing";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Polyline, sampleCurve } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { WorldLabel } from "../../primitives/WorldLabel";
import { MiniPlot } from "../e06-gradient-retraction/lib/MiniPlot";
import { setOrbitView } from "../e06-gradient-retraction/lib/SphereCamera";
import type { SvgPath } from "../e06-gradient-retraction/lib/SvgOverlay";
import { SvgOverlay } from "../e06-gradient-retraction/lib/SvgOverlay";
import { RayleighSphere } from "./lib/RayleighSphere";
import { E1, E2, E3, applyA, lift, rayleighGrad, spherePoint, tangentFrame } from "./lib/rayleigh";
import { Tex } from "./lib/tex";

/**
 * E07 c03 — critical points (Boumal §4.2, Def. 4.4, Props. 4.5–4.6): curves through a minimizer, the proof by
 * contradiction, critical ⇔ grad f = 0, the gradient field of the Rayleigh quotient and its six zeros (unit
 * eigenvectors), the saddle e₂, |x| (no derivative), and the metric-independence of critical points.
 * Sentence indices refer to content/episodes/e07-gradient-descent/story.en.json, scene c03-critical-points.
 */

const CX = 680;
const FIELD_N = 9;                // field samples per polar ring

/** Great circle through p with unit tangent direction d (d ⊥ p). */
function circlePoint(p: THREE.Vector3, d: THREE.Vector3, s: number): THREE.Vector3 {
  return p.clone().multiplyScalar(Math.cos(s)).addScaledVector(d, Math.sin(s));
}

export class CriticalPointsScene implements Scene {
  readonly id = "c03-critical-points";
  private stage!: StageLayer;

  private sphere!: RayleighSphere;
  private curves: Polyline[] = [];
  private field: { p: THREE.Vector3; arrow: Arrow }[] = [];
  private saddleUp!: Polyline;
  private saddleDown!: Polyline;
  private e2Label!: WorldLabel;
  private metricPoint!: Dot;
  private gEuc!: Arrow;
  private gMet!: Arrow;

  private svg!: SvgOverlay;
  private cPlot!: MiniPlot;
  private cCurve!: SvgPath;
  private cLevel!: SvgPath;
  private cDelta!: SvgPath;
  private cHood!: SvgPath;
  private vPlot!: MiniPlot;
  private vCurve!: SvgPath;
  private slopeL!: FormulaHandle;
  private slopeR!: FormulaHandle;

  private fDef!: FormulaHandle;
  private fProof!: FormulaHandle;
  private fIff!: FormulaHandle;
  private fRay!: FormulaHandle;
  private fMetric!: FormulaHandle;
  private fGoal!: FormulaHandle;

  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    this.sphere = new RayleighSphere(stage);
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 4;
      const d = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
      this.curves.push(new Polyline(stage, sampleCurve((s) => lift(circlePoint(E3, d, s), 1.01), -0.7, 0.7, 50), { color: Palette.teal, width: 3 }));
    }
    for (let i = 1; i <= 5; i++) {
      const polar = i * 30;
      const n = i === 3 ? FIELD_N + 3 : FIELD_N;
      for (let j = 0; j < n; j++) {
        const p = spherePoint(polar, (360 * j) / n + 10 * i);
        this.field.push({ p, arrow: new Arrow(stage, p, p, "#ffffff", { mode: "3d", width: 3, headLength: 0.05 }) });
      }
    }
    this.saddleUp = new Polyline(stage, sampleCurve((s) => lift(circlePoint(E2, E1, s), 1.012), 0, 0.8, 40), { color: Palette.orange, width: 4 });
    this.saddleDown = new Polyline(stage, sampleCurve((s) => lift(circlePoint(E2, E3, s), 1.012), 0, 0.8, 40), { color: Palette.blue, width: 4 });
    this.e2Label = new WorldLabel(stage, fl, { tex: "e_2", size: 32, color: Palette.purple }, E2, { x: 16, y: 16 });
    this.metricPoint = new Dot(stage, E3, Palette.orange, 0.03, "3d");
    this.gEuc = new Arrow(stage, E3, E3, "#ffffff", { mode: "3d", width: 5, headLength: 0.08 });
    this.gMet = new Arrow(stage, E3, E3, Palette.purple, { mode: "3d", width: 5, headLength: 0.08 });

    this.svg = new SvgOverlay(fl);
    this.cPlot = new MiniPlot(this.svg, fl, { x: 820, y: 420, w: 460, h: 260, xMin: -0.4, xMax: 1, yMin: -0.6, yMax: 0.5, xLabel: "t", yLabel: "f(c(t))" });
    this.cHood = this.cPlot.curve({ color: Palette.green, width: 7 });
    this.cDelta = this.cPlot.curve({ color: Palette.red, width: 5 });
    this.cLevel = this.cPlot.curve({ color: Palette.muted, width: 2, dash: "6 6" });
    this.cCurve = this.cPlot.curve({ color: "#ffffff", width: 3.5 });
    this.vPlot = new MiniPlot(this.svg, fl, { x: 820, y: 430, w: 460, h: 250, xMin: -1.2, xMax: 1.2, yMin: 0, yMax: 1.2, xLabel: "x", yLabel: "|x|" });
    this.vCurve = this.vPlot.curve({ color: "#ffffff", width: 3.5 });
    this.slopeL = fl.add({ tex: "\\text{slope }-1", x: 930, y: 520, size: 26, color: Palette.red });
    this.slopeR = fl.add({ tex: "\\text{slope }+1", x: 1170, y: 520, size: 26, color: Palette.red });

    this.fDef = fl.add({ tex: "", x: CX, y: 170, size: 30, display: true });
    this.fProof = fl.add({ tex: "", x: 420, y: 540, size: 26, display: true });
    this.fIff = fl.add({ tex: "", x: CX, y: 420, size: 30, display: true });
    this.fRay = fl.add({ tex: "", x: CX, y: 120, size: 30, display: true });
    this.fMetric = fl.add({ tex: "", x: CX, y: 120, size: 30, display: true });
    this.fGoal = fl.add({ tex: "\\text{goal: }\\ \\operatorname{grad}f(x_k)\\to0", x: CX, y: 480, size: 44, color: Palette.yellow });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "\\text{local min}\\ \\Rightarrow\\ \\text{critical}", at: cue.e(11) },
      { label: "2", tex: "\\text{critical}\\iff\\operatorname{grad}f(x)=0", at: cue.e(16) },
      { label: "3", tex: "\\text{Rayleigh: critical}\\iff Ax=\\lambda x", at: cue.e(18) },
      { label: "4", tex: "\\text{critical set: metric-independent}", at: cue.e(26) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const az = 25 + (t > c.s(19) ? 50 * c.over(19, 0, 1) : 0) + (t > c.s(21) ? 30 * c.p(21, 1.0) : 0);
    setOrbitView(this.stage, { azDeg: az, elDeg: 28, distance: 5.6, fovDeg: 34, center: new THREE.Vector3(0, 0, 0.1), shift: 1.0, lift: -0.05 });

    // ---- sphere phases: definition (s0–s4), field (s17–s22), metric (s25–s27)
    const sphereO = c.p(0, 0.8, -0.8) * (1 - c.p(5, 0.6)) + c.p(17, 0.6) * (1 - c.p(23, 0.6)) + c.p(25, 0.6) * (1 - c.p(27, 0.6));
    this.sphere.setOpacity(Math.min(1, sphereO), 1, Math.min(1, c.p(0, 0.6) * (1 - c.p(5, 0.6)) + c.p(19, 0.5) * (1 - c.p(23, 0.6)) + c.p(25, 0.6) * (1 - c.p(27, 0.6))));
    const curvesO = c.p(1, 0.6) * (1 - c.p(5, 0.6));
    this.curves.forEach((l, k) => {
      l.setOpacity(curvesO);
      l.setProgress(c.over(1, 0.1 + 0.15 * k, 0.6 + 0.1 * k));
    });
    const fieldO = c.p(17, 0.6) * (1 - c.p(23, 0.6));
    for (const { p, arrow } of this.field) {
      const g = rayleighGrad(p);
      arrow.set(lift(p, 1.012), lift(p, 1.012).addScaledVector(g, 0.12));
      arrow.setOpacity(fieldO * (g.length() > 0.05 ? 1 : 0));
    }
    const sadO = c.p(21, 0.5) * (1 - c.p(23, 0.6));
    this.saddleUp.setOpacity(sadO);
    this.saddleUp.setProgress(c.over(21, 0.1, 0.5));
    this.saddleDown.setOpacity(sadO);
    this.saddleDown.setProgress(c.over(21, 0.5, 0.95));
    this.e2Label.update(sadO);
    // two metrics at a point moving to e₃ (s25–s26)
    const metO = c.p(25, 0.6) * (1 - c.p(27, 0.6));
    const p = spherePoint(lerp(52, 0.5, c.over(26, 0.15, 0.85)), 35);
    const { east, north } = tangentFrame(p);
    const eg = applyA(p);
    const d1 = eg.dot(east);
    const d2 = eg.dot(north);
    const gE = east.clone().multiplyScalar(d1).addScaledVector(north, d2);
    // a second metric with G⁻¹ = [[1, 0.4], [0.4, 0.4]] in the (east, north) frame (symmetric positive definite)
    const gM = east.clone().multiplyScalar(d1 + 0.4 * d2).addScaledVector(north, 0.4 * d1 + 0.4 * d2);
    this.metricPoint.setPosition(lift(p, 1.012));
    this.metricPoint.setOpacity(metO);
    this.gEuc.set(lift(p, 1.012), lift(p, 1.012).addScaledVector(gE, 0.3));
    this.gEuc.setOpacity(metO * (gE.length() > 0.04 ? 1 : 0));
    this.gMet.set(lift(p, 1.012), lift(p, 1.012).addScaledVector(gM, 0.3));
    this.gMet.setOpacity(metO * (gM.length() > 0.04 ? 1 : 0));

    // ---- definition (s1–s4)
    const dn = Tex.count(t, [c.s(2), c.s(3), c.s(4)]);
    this.fDef.setContent(Tex.rows([
      `\\textbf{critical:}\\ (f\\circ c)'(0)\\ge0\\ \\ \\text{for every smooth curve } c,\\ c(0)=x`,
      "\\iff (f\\circ c)'(0)=0\\quad(\\text{use } c(t) \\text{ and } c(-t))",
      "\\iff Df(x)=0",
    ], dn));
    this.fDef.set({ opacity: (dn > 0 ? 1 : 0) * (1 - c.p(5, 0.5)) });

    // ---- Prop 4.5 by contradiction (s5–s11)
    const pO = c.p(6, 0.6) * (1 - c.p(12, 0.6));
    this.cPlot.setOpacity(pO);
    const hyp = (s: number): number => -0.45 * s + 0.35 * s * s * s;
    this.cPlot.plot(this.cCurve, hyp, -0.4, 1, 100);
    this.cCurve.setOpacity(pO * c.p(7, 0.5));
    this.cPlot.plot(this.cLevel, () => 0, -0.4, 1, 2);
    this.cLevel.setOpacity(pO);
    this.cPlot.plot(this.cDelta, () => -0.56, 0, 0.62, 2);
    this.cDelta.setOpacity(pO * c.p(8, 0.5));
    this.cPlot.plot(this.cHood, () => -0.5, -0.25, 0.3, 2);
    this.cHood.setOpacity(pO * c.p(10, 0.5));
    const pr = Tex.count(t, [c.s(5), c.s(6), c.s(7), c.s(8), c.s(9), c.s(10), c.s(11)]);
    this.fProof.setContent(Tex.rows([
      `${Tex.color(Palette.yellow, "\\textbf{Prop 4.5}\\ \\text{local min}\\Rightarrow\\text{critical}")}`,
      "f(y)\\ge f(x)\\ \\ \\forall y\\in U",
      `\\text{suppose } ${Tex.color(Palette.red, "(f\\circ c)'(0)<0")}`,
      "(f\\circ c)'<0\\ \\text{on } [0,\\delta]\\ \\ (\\text{continuity})",
      "f(c(t))=f(x)+\\int_0^t(f\\circ c)'<f(x),\\ \\ 0<t\\le\\delta",
      "c^{-1}(U)\\ \\text{open},\\ 0\\in c^{-1}(U)",
      `\\exists t\\in(0,\\delta]:\\ c(t)\\in U\\ \\Rightarrow\\ ${Tex.color(Palette.red, "\\text{contradiction}")}`,
    ], pr));
    this.fProof.set({ opacity: (pr > 0 ? 1 : 0) * (1 - c.p(12, 0.5)) });

    // ---- Prop 4.6 (s12–s16)
    const fi = Tex.count(t, [c.s(12), c.s(13), c.s(14), c.s(15), c.s(16)]);
    this.fIff.setContent(Tex.rows([
      `${Tex.color(Palette.yellow, "\\textbf{Prop 4.6}\\ \\ x \\text{ critical}\\iff\\operatorname{grad}f(x)=0")}`,
      "(f\\circ c)'(0)=Df(x)[v]=\\langle\\operatorname{grad}f(x),v\\rangle_x",
      "\\operatorname{grad}f(x)=0\\ \\Rightarrow\\ \\text{all zero}\\ \\Rightarrow\\ \\text{critical}",
      "\\text{critical}\\ \\Rightarrow\\ \\langle\\operatorname{grad}f(x),v\\rangle\\ge0\\ \\ \\forall v\\in T_xM",
      "v\\to-v:\\ =0\\ \\forall v;\\ \\ v=\\operatorname{grad}f(x):\\ \\|\\operatorname{grad}f(x)\\|^2=0",
    ], fi));
    this.fIff.set({ opacity: (fi > 0 ? 1 : 0) * (1 - c.p(17, 0.5)) });

    // ---- Rayleigh critical points (s17–s22)
    const rn = Tex.count(t, [c.s(17), c.s(18), c.s(20), c.s(21)]);
    this.fRay.setContent(Tex.rows([
      "\\operatorname{grad}f(x)=Ax-(x^\\top Ax)\\,x",
      "=0\\iff Ax=\\lambda x:\\ \\ \\pm e_1,\\ \\pm e_2,\\ \\pm e_3",
      `${Tex.color(Palette.green, "\\pm e_3\\ \\min\\ (f=\\tfrac12)")}\\quad ${Tex.color(Palette.orange, "\\pm e_1\\ \\max\\ (f=2)")}`,
      `${Tex.color(Palette.purple, "\\pm e_2\\ \\text{saddle}\\ (f=1)")}`,
    ], rn));
    this.fRay.set({ opacity: (rn > 0 ? 1 : 0) * (1 - c.p(23, 0.5)) });

    // ---- |x| (s23–s24)
    const vO = c.p(23, 0.6) * (1 - c.p(25, 0.6));
    this.vPlot.setOpacity(vO);
    this.vPlot.plot(this.vCurve, (x) => Math.abs(x), -1.2, 1.2, 240);
    this.vCurve.setOpacity(vO);
    this.slopeL.set({ opacity: vO * c.p(24, 0.5) });
    this.slopeR.set({ opacity: vO * c.p(24, 0.5) });

    // ---- metric independence (s25–s27)
    const mn = Tex.count(t, [c.s(25), c.s(26)]);
    this.fMetric.setContent(Tex.rows([
      `${Tex.color("#ffffff", "\\text{embedded metric}")}\\ \\text{vs}\\ ${Tex.color(Palette.purple, "\\text{another metric}")}:\\ \\text{different gradients}`,
      "Df(x)=0\\ \\text{uses no inner product}\\ \\Rightarrow\\ \\text{same critical points}",
    ], mn));
    this.fMetric.set({ opacity: (mn > 0 ? 1 : 0) * (1 - c.p(27, 0.5)) });
    this.fGoal.set({ opacity: c.p(27, 0.6) });
    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
