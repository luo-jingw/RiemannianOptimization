import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { clamp01, lerp, smoothstep } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { seeded } from "../../primitives/Seeded";
import { Mat } from "./lib/Mat";
import { MatrixGrid } from "./lib/MatrixGrid";
import { FlatPixelSpace } from "./lib/PixelSpace";
import { PxArrow } from "./lib/PxArrow";
import { PxGroup } from "./lib/PxGroup";
import { Tex } from "./lib/Tex";

/**
 * E05 c07 — O(n): matrices as points, Sym ⊕ Skew, F(R) = RᵀR − I, DF(R)[H] = RᵀH + HᵀR, and why the codomain
 * must be Sym(n): with codomain R^{n×n} the differential is never onto.
 * Sentence indices refer to content/episodes/e05-tangent-orthogonal/story.en.json, scene c07-on-differential-codomain.
 */

const BLUE_FILL = "#1f3d66";
const YELLOW_FILL = "#5a4a12";
const GRAY_FILL = "#2a3146";
const A_MAT = [[2, -1, 3], [1, 0, -2], [5, 4, 1]];
const R3 = Mat.mul(Mat.rotZ(0.5), Mat.rotX(0.8));
const N_SAMPLES = 30;

export class OnDifferentialCodomainScene implements Scene {
  readonly id = "c07-on-differential-codomain";
  private stage!: StageLayer;
  private title!: FormulaHandle;
  private orthoNote!: FormulaHandle;
  private rGrid!: MatrixGrid;
  private rLabel!: FormulaHandle;
  private pointDot!: Dot;
  private pointLabel!: FormulaHandle;
  private frob!: FormulaHandle;
  private defs!: FormulaHandle;
  private aGrid!: MatrixGrid;
  private symGrid!: MatrixGrid;
  private skewGrid!: MatrixGrid;
  private gridTitles: FormulaHandle[] = [];
  private ops: FormulaHandle[] = [];
  private unique!: FormulaHandle;
  private directSum!: FormulaHandle;
  private countSym!: FormulaHandle;
  private countSkew!: FormulaHandle;
  private countTotal!: FormulaHandle;
  private fDef!: FormulaHandle;
  private rtrGrid!: MatrixGrid;
  private sameEq!: FormulaHandle;
  private symmetricNote!: FormulaHandle;
  private codomainNote!: FormulaHandle;
  private expansion!: FormulaHandle;
  private outGrid!: MatrixGrid;
  private outTitle!: FormulaHandle;
  private plane!: PxGroup;
  private planeAxes: PxArrow[] = [];
  private planeLabels: FormulaHandle[] = [];
  private sampleDots: Dot[] = [];
  private samples: { out: number[][]; x: number }[] = [];
  private target!: Dot;
  private targetLabel!: FormulaHandle;
  private trapNote!: FormulaHandle;
  private dimIneq!: FormulaHandle;
  private notRegular!: FormulaHandle;
  private claimNote!: FormulaHandle;
  private naive!: FormulaHandle;
  private strike!: Polyline;
  private disk!: PxGroup;
  private diskRim!: Polyline;
  private diskArrow!: PxArrow;
  private diskLabel!: FormulaHandle;
  private twice!: FormulaHandle;
  private fix!: FormulaHandle;
  private symCod!: MatrixGrid;
  private symCodLabel!: FormulaHandle;
  private lesson!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    const space = new FlatPixelSpace(stage);

    this.title = fl.add({ tex: "O(n)=\\{R\\in\\mathbb{R}^{n\\times n}:\\ R^{\\top}R=I\\}", x: 750, y: 100, size: 44 });
    this.orthoNote = fl.add({ text: "orthonormal columns: rotations and reflections", x: 750, y: 160, size: 28, color: Palette.muted });
    this.rGrid = new MatrixGrid(stage, fl, space, 3, 3, 96, 28);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) this.rGrid.setEntry(i, j, Mat.fmt(R3[i][j], 2));
    this.rLabel = fl.add({ tex: "R", x: 0, y: 0, size: 40 });
    this.pointDot = new Dot(stage, space.local(1060, 430), Palette.orange, 12, "2d");
    this.pointLabel = fl.add({ tex: "R\\in\\mathbb{R}^{3\\times3}\\cong\\mathbb{R}^9", x: 1060, y: 490, size: 34, color: Palette.orange });
    this.frob = fl.add({ tex: "\\langle A,B\\rangle=\\operatorname{tr}(A^{\\top}B)=\\sum_{i,j}A_{ij}B_{ij}", x: 750, y: 720, size: 38 });

    this.defs = fl.add({ tex: this.defsTex(1), x: 750, y: 100, size: 38 });
    this.aGrid = new MatrixGrid(stage, fl, space, 3, 3, 80, 30);
    this.symGrid = new MatrixGrid(stage, fl, space, 3, 3, 80, 30);
    this.skewGrid = new MatrixGrid(stage, fl, space, 3, 3, 80, 30);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        this.aGrid.setEntry(i, j, String(A_MAT[i][j]));
        this.symGrid.setEntry(i, j, Mat.fmt((A_MAT[i][j] + A_MAT[j][i]) / 2, 0));
        this.skewGrid.setEntry(i, j, Mat.fmt((A_MAT[i][j] - A_MAT[j][i]) / 2, 0));
      }
    }
    this.gridTitles = [
      fl.add({ tex: "A", x: 260, y: 270, size: 36 }),
      fl.add({ tex: "\\tfrac{A+A^{\\top}}{2}\\in\\mathrm{Sym}(3)", x: 680, y: 270, size: 34, color: Palette.blue }),
      fl.add({ tex: "\\tfrac{A-A^{\\top}}{2}\\in\\mathrm{Skew}(3)", x: 1100, y: 270, size: 34, color: Palette.yellow }),
    ];
    this.ops = [fl.add({ tex: "=", x: 470, y: 430, size: 48 }), fl.add({ tex: "+", x: 890, y: 430, size: 48 })];
    this.unique = fl.add({ tex: "A\\in\\mathrm{Sym}\\cap\\mathrm{Skew}:\\ A=A^{\\top}=-A\\ \\Rightarrow\\ A=0", x: 750, y: 640, size: 36 });
    this.directSum = fl.add({ tex: "\\mathbb{R}^{n\\times n}=\\mathrm{Sym}(n)\\oplus\\mathrm{Skew}(n)", x: 750, y: 720, size: 42, color: Palette.yellow, boxed: true });
    this.countSym = fl.add({ tex: "n+\\tfrac{n(n-1)}{2}=\\tfrac{n(n+1)}{2}=6", x: 680, y: 610, size: 34, color: Palette.blue });
    this.countSkew = fl.add({ tex: "\\tfrac{n(n-1)}{2}=3", x: 1100, y: 610, size: 34, color: Palette.yellow });
    this.countTotal = fl.add({ tex: "6+3=9=n^2", x: 750, y: 720, size: 40, boxed: true });

    this.fDef = fl.add({ tex: "F(R)=R^{\\top}R-I", x: 750, y: 100, size: 42 });
    this.rtrGrid = new MatrixGrid(stage, fl, space, 2, 2, 230, 28);
    this.rtrGrid.setEntry(0, 0, "r_{11}^2+r_{21}^2");
    this.rtrGrid.setEntry(0, 1, "r_{11}r_{12}+r_{21}r_{22}");
    this.rtrGrid.setEntry(1, 0, "r_{11}r_{12}+r_{21}r_{22}");
    this.rtrGrid.setEntry(1, 1, "r_{12}^2+r_{22}^2");
    this.sameEq = fl.add({ text: "same equation", x: 1110, y: 430, size: 32, color: Palette.orange });
    this.symmetricNote = fl.add({ tex: "(R^{\\top}R)^{\\top}=R^{\\top}R\\quad\\Rightarrow\\quad (i,j)\\ \\text{and}\\ (j,i)\\ \\text{give the same equation}", x: 750, y: 690, size: 32 });
    this.codomainNote = fl.add({ tex: "F:\\mathbb{R}^{n\\times n}\\to\\mathrm{Sym}(n),\\qquad O(n)=F^{-1}(0)", x: 750, y: 770, size: 36, color: Palette.yellow });
    this.expansion = fl.add({ tex: this.expansionTex(0), x: 750, y: 420, size: 36, display: true });

    // Wrong codomain
    this.outGrid = new MatrixGrid(stage, fl, space, 3, 3, 96, 26);
    this.outTitle = fl.add({ tex: "D\\tilde F(R)[H]\\in\\mathbb{R}^{3\\times3}", x: 330, y: 230, size: 34 });
    this.plane = new PxGroup(space);
    this.plane.place(980, 450, 1);
    const ax = new PxArrow(stage, this.plane, Palette.blue, 16, 4);
    ax.set(-280, 0, 300, 0);
    const ay = new PxArrow(stage, this.plane, Palette.yellow, 16, 4);
    ay.set(0, 200, 0, -210);
    this.planeAxes = [ax, ay];
    this.planeLabels = [
      fl.add({ tex: "\\mathrm{Sym}(3)", x: 980 + 300, y: 450 + 34, size: 30, color: Palette.blue }),
      fl.add({ tex: "\\mathrm{Skew}(3)", x: 980 + 70, y: 450 - 214, size: 30, color: Palette.yellow }),
    ];
    const rnd = seeded(77);
    for (let k = 0; k < N_SAMPLES; k++) {
      const H = [0, 1, 2].map(() => [0, 1, 2].map(() => 2 * rnd() - 1));
      const out = Mat.add(Mat.mul(Mat.transpose(R3), H), Mat.mul(Mat.transpose(H), R3));
      const x = (out[0][0] + out[1][1] + out[2][2] + out[0][1] + out[0][2] + out[1][2]) * 45;
      this.samples.push({ out, x: Math.max(-260, Math.min(260, x)) });
      const d = new Dot(stage, this.plane.v(0, 0, 0.02), Palette.blue, 6, "2d");
      this.plane.adopt(d.object);
      d.object.position.copy(this.plane.v(this.samples[k].x, 0, 0.02));
      this.sampleDots.push(d);
    }
    this.target = new Dot(stage, this.plane.v(90, -140, 0.02), Palette.red, 9, "2d");
    this.plane.adopt(this.target.object);
    this.targetLabel = fl.add({ tex: "\\text{skew target: unreachable}", x: 980 + 100, y: 450 - 175, size: 28, color: Palette.red, align: "left" });
    this.trapNote = fl.add({ tex: "\\operatorname{im}D\\tilde F(R)\\subseteq\\mathrm{Sym}(n)\\neq\\mathbb{R}^{n\\times n}:\\ \\text{never onto}", x: 750, y: 720, size: 34, color: Palette.red });
    this.dimIneq = fl.add({ tex: "\\dim\\mathrm{Sym}(n)=\\tfrac{n(n+1)}{2}<n^2\\quad(n\\ge2)", x: 750, y: 790, size: 34 });
    this.notRegular = fl.add({ tex: "0\\ \\text{is not a regular value of } \\tilde F:\\ \\text{the theorem does not apply}", x: 750, y: 100, size: 36, color: Palette.red });
    this.claimNote = fl.add({ text: "No conclusion from this formulation — this does not say O(n) is not a manifold.", x: 750, y: 160, size: 28, color: Palette.muted });

    this.naive = fl.add({ tex: "\\dim O(n)\\ \\overset{?}{=}\\ n^2-n^2=0", x: 480, y: 420, size: 48 });
    this.strike = new Polyline(stage, [space.local(250, 445), space.local(710, 395)], { color: Palette.red, width: 6 });
    this.disk = new PxGroup(space);
    this.disk.place(1060, 430, 1);
    const rim: ReturnType<PxGroup["v"]>[] = [];
    for (let i = 0; i <= 96; i++) rim.push(this.disk.v(150 * Math.cos((2 * Math.PI * i) / 96), 150 * Math.sin((2 * Math.PI * i) / 96)));
    this.diskRim = new Polyline(stage, rim, { color: Palette.blue, width: 4 });
    this.disk.adopt(this.diskRim.object);
    this.diskArrow = new PxArrow(stage, this.disk, Palette.orange, 20, 5);
    this.diskLabel = fl.add({ tex: "O(2)\\supset\\{R(\\theta)\\}:\\ \\text{a whole circle}", x: 1060, y: 640, size: 32, color: Palette.blue });
    this.twice = fl.add({ text: "the repeated equations (i, j) and (j, i) were counted twice", x: 750, y: 720, size: 30, color: Palette.orange });

    this.fix = fl.add({ tex: "F:\\mathbb{R}^{n\\times n}\\to\\mathrm{Sym}(n)", x: 750, y: 100, size: 44, boxed: true, color: Palette.green });
    this.symCod = new MatrixGrid(stage, fl, space, 3, 3, 90, 28);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) this.symCod.setEntry(i, j, i <= j ? `s_{${i + 1}${j + 1}}` : `s_{${j + 1}${i + 1}}`);
    this.symCodLabel = fl.add({ tex: "\\mathrm{Sym}(n)\\cong\\mathbb{R}^{n(n+1)/2}\\ \\ \\text{(upper triangle)}", x: 750, y: 640, size: 34, color: Palette.blue });
    this.lesson = fl.add({ text: "number of equations = number of independent conditions", x: 750, y: 720, size: 32, color: Palette.yellow });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "\\dim\\mathrm{Sym}(n)=\\tfrac{n(n+1)}{2}", at: cue.s(16) + 1.0 },
      { label: "2", tex: "\\dim\\mathrm{Skew}(n)=\\tfrac{n(n-1)}{2}", at: cue.s(16) + 1.8 },
      { label: "3", tex: "DF(R)[H]=R^{\\top}H+H^{\\top}R", at: cue.s(26) + 2.0 },
      { label: "4", tex: "F:\\mathbb{R}^{n\\times n}\\to\\mathrm{Sym}(n)", at: cue.s(39) + 1.5 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  private defsTex(n: number): string {
    return Tex.reveal([`${Tex.c(Palette.blue, "\\mathrm{Sym}(n)=\\{S:\\ S^{\\top}=S\\}")}`, `\\qquad ${Tex.c(Palette.yellow, "\\mathrm{Skew}(n)=\\{\\Omega:\\ \\Omega^{\\top}=-\\Omega\\}")}`], n);
  }

  private expansionTex(n: number): string {
    return Tex.revealLines([
      "F(R+tH)&=(R+tH)^{\\top}(R+tH)-I",
      `&=R^{\\top}R-I+t\\,${Tex.c(Palette.orange, "\\boxed{R^{\\top}H+H^{\\top}R}")}+t^2H^{\\top}H`,
      `DF(R)[H]&=\\tfrac{d}{dt}F(R+tH)\\big|_{t=0}=${Tex.c(Palette.yellow, "R^{\\top}H+H^{\\top}R")}`,
      "(R^{\\top}H+H^{\\top}R)^{\\top}&=H^{\\top}R+R^{\\top}H\\ \\in\\ \\mathrm{Sym}(n)",
    ], n);
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    FlatPixelSpace.view(this.stage);

    // ---- Phase A (s0–s4)
    const phaseA = 1 - c.p(5, 0.6);
    this.title.set({ opacity: c.p(0, 0.8, -1.0) * phaseA });
    this.orthoNote.set({ opacity: c.p(2, 0.6) * phaseA });
    const fly = c.over(3, 0.45, 0.95);
    this.rGrid.place(lerp(480, 1060, fly), 430, lerp(1, 0.08, fly));
    this.rGrid.draw(c.p(1, 0.8) * phaseA * (1 - smoothstep(0.85, 1, fly)), c.p(1, 0.8) * phaseA * (1 - smoothstep(0.3, 0.6, fly)));
    const rf = this.rGrid.grp.toFrame(-170, 0);
    this.rLabel.set({ x: rf.x - 20, y: rf.y, opacity: c.p(1, 0.8) * phaseA * (1 - smoothstep(0.2, 0.5, fly)) });
    this.pointDot.setOpacity(smoothstep(0.8, 1, fly) * phaseA);
    this.pointLabel.set({ opacity: smoothstep(0.85, 1, fly) * phaseA });
    this.frob.set({ opacity: c.p(4, 0.6) * phaseA });

    // ---- Phase B/C (s5–s16)
    const phaseB = c.p(5, 0.6) * (1 - c.p(17, 0.6));
    this.defs.setContent(this.defsTex(t >= c.s(6) ? 2 : 1));
    this.defs.set({ opacity: phaseB });
    const split = c.over(8, 0.1, 0.8);
    this.aGrid.place(260, 430, 1);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) this.aGrid.setFill(i, j, GRAY_FILL, 0.9);
    this.aGrid.draw(c.p(7, 0.6) * phaseB);
    this.symGrid.place(lerp(260, 680, split), 430, 1);
    this.skewGrid.place(lerp(260, 1100, split), 430, 1);
    const counting = c.p(13, 0.5);
    const countSkewOn = c.p(15, 0.5);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const upper = i <= j;
        this.symGrid.setFill(i, j, BLUE_FILL, lerp(0.9, upper ? 1.0 : 0.25, counting));
        this.symGrid.setEntry(i, j, Mat.fmt((A_MAT[i][j] + A_MAT[j][i]) / 2, 0), upper || counting < 0.5 ? Palette.text : Palette.muted);
        const strict = i < j;
        const diag = i === j;
        this.skewGrid.setFill(i, j, diag && countSkewOn > 0.5 ? GRAY_FILL : YELLOW_FILL, lerp(0.9, strict ? 1.0 : 0.25, countSkewOn));
        this.skewGrid.setEntry(i, j, Mat.fmt((A_MAT[i][j] - A_MAT[j][i]) / 2, 0), strict || countSkewOn < 0.5 ? Palette.text : Palette.muted);
      }
    }
    const splitVis = (split > 0.001 ? 1 : 0) * phaseB;
    this.symGrid.draw(splitVis);
    this.skewGrid.draw(splitVis);
    this.gridTitles[0].set({ opacity: c.p(7, 0.6) * phaseB });
    this.gridTitles[1].set({ opacity: smoothstep(0.7, 1, split) * phaseB });
    this.gridTitles[2].set({ opacity: smoothstep(0.7, 1, split) * phaseB });
    const flashSum = t >= c.s(9) && t < c.e(9) ? 0.6 + 0.4 * Math.cos((t - c.s(9)) * 2 * Math.PI / 0.9) : 1;
    this.ops.forEach((o) => o.set({ opacity: smoothstep(0.8, 1, split) * phaseB, scale: 2 - flashSum }));
    this.unique.set({ opacity: c.p(10, 0.6) * (1 - c.p(12, 0.5)) });
    this.directSum.set({ opacity: c.p(11, 0.6) * (1 - c.p(12, 0.5)) });
    this.countSym.set({ opacity: c.p(14, 0.6) * phaseB });
    this.countSkew.set({ opacity: c.p(15, 0.6, 1.2) * phaseB });
    this.countTotal.set({ opacity: c.p(16, 0.6) * phaseB });

    // ---- Phase D (s17–s22)
    const phaseD = c.p(17, 0.6) * (1 - c.p(23, 0.6));
    this.fDef.set({ opacity: phaseD });
    this.rtrGrid.place(560, 400, 1);
    const flashA = t >= c.s(19) && t < c.e(20) ? 1 : 0;
    const flashB = t >= c.s(20) && t < c.s(23) ? 1 : 0;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) this.rtrGrid.setFill(i, j, GRAY_FILL, 0.9);
    this.rtrGrid.setFill(0, 1, flashA ? "#7a4a14" : GRAY_FILL, 0.95);
    this.rtrGrid.setFill(1, 0, flashB ? "#7a4a14" : GRAY_FILL, 0.95);
    this.rtrGrid.draw(c.p(18, 0.6) * phaseD);
    this.sameEq.set({ opacity: c.p(20, 0.6, 0.6) * phaseD });
    this.symmetricNote.set({ opacity: c.p(21, 0.6) * phaseD });
    this.codomainNote.set({ opacity: c.p(22, 0.6) * phaseD });

    // ---- Phase E (s23–s27)
    const en = t >= c.s(27) ? 4 : t >= c.s(26) ? 3 : t >= c.s(25) ? 2 : t >= c.s(24) ? 1 : 0;
    this.expansion.setContent(this.expansionTex(en));
    this.expansion.set({ opacity: (en > 0 ? 1 : 0) * (1 - c.p(28, 0.6)) });

    // ---- Phase F (s28–s33): wrong codomain
    const phaseF = c.p(29, 0.6) * (1 - c.p(34, 0.6));
    const fed = c.over(30, 0.05, 0.95);
    const shown = t < c.s(30) ? 0 : Math.min(N_SAMPLES, 1 + Math.floor(fed * N_SAMPLES));
    const cur = this.samples[Math.max(0, shown - 1)].out;
    this.outGrid.place(330, 450, 1);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        this.outGrid.setFill(i, j, i === j ? BLUE_FILL : "#28507f", 0.95);
        this.outGrid.setEntry(i, j, shown > 0 ? Mat.fmt(cur[i][j], 2) : "\\ast");
      }
    }
    this.outGrid.draw(phaseF);
    this.outTitle.set({ opacity: phaseF });
    this.planeAxes.forEach((a) => a.setOpacity(phaseF));
    this.planeLabels.forEach((l) => l.set({ opacity: phaseF }));
    this.sampleDots.forEach((d, k) => d.setOpacity(k < shown ? phaseF : 0));
    this.target.setOpacity(c.p(31, 0.6) * phaseF);
    this.targetLabel.set({ opacity: c.p(31, 0.6) * phaseF });
    this.trapNote.set({ opacity: c.p(30, 0.6, 2.0) * phaseF });
    this.dimIneq.set({ opacity: c.p(31, 0.6) * phaseF });
    this.notRegular.set({ opacity: c.p(32, 0.6) * phaseF });
    this.claimNote.set({ opacity: c.p(33, 0.6) * phaseF });

    // ---- Phase G (s34–s36): naive count
    const phaseG = c.p(34, 0.6) * (1 - c.p(37, 0.6));
    this.naive.set({ opacity: phaseG });
    const strike = c.over(35, 0.5, 0.9);
    this.strike.setProgress(strike);
    this.strike.setOpacity(phaseG * (strike > 0.01 ? 1 : 0));
    const theta = (t - c.s(35)) * 1.2;
    this.diskRim.setOpacity(c.p(35, 0.6) * phaseG);
    this.diskArrow.set(0, 0, 150 * Math.cos(theta), -150 * Math.sin(theta));
    this.diskArrow.setOpacity(c.p(35, 0.6) * phaseG);
    this.diskLabel.set({ opacity: c.p(35, 0.6) * phaseG });
    this.twice.set({ opacity: c.p(36, 0.6) * phaseG });

    // ---- Phase H (s37–s41): the right codomain
    const phaseH = c.p(37, 0.6);
    this.fix.set({ opacity: phaseH });
    this.symCod.place(750, 400, 1);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const upper = i <= j;
        this.symCod.setFill(i, j, BLUE_FILL, upper ? 1 : lerp(1, 0.25, c.p(38, 0.6)));
        this.symCod.setEntry(i, j, i <= j ? `s_{${i + 1}${j + 1}}` : `s_{${j + 1}${i + 1}}`, upper ? Palette.text : Palette.muted);
      }
    }
    this.symCod.draw(phaseH);
    this.symCodLabel.set({ opacity: c.p(38, 0.6) });
    this.lesson.set({ opacity: c.p(40, 0.6) });

    this.ledger.update(t, clamp01(c.p(16, 0.5, 1.5)));
  }

  teardown(_layers: SceneLayers): void {}
}
