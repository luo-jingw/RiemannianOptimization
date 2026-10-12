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
import { setOrbitView } from "../e06-gradient-retraction/lib/SphereCamera";
import type { SvgDot, SvgPath } from "../e06-gradient-retraction/lib/SvgOverlay";
import { SvgOverlay } from "../e06-gradient-retraction/lib/SvgOverlay";
import { RayleighSphere } from "./lib/RayleighSphere";
import { lift, rayleighGrad, retract, rgdFixed, spherePoint } from "./lib/rayleigh";
import { Tex } from "./lib/tex";

/**
 * E07 c01 — from one step to an algorithm (Boumal ch. 4 opening, Def. 4.1, Ex. 4.2): the RGD iteration on the
 * Rayleigh quotient, global / local / strict minimizers on a circle function, non-existence (eˣ) and non-uniqueness
 * (±e₃), limits versus accumulation points ((−1)ᵏ, 1/(k+1) in (0, 1)), the proof that a limit is the only
 * accumulation point, and its failure on the line with two origins.
 * Sentence indices refer to content/episodes/e07-gradient-descent/story.en.json, scene c01-problem-and-sequences.
 */

const X0 = spherePoint(58, 28);
const STEP = 1 / 3;
const CX = 680;                                  // center of the work area left of the ledger

/** f(θ) on the circle, with one global minimizer (θ ≈ −1.865) and one local minimizer (θ ≈ 1.978). */
function circleCost(theta: number): number {
  return 0.8 * Math.cos(theta) + 0.6 * Math.cos(2 * theta) + 0.35 * Math.sin(theta);
}

export class ProblemAndSequencesScene implements Scene {
  readonly id = "c01-problem-and-sequences";
  private stage!: StageLayer;

  private sphere!: RayleighSphere;
  private xDot!: Dot;
  private xLabel!: WorldLabel;
  private gArrow!: Arrow;
  private curve!: Polyline;
  private mover!: Dot;
  private iterates: THREE.Vector3[] = [];
  private path!: Polyline;
  private iterDots: Dot[] = [];

  private svg!: SvgOverlay;
  private cPlot!: MiniPlot;
  private cCurve!: SvgPath;
  private cMarks: SvgDot[] = [];
  private cBrackets: SvgPath[] = [];
  private ePlot!: MiniPlot;
  private eCurve!: SvgPath;
  private eAsym!: SvgPath;
  private line!: MiniPlot;
  private seqDots: SvgDot[] = [];
  private hoods: SvgPath[] = [];
  private openEnds: SvgDot[] = [];
  private openFill: SvgDot[] = [];
  private twoLine!: SvgPath;
  private twoLineR!: SvgPath;
  private twoOrigins: SvgDot[] = [];
  private twoHoods: SvgPath[] = [];
  private twoDots: SvgDot[] = [];

  private fIter!: FormulaHandle;
  private fCost!: FormulaHandle;
  private fDefs!: FormulaHandle;
  private fLabels: FormulaHandle[] = [];
  private fSeqDefs!: FormulaHandle;
  private fSeqNote!: FormulaHandle;
  private fProof!: FormulaHandle;
  private fTwo!: FormulaHandle;
  private fTopo!: FormulaHandle;
  private fOrigins: FormulaHandle[] = [];

  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    this.sphere = new RayleighSphere(stage);
    const g = rayleighGrad(X0);
    this.xDot = new Dot(stage, lift(X0, 1.01), Palette.orange, 0.032, "3d");
    this.xLabel = new WorldLabel(stage, fl, { tex: "x", size: 34, color: Palette.orange }, X0, { x: -18, y: 14 });
    this.gArrow = new Arrow(stage, X0, X0.clone().sub(g.clone().multiplyScalar(0.4)), "#ffffff", { mode: "3d", width: 6, headLength: 0.09 });
    this.curve = new Polyline(stage, sampleCurve((a) => lift(retract(X0, g.clone().multiplyScalar(-a))), 0, STEP, 40), { color: "#ffffff", width: 3 });
    this.mover = new Dot(stage, X0, Palette.orange, 0.03, "3d");
    this.iterates = rgdFixed(X0, 14, STEP);
    this.path = new Polyline(stage, this.iterates.map((p) => lift(p, 1.012)), { color: Palette.orange, width: 3.5 });
    this.iterates.forEach((p) => this.iterDots.push(new Dot(stage, lift(p, 1.014), Palette.orange, 0.022, "3d")));

    this.svg = new SvgOverlay(fl);
    this.cPlot = new MiniPlot(this.svg, fl, { x: 230, y: 420, w: 560, h: 260, xMin: -Math.PI, xMax: Math.PI, yMin: -1.3, yMax: 1.8,
      xLabel: "\\theta", yLabel: "f(\\theta)\\ \\text{on } S^1" });
    this.cCurve = this.cPlot.curve({ color: "#ffffff", width: 3 });
    for (let i = 0; i < 2; i++) {
      this.cBrackets.push(this.cPlot.curve({ color: i === 0 ? Palette.green : Palette.yellow, width: 4 }));
      this.cMarks.push(this.svg.dot(i === 0 ? Palette.green : Palette.yellow, 8));
    }
    this.fLabels.push(fl.add({ text: "global", x: 0, y: 0, size: 24, color: Palette.green }));
    this.fLabels.push(fl.add({ text: "local", x: 0, y: 0, size: 24, color: Palette.yellow }));
    this.ePlot = new MiniPlot(this.svg, fl, { x: 940, y: 470, w: 380, h: 210, xMin: -3, xMax: 1.2, yMin: -0.3, yMax: 3.2,
      xLabel: "x", yLabel: "e^x" });
    this.eCurve = this.ePlot.curve({ color: "#ffffff", width: 3 });
    this.eAsym = this.ePlot.curve({ color: Palette.red, width: 2, dash: "6 6" });

    this.line = new MiniPlot(this.svg, fl, { x: 260, y: 470, w: 860, h: 160, xMin: -1.5, xMax: 1.5, yMin: -1, yMax: 1,
      xLabel: "", yLabel: "" });
    for (let i = 0; i < 12; i++) this.seqDots.push(this.svg.dot(Palette.orange, 7));
    for (let i = 0; i < 2; i++) this.hoods.push(this.line.curve({ color: Palette.green, width: 5 }));
    for (let i = 0; i < 2; i++) {
      this.openEnds.push(this.svg.dot(Palette.blue, 9));
      this.openFill.push(this.svg.dot(Palette.background, 6));
    }
    this.twoLine = this.svg.path({ color: Palette.blue, width: 3 });
    this.twoLineR = this.svg.path({ color: Palette.blue, width: 3 });
    for (let i = 0; i < 2; i++) {
      this.twoOrigins.push(this.svg.dot(Palette.purple, 8));
      this.twoHoods.push(this.svg.path({ color: Palette.green, width: 5 }));
      this.fOrigins.push(fl.add({ tex: i === 0 ? "0_a" : "0_b", x: 0, y: 0, size: 28, color: Palette.purple }));
    }
    for (let i = 0; i < 8; i++) this.twoDots.push(this.svg.dot(Palette.orange, 6));

    this.fIter = fl.add({ tex: "x_{k+1}=R_{x_k}\\big(-\\alpha_k\\operatorname{grad}f(x_k)\\big)", x: CX, y: 110, size: 40 });
    this.fCost = fl.add({ tex: "f(x)=\\tfrac12x^\\top Ax,\\qquad A=\\operatorname{diag}(4,2,1),\\qquad x\\in S^2", x: CX, y: 180, size: 32 });
    this.fDefs = fl.add({ tex: "", x: CX, y: 200, size: 28, display: true });
    this.fSeqDefs = fl.add({ tex: "", x: CX, y: 200, size: 28, display: true });
    this.fSeqNote = fl.add({ tex: "", x: CX, y: 730, size: 28 });
    this.fProof = fl.add({ tex: "", x: CX, y: 420, size: 30, display: true });
    this.fTwo = fl.add({ tex: "\\text{line with two origins: } \\tfrac1k\\to0_a\\ \\text{ and }\\ \\tfrac1k\\to0_b", x: CX, y: 730, size: 28 });

    this.fTopo = fl.add({ tex: "", x: CX, y: 430, size: 34, display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "\\min_{x\\in M}f(x)\\ \\text{needs only topology}", at: cue.e(15) },
      { label: "2", tex: "\\text{metric, retraction: our choice}", at: cue.e(16) },
      { label: "3", tex: "x_k\\to x\\ \\Rightarrow\\ \\text{accumulation points}=\\{x\\}", at: cue.e(31) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    setOrbitView(this.stage, { azDeg: 25, elDeg: 30, distance: 5.6, fovDeg: 34, center: new THREE.Vector3(0, 0, 0.15), shift: 0.9, lift: -0.05 });

    // ---- phase A: one step, then the algorithm (s0–s6); the sphere returns for ±e₃ in s13
    const sphereO = c.p(0, 0.8, -0.8) * (1 - c.p(7, 0.6)) + c.p(13, 0.5) * (1 - c.p(14, 0.5));
    this.sphere.setOpacity(sphereO, 1, t >= c.s(13) ? 1 : c.p(6, 0.6));
    const stepO = sphereO * (1 - c.p(3, 0.5));
    this.xDot.setOpacity(stepO);
    this.xLabel.update(stepO);
    this.gArrow.setOpacity(stepO * c.p(1, 0.5));
    this.curve.setOpacity(stepO * c.p(1, 0.5, 0.6));
    this.curve.setProgress(c.over(1, 0.3, 0.9));
    const g = rayleighGrad(X0);
    this.mover.setPosition(lift(retract(X0, g.clone().multiplyScalar(-STEP * c.over(2, 0.1, 0.7))), 1.014));
    this.mover.setOpacity(stepO * c.p(2, 0.4));
    const runO = c.p(3, 0.5) * (1 - c.p(7, 0.6));
    const shown = Math.min(this.iterates.length, 1 + Math.floor(c.over(3, 0.0, 1.0) * 0.5 * (this.iterates.length - 1) + c.over(4, 0, 0.8) * 0.5 * (this.iterates.length - 1) + 1e-9));
    this.path.setPoints(this.iterates.slice(0, Math.max(2, shown)).map((p) => lift(p, 1.012)));
    this.path.setOpacity(shown >= 2 ? runO : 0);
    this.iterDots.forEach((d, k) => d.setOpacity(k < shown ? runO : 0));
    this.fIter.set({ opacity: c.p(4, 0.6) * (1 - c.p(7, 0.6)) });
    this.fCost.set({ opacity: c.p(5, 0.6) * (1 - c.p(7, 0.6)) + c.p(13, 0.5) * (1 - c.p(14, 0.5)) });

    // ---- phase B: minimizers (s7–s16)
    const minO = c.p(8, 0.6) * (1 - c.p(14, 0.6));
    const dn = Tex.count(t, [c.s(8), c.s(9), c.s(10)]);
    this.fDefs.setContent(Tex.rows([
      "\\text{global: } f(x)\\le f(y)\\quad\\forall y\\in M",
      "\\text{local: } f(x)\\le f(y)\\quad\\forall y\\in U\\ni x\\ \\text{(a neighborhood)}",
      "\\text{strict local: } f(x)<f(y)\\quad\\forall y\\in U\\setminus\\{x\\}",
    ], dn));
    this.fDefs.set({ opacity: (dn > 0 ? 1 : 0) * minO * (1 - c.p(13, 0.4)) });
    const cO = c.p(11, 0.6) * (1 - c.p(14, 0.6));
    this.cPlot.setOpacity(cO);
    this.cPlot.plot(this.cCurve, circleCost, -Math.PI, Math.PI, 160);
    this.cCurve.setOpacity(cO);
    [-1.865, 1.978].forEach((th, i) => {
      const q = this.cPlot.px(th, circleCost(th));
      this.cMarks[i].set(q.x, q.y, cO);
      this.cPlot.plot(this.cBrackets[i], () => -1.15, th - 0.55, th + 0.55, 2);
      this.cBrackets[i].setOpacity(cO * c.p(11, 0.5, 1.2));
      this.fLabels[i].set({ x: q.x, y: q.y + 34, opacity: cO });
    });
    const eO = c.p(12, 0.6) * (1 - c.p(13, 0.5));
    this.ePlot.setOpacity(eO);
    this.ePlot.plot(this.eCurve, (x) => Math.exp(x), -3, 1.15, 100);
    this.eCurve.setOpacity(eO);
    this.ePlot.plot(this.eAsym, () => 0, -3, 1.2, 2);
    this.eAsym.setOpacity(eO);

    const tp = Tex.count(t, [c.s(14), c.s(15), c.s(16)]);
    this.fTopo.setContent(Tex.rows([
      "\\text{set } M,\\ \\text{function } f,\\ \\text{neighborhoods}\\ \\Rightarrow\\ \\text{the problem}",
      `${Tex.color(Palette.muted, "\\text{no smooth structure needed}")}`,
      `${Tex.color(Palette.yellow, "\\text{metric, retraction: tools we choose}")}`,
    ], tp));
    this.fTopo.set({ opacity: (tp > 0 ? 1 : 0) * (1 - c.p(17, 0.5)) });

    // ---- phase C: limits and accumulation points (s17–s26)
    const sd = Tex.count(t, [c.s(18), c.s(19)]);
    this.fSeqDefs.setContent(Tex.rows([
      "x=\\lim x_k:\\ \\ \\forall U\\ni x\\ \\exists K:\\ x_K,x_{K+1},\\ldots\\in U",
      "x\\ \\text{accumulation point: limit of a subsequence}\\iff\\forall U\\ni x:\\ \\text{infinitely many } x_k\\in U",
    ], sd));
    this.fSeqDefs.set({ opacity: (sd > 0 ? 1 : 0) * (1 - c.p(27, 0.6)) });
    const lineO = c.p(21, 0.6) * (1 - c.p(27, 0.6));
    this.line.setOpacity(lineO);
    const alt = t < c.s(24);
    const nSeq = alt ? 1 + Math.floor(c.over(21, 0.1, 0.9) * 11 + 1e-9) : 1 + Math.floor(c.over(25, 0.05, 0.9) * 11 + 1e-9);
    this.seqDots.forEach((d, k) => {
      const xv = alt ? (k % 2 === 0 ? 1 : -1) : 1 / (k + 1);
      const jitter = alt ? -0.55 + 0.1 * k : 0;
      const q = this.line.px(xv, alt ? jitter * 0.5 : 0);
      d.set(q.x, q.y, lineO * (k < nSeq ? 1 : 0) * (alt ? 1 : 0.4 + 0.6 * (k + 1) / nSeq));
    });
    [-1, 1].forEach((xv, i) => {
      this.line.plot(this.hoods[i], () => 0.75, xv - 0.18, xv + 0.18, 2);
      this.hoods[i].setOpacity(lineO * (alt ? c.p(22, 0.5) : 0));
    });
    [0, 1].forEach((xv, i) => {
      const q = this.line.px(xv, 0);
      const on = lineO * (alt ? 0 : c.p(24, 0.5));
      this.openEnds[i].setColor(i === 0 && t >= c.s(25) ? Palette.red : Palette.blue);
      this.openEnds[i].set(q.x, q.y, on);
      this.openFill[i].set(q.x, q.y, on);
    });
    const note = t >= c.s(24) ? "M=(0,1):\\ \\ \\tfrac1{k+1}\\to0\\ \\text{in } \\mathbb R,\\ \\ 0\\notin M\\ \\Rightarrow\\ \\text{no limit in } M"
      : t >= c.s(23) ? "x_k=k:\\ \\text{neither};\\qquad 0,1,0,3,0,5,\\ldots:\\ \\text{one accumulation point, no limit}"
        : "x_k=(-1)^k:\\ \\ \\text{two accumulation points } \\pm1,\\ \\text{no limit}";
    this.fSeqNote.setContent(note);
    this.fSeqNote.set({ opacity: lineO * c.p(22, 0.5) });

    // ---- phase D: the proof (s27–s31) and the line with two origins (s32)
    const pr = Tex.count(t, [c.s(27), c.s(28), c.s(29), c.s(30), c.s(31)]);
    this.fProof.setContent(Tex.rows([
      `${Tex.color(Palette.yellow, "x_k\\to x\\ \\Rightarrow\\ \\text{every accumulation point } y=x")}`,
      "y=\\lim_j x_{k_j}\\ \\ (\\text{a subsequence})",
      "U\\ni x\\ \\text{contains } x_k\\ \\forall k\\ge K\\ \\Rightarrow\\ x_{k_j}\\in U\\ \\text{for } k_j\\ge K",
      "x_{k_j}\\to x\\ \\text{ and }\\ x_{k_j}\\to y",
      `\\text{Hausdorff}\\ \\Rightarrow\\ \\text{limits unique}\\ \\Rightarrow\\ ${Tex.color(Palette.green, "y=x")}`,
    ], pr));
    this.fProof.set({ opacity: (pr > 0 ? 1 : 0) * (1 - c.p(32, 0.5)) });
    const twoO = c.p(32, 0.6) * (1 - c.p(33, 0.6, 1.0));
    const y0 = 520;
    const x0 = CX;
    const sc = 360;
    // the real line with its origin doubled: both origins sit off the line, every other point is shared
    this.twoLine.setPoints([{ x: x0 - 1.4 * sc, y: y0 }, { x: x0 - 8, y: y0 }]);
    this.twoLine.setOpacity(twoO);
    this.twoLineR.setPoints([{ x: x0 + 8, y: y0 }, { x: x0 + 1.4 * sc, y: y0 }]);
    this.twoLineR.setOpacity(twoO);
    this.twoHoods.forEach((h, i) => {
      const dy = i === 0 ? -28 : 28;
      h.setPoints([{ x: x0 - 0.22 * sc, y: y0 + dy / 2 }, { x: x0 + 0.22 * sc, y: y0 + dy / 2 }]);
      h.setOpacity(twoO * c.p(32, 0.5, 1.5));
      this.twoOrigins[i].set(x0, y0 + dy, twoO);
      this.fOrigins[i].set({ x: x0 - 34, y: y0 + dy, opacity: twoO });
    });
    this.twoDots.forEach((d, k) => {
      const xv = 1 / (k + 1);
      d.set(x0 + xv * sc, y0, twoO * (0.4 + 0.6 * (k + 1) / 8));
    });
    this.fTwo.set({ opacity: twoO });

    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
