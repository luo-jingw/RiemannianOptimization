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
import { TangentPlane } from "../../primitives/TangentPlane";
import { WorldLabel } from "../../primitives/WorldLabel";
import { HeightSphere } from "./lib/HeightSphere";
import { MiniPlot } from "./lib/MiniPlot";
import { setOrbitView } from "./lib/SphereCamera";
import type { SvgDot, SvgPath } from "./lib/SvgOverlay";
import { SvgOverlay } from "./lib/SvgOverlay";
import { X0, heightGrad, lift, normalizeRetract, rotateTangent, tangentFrame } from "./lib/sphereMath";

/**
 * E06 c08 — retraction: definition, the type of condition (ii), the proof that γ(t) = R_x(tv) has
 * γ(0) = x and γ'(0) = v, and counterexamples: dropping (i) (shift by w₀), dropping (ii)
 * (doubled speed (x + 2v)/‖·‖, rotated (x + Q_θ v)/‖·‖ with slope −‖grad f‖² cos θ).
 * Pull-back drawn with the normalization map; v = −grad f(x) for f = x₃ on S².
 * Sentence indices refer to content/episodes/e06-gradient-retraction/story.en.json, scene c08-retraction.
 */

const RX = 1060;
const G = heightGrad(X0);
const V = G.clone().multiplyScalar(-1);
const { east: EAST } = tangentFrame(X0);
const W0 = EAST.clone().multiplyScalar(0.45);
const T_MAX = 1.0;
const retractWhite = (t: number): THREE.Vector3 => normalizeRetract(X0, V.clone().multiplyScalar(t));
const retractDouble = (t: number): THREE.Vector3 => normalizeRetract(X0, V.clone().multiplyScalar(2 * t));
const retractRot = (t: number, theta: number): THREE.Vector3 => normalizeRetract(X0, rotateTangent(X0, V, theta).multiplyScalar(t));
const slope = (g: (t: number) => THREE.Vector3): number => (g(1e-4).z - g(0).z) / 1e-4;

function tc(color: string, body: string): string {
  return `\\textcolor{${color}}{${body}}`;
}

function rows(list: string[], n: number, env = "gathered"): string {
  return `\\begin{${env}}${list.map((r, i) => (i < n ? r : `\\phantom{${r}}`)).join("\\\\ ")}\\end{${env}}`;
}

export class RetractionScene implements Scene {
  readonly id = "c08-retraction";
  private stage!: StageLayer;

  private sphere!: HeightSphere;
  private plane!: TangentPlane;
  private xDot!: Dot;
  private xLabel!: WorldLabel;
  private vArrow!: Arrow;
  private vLabel!: WorldLabel;
  private straight!: Polyline;
  private straightDot!: Dot;
  private straightLabel!: WorldLabel;
  private ray!: Polyline;
  private tanDot!: Dot;
  private pulled!: Dot;
  private whiteCurve!: Polyline;
  private cLine!: Polyline;
  private cLabel!: WorldLabel;
  private velArrow!: Arrow;
  private velLabel!: WorldLabel;

  private shiftDot!: Dot;
  private shiftLabel!: WorldLabel;
  private w0Arrow!: Arrow;
  private w0Label!: WorldLabel;
  private doubleDot!: Dot;
  private whiteDot!: Dot;
  private redCurve!: Polyline;
  private redArrow!: Arrow;

  private svg!: SvgOverlay;
  private slider!: SvgPath;
  private knob!: SvgDot;
  private sliderLabel!: FormulaHandle;
  private plot!: MiniPlot;
  private pWhite!: SvgPath;
  private pDouble!: SvgPath;
  private pRed!: SvgPath;
  private readouts!: FormulaHandle;

  private fQ!: FormulaHandle;
  private fDef!: FormulaHandle;
  private fType!: FormulaHandle;
  private fLocal!: FormulaHandle;
  private fProof!: FormulaHandle;
  private fRep!: FormulaHandle;
  private fDrop1!: FormulaHandle;
  private fDrop2!: FormulaHandle;
  private fSummary!: FormulaHandle;

  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    this.sphere = new HeightSphere(stage);
    this.plane = new TangentPlane(stage, Palette.green, 0.75);
    this.plane.place(X0, X0);
    this.xDot = new Dot(stage, X0, Palette.orange, 0.032, "3d");
    this.xLabel = new WorldLabel(stage, fl, { tex: "x", size: 34, color: Palette.orange }, X0, { x: 22, y: -18 });
    this.vArrow = new Arrow(stage, X0, X0.clone().add(V), "#ffffff", { mode: "3d", width: 6, headLength: 0.1 });
    this.vLabel = new WorldLabel(stage, fl, { tex: "v=-\\operatorname{grad}f(x)", size: 30, color: "#ffffff", align: "left" }, X0.clone().add(V), { x: 14, y: 22 });
    this.straight = new Polyline(stage, [X0, X0.clone().addScaledVector(V, 1.4)], { color: Palette.red, width: 3, dashed: true, dashSize: 0.05, gapSize: 0.04 });
    this.straightDot = new Dot(stage, X0, Palette.red, 0.03, "3d");
    this.straightLabel = new WorldLabel(stage, fl, { tex: "x-t\\operatorname{grad}f\\notin M", size: 30, color: Palette.red, align: "left" }, X0, { x: 18, y: 12 });
    this.ray = new Polyline(stage, [new THREE.Vector3(), X0], { color: "#d0d6e6", width: 1.5 });
    this.tanDot = new Dot(stage, X0, Palette.red, 0.026, "3d");
    this.pulled = new Dot(stage, X0, "#ffffff", 0.032, "3d");
    this.whiteCurve = new Polyline(stage, sampleCurve((t) => lift(retractWhite(t)), 0, T_MAX, 80), { color: "#ffffff", width: 4 });
    const cDir = V.clone().normalize();
    this.cLine = new Polyline(stage, [X0.clone().addScaledVector(cDir, -0.9), X0.clone().addScaledVector(cDir, 0.9)], { color: Palette.teal, width: 3 });
    this.cLabel = new WorldLabel(stage, fl, { tex: "c(t)=tv\\subset T_xM", size: 28, color: Palette.teal, align: "left" }, X0.clone().addScaledVector(cDir, -0.85), { x: 10, y: -10 });
    this.velArrow = new Arrow(stage, lift(X0, 1.02), lift(X0, 1.02).add(V), Palette.green, { mode: "3d", width: 9, headLength: 0.12 });
    this.velLabel = new WorldLabel(stage, fl, { tex: "\\gamma'(0)=v", size: 30, color: Palette.green, align: "left" }, X0.clone().add(V), { x: 16, y: 10 });

    this.shiftDot = new Dot(stage, X0, Palette.red, 0.036, "3d");
    this.shiftLabel = new WorldLabel(stage, fl, { tex: "\\tilde R_x(tv)", size: 30, color: Palette.red, align: "left" }, X0, { x: 16, y: -34 });
    this.w0Arrow = new Arrow(stage, X0, X0.clone().add(W0), Palette.purple, { mode: "3d", width: 4, headLength: 0.08 });
    this.w0Label = new WorldLabel(stage, fl, { tex: "w_0", size: 30, color: Palette.purple, align: "left" }, X0.clone().add(W0), { x: 10, y: -10 });
    this.whiteDot = new Dot(stage, X0, "#ffffff", 0.034, "3d");
    this.doubleDot = new Dot(stage, X0, Palette.orange, 0.034, "3d");
    this.redCurve = new Polyline(stage, sampleCurve((t) => lift(retractRot(t, 0)), 0, T_MAX, 60), { color: Palette.red, width: 4 });
    this.redArrow = new Arrow(stage, X0, X0.clone().add(V), Palette.red, { mode: "3d", width: 4, headLength: 0.09 });

    this.svg = new SvgOverlay(fl);
    this.slider = this.svg.path({ color: Palette.muted, width: 4 });
    this.slider.setPoints([{ x: 880, y: 640 }, { x: 1240, y: 640 }]);
    this.knob = this.svg.dot(Palette.red, 11);
    this.sliderLabel = fl.add({ tex: "t=1.00", x: 1060, y: 690, size: 30, color: Palette.red });
    this.plot = new MiniPlot(this.svg, fl, { x: 860, y: 380, w: 400, h: 240, xMin: 0, xMax: T_MAX, yMin: -0.4, yMax: 1.05,
      xLabel: "t", yLabel: "f(\\gamma(t))" });
    this.pWhite = this.plot.curve({ color: "#ffffff", width: 3 });
    this.pDouble = this.plot.curve({ color: Palette.orange, width: 3 });
    this.pRed = this.plot.curve({ color: Palette.red, width: 3 });
    this.readouts = fl.add({ tex: "", x: RX, y: 720, size: 28, display: true });

    this.fQ = fl.add({ text: "question ②: how to move without leaving M?", x: RX, y: 120, size: 32, color: Palette.yellow });
    this.fDef = fl.add({ tex: "\\begin{gathered}\\textbf{Retraction at } x:\\ R_x:T_xM\\to M\\ \\text{smooth}\\\\ \\text{(i)}\\ R_x(0)=x\\qquad \\text{(ii)}\\ d(R_x)_0=\\mathrm{id}_{T_xM}\\end{gathered}",
      x: RX, y: 160, size: 32, display: true, boxed: true });
    this.fType = fl.add({ tex: "", x: RX, y: 340, size: 28, display: true });
    this.fLocal = fl.add({ text: "some retractions are defined only near 0", x: RX, y: 450, size: 24, color: Palette.muted });
    this.fProof = fl.add({ tex: "", x: RX, y: 420, size: 28, display: true });
    this.fRep = fl.add({ tex: `\\Rightarrow\\ ${tc(Palette.green, "(f\\circ\\gamma)'(0)=df_x[v]")}`, x: RX, y: 620, size: 32 });
    this.fDrop1 = fl.add({ tex: `\\begin{gathered}\\text{drop (i): } \\tilde R_x(v)=R_x(v+w_0)\\\\ \\tilde R_x(0)=R_x(w_0)\\neq x\\end{gathered}`, x: RX, y: 160, size: 30, display: true, color: Palette.red });
    this.fDrop2 = fl.add({ tex: "", x: RX, y: 170, size: 28, display: true });
    this.fSummary = fl.add({ tex: "\\begin{gathered}\\text{(ii): right direction and right speed}\\\\ \\text{second order and beyond: free}\\end{gathered}", x: RX, y: 300, size: 30, display: true, color: Palette.green });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "R", tex: "R_x(0)=x,\\ \\ d(R_x)_0=\\mathrm{id}", at: cue.s(8) + 1.5 },
      { label: "1", tex: "\\gamma(t)=R_x(tv):\\ \\gamma(0)=x", at: cue.s(15) + 1.5 },
      { label: "2", tex: "\\gamma'(0)=v", at: cue.s(18) + 1.0 },
      { label: "3", tex: "(f\\circ\\gamma)'(0)=df_x[v]", at: cue.s(20) + 1.5 },
      { label: "✗", tex: "\\text{(ii) fails}\\Rightarrow\\text{slope}\\neq-\\|\\operatorname{grad}f\\|^2", at: cue.s(32) + 1.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  /** θ of the rotated counterexample. */
  private thetaAt(c: Cues): number {
    const t = c.t;
    if (t < c.s(31)) return 0.6;
    if (t < c.s(32)) return lerp(0.6, Math.PI, c.over(31, 0.1, 0.9));
    if (t < c.in(32, 0.55)) return lerp(Math.PI, Math.PI / 2, c.over(32, 0.0, 0.25));
    return lerp(Math.PI / 2, (3 * Math.PI) / 4, c.over(32, 0.6, 0.9));
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    setOrbitView(this.stage, { azDeg: 85, elDeg: 18, distance: 6.2, fovDeg: 36, center: new THREE.Vector3(0, 0, 0.05), shift: 1.6, lift: -0.15 });
    this.sphere.setOpacity(c.p(0, 0.8, -0.6));
    const base = c.p(0, 0.6);
    this.plane.setOpacity(0.7 * base);
    this.xDot.setOpacity(base);
    this.xLabel.update(base);
    const vVis = c.p(0, 0.6, 0.4);
    this.vArrow.setOpacity(vVis);
    this.vLabel.update(vVis * ((1 - c.p(2, 0.4)) + c.p(13, 0.5) * (1 - c.p(18, 0.4))));

    // straight step (s2) and pull-back (s3–s4)
    const tStraight = T_MAX * c.over(2, 0.05, 0.9);
    const st = c.p(2, 0.5) * (1 - 0.7 * c.p(3, 0.6)) * (1 - c.p(5, 0.6));
    const sp = X0.clone().addScaledVector(V, tStraight);
    this.straight.setPoints([X0, sp]);
    this.straight.setOpacity(st);
    this.straightDot.setPosition(sp);
    this.straightDot.setOpacity(st);
    this.straightLabel.setAnchor(sp);
    this.straightLabel.update(st * (1 - c.p(3, 0.5)));
    const pull = 0.4 * c.over(3, 0.2, 1.0) + 0.6 * c.over(4, 0.0, 0.9);
    const tp = X0.clone().addScaledVector(V, pull * T_MAX);
    const pullVis = c.p(3, 0.5) * (1 - c.p(5, 0.6));
    this.ray.setPoints([new THREE.Vector3(), tp]);
    this.ray.setOpacity(pullVis * 0.8);
    this.tanDot.setPosition(tp);
    this.tanDot.setOpacity(pullVis);
    this.pulled.setPosition(lift(tp.clone().normalize(), 1.01));
    this.pulled.setOpacity(pullVis);
    const curveProg = t >= c.s(5) ? 1 : pull;
    this.whiteCurve.setProgress(curveProg);
    this.whiteCurve.setOpacity(c.p(3, 0.5) * (curveProg > 0.01 ? 1 : 0) * (1 - 0.6 * c.p(21, 0.5) * (1 - c.p(25, 0.5))));
    this.fQ.set({ opacity: c.p(1, 0.5) * (1 - c.p(5, 0.5)) });

    // definition and type check (s5–s12)
    this.fDef.set({ opacity: c.p(6, 0.6) * (1 - c.p(21, 0.5)) });
    const ty = t >= c.s(11) ? 2 : t >= c.s(10) ? 1 : 0;
    this.fType.setContent(rows([
      "c(t)=tv,\\ c'(0)=v\\ \\Rightarrow\\ T_0(T_xM)=T_xM",
      "R_x(0)=x\\ \\Rightarrow\\ d(R_x)_0:T_xM\\to T_xM",
    ], ty));
    this.fType.set({ opacity: (ty > 0 ? 1 : 0) * (1 - c.p(13, 0.5)) });
    this.fLocal.set({ opacity: c.p(12, 0.5) * (1 - c.p(13, 0.5)) });
    const cVis = c.p(10, 0.5) * (1 - c.p(13, 0.5)) + c.p(14, 0.5) * (1 - c.p(16, 0.5));
    this.cLine.setOpacity(cVis);
    this.cLabel.update(cVis);

    // proof (s13–s20)
    const pr = t >= c.s(18) ? 5 : t >= c.s(17) ? 4 : t >= c.s(16) ? 3 : t >= c.s(15) ? 2 : t >= c.s(13) ? 1 : 0;
    this.fProof.setContent(rows([
      "\\gamma(t):=R_x(tv)=(R_x\\circ c)(t)",
      `\\gamma(0)=R_x(0)=x\\quad ${tc(Palette.muted, "\\text{by (i)}")}`,
      "\\gamma'(0)=(R_x\\circ c)'(0)",
      `\\phantom{\\gamma'(0)}=d(R_x)_0[c'(0)]=d(R_x)_0[v]\\quad ${tc(Palette.muted, "\\text{curve def. of } d")}`,
      `\\phantom{\\gamma'(0)}=${tc(Palette.green, "v")}\\quad ${tc(Palette.muted, "\\text{by (ii)}")}`,
    ], pr));
    this.fProof.set({ opacity: (pr > 0 ? 1 : 0) * (1 - c.p(21, 0.5)) });
    const vel = c.p(18, 0.6) * (1 - c.p(21, 0.5));
    this.velArrow.setOpacity(vel);
    this.velLabel.update(vel);
    this.fRep.set({ opacity: c.p(20, 0.6) * (1 - c.p(21, 0.5)) });

    // drop (i): shifted map, step slider to zero (s21–s24)
    const d1 = c.p(21, 0.5) * (1 - c.p(25, 0.5));
    this.fDrop1.set({ opacity: d1 });
    const tSl = t < c.s(23) ? 1 : lerp(1, 0, c.over(23, 0.1, 0.8));
    const shifted = normalizeRetract(X0, V.clone().multiplyScalar(tSl).add(W0));
    this.shiftDot.setPosition(lift(shifted, 1.01));
    this.shiftDot.setOpacity(d1 * c.p(22, 0.5));
    this.shiftLabel.setAnchor(lift(shifted, 1.01));
    this.shiftLabel.handle.setContent(tSl < 0.02 ? "\\tilde R_x(0)=R_x(w_0)\\neq x" : "\\tilde R_x(tv)");
    this.shiftLabel.update(d1 * c.p(22, 0.5));
    this.w0Arrow.setOpacity(d1 * c.p(22, 0.5));
    this.w0Label.update(d1 * c.p(22, 0.5));
    const slO = d1 * c.p(22, 0.5);
    this.slider.setOpacity(slO);
    this.knob.set(lerp(880, 1240, tSl / T_MAX), 640, slO);
    this.sliderLabel.setContent(`t=${tSl.toFixed(2)}`);
    this.sliderLabel.set({ opacity: slO });

    // drop (ii): doubled speed and rotation (s25–s32)
    const d2 = c.p(25, 0.5) * (1 - c.p(33, 0.6));
    const theta = this.thetaAt(c);
    const dState = t >= c.s(29) ? 2 : t >= c.s(26) ? 1 : 0;
    this.fDrop2.setContent(rows([
      `${tc(Palette.orange, "\\tilde R_x(v)=\\tfrac{x+2v}{\\|x+2v\\|}")}:\\ \\ d(\\tilde R_x)_0=2\\,\\mathrm{id}`,
      `${tc(Palette.red, "\\tilde R_x(v)=\\tfrac{x+Q_\\theta v}{\\|x+Q_\\theta v\\|}")}:\\ \\ d(\\tilde R_x)_0=Q_\\theta`,
    ], dState));
    this.fDrop2.set({ opacity: d2 * (dState > 0 ? 1 : 0) });
    const runT = T_MAX * c.over(27, 0.05, 0.9);
    this.whiteDot.setPosition(lift(retractWhite(runT), 1.01));
    this.doubleDot.setPosition(lift(retractDouble(runT), 1.01));
    const race = c.p(27, 0.4) * (1 - c.p(29, 0.5));
    this.whiteDot.setOpacity(race);
    this.doubleDot.setOpacity(race);
    const rotVis = c.p(29, 0.6) * (1 - c.p(33, 0.6));
    this.redCurve.setPoints(sampleCurve((s) => lift(retractRot(s, theta)), 0, T_MAX, 60));
    this.redCurve.setOpacity(rotVis);
    this.redArrow.set(X0, X0.clone().add(rotateTangent(X0, V, theta)));
    this.redArrow.setOpacity(rotVis);

    const plotO = d2 * c.p(26, 0.5);
    this.plot.setOpacity(plotO);
    this.plot.plot(this.pWhite, (s) => retractWhite(s).z, 0, T_MAX, 80);
    this.pWhite.setOpacity(plotO);
    this.plot.plot(this.pDouble, (s) => retractDouble(s).z, 0, T_MAX, 80);
    this.pDouble.setOpacity(plotO * c.p(27, 0.5));
    this.plot.plot(this.pRed, (s) => retractRot(s, theta).z, 0, T_MAX, 80);
    this.pRed.setOpacity(plotO * rotVis);
    const sW = slope(retractWhite);
    const sD = slope(retractDouble);
    const sRraw = slope((s) => retractRot(s, theta));
    const sR = Math.abs(sRraw) < 0.005 ? 0 : sRraw;
    const deg = Math.round((theta * 180) / Math.PI);
    const ro = [
      `${tc("#ffffff", `\\text{slope}=${sW.toFixed(2)}=-\\|\\operatorname{grad}f\\|^2`)}`,
      `${tc(Palette.orange, `\\text{slope}=${sD.toFixed(2)}=-2\\|\\operatorname{grad}f\\|^2`)}`,
      `${tc(Palette.red, `\\theta=${deg}^\\circ:\\ \\text{slope}=${sR > 0 ? "+" : ""}${sR.toFixed(2)}=-\\|\\operatorname{grad}f\\|^2\\cos\\theta`)}`,
    ];
    const roN = t >= c.s(30) ? 3 : t >= c.s(27) ? 2 : 1;
    this.readouts.setContent(rows(ro, roN));
    this.readouts.set({ opacity: plotO });

    this.fSummary.set({ opacity: c.p(33, 0.6) });

    this.ledger.update(t, c.p(8, 0.5, 1.0), true);
  }

  teardown(_layers: SceneLayers): void {}
}
