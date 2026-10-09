import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { lerp, smoothstep } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline, circlePoints, sampleCurve } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Tex } from "./lib/Tex";

/**
 * E04 c05 — regular values. Phase A (s0–s11): a rank-2 derivative of h : R⁵ → R² whose last block is singular;
 * its columns drawn in R², two independent ones chosen and permuted to the end. Phase B (s12–s15): surjective ⟺
 * rank k, and the definition. Phase C (s16–s21): x² + y² at levels 1 and 0; x² − y² at level 0 with a rank probe.
 * Phase D (s22–s27): the circle at (1, 0) needs the x column; remarks.
 * The stage uses a pixel-aligned 2D view: world (X, Y) = (px / 100, −py / 100).
 * Sentence indices refer to content/episodes/e04-implicit-level-sets/story.en.json, scene c05-regular-value.
 */

const LEFT_CENTER_X = 750;
const GOLD = Palette.yellow;
const px = (x: number, y: number, z = 0): THREE.Vector3 => new THREE.Vector3(x / 100, -y / 100, z);
const COL_X0 = 570;          // pixel x of matrix column 1
const COL_DX = 90;
const MAT_Y = 270;
const ENTRIES = [["1", "0"], ["0", "1"], ["2", "1"], ["0", "0"], ["0", "0"]];
const PERM_SLOT = [3, 4, 0, 1, 2];        // column i moves to slot PERM_SLOT[i]: columns 1, 2 go last

function rectPx(x0: number, y0: number, x1: number, y1: number): THREE.Vector3[] {
  return [px(x0, y0), px(x1, y0), px(x1, y1), px(x0, y1), px(x0, y0)];
}

export class RegularValueScene implements Scene {
  readonly id = "c05-regular-value";

  // Phase A
  private columns: FormulaHandle[] = [];
  private colLabels: FormulaHandle[] = [];
  private parens: FormulaHandle[] = [];
  private matLabel!: FormulaHandle;
  private lastBox!: Polyline;
  private lastBoxLabel!: FormulaHandle;
  private singular!: FormulaHandle;
  private rankNote!: FormulaHandle;
  private plotAxes: Arrow[] = [];
  private colArrows: Arrow[] = [];
  private colArrowLabels: FormulaHandle[] = [];
  private zeroDot!: Dot;
  private zeroLabel!: FormulaHandle;
  private spanNote!: FormulaHandle;
  private permNote!: FormulaHandle;
  private identityNote!: FormulaHandle;

  // Phase B
  private sizeLine!: FormulaHandle;
  private ontoLine!: FormulaHandle;
  private definition!: FormulaHandle;

  // Phase C
  private exAxes: Arrow[] = [];
  private exCircle!: Polyline;
  private exNormals: Arrow[] = [];
  private exOrigin!: Dot;
  private exLabels: FormulaHandle[] = [];
  private crossAxes: Arrow[] = [];
  private crossLines: Polyline[] = [];
  private probe!: Dot;
  private probeArrow!: Arrow;
  private probeReadout!: FormulaHandle;
  private crossLabel!: FormulaHandle;

  // Phase D
  private circAxes: Arrow[] = [];
  private circ!: Polyline;
  private circPoint!: Dot;
  private circArrow!: Arrow;
  private circFormula!: FormulaHandle;
  private arcs: Polyline[] = [];
  private remark1!: FormulaHandle;
  private remark2!: FormulaHandle;
  private summary!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    stage.setView2D(9.6, -5.4, 10.8);

    // ---- Phase A: the matrix as five movable columns
    for (let i = 0; i < 5; i++) {
      this.columns.push(fl.add({ tex: this.colTex(i, false, Palette.text), x: COL_X0 + i * COL_DX, y: MAT_Y, size: 48, display: true }));
      this.colLabels.push(fl.add({ tex: `x_${i + 1}`, x: COL_X0 + i * COL_DX, y: MAT_Y - 85, size: 30, color: Palette.muted }));
    }
    this.parens = [
      fl.add({ tex: "\\left(\\vphantom{\\begin{matrix}0\\\\0\\end{matrix}}\\right.", x: COL_X0 - 55, y: MAT_Y, size: 56, display: true }),
      fl.add({ tex: "\\left.\\vphantom{\\begin{matrix}0\\\\0\\end{matrix}}\\right)", x: COL_X0 + 4 * COL_DX + 55, y: MAT_Y, size: 56, display: true }),
    ];
    this.matLabel = fl.add({ tex: "Dh(p)=", x: COL_X0 - 80, y: MAT_Y, size: 46, align: "right" });
    this.lastBox = new Polyline(stage, rectPx(COL_X0 + 2.5 * COL_DX, MAT_Y - 60, COL_X0 + 4.5 * COL_DX, MAT_Y + 60), { color: GOLD, width: 3 });
    this.lastBoxLabel = fl.add({ tex: "\\text{last } k \\text{ columns: } D_yh", x: COL_X0 + 3.5 * COL_DX, y: MAT_Y + 95, size: 30, color: GOLD });
    this.singular = fl.add({ text: "singular", x: COL_X0 + 3.5 * COL_DX, y: MAT_Y + 95, size: 30, color: Palette.red });
    this.rankNote = fl.add({ tex: "\\text{rows independent}\\ \\Rightarrow\\ \\operatorname{rank}=2", x: LEFT_CENTER_X, y: 425, size: 34, color: Palette.green });
    const O = { x: 420, y: 650 };
    const S = 105;
    const ax = (a: THREE.Vector3, b: THREE.Vector3): Arrow => new Arrow(stage, a, b, Palette.axis, { width: 2, headLength: 0.12 });
    this.plotAxes = [ax(px(O.x - 120, O.y), px(O.x + 300, O.y)), ax(px(O.x, O.y + 110), px(O.x, O.y - 150))];
    const cols: [number, number][] = [[1, 0], [0, 1], [2, 1]];
    this.colArrows = cols.map(([a, b]) => new Arrow(stage, px(O.x, O.y, 0.01), px(O.x + a * S, O.y - b * S, 0.01), Palette.text, { width: 4, headLength: 0.16 }));
    this.colArrowLabels = cols.map(([a, b], i) => fl.add({ tex: `c_${i + 1}`, x: O.x + a * S + (i === 1 ? -28 : 18), y: O.y - b * S - 18, size: 32 }));
    this.zeroDot = new Dot(stage, px(O.x, O.y, 0.02), Palette.red, 0.07);
    this.zeroLabel = fl.add({ tex: "c_4=c_5=0", x: O.x - 30, y: O.y + 40, size: 30, color: Palette.red, align: "right" });
    this.spanNote = fl.add({ tex: "\\begin{gathered}\\text{columns span } \\mathbb{R}^k\\ (\\dim = \\operatorname{rank}=k)\\\\ \\text{a spanning set contains a basis}\\\\ \\Rightarrow k\\ \\text{independent columns: invertible } k\\times k \\text{ block}\\end{gathered}", x: 1060, y: 640, size: 30, display: true });
    this.permNote = fl.add({ tex: "\\text{permute coordinates: a linear isomorphism of } \\mathbb{R}^n", x: LEFT_CENTER_X, y: 470, size: 34, color: Palette.text });
    this.identityNote = fl.add({ tex: `\\text{last block} = I\\ \\Rightarrow\\ ${Tex.color(Palette.green, "\\text{implicit function theorem applies}")}`, x: LEFT_CENTER_X, y: 560, size: 34 });

    // ---- Phase B
    this.sizeLine = fl.add({ tex: "h:\\mathbb{R}^n\\to\\mathbb{R}^k,\\qquad Dh(x)\\in\\mathbb{R}^{k\\times n}", x: LEFT_CENTER_X, y: 150, size: 42 });
    this.ontoLine = fl.add({ tex: "\\operatorname{im} Dh(x)\\subseteq\\mathbb{R}^k,\\ \\ \\dim = \\operatorname{rank}\\qquad\\Rightarrow\\qquad Dh(x)\\ \\text{onto}\\iff\\operatorname{rank}Dh(x)=k", x: LEFT_CENTER_X, y: 250, size: 34 });
    this.definition = fl.add({ tex: this.defTex(false), x: LEFT_CENTER_X, y: 420, size: 40, boxed: true, display: true });

    // ---- Phase C: x² + y² at levels 1 and 0, then x² − y² at level 0
    const L = { x: 470, y: 600 };
    const Rt = { x: 1050, y: 600 };
    this.exAxes = [ax(px(L.x - 200, L.y), px(L.x + 200, L.y)), ax(px(L.x, L.y + 190), px(L.x, L.y - 200)),
      ax(px(Rt.x - 200, Rt.y), px(Rt.x + 200, Rt.y)), ax(px(Rt.x, Rt.y + 190), px(Rt.x, Rt.y - 200))];
    this.exCircle = new Polyline(stage, circlePoints(L.x / 100, -L.y / 100, 1.3, 128), { color: Palette.blue, width: 5 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 2 * Math.PI + 0.3;
      const p0 = new THREE.Vector3(L.x / 100 + 1.3 * Math.cos(a), -L.y / 100 + 1.3 * Math.sin(a), 0.01);
      this.exNormals.push(new Arrow(stage, p0, p0.clone().add(new THREE.Vector3(0.55 * Math.cos(a), 0.55 * Math.sin(a), 0)), Palette.green, { width: 3, headLength: 0.13 }));
    }
    this.exOrigin = new Dot(stage, px(Rt.x, Rt.y, 0.02), Palette.red, 0.09);
    this.exLabels = [
      fl.add({ tex: `x^2+y^2=1:\\ Dh=(2x,2y)\\neq 0\\ \\ ${Tex.color(Palette.green, "\\checkmark")}`, x: L.x, y: 345, size: 32 }),
      fl.add({ tex: `x^2+y^2=0:\\ Dh(0,0)=(0,0)\\ \\ ${Tex.color(Palette.red, "\\times")}`, x: Rt.x, y: 345, size: 32 }),
      fl.add({ text: "1 is a regular value", x: L.x, y: 830, size: 28, color: Palette.green }),
      fl.add({ text: "0 is not", x: Rt.x, y: 830, size: 28, color: Palette.red }),
    ];
    const C = { x: 700, y: 560 };
    this.crossAxes = [ax(px(C.x - 260, C.y), px(C.x + 260, C.y)), ax(px(C.x, C.y + 250), px(C.x, C.y - 260))];
    this.crossLines = [
      new Polyline(stage, [px(C.x - 230, C.y + 230), px(C.x + 230, C.y - 230)], { color: Palette.blue, width: 5 }),
      new Polyline(stage, [px(C.x - 230, C.y - 230), px(C.x + 230, C.y + 230)], { color: Palette.blue, width: 5 }),
    ];
    this.probe = new Dot(stage, px(C.x, C.y, 0.03), Palette.orange, 0.08);
    this.probeArrow = new Arrow(stage, px(C.x, C.y, 0.02), px(C.x + 1, C.y, 0.02), Palette.green, { width: 3, headLength: 0.13 });
    this.probeReadout = fl.add({ tex: "", x: LEFT_CENTER_X, y: 255, size: 36 });
    this.crossLabel = fl.add({ tex: "h=x^2-y^2,\\quad c=0,\\quad Dh=(2x,\\,-2y)", x: LEFT_CENTER_X, y: 170, size: 38 });

    // ---- Phase D: the circle at (1, 0)
    const Q = { x: 620, y: 560 };
    this.circAxes = [ax(px(Q.x - 260, Q.y), px(Q.x + 300, Q.y)), ax(px(Q.x, Q.y + 250), px(Q.x, Q.y - 260))];
    this.circ = new Polyline(stage, circlePoints(Q.x / 100, -Q.y / 100, 2.0, 160), { color: Palette.blue, width: 5 });
    this.circPoint = new Dot(stage, px(Q.x + 200, Q.y, 0.03), Palette.orange, 0.08);
    this.circArrow = new Arrow(stage, px(Q.x + 200, Q.y, 0.02), px(Q.x + 290, Q.y, 0.02), Palette.green, { width: 4, headLength: 0.15 });
    this.circFormula = fl.add({ tex: `Dh(1,0)=\\big(\\,${Tex.color(Palette.green, "\\underset{x}{2}")}\\quad ${Tex.color(Palette.red, "\\underset{y}{0}")}\\,\\big)`, x: LEFT_CENTER_X, y: 200, size: 44 });
    const arc = (a: number, b: number, r: number, color: string): Polyline =>
      new Polyline(stage, sampleCurve((s) => new THREE.Vector3(Q.x / 100 + r * Math.cos(s), -Q.y / 100 + r * Math.sin(s), 0.01), a, b, 60), { color, width: 8 });
    const d = Math.PI / 180;
    this.arcs = [arc(25 * d, 155 * d, 2.0, Palette.green), arc(205 * d, 335 * d, 2.0, Palette.green),
      arc(-65 * d, 65 * d, 2.12, Palette.teal), arc(115 * d, 245 * d, 2.12, Palette.teal)];
    this.remark1 = fl.add({ tex: "\\text{regularity is a property of the pair } (h,\\,c)", x: LEFT_CENTER_X, y: 380, size: 36 });
    this.remark2 = fl.add({ tex: "h^{-1}(c)=\\varnothing\\ \\Rightarrow\\ c\\ \\text{regular (vacuously)}", x: LEFT_CENTER_X, y: 470, size: 36 });
    this.summary = fl.add({ tex: `\\operatorname{rank}Dh=k\\ \\text{at every } x\\in h^{-1}(c)\\ \\Rightarrow\\ \\text{invertible block}\\ \\Rightarrow\\ ${Tex.color(Palette.green, "\\text{IFT at every point}")}`, x: LEFT_CENTER_X, y: 600, size: 32, color: Palette.text });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "\\operatorname{rank}k\\Rightarrow \\text{an invertible block}", at: cue.s(8) + 1.0 },
      { label: "2", tex: "\\text{permute: } D_yh(a,b)\\ \\text{invertible}", at: cue.s(11) + 1.5 },
      { label: "3", tex: "Dh(x)\\ \\text{onto}\\iff\\operatorname{rank}=k", at: cue.s(13) + 2.0 },
      { label: "4", tex: "c\\ \\text{regular: rank } k \\text{ on } h^{-1}(c)", at: cue.s(14) + 2.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  private colTex(i: number, generic: boolean, color: string): string {
    const e = ENTRIES[i];
    const body = generic ? "\\begin{matrix}\\ast\\\\ \\ast\\end{matrix}" : `\\begin{matrix}${e[0]}\\\\ ${e[1]}\\end{matrix}`;
    return Tex.color(color, body);
  }

  private defTex(pulse: boolean): string {
    const forall = Tex.color(pulse ? Palette.orange : Palette.red, "\\forall");
    return `\\begin{gathered}\\text{Definition. } c\\in\\mathbb{R}^k \\text{ is a regular value of } h \\iff\\\\ ${forall}\\, x\\in h^{-1}(c):\\ \\ Dh(x)\\ \\text{surjective}\\ \\ (\\operatorname{rank}Dh(x)=k)\\end{gathered}`;
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;

    // ---- Phase A
    const phaseA = c.p(0, 0.8) * (1 - c.p(12, 0.8));
    const generic = t < c.s(2);
    const perm = c.over(9, 0.1, 0.8);
    for (let i = 0; i < 5; i++) {
      let color: string = Palette.text;
      if (!generic && i >= 3 && t >= c.s(3) && t < c.s(9)) color = Palette.red;
      if (!generic && i < 2 && t >= c.s(6)) color = GOLD;
      this.columns[i].setContent(this.colTex(i, generic, color));
      const x = COL_X0 + lerp(i, PERM_SLOT[i], perm) * COL_DX;
      this.columns[i].set({ x, y: MAT_Y, opacity: phaseA });
      this.colLabels[i].set({ x, opacity: phaseA * (generic ? 0.6 : 1), color: i < 2 && t >= c.s(6) ? GOLD : Palette.muted });
    }
    this.parens.forEach((p) => p.set({ opacity: phaseA }));
    this.matLabel.set({ opacity: phaseA * c.p(2, 0.5) });
    const boxOn = phaseA * (c.p(0, 0.6, 0.8) * (1 - c.p(2, 0.4)) + c.p(11, 0.5));
    this.lastBox.setOpacity(boxOn);
    this.lastBox.setColor(t >= c.s(11) ? Palette.green : GOLD);
    this.lastBoxLabel.set({ opacity: phaseA * c.p(1, 0.6) * (1 - c.p(2, 0.4)) });
    this.singular.set({ opacity: phaseA * c.p(3, 0.5) * (1 - c.p(9, 0.5)) });
    this.rankNote.set({ opacity: phaseA * c.p(4, 0.6) });
    const plot = c.p(6, 0.8) * (1 - c.p(9, 0.6));
    this.plotAxes.forEach((a) => a.setOpacity(plot));
    this.colArrows.forEach((a, i) => { a.setOpacity(plot); a.setColor(i < 2 ? GOLD : Palette.text); });
    this.colArrowLabels.forEach((h, i) => h.set({ opacity: plot, color: i < 2 ? GOLD : Palette.text }));
    this.zeroDot.setOpacity(plot);
    this.zeroLabel.set({ opacity: plot });
    this.spanNote.set({ opacity: c.p(7, 0.6) * (1 - c.p(9, 0.6)) });
    this.permNote.set({ opacity: phaseA * c.p(10, 0.6) });
    this.identityNote.set({ opacity: phaseA * c.p(11, 0.6, 0.8) });

    // ---- Phase B
    const phaseB = c.p(12, 0.8) * (1 - c.p(16, 0.8));
    this.sizeLine.set({ opacity: phaseB });
    this.ontoLine.set({ opacity: phaseB * c.p(13, 0.6) });
    const pulse = t >= c.s(15) && t < c.e(15) && Math.sin((t - c.s(15)) * 2 * Math.PI / 0.8) > 0;
    this.definition.setContent(this.defTex(pulse));
    this.definition.set({ opacity: c.p(14, 0.6) * (1 - c.p(16, 0.8)) });

    // ---- Phase C1: levels 1 and 0 of x² + y²
    const ex = c.p(16, 0.8) * (1 - c.p(19, 0.8));
    this.exAxes.forEach((a, i) => a.setOpacity(ex * (i < 2 ? 1 : c.p(18, 0.6))));
    this.exCircle.setOpacity(ex);
    this.exNormals.forEach((a) => a.setOpacity(ex * c.p(17, 0.6)));
    this.exOrigin.setOpacity(ex * c.p(18, 0.6));
    this.exLabels[0].set({ opacity: ex * c.p(16, 0.6, 0.6) });
    this.exLabels[1].set({ opacity: ex * c.p(18, 0.6) });
    this.exLabels[2].set({ opacity: ex * c.p(17, 0.6, 1.2) });
    this.exLabels[3].set({ opacity: ex * c.p(18, 0.6, 1.2) });

    // ---- Phase C2: x² − y² with a rank probe
    const cr = c.p(19, 0.8) * (1 - c.p(22, 0.8));
    this.crossAxes.forEach((a) => a.setOpacity(cr));
    this.crossLines.forEach((l) => l.setOpacity(cr));
    this.crossLabel.set({ opacity: cr });
    const s = 1 - smoothstep(c.in(20, 0.05), c.in(20, 0.75), t);   // probe position along y = x, from 2.1 to 0 (world units)
    const pos = 2.1 * s;
    const C = { x: 7.0, y: -5.6 };
    const probeAt = new THREE.Vector3(C.x + pos, C.y + pos, 0.03);
    this.probe.setPosition(probeAt);
    this.probe.setOpacity(cr * c.p(20, 0.5));
    this.probe.setColor(pos < 0.01 ? Palette.red : Palette.orange);
    // Dh at (u, u) is (2u, −2u): drawn scaled by 0.35 (in plot units of 1 world = 1)
    const g = new THREE.Vector3(2 * pos, -2 * pos, 0).multiplyScalar(0.35);
    this.probeArrow.set(probeAt.clone().setZ(0.02), probeAt.clone().add(g).setZ(0.02));
    this.probeArrow.setOpacity(cr * c.p(20, 0.5) * (pos > 0.02 ? 1 : 0));
    const rank = pos > 0.01 ? 1 : 0;
    this.probeReadout.setContent(rank === 1
      ? `\\operatorname{rank}Dh=${Tex.color(Palette.green, "1")}`
      : `\\operatorname{rank}Dh(0,0)=${Tex.color(Palette.red, "0")}\\ \\Rightarrow\\ ${Tex.color(Palette.red, "0 \\text{ not regular}")}`);
    this.probeReadout.set({ opacity: cr * c.p(20, 0.5) });

    // ---- Phase D: the circle at (1, 0), remarks
    const cd = c.p(22, 0.8) * (1 - c.p(25, 0.8));
    this.circAxes.forEach((a) => a.setOpacity(cd));
    this.circ.setOpacity(cd);
    this.circPoint.setOpacity(cd * c.p(23, 0.5));
    this.circArrow.setOpacity(cd * c.p(23, 0.5, 0.6));
    this.circFormula.set({ opacity: cd * c.p(23, 0.5) });
    for (let i = 0; i < 4; i++) {
      const grow = c.over(24, i * 0.18, i * 0.18 + 0.3);
      this.arcs[i].setOpacity(cd * (grow > 0 ? 1 : 0));
      this.arcs[i].setProgress(grow);
    }
    const fin = c.p(25, 0.8);
    this.remark1.set({ opacity: fin * c.p(25, 0.6, 0.6) });
    this.remark2.set({ opacity: fin * c.p(26, 0.6) });
    this.summary.set({ opacity: fin * c.p(27, 0.6) });

    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
