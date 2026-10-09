import type * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { CurvedArrow } from "../../primitives/CurvedArrow";
import { Dot } from "../../primitives/Dot";
import { lerp, smoothstep } from "../../primitives/Easing";
import { keyframes } from "../../primitives/Keyframes";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Region } from "../../primitives/Region";
import { BendMap } from "./lib/BendMap";
import { pxv, usePixelView } from "./lib/PixelSpace";
import { RoadSign } from "./lib/RoadSign";
import { Tex } from "./lib/Tex";

/**
 * E03 c03 — statement and picture of the inverse function theorem.
 * Running map: BendMap (same F as c02), base point x₀ = (0.4, 0.5), disk U₀ of radius 0.55.
 * Sentence indices refer to story.en.json, scene c03-ift-statement.
 */

const X0: [number, number] = [0.4, 0.5];
const R0 = 0.55;
const FX0 = BendMap.apply(X0[0], X0[1]);

interface Layout {
  lx: number;
  ly: number;
  rx: number;
  ry: number;
  s: number;
}

interface DiskLine {
  pts: [number, number][];
  still: Polyline;
  moving: Polyline;
}

export class IftStatementScene implements Scene {
  readonly id = "c03-ift-statement";

  // Linear warm-up
  private linShapes: Polyline[] = [];
  private linArrow!: Arrow;
  private linLabel!: FormulaHandle;
  private linNotes: FormulaHandle[] = [];

  // Blobs
  private disk: DiskLine[] = [];
  private u0Fill!: Region;
  private v0Fill!: Region;
  private v0Dashed!: Polyline;
  private x0Dot!: Dot;
  private fx0Dot!: Dot;
  private labels: FormulaHandle[] = [];
  private arrowF!: CurvedArrow;
  private arrowG!: CurvedArrow;
  private labelF!: FormulaHandle;
  private labelG!: FormulaHandle;
  private pairDots: Dot[] = [];
  private pairImages: Dot[] = [];
  private pairNote!: FormulaHandle;
  private hitNote!: FormulaHandle;

  // Theorem
  private hyp!: FormulaHandle;
  private concl: FormulaHandle[] = [];
  private diffeo!: FormulaHandle;
  private ck!: FormulaHandle;
  private linearCase!: FormulaHandle;

  // Singular matrix panel
  private squashFill!: Region;
  private squashEdge!: Polyline;
  private squashGrid: Polyline[] = [];
  private squashMatrix!: FormulaHandle;
  private mergeA!: Dot;
  private mergeB!: Dot;
  private mergeNote!: FormulaHandle;
  private missDot!: Dot;
  private missNote!: FormulaHandle;
  private ruleOut!: FormulaHandle;

  // Derivative formula
  private formula: FormulaHandle[] = [];
  private caveat!: FormulaHandle;
  private closing!: FormulaHandle;

  private ledger!: ProofLedger;
  private road!: RoadSign;
  private layout: Layout = { lx: 330, ly: 560, rx: 980, ry: 560, s: 260 };

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    usePixelView(stage);

    // ---- Linear warm-up: square grid → parallelogram under an invertible matrix
    const A = [1.15, 0.45, -0.3, 0.95];
    const lin = (cx: number, m: number[], a: number, b: number): THREE.Vector3 =>
      pxv(cx + 110 * (m[0] * a + m[1] * b), 500 - 110 * (m[2] * a + m[3] * b));
    for (const [cx, m, col] of [[380, [1, 0, 0, 1], Palette.orange], [1000, A, Palette.blue]] as [number, number[], string][]) {
      for (let k = -2; k <= 2; k++) {
        const g = k / 2;
        this.linShapes.push(new Polyline(stage, [lin(cx, m, g, -1), lin(cx, m, g, 1)], { color: col, width: k === -2 || k === 2 ? 3 : 1.5 }));
        this.linShapes.push(new Polyline(stage, [lin(cx, m, -1, g), lin(cx, m, 1, g)], { color: col, width: k === -2 || k === 2 ? 3 : 1.5 }));
      }
    }
    this.linArrow = new Arrow(stage, pxv(560, 500), pxv(780, 500), Palette.text, { width: 3, headLength: 0.16 });
    this.linLabel = fl.add({ tex: "A\\ \\text{invertible}", x: 670, y: 460, size: 30 });
    this.linNotes = [
      fl.add({ tex: "\\text{no direction flattened}", x: 700, y: 720, size: 32, color: Palette.green }),
      fl.add({ tex: "\\text{no two points folded together}", x: 700, y: 780, size: 32, color: Palette.green }),
    ];

    // ---- Disk U₀ with a grid, carried by F
    const lines: [number, number][][] = [];
    for (let k = -3; k <= 3; k++) {
      const off = (k * R0) / 3.5;
      const half = Math.sqrt(R0 * R0 - off * off);
      const vert: [number, number][] = [];
      const horz: [number, number][] = [];
      for (let i = 0; i <= 30; i++) {
        const s = -half + (2 * half * i) / 30;
        vert.push([X0[0] + off, X0[1] + s]);
        horz.push([X0[0] + s, X0[1] + off]);
      }
      lines.push(vert, horz);
    }
    const circ: [number, number][] = [];
    for (let i = 0; i <= 96; i++) circ.push([X0[0] + R0 * Math.cos((2 * Math.PI * i) / 96), X0[1] + R0 * Math.sin((2 * Math.PI * i) / 96)]);
    lines.push(circ);
    this.disk = lines.map((pts, i) => ({
      pts,
      still: new Polyline(stage, pts.map((q) => this.leftPx(q[0], q[1])), { color: i === lines.length - 1 ? Palette.green : "#3f5a8a", width: i === lines.length - 1 ? 3 : 1.6 }),
      moving: new Polyline(stage, pts.map((q) => this.leftPx(q[0], q[1])), { color: i === lines.length - 1 ? Palette.purple : Palette.blue, width: i === lines.length - 1 ? 3 : 1.8 }),
    }));
    this.circlePts = circ;
    this.u0Fill = new Region(stage, circ.map((q) => this.leftPx(q[0], q[1])), Palette.green, 0.15);
    this.v0Fill = new Region(stage, circ.map((q) => this.rightImg(q[0], q[1])), Palette.purple, 0.2);
    this.v0Dashed = new Polyline(stage, circ.map((q) => this.rightImg(q[0], q[1])), { color: Palette.purple, width: 3, dashed: true, dashSize: 0.1, gapSize: 0.07 });
    this.x0Dot = new Dot(stage, this.leftPx(X0[0], X0[1]), Palette.orange, 0.07);
    this.fx0Dot = new Dot(stage, this.rightImg(X0[0], X0[1]), Palette.orange, 0.07);
    this.labels = [
      fl.add({ tex: "U_0", x: 0, y: 0, size: 32, color: Palette.green }),
      fl.add({ tex: "V_0", x: 0, y: 0, size: 32, color: Palette.purple }),
      fl.add({ tex: "x_0", x: 0, y: 0, size: 28, color: Palette.orange }),
      fl.add({ tex: "F(x_0)", x: 0, y: 0, size: 28, color: Palette.orange }),
    ];
    this.arrowF = new CurvedArrow(stage, pxv(0, 0), pxv(1, 0), 0.5, Palette.text);
    this.arrowG = new CurvedArrow(stage, pxv(1, 0), pxv(0, 0), 0.5, Palette.green);
    this.labelF = fl.add({ tex: "F", x: 0, y: 0, size: 34 });
    this.labelG = fl.add({ tex: "g=F^{-1}", x: 0, y: 0, size: 32, color: Palette.green });
    this.pairPts = [[X0[0] - 0.25, X0[1] + 0.2], [X0[0] + 0.22, X0[1] - 0.25]];
    this.pairDots = this.pairPts.map((_, i) => new Dot(stage, pxv(0, 0), i === 0 ? Palette.yellow : Palette.pink, 0.06));
    this.pairImages = this.pairPts.map((_, i) => new Dot(stage, pxv(0, 0), i === 0 ? Palette.yellow : Palette.pink, 0.06));
    this.pairNote = fl.add({ tex: "x\\neq x'\\ \\Rightarrow\\ F(x)\\neq F(x')", x: 0, y: 0, size: 28, color: Palette.yellow });
    this.hitNote = fl.add({ text: "every point near F(x₀) is hit", x: 0, y: 0, size: 26, color: Palette.purple });

    // ---- Theorem text
    this.hyp = fl.add({ tex: "U\\subseteq\\mathbb{R}^n\\ \\text{open},\\ \\ F:U\\to\\mathbb{R}^n\\ \\text{is } C^1,\\ \\ x_0\\in U,\\ \\ DF(x_0)\\ \\text{invertible}", x: 700, y: 100, size: 32 });
    const concl = [
      `${Tex.color(Palette.orange, "(1)")}\\ \\ F|_{U_0}\\ \\text{is one-to-one}`,
      `${Tex.color(Palette.orange, "(2)")}\\ \\ F(U_0)=V_0\\ \\text{is open}`,
      `${Tex.color(Palette.orange, "(3)")}\\ \\ g=(F|_{U_0})^{-1}\\in C^1,\\ \\ Dg(F(x_0))=DF(x_0)^{-1}`,
    ];
    this.concl = concl.map((tex, i) => fl.add({ tex, x: 190, y: 158 + i * 48, size: 30, align: "left" }));
    this.diffeo = fl.add({ tex: "F|_{U_0}:U_0\\to V_0\\ \\text{is a } C^1\\ \\text{diffeomorphism}", x: 1000, y: 158, size: 28, color: Palette.green });
    this.ck = fl.add({ tex: "F\\in C^k\\ (C^\\infty)\\ \\Rightarrow\\ g\\in C^k\\ (C^\\infty)", x: 1000, y: 206, size: 28, color: Palette.muted });
    this.linearCase = fl.add({ tex: this.linearTex(0), x: 700, y: 795, size: 32 });

    // ---- Singular matrix: squashes the disk onto a segment
    this.squashFill = new Region(stage, this.squashDisk(0), Palette.red, 0.18);
    this.squashEdge = new Polyline(stage, this.squashDisk(0), { color: Palette.red, width: 3 });
    for (let k = -2; k <= 2; k++) {
      this.squashGrid.push(new Polyline(stage, this.squashChord(k / 2.5, 0), { color: "#b05a5a", width: 1.5 }));
    }
    this.squashMatrix = fl.add({ tex: "\\begin{pmatrix}1&0\\\\0&0\\end{pmatrix}", x: 1090, y: 470, size: 40, display: true, color: Palette.red });
    this.mergeA = new Dot(stage, pxv(0, 0), Palette.yellow, 0.065);
    this.mergeB = new Dot(stage, pxv(0, 0), Palette.pink, 0.065);
    this.mergeNote = fl.add({ text: "two points, one image", x: 1090, y: 600, size: 26, color: Palette.yellow });
    this.missDot = new Dot(stage, pxv(0, 0), Palette.red, 0.11, "2d", true);
    this.missNote = fl.add({ text: "never reached", x: 1090, y: 660, size: 26, color: Palette.red });
    this.ruleOut = fl.add({ tex: "DF(x_0)\\ \\text{invertible rules out both}", x: 1090, y: 740, size: 28, color: Palette.green });

    // ---- Derivative formula
    const ftex = [
      "g(F(x))=x\\qquad (x\\in U_0)",
      "Dg(F(x_0))\\;DF(x_0)=I",
      `\\Longrightarrow\\quad ${Tex.color(Palette.yellow, "Dg(F(x_0))=DF(x_0)^{-1}")}`,
    ];
    this.formula = ftex.map((tex, i) => fl.add({ tex, x: 560, y: 590 + i * 75, size: 38 }));
    this.caveat = fl.add({ tex: "\\text{assumes } g \\text{ differentiable!}", x: 1080, y: 665, size: 32, color: Palette.orange, boxed: true });
    this.closing = fl.add({ tex: "\\text{that is the real content of the theorem}", x: 1080, y: 740, size: 28, color: Palette.orange });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "F|_{U_0}\\ \\text{one-to-one}", at: cue.s(8) + 1.0 },
      { label: "2", tex: "V_0=F(U_0)\\ \\text{open}", at: cue.s(9) + 1.5 },
      { label: "3", tex: "g\\in C^1,\\ Dg=DF^{-1}", at: cue.s(10) + 2.0 },
      { label: "4", tex: `${Tex.color(Palette.orange, "\\text{needs } g\\ \\text{differentiable}")}`, at: cue.s(24) + 1.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
    this.road = new RoadSign(fl, 700);
  }

  private circlePts: [number, number][] = [];
  private pairPts: [number, number][] = [];

  private linearTex(stage: number): string {
    const a = "F(x)=Ax,\\ A\\ \\text{invertible}:\\ \\ F^{-1}(y)=A^{-1}y\\ \\ (\\text{global})";
    const b = `\\qquad ${Tex.color(Palette.orange, "\\text{nonlinear: only local}")}`;
    return Tex.reveal([a, b], stage + 1);
  }

  private leftPx(u: number, v: number): THREE.Vector3 {
    const L = this.layout;
    return pxv(L.lx + L.s * (u - X0[0]), L.ly - L.s * (v - X0[1]));
  }

  private rightImg(u: number, v: number): THREE.Vector3 {
    const L = this.layout;
    const p = BendMap.apply(u, v);
    return pxv(L.rx + L.s * (p[0] - FX0[0]), L.ry - L.s * (p[1] - FX0[1]));
  }

  private carry(u: number, v: number, s: number): THREE.Vector3 {
    return this.leftPx(u, v).lerp(this.rightImg(u, v), s);
  }

  private squashDisk(s: number): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (2 * Math.PI * i) / 96;
      pts.push(pxv(700 + 150 * Math.cos(a), 640 - 150 * (1 - s) * Math.sin(a)));
    }
    return pts;
  }

  private squashChord(x: number, s: number): THREE.Vector3[] {
    const h = Math.sqrt(1 - x * x);
    return [pxv(700 + 150 * x, 640 - 150 * (1 - s) * h), pxv(700 + 150 * x, 640 + 150 * (1 - s) * h)];
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;

    const lay = keyframes(t, [
      { t: 0, v: { lx: 330, ly: 560, rx: 980, ry: 560, s: 260 } },
      { t: c.s(15), v: { lx: 220, ly: 330, rx: 600, ry: 330, s: 170 } },
    ], 1.2);
    this.layout = lay;

    // ---- Linear warm-up: s0–s2
    const linVis = c.p(0, 0.8, -0.8) * (1 - c.p(3, 0.6));
    this.linShapes.forEach((l) => l.setOpacity(linVis));
    this.linArrow.setOpacity(linVis);
    this.linLabel.set({ opacity: linVis });
    this.linNotes.forEach((h, i) => h.set({ opacity: c.p(1, 0.6, i * 2.0) * (1 - c.p(3, 0.6)) }));

    // ---- Blobs: from s3
    const blobVis = c.p(3, 0.8);
    const deform = c.over(3, 0.2, 0.95);
    this.disk.forEach((d) => {
      d.still.setPoints(d.pts.map((q) => this.leftPx(q[0], q[1])));
      d.still.setOpacity(blobVis * lerp(1, 0.6, deform));
      d.moving.setPoints(d.pts.map((q) => this.carry(q[0], q[1], deform)));
      d.moving.setOpacity(blobVis * smoothstep(0, 0.1, deform));
    });
    const u0 = this.circlePts.map((q) => this.leftPx(q[0], q[1]));
    const v0 = this.circlePts.map((q) => this.rightImg(q[0], q[1]));
    this.u0Fill.setPoints(u0);
    this.u0Fill.setOpacity(0.15 * blobVis);
    this.v0Fill.setPoints(v0);
    this.v0Fill.setOpacity(0.25 * c.p(9, 0.8) * (1 - c.p(10, 0.6)));
    this.v0Dashed.setPoints(v0);
    this.v0Dashed.setOpacity(c.p(9, 0.6) * (1 - c.p(10, 0.6)));
    const L = this.layout;
    this.x0Dot.setPosition(this.leftPx(X0[0], X0[1]));
    this.x0Dot.setOpacity(blobVis);
    this.fx0Dot.setPosition(this.rightImg(X0[0], X0[1]));
    this.fx0Dot.setOpacity(blobVis * smoothstep(0.8, 1, deform));
    const sc = L.s / 260;
    this.labels[0].set({ x: L.lx - 150 * sc, y: L.ly - 140 * sc, opacity: blobVis });
    this.labels[1].set({ x: L.rx + 175 * sc, y: L.ry - 150 * sc, opacity: blobVis * deform ** 4 });
    this.labels[2].set({ x: L.lx - 26, y: L.ly + 22, opacity: blobVis });
    this.labels[3].set({ x: L.rx + 44, y: L.ry + 24, opacity: blobVis * deform ** 4 });
    const fArrowVis = c.p(4, 0.6);
    this.arrowF.set(pxv(L.lx + 100 * sc, L.ly - 180 * sc), pxv(L.rx - 120 * sc, L.ry - 180 * sc), 0.4 * sc);
    this.arrowF.setProgress(c.p(4, 1.0), fArrowVis);
    this.labelF.set({ x: (L.lx + L.rx) / 2, y: L.ly - 235 * sc, opacity: fArrowVis });
    const gVis = Math.max(c.p(10, 0.6) * (1 - c.p(13, 0.6)), c.p(21, 0.6));
    this.arrowG.set(pxv(L.rx - 120 * sc, L.ly + 180 * sc), pxv(L.lx + 100 * sc, L.ly + 180 * sc), 0.4 * sc);
    this.arrowG.setProgress(Math.max(c.p(10, 1.0) * (1 - c.p(13, 0.6)), c.p(21, 1.0)), gVis);
    this.labelG.set({ x: (L.lx + L.rx) / 2, y: L.ly + 245 * sc, opacity: gVis });
    const pairVis = c.p(8, 0.6) * (1 - c.p(9, 0.6));
    this.pairPts.forEach((q, i) => {
      this.pairDots[i].setPosition(this.leftPx(q[0], q[1]));
      this.pairDots[i].setOpacity(pairVis);
      this.pairImages[i].setPosition(this.rightImg(q[0], q[1]));
      this.pairImages[i].setOpacity(pairVis * c.p(8, 0.6, 0.8));
    });
    this.pairNote.set({ x: L.rx, y: L.ry + 185, opacity: pairVis * c.p(8, 0.6, 1.2) });
    this.hitNote.set({ x: L.rx, y: L.ry + 185, opacity: c.p(9, 0.6, 0.8) * (1 - c.p(10, 0.6)) });

    // ---- Theorem: s5–s14
    const thmOut = 1 - c.p(15, 0.6);
    this.hyp.set({ opacity: c.p(6, 0.6) * thmOut });
    const conclAt = [8, 9, 10];
    this.concl.forEach((h, i) => {
      const at = c.s(conclAt[i]);
      h.set({ opacity: (t >= at ? Math.min(1, (t - at) / 0.5) : 0) * thmOut });
    });
    this.diffeo.set({ opacity: c.p(11, 0.6) * thmOut });
    this.ck.set({ opacity: c.p(12, 0.6) * thmOut });
    this.linearCase.setContent(this.linearTex(t >= c.s(14) ? 1 : 0));
    this.linearCase.set({ opacity: c.p(13, 0.6) * thmOut });

    // ---- Singular matrix: s15–s19
    const sqVis = c.p(15, 0.8, 0.6) * (1 - c.p(20, 0.6));
    const squash = c.over(16, 0.1, 0.8);
    this.squashFill.setPoints(this.squashDisk(squash));
    this.squashFill.setOpacity(0.18 * sqVis);
    this.squashEdge.setPoints(this.squashDisk(squash));
    this.squashEdge.setOpacity(sqVis);
    this.squashGrid.forEach((g, k) => {
      g.setPoints(this.squashChord((k - 2) / 2.5, squash));
      g.setOpacity(sqVis * (1 - smoothstep(0.85, 1, squash)));
    });
    this.squashMatrix.set({ opacity: sqVis });
    const mergeVis = sqVis * c.p(17, 0.5);
    const mergeS = c.over(17, 0.15, 0.7);
    this.mergeA.setPosition(pxv(700 + 150 * 0.3, 640 - 150 * 0.6 * (1 - mergeS)));
    this.mergeB.setPosition(pxv(700 + 150 * 0.3, 640 + 150 * 0.5 * (1 - mergeS)));
    this.mergeA.setOpacity(mergeVis);
    this.mergeB.setOpacity(mergeVis);
    this.mergeNote.set({ opacity: mergeVis * c.p(17, 0.5, 1.2) });
    this.missDot.setPosition(pxv(700 - 150 * 0.4, 640 - 150 * 0.55));
    this.missDot.setOpacity(sqVis * c.p(18, 0.5));
    this.missNote.set({ opacity: sqVis * c.p(18, 0.5, 0.6) });
    this.ruleOut.set({ opacity: sqVis * c.p(19, 0.6) });

    // ---- Derivative formula: s20–s26
    const fAt = [21, 22, 23];
    this.formula.forEach((h, i) => h.set({ opacity: c.p(fAt[i], 0.6) }));
    const pulse = t >= c.s(24) ? 0.75 + 0.25 * Math.cos((t - c.s(24)) * 5) : 1;
    this.caveat.set({ opacity: c.p(24, 0.5) * pulse });
    this.closing.set({ opacity: c.p(25, 0.6) });

    this.ledger.update(t, 1, true);
    this.road.update(c.p(0, 0.8, -0.8), 0);
  }

  teardown(_layers: SceneLayers): void {}
}
