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
import type { SvgPath } from "./lib/SvgOverlay";
import { SvgOverlay } from "./lib/SvgOverlay";
import { heightGrad, lift, normalizeRetract, spherePoint, tangentFrame } from "./lib/sphereMath";

/**
 * E06 c09 — supplementary example: the normalization retraction R_x(v) = (x + v)/‖x + v‖ on the sphere
 * (well defined, conditions (i) and (ii)); the descent property φ'(0) = −‖grad f(x)‖²_x for any retraction,
 * with a numerical check for f = x₃ (slope −(1 − x₃²)) and the limit x → north pole.
 * Sentence indices refer to content/episodes/e06-gradient-retraction/story.en.json, scene c09-sphere-retraction-descent.
 */

const RX = 1060;
const AZ = 30;
const T_PLOT = 2.5;

function tc(color: string, body: string): string {
  return `\\textcolor{${color}}{${body}}`;
}

/** Rows of a gathered/aligned block; rows at index ≥ n are phantoms (each &-cell separately). */
function rows(list: string[], n: number, env = "gathered"): string {
  const hide = (r: string): string => r.split("&").map((cell) => (cell.length ? `\\phantom{${cell}}` : "")).join("&");
  return `\\begin{${env}}${list.map((r, i) => (i < n ? r : hide(r))).join("\\\\ ")}\\end{${env}}`;
}

export class SphereRetractionDescentScene implements Scene {
  readonly id = "c09-sphere-retraction-descent";
  private stage!: StageLayer;

  private sphere!: HeightSphere;
  private plane!: TangentPlane;
  private xDot!: Dot;
  private xLabel!: WorldLabel;
  private originDot!: Dot;
  private vArrow!: Arrow;
  private vLabel!: WorldLabel;
  private xpvDot!: Dot;
  private xpvLabel!: WorldLabel;
  private ray!: Polyline;
  private rDot!: Dot;
  private rLabel!: WorldLabel;
  private triX!: Polyline;
  private triHyp!: Polyline;
  private triRight!: Polyline;
  private oneLabel!: WorldLabel;

  private gArrow!: Arrow;
  private gLabel!: WorldLabel;
  private curve!: Polyline;
  private straight!: Polyline;
  private mover!: Dot;

  private svg!: SvgOverlay;
  private nPlot!: MiniPlot;
  private nCurve!: SvgPath;
  private nTangent!: SvgPath;
  private phiPlot!: MiniPlot;
  private phiCurve!: SvgPath;
  private phiTangent!: SvgPath;
  private slopeReadout!: FormulaHandle;

  private fDefR!: FormulaHandle;
  private fNorm!: FormulaHandle;
  private fCond!: FormulaHandle;
  private fTheorem!: FormulaHandle;
  private fProof!: FormulaHandle;
  private fSign!: FormulaHandle;
  private fNumbers!: FormulaHandle;
  private fFirst!: FormulaHandle;
  private fHyp!: FormulaHandle;

  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);
    const x0 = spherePoint(50, AZ);

    this.sphere = new HeightSphere(stage);
    this.plane = new TangentPlane(stage, Palette.green, 0.8);
    this.xDot = new Dot(stage, x0, Palette.orange, 0.032, "3d");
    this.xLabel = new WorldLabel(stage, fl, { tex: "x", size: 34, color: Palette.orange }, x0, { x: 18, y: -18 });
    this.originDot = new Dot(stage, new THREE.Vector3(), Palette.muted, 0.03, "3d");
    this.vArrow = new Arrow(stage, x0, x0, Palette.teal, { mode: "3d", width: 5, headLength: 0.09 });
    this.vLabel = new WorldLabel(stage, fl, { tex: "v", size: 32, color: Palette.teal }, x0, { x: -16, y: 0 });
    this.xpvDot = new Dot(stage, x0, "#ffffff", 0.03, "3d");
    this.xpvLabel = new WorldLabel(stage, fl, { tex: "x+v", size: 30, color: "#ffffff", align: "right" }, x0, { x: -14, y: 14 });
    this.ray = new Polyline(stage, [new THREE.Vector3(), x0], { color: "#d0d6e6", width: 2 });
    this.rDot = new Dot(stage, x0, Palette.yellow, 0.036, "3d");
    this.rLabel = new WorldLabel(stage, fl, { tex: "R_x(v)", size: 30, color: Palette.yellow, align: "left" }, x0, { x: 16, y: -10 });
    this.triX = new Polyline(stage, [new THREE.Vector3(), x0], { color: Palette.orange, width: 3 });
    this.triHyp = new Polyline(stage, [new THREE.Vector3(), x0], { color: "#ffffff", width: 3 });
    this.triRight = new Polyline(stage, [x0, x0, x0], { color: "#ffffff", width: 2.5 });
    this.oneLabel = new WorldLabel(stage, fl, { tex: "1", size: 30, color: Palette.orange }, x0, { x: 12, y: 0 });

    this.gArrow = new Arrow(stage, x0, x0, "#ffffff", { mode: "3d", width: 6, headLength: 0.1 });
    this.gLabel = new WorldLabel(stage, fl, { tex: "-\\operatorname{grad}f(x)", size: 30, color: "#ffffff", align: "left" }, x0, { x: 14, y: 20 });
    this.curve = new Polyline(stage, sampleCurve(() => x0, 0, 1, 60), { color: "#ffffff", width: 4 });
    this.straight = new Polyline(stage, [x0, x0], { color: Palette.red, width: 2.5, dashed: true, dashSize: 0.05, gapSize: 0.04 });
    this.mover = new Dot(stage, x0, Palette.orange, 0.038, "3d");

    this.svg = new SvgOverlay(fl);
    this.nPlot = new MiniPlot(this.svg, fl, { x: 880, y: 470, w: 380, h: 170, xMin: -1.5, xMax: 1.5, yMin: 0, yMax: 1.9,
      xLabel: "t", yLabel: "N(t)=\\|x+tv\\|" });
    this.nTangent = this.nPlot.curve({ color: Palette.yellow, width: 2.5, dash: "8 6" });
    this.nCurve = this.nPlot.curve({ color: Palette.teal, width: 3 });
    this.phiPlot = new MiniPlot(this.svg, fl, { x: 880, y: 420, w: 380, h: 230, xMin: 0, xMax: T_PLOT, yMin: -1.3, yMax: 0.3,
      xLabel: "t", yLabel: "\\varphi(t)-\\varphi(0)" });
    this.phiTangent = this.phiPlot.curve({ color: Palette.yellow, width: 2.5, dash: "8 6" });
    this.phiCurve = this.phiPlot.curve({ color: "#ffffff", width: 3.5 });
    this.slopeReadout = fl.add({ tex: "", x: RX, y: 730, size: 26 });

    this.fDefR = fl.add({ tex: "R_x(v)=\\dfrac{x+v}{\\|x+v\\|},\\qquad v\\in T_xS^{n-1}=x^{\\perp}", x: RX, y: 130, size: 34 });
    this.fNorm = fl.add({ tex: "", x: RX, y: 270, size: 30, display: true });
    this.fCond = fl.add({ tex: "", x: RX, y: 330, size: 28, display: true });
    this.fTheorem = fl.add({ tex: "\\begin{gathered}\\textbf{Theorem: } R_x\\ \\text{any retraction at } x\\\\ \\varphi(t)=f(R_x(-t\\operatorname{grad}f(x)))\\\\ \\Rightarrow\\ \\varphi'(0)=-\\|\\operatorname{grad}f(x)\\|_x^2\\end{gathered}",
      x: RX, y: 150, size: 28, display: true, boxed: true });
    this.fProof = fl.add({ tex: "", x: RX, y: 440, size: 25, display: true });
    this.fSign = fl.add({ tex: "", x: RX, y: 690, size: 26, display: true });
    this.fNumbers = fl.add({ tex: "", x: RX, y: 300, size: 30, display: true });
    this.fFirst = fl.add({ text: "first order only: no size of t̄, no step-size rule", x: RX, y: 790, size: 26, color: Palette.muted });
    this.fHyp = fl.add({ tex: "", x: RX, y: 300, size: 28, display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "\\|x+v\\|^2=1+\\|v\\|^2\\ge1", at: cue.s(6) + 1.0 },
      { label: "2", tex: "R_x(0)=x,\\ \\ d(R_x)_0=\\mathrm{id}", at: cue.s(13) + 2.0 },
      { label: "3", tex: "\\varphi'(0)=-\\|\\operatorname{grad}f(x)\\|_x^2", at: cue.s(23) + 1.0 },
      { label: "4", tex: "\\varphi(t)<\\varphi(0)\\ \\ (0<t<\\bar t)", at: cue.s(25) + 2.0 },
      { label: "5", tex: "\\varphi'(0)<0\\iff\\operatorname{grad}f(x)\\neq0", at: cue.s(33) + 1.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    setOrbitView(this.stage, { azDeg: 80, elDeg: 18, distance: 6.4, fovDeg: 36, center: new THREE.Vector3(0, 0, 0.05), shift: 1.55, lift: -0.1 });

    // base point: fixed at polar 50°, moved toward the north pole in s32
    const polar = lerp(50, 6, c.over(32, 0.1, 0.9));
    const x = spherePoint(polar, AZ);
    const { east, north } = tangentFrame(x);
    const g = heightGrad(x);
    const G2 = g.lengthSq();

    // ---- phase A: the normalization map (s0–s7)
    const phaseA = c.p(0, 0.6, -0.4) * (1 - c.p(8, 0.6));
    const seeThrough = phaseA;
    this.sphere.setOpacity(c.p(0, 0.8, -0.6) * (1 - 0.6 * seeThrough), 1);
    this.plane.place(x, x);
    this.plane.setOpacity(0.75 * c.p(0, 0.6));
    this.xDot.setPosition(x);
    this.xDot.setOpacity(c.p(0, 0.6));
    this.xLabel.setAnchor(x);
    this.xLabel.update(c.p(0, 0.6));
    const ang = t < c.s(3) ? lerp(-Math.PI / 2 - 0.9, -Math.PI / 2 + 0.9, c.over(1, 0.1, 1.0) * 0.5 + c.over(2, 0.0, 1.0) * 0.5) : -Math.PI / 2;
    const vLen = t < c.s(3) ? 0.55 + 0.25 * Math.sin(2 * ang) : 0.75;
    const v = east.clone().multiplyScalar(Math.cos(ang) * vLen).addScaledVector(north, Math.sin(ang) * vLen);
    const xpv = x.clone().add(v);
    const r = normalizeRetract(x, v);
    const showV = phaseA * c.p(1, 0.5);
    this.vArrow.set(x, xpv);
    this.vArrow.setOpacity(showV);
    this.vLabel.setAnchor(x.clone().addScaledVector(v, 0.5));
    this.vLabel.update(showV);
    this.xpvDot.setPosition(xpv);
    this.xpvDot.setOpacity(showV);
    this.xpvLabel.setAnchor(xpv);
    this.xpvLabel.update(showV);
    const rayO = phaseA * c.p(2, 0.5) * (1 - c.p(4, 0.5));
    this.ray.setPoints([new THREE.Vector3(), xpv]);
    this.ray.setOpacity(rayO);
    this.originDot.setOpacity(phaseA * c.p(2, 0.5));
    this.rDot.setPosition(lift(r, 1.01));
    this.rDot.setOpacity(phaseA * c.p(1, 0.5, 0.8));
    this.rLabel.setAnchor(lift(r, 1.01));
    this.rLabel.update(phaseA * c.p(1, 0.5, 0.8));
    const tri = phaseA * c.p(4, 0.5);
    this.triX.setPoints([new THREE.Vector3(), x]);
    this.triX.setOpacity(tri);
    this.triHyp.setPoints([new THREE.Vector3(), xpv]);
    this.triHyp.setOpacity(tri);
    const vh = v.clone().normalize().multiplyScalar(0.08);
    const xh = x.clone().multiplyScalar(-0.08);
    this.triRight.setPoints([x.clone().add(xh), x.clone().add(xh).add(vh), x.clone().add(vh)]);
    this.triRight.setOpacity(tri * c.p(5, 0.5));
    this.oneLabel.setAnchor(x.clone().multiplyScalar(0.5));
    this.oneLabel.update(tri * c.p(5, 0.5));
    this.fDefR.set({ opacity: c.p(1, 0.6) * (1 - c.p(14, 0.6)) });
    const nm = t >= c.s(7) ? 4 : t >= c.s(6) ? 3 : t >= c.s(5) ? 2 : t >= c.s(4) ? 1 : 0;
    this.fNorm.setContent(rows([
      "\\|x+v\\|^2=\\|x\\|^2+2x^\\top v+\\|v\\|^2=1+\\|v\\|^2",
      "\\text{(Pythagoras: } x\\perp v,\\ \\|x\\|=1)",
      "\\Rightarrow\\ \\|x+v\\|\\ge1>0,\\quad \\|R_x(v)\\|=1",
      "R_x\\ \\text{smooth (quotient, denominator}\\neq0)",
    ], nm));
    this.fNorm.set({ opacity: (nm > 0 ? 1 : 0) * (1 - c.p(8, 0.5)) });

    // ---- phase B: conditions (i), (ii) (s8–s13)
    const cd = t >= c.s(13) ? 5 : t >= c.s(12) ? 4 : t >= c.s(10) ? 3 : t >= c.s(9) ? 2 : t >= c.s(8) ? 1 : 0;
    this.fCond.setContent(rows([
      "\\text{(i)}\\ R_x(0)=x/\\|x\\|=x",
      "\\text{(ii)}\\ N(t)=\\|x+tv\\|=\\sqrt{1+t^2\\|v\\|^2}",
      "N(0)=1,\\quad N'(t)=\\tfrac{t\\|v\\|^2}{\\sqrt{1+t^2\\|v\\|^2}},\\quad N'(0)=0",
      "\\tfrac{d}{dt}\\tfrac{x+tv}{N(t)}\\Big|_0=\\tfrac{v\\,N(0)-x\\,N'(0)}{N(0)^2}",
      `=\\tfrac{v\\cdot1-x\\cdot0}{1}=v\\ \\Rightarrow\\ ${tc(Palette.green, "d(R_x)_0=\\mathrm{id}")}`,
    ], cd));
    this.fCond.set({ opacity: (cd > 0 ? 1 : 0) * (1 - c.p(14, 0.6)) });
    const nVis = c.p(10, 0.6) * (1 - c.p(12, 0.5));
    this.nPlot.setOpacity(nVis);
    const vv = 0.75;
    this.nPlot.plot(this.nCurve, (s) => Math.sqrt(1 + s * s * vv * vv), -1.5, 1.5, 80);
    this.nCurve.setOpacity(nVis);
    this.nPlot.plot(this.nTangent, () => 1, -1.0, 1.0, 2);
    this.nTangent.setOpacity(nVis * c.p(11, 0.5));

    // ---- phase C: combine (s14–s15) and later
    const phaseC = c.p(14, 0.6);
    const gVis = phaseC;
    this.gArrow.set(x, x.clone().sub(g));
    this.gArrow.setOpacity(gVis * (g.length() > 0.03 ? 1 : 0));
    this.gLabel.setAnchor(x.clone().sub(g));
    this.gLabel.update(gVis * (1 - c.p(32, 0.5)));
    this.curve.setPoints(sampleCurve((s) => lift(normalizeRetract(x, g.clone().multiplyScalar(-s))), 0, 1.2, 60));
    this.curve.setOpacity(phaseC);
    this.straight.setPoints([x, x.clone().addScaledVector(g, -1.0)]);
    this.straight.setOpacity(0.45 * phaseC * (1 - c.p(16, 0.5)));
    const tm = 0.4 * c.over(15, 0.1, 0.8);
    this.mover.setPosition(lift(normalizeRetract(x, g.clone().multiplyScalar(-tm)), 1.012));
    this.mover.setOpacity(c.p(15, 0.4) * (1 - c.p(16, 0.5)));

    // ---- phase D: theorem and proof (s16–s25)
    const thO = c.p(16, 0.6) * (1 - c.p(26, 0.6));
    this.fTheorem.set({ opacity: thO });
    const pr = t >= c.s(23) ? 7 : t >= c.s(22) ? 6 : t >= c.s(21) ? 5 : t >= c.s(20) ? 4 : t >= c.s(19) ? 2 : t >= c.s(18) ? 1 : 0;
    const why = (s: string): string => `\\quad ${tc(Palette.muted, `\\text{${s}}`)}`;
    this.fProof.setContent(rows([
      `v:=-\\operatorname{grad}f(x)\\in T_xM,\\ \\ \\gamma(t):=R_x(tv)&`,
      `\\gamma(0)=x,\\ \\ \\gamma'(0)=v&${why("chapter 8")}`,
      `\\varphi'(0)=(f\\circ\\gamma)'(0)=df_x[\\gamma'(0)]&${why("curve definition")}`,
      `=df_x[-\\operatorname{grad}f(x)]&${why("since }\\gamma'(0)=v\\text{")}`,
      `=-df_x[\\operatorname{grad}f(x)]&${why("linearity")}`,
      `=-g_x(\\operatorname{grad}f(x),\\operatorname{grad}f(x))&${why("gradient def.")}`,
      `=${tc(Palette.yellow, "-\\|\\operatorname{grad}f(x)\\|_x^2")}&`,
    ], pr, "aligned"));
    this.fProof.set({ opacity: (pr > 0 ? 1 : 0) * (1 - c.p(26, 0.6)) });
    const sg = t >= c.s(25) ? 2 : t >= c.s(24) ? 1 : 0;
    this.fSign.setContent(rows([
      "\\operatorname{grad}f(x)\\neq0\\ \\Rightarrow\\ \\varphi'(0)<0\\ \\ (\\text{pos. def.})",
      "\\tfrac{\\varphi(t)-\\varphi(0)}{t}\\to\\varphi'(0)<0\\ \\Rightarrow\\ \\exists\\bar t:\\ \\varphi(t)<\\varphi(0),\\ 0<t<\\bar t",
    ], sg));
    this.fSign.set({ opacity: (sg > 0 ? 1 : 0) * (1 - c.p(26, 0.6)) });

    // ---- phase E: numbers and the φ plot (s26–s29), also used in s32–s33
    const nu = t >= c.s(27) ? 2 : t >= c.s(26) ? 1 : 0;
    const x3 = x.z;
    this.fNumbers.setContent(rows([
      "f=x_3:\\ \\ \\|\\operatorname{grad}f\\|^2=\\|e_3-x_3x\\|^2=1-x_3^2",
      `x_3=\\cos50^\\circ\\ \\Rightarrow\\ \\varphi'(0)=-(1-x_3^2)\\approx${(-(1 - Math.cos((50 * Math.PI) / 180) ** 2)).toFixed(3)}`,
    ], nu));
    this.fNumbers.set({ opacity: (nu > 0 ? 1 : 0) * (1 - c.p(30, 0.5)) });
    const plotO = c.p(28, 0.6) * (1 - c.p(30, 0.5)) + c.p(32, 0.5);
    this.phiPlot.setOpacity(Math.min(1, plotO));
    this.phiPlot.plot(this.phiCurve, (s) => normalizeRetract(x, g.clone().multiplyScalar(-s)).z - x3, 0, T_PLOT, 100);
    this.phiCurve.setOpacity(Math.min(1, plotO));
    this.phiPlot.plot(this.phiTangent, (s) => -G2 * s, 0, T_PLOT, 2);
    this.phiTangent.setOpacity(Math.min(1, plotO));
    const measured = (normalizeRetract(x, g.clone().multiplyScalar(-1e-4)).z - x3) / 1e-4;
    this.slopeReadout.setContent(`\\text{measured slope}=${measured.toFixed(3)},\\qquad -\\|\\operatorname{grad}f\\|^2=${(-G2).toFixed(3)}`);
    this.slopeReadout.set({ opacity: Math.min(1, plotO) });
    this.fFirst.set({ opacity: c.p(29, 0.5) * (1 - c.p(30, 0.5)) });

    // ---- phase F: every hypothesis was used (s30–s31)
    const hy = t >= c.s(31) ? 3 : t >= c.s(30) ? 2 : 0;
    this.fHyp.setContent(rows([
      `\\text{(ii) fails: } \\gamma'(0)\\neq v\\ \\Rightarrow\\ \\text{slope}`,
      `${tc(Palette.red, "-2\\|\\operatorname{grad}f\\|^2")}\\ \\text{or}\\ ${tc(Palette.red, "-\\|\\operatorname{grad}f\\|^2\\cos\\theta")}`,
      `\\nabla\\bar f\\notin T_xM\\ \\Rightarrow\\ ${tc(Palette.red, "R_x(-t\\nabla\\bar f)\\ \\text{undefined}")}`,
    ], hy));
    this.fHyp.set({ opacity: (hy > 0 ? 1 : 0) * (1 - c.p(32, 0.5)) });

    this.ledger.update(t, c.p(6, 0.5, 1.0), true);
  }

  teardown(_layers: SceneLayers): void {}
}
