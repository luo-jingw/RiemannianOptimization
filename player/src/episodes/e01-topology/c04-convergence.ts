import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { lerp } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Region } from "../../primitives/Region";
import { PixelSpace } from "./lib/PixelSpace";
import { Shapes } from "./lib/shapes";
import { tc } from "./lib/tex";

/**
 * E01 c04 — topological convergence; agreement with ε–N; uniqueness of limits in metric spaces;
 * every point is a limit in the trivial topology; only eventually constant sequences converge in the discrete topology.
 * Coordinates are output pixels (PixelSpace). Work area x 60–1360; ledger at x ≥ 1400.
 * Sentence indices refer to content/episodes/e01-topology/story.en.json, scene c04-convergence.
 */

const K_MAX = 30;
const PLOT = { x0: 170, x1: 1290, y0: 470, scale: 290 };   // index plot: k → x, value → y (zero line y0)
const kx = (k: number): number => lerp(PLOT.x0, PLOT.x1, (k - 1) / (K_MAX - 1));
const seq = (k: number): number => (k % 2 === 0 ? 1 : -1) / k;
const vy = (v: number): number => PLOT.y0 - v * PLOT.scale;
const firstK = (w: number): number => Math.floor(1 / w) + 1;    // smallest K with 1/k < w for all k ≥ K

/** 2D sequence spiralling into the pixel point (cx, cy). */
const spiral = (cx: number, cy: number, r0: number, k: number): THREE.Vector3 =>
  PixelSpace.p(cx + (r0 / k) * Math.cos(2.3 * k), cy + (r0 / k) * Math.sin(2.3 * k));

const LINE = { x0: 260, x1: 1260, y: 470 };                     // discrete section: values in [−0.1, 1.1]
const lx = (v: number): number => lerp(LINE.x0, LINE.x1, (v + 0.1) / 1.2);

export class ConvergenceScene implements Scene {
  readonly id = "c04-convergence";
  private stage!: StageLayer;

  private defn!: FormulaHandle;
  private words!: FormulaHandle;
  private seqFormula!: FormulaHandle;
  private zeroLine!: Polyline;
  private kAxis!: Polyline;
  private kLabel!: FormulaHandle;
  private band!: Region;
  private bandEdges: Polyline[] = [];
  private bandLabel!: FormulaHandle;
  private dots: Dot[] = [];
  private kMarker!: Polyline;
  private kMarkerLabel!: FormulaHandle;
  private kTable!: FormulaHandle;

  // proof A
  private panelTitles: FormulaHandle[] = [];
  private ballA!: Polyline;
  private ballAFill!: Region;
  private blobB!: Polyline;
  private blobBFill!: Region;
  private ballB!: Polyline;
  private centers: Dot[] = [];
  private seqA: Dot[] = [];
  private seqB: Dot[] = [];
  private proofL!: FormulaHandle;
  private proofR!: FormulaHandle;

  // uniqueness
  private ballX!: Polyline;
  private ballY!: Polyline;
  private fillX!: Region;
  private fillY!: Region;
  private ptX!: Dot;
  private ptY!: Dot;
  private labX!: FormulaHandle;
  private labY!: FormulaHandle;
  private rSeg!: Polyline;
  private rLabel!: FormulaHandle;
  private seqU: Dot[] = [];
  private zDot!: Dot;
  private zLabel!: FormulaHandle;
  private suppose!: FormulaHandle;
  private cross: Polyline[] = [];
  private uniqLine!: FormulaHandle;
  private uniqNote!: FormulaHandle;

  // trivial topology
  private box!: Polyline;
  private boxFill!: Region;
  private boxLabel!: FormulaHandle;
  private candDots: Dot[] = [];
  private candLabels: FormulaHandle[] = [];
  private checks: FormulaHandle[] = [];
  private seqT: Dot[] = [];
  private trivialLine!: FormulaHandle;
  private everyNote!: FormulaHandle;
  private candRing!: Polyline;

  // discrete topology
  private dAxis!: Polyline;
  private dTicks: FormulaHandle[] = [];
  private dDots: Dot[] = [];
  private dRings: Polyline[] = [];
  private zeroRing!: Polyline;
  private zeroDot!: Dot;
  private discreteLine!: FormulaHandle;
  private discreteCross: Polyline[] = [];
  private discreteNote!: FormulaHandle;

  private summary!: FormulaHandle;
  private hausdorff!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    const P = PixelSpace.p;

    this.defn = fl.add({ tex: "x_k\\to x\\iff \\forall\\,U\\ni x\\ \\text{open}\\ \\ \\exists K:\\ \\ k\\ge K\\Rightarrow x_k\\in U", x: 710, y: 96, size: 42 });
    this.words = fl.add({ text: "eventually inside every neighborhood of x", x: 710, y: 160, size: 32, color: Palette.muted });
    this.seqFormula = fl.add({ tex: "x_k=\\dfrac{(-1)^k}{k}\\ \\to\\ 0", x: 1150, y: 230, size: 40, color: Palette.orange });
    this.zeroLine = new Polyline(stage, [P(PLOT.x0 - 40, PLOT.y0), P(PLOT.x1 + 40, PLOT.y0)], { color: Palette.axis, width: 2 });
    this.kAxis = new Polyline(stage, [P(PLOT.x0 - 40, 790), P(PLOT.x1 + 40, 790)], { color: Palette.axis, width: 2 });
    this.kLabel = fl.add({ tex: "k", x: PLOT.x1 + 60, y: 790, size: 32, color: Palette.muted });
    this.band = new Region(stage, Shapes.square(0, 0, 1), Palette.blue, 0.22);
    this.bandEdges = [new Polyline(stage, [P(0, 0), P(1, 0)], { color: Palette.blue, width: 2, dashed: true, dashSize: 0.1, gapSize: 0.07 }),
      new Polyline(stage, [P(0, 0), P(1, 0)], { color: Palette.blue, width: 2, dashed: true, dashSize: 0.1, gapSize: 0.07 })];
    this.bandLabel = fl.add({ tex: "U", x: 120, y: 0, size: 36, color: Palette.blue });
    for (let k = 1; k <= K_MAX; k++) this.dots.push(new Dot(stage, P(kx(k), vy(seq(k))), Palette.orange, 0.065));
    this.kMarker = new Polyline(stage, [P(0, 300), P(0, 800)], { color: Palette.green, width: 2.5, dashed: true, dashSize: 0.1, gapSize: 0.07 });
    this.kMarkerLabel = fl.add({ tex: "K", x: 0, y: 820, size: 34, color: Palette.green });
    this.kTable = fl.add({ tex: "", x: 710, y: 830, size: 36 });

    // ---- proof A: two panels
    this.panelTitles = [
      fl.add({ tex: "(\\Rightarrow)\\ \\ U=B_\\varepsilon(x)", x: 390, y: 200, size: 36, color: Palette.text }),
      fl.add({ tex: "(\\Leftarrow)\\ \\ B_\\varepsilon(x)\\subseteq U", x: 1030, y: 200, size: 36, color: Palette.text }),
    ];
    this.ballAFill = new Region(stage, PixelSpace.circle(390, 400, 140), Palette.blue, 0.2);
    this.ballA = new Polyline(stage, PixelSpace.circle(390, 400, 140), { color: Palette.blue, width: 2.5, dashed: true, dashSize: 0.1, gapSize: 0.07 });
    const blob = Shapes.blob(10.3, -4.0, 1.75, 0.1, 0.06, 0.9, 0.85);
    this.blobBFill = new Region(stage, blob, Palette.purple, 0.18);
    this.blobB = new Polyline(stage, blob, { color: Palette.purple, width: 2.5, dashed: true, dashSize: 0.1, gapSize: 0.07 });
    this.ballB = new Polyline(stage, PixelSpace.circle(1030, 400, 90), { color: Palette.blue, width: 2.5, dashed: true, dashSize: 0.08, gapSize: 0.06 });
    this.centers = [new Dot(stage, P(390, 400), Palette.yellow, 0.06), new Dot(stage, P(1030, 400), Palette.yellow, 0.06)];
    for (let k = 1; k <= 16; k++) {
      this.seqA.push(new Dot(stage, spiral(390, 400, 260, k), Palette.orange, 0.045));
      this.seqB.push(new Dot(stage, spiral(1030, 400, 230, k), Palette.orange, 0.045));
    }
    this.proofL = fl.add({ tex: this.proofLTex(0), x: 390, y: 700, size: 32, display: true });
    this.proofR = fl.add({ tex: this.proofRTex(0), x: 1030, y: 700, size: 32, display: true });

    // ---- uniqueness
    const XC = { x: 470, y: 420 };
    const YC = { x: 950, y: 420 };
    const R = (YC.x - XC.x) / 2;
    this.fillX = new Region(stage, PixelSpace.circle(XC.x, XC.y, R), Palette.blue, 0.2);
    this.fillY = new Region(stage, PixelSpace.circle(YC.x, YC.y, R), Palette.purple, 0.2);
    this.ballX = new Polyline(stage, PixelSpace.circle(XC.x, XC.y, R), { color: Palette.blue, width: 2.5, dashed: true, dashSize: 0.1, gapSize: 0.07 });
    this.ballY = new Polyline(stage, PixelSpace.circle(YC.x, YC.y, R), { color: Palette.purple, width: 2.5, dashed: true, dashSize: 0.1, gapSize: 0.07 });
    this.ptX = new Dot(stage, P(XC.x, XC.y), Palette.yellow, 0.06);
    this.ptY = new Dot(stage, P(YC.x, YC.y), Palette.yellow, 0.06);
    this.labX = fl.add({ tex: "x", x: XC.x - 18, y: XC.y + 26, size: 34, color: Palette.yellow });
    this.labY = fl.add({ tex: "y", x: YC.x + 18, y: YC.y + 26, size: 34, color: Palette.yellow });
    this.rSeg = new Polyline(stage, [P(XC.x, XC.y), P(XC.x, XC.y - R)], { color: Palette.muted, width: 2 });
    this.rLabel = fl.add({ tex: "r=\\tfrac{d(x,y)}{2}", x: XC.x + 70, y: XC.y - R / 2, size: 30, color: Palette.muted });
    for (let k = 1; k <= 14; k++) this.seqU.push(new Dot(stage, spiral(XC.x, XC.y, 200, k), Palette.orange, 0.045));
    this.zDot = new Dot(stage, P((XC.x + YC.x) / 2, XC.y), Palette.red, 0.06);
    this.zLabel = fl.add({ tex: "z\\,?", x: (XC.x + YC.x) / 2, y: XC.y - 34, size: 32, color: Palette.red });
    this.suppose = fl.add({ text: "suppose x_k → y too", x: YC.x, y: 170, size: 32, color: Palette.red });
    const mid = { x: (XC.x + YC.x) / 2, y: XC.y + 150 };
    this.cross = [new Polyline(stage, [P(mid.x - 26, mid.y - 26), P(mid.x + 26, mid.y + 26)], { color: Palette.red, width: 6 }),
      new Polyline(stage, [P(mid.x - 26, mid.y + 26), P(mid.x + 26, mid.y - 26)], { color: Palette.red, width: 6 })];
    this.uniqLine = fl.add({ tex: "", x: 710, y: 820, size: 36 });
    this.uniqNote = fl.add({ text: "disjoint neighborhoods  ⇒  unique limit", x: 710, y: 140, size: 34, color: Palette.green });

    // ---- trivial topology
    const boxPts = [P(220, 230), P(1200, 230), P(1200, 720), P(220, 720), P(220, 230)];
    this.boxFill = new Region(stage, boxPts, Palette.blue, 0.12);
    this.box = new Polyline(stage, boxPts, { color: Palette.blue, width: 3 });
    this.boxLabel = fl.add({ tex: "X\\ \\ (\\text{the only nonempty open set})", x: 240, y: 200, size: 32, color: Palette.blue, align: "left" });
    const cands = [{ x: 420, y: 560, n: "x" }, { x: 760, y: 340, n: "y" }, { x: 1040, y: 590, n: "z" }];
    for (const cd of cands) {
      this.candDots.push(new Dot(stage, P(cd.x, cd.y), Palette.yellow, 0.07));
      this.candLabels.push(fl.add({ tex: cd.n, x: cd.x - 26, y: cd.y + 28, size: 34, color: Palette.yellow }));
      this.checks.push(fl.add({ tex: "\\checkmark", x: cd.x + 34, y: cd.y - 30, size: 40, color: Palette.green }));
    }
    this.candRing = new Polyline(stage, PixelSpace.circle(0, 0, 30), { color: Palette.yellow, width: 3 });
    for (let k = 1; k <= 14; k++) this.seqT.push(new Dot(stage, spiral(700, 500, 260, k), Palette.orange, 0.045));
    this.trivialLine = fl.add({ tex: "\\text{open sets}\\ni x:\\ \\text{only } X\\ \\ \\Rightarrow\\ \\ K=1\\ \\text{works}", x: 710, y: 820, size: 36 });
    this.everyNote = fl.add({ text: "converges to every point", x: 710, y: 820, size: 36, color: Palette.green });

    // ---- discrete topology
    this.dAxis = new Polyline(stage, [P(LINE.x0 - 20, LINE.y), P(LINE.x1 + 20, LINE.y)], { color: Palette.axis, width: 2 });
    this.dTicks = [fl.add({ tex: "0", x: lx(0), y: LINE.y + 40, size: 30, color: Palette.muted }), fl.add({ tex: "1", x: lx(1), y: LINE.y + 40, size: 30, color: Palette.muted })];
    for (let k = 1; k <= K_MAX; k++) {
      this.dDots.push(new Dot(stage, P(lx(1 / k), LINE.y), Palette.orange, 0.05));
      this.dRings.push(new Polyline(stage, PixelSpace.circle(lx(1 / k), LINE.y, 11, 32), { color: Palette.purple, width: 1.5 }));
    }
    this.zeroDot = new Dot(stage, P(lx(0), LINE.y), Palette.yellow, 0.06);
    this.zeroRing = new Polyline(stage, PixelSpace.circle(lx(0), LINE.y, 22, 48), { color: Palette.yellow, width: 3 });
    this.discreteLine = fl.add({ tex: "", x: 710, y: 820, size: 36 });
    const dc = { x: lx(0), y: LINE.y - 80 };
    this.discreteCross = [new Polyline(stage, [P(dc.x - 22, dc.y - 22), P(dc.x + 22, dc.y + 22)], { color: Palette.red, width: 6 }),
      new Polyline(stage, [P(dc.x - 22, dc.y + 22), P(dc.x + 22, dc.y - 22)], { color: Palette.red, width: 6 })];
    this.discreteNote = fl.add({ text: "only eventually-constant sequences converge", x: 710, y: 200, size: 34, color: Palette.red });

    this.summary = fl.add({
      tex: `\\begin{aligned}&\\text{trivial: } x_k\\to\\ ${tc(Palette.green, "\\text{every point}")}\\\\&\\text{discrete: } \\tfrac1k\\ \\ ${tc(Palette.red, "\\text{converges to no point}")}\\end{aligned}`,
      x: 710, y: 330, size: 42, display: true,
    });
    this.hausdorff = fl.add({ tex: `${tc(Palette.yellow, "\\text{Hausdorff}")}:\\ x\\neq y\\ \\Rightarrow\\ \\exists\\ U\\ni x,\\ V\\ni y\\ \\text{open},\\ U\\cap V=\\varnothing\\quad\\to\\ \\text{E02}`, x: 710, y: 560, size: 38, boxed: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "x_k\\to x\\iff \\varepsilon\\text{–}N\\ \\ (\\text{metric})", at: cue.in(15, 0.5) },
      { label: "2", tex: "\\text{limits unique (metric)}", at: cue.in(22, 0.7) },
      { label: "3", tex: "\\text{trivial: } x_k\\to\\text{every } x", at: cue.in(27, 0.7) },
      { label: "4", tex: "\\text{discrete: only eventually } x_k=x", at: cue.in(30, 0.7) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  private proofLTex(n: number): string {
    const rows = [
      "\\varepsilon>0:\\ B_\\varepsilon(x)\\ \\text{open},\\ \\ni x",
      "\\exists K:\\ k\\ge K\\Rightarrow x_k\\in B_\\varepsilon(x)",
      "\\iff d(x_k,x)<\\varepsilon",
    ];
    return `\\begin{aligned}${rows.map((r, i) => (i < n ? r : `\\phantom{${r}}`)).join("\\\\")}\\end{aligned}`;
  }

  private proofRTex(n: number): string {
    const rows = [
      "U\\ni x\\ \\text{open}\\Rightarrow \\exists\\varepsilon:\\ B_\\varepsilon(x)\\subseteq U",
      "\\varepsilon\\text{–}N:\\ k\\ge K\\Rightarrow d(x_k,x)<\\varepsilon",
      "\\Rightarrow x_k\\in B_\\varepsilon(x)\\subseteq U",
    ];
    return `\\begin{aligned}${rows.map((r, i) => (i < n ? r : `\\phantom{${r}}`)).join("\\\\")}\\end{aligned}`;
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    PixelSpace.apply(this.stage);
    const P = PixelSpace.p;

    // ---- definition and the index plot (s0–s7)
    this.defn.set({ opacity: c.p(1, 0.6) * (1 - c.p(8, 0.6)) });
    this.words.set({ opacity: c.p(2, 0.6) * (1 - c.p(7, 0.4)) });
    const plotOn = c.p(3, 0.6) * (1 - c.p(8, 0.6));
    this.seqFormula.set({ opacity: plotOn });
    this.zeroLine.setOpacity(plotOn);
    this.kAxis.setOpacity(plotOn * 0.6);
    this.kLabel.set({ opacity: plotOn });
    const appear = c.over(3, 0.1, 0.95);
    const shownK = Math.floor(1 + (K_MAX - 1) * appear + 1e-9);
    // half-width of U: a shrink-and-return preview in s6, then 0.5 → 0.2 → 0.05 in s7 (each held while its K is spoken)
    const wNow = t < c.s(7) ? 0.5 - 0.4 * Math.sin(Math.PI * c.over(6, 0.1, 0.9))
      : t < c.in(7, 0.33) ? 0.5 : t < c.in(7, 0.66) ? lerp(0.5, 0.2, c.over(7, 0.33, 0.4)) : lerp(0.2, 0.05, c.over(7, 0.66, 0.73));
    const bandOn = plotOn * c.p(4, 0.6);
    const K = firstK(wNow);
    const bandPts = [P(PLOT.x0 - 40, vy(wNow)), P(PLOT.x1 + 40, vy(wNow)), P(PLOT.x1 + 40, vy(-wNow)), P(PLOT.x0 - 40, vy(-wNow)), P(PLOT.x0 - 40, vy(wNow))];
    this.band.setPoints(bandPts);
    this.band.setOpacity(0.22 * bandOn);
    this.bandEdges[0].setPoints([bandPts[0], bandPts[1]]);
    this.bandEdges[1].setPoints([bandPts[3], bandPts[2]]);
    this.bandEdges.forEach((e) => e.setOpacity(bandOn));
    this.bandLabel.set({ x: PLOT.x0 - 80, y: vy(0) - 0, opacity: bandOn });
    this.dots.forEach((d, i) => {
      const k = i + 1;
      const inside = Math.abs(seq(k)) < wNow;
      d.setOpacity(k <= shownK ? plotOn * (bandOn > 0.5 && !inside ? 0.35 : 1) : 0);
      d.setColor(bandOn > 0.5 && k >= K ? Palette.yellow : Palette.orange);
    });
    const kOn = plotOn * c.p(5, 0.6);
    this.kMarker.setPoints([P(kx(K) - 18, 300), P(kx(K) - 18, 800)]);
    this.kMarker.setOpacity(kOn);
    this.kMarkerLabel.set({ x: kx(K) - 18, y: 830, opacity: kOn });
    this.kMarkerLabel.setContent(`K=${K}`);
    const tableN = t >= c.in(7, 0.66) ? 3 : t >= c.in(7, 0.33) ? 2 : t >= c.s(7) ? 1 : 0;
    const rows = ["w=\\tfrac12:\\ K=3", "\\qquad w=\\tfrac15:\\ K=6", "\\qquad w=\\tfrac1{20}:\\ K=21"];
    this.kTable.setContent(rows.map((r, i) => (i < tableN ? r : `\\phantom{${r}}`)).join(""));
    this.kTable.set({ x: 710, y: 160, opacity: plotOn * (tableN > 0 ? 1 : 0) });

    // ---- proof A (s8–s15)
    const pa = c.p(8, 0.6) * (1 - c.p(16, 0.6));
    const left = pa * c.p(9, 0.5);
    const right = pa * c.p(12, 0.5);
    this.panelTitles[0].set({ opacity: left, color: t >= c.s(9) && t < c.s(12) ? Palette.yellow : Palette.text });
    this.panelTitles[1].set({ opacity: right, color: t >= c.s(12) && t < c.s(15) ? Palette.yellow : Palette.text });
    const hlA = t >= c.s(10) && t < c.s(12) ? 0.35 : 0.2;
    this.ballAFill.setOpacity(hlA * left);
    this.ballA.setOpacity(left);
    this.blobBFill.setOpacity(0.18 * right);
    this.blobB.setOpacity(right);
    this.ballB.setOpacity(right * c.p(13, 0.5));
    this.centers[0].setOpacity(left);
    this.centers[1].setOpacity(right);
    const seqAIn = c.over(11, 0.1, 0.8);
    this.seqA.forEach((d, i) => {
      d.setOpacity(left * (i + 1 <= 1 + 15 * seqAIn ? 1 : 0));
      d.setColor(i + 1 >= 3 ? Palette.yellow : Palette.orange);
    });
    const seqBIn = c.over(14, 0.1, 0.8);
    this.seqB.forEach((d, i) => {
      d.setOpacity(right * (i + 1 <= 1 + 15 * seqBIn ? 1 : 0));
      d.setColor(i + 1 >= 4 ? Palette.yellow : Palette.orange);
    });
    const ln = t >= c.in(11, 0.5) ? 3 : t >= c.s(11) ? 2 : t >= c.s(10) ? 1 : 0;
    this.proofL.setContent(this.proofLTex(ln));
    this.proofL.set({ opacity: left });
    const rn = t >= c.in(14, 0.6) ? 3 : t >= c.s(14) ? 2 : t >= c.s(13) ? 1 : 0;
    this.proofR.setContent(this.proofRTex(rn));
    this.proofR.set({ opacity: right });

    // ---- uniqueness (s16–s22)
    const un = c.p(16, 0.6) * (1 - c.p(23, 0.6));
    const ballsOn = un * c.p(17, 0.6, 1.0);
    this.ptX.setOpacity(un * c.p(16, 0.5, 0.6));
    this.ptY.setOpacity(un * c.p(17, 0.5));
    this.labX.set({ opacity: un * c.p(16, 0.5, 0.6) });
    this.labY.set({ opacity: un * c.p(17, 0.5) });
    this.fillX.setOpacity(0.2 * ballsOn);
    this.fillY.setOpacity(0.2 * ballsOn);
    this.ballX.setOpacity(ballsOn);
    this.ballY.setOpacity(ballsOn);
    this.rSeg.setOpacity(ballsOn * (1 - c.p(19, 0.5)));
    this.rLabel.set({ opacity: ballsOn * (1 - c.p(19, 0.5)) });
    const seqIn = c.over(16, 0.2, 0.9);
    this.seqU.forEach((d, i) => d.setOpacity(un * (i + 1 <= 1 + 13 * seqIn ? 1 : 0)));
    const zOn = un * c.during(19, 21, 0.4);
    this.zDot.setOpacity(zOn);
    this.zLabel.set({ opacity: zOn });
    this.suppose.set({ opacity: un * c.p(17, 0.6) * (1 - c.p(22, 0.6)) });
    const crossOn = un * c.p(22, 0.5, 0.8);
    this.cross.forEach((p) => p.setOpacity(crossOn));
    const uState = t >= c.s(22) ? 4 : t >= c.s(21) ? 3 : t >= c.s(19) ? 2 : t >= c.s(18) ? 1 : 0;
    const uTex = [
      "",
      "B_r(x)\\cap B_r(y)=\\varnothing\\ ?",
      `z\\in\\text{both}:\\ d(x,y)\\le d(x,z)+d(z,y)<2r=d(x,y)\\ \\ ${tc(Palette.red, "\\text{contradiction}")}`,
      "k\\ge K_1\\Rightarrow x_k\\in B_r(x),\\qquad k\\ge K_2\\Rightarrow x_k\\in B_r(y)",
      `k\\ge\\max(K_1,K_2):\\ \\ x_k\\in B_r(x)\\cap B_r(y)=\\varnothing\\ \\ ${tc(Palette.red, "\\text{impossible}")}`,
    ][uState];
    this.uniqLine.setContent(uTex);
    this.uniqLine.set({ opacity: un * (uState > 0 ? 1 : 0) });
    this.uniqNote.set({ opacity: un * c.p(22, 0.6, 1.8) });
    // in sentence 21 the late terms flicker between the two balls: they would have to sit in both
    const flick = t >= c.s(21) && t < c.s(23) ? (Math.floor((t - c.s(21)) * 2) % 2 === 0 ? 0 : 1) : 0;
    this.seqU.forEach((d, i) => {
      const k = i + 1;
      const base = spiral(470, 420, 200, k);
      d.setPosition(flick && k >= 6 ? base.clone().add(P(480, 0)) : base);
      d.setColor(t >= c.s(21) && k >= 6 ? Palette.red : Palette.orange);
    });

    // ---- trivial topology (s23–s27)
    const tr = c.p(24, 0.6) * (1 - c.p(28, 0.6));
    this.boxFill.setOpacity(0.12 * tr);
    this.box.setOpacity(tr);
    this.boxLabel.set({ opacity: tr });
    const seqTIn = c.over(25, 0.0, 0.6);
    this.seqT.forEach((d, i) => d.setOpacity(tr * (i + 1 <= 1 + 13 * seqTIn ? 1 : 0)));
    const candIdx = t >= c.in(27, 0.55) ? 2 : t >= c.in(27, 0.25) ? 1 : 0;
    this.candDots.forEach((d, i) => d.setOpacity(tr * c.p(25, 0.5, 0.4 * i)));
    this.candLabels.forEach((l, i) => l.set({ opacity: tr * c.p(25, 0.5, 0.4 * i) }));
    const ringOn = tr * c.p(25, 0.5, 1.5) * (1 - c.p(27, 0.4, 3.5));
    const cd = [{ x: 420, y: 560 }, { x: 760, y: 340 }, { x: 1040, y: 590 }][t >= c.s(27) ? candIdx : 0];
    this.candRing.setPoints(PixelSpace.circle(cd.x, cd.y, 30));
    this.candRing.setOpacity(ringOn);
    this.checks.forEach((ch, i) => ch.set({ opacity: tr * (i === 0 ? c.p(26, 0.5, 1.5) : t >= c.s(27) && candIdx >= i ? 1 : 0) }));
    this.trivialLine.set({ opacity: tr * c.p(26, 0.5) * (1 - c.p(27, 0.4, 3.0)) });
    this.everyNote.set({ opacity: tr * c.p(27, 0.5, 3.2) });
    const boxPulse = t >= c.s(26) && t < c.s(27) ? 5 : 3;
    this.box.setWidth(boxPulse);

    // ---- discrete topology (s28–s31)
    const ds = c.p(28, 0.6) * (1 - c.p(32, 0.6));
    this.dAxis.setOpacity(ds);
    this.dTicks.forEach((h) => h.set({ opacity: ds }));
    this.zeroDot.setOpacity(ds);
    this.zeroRing.setOpacity(ds * c.p(28, 0.5, 0.8));
    const dIn = c.over(31, 0.05, 0.7);
    this.dDots.forEach((d, i) => d.setOpacity(ds * (t >= c.s(31) ? (i + 1 <= 1 + 29 * dIn ? 1 : 0) : 0)));
    this.dRings.forEach((r, i) => r.setOpacity(ds * 0.8 * (t >= c.s(31) ? (i + 1 <= 1 + 29 * dIn ? 1 : 0) : 0) * (i < 12 ? 1 : 0)));
    const dState = t >= c.s(31) ? 3 : t >= c.s(30) ? 2 : t >= c.s(29) ? 1 : 0;
    const dTex = [
      "\\{x\\}\\ \\text{is open}",
      "x_k\\to x\\ \\Rightarrow\\ \\exists K:\\ k\\ge K\\Rightarrow x_k\\in\\{x\\},\\ \\text{i.e. } x_k=x",
      "x_k=x\\ \\text{eventually}\\ \\Rightarrow\\ x_k\\in U\\ \\text{eventually, for every open } U\\ni x",
      `\\tfrac1k\\neq 0\\ \\ \\forall k:\\quad \\tfrac1k\\ ${tc(Palette.red, "\\not\\to")}\\ 0\\ \\ \\text{in the discrete topology}`,
    ][dState];
    this.discreteLine.setContent(dTex);
    this.discreteLine.set({ opacity: ds });
    const dCross = ds * c.p(31, 0.5, 3.0);
    this.discreteCross.forEach((p) => p.setOpacity(dCross));
    this.discreteNote.set({ opacity: ds * c.p(31, 0.6, 4.0) });

    // ---- summary and Hausdorff (s32–s35)
    this.summary.set({ opacity: c.p(32, 0.6) });
    this.hausdorff.set({ opacity: c.p(34, 0.6) });

    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
