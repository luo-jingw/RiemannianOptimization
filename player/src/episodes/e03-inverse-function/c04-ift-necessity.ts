import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { clamp01, lerp, smoothstep } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Region } from "../../primitives/Region";
import { pxv, usePixelView } from "./lib/PixelSpace";
import { PlotAxes } from "./lib/PlotAxes";
import { PlotFrame } from "./lib/PlotFrame";
import { RoadSign } from "./lib/RoadSign";
import { Tex } from "./lib/Tex";
import { WiggleMap } from "./lib/WiggleMap";

/**
 * E03 c04 — four counterexamples: x³ (inverse not differentiable), x² (not one-to-one, image not open),
 * polar coordinates (local but not global), x + 2x² sin(1/x) (derivative not continuous).
 * Sentence indices refer to story.en.json, scene c04-ift-necessity.
 */

const CUBE = new PlotFrame(700, 450, 170);
const SQUARE = new PlotFrame(700, 560, 200);
const FOLD = { x: 700, y: 470, s: 170 };
const STRIP = { x0: 160, y: 250, sTheta: 86, sR: 80 };
const ANNULUS = { x: 700, y: 590, s: 130 };
const WIG = { x: 650, y: 360, half: 180 };
const DER = { y: 760, s: 22 };
const WIG_W0 = 0.4;
const CROSS_DOTS = 7;

interface PolarLine {
  pts: [number, number][];
  turn: number;
  line: Polyline;
}

export class IftNecessityScene implements Scene {
  readonly id = "c04-ift-necessity";

  // x³
  private cubeAxes!: PlotAxes;
  private cubeCurve!: Polyline;
  private rootCurve!: Polyline;
  private diag!: Polyline;
  private flatTangent!: Polyline;
  private vertTangent!: Polyline;
  private cubeLabels: FormulaHandle[] = [];
  private cubeDeriv!: FormulaHandle;
  private cubeProof!: FormulaHandle;
  private cubeVerdict!: FormulaHandle;

  // x²
  private sqAxes!: PlotAxes;
  private sqCurve!: Polyline;
  private sqInterval!: Polyline;
  private sqDots: Dot[] = [];
  private sqVerticals: Polyline[] = [];
  private sqImageDot!: Dot;
  private sqNeg!: Region;
  private sqNegLabel!: FormulaHandle;
  private sqFormula!: FormulaHandle;
  private foldLines: { pts: [number, number][]; line: Polyline }[] = [];
  private foldLabel!: FormulaHandle;
  private sqVerdict!: FormulaHandle;

  // polar
  private polarLines: PolarLine[] = [];
  private squarePatch!: Region;
  private pairDots: Dot[] = [];
  private polarFormulas: FormulaHandle[] = [];
  private polarVerdict!: FormulaHandle;
  private stripLabels: FormulaHandle[] = [];

  // wiggle
  private wigAxisX!: Polyline;
  private wigAxisY!: Polyline;
  private wigCurve!: Polyline;
  private derAxis!: Polyline;
  private derCurve!: Polyline;
  private derLevels: Polyline[] = [];
  private derLevelLabels: FormulaHandle[] = [];
  private derZero!: Dot;
  private xkDots: Dot[] = [];
  private ykDots: Dot[] = [];
  private hLine!: Polyline;
  private crossDots: Dot[] = [];
  private wigFormulas: FormulaHandle[] = [];
  private zoomLabel!: FormulaHandle;
  private wigTitle!: FormulaHandle;

  // summary
  private miniLines: Polyline[][] = [];
  private miniTitles: FormulaHandle[] = [];
  private miniVerdicts: FormulaHandle[] = [];
  private closing!: FormulaHandle;

  private ledger!: ProofLedger;
  private road!: RoadSign;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    usePixelView(stage);

    // ---- x³ and its inverse
    this.cubeAxes = new PlotAxes(stage, fl, CUBE, { uMin: -1.6, uMax: 1.7, vMin: -1.75, vMax: 1.6, uLabel: "x", vLabel: "y" });
    const cube: THREE.Vector3[] = [];
    const root: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) {
      const x = -1.2 + (2.4 * i) / 160;
      cube.push(CUBE.v3(x, x * x * x));
      root.push(CUBE.v3(x * x * x, x));
    }
    this.cubeCurve = new Polyline(stage, cube, { color: Palette.blue, width: 3.5 });
    this.rootCurve = new Polyline(stage, root, { color: Palette.purple, width: 3.5 });
    this.diag = new Polyline(stage, [CUBE.v3(-1.6, -1.6), CUBE.v3(1.65, 1.65)], { color: Palette.muted, width: 1.5, dashed: true, dashSize: 0.08, gapSize: 0.08 });
    this.flatTangent = new Polyline(stage, [CUBE.v3(-0.6, 0), CUBE.v3(0.6, 0)], { color: Palette.orange, width: 5 });
    this.vertTangent = new Polyline(stage, [CUBE.v3(0, -0.6), CUBE.v3(0, 0.6)], { color: Palette.red, width: 5 });
    this.cubeLabels = [
      fl.add({ tex: "y=x^3", x: CUBE.px(0.95, 1.55).x - 70, y: CUBE.px(0.95, 1.55).y, size: 30, color: Palette.blue }),
      fl.add({ tex: "y=x^{1/3}", x: CUBE.px(1.55, 1.15).x + 20, y: CUBE.px(1.55, 1.15).y + 40, size: 30, color: Palette.purple }),
      fl.add({ tex: "\\text{slope } 0", x: CUBE.px(0.6, 0).x + 60, y: CUBE.px(0.6, 0).y + 24, size: 26, color: Palette.orange }),
      fl.add({ tex: "\\text{slope } \\infty", x: CUBE.px(0, 0.45).x - 85, y: CUBE.px(0, 0.45).y, size: 26, color: Palette.red }),
    ];
    this.cubeDeriv = fl.add({ tex: "F(x)=x^3,\\qquad F'(0)=3\\cdot 0^2=0", x: 700, y: 100, size: 38 });
    this.cubeProof = fl.add({ tex: this.cubeProofTex(0), x: 700, y: 800, size: 34 });
    this.cubeVerdict = fl.add({ tex: `\\begin{gathered}\\text{inverse exists } ${Tex.color(Palette.green, "\\checkmark")}\\\\ \\text{inverse differentiable } ${Tex.color(Palette.red, "\\times")}\\end{gathered}`, x: 1160, y: 560, size: 30, display: true });

    // ---- x²
    this.sqAxes = new PlotAxes(stage, fl, SQUARE, { uMin: -1.35, uMax: 1.4, vMin: -0.75, vMax: 1.75, uLabel: "x", vLabel: "y" });
    const sq: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) {
      const x = -1.25 + (2.5 * i) / 120;
      sq.push(SQUARE.v3(x, x * x));
    }
    this.sqCurve = new Polyline(stage, sq, { color: Palette.blue, width: 3.5 });
    this.sqInterval = new Polyline(stage, [SQUARE.v3(-0.8, 0), SQUARE.v3(0.8, 0)], { color: Palette.orange, width: 7 });
    this.sqDots = [-0.4, 0.4].map((x) => new Dot(stage, SQUARE.v3(x, 0), Palette.yellow, 0.07));
    this.sqVerticals = [-0.4, 0.4].map((x) => new Polyline(stage, [SQUARE.v3(x, 0), SQUARE.v3(x, 0.16), SQUARE.v3(0, 0.16)], { color: Palette.yellow, width: 2.5, dashed: true, dashSize: 0.06, gapSize: 0.05 }));
    this.sqImageDot = new Dot(stage, SQUARE.v3(0, 0.16), Palette.red, 0.08);
    this.sqNeg = new Region(stage, [SQUARE.v3(-1.35, 0), SQUARE.v3(1.35, 0), SQUARE.v3(1.35, -0.7), SQUARE.v3(-1.35, -0.7)], Palette.red, 0.18);
    this.sqNegLabel = fl.add({ text: "y < 0: never reached", x: SQUARE.px(0.75, -0.4).x, y: SQUARE.px(0.75, -0.4).y, size: 26, color: Palette.red });
    this.sqFormula = fl.add({ tex: "F(x)=x^2:\\quad F\\big(\\tfrac{\\varepsilon}{2}\\big)=F\\big(-\\tfrac{\\varepsilon}{2}\\big)=\\tfrac{\\varepsilon^2}{4}", x: 700, y: 100, size: 38 });
    const foldPts: [number, number][][] = [];
    for (let k = -4; k <= 4; k++) {
      const g = k / 4;
      const vert: [number, number][] = [];
      const horz: [number, number][] = [];
      for (let i = 0; i <= 40; i++) {
        const s = -1 + (2 * i) / 40;
        vert.push([g, s]);
        horz.push([s, g]);
      }
      foldPts.push(vert, horz);
    }
    this.foldLines = foldPts.map((pts) => {
      const left = pts.every((q) => q[0] <= 0);
      return { pts, line: new Polyline(stage, pts.map((q) => this.foldPx(q, 0)), { color: left ? Palette.orange : Palette.blue, width: 2 }) };
    });
    this.foldLabel = fl.add({ tex: "(x,y)\\mapsto(x^2,\\,y)\\ \\text{folds the plane along the } y\\text{-axis}", x: 700, y: 100, size: 36 });
    this.sqVerdict = fl.add({ tex: `\\text{one-to-one } ${Tex.color(Palette.red, "\\times")}\\qquad \\text{image open } ${Tex.color(Palette.red, "\\times")}`, x: 700, y: 800, size: 34 });

    // ---- polar coordinates: strip [0.5, 1.5] × [0, 4π] rolled onto the annulus
    const addPolar = (pts: [number, number][], turn: number): void => {
      this.polarLines.push({ pts, turn, line: new Polyline(stage, pts.map((q) => this.stripPx(q[0], q[1])), { color: turn === 0 ? Palette.blue : Palette.orange, width: 2 }) });
    };
    for (let k = 0; k <= 16; k++) {
      const th = (k * Math.PI) / 4;
      const turn = k < 8 ? 0 : 1;
      const pts: [number, number][] = [];
      for (let i = 0; i <= 10; i++) pts.push([0.5 + i / 10, th]);
      addPolar(pts, k === 8 ? 1 : turn);
    }
    for (const r of [0.5, 0.75, 1.0, 1.25, 1.5]) {
      for (let turn = 0; turn < 2; turn++) {
        const pts: [number, number][] = [];
        for (let i = 0; i <= 64; i++) pts.push([r, 2 * Math.PI * turn + (2 * Math.PI * i) / 64]);
        addPolar(pts, turn);
      }
    }
    this.patchPts = [];
    for (let i = 0; i <= 10; i++) this.patchPts.push([0.85, 1.0 + 0.5 * i / 10]);
    for (let i = 0; i <= 10; i++) this.patchPts.push([0.85 + 0.35 * i / 10, 1.5]);
    for (let i = 0; i <= 10; i++) this.patchPts.push([1.2, 1.5 - 0.5 * i / 10]);
    for (let i = 0; i <= 10; i++) this.patchPts.push([1.2 - 0.35 * i / 10, 1.0]);
    this.squarePatch = new Region(stage, this.patchPts.map((q) => this.stripPx(q[0], q[1])), Palette.green, 0.6, 0.01);
    this.pairDots = [0, 1].map((k) => new Dot(stage, pxv(0, 0), k === 0 ? Palette.yellow : Palette.pink, 0.08));
    const pf = [
      "F(r,\\theta)=(r\\cos\\theta,\\ r\\sin\\theta)",
      "DF=\\begin{pmatrix}\\cos\\theta&-r\\sin\\theta\\\\ \\sin\\theta& r\\cos\\theta\\end{pmatrix}",
      "\\det DF=r\\cos^2\\theta+r\\sin^2\\theta=r>0",
      `${Tex.color(Palette.red, "F(r,\\theta)=F(r,\\theta+2\\pi)")}`,
    ];
    this.polarFormulas = pf.map((tex, i) => fl.add({ tex, x: 1150, y: [420, 520, 620, 700][i], size: i === 1 ? 28 : 28, display: i === 1 }));
    this.polarVerdict = fl.add({ tex: `\\text{local diffeo } ${Tex.color(Palette.green, "\\checkmark")}\\qquad \\text{global } ${Tex.color(Palette.red, "\\times")}`, x: 1150, y: 790, size: 32 });
    this.stripLabels = [
      fl.add({ tex: "\\theta\\in[0,2\\pi]", x: STRIP.x0 + STRIP.sTheta * Math.PI, y: STRIP.y - 70, size: 26, color: Palette.blue }),
      fl.add({ tex: "\\theta\\in[2\\pi,4\\pi]", x: STRIP.x0 + STRIP.sTheta * 3 * Math.PI, y: STRIP.y - 70, size: 26, color: Palette.orange }),
      fl.add({ tex: "r", x: STRIP.x0 - 30, y: STRIP.y, size: 28, color: Palette.muted }),
    ];

    // ---- x + 2x² sin(1/x)
    this.wigAxisX = new Polyline(stage, [pxv(WIG.x - WIG.half - 10, WIG.y), pxv(WIG.x + WIG.half + 10, WIG.y)], { color: Palette.axis, width: 2 });
    this.wigAxisY = new Polyline(stage, [pxv(WIG.x, WIG.y - WIG.half - 90), pxv(WIG.x, WIG.y + WIG.half + 90)], { color: Palette.axis, width: 2 });
    this.wigCurve = new Polyline(stage, this.wigglePts(WIG_W0), { color: Palette.blue, width: 2.5 });
    this.derAxis = new Polyline(stage, [pxv(WIG.x - WIG.half - 10, DER.y), pxv(WIG.x + WIG.half + 10, DER.y)], { color: Palette.axis, width: 1.5 });
    this.derCurve = new Polyline(stage, this.derivPts(WIG_W0), { color: Palette.purple, width: 1.5 });
    this.derLevels = [-1, 3].map((v) => new Polyline(stage, [pxv(WIG.x - WIG.half, DER.y - DER.s * v), pxv(WIG.x + WIG.half, DER.y - DER.s * v)], { color: v < 0 ? Palette.red : Palette.green, width: 1.5, dashed: true, dashSize: 0.06, gapSize: 0.05 }));
    this.derLevelLabels = [
      fl.add({ tex: "-1", x: WIG.x - WIG.half - 30, y: DER.y + DER.s, size: 22, color: Palette.red }),
      fl.add({ tex: "3", x: WIG.x - WIG.half - 30, y: DER.y - 3 * DER.s, size: 22, color: Palette.green }),
      fl.add({ tex: "F'", x: WIG.x + WIG.half + 40, y: DER.y - 40, size: 26, color: Palette.purple }),
    ];
    this.derZero = new Dot(stage, pxv(WIG.x, DER.y - DER.s), Palette.orange, 0.07);
    for (let k = 1; k <= 6; k++) {
      this.xkDots.push(new Dot(stage, pxv(0, 0), Palette.red, 0.055));
      this.ykDots.push(new Dot(stage, pxv(0, 0), Palette.green, 0.055));
    }
    this.hLine = new Polyline(stage, [pxv(0, 0), pxv(1, 0)], { color: Palette.yellow, width: 2 });
    for (let i = 0; i < CROSS_DOTS; i++) this.crossDots.push(new Dot(stage, pxv(0, 0), Palette.yellow, 0.06));
    const wf = [
      "F(x)=x+2x^2\\sin\\tfrac1x,\\ \\ F(0)=0",
      "F'(0)=\\lim_{h\\to0}\\big(1+2h\\sin\\tfrac1h\\big)=1",
      "F'(x)=1+4x\\sin\\tfrac1x-2\\cos\\tfrac1x",
      `${Tex.color(Palette.red, "x_k=\\tfrac{1}{2k\\pi}:\\ F'(x_k)=-1")}`,
      `${Tex.color(Palette.green, "y_k=\\tfrac{1}{(2k+1)\\pi}:\\ F'(y_k)=3")}`,
      "\\text{1-1 \\& continuous on an interval}\\Rightarrow\\text{monotone}",
      `${Tex.color(Palette.red, "F'\\ \\text{not continuous at } 0")}`,
    ];
    this.wigFormulas = wf.map((tex, i) => fl.add({ tex, x: 1120, y: [130, 200, 270, 340, 400, 470, 540][i], size: i === 5 ? 22 : 26 }));
    this.zoomLabel = fl.add({ tex: "\\times 1", x: WIG.x + WIG.half, y: WIG.y - WIG.half - 50, size: 26, color: Palette.muted, align: "right" });
    this.wigTitle = fl.add({ tex: `\\begin{gathered}F'(0)\\ \\text{invertible } ${Tex.color(Palette.green, "\\checkmark")}\\quad F'\\ \\text{continuous } ${Tex.color(Palette.red, "\\times")}\\\\ \\text{one-to-one near } 0\\ ${Tex.color(Palette.red, "\\times")}\\end{gathered}`, x: 1120, y: 660, size: 26, display: true });

    // ---- 2×2 summary
    const cells = [{ x: 330, y: 300 }, { x: 980, y: 300 }, { x: 330, y: 620 }, { x: 980, y: 620 }];
    const mk = (pts: THREE.Vector3[], color: string): Polyline => new Polyline(stage, pts, { color, width: 2.5 });
    const cellPts = (cx: number, cy: number, s: number, f: (u: number) => [number, number], a: number, b: number): THREE.Vector3[] => {
      const out: THREE.Vector3[] = [];
      for (let i = 0; i <= 200; i++) {
        const q = f(a + ((b - a) * i) / 200);
        out.push(pxv(cx + s * q[0], cy - s * q[1]));
      }
      return out;
    };
    const axesFor = (cx: number, cy: number): Polyline[] => [
      mk([pxv(cx - 110, cy), pxv(cx + 110, cy)], Palette.axis), mk([pxv(cx, cy - 100), pxv(cx, cy + 100)], Palette.axis),
    ];
    this.miniLines = [
      [...axesFor(cells[0].x, cells[0].y), mk(cellPts(cells[0].x, cells[0].y, 80, (u) => [u, u * u * u], -1.15, 1.15), Palette.blue), mk(cellPts(cells[0].x, cells[0].y, 80, (u) => [u * u * u, u], -1.15, 1.15), Palette.purple)],
      [...axesFor(cells[1].x, cells[1].y), mk(cellPts(cells[1].x, cells[1].y, 80, (u) => [u, u * u - 0.6], -1.15, 1.15), Palette.blue)],
      [mk(cellPts(cells[2].x, cells[2].y, 60, (u) => [0.6 * Math.cos(u), 0.6 * Math.sin(u)], 0, 2 * Math.PI), Palette.blue),
        mk(cellPts(cells[2].x, cells[2].y, 60, (u) => [1.5 * Math.cos(u), 1.5 * Math.sin(u)], 0, 2 * Math.PI), Palette.orange),
        mk(cellPts(cells[2].x, cells[2].y, 60, (u) => [1.05 * Math.cos(u), 1.05 * Math.sin(u)], 0, 2 * Math.PI), Palette.blue)],
      [...axesFor(cells[3].x, cells[3].y), mk(cellPts(cells[3].x, cells[3].y, 160, (u) => [u, WiggleMap.value(u)], -0.4, 0.4), Palette.blue)],
    ];
    const titles = ["x^3", "x^2", "\\text{polar}", "x+2x^2\\sin\\tfrac1x"];
    const verdicts = [
      "\\text{inverse exists, not differentiable}",
      "\\text{not 1-1, image not open}",
      "\\text{local diffeo, not global}",
      "F'\\ \\text{discontinuous: not 1-1 near } 0",
    ];
    this.miniTitles = titles.map((tex, i) => fl.add({ tex, x: cells[i].x - 250, y: cells[i].y - 80, size: 30, color: Palette.yellow, align: "left" }));
    this.miniVerdicts = verdicts.map((tex, i) => fl.add({ tex, x: cells[i].x, y: cells[i].y + 130, size: 26, color: Palette.red }));
    this.closing = fl.add({ tex: "\\text{next: a tool that constructs solutions, the contraction mapping principle}", x: 700, y: 820, size: 28, color: Palette.yellow });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "x^3:\\ g\\ \\text{not differentiable}", at: cue.s(7) + 1.0 },
      { label: "2", tex: "x^2:\\ \\text{not 1-1, not open}", at: cue.s(13) + 1.0 },
      { label: "3", tex: "\\text{polar: local}\\neq\\text{global}", at: cue.s(20) + 1.0 },
      { label: "4", tex: "C^1:\\ \\text{nondegeneracy spreads}", at: cue.s(31) + 1.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 }, "Counterexamples");
    this.road = new RoadSign(fl, 700);
  }

  private patchPts: [number, number][] = [];

  private cubeProofTex(n: number): string {
    return Tex.reveal([
      "g(x^3)=x",
      "\\ \\Rightarrow\\ g'(0)\\cdot 3\\cdot 0^2=1",
      `\\ \\Rightarrow\\ 0=1\\ ${Tex.color(Palette.red, "\\text{contradiction}")}`,
    ], n);
  }

  /** Fold animation for (x, y) ↦ (x², y): first the left half flips onto the right (x ↦ |x|), then |x| ↦ x². */
  private foldPx(q: [number, number], s: number): THREE.Vector3 {
    const flip = clamp01(s / 0.6);
    const square = clamp01((s - 0.6) / 0.4);
    const x1 = q[0] < 0 ? q[0] * Math.cos(Math.PI * flip) : q[0];
    const x = lerp(x1, x1 * x1, square);
    return pxv(FOLD.x + FOLD.s * x, FOLD.y - FOLD.s * q[1]);
  }

  private stripPx(r: number, th: number): THREE.Vector3 {
    return pxv(STRIP.x0 + STRIP.sTheta * th, STRIP.y - STRIP.sR * (r - 1));
  }

  private annulusPx(r: number, th: number): THREE.Vector3 {
    return pxv(ANNULUS.x + ANNULUS.s * r * Math.cos(th), ANNULUS.y - ANNULUS.s * r * Math.sin(th));
  }

  private wigglePts(w: number): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    const n = 1600;
    for (let i = 0; i <= n; i++) {
      const x = -w + (2 * w * i) / n;
      pts.push(pxv(WIG.x + (WIG.half * x) / w, WIG.y - (WIG.half * WiggleMap.value(x)) / w));
    }
    return pts;
  }

  private derivPts(w: number): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    const n = 1600;
    for (let i = 0; i <= n; i++) {
      const x = -w + (2 * w * i) / n;
      pts.push(pxv(WIG.x + (WIG.half * x) / w, DER.y - DER.s * WiggleMap.derivative(x)));
    }
    return pts;
  }

  /** Window position of an abscissa x for the current half-width w. */
  private wigX(x: number, w: number): number {
    return WIG.x + (WIG.half * x) / w;
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;

    // ---- x³: s1–s8
    const cubeVis = c.p(1, 0.8) * (1 - c.p(9, 0.6));
    this.cubeAxes.setOpacity(cubeVis);
    this.cubeCurve.setOpacity(cubeVis);
    this.cubeCurve.setProgress(c.over(1, 0.05, 0.7));
    this.rootCurve.setOpacity(cubeVis * c.p(2, 0.5));
    this.rootCurve.setProgress(c.over(2, 0.3, 0.9));
    this.diag.setOpacity(0.7 * cubeVis * c.p(2, 0.5));
    this.flatTangent.setOpacity(cubeVis * c.p(4, 0.5));
    this.vertTangent.setOpacity(cubeVis * c.p(4, 0.5, 1.5));
    this.cubeLabels[0].set({ opacity: cubeVis * c.p(1, 0.6, 1.0) });
    this.cubeLabels[1].set({ opacity: cubeVis * c.p(2, 0.6, 1.5) });
    this.cubeLabels[2].set({ opacity: cubeVis * c.p(4, 0.5) });
    this.cubeLabels[3].set({ opacity: cubeVis * c.p(4, 0.5, 1.5) });
    this.cubeDeriv.set({ opacity: c.p(3, 0.6) * (1 - c.p(9, 0.6)) });
    const proofN = t >= c.s(7) ? 3 : t >= c.in(6, 0.5) ? 2 : t >= c.s(5) ? 1 : 0;
    this.cubeProof.setContent(this.cubeProofTex(proofN));
    this.cubeProof.set({ opacity: c.p(5, 0.6) * (1 - c.p(9, 0.6)) });
    this.cubeVerdict.set({ opacity: c.p(7, 0.6) * (1 - c.p(9, 0.6)) });

    // ---- x²: s9–s11 curve, s12 fold, s13 verdict
    const sqVis = c.p(9, 0.8) * (1 - c.p(12, 0.6));
    this.sqAxes.setOpacity(sqVis);
    this.sqCurve.setOpacity(sqVis);
    this.sqCurve.setProgress(c.over(9, 0.05, 0.6));
    this.sqInterval.setOpacity(sqVis * c.p(10, 0.5));
    const meet = c.over(10, 0.3, 0.8);
    this.sqDots.forEach((d) => d.setOpacity(sqVis * c.p(10, 0.5, 0.5)));
    this.sqVerticals.forEach((l) => { l.setOpacity(sqVis * c.p(10, 0.4, 0.8)); l.setProgress(meet); });
    this.sqImageDot.setOpacity(sqVis * smoothstep(0.9, 1, meet));
    this.sqNeg.setOpacity(0.18 * sqVis * c.p(11, 0.6));
    this.sqNegLabel.set({ opacity: sqVis * c.p(11, 0.6) });
    this.sqFormula.set({ opacity: c.p(10, 0.6) * (1 - c.p(12, 0.6)) });
    const foldVis = c.p(12, 0.6, 0.4) * (1 - c.p(14, 0.6));
    const fold = c.over(12, 0.15, 0.85);
    this.foldLines.forEach((f) => {
      f.line.setPoints(f.pts.map((q) => this.foldPx(q, fold)));
      f.line.setOpacity(foldVis);
    });
    this.foldLabel.set({ opacity: foldVis });
    this.sqVerdict.set({ opacity: c.p(13, 0.6) * (1 - c.p(14, 0.6)) });

    // ---- polar: s14–s20
    const polVis = c.p(14, 0.8) * (1 - c.p(21, 0.6));
    const roll0 = c.over(18, 0.05, 0.45);
    const roll1 = c.over(18, 0.5, 0.92);
    this.polarLines.forEach((pl) => {
      const s = pl.turn === 0 ? roll0 : roll1;
      pl.line.setPoints(pl.pts.map((q) => this.stripPx(q[0], q[1]).lerp(this.annulusPx(q[0], q[1]), s)));
      pl.line.setOpacity(polVis * (pl.turn === 1 && s > 0.98 ? 0.75 : 1));
    });
    this.stripLabels.forEach((h) => h.set({ opacity: polVis * (1 - c.p(18, 0.6)) }));
    const patchVis = polVis * c.p(19, 0.6);
    this.squarePatch.setPoints(this.patchPts.map((q) => this.stripPx(q[0], q[1]).lerp(this.annulusPx(q[0], q[1]), roll0)));
    this.squarePatch.setOpacity(0.6 * patchVis);
    const pairVis = polVis * c.p(17, 0.6) * (1 - c.p(19, 0.5));
    [[1.0, 0.8], [1.0, 0.8 + 2 * Math.PI]].forEach((q, k) => {
      const s = k === 0 ? roll0 : roll1;
      this.pairDots[k].setPosition(this.stripPx(q[0], q[1]).lerp(this.annulusPx(q[0], q[1]), s).setZ(0.02));
      this.pairDots[k].setOpacity(pairVis);
    });
    const pfAt = [14, 15, 16, 17];
    this.polarFormulas.forEach((h, i) => h.set({ opacity: c.p(pfAt[i], 0.6) * (1 - c.p(21, 0.6)) }));
    this.polarVerdict.set({ opacity: c.p(19, 0.6, 1.5) * (1 - c.p(21, 0.6)) });

    // ---- wiggle: s21–s31; zoom ×4 during s28
    const wigVis = c.p(21, 0.8) * (1 - c.p(32, 0.6));
    const zoom = c.over(28, 0.0, 0.45);
    const w = WIG_W0 / Math.pow(4, zoom);
    this.wigAxisX.setOpacity(wigVis);
    this.wigAxisY.setOpacity(wigVis);
    this.wigCurve.setPoints(this.wigglePts(w));
    this.wigCurve.setOpacity(wigVis);
    const derVis = wigVis * c.p(23, 0.6);
    this.derAxis.setOpacity(derVis);
    this.derCurve.setPoints(this.derivPts(w));
    this.derCurve.setOpacity(derVis * 0.9);
    this.derLevels.forEach((l) => l.setOpacity(derVis * 0.8));
    this.derLevelLabels.forEach((h) => h.set({ opacity: derVis }));
    this.derZero.setOpacity(wigVis * c.p(22, 0.6));
    const kVis = wigVis * c.p(24, 0.5) * (1 - c.p(28, 0.4));
    const yVis = wigVis * c.p(25, 0.5) * (1 - c.p(28, 0.4));
    this.xkDots.forEach((d, i) => {
      const x = WiggleMap.xk(i + 1);
      d.setPosition(pxv(this.wigX(x, w), DER.y + DER.s, 0.02));
      d.setOpacity(kVis);
    });
    this.ykDots.forEach((d, i) => {
      const x = WiggleMap.yk(i + 1);
      d.setPosition(pxv(this.wigX(x, w), DER.y - 3 * DER.s, 0.02));
      d.setOpacity(yVis);
    });
    // Horizontal line through F(x_m), x_m = 1/(2mπ) with x_m near 0.8 w (window ×1 in s27, ×4 after the zoom).
    const lineVis = wigVis * Math.max(c.p(27, 0.5) * (1 - c.p(28, 0.4)), c.p(28, 0.5, (c.e(28) - c.s(28)) * 0.55));
    const m = Math.max(1, Math.round(1 / (2 * Math.PI * 0.8 * w)));
    const xm = WiggleMap.xk(m);
    const level = WiggleMap.value(xm);
    const roots = WiggleMap.crossings(level, -w, w, 4000);
    const ly = WIG.y - (WIG.half * level) / w;
    this.hLine.setPoints([pxv(WIG.x - WIG.half, ly, 0.01), pxv(WIG.x + WIG.half, ly, 0.01)]);
    this.hLine.setOpacity(lineVis);
    this.crossDots.forEach((d, i) => {
      d.setPosition(pxv(i < roots.length ? this.wigX(roots[i], w) : WIG.x, ly, 0.02));
      d.setOpacity(i < roots.length ? lineVis : 0);
    });
    this.zoomLabel.setContent(`\\times ${(WIG_W0 / w).toFixed(1)}`);
    this.zoomLabel.set({ opacity: wigVis });
    const wfAt = [21, 22, 23, 24, 25, 27, 29];
    this.wigFormulas.forEach((h, i) => h.set({ opacity: c.p(wfAt[i], 0.6) * (1 - c.p(32, 0.6)) }));
    this.wigTitle.set({ opacity: c.p(30, 0.6) * (1 - c.p(32, 0.6)) });

    // ---- summary: s32–s35
    const sumAt = [32, 32, 33, 34];
    this.miniLines.forEach((lines, i) => {
      const o = c.p(sumAt[i], 0.6, i === 1 ? 2.5 : 0);
      lines.forEach((l) => l.setOpacity(o));
      this.miniTitles[i].set({ opacity: o });
      this.miniVerdicts[i].set({ opacity: o });
    });
    this.closing.set({ opacity: c.p(35, 0.6) });

    this.ledger.update(t, 1, true);
    this.road.update(c.p(0, 0.8, -0.8), 0);
  }

  teardown(_layers: SceneLayers): void {}
}
