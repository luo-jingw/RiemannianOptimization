import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Arrow } from "../../primitives/Arrow";
import { CurvedArrow } from "../../primitives/CurvedArrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { Palette } from "../../primitives/Palette";
import { Polyline, sampleCurve } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Region } from "../../primitives/Region";
import { flash } from "./lib/Flash";
import { LabelPlacer } from "./lib/LabelPlacer";
import { PixelFrame } from "./lib/PixelFrame";
import { Shapes } from "./lib/Shapes";
import { Tex } from "./lib/Tex";

/**
 * E02 c05 — why charts must be smoothly compatible. ℝ with the charts id and κ(p) = p³;
 * the function f(p) = p is smooth in one chart and not differentiable in the other; definitions of
 * smooth compatibility, smooth atlas and maximal atlas; proof that every smooth atlas lies in exactly
 * one maximal atlas (ledger).
 * Default view (0, 0, 9); positions in pixels through PixelFrame.
 * Sentence indices refer to content/episodes/e02-smooth-manifolds/story.en.json, scene c05-why-compatibility.
 */

const W = PixelFrame.world;
const LINE_X = (v: number): number => 700 + 300 * v;      // pixel x of value v on the three lines
const Y_X = 250;                                          // pixel y of the x-axis (chart id)
const Y_M = 400;                                          // pixel y of the manifold line M = ℝ
const Y_U = 550;                                          // pixel y of the u-axis (chart κ)
const SAMPLES = [-1.2, -0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9, 1.2];
const G1 = PixelFrame.frame(430, 450, 190);               // graph of f∘id⁻¹
const G2 = PixelFrame.frame(1080, 450, 190);              // graph of f∘κ⁻¹
const HS = [0.1, 0.01, 0.001];
const cbrt = (u: number): number => Math.sign(u) * Math.pow(Math.abs(u), 1 / 3);

interface Row {
  h: FormulaHandle;
  tex: string;
}

export class WhyCompatibilityScene implements Scene {
  readonly id = "c05-why-compatibility";
  private placer!: LabelPlacer;

  private axX!: Polyline;
  private axM!: Polyline;
  private axU!: Polyline;
  private axLabels: { h: FormulaHandle; at: THREE.Vector3 }[] = [];
  private mDots: Dot[] = [];
  private xDots: Dot[] = [];
  private uDots: Dot[] = [];
  private upLinks: Polyline[] = [];
  private downLinks: Polyline[] = [];

  private checkHead!: FormulaHandle;
  private checkRows: Row[] = [];

  private g1Axes: Arrow[] = [];
  private g2Axes: Arrow[] = [];
  private gLabels: { h: FormulaHandle; at: THREE.Vector3 }[] = [];
  private line1!: Polyline;
  private curve2!: Polyline;
  private vertical!: Polyline;
  private secants: Polyline[] = [];
  private smoothTag!: FormulaHandle;
  private badTag!: FormulaHandle;
  private qMark!: FormulaHandle;
  private dq!: FormulaHandle;
  private dqTable!: FormulaHandle;
  private transOk!: FormulaHandle;
  private transBad!: FormulaHandle;
  private compatDef!: FormulaHandle;
  private failNote!: FormulaHandle;

  private atlasDef!: FormulaHandle;
  private halfArcs: Polyline[] = [];
  private stereoArcs: Polyline[] = [];
  private stereoPoles: Dot[] = [];
  private atlasLabels: { h: FormulaHandle; at: THREE.Vector3 }[] = [];
  private compatLink!: FormulaHandle;
  private bigBox!: Polyline;
  private moreCharts!: FormulaHandle;
  private maximalTag!: FormulaHandle;
  private maximalDef!: FormulaHandle;

  private claim!: FormulaHandle;
  private blobs: { region: Region; line: Polyline }[] = [];
  private blobLabels: { h: FormulaHandle; at: THREE.Vector3 }[] = [];
  private pDot!: Dot;
  private planes: { region: Region; line: Polyline }[] = [];
  private planeLabels: { h: FormulaHandle; at: THREE.Vector3 }[] = [];
  private xDot!: Dot;
  private mapArrows: CurvedArrow[] = [];
  private mapLabels: { h: FormulaHandle; at: THREE.Vector3 }[] = [];
  private longArrow!: CurvedArrow;
  private longLabel!: FormulaHandle;
  private splitA!: Arrow;
  private splitB!: Arrow;
  private splitLabels: FormulaHandle[] = [];
  private splitFormula!: FormulaHandle;
  private ledger!: ProofLedger;
  private abarDef!: FormulaHandle;

  private sameStructure!: FormulaHandle;
  private kappaStructure!: FormulaHandle;
  private finalBox!: FormulaHandle;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.placer = new LabelPlacer(stage);
    stage.setView2D(0, 0, 9);

    // ---- Three lines: chart id (top), M = ℝ (middle), chart κ (bottom)
    this.axX = new Polyline(stage, [W(LINE_X(-1.85), Y_X), W(LINE_X(1.85), Y_X)], { color: Palette.teal, width: 2.5 });
    this.axM = new Polyline(stage, [W(LINE_X(-1.85), Y_M), W(LINE_X(1.85), Y_M)], { color: Palette.text, width: 3 });
    this.axU = new Polyline(stage, [W(LINE_X(-1.85), Y_U), W(LINE_X(1.85), Y_U)], { color: Palette.orange, width: 2.5 });
    const al = (tex: string, color: string, py: number): { h: FormulaHandle; at: THREE.Vector3 } =>
      ({ h: fl.add({ tex, x: 0, y: 0, size: 32, color, align: "left" }), at: W(LINE_X(1.9), py) });
    this.axLabels = [al("x=\\mathrm{id}(p)", Palette.teal, Y_X), al("M=\\mathbb{R}", Palette.text, Y_M), al("u=\\kappa(p)=p^3", Palette.orange, Y_U)];
    for (const p of SAMPLES) {
      this.mDots.push(new Dot(stage, W(LINE_X(p), Y_M), Palette.text, 0.055));
      this.xDots.push(new Dot(stage, W(LINE_X(p), Y_X), Palette.teal, 0.055));
      this.uDots.push(new Dot(stage, W(LINE_X(p * p * p), Y_U), Palette.orange, 0.055));
      this.upLinks.push(new Polyline(stage, [W(LINE_X(p), Y_M), W(LINE_X(p), Y_X)], { color: Palette.teal, width: 1.5 }));
      this.downLinks.push(new Polyline(stage, [W(LINE_X(p), Y_M), W(LINE_X(p * p * p), Y_U)], { color: Palette.orange, width: 1.5 }));
    }

    this.checkHead = fl.add({ tex: "\\phantom{\\text{continuous inverse}}\\quad \\mathrm{id}\\qquad \\kappa", x: 1290, y: 680, size: 30, align: "left", color: Palette.muted });
    this.checkRows = ["\\text{bijective}", "\\text{continuous}", "\\text{continuous inverse}"].map((tex, i) => ({ tex, h: fl.add({ tex, x: 1290, y: 730 + i * 42, size: 30, align: "left" }) }));

    // ---- Two graphs
    const axes = (g: (x: number, y: number) => THREE.Vector3): Arrow[] => [
      new Arrow(stage, g(-1.45, 0), g(1.5, 0), Palette.axis, { width: 2.5, headLength: 0.14 }),
      new Arrow(stage, g(0, -1.4), g(0, 1.5), Palette.axis, { width: 2.5, headLength: 0.14 }),
    ];
    this.g1Axes = axes(G1);
    this.g2Axes = axes(G2);
    const gl = (tex: string, at: THREE.Vector3, color: string): { h: FormulaHandle; at: THREE.Vector3 } =>
      ({ h: fl.add({ tex, x: 0, y: 0, size: 32, color }), at });
    this.gLabels = [
      gl("x", G1(1.62, 0), Palette.teal), gl("u", G2(1.62, 0), Palette.orange),
      gl("f\\circ\\mathrm{id}^{-1}(x)=x", G1(0, 1.72), Palette.teal),
      gl("f\\circ\\kappa^{-1}(u)=\\sqrt[3]{u}", G2(0, 1.72), Palette.orange),
    ];
    this.line1 = new Polyline(stage, [G1(-1.3, -1.3), G1(1.3, 1.3)], { color: Palette.teal, width: 5 });
    this.curve2 = new Polyline(stage, sampleCurve((u) => G2(u, cbrt(u)), -1.4, 1.4, 400), { color: Palette.orange, width: 5 });
    this.vertical = new Polyline(stage, [G2(0, -1.25), G2(0, 1.25)], { color: Palette.red, width: 3, dashed: true, dashSize: 0.1, gapSize: 0.07 });
    this.secants = HS.map((h) => new Polyline(stage, [G2(0, 0), G2(h, cbrt(h))], { color: Palette.yellow, width: 2.5 }));
    this.smoothTag = fl.add({ text: "smooth", x: 0, y: 0, size: 32, color: Palette.green });
    this.badTag = fl.add({ text: "not differentiable at 0", x: 0, y: 0, size: 30, color: Palette.red });
    this.qMark = fl.add({ text: "?", x: 755, y: 300, size: 90, color: Palette.red, weight: 700 });
    this.dq = fl.add({ tex: "\\dfrac{\\sqrt[3]{h}-0}{h}=h^{-2/3}\\ \\to\\ \\infty", x: 1500, y: 300, size: 34, align: "left" });
    this.dqTable = fl.add({
      tex: "\\begin{array}{c|c} h & h^{-2/3}\\\\ \\hline 0.1 & 4.64\\\\ 0.01 & 21.5\\\\ 0.001 & 100\\end{array}",
      x: 1530, y: 470, size: 32, align: "left", display: true,
    });
    this.transOk = fl.add({ tex: `\\kappa\\circ\\mathrm{id}^{-1}(x)=x^3\\ \\ ${Tex.c(Palette.green, "\\checkmark\\ C^\\infty")}`, x: 1640, y: 330, size: 32 });
    this.transBad = fl.add({ tex: `\\mathrm{id}\\circ\\kappa^{-1}(u)=\\sqrt[3]{u}\\ \\ ${Tex.c(Palette.red, "\\times\\ \\text{not } C^\\infty")}`, x: 1640, y: 420, size: 32, color: Palette.red });
    this.compatDef = fl.add({
      tex: "\\text{smoothly compatible:}\\ \\ U\\cap V=\\varnothing\\ \\ \\text{or}\\ \\ \\psi\\circ\\varphi^{-1},\\ \\varphi\\circ\\psi^{-1}\\ \\text{both } C^\\infty",
      x: 760, y: 800, size: 34, boxed: true,
    });
    this.failNote = fl.add({ tex: "\\mathrm{id},\\ \\kappa\\ \\text{not compatible}\\ \\Rightarrow\\ \\text{verdict on } f\\ \\text{ambiguous}", x: 760, y: 800, size: 34, color: Palette.red });

    // ---- Atlases on S¹
    const A1 = PixelFrame.frame(430, 430, 150);
    const A2 = PixelFrame.frame(1000, 430, 150);
    const arcColors = [Palette.teal, Palette.green, Palette.pink, Palette.purple];
    const arcSpec: [number, number, number][] = [[1.06, 0, Math.PI], [1.06, Math.PI, 2 * Math.PI], [1.14, -Math.PI / 2, Math.PI / 2], [1.14, Math.PI / 2, 1.5 * Math.PI]];
    this.halfArcs = arcSpec.map((q, i) => new Polyline(stage, Shapes.arc(0, 0, q[0], q[1] + 0.03, q[2] - 0.03, 80).map((v) => A1(v.x, v.y)), { color: arcColors[i], width: 5 }));
    this.stereoArcs = [
      new Polyline(stage, Shapes.arc(0, 0, 1.06, Math.PI / 2 + 0.06, Math.PI / 2 + 2 * Math.PI - 0.06, 120).map((v) => A2(v.x, v.y)), { color: Palette.yellow, width: 5 }),
      new Polyline(stage, Shapes.arc(0, 0, 1.15, -Math.PI / 2 + 0.06, 1.5 * Math.PI - 0.06, 120).map((v) => A2(v.x, v.y)), { color: Palette.purple, width: 5 }),
    ];
    this.stereoPoles = [new Dot(stage, A2(0, 1.06), Palette.yellow, 0.08, "2d", true), new Dot(stage, A2(0, -1.15), Palette.purple, 0.08, "2d", true)];
    this.atlasLabels = [
      { h: fl.add({ text: "four half circles", x: 0, y: 0, size: 28, color: Palette.text }), at: A1(0, -1.55) },
      { h: fl.add({ tex: "\\sigma_N\\ \\text{on } S^1\\setminus\\{N\\},\\ \\ \\sigma_S\\ \\text{on } S^1\\setminus\\{S\\}", x: 0, y: 0, size: 28, color: Palette.text }), at: A2(0, -1.55) },
    ];
    this.compatLink = fl.add({ tex: "\\overset{\\text{compatible}}{\\longleftrightarrow}", x: 715, y: 420, size: 30, color: Palette.green });
    const box: THREE.Vector3[] = [];
    const rr = (cx: number, cy: number, a0: number): void => {
      for (let i = 0; i <= 8; i++) {
        const a = a0 + (i / 8) * (Math.PI / 2);
        box.push(W(cx + 40 * Math.cos(a), cy - 40 * Math.sin(a)));
      }
    };
    rr(1310, 215, 0); rr(210, 215, Math.PI / 2); rr(210, 690, Math.PI); rr(1310, 690, 1.5 * Math.PI);
    box.push(box[0].clone());
    this.bigBox = new Polyline(stage, box, { color: Palette.yellow, width: 3 });
    this.moreCharts = fl.add({ tex: "\\cdots\\ \\text{all compatible charts}\\ \\cdots", x: 1150, y: 205, size: 28, color: Palette.yellow });
    this.maximalTag = fl.add({ text: "maximal atlas = smooth structure", x: 760, y: 790, size: 34, color: Palette.yellow, weight: 600 });
    this.atlasDef = fl.add({ tex: "\\text{smooth atlas: chart domains cover } M,\\ \\text{any two charts smoothly compatible}", x: 760, y: 100, size: 34 });
    this.maximalDef = fl.add({ tex: "\\text{maximal: no compatible chart can be added}", x: 760, y: 100, size: 34 });

    // ---- Proof diagram
    this.claim = fl.add({ tex: "\\text{every smooth atlas } \\mathcal A\\ \\text{lies in exactly one maximal atlas}", x: 700, y: 100, size: 36, boxed: true });
    const blobSpec: [number, number, number, number, string][] = [[600, 255, 0.4, 1.2, Palette.teal], [800, 255, 2.2, 1.2, Palette.pink], [700, 340, 4.1, 1.0, Palette.yellow]];
    this.blobs = blobSpec.map(([px, py, ph, r, col]) => {
      const pts = Shapes.blob(W(px, py).x, W(px, py).y, 1.25 * r, 0.85 * r, ph);
      return { region: new Region(stage, pts, col, 0.14), line: new Polyline(stage, pts, { color: col, width: 2.5 }) };
    });
    this.blobLabels = [
      { h: fl.add({ tex: "U_1", x: 0, y: 0, size: 32, color: Palette.teal }), at: W(470, 190) },
      { h: fl.add({ tex: "U_2", x: 0, y: 0, size: 32, color: Palette.pink }), at: W(935, 190) },
      { h: fl.add({ tex: "W", x: 0, y: 0, size: 32, color: Palette.yellow }), at: W(780, 440) },
    ];
    this.pDot = new Dot(stage, W(700, 285), Palette.orange, 0.07);
    const planeX = [300, 700, 1100];
    const planeCol = [Palette.teal, Palette.yellow, Palette.pink];
    this.planes = planeX.map((px, i) => {
      const pts = [W(px - 105, 580), W(px + 105, 580), W(px + 105, 720), W(px - 105, 720), W(px - 105, 580)];
      return { region: new Region(stage, pts, planeCol[i], 0.1), line: new Polyline(stage, pts, { color: planeCol[i], width: 2 }) };
    });
    this.planeLabels = [
      { h: fl.add({ tex: "\\varphi_1(U_1)", x: 0, y: 0, size: 28, color: Palette.teal }), at: W(300, 745) },
      { h: fl.add({ tex: "\\theta(W)", x: 0, y: 0, size: 28, color: Palette.yellow }), at: W(700, 745) },
      { h: fl.add({ tex: "\\varphi_2(U_2)", x: 0, y: 0, size: 28, color: Palette.pink }), at: W(1100, 745) },
    ];
    this.xDot = new Dot(stage, W(300, 650), Palette.orange, 0.07);
    this.mapArrows = [
      new CurvedArrow(stage, W(660, 300), W(320, 590), 0.3, Palette.teal, 2.5),
      new CurvedArrow(stage, W(700, 315), W(700, 590), 0.0, Palette.yellow, 2.5),
      new CurvedArrow(stage, W(740, 300), W(1080, 590), -0.3, Palette.pink, 2.5),
    ];
    this.mapLabels = [
      { h: fl.add({ tex: "\\varphi_1", x: 0, y: 0, size: 30, color: Palette.teal }), at: W(430, 480) },
      { h: fl.add({ tex: "\\theta", x: 0, y: 0, size: 30, color: Palette.yellow }), at: W(725, 540) },
      { h: fl.add({ tex: "\\varphi_2", x: 0, y: 0, size: 30, color: Palette.pink }), at: W(970, 480) },
    ];
    this.longArrow = new CurvedArrow(stage, W(330, 575), W(1070, 575), 0.35, Palette.text, 3);
    this.longLabel = fl.add({ tex: "\\varphi_2\\circ\\varphi_1^{-1}", x: 700, y: 505, size: 32 });
    this.splitA = new Arrow(stage, W(410, 650), W(590, 650), Palette.green, { width: 3, headLength: 0.16 });
    this.splitB = new Arrow(stage, W(810, 650), W(990, 650), Palette.green, { width: 3, headLength: 0.16 });
    this.splitLabels = [
      fl.add({ tex: "\\theta\\circ\\varphi_1^{-1}", x: 500, y: 620, size: 28, color: Palette.green }),
      fl.add({ tex: "\\varphi_2\\circ\\theta^{-1}", x: 900, y: 620, size: 28, color: Palette.green }),
    ];
    this.splitFormula = fl.add({ tex: "\\varphi_2\\circ\\varphi_1^{-1}=(\\varphi_2\\circ\\theta^{-1})\\circ(\\theta\\circ\\varphi_1^{-1})\\quad\\text{on } \\varphi_1(U_1\\cap U_2\\cap W)", x: 700, y: 810, size: 32, color: Palette.yellow });
    const cue = new Cues(timing, 0);
    this.abarDef = fl.add({ tex: "\\bar{\\mathcal A}=\\{\\text{charts compatible with every chart of } \\mathcal A\\}", x: 700, y: 810, size: 30, color: Palette.text });
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "\\bar{\\mathcal A}\\supseteq\\mathcal A", at: cue.in(32, 0.5) },
      { label: "2", tex: "\\varphi_2\\circ\\varphi_1^{-1}\\ C^\\infty\\ \\text{near each } x", at: cue.in(38, 0.7) },
      { label: "2'", tex: "\\bar{\\mathcal A}\\ \\text{is a smooth atlas}", at: cue.in(39, 0.8) },
      { label: "3", tex: "\\bar{\\mathcal A}\\ \\text{maximal}", at: cue.in(40, 0.8) },
      { label: "4", tex: "\\mathcal B\\subseteq\\bar{\\mathcal A}\\Rightarrow\\mathcal B=\\bar{\\mathcal A}\\ \\ \\blacksquare", at: cue.in(42, 0.6) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 }, "Unique maximal atlas");

    this.sameStructure = fl.add({ tex: "\\text{half circles}\\ \\cup\\ \\text{stereographic}\\ \\Rightarrow\\ \\text{one smooth structure on } S^1", x: 960, y: 760, size: 34, color: Palette.green });
    this.kappaStructure = fl.add({ tex: "\\{\\kappa\\}\\ \\text{and}\\ \\{\\mathrm{id}\\}:\\ \\text{two different smooth structures on } \\mathbb{R}", x: 760, y: 760, size: 34, color: Palette.orange });
    this.finalBox = fl.add({ tex: "\\text{smooth manifold} = \\text{topological manifold} + \\text{smooth structure (maximal atlas)}", x: 760, y: 100, size: 36, boxed: true });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;

    // ---------- Three lines (s2–s8), again at s44–s46
    const linesOn = c.p(2, 0.7) * (1 - c.p(9, 0.6)) + 0.85 * c.p(44, 0.7);
    this.axM.setOpacity(linesOn);
    const xOn = Math.max(c.p(3, 0.6) * (1 - c.p(9, 0.6)), 0.85 * c.p(44, 0.7));
    const uOn = Math.max(c.p(4, 0.6) * (1 - c.p(9, 0.6)), 0.85 * c.p(44, 0.7));
    this.axX.setOpacity(xOn);
    this.axU.setOpacity(uOn);
    const labOn = [xOn, linesOn, uOn];
    this.axLabels.forEach((l, i) => this.placer.place(l.h, l.at, 0, 0, labOn[i]));
    SAMPLES.forEach((_, i) => {
      this.mDots[i].setOpacity(linesOn);
      const up = xOn * c.p(3, 0.5, 0.6 + 0.1 * i);
      const down = uOn * c.p(4, 0.5, 0.6 + 0.1 * i);
      const upX = Math.max(up, 0.85 * c.p(44, 0.7));
      const downX = Math.max(down, 0.85 * c.p(44, 0.7));
      this.xDots[i].setOpacity(upX);
      this.uDots[i].setOpacity(downX);
      const emph = t >= c.s(5) && t < c.s(6) ? 1 : 0.6;
      this.upLinks[i].setOpacity(upX * emph);
      this.downLinks[i].setOpacity(downX * emph);
    });
    const checkOn = c.p(6, 0.6) * (1 - c.p(9, 0.6));
    this.checkHead.set({ opacity: checkOn });
    this.checkRows.forEach((row, i) => {
      const idDone = t >= c.in(7, 0.25);
      const kDone = i < 2 ? t >= c.in(7, 0.7) : t >= c.in(8, 0.6);
      const mk = (on: boolean): string => (on ? Tex.c(Palette.green, "\\checkmark") : "\\phantom{\\checkmark}");
      row.h.setContent(`\\mathrlap{${row.tex}}\\phantom{\\text{continuous inverse}}\\quad\\ ${mk(idDone)}\\qquad\\ ${mk(kDone)}`);
      row.h.set({ opacity: checkOn });
    });

    // ---------- Graphs (s9–s22)
    const g1On = c.p(9, 0.6) * (1 - c.p(23, 0.6));
    const g2On = c.p(11, 0.6) * (1 - c.p(23, 0.6));
    this.g1Axes.forEach((a) => a.setOpacity(g1On));
    this.g2Axes.forEach((a) => a.setOpacity(g2On));
    const gOps = [g1On, g2On, g1On, g2On];
    this.gLabels.forEach((l, i) => this.placer.place(l.h, l.at, 0, 0, gOps[i]));
    this.line1.setProgress(c.over(10, 0.05, 0.5));
    this.line1.setOpacity(g1On);
    this.curve2.setProgress(c.over(11, 0.2, 0.8));
    this.curve2.setOpacity(g2On);
    this.vertical.setOpacity(g2On * c.p(12, 0.5));
    this.secants.forEach((s, i) => s.setOpacity(g2On * c.p(14, 0.4, 0.3 + i * 3.4) * (1 - c.p(16, 0.5))));
    this.placer.place(this.smoothTag, G1(0.75, -1.15), 0, 0, g1On * c.p(10, 0.5, 2.0));
    this.placer.place(this.badTag, G2(0.85, -1.3), 0, 0, g2On * c.p(15, 0.5));
    this.qMark.set({ opacity: c.p(16, 0.5) * (1 - c.p(17, 0.5)) * flash(t, c.s(16) + 0.5, 0.8, 0.4) });
    const dqOn = c.p(13, 0.6) * (1 - c.p(16, 0.5));
    this.dq.set({ opacity: dqOn });
    const tableRows = t >= c.in(14, 0.68) ? 3 : t >= c.in(14, 0.36) ? 2 : t >= c.s(14) + 0.3 ? 1 : 0;
    const rows = ["0.1 & 4.64", "0.01 & 21.5", "0.001 & 100"].map((r, i) => (i < tableRows ? r : `\\phantom{0.001} & \\phantom{100}`));
    this.dqTable.setContent(`\\begin{array}{c|c} h & h^{-2/3}\\\\ \\hline ${rows.join("\\\\ ")}\\end{array}`);
    this.dqTable.set({ opacity: dqOn * c.p(14, 0.4) });
    this.transOk.set({ opacity: c.p(18, 0.6) * (1 - c.p(23, 0.6)) });
    this.transBad.set({ opacity: c.p(19, 0.6) * (1 - c.p(23, 0.6)) });
    this.compatDef.set({ opacity: c.p(20, 0.6) * (1 - c.p(22, 0.5)) });
    this.failNote.set({ opacity: c.p(22, 0.6) * (1 - c.p(23, 0.6)) });

    // ---------- Atlases (s23–s29)
    const atOn = c.p(23, 0.7) * (1 - c.p(30, 0.6));
    this.atlasDef.set({ opacity: c.p(23, 0.6) * (1 - c.p(28, 0.5)) });
    this.maximalDef.set({ opacity: c.p(28, 0.6) * (1 - c.p(30, 0.5)) });
    this.halfArcs.forEach((a, i) => a.setOpacity(atOn * c.p(24, 0.5, 0.25 * i)));
    const stOn = atOn * c.p(24, 0.6, 2.4);
    this.stereoArcs.forEach((a) => a.setOpacity(stOn));
    this.stereoPoles.forEach((d) => d.setOpacity(stOn));
    this.atlasLabels.forEach((l, i) => this.placer.place(l.h, l.at, 0, 0, i === 0 ? atOn * c.p(24, 0.5) : stOn));
    this.compatLink.set({ opacity: atOn * c.p(25, 0.6) * (1 - c.p(26, 0.5)) });
    const boxOn = atOn * c.p(28, 0.8);
    this.bigBox.setOpacity(boxOn);
    this.moreCharts.set({ opacity: boxOn });
    this.maximalTag.set({ opacity: atOn * c.p(29, 0.6) });
    const diff = t >= c.s(26) && t < c.s(28) ? flash(t, c.s(26), 1.1, 0.35) : 1;
    this.atlasLabels.forEach((l) => l.h.set({ color: t >= c.s(26) && t < c.s(28) && diff < 0.7 ? Palette.red : Palette.text }));

    // ---------- Proof (s30–s42)
    const prOn = c.p(30, 0.6) * (1 - c.p(43, 0.6));
    this.claim.set({ opacity: prOn });
    this.abarDef.set({ opacity: prOn * c.p(31, 0.6, 1.5) * (1 - c.p(37, 0.4)) });
    const diagOn = prOn * c.p(33, 0.6);
    this.blobs.forEach((b, i) => {
      const g = diagOn * (i < 2 ? 1 : c.p(35, 0.6));
      b.region.setOpacity(0.14 * g);
      b.line.setOpacity(g);
    });
    this.blobLabels.forEach((l, i) => this.placer.place(l.h, l.at, 0, 0, diagOn * (i < 2 ? 1 : c.p(35, 0.6))));
    this.pDot.setOpacity(diagOn * c.p(34, 0.5, 1.5));
    this.planes.forEach((p, i) => {
      const g = diagOn * (i === 1 ? c.p(35, 0.6) : 1);
      p.region.setOpacity(0.1 * g);
      p.line.setOpacity(g);
    });
    this.planeLabels.forEach((l, i) => this.placer.place(l.h, l.at, 0, 0, diagOn * (i === 1 ? c.p(35, 0.6) : 1)));
    this.xDot.setOpacity(diagOn * c.p(34, 0.5));
    const mapsOn = diagOn * (1 - c.p(36, 0.6));
    this.mapArrows.forEach((a, i) => a.setProgress(i === 1 ? c.p(35, 0.8) : c.p(34, 0.8, 1.6), mapsOn));
    this.mapLabels.forEach((l, i) => this.placer.place(l.h, l.at, 0, 0, mapsOn * (i === 1 ? c.p(35, 0.6) : c.p(34, 0.6, 1.6))));
    const split = c.p(37, 1.0, 0.8);
    const longOn = diagOn * c.p(36, 0.6) * (1 - 0.75 * split);
    this.longArrow.setProgress(c.p(36, 1.0, 0.8), longOn);
    this.longLabel.set({ opacity: longOn });
    this.splitA.setOpacity(diagOn * split);
    this.splitB.setOpacity(diagOn * split);
    const splitOk = t >= c.s(38);
    this.splitA.setColor(splitOk ? Palette.green : Palette.text);
    this.splitB.setColor(splitOk ? Palette.green : Palette.text);
    this.splitLabels.forEach((h) => h.set({ opacity: diagOn * split, color: splitOk ? Palette.green : Palette.text }));
    this.splitFormula.set({ opacity: prOn * c.p(37, 0.6) * (1 - c.p(40, 0.5)) });
    this.ledger.update(t, 1 - c.p(43, 0.6), t < c.s(43));

    // ---------- Consequences (s43–s46)
    this.sameStructure.set({ opacity: c.p(43, 0.6) * (1 - c.p(44, 0.5)) });
    this.halfArcs.forEach((a, i) => a.setOpacity(Math.max(atOn * c.p(24, 0.5, 0.25 * i), c.p(43, 0.6) * (1 - c.p(44, 0.5)))));
    this.stereoArcs.forEach((a) => a.setOpacity(Math.max(stOn, c.p(43, 0.6) * (1 - c.p(44, 0.5)))));
    this.kappaStructure.set({ opacity: c.p(44, 0.6) * (1 - c.p(46, 0.5)) });
    this.finalBox.set({ opacity: c.p(46, 0.6) });
  }

  teardown(_layers: SceneLayers): void {}
}
