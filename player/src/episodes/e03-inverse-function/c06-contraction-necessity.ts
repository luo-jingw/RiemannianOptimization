import type * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Cues } from "../../primitives/Cues";
import { CurvedArrow } from "../../primitives/CurvedArrow";
import { Dot } from "../../primitives/Dot";
import { clamp01 } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Region } from "../../primitives/Region";
import { pxv, usePixelView } from "./lib/PixelSpace";
import { PlotAxes } from "./lib/PlotAxes";
import { PlotFrame } from "./lib/PlotFrame";
import { RoadSign } from "./lib/RoadSign";
import { Tex } from "./lib/Tex";

/**
 * E03 c06 — why completeness and a uniform c < 1 are needed.
 * (0,1] with x/2 (no limit in X); x + 1 on ℝ (c = 1); x + 1/x on [1, ∞) (no uniform c); closed vs open ball.
 * Sentence indices refer to story.en.json, scene c06-contraction-necessity.
 */

const LINE1 = { x0: 150, s: 1100, y: 450 };
const N_HALF = 10;
const LINE2 = { x0: 230, s: 120, y: 450 };
const COB = new PlotFrame(130, 770, 95);
const N_COB = 14;
const BALL = { r: 170, y: 470, closedX: 430, openX: 980 };

export class ContractionNecessityScene implements Scene {
  readonly id = "c06-contraction-necessity";

  private line1!: Polyline;
  private hole!: Dot;
  private holeLabel!: FormulaHandle;
  private halfDots: Dot[] = [];
  private halfJumps: CurvedArrow[] = [];
  private tickLabels: FormulaHandle[] = [];
  private cross!: FormulaHandle;
  private f1: FormulaHandle[] = [];
  private verdict1!: FormulaHandle;

  private line2!: Polyline;
  private shiftDot!: Dot;
  private shiftBars: Polyline[] = [];
  private shiftTicks: FormulaHandle[] = [];
  private f2!: FormulaHandle;
  private verdict2!: FormulaHandle;

  private cobAxes!: PlotAxes;
  private xRange!: Polyline;
  private cobCurve!: Polyline;
  private cobDiag!: Polyline;
  private cobPath!: Polyline;
  private cobLabels: FormulaHandle[] = [];
  private iter: number[] = [];
  private f3: FormulaHandle[] = [];
  private ratioRows: FormulaHandle[] = [];

  private closedFill!: Region;
  private closedEdge!: Polyline;
  private openFill!: Region;
  private openEdge!: Polyline;
  private seqDots: Dot[] = [];
  private limitHole!: Dot;
  private ballLabels: FormulaHandle[] = [];
  private closing!: FormulaHandle;

  private failMarks: FormulaHandle[] = [];
  private ledger!: ProofLedger;
  private road!: RoadSign;

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    usePixelView(stage);

    // ---- (0, 1] with x/2
    this.line1 = new Polyline(stage, [pxv(LINE1.x0, LINE1.y), pxv(LINE1.x0 + LINE1.s, LINE1.y)], { color: Palette.blue, width: 4 });
    this.hole = new Dot(stage, pxv(LINE1.x0, LINE1.y, 0.02), Palette.red, 0.12, "2d", true);
    this.holeLabel = fl.add({ tex: "0\\notin X", x: LINE1.x0, y: LINE1.y + 50, size: 30, color: Palette.red });
    for (let n = 0; n <= N_HALF; n++) {
      const x = Math.pow(0.5, n);
      this.halfDots.push(new Dot(stage, pxv(LINE1.x0 + LINE1.s * x, LINE1.y, 0.03), Palette.orange, 0.07));
      if (n < N_HALF) {
        const a = pxv(LINE1.x0 + LINE1.s * x, LINE1.y - 8);
        const b = pxv(LINE1.x0 + LINE1.s * x / 2, LINE1.y - 8);
        this.halfJumps.push(new CurvedArrow(stage, a, b, -Math.min(1.2, LINE1.s * x / 2 / 100 * 0.35), Palette.orange, 2.5));
      }
    }
    this.tickLabels = ["1", "\\tfrac12", "\\tfrac14", "\\tfrac18"].map((tex, n) => fl.add({ tex, x: LINE1.x0 + LINE1.s * Math.pow(0.5, n), y: LINE1.y + 45, size: 28, color: Palette.muted }));
    this.cross = fl.add({ tex: "\\times", x: LINE1.x0, y: LINE1.y - 60, size: 60, color: Palette.red });
    const f1 = [
      "X=(0,1],\\qquad \\varphi(x)=\\tfrac{x}{2},\\qquad \\varphi(X)=(0,\\tfrac12]\\subset X,\\qquad c=\\tfrac12",
      "x_n=2^{-n}\\ \\text{Cauchy},\\qquad x_n\\to 0\\notin X",
      `\\varphi(x)=x\\iff x=0\\notin X\\ \\Rightarrow\\ ${Tex.color(Palette.red, "\\text{no fixed point}")}`,
    ];
    this.f1 = f1.map((tex, i) => fl.add({ tex, x: 700, y: [110, 640, 710][i], size: i === 0 ? 32 : 34 }));
    this.verdict1 = fl.add({ tex: `\\text{Cauchy } ${Tex.color(Palette.green, "\\checkmark")}\\qquad \\text{limit in } X\\ ${Tex.color(Palette.red, "\\times")}\\qquad\\text{(completeness step fails)}`, x: 700, y: 790, size: 30 });

    // ---- x + 1 on ℝ
    this.line2 = new Polyline(stage, [pxv(LINE2.x0 - 100, LINE2.y), pxv(1360, LINE2.y)], { color: Palette.blue, width: 4 });
    this.shiftDot = new Dot(stage, pxv(LINE2.x0, LINE2.y, 0.03), Palette.orange, 0.09);
    for (let n = 0; n < 9; n++) {
      this.shiftBars.push(new Polyline(stage, [pxv(LINE2.x0 + LINE2.s * n + 6, LINE2.y + 50), pxv(LINE2.x0 + LINE2.s * (n + 1) - 6, LINE2.y + 50)], { color: Palette.yellow, width: 6 }));
    }
    this.shiftTicks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => fl.add({ tex: n === 0 ? "x_0" : `x_0{+}${n}`, x: LINE2.x0 + LINE2.s * n, y: LINE2.y - 40, size: 22, color: Palette.muted }));
    this.f2 = fl.add({ tex: "\\varphi(x)=x+1\\ \\text{on } \\mathbb{R}:\\qquad |\\varphi(x)-\\varphi(y)|=|x-y|\\quad(c=1)", x: 700, y: 110, size: 34 });
    this.verdict2 = fl.add({ tex: `\\varphi(x)=x\\ \\text{has no solution: distances never shrink, the iterates drift off}`, x: 700, y: 640, size: 30, color: Palette.red });

    // ---- x + 1/x on [1, ∞)
    this.cobAxes = new PlotAxes(stage, fl, COB, { uMin: 0, uMax: 6.6, vMin: 0, vMax: 6.7, uLabel: "x", vLabel: "y" });
    this.xRange = new Polyline(stage, [COB.v3(1, 0), COB.v3(6.5, 0)], { color: Palette.green, width: 7 });
    const curve: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) {
      const x = 0.4 + (6.1 * i) / 120;
      curve.push(COB.v3(x, Math.min(6.7, x + 1 / x)));
    }
    this.cobCurve = new Polyline(stage, curve, { color: Palette.blue, width: 3.5 });
    this.cobDiag = new Polyline(stage, [COB.v3(0, 0), COB.v3(6.6, 6.6)], { color: Palette.muted, width: 2, dashed: true, dashSize: 0.07, gapSize: 0.06 });
    this.iter = [1];
    for (let i = 0; i < N_COB; i++) this.iter.push(this.iter[i] + 1 / this.iter[i]);
    const path: THREE.Vector3[] = [COB.v3(1, 0)];
    for (let i = 0; i < N_COB; i++) {
      if (this.iter[i + 1] > 6.5) break;
      path.push(COB.v3(this.iter[i], this.iter[i + 1]));
      path.push(COB.v3(this.iter[i + 1], this.iter[i + 1]));
    }
    this.cobPath = new Polyline(stage, path, { color: Palette.orange, width: 2.5 });
    this.cobLabels = [
      fl.add({ tex: "y=x+\\tfrac1x", x: COB.px(0.75, 3.4).x + 70, y: COB.px(0.75, 3.4).y - 20, size: 28, color: Palette.blue }),
      fl.add({ tex: "y=x", x: COB.px(5.9, 5.6).x + 30, y: COB.px(5.9, 5.6).y + 20, size: 26, color: Palette.muted }),
      fl.add({ tex: "X=[1,\\infty)", x: COB.px(3.5, 0).x, y: COB.px(3.5, 0).y + 32, size: 26, color: Palette.green }),
    ];
    const f3 = [
      "X=[1,\\infty)\\ \\text{closed in } \\mathbb{R}\\Rightarrow\\text{complete}",
      "\\varphi(x)=x+\\tfrac1x\\ \\ge 2\\ \\Rightarrow\\ \\varphi(X)\\subseteq X",
      "|\\varphi x-\\varphi y|=|x-y|\\,\\big(1-\\tfrac{1}{xy}\\big)",
      "xy\\ge1\\Rightarrow 0\\le 1-\\tfrac{1}{xy}<1",
      `${Tex.color(Palette.red, "\\varphi(x)-x=\\tfrac1x>0:\\ \\text{no fixed point}")}`,
      `${Tex.color(Palette.red, "\\sup_{x,y}\\big(1-\\tfrac1{xy}\\big)=1:\\ \\text{no uniform } c<1")}`,
    ];
    this.f3 = f3.map((tex, i) => fl.add({ tex, x: 1080, y: [130, 195, 260, 325, 390, 790][i], size: 26 }));
    for (let n = 0; n < 6; n++) {
      const a = this.iter[n];
      const b = this.iter[n + 1];
      this.ratioRows.push(fl.add({ tex: `n=${n}:\\ \\ 1-\\tfrac{1}{x_nx_{n+1}}=${(1 - 1 / (a * b)).toFixed(3)}`, x: 1080, y: 470 + n * 46, size: 24, color: Palette.yellow }));
    }

    // ---- closed vs open ball
    const circ = (cx: number): THREE.Vector3[] => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 96; i++) pts.push(pxv(cx + BALL.r * Math.cos((2 * Math.PI * i) / 96), BALL.y - BALL.r * Math.sin((2 * Math.PI * i) / 96)));
      return pts;
    };
    this.closedFill = new Region(stage, circ(BALL.closedX), Palette.green, 0.2);
    this.closedEdge = new Polyline(stage, circ(BALL.closedX), { color: Palette.green, width: 4 });
    this.openFill = new Region(stage, circ(BALL.openX), Palette.blue, 0.15);
    this.openEdge = new Polyline(stage, circ(BALL.openX), { color: Palette.blue, width: 3, dashed: true, dashSize: 0.1, gapSize: 0.08 });
    for (let n = 0; n < 9; n++) this.seqDots.push(new Dot(stage, pxv(BALL.openX + BALL.r * (1 - Math.pow(0.5, n)) * 0.999, BALL.y, 0.02), Palette.orange, 0.055));
    this.limitHole = new Dot(stage, pxv(BALL.openX + BALL.r, BALL.y, 0.03), Palette.red, 0.1, "2d", true);
    this.ballLabels = [
      fl.add({ tex: "\\bar B\\ \\text{closed in }\\mathbb{R}^n\\Rightarrow\\text{complete}", x: BALL.closedX, y: BALL.y + BALL.r + 50, size: 30, color: Palette.green }),
      fl.add({ tex: "B\\ \\text{open: not complete}", x: BALL.openX, y: BALL.y + BALL.r + 50, size: 30, color: Palette.blue }),
      fl.add({ tex: "\\text{limit}\\notin B", x: BALL.openX + BALL.r + 20, y: BALL.y - 40, size: 26, color: Palette.red, align: "left" }),
    ];
    this.closing = fl.add({ tex: "\\text{next: } f(x)=y\\ \\text{as a fixed point problem}", x: 700, y: 110, size: 34, color: Palette.yellow });

    // ---- ledger: the four facts from c05; the failing step is marked
    this.failMarks = [0, 1].map((i) => fl.add({ tex: "\\times", x: 1385, y: 210 + (i === 0 ? 2 : 1) * 125, size: 40, color: Palette.red, align: "right" }));
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "\\text{at most one fixed point}", at: 0.3 },
      { label: "2", tex: "d(x_n,x_m)\\le\\tfrac{c^n}{1-c}\\,d(x_1,x_0)", at: 0.3 },
      { label: "3", tex: "\\text{complete}\\Rightarrow x_n\\to x\\in X", at: 0.3 },
      { label: "4", tex: "\\text{continuous}\\Rightarrow\\varphi(x)=x", at: 0.3 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 }, "Proof steps (c05)");
    this.road = new RoadSign(fl, 700);
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;

    // ---- (0,1]: s0–s6
    const v1 = c.p(0, 0.8) * (1 - c.p(7, 0.6));
    this.line1.setOpacity(v1 * c.p(1, 0.6));
    this.hole.setOpacity(v1 * c.p(1, 0.6));
    this.holeLabel.set({ opacity: v1 * c.p(1, 0.6, 0.8) });
    const jumps = N_HALF * clamp01((t - c.in(3, 0.1)) / (c.e(4) - c.in(3, 0.1)));
    this.halfDots.forEach((d, n) => d.setOpacity(v1 * (n === 0 ? c.p(3, 0.4) : (jumps >= n ? 1 : 0))));
    this.halfJumps.forEach((a, n) => a.setProgress(clamp01(jumps - n), v1 * (n < 4 ? 1 : 0.6)));
    this.tickLabels.forEach((h, n) => h.set({ opacity: v1 * (jumps >= n || (n === 0 && t >= c.s(3)) ? 1 : 0) }));
    this.cross.set({ opacity: v1 * c.p(5, 0.5) });
    this.f1[0].set({ opacity: c.p(1, 0.6) * (1 - c.p(7, 0.6)) });
    this.f1[1].set({ opacity: c.p(4, 0.6) * (1 - c.p(7, 0.6)) });
    this.f1[2].set({ opacity: c.p(5, 0.6) * (1 - c.p(7, 0.6)) });
    this.verdict1.set({ opacity: c.p(6, 0.6) * (1 - c.p(7, 0.6)) });
    this.failMarks[0].set({ opacity: c.p(4, 0.5) * (1 - c.p(7, 0.5)) * (t >= c.s(6) ? 0.6 + 0.4 * Math.cos((t - c.s(6)) * 6) : 1) });

    // ---- x + 1: s7–s9
    const v2 = c.p(7, 0.6) * (1 - c.p(10, 0.6));
    this.line2.setOpacity(v2);
    const steps = 9 * clamp01((t - c.s(8)) / (c.e(9) - c.s(8)));
    const xPix = LINE2.x0 + LINE2.s * steps;
    this.shiftDot.setPosition(pxv(xPix, LINE2.y, 0.03));
    this.shiftDot.setOpacity(v2 * (1 - clamp01((xPix - 1250) / 100)));
    this.shiftBars.forEach((b, n) => b.setOpacity(v2 * (steps >= n + 1 ? 1 : 0)));
    this.shiftTicks.forEach((h) => h.set({ opacity: v2 * 0.9 }));
    this.f2.set({ opacity: v2 });
    this.verdict2.set({ opacity: c.p(9, 0.6) * (1 - c.p(10, 0.6)) });

    // ---- x + 1/x: s10–s18
    const v3 = c.p(10, 0.6) * (1 - c.p(19, 0.6));
    this.cobAxes.setOpacity(v3);
    this.xRange.setOpacity(v3 * c.p(11, 0.6));
    this.cobCurve.setOpacity(v3 * c.p(12, 0.6));
    this.cobDiag.setOpacity(v3 * c.p(12, 0.6));
    this.cobPath.setProgress(c.over(16, 0.05, 0.95));
    this.cobPath.setOpacity(v3 * c.p(16, 0.3));
    this.cobLabels[0].set({ opacity: v3 * c.p(12, 0.6) });
    this.cobLabels[1].set({ opacity: v3 * c.p(12, 0.6) });
    this.cobLabels[2].set({ opacity: v3 * c.p(11, 0.6) });
    const f3At = [11, 12, 13, 14, 15, 18];
    this.f3.forEach((h, i) => h.set({ opacity: c.p(f3At[i], 0.6) * (1 - c.p(19, 0.6)) }));
    this.ratioRows.forEach((h, n) => h.set({ opacity: c.p(17, 0.4, 0.6 * n) * (1 - c.p(19, 0.6)) }));
    this.failMarks[1].set({ opacity: c.p(17, 0.5) * (1 - c.p(19, 0.5)) });

    // ---- balls: s19–s22
    const v4 = c.p(19, 0.6);
    this.closedFill.setOpacity(0.2 * v4 * c.p(20, 0.6));
    this.closedEdge.setOpacity(v4 * c.p(20, 0.6));
    this.ballLabels[0].set({ opacity: v4 * c.p(20, 0.6) });
    this.openFill.setOpacity(0.15 * v4 * c.p(21, 0.6));
    this.openEdge.setOpacity(v4 * c.p(21, 0.6));
    const seq = 9 * c.over(21, 0.2, 0.8);
    this.seqDots.forEach((d, n) => d.setOpacity(v4 * (seq >= n ? 1 : 0)));
    this.limitHole.setOpacity(v4 * c.p(21, 0.5, (c.e(21) - c.s(21)) * 0.8));
    this.ballLabels[1].set({ opacity: v4 * c.p(21, 0.6) });
    this.ballLabels[2].set({ opacity: v4 * c.p(21, 0.5, (c.e(21) - c.s(21)) * 0.8) });
    this.closing.set({ opacity: c.p(22, 0.6) });

    this.ledger.update(t, 1, false);
    this.road.update(c.p(0, 0.8, -0.8), 0);
  }

  teardown(_layers: SceneLayers): void {}
}
