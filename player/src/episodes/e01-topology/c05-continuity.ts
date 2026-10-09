import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Cues } from "../../primitives/Cues";
import { CurvedArrow } from "../../primitives/CurvedArrow";
import { Dot } from "../../primitives/Dot";
import { lerp } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Region } from "../../primitives/Region";
import { FoldMap } from "./lib/FoldMap";
import { PixelSpace } from "./lib/PixelSpace";
import { Shapes } from "./lib/shapes";
import { tc } from "./lib/tex";

/**
 * E01 c05 — continuity as "preimages of open sets are open"; equivalence with ε–δ in metric spaces;
 * continuous maps preserve convergence; compositions are continuous; continuity depends on the topologies.
 * ε–δ graph: f(x) = x²/2 + sin x, x₀ = 1, ε = 0.5. Two-panel pictures use the fold map of lib/FoldMap.
 * Coordinates are output pixels (PixelSpace). Sentence indices refer to story.en.json, scene c05-continuity.
 */

const fGraph = (x: number): number => (x * x) / 2 + Math.sin(x);
const G = { xMin: -3.2, xMax: 2.6, yMin: -0.7, yMax: 4.6, px0: 140, px1: 1300, py0: 790, py1: 130 };
const gx = (x: number): number => lerp(G.px0, G.px1, (x - G.xMin) / (G.xMax - G.xMin));
const gy = (y: number): number => lerp(G.py0, G.py1, (y - G.yMin) / (G.yMax - G.yMin));
const X0 = 1.0;
const FX0 = fGraph(X0);
const EPS = 0.5;

/** Maximal x-intervals (within the plotted range) where |f(x) − f(x₀)| < ε. */
function preimagePieces(): { a: number; b: number }[] {
  const out: { a: number; b: number }[] = [];
  const n = 4000;
  let start: number | null = null;
  for (let i = 0; i <= n; i++) {
    const x = G.xMin + ((G.xMax - G.xMin) * i) / n;
    const inside = Math.abs(fGraph(x) - FX0) < EPS;
    if (inside && start === null) start = x;
    if (!inside && start !== null) {
      out.push({ a: start, b: x });
      start = null;
    }
  }
  if (start !== null) out.push({ a: start, b: G.xMax });
  return out;
}

const XC = { x: 330, y: 450 };     // X panel center (local radius ≈ 235)
const YC = { x: 1010, y: 450 };    // Y panel center (local blob around (50, 0), radius ≈ 270)
const V_C = { x: 60, y: -20 };     // open disk V in local Y coordinates
const V_R = 55;
const XPT = { u: 170, v: -20 };    // the point x in the right preimage piece; f(x) ≈ (60.4, −20)
const EPS_R = 40;
const DELTA_R = 24;

export class ContinuityScene implements Scene {
  readonly id = "c05-continuity";
  private stage!: StageLayer;

  // ε–δ graph
  private axes: Polyline[] = [];
  private curve!: Polyline;
  private greenSeg!: Polyline;
  private x0Dot!: Dot;
  private x0Guide: Polyline[] = [];
  private x0Labels: FormulaHandle[] = [];
  private epsBand!: Region;
  private epsEdges: Polyline[] = [];
  private epsLabel!: FormulaHandle;
  private deltaBand!: Region;
  private deltaEdges: Polyline[] = [];
  private deltaLabel!: FormulaHandle;
  private preSegs: Polyline[] = [];
  private preLabel!: FormulaHandle;
  private deltaSeg!: Polyline;
  private epsDeltaDef!: FormulaHandle;
  private openWords!: FormulaHandle;

  // definition and the x² example
  private defn!: FormulaHandle;
  private preDef!: FormulaHandle;
  private lineY!: Polyline;
  private lineX!: Polyline;
  private lineLabels: FormulaHandle[] = [];
  private vSeg!: Polyline;
  private preSegsSq: Polyline[] = [];
  private sqArrows: CurvedArrow[] = [];
  private sqFormula!: FormulaHandle;

  // two panels
  private fold: FoldMap;
  private xBlob!: Polyline;
  private xFill!: Region;
  private yBlob!: Polyline;
  private yFill!: Region;
  private panelLabels: FormulaHandle[] = [];
  private fArrow!: CurvedArrow;
  private fLabel!: FormulaHandle;
  private vFill!: Region;
  private vEdge!: Polyline;
  private vLabel!: FormulaHandle;
  private preFill: Region[] = [];
  private preEdge: Polyline[] = [];
  private preNote!: FormulaHandle;
  private xDot!: Dot;
  private fxDot!: Dot;
  private xLab!: FormulaHandle;
  private fxLab!: FormulaHandle;
  private epsBall!: Polyline;
  private deltaBall!: Polyline;
  private deltaImage!: Polyline;
  private deltaImageFill!: Region;
  private seqX: Dot[] = [];
  private seqY: Dot[] = [];

  private stepLine!: FormulaHandle;
  private gainNote!: FormulaHandle;

  // composition
  private compBlobs: Polyline[] = [];
  private compFills: Region[] = [];
  private compLabels: FormulaHandle[] = [];
  private compArrows: CurvedArrow[] = [];
  private compArrowLabels: FormulaHandle[] = [];
  private wFill!: Region;
  private wEdge!: Polyline;
  private gPreFill!: Region;
  private gPreEdge!: Polyline;
  private fgPreFill!: Region;
  private fgPreEdge!: Polyline;
  private compRegionLabels: FormulaHandle[] = [];
  private compFormula!: FormulaHandle;

  // identity maps
  private idRows: FormulaHandle[] = [];
  private idLines: Polyline[] = [];
  private idZero: Dot[] = [];
  private idProbe!: Polyline;
  private idProbePoint!: Dot;
  private idLineLabels: FormulaHandle[] = [];
  private idNote!: FormulaHandle;
  private sameNote!: FormulaHandle;
  private chartNote!: FormulaHandle;

  private ledger!: ProofLedger;

  constructor() {
    this.fold = new FoldMap(XC, YC);
  }

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    const P = PixelSpace.p;

    // ---- ε–δ graph
    this.axes = [
      new Polyline(stage, [P(G.px0 - 10, gy(0)), P(G.px1 + 10, gy(0))], { color: Palette.axis, width: 2 }),
      new Polyline(stage, [P(gx(0), G.py0 + 10), P(gx(0), G.py1 - 10)], { color: Palette.axis, width: 2 }),
    ];
    const curvePts: THREE.Vector3[] = [];
    for (let i = 0; i <= 240; i++) {
      const x = G.xMin + ((G.xMax - G.xMin) * i) / 240;
      curvePts.push(P(gx(x), gy(fGraph(x))));
    }
    this.curve = new Polyline(stage, curvePts, { color: Palette.blue, width: 4 });
    const pieces = preimagePieces();
    const main = pieces.find((p) => p.a < X0 && X0 < p.b) ?? { a: X0 - 0.3, b: X0 + 0.3 };
    const delta = 0.8 * Math.min(X0 - main.a, main.b - X0);
    this.graphDelta = delta;
    const segPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const x = X0 - delta + (2 * delta * i) / 40;
      segPts.push(P(gx(x), gy(fGraph(x))));
    }
    this.greenSeg = new Polyline(stage, segPts, { color: Palette.green, width: 7 });
    this.x0Dot = new Dot(stage, P(gx(X0), gy(FX0)), Palette.orange, 0.07);
    this.x0Guide = [
      new Polyline(stage, [P(gx(X0), gy(0)), P(gx(X0), gy(FX0))], { color: Palette.orange, width: 1.5, dashed: true, dashSize: 0.08, gapSize: 0.06 }),
      new Polyline(stage, [P(gx(0), gy(FX0)), P(gx(X0), gy(FX0))], { color: Palette.orange, width: 1.5, dashed: true, dashSize: 0.08, gapSize: 0.06 }),
    ];
    this.x0Labels = [
      fl.add({ tex: "x_0", x: gx(X0), y: gy(0) + 30, size: 30, color: Palette.orange }),
      fl.add({ tex: "f(x_0)", x: gx(0) - 50, y: gy(FX0), size: 30, color: Palette.orange }),
    ];
    const band = (y0: number, y1: number): THREE.Vector3[] => [P(G.px0, gy(y0)), P(G.px1, gy(y0)), P(G.px1, gy(y1)), P(G.px0, gy(y1)), P(G.px0, gy(y0))];
    this.epsBand = new Region(stage, band(FX0 - EPS, FX0 + EPS), Palette.purple, 0.2);
    this.epsEdges = [FX0 - EPS, FX0 + EPS].map((y) => new Polyline(stage, [P(G.px0, gy(y)), P(G.px1, gy(y))], { color: Palette.purple, width: 2, dashed: true, dashSize: 0.1, gapSize: 0.07 }));
    this.epsLabel = fl.add({ tex: "f(x_0)\\pm\\varepsilon", x: G.px1 - 10, y: gy(FX0 + EPS) - 22, size: 30, color: Palette.purple, align: "right" });
    const vband = (x0: number, x1: number): THREE.Vector3[] => [P(gx(x0), G.py0), P(gx(x1), G.py0), P(gx(x1), G.py1), P(gx(x0), G.py1), P(gx(x0), G.py0)];
    this.deltaBand = new Region(stage, vband(X0 - delta, X0 + delta), Palette.teal, 0.18);
    this.deltaEdges = [X0 - delta, X0 + delta].map((x) => new Polyline(stage, [P(gx(x), G.py0), P(gx(x), G.py1)], { color: Palette.teal, width: 2, dashed: true, dashSize: 0.1, gapSize: 0.07 }));
    this.deltaLabel = fl.add({ tex: "x_0\\pm\\delta", x: gx(X0), y: G.py1 - 14, size: 30, color: Palette.teal });
    this.preSegs = pieces.map((p) => new Polyline(stage, [P(gx(p.a), gy(0)), P(gx(p.b), gy(0))], { color: Palette.purple, width: 10 }));
    this.preLabel = fl.add({ tex: "f^{-1}(V)", x: gx(pieces[0].a + (pieces[0].b - pieces[0].a) / 2), y: gy(0) + 36, size: 30, color: Palette.purple });
    this.deltaSeg = new Polyline(stage, [P(gx(X0 - delta), gy(0)), P(gx(X0 + delta), gy(0))], { color: Palette.teal, width: 6 });
    this.epsDeltaDef = fl.add({ tex: "\\forall\\varepsilon>0\\ \\exists\\delta>0:\\ \\ |x-x_0|<\\delta\\ \\Rightarrow\\ |f(x)-f(x_0)|<\\varepsilon", x: 720, y: 830, size: 36 });
    this.openWords = fl.add({ text: "every target neighborhood V receives a whole neighborhood of inputs", x: 720, y: 830, size: 32, color: Palette.text });

    // ---- definition and the x² example
    this.defn = fl.add({ tex: "f:X\\to Y\\ \\text{continuous}\\iff \\forall\\,V\\subseteq Y\\ \\text{open}:\\ \\ f^{-1}(V)\\ \\text{open in } X", x: 710, y: 100, size: 40 });
    this.preDef = fl.add({ tex: "f^{-1}(V)=\\{\\,x\\in X:\\ f(x)\\in V\\,\\}", x: 710, y: 165, size: 36, color: Palette.purple });
    const lx = (v: number): number => lerp(200, 1240, (v + 3) / 7.5);
    this.lineY = new Polyline(stage, [P(160, 330), P(1280, 330)], { color: Palette.axis, width: 2 });
    this.lineX = new Polyline(stage, [P(160, 620), P(1280, 620)], { color: Palette.axis, width: 2 });
    this.lineLabels = [
      fl.add({ tex: "y", x: 1300, y: 330, size: 32, color: Palette.muted, align: "left" }),
      fl.add({ tex: "x", x: 1300, y: 620, size: 32, color: Palette.muted, align: "left" }),
      ...[-2, -1, 0, 1, 2, 4].map((v) => fl.add({ tex: String(v), x: lx(v), y: 655, size: 26, color: Palette.muted })),
      ...[0, 1, 4].map((v) => fl.add({ tex: String(v), x: lx(v), y: 365, size: 26, color: Palette.muted })),
      fl.add({ tex: "V=(1,4)", x: lx(2.5), y: 290, size: 32, color: Palette.purple }),
    ];
    this.sqLx = lx;
    this.vSeg = new Polyline(stage, [P(lx(1), 330), P(lx(4), 330)], { color: Palette.purple, width: 10 });
    this.preSegsSq = [new Polyline(stage, [P(lx(-2), 620), P(lx(-1), 620)], { color: Palette.purple, width: 10 }), new Polyline(stage, [P(lx(1), 620), P(lx(2), 620)], { color: Palette.purple, width: 10 })];
    this.sqArrows = [new CurvedArrow(stage, P(lx(-1.5), 600), P(lx(2.2), 350), -0.6, Palette.muted, 2.5), new CurvedArrow(stage, P(lx(1.5), 600), P(lx(2.6), 350), 0.3, Palette.muted, 2.5)];
    this.sqFormula = fl.add({ tex: `f(x)=x^2:\\quad f^{-1}\\big((1,4)\\big)=${tc(Palette.purple, "(-2,-1)\\cup(1,2)")}\\ \\ \\text{open}`, x: 710, y: 780, size: 38 });

    // ---- two panels
    const xb = Shapes.blob(XC.x / 100, -XC.y / 100, 2.38, 0.03, 0.02, 0.5, 1);
    const yb = Shapes.blob((YC.x + 50) / 100, -YC.y / 100, 2.72, 0.02, 0.015, 1.3, 1);
    this.xFill = new Region(stage, xb, Palette.blue, 0.1);
    this.xBlob = new Polyline(stage, xb, { color: Palette.blue, width: 2.5 });
    this.yFill = new Region(stage, yb, Palette.blue, 0.1);
    this.yBlob = new Polyline(stage, yb, { color: Palette.blue, width: 2.5 });
    this.panelLabels = [fl.add({ tex: "X", x: XC.x - 190, y: XC.y - 215, size: 40, color: Palette.blue }), fl.add({ tex: "Y", x: YC.x + 270, y: YC.y - 240, size: 40, color: Palette.blue })];
    this.fArrow = new CurvedArrow(stage, P(XC.x + 150, XC.y - 250), P(YC.x - 150, YC.y - 270), 0.35, Palette.text, 3);
    this.fLabel = fl.add({ tex: "f", x: (XC.x + YC.x) / 2, y: XC.y - 305, size: 38 });
    const vPts = PixelSpace.circle(YC.x + V_C.x, YC.y + V_C.y, V_R);
    this.vFill = new Region(stage, vPts, Palette.purple, 0.3, -0.005);
    this.vEdge = new Polyline(stage, vPts, { color: Palette.purple, width: 2.5, dashed: true, dashSize: 0.06, gapSize: 0.05 });
    this.vLabel = fl.add({ tex: "V", x: YC.x + V_C.x + 55, y: YC.y + V_C.y - 45, size: 36, color: Palette.purple });
    for (const curve of this.fold.preimageOfDisk(V_C, V_R)) {
      this.preFill.push(new Region(stage, curve, Palette.purple, 0.3, -0.005));
      this.preEdge.push(new Polyline(stage, curve, { color: Palette.purple, width: 2.5, dashed: true, dashSize: 0.06, gapSize: 0.05 }));
    }
    this.preNote = fl.add({ tex: "f^{-1}(V)\\ \\text{open}", x: XC.x, y: XC.y + 270, size: 34, color: Palette.purple });
    const fx = FoldMap.local(XPT.u, XPT.v);
    this.xDot = new Dot(stage, this.fold.xPoint(XPT.u, XPT.v), Palette.orange, 0.05);
    this.fxDot = new Dot(stage, this.fold.yPoint(fx.x, fx.y), Palette.orange, 0.05);
    this.xLab = fl.add({ tex: "x", x: XC.x + XPT.u - 4, y: XC.y + XPT.v - 40, size: 30, color: Palette.orange });
    this.fxLab = fl.add({ tex: "f(x)", x: YC.x + fx.x - 10, y: YC.y + fx.y + 68, size: 30, color: Palette.orange });
    this.epsBall = new Polyline(stage, PixelSpace.circle(YC.x + fx.x, YC.y + fx.y, EPS_R), { color: Palette.yellow, width: 2.5 });
    this.deltaBall = new Polyline(stage, PixelSpace.circle(XC.x + XPT.u, XC.y + XPT.v, DELTA_R), { color: Palette.teal, width: 2.5 });
    this.deltaImage = new Polyline(stage, this.deltaImagePts(0), { color: Palette.teal, width: 2.5 });
    this.deltaImageFill = new Region(stage, this.deltaImagePts(0), Palette.teal, 0.3, 0.002);
    for (let k = 1; k <= 14; k++) {
      const s = this.seqLocal(k);
      this.seqX.push(new Dot(stage, this.fold.xPoint(s.u, s.v), Palette.orange, 0.035));
      this.seqY.push(new Dot(stage, this.fold.image(s.u, s.v), Palette.orange, 0.035));
    }

    this.stepLine = fl.add({ tex: "", x: 710, y: 820, size: 34 });
    this.gainNote = fl.add({ text: "no distance needed  ⇒  works on spaces without a natural metric", x: 710, y: 820, size: 34, color: Palette.green });

    // ---- composition: three panels
    const centers = [{ x: 250, y: 460 }, { x: 710, y: 460 }, { x: 1170, y: 460 }];
    const names = ["X", "Y", "Z"];
    centers.forEach((c0, i) => {
      const b = Shapes.blob(c0.x / 100, -c0.y / 100, 1.6, 0.06, 0.04, 0.7 + i, 1);
      this.compFills.push(new Region(stage, b, Palette.blue, 0.1));
      this.compBlobs.push(new Polyline(stage, b, { color: Palette.blue, width: 2.5 }));
      this.compLabels.push(fl.add({ tex: names[i], x: c0.x - 120, y: c0.y - 150, size: 38, color: Palette.blue }));
    });
    this.compArrows = [
      new CurvedArrow(stage, P(330, 270), P(630, 270), 0.4, Palette.text, 3),
      new CurvedArrow(stage, P(790, 270), P(1090, 270), 0.4, Palette.text, 3),
    ];
    this.compArrowLabels = [fl.add({ tex: "f", x: 480, y: 215, size: 36 }), fl.add({ tex: "g", x: 940, y: 215, size: 36 })];
    const w = Shapes.blob(11.9, -4.45, 0.55, 0.12, 0.05, 0.2, 1);
    this.wFill = new Region(stage, w, Palette.purple, 0.3, -0.005);
    this.wEdge = new Polyline(stage, w, { color: Palette.purple, width: 2.5, dashed: true, dashSize: 0.06, gapSize: 0.05 });
    const gw = Shapes.blob(7.25, -4.75, 0.7, 0.15, 0.08, 1.9, 0.8);
    this.gPreFill = new Region(stage, gw, Palette.purple, 0.3, -0.005);
    this.gPreEdge = new Polyline(stage, gw, { color: Palette.purple, width: 2.5, dashed: true, dashSize: 0.06, gapSize: 0.05 });
    const fgw = Shapes.blob(2.35, -4.4, 0.6, 0.18, 0.1, 2.6, 0.9);
    this.fgPreFill = new Region(stage, fgw, Palette.purple, 0.3, -0.005);
    this.fgPreEdge = new Polyline(stage, fgw, { color: Palette.purple, width: 2.5, dashed: true, dashSize: 0.06, gapSize: 0.05 });
    this.compRegionLabels = [
      fl.add({ tex: "W", x: 1190, y: 445, size: 32, color: Palette.purple }),
      fl.add({ tex: "g^{-1}(W)", x: 725, y: 475, size: 28, color: Palette.purple }),
      fl.add({ tex: "f^{-1}(g^{-1}(W))", x: 250, y: 660, size: 30, color: Palette.purple }),
    ];
    this.compFormula = fl.add({ tex: "(g\\circ f)^{-1}(W)=f^{-1}\\big(g^{-1}(W)\\big)", x: 710, y: 760, size: 42, color: Palette.text });

    // ---- identity maps
    this.idRows = [
      fl.add({ tex: `\\mathrm{id}:(\\mathbb{R},\\text{discrete})\\to(\\mathbb{R},\\text{standard})\\qquad ${tc(Palette.green, "\\checkmark\\ \\text{continuous}")}`, x: 710, y: 200, size: 38 }),
      fl.add({ tex: `\\mathrm{id}:(\\mathbb{R},\\text{standard})\\to(\\mathbb{R},\\text{discrete})\\qquad ${tc(Palette.red, "\\times\\ \\text{not continuous}")}`, x: 710, y: 330, size: 38 }),
    ];
    this.idLines = [new Polyline(stage, [P(160, 560), P(620, 560)], { color: Palette.axis, width: 2 }), new Polyline(stage, [P(800, 560), P(1260, 560)], { color: Palette.axis, width: 2 })];
    this.idZero = [new Dot(stage, P(390, 560), Palette.yellow, 0.07), new Dot(stage, P(1030, 560), Palette.yellow, 0.07)];
    this.idProbe = new Polyline(stage, [P(330, 560), P(450, 560)], { color: Palette.blue, width: 8 });
    this.idProbePoint = new Dot(stage, P(420, 560), Palette.red, 0.06);
    this.idLineLabels = [
      fl.add({ tex: `\\text{standard: } \\{0\\}=\\mathrm{id}^{-1}(\\{0\\})\\ ${tc(Palette.red, "\\text{not open}")}`, x: 390, y: 640, size: 30 }),
      fl.add({ tex: `\\text{discrete: } \\{0\\}\\ ${tc(Palette.green, "\\text{open}")}`, x: 1030, y: 640, size: 30 }),
      fl.add({ tex: "0", x: 390, y: 520, size: 28, color: Palette.yellow }),
      fl.add({ tex: "0", x: 1030, y: 520, size: 28, color: Palette.yellow }),
    ];
    this.idNote = fl.add({ tex: "\\text{left: every subset is open}\\ \\Rightarrow\\ \\text{every preimage is open}", x: 710, y: 260, size: 30, color: Palette.muted });
    this.sameNote = fl.add({ text: "same formula, different open sets, different answer", x: 710, y: 780, size: 36, color: Palette.yellow });
    this.chartNote = fl.add({ text: "charts · transition maps · smooth maps (E02) are built on continuity", x: 710, y: 780, size: 34, color: Palette.text });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "f^{-1}(\\text{open})\\ \\text{open}\\iff\\varepsilon\\text{–}\\delta", at: cue.in(19, 0.7) },
      { label: "2", tex: "x_k\\to x\\Rightarrow f(x_k)\\to f(x)", at: cue.in(24, 0.4) },
      { label: "3", tex: "f,\\,g\\ \\text{continuous}\\Rightarrow g\\circ f", at: cue.in(28, 0.6) },
      { label: "4", tex: "\\text{continuity depends on } \\tau_X,\\tau_Y", at: cue.in(33, 0.6) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  private graphDelta = 0.2;
  private sqLx: (v: number) => number = (v) => v;

  private seqLocal(k: number): { u: number; v: number } {
    return { u: XPT.u + (110 / k) * Math.cos(2.3 * k + 0.5), v: XPT.v + (110 / k) * Math.sin(2.3 * k + 0.5) };
  }

  /** δ-ball around x carried a fraction s of the way to its image under f. */
  private deltaImagePts(s: number): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * 2 * Math.PI;
      const u = XPT.u + DELTA_R * Math.cos(a);
      const v = XPT.v + DELTA_R * Math.sin(a);
      pts.push(this.fold.xPoint(u, v).lerp(this.fold.image(u, v), s));
    }
    return pts;
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    PixelSpace.apply(this.stage);

    // ---- ε–δ graph: s1–s4 and again s9–s14
    const graphA = c.p(1, 0.6) * (1 - c.p(5, 0.6));
    const graphC = c.p(9, 0.6) * (1 - c.p(15, 0.6));
    const graph = Math.max(graphA, graphC);
    this.axes.forEach((a) => a.setOpacity(graph));
    this.curve.setOpacity(graph);
    this.x0Dot.setOpacity(graph);
    this.x0Guide.forEach((g) => g.setOpacity(graph * 0.8));
    this.x0Labels.forEach((l) => l.set({ opacity: graph }));
    const eps = Math.max(graphA * c.p(2, 0.6), graphC * c.p(10, 0.6));
    this.epsBand.setOpacity(0.2 * eps);
    this.epsEdges.forEach((e) => e.setOpacity(eps));
    this.epsLabel.setContent(t >= c.s(4) && t < c.s(5) ? "V" : t >= c.s(10) ? "V=B_\\varepsilon(f(x_0))" : "f(x_0)\\pm\\varepsilon");
    this.epsLabel.set({ opacity: eps });
    const del = Math.max(graphA * c.p(3, 0.6), graphC * c.p(12, 0.6));
    this.deltaBand.setOpacity(0.18 * del);
    this.deltaEdges.forEach((e) => e.setOpacity(del));
    this.deltaLabel.setContent(t >= c.s(12) ? "B_\\delta(x_0)" : "x_0\\pm\\delta");
    this.deltaLabel.set({ opacity: del });
    this.greenSeg.setOpacity(Math.max(graphA * c.p(3, 0.6, 1.2), graphC * c.p(13, 0.6)));
    const pre = graphC * c.p(11, 0.6);
    this.preSegs.forEach((p) => p.setOpacity(pre));
    this.preLabel.set({ opacity: pre });
    this.deltaSeg.setOpacity(graphC * c.p(12, 0.6, 0.6));
    this.epsDeltaDef.set({ opacity: graphA * c.p(1, 0.5, 0.5) * (1 - c.p(4, 0.5)) });
    this.openWords.set({ opacity: graphA * c.p(4, 0.5) });

    // ---- definition (s5–s8)
    this.defn.set({ opacity: c.p(5, 0.6) * (1 - c.p(9, 0.6)) });
    this.preDef.set({ opacity: c.p(6, 0.6) * (1 - c.p(9, 0.6)) });
    const sq = c.p(7, 0.6) * (1 - c.p(9, 0.6));
    this.lineY.setOpacity(sq);
    this.lineX.setOpacity(sq);
    this.lineLabels.forEach((l) => l.set({ opacity: sq }));
    this.vSeg.setOpacity(sq);
    const sqPre = sq * c.p(7, 0.6, 2.0);
    this.preSegsSq.forEach((p) => p.setOpacity(sqPre));
    this.sqArrows.forEach((a) => a.setProgress(c.p(7, 1.0, 2.4), sq));
    this.sqFormula.set({ opacity: sq * c.p(8, 0.5) });

    // ---- two panels: s4–s6 (definition picture), s15–s20 (⇐), s21–s24 (convergence)
    const panelA = c.p(5, 0.6, 0.6) * (1 - c.p(7, 0.5));
    const panelD = c.p(15, 0.6) * (1 - c.p(25, 0.6));
    const panel = Math.max(panelA, panelD);
    this.xFill.setOpacity(0.1 * panel);
    this.xBlob.setOpacity(panel);
    this.yFill.setOpacity(0.1 * panel);
    this.yBlob.setOpacity(panel);
    this.panelLabels.forEach((l) => l.set({ opacity: panel }));
    this.fArrow.setProgress(Math.max(panelA, panelD), panel);
    this.fLabel.set({ opacity: panel });
    const vOn = Math.max(panelA * c.p(5, 0.5, 1.4), panelD);
    this.vFill.setOpacity(0.3 * vOn);
    this.vEdge.setOpacity(vOn);
    this.vLabel.set({ opacity: vOn });
    const preOn = Math.max(panelA * c.p(5, 0.6, 2.4), panelD * c.p(15, 0.6, 0.8));
    this.preFill.forEach((r) => r.setOpacity(0.3 * preOn));
    this.preEdge.forEach((e) => e.setOpacity(preOn));
    this.preNote.set({ opacity: panelA * c.p(5, 0.6, 2.4) + panelD * c.p(19, 0.6) * (1 - c.p(21, 0.5)) });
    const ptOn = panelD * c.p(16, 0.5);
    this.xDot.setOpacity(ptOn);
    this.fxDot.setOpacity(ptOn);
    this.xLab.set({ opacity: ptOn });
    this.fxLab.set({ opacity: ptOn });
    const ballsOn = panelD * (1 - c.p(21, 0.5));
    this.epsBall.setOpacity(ballsOn * c.p(16, 0.5, 1.5));
    this.deltaBall.setOpacity(ballsOn * c.p(17, 0.5));
    const carry = c.over(17, 0.25, 0.85);
    const di = this.deltaImagePts(carry);
    this.deltaImage.setPoints(di);
    this.deltaImageFill.setPoints(di);
    const imgOn = ballsOn * (t >= c.s(17) ? 1 : 0) * (carry > 0.001 ? 1 : 0);
    this.deltaImage.setOpacity(imgOn);
    this.deltaImageFill.setOpacity(0.3 * imgOn);
    const seqOn = panelD * c.p(22, 0.5);
    const kShown = 1 + 13 * c.over(23, 0.0, 0.8);
    this.seqX.forEach((d, i) => {
      d.setOpacity(seqOn * (i + 1 <= kShown ? 1 : 0));
      d.setColor(t >= c.s(23) && i + 1 >= 4 ? Palette.yellow : Palette.orange);
    });
    this.seqY.forEach((d, i) => {
      d.setOpacity(seqOn * (i + 1 <= kShown ? 1 : 0));
      d.setColor(t >= c.s(23) && i + 1 >= 4 ? Palette.yellow : Palette.orange);
    });

    // ---- proof-step line at the bottom
    const steps: [number, string][] = [
      [10, "V=B_\\varepsilon(f(x))\\ \\text{open in } Y"],
      [11, "f^{-1}(V)\\ \\text{open in } X,\\quad x\\in f^{-1}(V)"],
      [12, "\\exists\\delta>0:\\ B_\\delta(x)\\subseteq f^{-1}(V)"],
      [13, "d_X(x,x')<\\delta\\Rightarrow f(x')\\in V\\Rightarrow d_Y(f(x),f(x'))<\\varepsilon"],
      [15, "V\\subseteq Y\\ \\text{open}"],
      [16, "x\\in f^{-1}(V):\\ \\exists\\varepsilon:\\ B_\\varepsilon(f(x))\\subseteq V"],
      [17, "\\exists\\delta:\\ f(B_\\delta(x))\\subseteq B_\\varepsilon(f(x))\\subseteq V"],
      [18, "B_\\delta(x)\\subseteq f^{-1}(V)\\ \\Rightarrow\\ f^{-1}(V)\\ \\text{open}"],
      [22, "x_k\\to x,\\quad V\\ni f(x)\\ \\text{open}"],
      [23, "f^{-1}(V)\\ni x\\ \\text{open}\\Rightarrow x_k\\in f^{-1}(V)\\ (k\\ge K)\\Rightarrow f(x_k)\\in V"],
      [24, "f(x_k)\\to f(x)"],
    ];
    let line = "";
    for (const [i, tex] of steps) if (t >= c.s(i)) line = tex;
    const stepVisible = (t >= c.s(10) && t < c.s(15) - 0.3) || (t >= c.s(15) && t < c.s(20)) || (t >= c.s(22) && t < c.s(25));
    this.stepLine.setContent(line);
    this.stepLine.set({ opacity: stepVisible ? 1 : 0 });
    this.gainNote.set({ opacity: c.during(20, 21, 0.4) });

    // ---- composition (s25–s28)
    const comp = c.p(25, 0.6) * (1 - c.p(29, 0.6));
    this.compFills.forEach((r) => r.setOpacity(0.1 * comp));
    this.compBlobs.forEach((b) => b.setOpacity(comp));
    this.compLabels.forEach((l) => l.set({ opacity: comp }));
    this.compArrows.forEach((a, i) => a.setProgress(comp * c.p(26, 0.8, 0.5 * i), comp));
    this.compArrowLabels.forEach((l, i) => l.set({ opacity: comp * c.p(26, 0.5, 0.5 * i) }));
    const wOn = comp * c.p(26, 0.5, 1.5);
    this.wFill.setOpacity(0.3 * wOn);
    this.wEdge.setOpacity(wOn);
    const gOn = comp * c.p(27, 0.6, 1.0);
    this.gPreFill.setOpacity(0.3 * gOn);
    this.gPreEdge.setOpacity(gOn);
    const fgOn = comp * c.p(27, 0.6, 2.4);
    this.fgPreFill.setOpacity(0.3 * fgOn);
    this.fgPreEdge.setOpacity(fgOn);
    this.compRegionLabels[0].set({ opacity: wOn });
    this.compRegionLabels[1].set({ opacity: gOn });
    this.compRegionLabels[2].set({ opacity: fgOn });
    this.compFormula.set({ opacity: comp * c.p(27, 0.6), color: t >= c.s(28) ? Palette.green : Palette.text });

    // ---- identity maps (s29–s34)
    const idOn = c.p(29, 0.6);
    this.idRows[0].set({ opacity: idOn * c.p(30, 0.6) });
    this.idNote.set({ opacity: idOn * c.p(30, 0.6, 1.5) });
    this.idRows[1].set({ opacity: idOn * c.p(31, 0.6) });
    const pic = idOn * c.p(32, 0.6) * (1 - c.p(34, 0.6));
    this.idLines.forEach((l) => l.setOpacity(pic));
    this.idZero.forEach((d) => d.setOpacity(pic));
    this.idLineLabels.forEach((l) => l.set({ opacity: pic }));
    const shrink = 60 * Math.pow(0.25, c.over(32, 0.3, 0.9));
    this.idProbe.setPoints([PixelSpace.p(390 - shrink, 560), PixelSpace.p(390 + shrink, 560)]);
    this.idProbe.setOpacity(pic * 0.8);
    this.idProbePoint.setPosition(PixelSpace.p(390 + shrink / 2, 560));
    this.idProbePoint.setOpacity(pic);
    this.sameNote.set({ opacity: idOn * c.p(33, 0.6) * (1 - c.p(34, 0.5)) });
    this.chartNote.set({ opacity: c.p(34, 0.6) });
    void this.sqLx;
    void this.graphDelta;

    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
