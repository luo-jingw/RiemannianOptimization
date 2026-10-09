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
import { blendView, setOrbitView, type OrbitView } from "./lib/SphereCamera";
import type { SvgPath } from "./lib/SvgOverlay";
import { SvgOverlay } from "./lib/SvgOverlay";
import { E3, X0, greatCircle, lift, tangentFrame } from "./lib/sphereMath";

/**
 * E06 c02 — the differential defined by curves; well-definedness and linearity via the graph chart.
 * Running example: S², f = x₃, x = X0, v = 0.5·north + 0.35·east (df_x[v] = e₃ᵀv = 0.5 sin 50°).
 * γ₁ = great circle with γ₁'(0) = v; γ₂(t) = (x + tv + t²w)/‖·‖ with w tangent, so γ₂'(0) = v.
 * Graph chart near x: solve x₃ = g(x₁, x₂); φ = π = projection to (x₁, x₂), drawn on the plane z = PLANE_Z.
 * Sentence indices refer to content/episodes/e06-gradient-retraction/story.en.json, scene c02-differential-by-curves.
 */

const PLANE_Z = -1.55;
const { east: EAST, north: NORTH } = tangentFrame(X0);
const V = NORTH.clone().multiplyScalar(0.5).addScaledVector(EAST, 0.35);
const W = EAST.clone().multiplyScalar(1.6).addScaledVector(NORTH, -0.9);
const T_RANGE = 1.15;
const gamma1 = (t: number): THREE.Vector3 => greatCircle(X0, V, t);
const gamma2 = (t: number): THREE.Vector3 => X0.clone().addScaledVector(V, t).addScaledVector(W, t * t).normalize();
const proj = (p: THREE.Vector3): THREE.Vector3 => new THREE.Vector3(p.x, p.y, PLANE_Z);
const slopeAt0 = (g: (t: number) => THREE.Vector3): number => (g(1e-4).z - g(-1e-4).z) / 2e-4;
const BAR_SCALE = 0.8;

const VIEW_MAIN: OrbitView = { azDeg: 8, elDeg: 20, distance: 6.2, fovDeg: 36, center: new THREE.Vector3(0, 0, 0.05), shift: 1.85, lift: -0.1 };
const VIEW_RULE: OrbitView = { azDeg: -40, elDeg: 15, distance: 6.4, fovDeg: 36, center: new THREE.Vector3(0, 0, 0.1), shift: 2.3, lift: -0.15 };
const VIEW_CHART: OrbitView = { azDeg: 2, elDeg: 26, distance: 8.5, fovDeg: 36, center: new THREE.Vector3(0, 0, -0.3), shift: 3.1, lift: -0.4 };

function tc(color: string, body: string): string {
  return `\\textcolor{${color}}{${body}}`;
}

function phantomize(parts: string[], n: number): string {
  return parts.map((s, i) => (i < n ? s : `\\phantom{${s}}`)).join("");
}

export class DifferentialByCurvesScene implements Scene {
  readonly id = "c02-differential-by-curves";
  private stage!: StageLayer;

  private sphere!: HeightSphere;
  private plane!: TangentPlane;
  private xDot!: Dot;
  private xLabel!: WorldLabel;
  private vArrow!: Arrow;
  private vLabel!: WorldLabel;
  private line!: Polyline;
  private lineLabel!: WorldLabel;

  private g1!: Polyline;
  private g2!: Polyline;
  private g1Dot!: Dot;
  private g2Dot!: Dot;
  private g1Label!: WorldLabel;
  private g2Label!: WorldLabel;

  private svg!: SvgOverlay;
  private plot!: MiniPlot;
  private plot1!: SvgPath;
  private plot2!: SvgPath;
  private tangentLine!: SvgPath;
  private readout1!: FormulaHandle;
  private readout2!: FormulaHandle;

  private defFormula!: FormulaHandle;
  private mapFormula!: FormulaHandle;
  private realNote!: FormulaHandle;
  private question!: FormulaHandle;

  // chart phase
  private chartPlane!: TangentPlane;
  private capOutline!: Polyline;
  private capShadow!: Polyline;
  private pg1!: Polyline;
  private pg2!: Polyline;
  private aDot!: Dot;
  private aLabel!: WorldLabel;
  private piV!: Arrow;
  private piVLabel!: WorldLabel;
  private downArrow!: Arrow;
  private upArrow!: Arrow;
  private downLabel!: WorldLabel;
  private upLabel!: WorldLabel;
  private ALabel!: WorldLabel;
  private proofHead!: FormulaHandle;
  private graphFact!: FormulaHandle;
  private chartFact!: FormulaHandle;
  private step1!: FormulaHandle;
  private step2!: FormulaHandle;
  private step3!: FormulaHandle;
  private step4!: FormulaHandle;
  private toolNote!: FormulaHandle;
  private generalNote!: FormulaHandle;

  // computing rule phase
  private ruleFormula!: FormulaHandle;
  private barArrow1!: Arrow;
  private barArrow2!: Arrow;
  private barTan!: Arrow;
  private barNormal!: Polyline;
  private bar1Label!: WorldLabel;
  private bar2Label!: WorldLabel;
  private barTanLabel!: WorldLabel;
  private extFormula!: FormulaHandle;
  private diffFormula!: FormulaHandle;
  private keepNote!: FormulaHandle;

  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    this.sphere = new HeightSphere(stage);
    this.plane = new TangentPlane(stage, Palette.green, 0.7);
    this.plane.place(X0, X0);
    this.xDot = new Dot(stage, X0, Palette.orange, 0.032, "3d");
    this.xLabel = new WorldLabel(stage, fl, { tex: "x", size: 34, color: Palette.orange }, X0, { x: -20, y: 22 });
    this.vArrow = new Arrow(stage, X0, X0.clone().add(V), Palette.teal, { mode: "3d", width: 5, headLength: 0.1 });
    this.vLabel = new WorldLabel(stage, fl, { tex: "v", size: 34, color: Palette.teal }, X0.clone().add(V), { x: 16, y: -16 });
    this.line = new Polyline(stage, [X0.clone().addScaledVector(V, -2.2), X0.clone().addScaledVector(V, 2.2)],
      { color: Palette.red, width: 3, dashed: true, dashSize: 0.06, gapSize: 0.05 });
    this.lineLabel = new WorldLabel(stage, fl, { tex: "x+tv\\notin S^2:\\ \\ f(x+tv)\\ \\text{undefined}", size: 30, color: Palette.red, align: "left" },
      X0.clone().addScaledVector(V, 1.9), { x: 14, y: -26 });

    this.g1 = new Polyline(stage, sampleCurve((t) => lift(gamma1(t)), -T_RANGE, T_RANGE, 120), { color: "#ffffff", width: 4 });
    this.g2 = new Polyline(stage, sampleCurve((t) => lift(gamma2(t)), -T_RANGE, T_RANGE, 120), { color: Palette.orange, width: 4 });
    this.g1Dot = new Dot(stage, X0, "#ffffff", 0.03, "3d");
    this.g2Dot = new Dot(stage, X0, Palette.orange, 0.03, "3d");
    this.g1Label = new WorldLabel(stage, fl, { tex: "\\gamma_1", size: 32, color: "#ffffff" }, lift(gamma1(-0.95)), { x: -22, y: 0 });
    this.g2Label = new WorldLabel(stage, fl, { tex: "\\gamma_2", size: 32, color: Palette.orange }, lift(gamma2(0.75)), { x: 20, y: 0 });

    this.svg = new SvgOverlay(fl);
    this.plot = new MiniPlot(this.svg, fl, { x: 860, y: 330, w: 440, h: 250, xMin: -T_RANGE, xMax: T_RANGE, yMin: 0, yMax: 1.05,
      xLabel: "t", yLabel: "f(\\gamma(t))" });
    this.tangentLine = this.plot.curve({ color: Palette.yellow, width: 2.5, dash: "8 6" });
    this.plot1 = this.plot.curve({ color: "#ffffff", width: 3.5 });
    this.plot2 = this.plot.curve({ color: Palette.orange, width: 3.5 });
    this.readout1 = fl.add({ tex: "", x: 860, y: 650, size: 30, color: "#ffffff", align: "left" });
    this.readout2 = fl.add({ tex: "", x: 860, y: 700, size: 30, color: Palette.orange, align: "left" });

    this.defFormula = fl.add({ tex: `df_x[v]:=(f\\circ\\gamma)'(0),\\qquad \\gamma(0)=x,\\ \\ \\gamma'(0)=v`, x: 1060, y: 110, size: 38 });
    this.mapFormula = fl.add({ tex: "f:M\\to N:\\quad df_x:T_xM\\to T_{f(x)}N", x: 1060, y: 185, size: 34, color: Palette.muted });
    this.realNote = fl.add({ text: "proof below: f real valued (ℝᵐ: componentwise)", x: 1060, y: 240, size: 26, color: Palette.muted });
    this.question = fl.add({ tex: "\\text{slope depends on }\\gamma\\,?", x: 1080, y: 760, size: 34, color: Palette.red });

    // ---- chart phase
    this.chartPlane = new TangentPlane(stage, Palette.purple, 1.35);
    this.chartPlane.place(new THREE.Vector3(0, 0, PLANE_Z), E3);
    const capPts = sampleCurve((s) => {
      const dir = EAST.clone().multiplyScalar(Math.cos(s)).addScaledVector(NORTH, Math.sin(s));
      return lift(greatCircle(X0, dir, 0.5));
    }, 0, 2 * Math.PI, 90);
    this.capOutline = new Polyline(stage, capPts, { color: Palette.green, width: 3.5 });
    this.capShadow = new Polyline(stage, capPts.map(proj), { color: Palette.green, width: 3 });
    const tc2 = 0.5;
    this.pg1 = new Polyline(stage, sampleCurve((t) => proj(gamma1(t)), -tc2, tc2, 60), { color: "#ffffff", width: 3.5 });
    this.pg2 = new Polyline(stage, sampleCurve((t) => proj(gamma2(t)), -tc2, tc2, 60), { color: Palette.orange, width: 3.5 });
    this.aDot = new Dot(stage, proj(X0), Palette.orange, 0.04, "3d");
    this.aLabel = new WorldLabel(stage, fl, { tex: "a=\\pi(x)", size: 30, color: Palette.orange, align: "right" }, proj(X0), { x: -16, y: 22 });
    const piv = new THREE.Vector3(V.x, V.y, 0);
    this.piV = new Arrow(stage, proj(X0), proj(X0).add(piv), Palette.teal, { mode: "3d", width: 5, headLength: 0.1 });
    this.piVLabel = new WorldLabel(stage, fl, { tex: "\\pi(v)", size: 30, color: Palette.teal, align: "left" }, proj(X0).add(piv), { x: 10, y: 18 });
    const side = EAST.clone().setZ(0).normalize().multiplyScalar(0.13);
    this.downArrow = new Arrow(stage, X0.clone().add(side).setZ(X0.z - 0.12), proj(X0).add(side).setZ(PLANE_Z + 0.1), Palette.text, { mode: "3d", width: 3, headLength: 0.1 });
    this.upArrow = new Arrow(stage, proj(X0).sub(side).setZ(PLANE_Z + 0.1), X0.clone().sub(side).setZ(X0.z - 0.12), Palette.purple, { mode: "3d", width: 3, headLength: 0.1 });
    const mid = (X0.z + PLANE_Z) / 2;
    this.downLabel = new WorldLabel(stage, fl, { tex: "\\varphi=\\pi", size: 30, color: Palette.text, align: "left" }, X0.clone().add(side).setZ(mid), { x: 14, y: 0 });
    this.upLabel = new WorldLabel(stage, fl, { tex: "\\psi(u)=(u,g(u))", size: 30, color: Palette.purple, align: "right" }, X0.clone().sub(side).setZ(mid), { x: -14, y: 0 });
    this.ALabel = new WorldLabel(stage, fl, { tex: "A\\subseteq\\mathbb{R}^{n-k}", size: 30, color: Palette.green, align: "left" }, proj(capPts[70]), { x: 10, y: 20 });

    const RX = 1030;
    this.proofHead = fl.add({ text: "Well-definedness: M = h⁻¹(c) regular level set", x: RX, y: 100, size: 30, color: Palette.muted });
    this.graphFact = fl.add({ tex: "x=(a,b),\\quad M\\cap(A\\times B)=\\{(u,g(u)):u\\in A\\}", x: RX, y: 160, size: 32 });
    this.chartFact = fl.add({ tex: "\\varphi=\\pi\\ \\text{(linear)},\\qquad \\psi(u)=(u,g(u))=\\varphi^{-1}(u)", x: RX, y: 215, size: 32 });
    this.step1 = fl.add({ tex: "", x: RX, y: 300, size: 32 });
    this.step2 = fl.add({ tex: "", x: RX, y: 380, size: 32 });
    this.step3 = fl.add({ tex: "", x: RX, y: 530, size: 32, display: true });
    this.step4 = fl.add({ tex: "", x: RX, y: 520, size: 32, display: true });
    this.toolNote = fl.add({ text: "the chart is only a tool: the definition never mentions it", x: RX, y: 740, size: 26, color: Palette.muted });
    this.generalNote = fl.add({ text: "general smooth manifold: same proof with an arbitrary chart", x: RX, y: 790, size: 26, color: Palette.muted });

    // ---- computing rule
    this.ruleFormula = fl.add({ tex: "f=\\bar f|_{M\\cap U}\\ \\Rightarrow\\ df_x[v]=D\\bar f(x)[v]", x: 1060, y: 330, size: 38 });
    this.extFormula = fl.add({ tex: "", x: 1060, y: 470, size: 32, display: true });
    this.diffFormula = fl.add({ tex: "D\\bar f_2(x)[v]-D\\bar f_1(x)[v]=10\\,x^\\top v=0\\quad (v\\in x^{\\perp})", x: 1060, y: 680, size: 32 });
    this.keepNote = fl.add({ text: "a Euclidean gradient is not intrinsic to M", x: 1060, y: 760, size: 30, color: Palette.red });
    const T = E3.clone().sub(X0.clone().multiplyScalar(X0.z)).multiplyScalar(BAR_SCALE);
    const tip1 = X0.clone().addScaledVector(E3, BAR_SCALE);
    const dir2 = E3.clone().addScaledVector(X0, 10).normalize();
    this.barArrow1 = new Arrow(stage, X0, tip1, Palette.red, { mode: "3d", width: 5, headLength: 0.1 });
    this.barArrow2 = new Arrow(stage, X0, X0.clone().addScaledVector(dir2, 1.1), Palette.red, { mode: "3d", width: 5, headLength: 0.1 });
    this.barTan = new Arrow(stage, X0, X0.clone().add(T), Palette.teal, { mode: "3d", width: 6, headLength: 0.1 });
    this.barNormal = new Polyline(stage, [X0.clone().add(T), X0.clone().add(T).addScaledVector(X0, 1.6)], { color: Palette.red, width: 2, dashed: true, dashSize: 0.05, gapSize: 0.04 });
    this.bar1Label = new WorldLabel(stage, fl, { tex: "\\nabla\\bar f_1=e_3", size: 30, color: Palette.red, align: "right" }, tip1, { x: -12, y: -12 });
    this.bar2Label = new WorldLabel(stage, fl, { tex: "\\nabla\\bar f_2=e_3+10x\\ \\ (\\text{truncated, length}\\approx 10.7)", size: 26, color: Palette.red, align: "left" },
      X0.clone().addScaledVector(dir2, 1.1), { x: 12, y: -6 });
    this.barTanLabel = new WorldLabel(stage, fl, { tex: "\\text{same tangent part}", size: 28, color: Palette.teal, align: "right" }, X0.clone().add(T), { x: -14, y: 18 });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "df_x[v]:=(f\\circ\\gamma)'(0)", at: cue.s(7) + 1.5 },
      { label: "2", tex: "M\\cap(A\\times B)=\\{(u,g(u))\\}", at: cue.s(17) + 2.0 },
      { label: "3", tex: "df_x\\ \\text{well-defined}", at: cue.s(26) + 1.0 },
      { label: "4", tex: "df_x\\ \\text{linear}", at: cue.s(29) + 1.0 },
      { label: "5", tex: "df_x[v]=D\\bar f(x)[v]", at: cue.s(34) + 1.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;

    // ---- camera
    const toChart = c.p(16, 1.4) * (1 - c.p(32, 1.4));
    const toRule = c.p(35, 1.4);
    setOrbitView(this.stage, blendView(blendView(VIEW_MAIN, VIEW_CHART, toChart), VIEW_RULE, toRule));

    const intro = c.p(0, 0.8, -0.6);
    this.sphere.setOpacity(intro);
    const chartPhase = c.p(16, 1.0) * (1 - c.p(32, 1.0));
    const rulePhase = c.p(32, 0.8);
    this.plane.setOpacity(intro * (1 - 0.6 * chartPhase));
    this.xDot.setOpacity(intro);
    this.xLabel.update(intro * (1 - chartPhase));
    const vVis = c.p(0, 0.6, 0.6) * (1 - rulePhase);
    this.vArrow.setOpacity(vVis);
    this.vLabel.update(vVis * (1 - chartPhase));

    // ---- phase A: the straight line leaves the sphere
    const lineVis = c.p(1, 0.6) * (1 - c.p(4, 0.6));
    this.line.setProgress(1);
    this.line.setOpacity(lineVis);
    this.lineLabel.update(c.p(2, 0.6, 0.8) * (1 - c.p(4, 0.6)));

    // ---- phase B/C: curves and the slope plot
    const curvesOff = 1 - c.p(32, 0.8);
    const g1In = c.over(4, 0.1, 0.9);
    this.g1.setProgress(g1In);
    this.g1.setOpacity(g1In > 0 ? curvesOff : 0);
    this.g1Label.update(c.p(5, 0.6) * (1 - chartPhase) * curvesOff);
    const g2In = c.over(12, 0.05, 0.6);
    this.g2.setProgress(g2In);
    this.g2.setOpacity(g2In > 0 ? curvesOff : 0);
    this.g2Label.update(c.p(12, 0.6, 1.2) * (1 - chartPhase) * curvesOff);

    const plotVis = c.p(6, 0.6) * (1 - c.p(15, 0.6));
    this.plot.setOpacity(plotVis);
    const sweep1 = lerp(-T_RANGE, T_RANGE, c.over(6, 0.05, 0.95));
    const sweep2 = lerp(-T_RANGE, T_RANGE, c.over(13, 0.05, 0.9));
    const s1Done = t >= c.e(6);
    this.plot.plot(this.plot1, (s) => gamma1(s).z, -T_RANGE, s1Done ? T_RANGE : sweep1);
    this.plot1.setOpacity(t >= c.s(6) ? plotVis : 0);
    this.plot.plot(this.plot2, (s) => gamma2(s).z, -T_RANGE, t >= c.e(13) ? T_RANGE : sweep2);
    this.plot2.setOpacity(t >= c.s(13) ? plotVis : 0);
    const slope = V.dot(E3);
    this.plot.plot(this.tangentLine, (s) => X0.z + slope * s, -0.85, 0.85, 2);
    this.tangentLine.setOpacity(plotVis * c.p(6, 0.6, 2.5));
    const movingDot = t >= c.s(6) && t < c.e(6) + 0.3 ? 1 : 0;
    this.g1Dot.setPosition(lift(gamma1(s1Done ? 0 : sweep1)));
    this.g1Dot.setOpacity(plotVis * movingDot);
    this.g2Dot.setPosition(lift(gamma2(sweep2)));
    this.g2Dot.setOpacity(plotVis * (t >= c.s(13) && t < c.e(13) + 0.3 ? 1 : 0));
    this.readout1.setContent(`\\gamma_1:\\ (f\\circ\\gamma_1)'(0)=${slopeAt0(gamma1).toFixed(3)}`);
    this.readout2.setContent(`\\gamma_2:\\ (f\\circ\\gamma_2)'(0)=${slopeAt0(gamma2).toFixed(3)}`);
    this.readout1.set({ opacity: plotVis * c.p(6, 0.6, 2.5) });
    this.readout2.set({ opacity: plotVis * c.p(13, 0.6, 1.5) });
    this.question.set({ opacity: c.p(14, 0.6) * (1 - c.p(15, 0.6)) });

    const defVis = c.p(7, 0.7) * (1 - c.p(15, 0.6));
    this.defFormula.set({ opacity: defVis });
    this.mapFormula.set({ opacity: c.p(8, 0.6) * (1 - c.p(15, 0.6)) });
    this.realNote.set({ opacity: c.p(10, 0.6) * (1 - c.p(15, 0.6)) });

    // ---- phase D: graph chart proof
    const chartGeo = c.p(17, 0.8) * (1 - c.p(32, 0.8));
    this.chartPlane.setOpacity(chartGeo);
    this.capOutline.setOpacity(chartGeo);
    this.capShadow.setOpacity(chartGeo);
    this.ALabel.update(chartGeo * c.p(17, 0.6, 1.0));
    this.downArrow.setOpacity(c.p(18, 0.6) * chartGeo);
    this.upArrow.setOpacity(c.p(18, 0.6, 1.5) * chartGeo);
    this.downLabel.update(c.p(18, 0.6) * chartGeo);
    this.upLabel.update(c.p(18, 0.6, 1.5) * chartGeo);
    const proj1 = c.over(21, 0.1, 0.8);
    this.pg1.setProgress(proj1);
    this.pg1.setOpacity(proj1 > 0 ? chartGeo : 0);
    this.pg2.setProgress(proj1);
    this.pg2.setOpacity(proj1 > 0 ? chartGeo : 0);
    this.aDot.setOpacity(chartGeo * c.p(16, 0.6, 1.0));
    this.aLabel.update(chartGeo * c.p(16, 0.6, 1.0));
    const pivVis = chartGeo * c.p(24, 0.6);
    this.piV.setOpacity(pivVis);
    this.piVLabel.update(pivVis);

    const proofText = c.p(15, 0.6) * (1 - c.p(32, 0.6));
    this.proofHead.set({ opacity: proofText });
    this.graphFact.set({ opacity: proofText * c.p(16, 0.6) });
    this.chartFact.set({ opacity: proofText * c.p(18, 0.6) });
    const s1 = t >= c.s(20) ? 2 : t >= c.s(19) ? 1 : 0;
    this.step1.setContent(phantomize(["\\text{1. }|t|<\\delta\\Rightarrow\\gamma(t)\\in A\\times B,", "\\quad \\gamma(t)=\\psi(\\varphi(\\gamma(t)))"], s1));
    this.step1.set({ opacity: proofText * (s1 > 0 ? 1 : 0) });
    const s2 = t >= c.s(22) ? 2 : t >= c.s(21) ? 1 : 0;
    this.step2.setContent(phantomize(["\\text{2. }f\\circ\\gamma=(f\\circ\\psi)\\circ(\\pi\\circ\\gamma)", `\\quad ${tc(Palette.green, "f\\circ\\psi\\ \\text{smooth}")}`], s2));
    this.step2.set({ opacity: proofText * (s2 > 0 ? 1 : 0) });
    const s3 = t >= c.s(25) ? 4 : t >= c.s(24) ? 3 : t >= c.in(23, 0.5) ? 2 : t >= c.s(23) ? 1 : 0;
    const gammaCol = s3 >= 4 ? Palette.red : Palette.text;
    const vCol = s3 >= 4 ? Palette.yellow : Palette.text;
    const g1c = s3 >= 4 ? "\\cancel{\\gamma}" : "\\gamma";
    const g2c = s3 >= 4 ? "\\cancel{\\gamma'(0)}" : "\\gamma'(0)";
    const row = (on: boolean, body: string): string => (on ? body : `\\phantom{${body}}`);
    const step3Tex = `\\begin{aligned}\\text{3. }(f\\circ\\gamma)'(0)&=D(f\\circ\\psi)(a)\\cdot(\\pi\\circ${tc(gammaCol, g1c)})'(0)\\\\` +
      `&${row(s3 >= 2, `=D(f\\circ\\psi)(a)\\cdot\\pi(${tc(gammaCol, g2c)})`)}\\\\` +
      `&${row(s3 >= 3, `=D(f\\circ\\psi)(a)\\cdot\\pi(${tc(vCol, "v")})`)}\\end{aligned}`;
    this.step3.setContent(step3Tex);
    this.step3.set({ opacity: proofText * (s3 > 0 ? 1 : 0) * (1 - c.p(28, 0.5)) });
    const s4 = t >= c.s(29) ? 2 : t >= c.s(28) ? 1 : 0;
    this.step4.setContent(`\\begin{gathered}\\text{4. }v\\ \\xmapsto{\\ \\pi\\ }\\ \\pi(v)\\ \\xmapsto{\\ D(f\\circ\\psi)(a)\\ }\\ D(f\\circ\\psi)(a)\\,\\pi(v)\\\\ ${row(s4 >= 2, tc(Palette.green, "\\text{linear}\\circ\\text{linear}=\\text{linear}"))}\\end{gathered}`);
    this.step4.set({ opacity: proofText * (s4 > 0 ? 1 : 0) });
    this.toolNote.set({ opacity: proofText * c.p(27, 0.6) * (1 - c.p(31, 0.5)) });
    this.generalNote.set({ opacity: proofText * c.p(31, 0.6) });

    // ---- phase E: the computing rule and two extensions
    this.ruleFormula.set({ opacity: c.p(33, 0.6) });
    const extState = t >= c.s(36) ? 2 : t >= c.s(35) ? 1 : 0;
    this.extFormula.setContent(
      `\\begin{aligned}\\bar f_1(x)&=x_3, & df_x[v]&=e_3^\\top v\\\\ ${[["\\bar f_2(x)", "=x_3+5(x^\\top x-1),"], ["\\nabla\\bar f_2", "=e_3+10x"]].map(([l, r]) => extState >= 2 ? `${l}&${r}` : `\\phantom{${l}}&\\phantom{${r}}`).join(" & ")}\\end{aligned}`);
    this.extFormula.set({ opacity: extState > 0 ? 1 : 0 });
    const bar1 = c.p(35, 0.6);
    this.barArrow1.setOpacity(bar1);
    this.bar1Label.update(bar1);
    const bar2 = c.p(37, 0.6);
    this.barArrow2.setOpacity(bar2);
    this.bar2Label.update(bar2);
    const tanVis = c.p(38, 0.6);
    this.barTan.setOpacity(tanVis);
    this.barNormal.setOpacity(tanVis * 0.9);
    this.barTanLabel.update(c.p(39, 0.6));
    this.diffFormula.set({ opacity: c.p(38, 0.6) });
    this.keepNote.set({ opacity: c.p(40, 0.6) });

    this.ledger.update(t, c.p(7, 0.5, 1.0), true);
  }

  teardown(_layers: SceneLayers): void {}
}
