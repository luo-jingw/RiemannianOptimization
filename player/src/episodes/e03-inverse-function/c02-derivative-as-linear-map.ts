import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { CurvedArrow } from "../../primitives/CurvedArrow";
import { Dot } from "../../primitives/Dot";
import { lerp } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { BendMap } from "./lib/BendMap";
import { pxv, usePixelView } from "./lib/PixelSpace";
import { PlotAxes } from "./lib/PlotAxes";
import { PlotFrame } from "./lib/PlotFrame";
import { RoadSign } from "./lib/RoadSign";
import { Tex } from "./lib/Tex";

/**
 * E03 c02 — the derivative as the best linear approximation.
 * Left: domain grid around x = (0.4, 0.5). Right: magnified image window around F(x) (zoom factor Z).
 * Sentence indices refer to story.en.json, scene c02-derivative-as-linear-map.
 */

const X0: [number, number] = [0.4, 0.5];
const DIR: [number, number] = [0.6, 0.8];
const DELTA = 0.3;
const HALF_LINES = 4;
const LEFT = { x: 290, y: 470, s: 140 };
const RIGHT = { x: 790, y: 470, s: 130, half: 260 };
const ZOOM_MAX = 12;
const E_PERTURB: [number, number, number, number] = [0.15, 0, 0, -0.1];

type Mat2 = [number, number, number, number];

function mul(m: Mat2, a: number, b: number): [number, number] {
  return [m[0] * a + m[1] * b, m[2] * a + m[3] * b];
}

interface ImageLine {
  /** Direction 0 = constant u (vertical), 1 = constant v (horizontal). */
  dir: number;
  index: number;
  line: Polyline;
}

export class DerivativeScene implements Scene {
  readonly id = "c02-derivative-as-linear-map";
  private readonly DF: Mat2 = BendMap.jacobian(X0[0], X0[1]);
  private readonly B: Mat2 = [
    BendMap.jacobian(X0[0], X0[1])[0] + E_PERTURB[0], BendMap.jacobian(X0[0], X0[1])[1] + E_PERTURB[1],
    BendMap.jacobian(X0[0], X0[1])[2] + E_PERTURB[2], BendMap.jacobian(X0[0], X0[1])[3] + E_PERTURB[3],
  ];
  private readonly FX: [number, number] = BendMap.apply(X0[0], X0[1]);

  // Phase A: zoom
  private domainGrid: Polyline[] = [];
  private domainDot!: Dot;
  private domainLabel!: FormulaHandle;
  private window!: Polyline;
  private frame!: Polyline;
  private imageLines: ImageLine[] = [];
  private imageDot!: Dot;
  private imageLabel!: FormulaHandle;
  private zoomLabel!: FormulaHandle;
  private mapArrow!: CurvedArrow;
  private mapLabel!: FormulaHandle;
  private dfLines: Polyline[] = [];
  private bLines: Polyline[] = [];
  private dfLabel!: FormulaHandle;
  private bLabel!: FormulaHandle;
  private mapFormula!: FormulaHandle;
  private defFormula!: FormulaHandle;
  private orderNote!: FormulaHandle;
  private jacobian!: FormulaHandle;

  // Ratio chart
  private chartAxes!: PlotAxes;
  private trueCurve!: Polyline;
  private bCurve!: Polyline;
  private trueLabel!: FormulaHandle;
  private bCurveLabel!: FormulaHandle;
  private sameOrderNote!: FormulaHandle;

  // Phase B: directional derivative
  private lineDomain!: Polyline;
  private vArrow!: Arrow;
  private vLabel!: FormulaHandle;
  private curveImage!: Polyline;
  private tangentArrow!: Arrow;
  private tangentLabel!: FormulaHandle;
  private sweepDomain!: Dot;
  private sweepImage!: Dot;
  private dirFormula!: FormulaHandle;
  private proofLine!: FormulaHandle;

  // Phase C: x^T x
  private quadLines: FormulaHandle[] = [];

  // Phase D: chain rule
  private chainShapes: Polyline[][] = [];
  private chainArrows: Arrow[] = [];
  private chainArrowLabels: FormulaHandle[] = [];
  private chainTitles: FormulaHandle[] = [];
  private chainBig!: CurvedArrow;
  private chainBigLabel!: FormulaHandle;
  private chainFormula!: FormulaHandle;
  private chainNote!: FormulaHandle;

  // Phase E: operator norm
  private unitCircle!: Polyline;
  private ellipse!: Polyline;
  private hArrow!: Arrow;
  private ahArrow!: Arrow;
  private maxArrow!: Arrow;
  private hLabel!: FormulaHandle;
  private ahLabel!: FormulaHandle;
  private maxLabel!: FormulaHandle;
  private normDef!: FormulaHandle;
  private normIneq!: FormulaHandle;
  private caution!: FormulaHandle;
  private closing!: FormulaHandle;

  private ledger!: ProofLedger;
  private road!: RoadSign;
  private readonly normA: Mat2 = [1.3, 0.5, 0.2, 0.7];
  private maxAngle = 0;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    usePixelView(stage);
    const dom = (u: number, v: number): THREE.Vector3 => pxv(LEFT.x + LEFT.s * (u - X0[0]), LEFT.y - LEFT.s * (v - X0[1]));
    const ext = HALF_LINES * DELTA;

    // ---- Domain grid and window
    for (let i = -HALF_LINES; i <= HALF_LINES; i++) {
      this.domainGrid.push(new Polyline(stage, [dom(X0[0] + i * DELTA, X0[1] - ext), dom(X0[0] + i * DELTA, X0[1] + ext)], { color: "#3b4a70", width: 1.6 }));
      this.domainGrid.push(new Polyline(stage, [dom(X0[0] - ext, X0[1] + i * DELTA), dom(X0[0] + ext, X0[1] + i * DELTA)], { color: "#3b4a70", width: 1.6 }));
    }
    this.domainDot = new Dot(stage, dom(X0[0], X0[1]), Palette.orange, 0.07);
    this.domainLabel = fl.add({ tex: "x", x: LEFT.x - 18, y: LEFT.y + 22, size: 32, color: Palette.orange });
    this.window = new Polyline(stage, this.squarePts(1), { color: Palette.orange, width: 2.5 });
    this.frame = new Polyline(stage, [
      pxv(RIGHT.x - RIGHT.half, RIGHT.y - RIGHT.half), pxv(RIGHT.x + RIGHT.half, RIGHT.y - RIGHT.half),
      pxv(RIGHT.x + RIGHT.half, RIGHT.y + RIGHT.half), pxv(RIGHT.x - RIGHT.half, RIGHT.y + RIGHT.half),
      pxv(RIGHT.x - RIGHT.half, RIGHT.y - RIGHT.half)], { color: Palette.grid, width: 2 });
    for (let dir = 0; dir < 2; dir++) {
      for (let i = -HALF_LINES; i <= HALF_LINES; i++) {
        this.imageLines.push({ dir, index: i, line: new Polyline(stage, this.imageLinePts(dir, i, 1), { color: Palette.blue, width: 2.2 }) });
      }
    }
    this.imageDot = new Dot(stage, pxv(RIGHT.x, RIGHT.y), Palette.orange, 0.07);
    this.imageLabel = fl.add({ tex: "F(x)", x: RIGHT.x + 36, y: RIGHT.y + 26, size: 30, color: Palette.orange });
    this.zoomLabel = fl.add({ tex: "\\times 1.0", x: RIGHT.x + RIGHT.half - 10, y: RIGHT.y - RIGHT.half + 24, size: 28, color: Palette.muted, align: "right" });
    this.mapArrow = new CurvedArrow(stage, pxv(LEFT.x + 120, LEFT.y - 230), pxv(RIGHT.x - 200, RIGHT.y - 230), 0.4, Palette.text);
    this.mapLabel = fl.add({ tex: "F", x: (LEFT.x + RIGHT.x) / 2 - 40, y: LEFT.y - 300, size: 36 });
    for (let i = -HALF_LINES; i <= HALF_LINES; i++) {
      for (let dir = 0; dir < 2; dir++) {
        const a: [number, number] = dir === 0 ? [i * DELTA, -ext] : [-ext, i * DELTA];
        const b: [number, number] = dir === 0 ? [i * DELTA, ext] : [ext, i * DELTA];
        this.dfLines.push(new Polyline(stage, [this.rightLin(this.DF, a), this.rightLin(this.DF, b)], { color: Palette.yellow, width: 2, dashed: true, dashSize: 0.08, gapSize: 0.06 }));
        this.bLines.push(new Polyline(stage, [this.rightLin(this.B, a), this.rightLin(this.B, b)], { color: Palette.red, width: 2, dashed: true, dashSize: 0.08, gapSize: 0.06 }));
      }
    }
    this.dfLabel = fl.add({ tex: "DF(x)", x: RIGHT.x - RIGHT.half + 70, y: RIGHT.y + RIGHT.half - 28, size: 30, color: Palette.yellow });
    this.bLabel = fl.add({ tex: "B", x: RIGHT.x + RIGHT.half - 40, y: RIGHT.y + RIGHT.half - 28, size: 30, color: Palette.red });
    this.mapFormula = fl.add({ tex: "F(u,v)=(u+0.3\\sin v,\\ \\ v+0.3\\,u^2)", x: 700, y: 100, size: 40 });
    this.defFormula = fl.add({ tex: this.defTex(0), x: 700, y: 100, size: 40 });
    this.orderNote = fl.add({ tex: "o(\\|h\\|):\\ \\text{smaller than first order}\\quad(\\text{not required: } o(\\|h\\|^2))", x: 700, y: 790, size: 30, color: Palette.muted });
    this.jacobian = fl.add({ tex: this.jacTex(0), x: 700, y: 790, size: 34 });

    // ---- Ratio chart (error / ‖h‖ against ‖h‖)
    const chart = new PlotFrame(1060, 640, 480, 1500);
    this.chartAxes = new PlotAxes(stage, fl, chart, { uMin: 0, uMax: 0.62, vMin: 0, vMax: 0.2, uLabel: "\\|h\\|", vLabel: "\\tfrac{\\|\\text{error}\\|}{\\|h\\|}" });
    const ratio = (m: Mat2, s: number): number => {
      const fp = BendMap.apply(X0[0] + s * DIR[0], X0[1] + s * DIR[1]);
      const lin = mul(m, s * DIR[0], s * DIR[1]);
      return Math.hypot(fp[0] - this.FX[0] - lin[0], fp[1] - this.FX[1] - lin[1]) / s;
    };
    const sGrid: number[] = [];
    for (let k = 0; k <= 80; k++) sGrid.push(0.6 - (0.596 * k) / 80);
    this.trueCurve = new Polyline(stage, sGrid.map((s) => chart.v3(s, ratio(this.DF, s))), { color: Palette.green, width: 3.5 });
    this.bCurve = new Polyline(stage, sGrid.map((s) => chart.v3(s, Math.min(0.2, ratio(this.B, s)))), { color: Palette.red, width: 3.5 });
    const bEnd = ratio(this.B, 0.004);
    this.trueLabel = fl.add({ tex: "DF(x):\\ \\to 0", x: 1200, y: 672, size: 26, color: Palette.green });
    this.bCurveLabel = fl.add({ tex: `B:\\ \\to ${bEnd.toFixed(2)}`, x: 1180, y: 362, size: 26, color: Palette.red });
    this.sameOrderNote = fl.add({ tex: "\\text{error}=O(\\|h\\|)\\ \\text{holds for every linear map}", x: 700, y: 790, size: 32, color: Palette.red });

    // ---- Directional derivative
    this.lineDomain = new Polyline(stage, [dom(X0[0] - 1.1 * DIR[0], X0[1] - 1.1 * DIR[1]), dom(X0[0] + 1.1 * DIR[0], X0[1] + 1.1 * DIR[1])], { color: Palette.orange, width: 3 });
    this.vArrow = new Arrow(stage, dom(X0[0], X0[1]), dom(X0[0] + 0.55 * DIR[0], X0[1] + 0.55 * DIR[1]), Palette.yellow, { width: 4, headLength: 0.16 });
    this.vLabel = fl.add({ tex: "v", x: LEFT.x + 0.55 * DIR[0] * LEFT.s - 22, y: LEFT.y - 0.55 * DIR[1] * LEFT.s - 6, size: 32, color: Palette.yellow });
    const curvePts: THREE.Vector3[] = [];
    for (let k = 0; k <= 80; k++) {
      const tt = -1.1 + (2.2 * k) / 80;
      const p = BendMap.apply(X0[0] + tt * DIR[0], X0[1] + tt * DIR[1]);
      curvePts.push(pxv(RIGHT.x + RIGHT.s * (p[0] - this.FX[0]), RIGHT.y - RIGHT.s * (p[1] - this.FX[1])));
    }
    this.curveImage = new Polyline(stage, curvePts, { color: Palette.orange, width: 3 });
    const dv = mul(this.DF, DIR[0], DIR[1]);
    const tip = pxv(RIGHT.x + RIGHT.s * 0.55 * dv[0], RIGHT.y - RIGHT.s * 0.55 * dv[1]);
    this.tangentArrow = new Arrow(stage, pxv(RIGHT.x, RIGHT.y), tip, Palette.yellow, { width: 4, headLength: 0.16 });
    this.tangentLabel = fl.add({ tex: "DF(x)[v]", x: RIGHT.x + RIGHT.s * 0.55 * dv[0] + 95, y: RIGHT.y - RIGHT.s * 0.55 * dv[1] + 10, size: 30, color: Palette.yellow });
    this.sweepDomain = new Dot(stage, dom(X0[0], X0[1]), Palette.text, 0.06);
    this.sweepImage = new Dot(stage, pxv(RIGHT.x, RIGHT.y), Palette.text, 0.06);
    this.dirFormula = fl.add({ tex: "DF(x)[v]=\\frac{d}{dt}\\,F(x+tv)\\Big|_{t=0}", x: 700, y: 110, size: 42, color: Palette.yellow });
    this.proofLine = fl.add({ tex: "h=tv", x: 700, y: 795, size: 36 });

    // ---- x^T x
    const quad = [
      "h(x)=x^{\\top}x",
      "h(x+tv)=(x+tv)^{\\top}(x+tv)",
      `=x^{\\top}x+${Tex.color(Palette.yellow, "\\boxed{2\\,x^{\\top}v}")}\\;t+t^2\\,v^{\\top}v`,
      `\\Longrightarrow\\quad ${Tex.color(Palette.yellow, "Dh(x)[v]=2\\,x^{\\top}v")}`,
      "\\text{no partial derivatives needed}",
    ];
    this.quadLines = quad.map((tex, i) => fl.add({ tex, x: 700, y: 260 + i * 110, size: i === 4 ? 30 : 44, color: i === 4 ? Palette.muted : Palette.text }));

    // ---- Chain rule
    const M1: Mat2 = [1.1, 0.45, 0.2, 0.9];
    const M2: Mat2 = [0.85, -0.5, 0.45, 0.95];
    const M21: Mat2 = [M2[0] * M1[0] + M2[1] * M1[2], M2[0] * M1[1] + M2[1] * M1[3], M2[2] * M1[0] + M2[3] * M1[2], M2[2] * M1[1] + M2[3] * M1[3]];
    const centers = [250, 700, 1150];
    const mats: Mat2[] = [[1, 0, 0, 1], M1, M21];
    const colors = [Palette.orange, Palette.blue, Palette.purple];
    mats.forEach((m, k) => {
      const shapes: Polyline[] = [];
      const S = 95;
      const tr = (a: number, b: number): THREE.Vector3 => {
        const q = mul(m, a, b);
        return pxv(centers[k] + S * q[0], 470 - S * q[1]);
      };
      shapes.push(new Polyline(stage, [tr(-0.5, -0.5), tr(0.5, -0.5), tr(0.5, 0.5), tr(-0.5, 0.5), tr(-0.5, -0.5)], { color: colors[k], width: 3 }));
      for (const g of [-1 / 6, 1 / 6]) {
        shapes.push(new Polyline(stage, [tr(g, -0.5), tr(g, 0.5)], { color: colors[k], width: 1.5 }));
        shapes.push(new Polyline(stage, [tr(-0.5, g), tr(0.5, g)], { color: colors[k], width: 1.5 }));
      }
      this.chainShapes.push(shapes);
    });
    this.chainArrows = [
      new Arrow(stage, pxv(370, 470), pxv(560, 470), Palette.text, { width: 3, headLength: 0.16 }),
      new Arrow(stage, pxv(830, 470), pxv(1010, 470), Palette.text, { width: 3, headLength: 0.16 }),
    ];
    this.chainArrowLabels = [
      fl.add({ tex: "DF(x)", x: 465, y: 435, size: 28 }),
      fl.add({ tex: "DG(F(x))", x: 920, y: 435, size: 28 }),
    ];
    this.chainTitles = ["x", "F(x)", "G(F(x))"].map((tex, k) => fl.add({ tex: `\\text{at } ${tex}`, x: centers[k], y: 310, size: 28, color: Palette.muted }));
    this.chainBig = new CurvedArrow(stage, pxv(250, 610), pxv(1150, 610), -0.9, Palette.green, 3);
    this.chainBigLabel = fl.add({ tex: "D(G\\circ F)(x)", x: 700, y: 735, size: 30, color: Palette.green });
    this.chainFormula = fl.add({ tex: "D(G\\circ F)(x)=DG(F(x))\\,DF(x)", x: 700, y: 110, size: 42, color: Palette.yellow });
    this.chainNote = fl.add({ text: "the linearization of a composition is the composition of the linearizations", x: 700, y: 180, size: 26, color: Palette.muted });

    // ---- Operator norm
    const NC = { x: 430, y: 470, s: 150 };
    const circ: THREE.Vector3[] = [];
    const ell: THREE.Vector3[] = [];
    let best = 0;
    for (let k = 0; k <= 128; k++) {
      const a = (2 * Math.PI * k) / 128;
      circ.push(pxv(NC.x + NC.s * Math.cos(a), NC.y - NC.s * Math.sin(a)));
      const q = mul(this.normA, Math.cos(a), Math.sin(a));
      ell.push(pxv(NC.x + NC.s * q[0], NC.y - NC.s * q[1]));
    }
    for (let k = 0; k < 3600; k++) {
      const a = (Math.PI * k) / 3600;
      const q = mul(this.normA, Math.cos(a), Math.sin(a));
      const n = Math.hypot(q[0], q[1]);
      if (n > best) { best = n; this.maxAngle = a; }
    }
    this.unitCircle = new Polyline(stage, circ, { color: Palette.muted, width: 2, dashed: true, dashSize: 0.08, gapSize: 0.06 });
    this.ellipse = new Polyline(stage, ell, { color: Palette.blue, width: 3 });
    this.hArrow = new Arrow(stage, pxv(NC.x, NC.y), pxv(NC.x + NC.s, NC.y), Palette.orange, { width: 3.5, headLength: 0.15 });
    this.ahArrow = new Arrow(stage, pxv(NC.x, NC.y), pxv(NC.x + NC.s, NC.y), Palette.blue, { width: 3.5, headLength: 0.15 });
    const qm = mul(this.normA, Math.cos(this.maxAngle), Math.sin(this.maxAngle));
    this.maxArrow = new Arrow(stage, pxv(NC.x, NC.y), pxv(NC.x + NC.s * qm[0], NC.y - NC.s * qm[1]), Palette.yellow, { width: 4, headLength: 0.16 });
    this.hLabel = fl.add({ tex: "h", x: 0, y: 0, size: 30, color: Palette.orange });
    this.ahLabel = fl.add({ tex: "Ah", x: 0, y: 0, size: 30, color: Palette.blue });
    this.maxLabel = fl.add({ tex: `\\|A\\|=${best.toFixed(2)}`, x: NC.x + NC.s * qm[0] + 20, y: NC.y - NC.s * qm[1] - 26, size: 30, color: Palette.yellow, align: "left" });
    this.normA2 = { cx: NC.x, cy: NC.y, s: NC.s };
    this.normDef = fl.add({ tex: "\\|A\\|=\\sup_{\\|h\\|\\le 1}\\|Ah\\|", x: 1030, y: 380, size: 42 });
    this.normIneq = fl.add({ tex: "\\|Ah\\|\\le\\|A\\|\\,\\|h\\|", x: 1030, y: 490, size: 42, color: Palette.yellow });
    this.caution = fl.add({ tex: "\\text{all partials exist}\\ \\not\\Rightarrow\\ \\text{differentiable}\\qquad(\\text{every map here is } C^1)", x: 700, y: 690, size: 30, color: Palette.muted });
    this.closing = fl.add({ tex: "DF(x)\\ \\text{invertible}\\ \\overset{?}{\\Longrightarrow}\\ F\\ \\text{invertible near } x", x: 700, y: 790, size: 40, color: Palette.yellow });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "DF(x):\\ \\ r(h)=o(\\|h\\|)", at: cue.s(9) + 1.0 },
      { label: "2", tex: "DF(x)[v]=\\tfrac{d}{dt}F(x{+}tv)\\big|_{0}", at: cue.s(25) + 0.8 },
      { label: "3", tex: "Dh(x)[v]=2x^{\\top}v", at: cue.s(28) + 1.0 },
      { label: "4", tex: "D(G\\circ F)=DG\\cdot DF", at: cue.s(31) + 1.0 },
      { label: "5", tex: "\\|Ah\\|\\le\\|A\\|\\,\\|h\\|", at: cue.s(34) + 1.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
    this.road = new RoadSign(fl, 700);
  }

  private normA2 = { cx: 0, cy: 0, s: 1 };

  private defTex(stage: number): string {
    const parts = [
      "F(x+h)=F(x)+DF(x)\\,h+r(h)",
      ",\\qquad \\frac{\\|r(h)\\|}{\\|h\\|}\\to 0",
    ];
    if (stage >= 3) return "F(x+h)=F(x)+DF(x)\\,h+o(\\|h\\|)";
    return Tex.reveal(parts, stage);
  }

  private jacTex(stage: number): string {
    if (stage === 0) return "DF(x)=\\begin{pmatrix}\\partial_u F_1 & \\partial_v F_1\\\\ \\partial_u F_2 & \\partial_v F_2\\end{pmatrix}=\\begin{pmatrix}1 & 0.3\\cos v\\\\ 0.6\\,u & 1\\end{pmatrix}";
    return "F\\in C^1\\iff x\\mapsto DF(x)\\ \\text{is continuous}";
  }

  private squarePts(zoom: number): THREE.Vector3[] {
    const h = (HALF_LINES * DELTA * LEFT.s) / zoom;
    return [pxv(LEFT.x - h, LEFT.y - h), pxv(LEFT.x + h, LEFT.y - h), pxv(LEFT.x + h, LEFT.y + h), pxv(LEFT.x - h, LEFT.y + h), pxv(LEFT.x - h, LEFT.y - h)];
  }

  /** Image of one domain grid line through the window of half-size 1.2 / zoom, magnified by zoom. */
  private imageLinePts(dir: number, index: number, zoom: number): THREE.Vector3[] {
    const ext = (HALF_LINES * DELTA) / zoom;
    const off = (index * DELTA) / zoom;
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 40; k++) {
      const s = -ext + (2 * ext * k) / 40;
      const u = X0[0] + (dir === 0 ? off : s);
      const v = X0[1] + (dir === 0 ? s : off);
      const p = BendMap.apply(u, v);
      pts.push(pxv(RIGHT.x + RIGHT.s * zoom * (p[0] - this.FX[0]), RIGHT.y - RIGHT.s * zoom * (p[1] - this.FX[1])));
    }
    return pts;
  }

  private rightLin(m: Mat2, a: [number, number]): THREE.Vector3 {
    const q = mul(m, a[0], a[1]);
    return pxv(RIGHT.x + RIGHT.s * q[0], RIGHT.y - RIGHT.s * q[1]);
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;

    // ---- Zoom factor: in over s2–s4, back to 1 at s18
    const zprog = t < c.s(2) ? 0 : t >= c.e(4) ? 1 : (t - c.s(2)) / (c.e(4) - c.s(2));
    const zoomIn = zprog * zprog * (3 - 2 * zprog);
    const Z = Math.exp(Math.log(ZOOM_MAX) * zoomIn * (1 - c.p(18, 1.5)));

    const panels = c.p(0, 0.8, -0.8) * (1 - c.p(26, 0.8));
    this.domainGrid.forEach((l) => l.setOpacity(0.9 * panels));
    this.domainDot.setOpacity(panels);
    this.domainLabel.set({ opacity: panels });
    const winVis = c.p(2, 0.5) * (1 - c.p(18, 0.8)) * panels;
    this.window.setPoints(this.squarePts(Z));
    this.window.setOpacity(winVis);
    this.frame.setOpacity(panels);
    const imgVis = c.p(1, 0.8) * panels;
    for (const il of this.imageLines) {
      il.line.setPoints(this.imageLinePts(il.dir, il.index, Z));
      il.line.setOpacity(imgVis);
    }
    this.imageDot.setOpacity(imgVis);
    this.imageLabel.set({ opacity: imgVis * (1 - c.p(5, 0.5) * (1 - c.p(18, 0.5))) });
    this.zoomLabel.setContent(`\\times ${Z.toFixed(1)}`);
    this.zoomLabel.set({ opacity: c.p(2, 0.5) * panels });
    this.mapArrow.setProgress(c.p(1, 1.0), panels);
    this.mapLabel.set({ opacity: c.p(1, 0.8) * panels });
    const dfVis = c.p(5, 0.8) * (1 - c.p(18, 0.6)) * panels;
    this.dfLines.forEach((l) => l.setOpacity(dfVis));
    this.dfLabel.set({ opacity: dfVis });
    const bVis = c.p(14, 0.8) * (1 - c.p(18, 0.6)) * panels;
    this.bLines.forEach((l) => l.setOpacity(bVis));
    this.bLabel.set({ opacity: bVis });

    this.mapFormula.set({ opacity: c.p(1, 0.8) * (1 - c.p(6, 0.5)) });
    const defStage = t >= c.s(9) ? 3 : t >= c.s(8) ? 2 : t >= c.s(7) ? 1 : 0;
    this.defFormula.setContent(this.defTex(defStage));
    this.defFormula.set({ opacity: c.p(7, 0.6) * (1 - c.p(18, 0.6)) });
    this.orderNote.set({ opacity: c.p(10, 0.6) * (1 - c.p(11, 0.5)) });
    this.jacobian.setContent(this.jacTex(t >= c.s(12) ? 1 : 0));
    this.jacobian.set({ opacity: c.p(11, 0.6) * (1 - c.p(13, 0.6)) });

    // ---- Ratio chart: s8 (true derivative), s14–s17 (candidate B)
    const chartVis = c.p(8, 0.6) * (1 - c.p(18, 0.6));
    this.chartAxes.setOpacity(chartVis);
    this.trueCurve.setOpacity(chartVis);
    this.trueCurve.setProgress(c.over(8, 0.1, 0.9));
    this.trueCurve.setWidth(t >= c.s(15) && t < c.s(16) ? 5.5 : 3.5);
    this.trueLabel.set({ opacity: chartVis * c.p(8, 0.6, 2.0) });
    this.bCurve.setProgress(c.over(16, 0.05, 0.8));
    this.bCurve.setOpacity(chartVis * c.p(16, 0.3));
    this.bCurveLabel.set({ opacity: chartVis * c.p(16, 0.6, 1.5) });
    this.sameOrderNote.set({ opacity: c.p(17, 0.6) * (1 - c.p(18, 0.6)) });

    // ---- Directional derivative: s18–s25
    const dirVis = c.p(19, 0.6) * panels;
    this.lineDomain.setOpacity(dirVis);
    this.lineDomain.setProgress(c.over(19, 0.05, 0.6));
    this.vArrow.setOpacity(dirVis);
    this.vLabel.set({ opacity: dirVis });
    this.curveImage.setOpacity(c.p(20, 0.4) * panels);
    this.curveImage.setProgress(c.over(20, 0.05, 0.8));
    this.tangentArrow.setOpacity(c.p(21, 0.6) * panels);
    this.tangentLabel.set({ opacity: c.p(21, 0.6) * panels });
    const sweepT = lerp(-1.1, 1.1, c.over(20, 0.05, 0.8));
    const sweepVis = c.p(20, 0.3) * (1 - c.p(21, 0.4)) * panels;
    this.sweepDomain.setPosition(pxv(LEFT.x + LEFT.s * sweepT * DIR[0], LEFT.y - LEFT.s * sweepT * DIR[1]));
    this.sweepDomain.setOpacity(sweepVis);
    const sp = BendMap.apply(X0[0] + sweepT * DIR[0], X0[1] + sweepT * DIR[1]);
    this.sweepImage.setPosition(pxv(RIGHT.x + RIGHT.s * (sp[0] - this.FX[0]), RIGHT.y - RIGHT.s * (sp[1] - this.FX[1])));
    this.sweepImage.setOpacity(sweepVis);
    this.dirFormula.set({ opacity: c.p(21, 0.6) * (1 - c.p(26, 0.6)) });
    const proofs = [
      "\\text{put } h=tv",
      "F(x+tv)-F(x)=t\\,DF(x)v+r(tv)",
      "\\frac{\\|r(tv)\\|}{|t|}=\\|v\\|\\,\\frac{\\|r(tv)\\|}{\\|tv\\|}\\ \\to\\ 0",
      `\\frac{F(x+tv)-F(x)}{t}\\ \\to\\ DF(x)v\\quad ${Tex.color(Palette.green, "\\checkmark")}`,
    ];
    const proofIdx = t >= c.s(25) ? 3 : t >= c.s(24) ? 2 : t >= c.s(23) ? 1 : 0;
    this.proofLine.setContent(proofs[proofIdx]);
    this.proofLine.set({ opacity: c.p(22, 0.5) * (1 - c.p(26, 0.6)) });

    // ---- x^T x: s26–s29
    const quadVis = 1 - c.p(30, 0.6);
    const quadAt = [26, 27, 27.5, 28, 29];
    this.quadLines.forEach((h, i) => {
      const k = quadAt[i];
      const start = Number.isInteger(k) ? c.s(k) : c.in(Math.floor(k), 0.55);
      h.set({ opacity: (t >= start ? Math.min(1, (t - start) / 0.5) : 0) * quadVis });
    });

    // ---- Chain rule: s30–s32
    const chainVis = c.p(30, 0.8, 0.4) * (1 - c.p(33, 0.6));
    this.chainShapes.forEach((shapes, k) => shapes.forEach((s) => s.setOpacity(chainVis * c.p(30, 0.6, 0.6 + 0.8 * k))));
    this.chainArrows.forEach((a, k) => a.setOpacity(chainVis * c.p(30, 0.6, 1.2 + 0.8 * k)));
    this.chainArrowLabels.forEach((h, k) => h.set({ opacity: chainVis * c.p(30, 0.6, 1.2 + 0.8 * k) }));
    this.chainTitles.forEach((h, k) => h.set({ opacity: chainVis * c.p(30, 0.6, 0.6 + 0.8 * k) }));
    this.chainBig.setProgress(c.over(31, 0.1, 0.7), chainVis);
    this.chainBigLabel.set({ opacity: chainVis * c.p(31, 0.6, 1.0) });
    this.chainFormula.set({ opacity: c.p(31, 0.6) * (1 - c.p(33, 0.6)) });
    this.chainNote.set({ opacity: c.p(32, 0.6) * (1 - c.p(33, 0.6)) });

    // ---- Operator norm: s33–s34
    const normVis = c.p(33, 0.8);
    this.unitCircle.setOpacity(normVis);
    this.ellipse.setOpacity(normVis);
    const angNow = lerp(0, 2 * Math.PI + this.maxAngle, c.over(33, 0.1, 0.75));
    const hx = Math.cos(angNow);
    const hy = Math.sin(angNow);
    const ah = mul(this.normA, hx, hy);
    const N = this.normA2;
    this.hArrow.set(pxv(N.cx, N.cy), pxv(N.cx + N.s * hx, N.cy - N.s * hy));
    this.hArrow.setOpacity(normVis);
    this.ahArrow.set(pxv(N.cx, N.cy), pxv(N.cx + N.s * ah[0], N.cy - N.s * ah[1]));
    this.ahArrow.setOpacity(normVis);
    this.hLabel.set({ x: N.cx + N.s * hx * 0.55 + 22 * hy, y: N.cy - N.s * hy * 0.55 + 22 * hx, opacity: normVis });
    const maxVis = normVis * c.p(33, 0.6, (c.e(33) - c.s(33)) * 0.8);
    this.ahLabel.set({ x: N.cx + N.s * ah[0] * 1.1 + 20, y: N.cy - N.s * ah[1] * 1.1, opacity: normVis * (1 - maxVis) });
    this.maxArrow.setOpacity(maxVis);
    this.maxLabel.set({ opacity: maxVis });
    this.normDef.set({ opacity: c.p(33, 0.6) });
    this.normIneq.set({ opacity: c.p(34, 0.6) });
    this.caution.set({ opacity: c.p(35, 0.6) });
    this.closing.set({ opacity: c.p(36, 0.6) });

    this.ledger.update(t, 1, true);
    this.road.update(c.p(0, 0.8, -0.8), 0);
  }

  teardown(_layers: SceneLayers): void {}
}
