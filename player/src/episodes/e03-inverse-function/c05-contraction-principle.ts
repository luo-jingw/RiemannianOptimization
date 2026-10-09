import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { CurvedArrow } from "../../primitives/CurvedArrow";
import { Dot } from "../../primitives/Dot";
import { clamp01, lerp } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Region } from "../../primitives/Region";
import { seeded } from "../../primitives/Seeded";
import { pxv, usePixelView } from "./lib/PixelSpace";
import { PlotAxes } from "./lib/PlotAxes";
import { PlotFrame } from "./lib/PlotFrame";
import { RoadSign } from "./lib/RoadSign";
import { Tex } from "./lib/Tex";

/**
 * E03 c05 — the contraction mapping principle (Rudin 9.23) with its complete proof.
 * Cloud: φ(p) = ½·Rot(30°)·p + b. Cobweb: φ(x) = cos(x)/2 from x₀ = 2 (c = ½).
 * Sentence indices refer to story.en.json, scene c05-contraction-principle.
 */

const CLOUD = { x: 650, y: 470, s: 105 };
const CLOUD_N = 12;
const B: [number, number] = [0.9, 0.35];
const COB = new PlotFrame(250, 480, 300);
const BARS = { x0: 1000, base: 640, w: 30, gap: 14, s: 135 };
const N_ITER = 9;

function phi1(x: number): number {
  return Math.cos(x) / 2;
}

export class ContractionScene implements Scene {
  readonly id = "c05-contraction-principle";

  private cloudStart: [number, number][] = [];
  private cloudDots: Dot[] = [];
  private cloudArrows: Arrow[] = [];
  private pairLine!: Polyline;
  private pairLabel!: FormulaHandle;
  private fixedRing!: Dot;
  private fixedLabel!: FormulaHandle;
  private cloudFormula!: FormulaHandle;
  private fixedPt: [number, number] = [0, 0];

  private defLines: FormulaHandle[] = [];
  private barD!: Polyline;
  private barC!: Polyline;
  private barLabels: FormulaHandle[] = [];

  private uqX!: Dot;
  private uqY!: Dot;
  private uqLoops: CurvedArrow[] = [];
  private uqLabels: FormulaHandle[] = [];
  private uqBarD!: Polyline;
  private uqBarC!: Polyline;
  private uqBarLabels: FormulaHandle[] = [];
  private uqFormula!: FormulaHandle;

  private cobAxes!: PlotAxes;
  private cobCurve!: Polyline;
  private cobDiag!: Polyline;
  private cobPath!: Polyline;
  private cobDots: Dot[] = [];
  private cobLabels: FormulaHandle[] = [];
  private cobFormula!: FormulaHandle;
  private iter: number[] = [];
  private stepBars: Region[] = [];
  private boundBars: Polyline[] = [];
  private barTitle!: FormulaHandle;
  private boundTitle!: FormulaHandle;
  private stackBars: Region[] = [];
  private stackBound!: Polyline;
  private stackLabel!: FormulaHandle;
  private chain!: FormulaHandle;
  private limitDot!: Dot;
  private limitLabel!: FormulaHandle;
  private steps: FormulaHandle[] = [];
  private closing!: FormulaHandle;

  private ledger!: ProofLedger;
  private road!: RoadSign;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    usePixelView(stage);

    // ---- Cloud
    const rnd = seeded(11);
    for (let i = 0; i < CLOUD_N; i++) {
      const a = rnd() * 2 * Math.PI;
      const r = 1.2 + 1.3 * rnd();
      this.cloudStart.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    const ca = Math.cos(Math.PI / 6) / 2;
    const sa = Math.sin(Math.PI / 6) / 2;
    // Fixed point: (I − ½R) p = b.
    const m = [1 - ca, sa, -sa, 1 - ca];
    const det = m[0] * m[3] - m[1] * m[2];
    this.fixedPt = [(m[3] * B[0] - m[1] * B[1]) / det, (-m[2] * B[0] + m[0] * B[1]) / det];
    const colors = [Palette.blue, Palette.orange, Palette.green, Palette.purple, Palette.pink, Palette.teal];
    this.cloudStart.forEach((p, i) => {
      this.cloudDots.push(new Dot(stage, this.cloudPx(p), colors[i % colors.length], 0.08));
      const q = this.phi2(p);
      this.cloudArrows.push(new Arrow(stage, this.cloudPx(p), this.cloudPx(q), colors[i % colors.length], { width: 2, headLength: 0.12 }));
    });
    this.pairLine = new Polyline(stage, [this.cloudPx(this.cloudStart[0]), this.cloudPx(this.cloudStart[1])], { color: Palette.yellow, width: 2.5, dashed: true, dashSize: 0.07, gapSize: 0.05 });
    this.pairLabel = fl.add({ tex: "d", x: 0, y: 0, size: 28, color: Palette.yellow });
    this.fixedRing = new Dot(stage, this.cloudPx(this.fixedPt), Palette.green, 0.16, "2d", true);
    this.fixedLabel = fl.add({ tex: "x^*=\\varphi(x^*)", x: this.cloudPx(this.fixedPt).x * 100 + 120, y: -this.cloudPx(this.fixedPt).y * 100 - 40, size: 32, color: Palette.green });
    this.cloudFormula = fl.add({ tex: "\\varphi(p)=\\tfrac12\\,R_{30^\\circ}\\,p+b", x: 700, y: 100, size: 40 });

    // ---- Definition
    const defs = [
      "(X,d)\\ \\text{metric space},\\qquad \\varphi:X\\to X",
      `${Tex.color(Palette.yellow, "d(\\varphi(x),\\varphi(y))\\le c\\,d(x,y)")}\\quad\\text{for all } x,y,\\qquad c<1`,
      "\\text{Cauchy: } \\forall\\varepsilon>0\\ \\exists N:\\ n,m\\ge N\\Rightarrow d(x_n,x_m)<\\varepsilon",
      "\\text{complete: every Cauchy sequence converges in } X\\quad(\\mathbb{R}^n,\\ \\text{closed subsets of } \\mathbb{R}^n)",
      "\\text{Theorem: } X\\ \\text{complete},\\ \\varphi\\ \\text{a contraction}\\ \\Longrightarrow\\ \\varphi\\ \\text{has exactly one fixed point}",
    ];
    this.defLines = defs.map((tex, i) => fl.add({ tex, x: 700, y: [120, 190, 450, 530, 650][i], size: i === 3 ? 26 : i === 4 ? 30 : 32, boxed: i === 4 }));
    this.barD = new Polyline(stage, [pxv(420, 300), pxv(900, 300)], { color: Palette.blue, width: 8 });
    this.barC = new Polyline(stage, [pxv(420, 350), pxv(660, 350)], { color: Palette.green, width: 8 });
    this.barLabels = [
      fl.add({ tex: "d(x,y)", x: 400, y: 300, size: 28, color: Palette.blue, align: "right" }),
      fl.add({ tex: "d(\\varphi x,\\varphi y)\\le c\\,d(x,y)", x: 400, y: 350, size: 28, color: Palette.green, align: "right" }),
    ];

    // ---- Uniqueness
    this.uqX = new Dot(stage, pxv(420, 470), Palette.orange, 0.09);
    this.uqY = new Dot(stage, pxv(980, 470), Palette.purple, 0.09);
    this.uqLoops = [new CurvedArrow(stage, pxv(395, 445), pxv(445, 445), 0.6, Palette.orange, 2.5), new CurvedArrow(stage, pxv(955, 445), pxv(1005, 445), 0.6, Palette.purple, 2.5)];
    this.uqLabels = [
      fl.add({ tex: "\\varphi(x)=x", x: 420, y: 345, size: 30, color: Palette.orange }),
      fl.add({ tex: "\\varphi(y)=y", x: 980, y: 345, size: 30, color: Palette.purple }),
    ];
    this.uqBarD = new Polyline(stage, [pxv(420, 560), pxv(980, 560)], { color: Palette.blue, width: 8 });
    this.uqBarC = new Polyline(stage, [pxv(420, 610), pxv(700, 610)], { color: Palette.green, width: 8 });
    this.uqBarLabels = [
      fl.add({ tex: "d(x,y)=d(\\varphi x,\\varphi y)", x: 1000, y: 560, size: 26, color: Palette.blue, align: "left" }),
      fl.add({ tex: "c\\,d(x,y)", x: 720, y: 610, size: 26, color: Palette.green, align: "left" }),
    ];
    this.uqFormula = fl.add({ tex: this.uqTex(0), x: 700, y: 760, size: 34 });

    // ---- Cobweb
    this.cobAxes = new PlotAxes(stage, fl, COB, { uMin: -0.5, uMax: 2.25, vMin: -0.5, vMax: 1.0, uLabel: "x", vLabel: "y" });
    const curve: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) {
      const x = -0.5 + (2.7 * i) / 120;
      curve.push(COB.v3(x, phi1(x)));
    }
    this.cobCurve = new Polyline(stage, curve, { color: Palette.blue, width: 3.5 });
    this.cobDiag = new Polyline(stage, [COB.v3(-0.5, -0.5), COB.v3(1.0, 1.0)], { color: Palette.muted, width: 2, dashed: true, dashSize: 0.07, gapSize: 0.06 });
    this.iter = [2];
    for (let i = 0; i < N_ITER; i++) this.iter.push(phi1(this.iter[i]));
    const path: THREE.Vector3[] = [COB.v3(this.iter[0], 0)];
    for (let i = 0; i < N_ITER; i++) {
      path.push(COB.v3(this.iter[i], this.iter[i + 1]));
      path.push(COB.v3(this.iter[i + 1], this.iter[i + 1]));
    }
    this.cobPath = new Polyline(stage, path, { color: Palette.orange, width: 2.5 });
    this.cobDots = this.iter.map((x, i) => new Dot(stage, COB.v3(x, 0, 0.02), i === 0 ? Palette.yellow : Palette.orange, 0.06));
    this.cobLabels = [
      fl.add({ tex: "y=\\tfrac12\\cos x", x: COB.px(1.8, 0).x, y: COB.px(0, -0.34).y, size: 28, color: Palette.blue }),
      fl.add({ tex: "y=x", x: COB.px(0.95, 0.95).x + 40, y: COB.px(0.95, 0.95).y, size: 28, color: Palette.muted }),
      fl.add({ tex: "x_0", x: COB.px(2, 0).x, y: COB.px(2, 0).y + 30, size: 26, color: Palette.yellow }),
      fl.add({ tex: "x_1", x: COB.px(this.iter[1], 0).x, y: COB.px(0, 0).y - 28, size: 26, color: Palette.orange }),
    ];
    this.cobFormula = fl.add({ tex: "\\varphi(x)=\\tfrac12\\cos x,\\qquad |\\varphi'(x)|=\\tfrac12|\\sin x|\\le\\tfrac12\\ \\Rightarrow\\ c=\\tfrac12", x: 700, y: 100, size: 34 });
    const d0 = Math.abs(this.iter[1] - this.iter[0]);
    for (let n = 0; n < 7; n++) {
      const x = BARS.x0 + n * (BARS.w + BARS.gap);
      const h = BARS.s * Math.abs(this.iter[n + 1] - this.iter[n]);
      this.stepBars.push(new Region(stage, this.rect(x, BARS.base, Math.max(h, 1)), Palette.orange, 0.9));
      const hb = BARS.s * d0 * Math.pow(0.5, n);
      this.boundBars.push(new Polyline(stage, [pxv(x - BARS.w / 2, BARS.base), pxv(x - BARS.w / 2, BARS.base - hb), pxv(x + BARS.w / 2, BARS.base - hb), pxv(x + BARS.w / 2, BARS.base)], { color: Palette.yellow, width: 2, dashed: true, dashSize: 0.05, gapSize: 0.04 }));
    }
    this.barTitle = fl.add({ tex: "d(x_{n+1},x_n)", x: BARS.x0 + 120, y: BARS.base + 30, size: 24, color: Palette.orange });
    this.boundTitle = fl.add({ tex: "c^n\\,d(x_1,x_0)", x: BARS.x0 + 70, y: BARS.base - BARS.s * d0 * 0.5 - 30, size: 24, color: Palette.yellow, align: "left" });
    // Stack of the steps after n = 1 next to the bound c/(1−c) · d(x₁, x₀) = d(x₁, x₀).
    let acc = 0;
    const sx = 1330;
    for (let n = 1; n < 7; n++) {
      const h = BARS.s * Math.abs(this.iter[n + 1] - this.iter[n]);
      this.stackBars.push(new Region(stage, this.rect(sx, BARS.base - acc, Math.max(h, 1)), n % 2 === 0 ? Palette.orange : "#c46a1b", 0.9));
      acc += h;
    }
    const hb1 = BARS.s * d0;
    this.stackBound = new Polyline(stage, [pxv(sx - 20, BARS.base - hb1), pxv(sx + 20, BARS.base - hb1)], { color: Palette.yellow, width: 3 });
    this.stackLabel = fl.add({ tex: "\\tfrac{c}{1-c}\\,d(x_1,x_0)", x: sx - 30, y: BARS.base - hb1 - 26, size: 22, color: Palette.yellow, align: "right" });
    this.chain = fl.add({ tex: this.chainTex(0), x: 700, y: 790, size: 30 });
    this.limitDot = new Dot(stage, COB.v3(this.iter[N_ITER], 0, 0.03), Palette.green, 0.1, "2d", true);
    this.limitLabel = fl.add({ tex: "x=\\lim x_n,\\ \\ \\varphi(x)=x", x: COB.px(this.iter[N_ITER], 0).x + 28, y: COB.px(0, 0).y + 36, size: 28, color: Palette.green, align: "left" });
    const steps = [
      `\\text{geometric bound: uses } ${Tex.color(Palette.orange, "c<1")}`,
      "\\{x_n\\}\\ \\text{is Cauchy}",
      `\\text{limit } x\\in X\\text{: uses } ${Tex.color(Palette.orange, "\\text{completeness}")}`,
      "\\varphi(x)=\\lim\\varphi(x_n)=\\lim x_{n+1}=x",
    ];
    this.steps = steps.map((tex, i) => fl.add({ tex, x: 960, y: 230 + i * 60, size: 26, align: "left" }));
    this.closing = fl.add({ tex: "\\text{the proof is an algorithm: iterate}", x: 700, y: 790, size: 32, color: Palette.green });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "\\text{at most one fixed point}", at: cue.s(12) + 1.0 },
      { label: "2", tex: "d(x_n,x_m)\\le\\tfrac{c^n}{1-c}\\,d(x_1,x_0)", at: cue.s(22) + 0.5 },
      { label: "3", tex: "\\text{complete}\\Rightarrow x_n\\to x\\in X", at: cue.s(24) + 1.5 },
      { label: "4", tex: "\\text{continuous}\\Rightarrow\\varphi(x)=x", at: cue.s(25) + 2.5 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
    this.road = new RoadSign(fl, 700);
  }

  /** Rectangle of width BARS.w centered at x, from baseline y upward by h pixels. */
  private rect(x: number, y: number, h: number): THREE.Vector3[] {
    const w = BARS.w / 2;
    return [pxv(x - w, y), pxv(x + w, y), pxv(x + w, y - h), pxv(x - w, y - h)];
  }

  private cloudPx(p: [number, number]): THREE.Vector3 {
    return pxv(CLOUD.x + CLOUD.s * p[0], CLOUD.y - CLOUD.s * p[1]);
  }

  private phi2(p: [number, number]): [number, number] {
    const c = Math.cos(Math.PI / 6) / 2;
    const s = Math.sin(Math.PI / 6) / 2;
    return [c * p[0] - s * p[1] + B[0], s * p[0] + c * p[1] + B[1]];
  }

  /** Position after k (fractional) applications of φ, interpolating linearly within a step. */
  private cloudAt(p: [number, number], k: number): [number, number] {
    let a = p;
    const whole = Math.floor(k);
    for (let i = 0; i < whole; i++) a = this.phi2(a);
    const b = this.phi2(a);
    const f = k - whole;
    return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
  }

  private uqTex(n: number): string {
    return Tex.reveal([
      "d(x,y)=d(\\varphi x,\\varphi y)\\le c\\,d(x,y)",
      "\\ \\Rightarrow\\ (1-c)\\,d(x,y)\\le 0\\ \\Rightarrow\\ d(x,y)=0",
    ], n);
  }

  private chainTex(n: number): string {
    if (n <= 2) {
      return Tex.reveal([
        "d(x_{n+1},x_n)\\le c\\,d(x_n,x_{n-1})",
        "\\le\\cdots\\le c^n\\,d(x_1,x_0)",
      ], n);
    }
    return Tex.reveal([
      "d(x_n,x_m)\\le\\sum_{i=n+1}^{m}d(x_i,x_{i-1})",
      "\\le(c^n+\\cdots+c^{m-1})\\,d(x_1,x_0)",
      `\\le${Tex.color(Palette.yellow, "\\tfrac{c^n}{1-c}\\,d(x_1,x_0)")}`,
    ], n - 2);
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;

    // ---- Cloud: s1–s4
    const cloudVis = c.p(1, 0.8, -0.3) * (1 - c.p(5, 0.6));
    const k = 4 * clamp01((t - c.s(2)) / (c.e(3) - c.s(2)));
    const pos = this.cloudStart.map((p) => this.cloudAt(p, k));
    pos.forEach((q, i) => {
      this.cloudDots[i].setPosition(this.cloudPx(q).setZ(0.02));
      this.cloudDots[i].setOpacity(cloudVis);
      this.cloudArrows[i].setOpacity(0.7 * cloudVis * c.p(1, 0.5, 1.0) * (1 - c.p(2, 0.4)));
    });
    this.cloudFormula.set({ opacity: c.p(1, 0.6) * (1 - c.p(5, 0.6)) });
    const pairVis = cloudVis * c.p(2, 0.5) * (1 - c.p(4, 0.5));
    this.pairLine.setPoints([this.cloudPx(pos[0]), this.cloudPx(pos[1])]);
    this.pairLine.setOpacity(pairVis);
    const d0 = Math.hypot(this.cloudStart[0][0] - this.cloudStart[1][0], this.cloudStart[0][1] - this.cloudStart[1][1]);
    const dk = d0 * Math.pow(0.5, Math.floor(k));
    const mid = this.cloudPx([(pos[0][0] + pos[1][0]) / 2, (pos[0][1] + pos[1][1]) / 2]);
    this.pairLabel.setContent(`d=${dk.toFixed(Math.floor(k) >= 3 ? 3 : 2)}`);
    this.pairLabel.set({ x: mid.x * 100 + 20, y: -mid.y * 100 - 26, opacity: pairVis });
    this.fixedRing.setOpacity(cloudVis * c.p(4, 0.5));
    this.fixedLabel.set({ opacity: cloudVis * c.p(4, 0.5) });

    // ---- Definition: s5–s9
    const defOut = 1 - c.p(10, 0.6);
    const defAt = [5, 6, 7, 8, 9];
    this.defLines.forEach((h, i) => h.set({ opacity: c.p(defAt[i], 0.6) * defOut }));
    const barVis = c.p(6, 0.6, 1.0) * (1 - c.p(7, 0.6));
    this.barD.setOpacity(barVis);
    this.barC.setOpacity(barVis * c.p(6, 0.6, 2.0));
    this.barC.setProgress(c.p(6, 1.0, 2.0));
    this.barLabels[0].set({ opacity: barVis });
    this.barLabels[1].set({ opacity: barVis * c.p(6, 0.6, 2.0) });

    // ---- Uniqueness: s10–s12
    const uqVis = c.p(10, 0.6) * (1 - c.p(13, 0.6));
    const merge = c.over(12, 0.3, 0.9);
    this.uqX.setPosition(pxv(lerp(420, 700, merge), 470));
    this.uqY.setPosition(pxv(lerp(980, 700, merge), 470));
    this.uqX.setOpacity(uqVis);
    this.uqY.setOpacity(uqVis);
    this.uqLoops.forEach((a) => a.setProgress(c.p(10, 0.8, 0.5) * (1 - merge), uqVis));
    this.uqLabels.forEach((h) => h.set({ opacity: uqVis * (1 - merge) }));
    const ubar = uqVis * c.p(11, 0.5) * (1 - merge);
    this.uqBarD.setOpacity(ubar);
    this.uqBarC.setOpacity(ubar * c.p(11, 0.5, 1.5));
    this.uqBarLabels[0].set({ opacity: ubar });
    this.uqBarLabels[1].set({ opacity: ubar * c.p(11, 0.5, 1.5) });
    this.uqFormula.setContent(this.uqTex(t >= c.s(12) ? 2 : t >= c.s(11) ? 1 : 0));
    this.uqFormula.set({ opacity: c.p(11, 0.5) * (1 - c.p(13, 0.6)) });

    // ---- Cobweb: s13–s26
    const cobVis = c.p(13, 0.8) * (1 - c.p(27, 0.6));
    this.cobAxes.setOpacity(cobVis);
    this.cobCurve.setOpacity(cobVis * c.p(14, 0.6));
    this.cobDiag.setOpacity(cobVis * c.p(14, 0.6));
    const pathProg = 0.5 * c.over(16, 0.05, 0.95) + 0.5 * c.over(17, 0.0, 0.9);
    this.cobPath.setProgress(pathProg);
    this.cobPath.setOpacity(cobVis * c.p(16, 0.3));
    const segDone = Math.floor(pathProg * 2 * N_ITER + 1e-6);
    this.cobDots.forEach((d, i) => d.setOpacity(cobVis * (i === 0 ? c.p(14, 0.5, 1.0) : (segDone >= 2 * i ? 1 : 0))));
    this.cobLabels.forEach((h, i) => h.set({ opacity: cobVis * (i < 2 ? c.p(14, 0.6) : i === 2 ? c.p(14, 0.5, 1.0) : (segDone >= 2 ? 1 : 0)) * (1 - c.p(23, 0.5) * (i >= 2 ? 1 : 0)) }));
    this.cobFormula.set({ opacity: c.p(14, 0.6) * (1 - c.p(19, 0.5)) });
    const barsVis = cobVis * (1 - c.p(23, 0.6));
    this.stepBars.forEach((b, n) => b.setOpacity(0.9 * barsVis * (t >= c.in(17, 0.1 + 0.1 * n) ? 1 : 0) * (n >= 1 ? 1 - c.p(20, 0.5) : 1)));
    this.boundBars.forEach((b) => b.setOpacity(barsVis * c.p(18, 0.6)));
    this.barTitle.set({ opacity: barsVis * c.p(17, 0.5) });
    this.boundTitle.set({ opacity: barsVis * c.p(18, 0.6) });
    const stackVis = barsVis * c.p(20, 0.6);
    this.stackBars.forEach((b, n) => b.setOpacity(0.9 * stackVis * c.p(20, 0.4, 0.3 * n)));
    this.stackBound.setOpacity(barsVis * c.p(21, 0.6));
    this.stackLabel.set({ opacity: barsVis * c.p(21, 0.6) });
    const chainN = t >= c.s(21) ? 5 : t >= c.in(20, 0.4) ? 4 : t >= c.s(19) ? 3 : t >= c.s(18) ? 2 : t >= c.s(17) ? 1 : 0;
    this.chain.setContent(this.chainTex(chainN));
    this.chain.set({ opacity: c.p(17, 0.5) * (1 - c.p(23, 0.5)) });
    const limVis = cobVis * c.p(24, 0.6);
    this.limitDot.setOpacity(limVis);
    this.limitLabel.setContent(t >= c.s(25) ? "x=\\lim x_n,\\ \\ \\varphi(x)=x" : "x=\\lim x_n\\in X");
    this.limitLabel.set({ opacity: limVis });
    const stepAt = [22, 23, 24, 25];
    this.steps.forEach((h, i) => {
      const on = c.p(stepAt[i], 0.5);
      const active = t >= c.s(stepAt[i]) && (i === 3 || t < c.s(stepAt[i + 1]));
      h.set({ opacity: on * (1 - c.p(27, 0.6)), color: active ? Palette.yellow : Palette.text });
    });
    this.closing.set({ opacity: c.p(27, 0.6) });

    this.ledger.update(t, 1, true);
    this.road.update(c.p(0, 0.8, -0.8), 0);
  }

  teardown(_layers: SceneLayers): void {}
}
