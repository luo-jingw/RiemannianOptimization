import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { CurvedArrow } from "../../primitives/CurvedArrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { lerp, smoothstep } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline, circlePoints } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Region } from "../../primitives/Region";
import { flash } from "./lib/Flash";
import { LabelPlacer } from "./lib/LabelPlacer";
import { Shapes } from "./lib/Shapes";
import { Tex } from "./lib/Tex";

/**
 * E02 c03 — the three conditions of a topological manifold, the line with two origins
 * (locally Euclidean, not Hausdorff, a sequence with two limits), uniqueness of limits in
 * Hausdorff spaces (ledger), and a schematic for second countability.
 * View: world origin at pixel (750, 540), 120 px per world unit. Line parameter t is drawn at world x = 1.6 t.
 * Sentence indices refer to content/episodes/e02-smooth-manifolds/story.en.json, scene c03-topological-manifold.
 */

const K = 1.6;                 // world units per unit of the line parameter t
const LY = 0.8;                // world height of the glued line
const GAP = 0.1;               // vertical offset of the two origins (12 px)
const AXY = -1.55;             // world height of the chart axis ℝ
const TMAX = 3.0;              // drawn range of t
const LX = (t: number, y = LY): THREE.Vector3 => new THREE.Vector3(K * t, y, 0);
const DISC_U = new THREE.Vector2(-2.6, 0.4);
const DISC_V = new THREE.Vector2(2.0, 0.4);
const DISC_R = 1.35;

/** Points x_k approaching the center of disc U (deterministic spiral). */
function seqPoint(k: number): THREE.Vector3 {
  const r = 3.4 / (k + 1.2);
  const a = 0.9 * k + 0.4;
  return new THREE.Vector3(DISC_U.x + r * Math.cos(a) + 0.0, DISC_U.y + 0.75 * r * Math.sin(a), 0);
}

export class TopologicalManifoldScene implements Scene {
  readonly id = "c03-topological-manifold";
  private placer!: LabelPlacer;

  private defLines: FormulaHandle[] = [];
  private thumbArcs: Polyline[] = [];
  private thumbNote!: FormulaHandle;
  private tag!: FormulaHandle;

  private upper!: Polyline;
  private lower!: Polyline;
  private upperO!: Dot;
  private lowerO!: Dot;
  private copyA!: FormulaHandle;
  private copyB!: FormulaHandle;
  private merged!: Polyline;
  private oA!: Dot;
  private oB!: Dot;
  private oALabel!: FormulaHandle;
  private oBLabel!: FormulaHandle;
  private openRule!: FormulaHandle;

  private nbA!: Polyline;
  private nbB!: Polyline;
  private axis!: Polyline;
  private axisLabel!: FormulaHandle;
  private axisNb!: Polyline;
  private arrowA!: CurvedArrow;
  private arrowB!: CurvedArrow;
  private chartA!: FormulaHandle;
  private chartB!: FormulaHandle;
  private sharedDot!: Dot;
  private sharedLabel!: FormulaHandle;
  private noDisjoint!: FormulaHandle;
  private epsLabel!: FormulaHandle;

  private seq: Dot[] = [];
  private toA!: CurvedArrow;
  private toB!: CurvedArrow;
  private twoLimits!: FormulaHandle;
  private fLine!: FormulaHandle;

  private claim!: FormulaHandle;
  private discU!: Region;
  private discV!: Region;
  private discUOut!: Polyline;
  private discVOut!: Polyline;
  private discLabels: FormulaHandle[] = [];
  private xDot!: Dot;
  private yDot!: Dot;
  private seqU: Dot[] = [];
  private crossA!: Polyline;
  private crossB!: Polyline;
  private emptyNote!: FormulaHandle;
  private failNote!: FormulaHandle;
  private ledger!: ProofLedger;

  private copies: Polyline[] = [];
  private schematic!: FormulaHandle;
  private dots!: FormulaHandle;
  private technical!: FormulaHandle;
  private summary!: FormulaHandle;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.placer = new LabelPlacer(stage);
    stage.setView2D(1.75, 0, 9);

    const defTex = [
      "\\text{1. locally Euclidean: every } p\\in M \\text{ lies in the domain of a } d\\text{-dim chart}",
      "\\text{2. Hausdorff: } p\\neq q\\ \\Rightarrow\\ \\exists\\ \\text{open } U\\ni p,\\ V\\ni q,\\ U\\cap V=\\varnothing",
      "\\text{3. second countable: the topology has a countable basis}",
    ];
    this.defLines = defTex.map((tex, i) => fl.add({ tex, x: 160, y: 250 + i * 95, size: 34, align: "left" }));
    const thumbColors = [Palette.teal, Palette.green, Palette.pink, Palette.purple];
    const thumbC = new THREE.Vector2(3.9, -1.2);
    const thumbSpec: [number, number, number][] = [[0.62, 0, Math.PI], [0.62, Math.PI, 2 * Math.PI], [0.7, -Math.PI / 2, Math.PI / 2], [0.7, Math.PI / 2, 1.5 * Math.PI]];
    this.thumbArcs = thumbSpec.map((q, i) => new Polyline(stage, Shapes.arc(thumbC.x, thumbC.y, q[0], q[1] + 0.03, q[2] - 0.03, 50), { color: thumbColors[i], width: 4 }));
    this.thumbNote = fl.add({ tex: "S^1:\\ \\text{four half-circle charts};\\ \\text{Hausdorff, 2nd countable: inherited from } \\mathbb{R}^2", x: 160, y: 560, size: 30, align: "left", color: Palette.text });
    this.tag = fl.add({ tex: "", x: 80, y: 80, size: 30, align: "left" });

    // ---- Line with two origins
    this.upper = new Polyline(stage, [LX(-TMAX, 2.0), LX(TMAX, 2.0)], { color: Palette.blue, width: 4 });
    this.lower = new Polyline(stage, [LX(-TMAX, -0.4), LX(TMAX, -0.4)], { color: Palette.blue, width: 4 });
    this.upperO = new Dot(stage, LX(0, 2.0), Palette.orange, 0.08);
    this.lowerO = new Dot(stage, LX(0, -0.4), Palette.purple, 0.08);
    this.copyA = fl.add({ text: "upper copy", x: 0, y: 0, size: 28, color: Palette.muted, align: "left" });
    this.copyB = fl.add({ text: "lower copy", x: 0, y: 0, size: 28, color: Palette.muted, align: "left" });
    this.merged = new Polyline(stage, [LX(-TMAX), LX(-0.04), LX(0.04), LX(TMAX)], { color: Palette.blue, width: 4 });
    this.oA = new Dot(stage, LX(0, LY + GAP), Palette.orange, 0.075);
    this.oB = new Dot(stage, LX(0, LY - GAP), Palette.purple, 0.075);
    this.oALabel = fl.add({ tex: "0_a", x: 0, y: 0, size: 34, color: Palette.orange });
    this.oBLabel = fl.add({ tex: "0_b", x: 0, y: 0, size: 34, color: Palette.purple });
    this.openRule = fl.add({ tex: "W\\ \\text{open}\\iff W\\cap(\\text{each copy})\\ \\text{open in } \\mathbb{R}", x: 750, y: 805, size: 34 });

    this.nbA = new Polyline(stage, [LX(-1, LY + GAP), LX(1, LY + GAP)], { color: Palette.orange, width: 7 });
    this.nbB = new Polyline(stage, [LX(-1, LY - GAP), LX(1, LY - GAP)], { color: Palette.purple, width: 7 });
    this.axis = new Polyline(stage, [LX(-TMAX, AXY), LX(TMAX, AXY)], { color: Palette.axis, width: 2.5 });
    this.axisLabel = fl.add({ tex: "\\mathbb{R}", x: 0, y: 0, size: 32, color: Palette.muted });
    this.axisNb = new Polyline(stage, [LX(-1, AXY), LX(1, AXY)], { color: Palette.green, width: 7 });
    this.arrowA = new CurvedArrow(stage, LX(-1.3, LY + 0.25), LX(-1.3, AXY + 0.2), 0.5, Palette.orange, 2.5);
    this.arrowB = new CurvedArrow(stage, LX(1.3, LY - 0.25), LX(1.3, AXY + 0.2), -0.5, Palette.purple, 2.5);
    this.chartA = fl.add({ tex: "\\text{chart around } 0_a:\\ t\\mapsto t", x: 0, y: 0, size: 30, color: Palette.orange, align: "right" });
    this.chartB = fl.add({ tex: "\\text{chart around } 0_b:\\ t\\mapsto t", x: 0, y: 0, size: 30, color: Palette.purple, align: "left" });
    this.sharedDot = new Dot(stage, LX(0.3), Palette.red, 0.08);
    this.sharedLabel = fl.add({ tex: "\\tfrac12\\min(\\varepsilon,\\delta)", x: 0, y: 0, size: 30, color: Palette.red });
    this.noDisjoint = fl.add({ text: "no disjoint neighborhoods", x: 750, y: 805, size: 34, color: Palette.red });
    this.epsLabel = fl.add({ tex: "", x: 0, y: 0, size: 30, color: Palette.text, align: "left" });

    for (let k = 1; k <= 30; k++) this.seq.push(new Dot(stage, LX(1 / k), Palette.yellow, 0.05));
    this.toA = new CurvedArrow(stage, LX(0.55, LY + 0.45), LX(0.06, LY + GAP + 0.12), 0.25, Palette.orange, 2.5);
    this.toB = new CurvedArrow(stage, LX(0.55, LY - 0.45), LX(0.06, LY - GAP - 0.12), -0.25, Palette.purple, 2.5);
    this.twoLimits = fl.add({ tex: "x_k=\\tfrac1k:\\qquad x_k\\to 0_a\\quad\\text{and}\\quad x_k\\to 0_b", x: 750, y: 805, size: 36, color: Palette.yellow });
    this.fLine = fl.add({ tex: "f\\ \\text{continuous}:\\quad f(0_a)=\\lim_{k\\to\\infty} f(1/k)=f(0_b)", x: 750, y: 805, size: 36 });

    // ---- Hausdorff ⇒ unique limits
    this.claim = fl.add({ tex: "X\\ \\text{Hausdorff},\\ \\ x_k\\to x,\\ \\ x_k\\to y\\ \\ \\Rightarrow\\ \\ x=y", x: 750, y: 100, size: 38, boxed: true });
    const uPts = circlePoints(DISC_U.x, DISC_U.y, DISC_R, 96);
    const vPts = circlePoints(DISC_V.x, DISC_V.y, DISC_R, 96);
    this.discU = new Region(stage, uPts, Palette.green, 0.18);
    this.discV = new Region(stage, vPts, Palette.purple, 0.18);
    this.discUOut = new Polyline(stage, uPts, { color: Palette.green, width: 2.5, dashed: true, dashSize: 0.12, gapSize: 0.08 });
    this.discVOut = new Polyline(stage, vPts, { color: Palette.purple, width: 2.5, dashed: true, dashSize: 0.12, gapSize: 0.08 });
    this.discLabels = [
      fl.add({ tex: "U\\ni x", x: 0, y: 0, size: 34, color: Palette.green }),
      fl.add({ tex: "V\\ni y", x: 0, y: 0, size: 34, color: Palette.purple }),
    ];
    this.xDot = new Dot(stage, new THREE.Vector3(DISC_U.x, DISC_U.y, 0), Palette.green, 0.08);
    this.yDot = new Dot(stage, new THREE.Vector3(DISC_V.x, DISC_V.y, 0), Palette.purple, 0.08);
    for (let k = 1; k <= 24; k++) this.seqU.push(new Dot(stage, seqPoint(k), Palette.yellow, 0.05));
    const cx = DISC_V.x;
    const cy = DISC_V.y;
    this.crossA = new Polyline(stage, [new THREE.Vector3(cx - 0.5, cy - 0.5, 0), new THREE.Vector3(cx + 0.5, cy + 0.5, 0)], { color: Palette.red, width: 6 });
    this.crossB = new Polyline(stage, [new THREE.Vector3(cx - 0.5, cy + 0.5, 0), new THREE.Vector3(cx + 0.5, cy - 0.5, 0)], { color: Palette.red, width: 6 });
    this.emptyNote = fl.add({ tex: "x_k\\in U\\cap V=\\varnothing\\ \\ \\text{— impossible}", x: 750, y: 805, size: 36, color: Palette.red });
    this.failNote = fl.add({ tex: "\\text{line with two origins: no such } U,V\\ \\text{for } 0_a,0_b", x: 750, y: 805, size: 34, color: Palette.orange });
    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "x\\neq y:\\ U\\ni x,\\ V\\ni y\\ \\text{disjoint}", at: cue.in(29, 0.6) },
      { label: "2", tex: "k\\geq K_1\\Rightarrow x_k\\in U", at: cue.in(30, 0.6) },
      { label: "3", tex: "k\\geq K_2\\Rightarrow x_k\\in V", at: cue.in(31, 0.6) },
      { label: "4", tex: "k^*=\\max K_i:\\ x_{k^*}\\in U\\cap V\\ \\blacksquare", at: cue.in(32, 0.7) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 }, "Hausdorff ⇒ unique limits");

    // ---- Second countable schematic
    for (let i = 0; i < 6; i++) this.copies.push(new Polyline(stage, [new THREE.Vector3(-4.5, 1.6 - i * 0.55, 0), new THREE.Vector3(3.5, 1.6 - i * 0.55, 0)], { color: Palette.blue, width: 3 }));
    this.dots = fl.add({ tex: "\\vdots", x: 0, y: 0, size: 48, color: Palette.blue });
    this.schematic = fl.add({ text: "schematic: uncountably many copies of ℝ", x: 750, y: 800, size: 30, color: Palette.muted });
    this.technical = fl.add({ text: "technical; not developed in this course", x: 750, y: 840, size: 26, color: Palette.muted });
    this.summary = fl.add({ tex: "\\text{topological manifold} = \\text{locally Euclidean} + \\text{Hausdorff} + \\text{second countable}", x: 750, y: 430, size: 38, boxed: true });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;

    // ---------- Definition (s1–s7)
    const defOn = 1 - c.p(8, 0.6);
    const defStart = [3, 4, 5];
    this.defLines.forEach((h, i) => {
      const speaking = t >= c.s(defStart[i]) && t < c.s(defStart[i] + 1);
      const grayLater = i > 0 && t >= c.s(6);
      h.set({ opacity: defOn * c.p(defStart[i], 0.6, 0.2) * (i === 0 ? 1 : 1), color: speaking ? Palette.yellow : grayLater ? Palette.muted : Palette.text });
    });
    const thumbOn = c.p(6, 0.7) * defOn;
    this.thumbArcs.forEach((a) => a.setOpacity(thumbOn));
    this.thumbNote.set({ opacity: c.p(7, 0.6) * defOn });
    const tagState = t >= c.s(36) ? 2 : t >= c.s(20) ? 1 : 0;
    const hColor = tagState >= 1 ? Palette.red : Palette.yellow;
    const sColor = tagState >= 2 ? Palette.text : Palette.muted;
    this.tag.setContent(`${Tex.c(Palette.green, "\\text{locally Euclidean}\\ \\checkmark")}\\quad ${Tex.c(hColor, tagState >= 1 ? "\\text{Hausdorff}\\ \\times" : "\\text{Hausdorff}\\ ?")}\\quad ${Tex.c(sColor, "\\text{second countable}")}`);
    this.tag.set({ opacity: c.p(8, 0.6) * (1 - c.p(28, 0.5)) + c.p(34, 0.6) * (1 - c.p(37, 0.5)) });

    // ---------- Construction (s8–s13)
    const lineOn = c.p(9, 0.7) * (1 - c.p(28, 0.6));
    const glue = c.over(10, 0.1, 0.85);
    const yU = lerp(2.0, LY + GAP, glue);
    const yL = lerp(-0.4, LY - GAP, glue);
    const copiesOn = lineOn * (1 - smoothstep(0.85, 1.0, glue));
    this.upper.setPoints([LX(-TMAX, yU), LX(TMAX, yU)]);
    this.lower.setPoints([LX(-TMAX, yL), LX(TMAX, yL)]);
    this.upper.setOpacity(copiesOn);
    this.lower.setOpacity(copiesOn);
    this.upperO.setPosition(LX(0, yU));
    this.lowerO.setPosition(LX(0, yL));
    this.upperO.setOpacity(copiesOn);
    this.lowerO.setOpacity(copiesOn);
    this.placer.place(this.copyA, LX(TMAX, yU), 14, 0, copiesOn);
    this.placer.place(this.copyB, LX(TMAX, yL), 14, 0, copiesOn);
    const mergedOn = lineOn * smoothstep(0.85, 1.0, glue);
    this.merged.setOpacity(mergedOn);
    this.oA.setOpacity(mergedOn);
    this.oB.setOpacity(mergedOn);
    this.placer.place(this.oALabel, LX(0, LY + GAP), -6, -30, mergedOn * c.p(11, 0.5));
    this.placer.place(this.oBLabel, LX(0, LY - GAP), -6, 32, mergedOn * c.p(11, 0.5));
    this.openRule.set({ opacity: c.p(12, 0.6) * (1 - c.p(14, 0.5)) });

    // ---------- Neighborhoods, charts, shrinking (s13–s20)
    let eps = 1.0;
    if (t >= c.s(18)) eps = lerp(1.0, 0.08, smoothstep(c.in(18, 0.25), c.e(19), t));
    const del = 0.7 * eps;
    const nbAOn = lineOn * (c.p(13, 0.6) * (1 - c.p(14, 0.4)) + c.p(14, 0.5)) * (1 - c.p(21, 0.6));
    const nbBOn = lineOn * c.p(14, 0.5, 0.8) * (1 - c.p(21, 0.6));
    const overlapFlash = t >= c.s(18) && t < c.s(21) ? flash(t, c.s(18), 0.9, 0.45) : 1;
    this.nbA.setPoints([LX(-eps, LY + GAP), LX(eps, LY + GAP)]);
    this.nbB.setPoints([LX(-del, LY - GAP), LX(del, LY - GAP)]);
    this.nbA.setOpacity(nbAOn * overlapFlash);
    this.nbB.setOpacity(nbBOn * overlapFlash);
    this.oA.setColor(Palette.orange);
    const chartsOn = c.p(14, 0.6) * (1 - c.p(17, 0.6));
    this.axis.setOpacity(chartsOn);
    this.placer.place(this.axisLabel, LX(TMAX + 0.12, AXY), 0, 0, chartsOn);
    this.axisNb.setOpacity(chartsOn * c.p(15, 0.6));
    this.arrowA.setProgress(c.p(15, 1.0), chartsOn);
    this.arrowB.setProgress(c.p(16, 1.0), chartsOn);
    this.placer.place(this.chartA, LX(-1.6, (LY + AXY) / 2), -10, 0, chartsOn * c.p(15, 0.6));
    this.placer.place(this.chartB, LX(1.6, (LY + AXY) / 2), 10, 0, chartsOn * c.p(16, 0.6));
    const epsOn = c.p(18, 0.5) * (1 - c.p(21, 0.5));
    this.epsLabel.setContent(`\\varepsilon=${eps.toFixed(2)},\\ \\ \\delta=${del.toFixed(2)}`);
    this.placer.place(this.epsLabel, LX(1.3, LY + 0.9), 0, 0, epsOn);
    const shareOn = c.p(19, 0.5) * (1 - c.p(21, 0.5));
    this.sharedDot.setPosition(LX(del / 2));
    this.sharedDot.setOpacity(shareOn);
    this.placer.place(this.sharedLabel, LX(Math.max(del / 2, 0.25), LY - 0.75), 40, 0, shareOn);
    this.noDisjoint.set({ opacity: c.p(20, 0.5) * (1 - c.p(21, 0.5)) });

    // ---------- Sequence 1/k (s21–s27)
    const seqOn = lineOn * (1 - 0.0);
    const shown = c.over(21, 0.1, 0.95) * 30;
    const epsSeq = 0.3;
    this.seq.forEach((d, i) => {
      const k = i + 1;
      const inNb = t >= c.s(22) && k > 1 / epsSeq;
      d.setOpacity(seqOn * smoothstep(i, i + 1, shown));
      d.setColor(inNb && t < c.s(23) ? Palette.orange : Palette.yellow);
    });
    const nbSeqOn = c.p(22, 0.5) * (1 - c.p(23, 0.5)) * lineOn;
    if (t >= c.s(21)) {
      this.nbA.setPoints([LX(-epsSeq, LY + GAP), LX(epsSeq, LY + GAP)]);
      this.nbA.setOpacity(nbSeqOn);
    }
    const arrowsOn = lineOn * c.p(23, 0.4);
    this.toA.setProgress(c.p(23, 0.8), arrowsOn);
    this.toB.setProgress(c.p(23, 0.8, 0.9), arrowsOn);
    this.twoLimits.set({ opacity: c.p(23, 0.6) * (1 - c.p(25, 0.5)) });
    this.fLine.set({ opacity: c.p(26, 0.6) * (1 - c.p(28, 0.5)) });

    // ---------- Hausdorff ⇒ unique limits (s28–s33)
    const hOn = c.p(28, 0.7) * (1 - c.p(34, 0.6));
    this.claim.set({ opacity: hOn });
    const discOn = hOn * c.p(29, 0.6);
    this.discU.setOpacity(0.18 * discOn);
    this.discV.setOpacity(0.18 * discOn);
    this.discUOut.setOpacity(discOn);
    this.discVOut.setOpacity(discOn);
    this.placer.place(this.discLabels[0], new THREE.Vector3(DISC_U.x - 1.0, DISC_U.y + 1.55, 0), 0, 0, discOn);
    this.placer.place(this.discLabels[1], new THREE.Vector3(DISC_V.x + 1.0, DISC_V.y + 1.55, 0), 0, 0, discOn);
    this.xDot.setOpacity(hOn);
    this.yDot.setOpacity(hOn);
    const seqShown = c.over(28, 0.2, 0.9) * 24;
    const k1 = 3;
    this.seqU.forEach((d, i) => {
      const k = i + 1;
      d.setOpacity(hOn * smoothstep(i, i + 1, seqShown));
      d.setColor(t >= c.in(30, 0.5) && k >= k1 ? Palette.green : Palette.yellow);
    });
    const crossOn = hOn * c.p(32, 0.5) * flash(t, c.s(32) + 0.5, 0.9, 0.4);
    this.crossA.setOpacity(crossOn);
    this.crossB.setOpacity(crossOn);
    this.emptyNote.set({ opacity: c.p(32, 0.6) * (1 - c.p(33, 0.4)) });
    this.failNote.set({ opacity: c.p(33, 0.6) * (1 - c.p(34, 0.5)) });
    this.ledger.update(t, 1 - c.p(34, 0.6), t < c.s(33));

    // ---------- Second countability (s34–s37)
    const scOn = c.p(35, 0.7) * (1 - c.p(37, 0.6));
    this.copies.forEach((l, i) => l.setOpacity(scOn * c.p(35, 0.5, 0.15 * i)));
    this.placer.place(this.dots, new THREE.Vector3(-0.5, -1.45, 0), 0, 0, scOn);
    this.schematic.set({ opacity: scOn });
    this.technical.set({ opacity: c.p(36, 0.6) * (1 - c.p(37, 0.6)) });
    this.summary.set({ opacity: c.p(37, 0.7) });
  }

  teardown(_layers: SceneLayers): void {}
}
