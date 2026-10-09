import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Cues } from "../../primitives/Cues";
import { CurvedArrow } from "../../primitives/CurvedArrow";
import { Dot } from "../../primitives/Dot";
import { lerp, smoothstep } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Region } from "../../primitives/Region";
import { PixelSpace } from "./lib/PixelSpace";
import { tc } from "./lib/tex";

/**
 * E01 c07 — homeomorphisms: definition, the induced bijection of open sets, (−1, 1) ≅ ℝ via tan(πx/2),
 * homeomorphism as an equivalence relation, and the open disk deformed into the open square (shown, not proved).
 * Coordinates are output pixels (PixelSpace). Sentence indices refer to story.en.json, scene c07-homeomorphism.
 */

const XC = { x: 330, y: 430 };
const YC = { x: 1040, y: 430 };
const R_X = 200;
/** The illustrative homeomorphism between the panels, in local coordinates (a small smooth shear, injective). */
const h = (u: number, v: number): { x: number; y: number } => ({ x: 1.1 * u + 30 * Math.sin(v / 90), y: 0.95 * v + 25 * Math.sin(u / 100) });
const xPt = (u: number, v: number): THREE.Vector3 => PixelSpace.p(XC.x + u, XC.y + v);
const yPt = (u: number, v: number): THREE.Vector3 => {
  const q = h(u, v);
  return PixelSpace.p(YC.x + q.x, YC.y + q.y);
};
const disk = (cu: number, cv: number, r: number, map: (u: number, v: number) => THREE.Vector3): THREE.Vector3[] => {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI;
    pts.push(map(cu + r * Math.cos(a), cv + r * Math.sin(a)));
  }
  return pts;
};

const SEG = { cx: 710, half: 250, y: 300 };            // (−1, 1) on top
const LINE = { cx: 710, scale: 120, y: 580 };          // ℝ below: y ↦ 710 + 120 y
const tanMap = (x: number): number => Math.tan((Math.PI * x) / 2);
const SQ = { cx: 710, cy: 450, r: 190 };               // disk → square picture

export class HomeomorphismScene implements Scene {
  readonly id = "c07-homeomorphism";
  private stage!: StageLayer;

  private question!: FormulaHandle;
  private xBlob!: Polyline;
  private yBlob!: Polyline;
  private xFill!: Region;
  private yFill!: Region;
  private panelLabels: FormulaHandle[] = [];
  private pairLines: Polyline[] = [];
  private pairDots: Dot[] = [];
  private openX: Region[] = [];
  private openXEdge: Polyline[] = [];
  private openMoving: Region[] = [];
  private openMovingEdge: Polyline[] = [];
  private openY: Polyline[] = [];
  private notes: FormulaHandle[] = [];
  private fArrow!: CurvedArrow;
  private finvArrow!: CurvedArrow;
  private arrowLabels: FormulaHandle[] = [];
  private defn!: FormulaHandle;
  private uLabel!: FormulaHandle;
  private fuLabel!: FormulaHandle;
  private proofLine!: FormulaHandle;
  private bijNote!: FormulaHandle;

  private segLine!: Polyline;
  private segEnds: Dot[] = [];
  private realLine!: Polyline;
  private realFadeL!: Polyline;
  private realFadeR!: Polyline;
  private segLabels: FormulaHandle[] = [];
  private movers: Dot[] = [];
  private moverX: number[] = [];
  private tanFormula!: FormulaHandle;
  private tanStep!: FormulaHandle;
  private smallTop!: Polyline;
  private smallBottom!: Polyline;
  private smallLabels: FormulaHandle[] = [];
  private lengthNote!: FormulaHandle;
  private localNote!: FormulaHandle;
  private equivCard!: FormulaHandle;

  private sqOutline!: Polyline;
  private sqFill!: Region;
  private sqGrid: { pts: { rho: number; th: number }[]; line: Polyline }[] = [];
  private sqNote!: FormulaHandle;
  private keepCard!: FormulaHandle;
  private finalQ!: FormulaHandle;

  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    const P = PixelSpace.p;

    this.question = fl.add({ text: "When are two spaces the same?", x: 710, y: 110, size: 42, color: Palette.yellow });
    const xb = disk(0, 0, R_X, xPt);
    const yb = disk(0, 0, R_X, yPt);
    this.xFill = new Region(stage, xb, Palette.blue, 0.1);
    this.xBlob = new Polyline(stage, xb, { color: Palette.blue, width: 2.5 });
    this.yFill = new Region(stage, yb, Palette.blue, 0.1);
    this.yBlob = new Polyline(stage, yb, { color: Palette.blue, width: 2.5 });
    this.panelLabels = [fl.add({ tex: "X", x: XC.x - 190, y: XC.y - 190, size: 40, color: Palette.blue }), fl.add({ tex: "Y", x: YC.x + 220, y: YC.y - 190, size: 40, color: Palette.blue })];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 2 * Math.PI + 0.3;
      const r = i % 2 === 0 ? 130 : 70;
      const u = r * Math.cos(a);
      const v = r * Math.sin(a);
      this.pairLines.push(new Polyline(stage, [xPt(u, v), yPt(u, v)], { color: Palette.muted, width: 1.2 }));
      this.pairDots.push(new Dot(stage, xPt(u, v), Palette.orange, 0.045), new Dot(stage, yPt(u, v), Palette.orange, 0.045));
    }
    const opens = [{ u: -80, v: -60, r: 55, c: Palette.green }, { u: 60, v: 70, r: 65, c: Palette.purple }, { u: 90, v: -80, r: 45, c: Palette.teal }];
    for (const o of opens) {
      this.openX.push(new Region(stage, disk(o.u, o.v, o.r, xPt), o.c, 0.3, -0.005));
      this.openXEdge.push(new Polyline(stage, disk(o.u, o.v, o.r, xPt), { color: o.c, width: 2, dashed: true, dashSize: 0.06, gapSize: 0.05 }));
      this.openMoving.push(new Region(stage, disk(o.u, o.v, o.r, xPt), o.c, 0.3, -0.004));
      this.openMovingEdge.push(new Polyline(stage, disk(o.u, o.v, o.r, xPt), { color: o.c, width: 2, dashed: true, dashSize: 0.06, gapSize: 0.05 }));
      this.openY.push(new Polyline(stage, disk(o.u, o.v, o.r, yPt), { color: o.c, width: 2, dashed: true, dashSize: 0.06, gapSize: 0.05 }));
    }
    this.opens = opens;
    this.notes = [
      fl.add({ text: "bijective on points", x: 710, y: 720, size: 34, color: Palette.text }),
      fl.add({ text: "bijective on open sets", x: 710, y: 800, size: 34, color: Palette.text }),
    ];
    this.fArrow = new CurvedArrow(stage, P(XC.x + 160, XC.y - 230), P(YC.x - 160, YC.y - 230), 0.35, Palette.text, 3);
    this.finvArrow = new CurvedArrow(stage, P(YC.x - 160, XC.y + 230), P(XC.x + 160, XC.y + 230), 0.35, Palette.yellow, 3);
    this.arrowLabels = [fl.add({ tex: "f", x: (XC.x + YC.x) / 2, y: XC.y - 280, size: 38 }), fl.add({ tex: "f^{-1}", x: (XC.x + YC.x) / 2, y: XC.y + 285, size: 38, color: Palette.yellow })];
    this.defn = fl.add({
      tex: `f:X\\to Y\\ \\text{homeomorphism}:\\quad\\text{(i) bijective}\\quad\\text{(ii) } f\\ \\text{continuous}\\quad ${tc(Palette.yellow, "\\text{(iii) } f^{-1}\\ \\text{continuous}")}`,
      x: 710, y: 100, size: 34, boxed: true,
    });
    this.uLabel = fl.add({ tex: "U", x: XC.x - 80, y: XC.y - 60, size: 34, color: Palette.green });
    this.fuLabel = fl.add({ tex: "f(U)", x: 0, y: 0, size: 32, color: Palette.green });
    this.proofLine = fl.add({ tex: "", x: 710, y: 815, size: 34 });
    this.bijNote = fl.add({ tex: "U\\mapsto f(U)\\ \\ \\text{bijection}\\ \\{\\text{open in } X\\}\\to\\{\\text{open in } Y\\},\\ \\ \\text{inverse } V\\mapsto f^{-1}(V)", x: 710, y: 815, size: 32, color: Palette.green });

    // ---- (−1, 1) ≅ ℝ
    this.segLine = new Polyline(stage, [P(SEG.cx - SEG.half, SEG.y), P(SEG.cx + SEG.half, SEG.y)], { color: Palette.blue, width: 6 });
    this.segEnds = [new Dot(stage, P(SEG.cx - SEG.half, SEG.y), Palette.blue, 0.08, "2d", true), new Dot(stage, P(SEG.cx + SEG.half, SEG.y), Palette.blue, 0.08, "2d", true)];
    this.realLine = new Polyline(stage, [P(260, LINE.y), P(1160, LINE.y)], { color: Palette.purple, width: 6 });
    this.realFadeL = new Polyline(stage, [P(80, LINE.y), P(260, LINE.y)], { color: Palette.purple, width: 6, dashed: true, dashSize: 0.12, gapSize: 0.1 });
    this.realFadeR = new Polyline(stage, [P(1160, LINE.y), P(1340, LINE.y)], { color: Palette.purple, width: 6, dashed: true, dashSize: 0.12, gapSize: 0.1 });
    this.segLabels = [
      fl.add({ tex: "(-1,1)", x: SEG.cx - SEG.half - 70, y: SEG.y, size: 34, color: Palette.blue }),
      fl.add({ tex: "-1", x: SEG.cx - SEG.half, y: SEG.y - 36, size: 28, color: Palette.muted }),
      fl.add({ tex: "1", x: SEG.cx + SEG.half, y: SEG.y - 36, size: 28, color: Palette.muted }),
      fl.add({ tex: "\\mathbb{R}", x: 1345, y: LINE.y - 40, size: 34, color: Palette.purple }),
      fl.add({ tex: "0", x: LINE.cx, y: LINE.y + 34, size: 26, color: Palette.muted }),
    ];
    for (let i = -6; i <= 6; i++) {
      const x = i * 0.15;
      this.moverX.push(x);
      this.movers.push(new Dot(stage, P(SEG.cx + SEG.half * x, SEG.y), Palette.orange, 0.06));
    }
    this.tanFormula = fl.add({ tex: "f(x)=\\tan\\frac{\\pi x}{2},\\qquad f^{-1}(y)=\\frac{2}{\\pi}\\arctan y", x: 710, y: 130, size: 40 });
    this.tanStep = fl.add({ tex: "", x: 710, y: 760, size: 34 });
    this.smallTop = new Polyline(stage, [P(SEG.cx + SEG.half * 0.5, SEG.y), P(SEG.cx + SEG.half * 0.8, SEG.y)], { color: Palette.green, width: 10 });
    this.smallBottom = new Polyline(stage, [P(LINE.cx + LINE.scale * tanMap(0.5), LINE.y), P(LINE.cx + LINE.scale * tanMap(0.8), LINE.y)], { color: Palette.green, width: 10 });
    this.smallLabels = [
      fl.add({ tex: "(0.5,\\,0.8)\\ \\text{open}", x: SEG.cx + SEG.half * 0.65, y: SEG.y + 40, size: 28, color: Palette.green }),
      fl.add({ tex: "(1,\\,3.08)\\ \\text{open}", x: LINE.cx + LINE.scale * 2.04, y: LINE.y + 40, size: 28, color: Palette.green }),
    ];
    this.lengthNote = fl.add({ text: "length changes, openness does not", x: 710, y: 760, size: 36, color: Palette.yellow });
    this.localNote = fl.add({ tex: "\\text{locally like } \\mathbb{R}^n\\iff\\text{locally like an open subset of } \\mathbb{R}^n", x: 710, y: 760, size: 36, color: Palette.text });
    this.equivCard = fl.add({
      tex: "\\begin{aligned}&\\mathrm{id}_X\\ \\text{homeomorphism}\\\\&f\\ \\text{homeo}\\Rightarrow f^{-1}\\ \\text{homeo}\\\\&f,g\\ \\text{homeo}\\Rightarrow g\\circ f\\ \\text{homeo},\\quad (g\\circ f)^{-1}=f^{-1}\\circ g^{-1}\\end{aligned}",
      x: 710, y: 430, size: 40, display: true, boxed: true,
    });

    // ---- disk → square
    const grid: { rho: number; th: number }[][] = [];
    for (const rho of [0.25, 0.5, 0.75]) grid.push(Array.from({ length: 97 }, (_, i) => ({ rho, th: (i / 96) * 2 * Math.PI })));
    for (let k = 0; k < 8; k++) grid.push(Array.from({ length: 21 }, (_, i) => ({ rho: i / 20, th: (k * Math.PI) / 4 + Math.PI / 8 })));
    this.sqGrid = grid.map((pts) => ({ pts, line: new Polyline(stage, pts.map((q) => this.diskSquare(q.rho, q.th, 0)), { color: Palette.muted, width: 1.5 }) }));
    const outline = Array.from({ length: 129 }, (_, i) => ({ rho: 1, th: (i / 128) * 2 * Math.PI }));
    this.outlinePts = outline;
    this.sqOutline = new Polyline(stage, outline.map((q) => this.diskSquare(q.rho, q.th, 0)), { color: Palette.blue, width: 3, dashed: true, dashSize: 0.1, gapSize: 0.07 });
    this.sqFill = new Region(stage, outline.map((q) => this.diskSquare(q.rho, q.th, 0)), Palette.blue, 0.15);
    this.sqNote = fl.add({ text: "open disk ≅ open square  (shown, not proved)", x: 710, y: 760, size: 34, color: Palette.muted });
    this.keepCard = fl.add({
      tex: `\\begin{aligned}&${tc(Palette.green, "\\text{kept}")}:\\ \\text{open sets, convergence, continuity}\\\\&${tc(Palette.red, "\\text{may change}")}:\\ \\text{distance, length, boundedness}\\end{aligned}`,
      x: 710, y: 400, size: 40, display: true,
    });
    this.finalQ = fl.add({ text: "Is (iii) really needed?  continuous + bijective  ⇒  continuous inverse?", x: 710, y: 620, size: 34, color: Palette.yellow });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "U\\mapsto f(U):\\ \\text{open sets matched}", at: cue.in(11, 0.7) },
      { label: "2", tex: "\\tan\\tfrac{\\pi x}{2}:\\ (-1,1)\\cong\\mathbb{R}", at: cue.in(18, 0.4) },
      { label: "3", tex: "\\text{length: not topological}", at: cue.in(20, 0.6) },
      { label: "4", tex: "\\cong\\ \\text{is an equivalence relation}", at: cue.in(23, 0.7) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  private opens: { u: number; v: number; r: number; c: string }[] = [];
  private outlinePts: { rho: number; th: number }[] = [];

  /** Point of the unit disk (polar ρ, θ) moved a fraction s toward the square with the same rays. */
  private diskSquare(rho: number, th: number, s: number): THREE.Vector3 {
    const k = lerp(1, 1 / Math.max(Math.abs(Math.cos(th)), Math.abs(Math.sin(th))), s);
    const r = SQ.r * rho * k * (1 - 0.14 * s);
    return PixelSpace.p(SQ.cx + r * Math.cos(th), SQ.cy - r * Math.sin(th));
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    PixelSpace.apply(this.stage);
    const P = PixelSpace.p;

    this.question.set({ opacity: c.p(0, 0.6, 0.3) * (1 - c.p(3, 0.5)) });

    // ---- panels (s0–s12)
    const panel = c.p(0, 0.6, 0.6) * (1 - c.p(13, 0.6));
    this.xFill.setOpacity(0.1 * panel);
    this.yFill.setOpacity(0.1 * panel);
    this.xBlob.setOpacity(panel);
    this.yBlob.setOpacity(panel);
    this.panelLabels.forEach((l) => l.set({ opacity: panel }));
    const pairs = panel * c.p(1, 0.5) * (1 - 0.8 * c.p(2, 0.6)) * (1 - c.p(5, 0.5));
    const pairGrow = c.over(1, 0.1, 0.8);
    this.pairLines.forEach((l, i) => l.setOpacity(pairs * smoothstep(i / 12 * 0.7, i / 12 * 0.7 + 0.3, pairGrow)));
    this.pairDots.forEach((d, i) => d.setOpacity(pairs * smoothstep(Math.floor(i / 2) / 12 * 0.7, Math.floor(i / 2) / 12 * 0.7 + 0.3, pairGrow)));
    this.notes[0].set({ opacity: panel * c.p(1, 0.5, 1.0) * (1 - c.p(2, 0.4)) + panel * c.during(12, 13, 0.3) * 0 });
    const opensOn = panel * c.p(2, 0.5) * (1 - c.p(5, 0.5));
    const morph = c.over(2, 0.3, 0.9);
    this.opens.forEach((o, i) => {
      this.openX[i].setOpacity(0.3 * opensOn);
      this.openXEdge[i].setOpacity(opensOn);
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 64; k++) {
        const a = (k / 64) * 2 * Math.PI;
        const u = o.u + o.r * Math.cos(a);
        const v = o.v + o.r * Math.sin(a);
        pts.push(xPt(u, v).lerp(yPt(u, v), morph));
      }
      this.openMoving[i].setPoints(pts);
      this.openMovingEdge[i].setPoints(pts);
      this.openMoving[i].setOpacity(0.3 * opensOn * (morph > 0.001 ? 1 : 0));
      this.openMovingEdge[i].setOpacity(opensOn * (morph > 0.001 ? 1 : 0));
      this.openY[i].setOpacity(0);
    });
    this.notes[1].set({ opacity: panel * (c.p(2, 0.5, 1.5) * (1 - c.p(3, 0.4)) + c.during(12, 13, 0.3)) });
    this.defn.set({ opacity: c.p(3, 0.6) * (1 - c.p(13, 0.6)) });
    const arrows = panel * c.p(5, 0.6);
    this.fArrow.setProgress(c.p(5, 0.8), arrows);
    this.finvArrow.setProgress(c.p(7, 0.8), arrows);
    this.arrowLabels[0].set({ opacity: arrows });
    this.arrowLabels[1].set({ opacity: arrows * c.p(7, 0.6) });
    // the proof uses the first open set U (green) and, for V, the same picture read backwards
    const proofOn = panel * c.p(6, 0.5);
    const showU = proofOn * (1 - c.p(12, 0.5));
    this.openX[0].setOpacity(Math.max(0.3 * opensOn, 0.3 * showU));
    this.openXEdge[0].setOpacity(Math.max(opensOn, showU));
    this.openY[0].setOpacity(showU * c.p(7, 0.6));
    this.uLabel.set({ opacity: showU });
    const fu = h(this.opens[0].u, this.opens[0].v);
    this.fuLabel.setContent(t >= c.s(9) ? "V" : "f(U)");
    this.uLabel.setContent(t >= c.s(9) ? "f^{-1}(V)" : "U");
    this.fuLabel.set({ x: YC.x + fu.x, y: YC.y + fu.y, opacity: showU * c.p(7, 0.6) });
    const steps: [number, string][] = [
      [6, "y\\in f(U)\\iff f^{-1}(y)\\in U\\qquad(f\\ \\text{bijective})"],
      [7, "f(U)=(f^{-1})^{-1}(U)\\ \\ \\text{open, since } f^{-1}\\ \\text{is continuous}"],
      [8, `${tc(Palette.yellow, "\\text{(iii) used here}")}:\\ \\text{without it, } f(U)\\ \\text{need not be open}`],
      [9, "V\\ \\text{open in } Y\\Rightarrow f^{-1}(V)\\ \\text{open in } X\\qquad(f\\ \\text{continuous})"],
      [10, "f\\big(f^{-1}(V)\\big)=V\\qquad(f\\ \\text{onto})"],
    ];
    let line = "";
    for (const [i, tex] of steps) if (t >= c.s(i)) line = tex;
    this.proofLine.setContent(line);
    this.proofLine.set({ opacity: panel * (t >= c.s(6) && t < c.s(11) ? 1 : 0) });
    this.bijNote.set({ opacity: panel * c.during(11, 12, 0.3) });

    // ---- (−1, 1) ≅ ℝ (s13–s21)
    const tn = c.p(13, 0.6) * (1 - c.p(22, 0.6));
    this.segLine.setOpacity(tn);
    this.segEnds.forEach((d) => d.setOpacity(tn));
    this.segLabels.forEach((l, i) => l.set({ opacity: i < 3 ? tn : tn * c.p(13, 0.5, 1.0) }));
    this.realLine.setOpacity(tn * c.p(13, 0.5, 1.0));
    this.realFadeL.setOpacity(tn * c.p(13, 0.5, 1.0) * 0.6);
    this.realFadeR.setOpacity(tn * c.p(13, 0.5, 1.0) * 0.6);
    this.tanFormula.set({ opacity: tn * c.p(14, 0.6) });
    const move = c.over(14, 0.3, 0.95);
    this.movers.forEach((d, i) => {
      const x = this.moverX[i];
      const target = LINE.cx + LINE.scale * tanMap(x);
      const px = lerp(SEG.cx + SEG.half * x, target, move);
      const py = lerp(SEG.y, LINE.y, move);
      d.setPosition(P(px, py));
      const inFrame = px > 70 && px < 1350 ? 1 : 0;
      d.setOpacity(tn * c.p(14, 0.4) * inFrame * (1 - 0.7 * c.p(19, 0.5)));
    });
    const tSteps: [number, string][] = [
      [15, "\\tan\\ \\text{strictly increasing on } (-\\tfrac\\pi2,\\tfrac\\pi2)\\ \\Rightarrow\\ f\\ \\text{injective}"],
      [16, "x\\to\\pm1:\\ f(x)\\to\\pm\\infty\\ \\ +\\ \\text{intermediate value theorem}\\ \\Rightarrow\\ \\text{onto } \\mathbb{R}"],
      [17, "f,\\ f^{-1}=\\tfrac{2}{\\pi}\\arctan\\ \\text{continuous}\\ \\Rightarrow\\ f\\ \\text{homeomorphism}"],
    ];
    let tl = "";
    for (const [i, tex] of tSteps) if (t >= c.s(i)) tl = tex;
    this.tanStep.setContent(tl);
    this.tanStep.set({ opacity: tn * (t >= c.s(15) && t < c.s(19) ? 1 : 0) });
    const small = tn * c.p(19, 0.6);
    this.smallTop.setOpacity(small);
    this.smallBottom.setOpacity(small * c.p(19, 0.6, 1.0));
    this.smallLabels[0].set({ opacity: small });
    this.smallLabels[1].set({ opacity: small * c.p(19, 0.6, 1.0) });
    this.lengthNote.set({ opacity: tn * c.during(19, 21, 0.4) });
    this.localNote.set({ opacity: tn * c.p(21, 0.6) });

    // ---- equivalence relation (s22–s23)
    this.equivCard.set({ opacity: c.p(22, 0.6) * (1 - c.p(24, 0.6)) });

    // ---- disk → square (s24)
    const sqOn = c.p(24, 0.6) * (1 - c.p(25, 0.6));
    const s = c.over(24, 0.15, 0.85);
    this.sqGrid.forEach((g) => {
      g.line.setPoints(g.pts.map((q) => this.diskSquare(q.rho, q.th, s)));
      g.line.setOpacity(sqOn * 0.8);
    });
    const outline = this.outlinePts.map((q) => this.diskSquare(q.rho, q.th, s));
    this.sqOutline.setPoints(outline);
    this.sqOutline.setOpacity(sqOn);
    this.sqFill.setPoints(outline);
    this.sqFill.setOpacity(0.15 * sqOn);
    this.sqNote.set({ opacity: sqOn });

    this.keepCard.set({ opacity: c.p(25, 0.6) });
    this.finalQ.set({ opacity: c.p(26, 0.6) });

    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
