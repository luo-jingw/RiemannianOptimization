import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Cues } from "../../primitives/Cues";
import { clamp01, lerp, smoothstep } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Region } from "../../primitives/Region";
import { Mat } from "./lib/Mat";
import { MatrixGrid } from "./lib/MatrixGrid";
import { FlatPixelSpace } from "./lib/PixelSpace";
import { PxArrow } from "./lib/PxArrow";
import { PxGroup } from "./lib/PxGroup";
import { Tex } from "./lib/Tex";

/**
 * E05 c08 — DF(R) is onto Sym(n) (H = ½RS), so O(n) is an embedded submanifold of dimension n(n−1)/2.
 * Sentence indices refer to content/episodes/e05-tangent-orthogonal/story.en.json, scene c08-on-surjective-dimension.
 */

const BLUE_FILL = "#1f3d66";
const GRAY_FILL = "#2a3146";
const THETA = 0.7;
const R2 = Mat.rot2(THETA);
const S2 = [[1, 0], [0, 0]];
const H2 = Mat.scale(Mat.mul(R2, S2), 0.5);
const OUT2 = Mat.add(Mat.mul(Mat.transpose(R2), H2), Mat.mul(Mat.transpose(H2), R2));
const MAX_ERR = Math.max(...OUT2.flatMap((row, i) => row.map((v, j) => Math.abs(v - S2[i][j]))));
const BAR_UNIT = 38;

export class OnSurjectiveDimensionScene implements Scene {
  readonly id = "c08-on-surjective-dimension";
  private stage!: StageLayer;
  private goal!: FormulaHandle;
  private equation!: FormulaHandle;
  private sGrid!: MatrixGrid;
  private halfA!: MatrixGrid;
  private halfB!: MatrixGrid;
  private halfLabels: FormulaHandle[] = [];
  private splitTex!: FormulaHandle;
  private inverseTex!: FormulaHandle;
  private solveTex!: FormulaHandle;
  private verify!: FormulaHandle;
  private manifoldTex!: FormulaHandle;
  private noteLevel!: FormulaHandle;
  private noteCodomain!: FormulaHandle;
  private numGrids: MatrixGrid[] = [];
  private numLabels: FormulaHandle[] = [];
  private errTex!: FormulaHandle;
  private bars!: PxGroup;
  private barTotal!: Region;
  private barSym!: Region;
  private barDim!: Region;
  private barLabels: FormulaHandle[] = [];
  private dimFormula!: FormulaHandle;
  private dimList!: FormulaHandle;
  private frame!: PxGroup;
  private frameAxes: PxArrow[] = [];
  private circle!: Polyline;
  private frameLabel!: FormulaHandle;
  private so3Note!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    const space = new FlatPixelSpace(stage);

    this.goal = fl.add({ tex: "\\text{Goal: } DF(R):\\mathbb{R}^{n\\times n}\\to\\mathrm{Sym}(n)\\ \\text{onto for every } R\\in O(n)", x: 750, y: 100, size: 36 });
    this.equation = fl.add({ tex: "R^{\\top}H+H^{\\top}R=S,\\qquad S^{\\top}=S", x: 750, y: 180, size: 40, boxed: true });
    this.sGrid = new MatrixGrid(stage, fl, space, 2, 2, 110, 34);
    this.halfA = new MatrixGrid(stage, fl, space, 2, 2, 110, 30);
    this.halfB = new MatrixGrid(stage, fl, space, 2, 2, 110, 30);
    const sEntries = [["s_{11}", "s_{12}"], ["s_{12}", "s_{22}"]];
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        this.sGrid.setEntry(i, j, sEntries[i][j]);
        this.halfA.setEntry(i, j, `\\tfrac{${sEntries[i][j]}}{2}`);
        this.halfB.setEntry(i, j, `\\tfrac{${sEntries[i][j]}}{2}`);
        this.sGrid.setFill(i, j, BLUE_FILL, 0.95);
        this.halfA.setFill(i, j, BLUE_FILL, 0.6);
        this.halfB.setFill(i, j, BLUE_FILL, 0.6);
      }
    }
    this.halfLabels = [
      fl.add({ tex: "S", x: 0, y: 0, size: 38, color: Palette.blue }),
      fl.add({ tex: "R^{\\top}H\\overset{!}{=}\\tfrac{S}{2}", x: 0, y: 0, size: 32, color: Palette.orange }),
      fl.add({ tex: "H^{\\top}R=(R^{\\top}H)^{\\top}=\\tfrac{S}{2}", x: 0, y: 0, size: 32, color: Palette.orange }),
    ];
    this.splitTex = fl.add({ tex: "S=\\tfrac{S}{2}+\\big(\\tfrac{S}{2}\\big)^{\\top}", x: 750, y: 650, size: 38 });
    this.inverseTex = fl.add({ tex: "R^{\\top}R=I\\ \\Rightarrow\\ R^{-1}=R^{\\top}\\ \\Rightarrow\\ RR^{\\top}=I", x: 750, y: 650, size: 36 });
    this.solveTex = fl.add({ tex: "R^{\\top}H=\\tfrac{S}{2}\\ \\xRightarrow{\\ R\\,\\cdot\\ }\\ H=\\tfrac12\\,RS", x: 750, y: 740, size: 40, boxed: true, color: Palette.yellow });
    this.verify = fl.add({ tex: this.verifyTex(0), x: 720, y: 420, size: 36, display: true });
    this.manifoldTex = fl.add({ tex: "O(n)\\ \\text{is a smooth embedded submanifold of } \\mathbb{R}^{n\\times n}", x: 720, y: 640, size: 34, color: Palette.green });
    this.noteLevel = fl.add({ tex: "\\text{both checks used } R^{\\top}R=I:\\ \\text{surjectivity is needed only on } F^{-1}(0)", x: 720, y: 720, size: 30, color: Palette.muted });
    this.noteCodomain = fl.add({ tex: "\\text{codomain } \\mathbb{R}^{n\\times n}:\\ \\text{skew targets unreachable}\\Rightarrow\\text{argument needs } \\mathrm{Sym}(n)", x: 720, y: 790, size: 30, color: Palette.red });

    const tex2 = (m: number[][]): string[][] => m.map((row) => row.map((v) => Mat.fmt(v, 3)));
    const mats = [tex2(R2), tex2(H2), tex2(OUT2), tex2(S2)];
    const names = ["R=R(0.7)", "H=\\tfrac12RS", "R^{\\top}H+H^{\\top}R", "S"];
    for (let k = 0; k < 4; k++) {
      const g = new MatrixGrid(stage, fl, space, 2, 2, 100, 26);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) g.setEntry(i, j, mats[k][i][j]);
      this.numGrids.push(g);
      this.numLabels.push(fl.add({ tex: names[k], x: 0, y: 0, size: 30, color: k === 2 ? Palette.yellow : Palette.text }));
    }
    this.errTex = fl.add({ tex: `\\max_{ij}\\big|(R^{\\top}H+H^{\\top}R-S)_{ij}\\big|=${MAX_ERR.toFixed(3)}`, x: 750, y: 640, size: 36, color: Palette.green });

    this.bars = new PxGroup(space);
    this.bars.place(150, 420, 1);
    const rect = (): THREE.Vector3[] => [this.bars.v(0, 0), this.bars.v(1, 0), this.bars.v(1, 1), this.bars.v(0, 1)];
    this.barTotal = new Region(stage, rect(), GRAY_FILL, 1, 0);
    this.barSym = new Region(stage, rect(), BLUE_FILL, 1, 0);
    this.barDim = new Region(stage, rect(), "#2f7a3f", 1, 0);
    [this.barTotal, this.barSym, this.barDim].forEach((r) => this.bars.adopt(r.object));
    this.barLabels = [
      fl.add({ tex: "n^2", x: 0, y: 0, size: 30 }),
      fl.add({ tex: "\\tfrac{n(n+1)}{2}", x: 0, y: 0, size: 30, color: Palette.blue }),
      fl.add({ tex: "\\tfrac{n(n-1)}{2}", x: 0, y: 0, size: 30, color: Palette.green }),
      fl.add({ tex: "n=3", x: 0, y: 0, size: 40, color: Palette.yellow }),
    ];
    this.dimFormula = fl.add({ tex: "\\dim O(n)=\\dim\\mathbb{R}^{n\\times n}-\\dim\\mathrm{Sym}(n)=n^2-\\tfrac{n(n+1)}{2}=\\tfrac{n(n-1)}{2}", x: 750, y: 140, size: 34 });
    this.dimList = fl.add({ tex: "n=2:\\ 1\\qquad n=3:\\ 3\\qquad n=4:\\ 6", x: 750, y: 720, size: 36, color: Palette.green });

    this.frame = new PxGroup(space);
    this.frame.place(560, 450, 1);
    const circ: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) circ.push(this.frame.v(180 * Math.cos((2 * Math.PI * i) / 120), 180 * Math.sin((2 * Math.PI * i) / 120)));
    this.circle = new Polyline(stage, circ, { color: Palette.blue, width: 3 });
    this.frame.adopt(this.circle.object);
    this.frameAxes = [new PxArrow(stage, this.frame, Palette.red, 22, 6), new PxArrow(stage, this.frame, Palette.green, 22, 6)];
    this.frameLabel = fl.add({ tex: "\\text{rotations } R(\\theta)\\subset O(2):\\ \\text{one parameter } \\theta", x: 560, y: 700, size: 34, color: Palette.blue });
    this.so3Note = fl.add({ tex: "n=3:\\ \\dim=3\\ \\ \\text{(three ways to rotate)}", x: 1100, y: 450, size: 32, color: Palette.text });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "R^{-1}=R^{\\top},\\ RR^{\\top}=I", at: cue.s(5) + 2.0 },
      { label: "2", tex: "DF(R)\\ \\text{onto}\\Rightarrow 0\\ \\text{regular}", at: cue.s(12) + 1.5 },
      { label: "3", tex: "\\dim O(n)=\\tfrac{n(n-1)}{2}", at: cue.s(21) + 2.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  private verifyTex(n: number): string {
    const used = (s: string): string => `\\quad${Tex.c(Palette.green, `(${s})`)}`;
    return Tex.revealLines([
      `R^{\\top}H&=\\tfrac12R^{\\top}RS=\\tfrac12S${used("R^\\top R=I")}`,
      `H^{\\top}R&=\\tfrac12S^{\\top}R^{\\top}R=\\tfrac12S^{\\top}=\\tfrac12S${used("R^\\top R=I,\\ S^\\top=S")}`,
      `DF(R)[H]&=\\tfrac12S+\\tfrac12S=${Tex.c(Palette.yellow, "S")}`,
    ], n);
  }

  private setBar(r: Region, x0: number, w: number, y: number, h: number): void {
    r.setPoints([this.bars.v(x0, y), this.bars.v(x0 + w, y), this.bars.v(x0 + w, y + h), this.bars.v(x0, y + h)]);
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    FlatPixelSpace.view(this.stage);

    // ---- Setup and guess (s0–s6)
    const phaseA = 1 - c.p(7, 0.6);
    this.goal.set({ opacity: c.p(0, 0.8, -1.0) * (1 - c.p(1, 0.6)) });
    this.equation.set({ opacity: c.p(1, 0.6) * phaseA });
    const split = c.over(3, 0.1, 0.7);
    this.sGrid.place(750, 420, 1);
    this.sGrid.draw(c.p(1, 0.6, 0.6) * phaseA * (1 - smoothstep(0, 0.4, split)));
    this.halfA.place(lerp(750, 470, split), 420, 1);
    this.halfB.place(lerp(750, 1030, split), 420, 1);
    const halves = (split > 0.001 ? 1 : 0) * phaseA;
    this.halfA.draw(halves);
    this.halfB.draw(halves);
    const sf = this.sGrid.grp.toFrame(0, -150);
    this.halfLabels[0].set({ x: sf.x, y: sf.y, opacity: c.p(1, 0.6, 0.6) * phaseA * (1 - smoothstep(0, 0.4, split)) });
    const la = this.halfA.grp.toFrame(0, -150);
    const lb = this.halfB.grp.toFrame(0, -150);
    this.halfLabels[1].set({ x: la.x, y: la.y, opacity: c.p(4, 0.6) * phaseA });
    this.halfLabels[2].set({ x: lb.x, y: lb.y, opacity: c.p(4, 0.6, 1.0) * phaseA });
    this.splitTex.set({ opacity: c.p(3, 0.6) * (1 - c.p(5, 0.5)) });
    this.inverseTex.set({ opacity: c.p(5, 0.6) * phaseA });
    this.solveTex.set({ opacity: c.p(6, 0.6) * (1 - c.p(14, 0.6)) });
    this.solveTex.set({ y: lerp(740, 200, c.p(7, 0.8)) });

    // ---- Verification and consequences (s7–s16)
    const vn = t >= c.s(10) ? 3 : t >= c.s(9) ? 2 : t >= c.s(8) ? 1 : 0;
    this.verify.setContent(this.verifyTex(vn));
    this.verify.set({ opacity: (vn > 0 ? 1 : 0) * (1 - c.p(17, 0.6)) });
    this.manifoldTex.set({ opacity: c.p(13, 0.6) * (1 - c.p(17, 0.6)) });
    this.noteLevel.set({ opacity: c.p(14, 0.6) * (1 - c.p(17, 0.6)) });
    this.noteCodomain.set({ opacity: c.p(16, 0.6) * (1 - c.p(17, 0.6)) });

    // ---- Numeric check (s17–s18)
    const phaseN = c.p(17, 0.6) * (1 - c.p(19, 0.6));
    const xs = [190, 500, 840, 1170];
    this.numGrids.forEach((g, k) => {
      g.place(xs[k], 420, 1);
      const show = k < 2 ? phaseN : k === 2 ? c.p(18, 0.6, 0.6) * (1 - c.p(19, 0.6)) : phaseN;
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) g.setFill(i, j, k === 3 ? BLUE_FILL : GRAY_FILL, 0.95);
      g.draw(show);
      const f = g.grp.toFrame(0, -140);
      this.numLabels[k].set({ x: f.x, y: f.y, opacity: show });
    });
    this.errTex.set({ opacity: c.p(18, 0.6, 2.0) * (1 - c.p(19, 0.6)) });

    // ---- Dimension (s19–s22)
    const phaseD = c.p(19, 0.6) * (1 - c.p(23, 0.6));
    const nVal = t < c.s(22) ? 3 : t < c.in(22, 0.33) ? 2 : t < c.in(22, 0.66) ? 3 : 4;
    const total = nVal * nVal;
    const sym = (nVal * (nVal + 1)) / 2;
    const dim = (nVal * (nVal - 1)) / 2;
    this.setBar(this.barTotal, 0, total * BAR_UNIT, -70, 50);
    this.setBar(this.barSym, 0, sym * BAR_UNIT, 10, 50);
    this.setBar(this.barDim, sym * BAR_UNIT, dim * BAR_UNIT, 10, 50);
    this.barTotal.setOpacity(phaseD);
    this.barSym.setOpacity(phaseD * c.p(20, 0.6));
    this.barDim.setOpacity(phaseD * c.p(21, 0.6));
    const bt = this.bars.toFrame(total * BAR_UNIT / 2, -45);
    const bs = this.bars.toFrame(sym * BAR_UNIT / 2, 95);
    const bd = this.bars.toFrame(sym * BAR_UNIT + dim * BAR_UNIT / 2, 35);
    this.barLabels[0].setContent(`n^2=${total}`);
    this.barLabels[1].setContent(`\\tfrac{n(n+1)}{2}=${sym}`);
    this.barLabels[2].setContent(`${dim}`);
    this.barLabels[3].setContent(`n=${nVal}`);
    this.barLabels[0].set({ x: bt.x, y: bt.y, opacity: phaseD });
    this.barLabels[1].set({ x: bs.x, y: bs.y, opacity: phaseD * c.p(20, 0.6) });
    this.barLabels[2].set({ x: bd.x, y: bd.y, opacity: phaseD * c.p(21, 0.6) });
    this.barLabels[3].set({ x: 150, y: 290, opacity: phaseD, color: Palette.yellow });
    this.dimFormula.set({ opacity: c.p(20, 0.6) * phaseD });
    this.dimList.set({ opacity: c.p(22, 0.6) * phaseD });

    // ---- n = 2: a circle of rotations (s23–s26)
    const phaseC = c.p(23, 0.6);
    const theta = 2 * Math.PI * c.over(24, 0.05, 0.95) + 0.3 * smoothstep(c.s(23), c.s(24), t);
    this.circle.setProgress(t < c.s(24) ? 0 : c.over(24, 0.05, 0.95));
    this.circle.setOpacity(phaseC);
    this.frameAxes[0].set(0, 0, 180 * Math.cos(theta), -180 * Math.sin(theta));
    this.frameAxes[1].set(0, 0, -180 * Math.sin(theta), -180 * Math.cos(theta));
    this.frameAxes.forEach((a) => a.setOpacity(phaseC));
    this.frameLabel.set({ opacity: phaseC });
    this.so3Note.set({ opacity: c.p(25, 0.6) });

    this.ledger.update(t, clamp01(c.p(5, 0.5, 2.0)));
  }

  teardown(_layers: SceneLayers): void {}
}
