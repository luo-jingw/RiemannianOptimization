import type * as THREE from "three";
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
import { MatrixGrid } from "./lib/MatrixGrid";
import { FlatPixelSpace } from "./lib/PixelSpace";
import { PxArrow } from "./lib/PxArrow";
import { PxGroup } from "./lib/PxGroup";
import { Tex } from "./lib/Tex";

/**
 * E05 c09 — T_R O(n) = ker DF(R) = R·Skew(n): both inclusions, the n = 2 derivative, Ωx ⊥ x,
 * and the contrast with a symmetric part (stretching).
 * Sentence indices refer to content/episodes/e05-tangent-orthogonal/story.en.json, scene c09-on-tangent.
 */

const YELLOW_FILL = "#5a4a12";
const GRAY_FILL = "#2a3146";
const N_POINTS = 12;
const S_MAT = [[0.6, 0.3], [0.3, -0.25]];
const RADIUS = 150;

export class OnTangentScene implements Scene {
  readonly id = "c09-on-tangent";
  private stage!: StageLayer;
  private kernelTex!: FormulaHandle;
  private derive!: FormulaHandle;
  private omegaGrid!: MatrixGrid;
  private omegaLabel!: FormulaHandle;
  private converse!: FormulaHandle;
  private resultTex!: FormulaHandle;
  private identityNote!: FormulaHandle;
  private dimNote!: FormulaHandle;
  private frame!: PxGroup;
  private frameCircle!: Polyline;
  private axes: PxArrow[] = [];
  private tipVels: PxArrow[] = [];
  private n2Tex!: FormulaHandle;
  private left!: PxGroup;
  private right!: PxGroup;
  private leftCircle!: Polyline;
  private rightCurve!: Polyline;
  private leftDots: Dot[] = [];
  private rightDots: Dot[] = [];
  private leftArrows: PxArrow[] = [];
  private rightArrows: PxArrow[] = [];
  private skewProof!: FormulaHandle;
  private symTex!: FormulaHandle;
  private captionL!: FormulaHandle;
  private captionR!: FormulaHandle;
  private squareNote!: FormulaHandle;
  private summary!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    const space = new FlatPixelSpace(stage);

    this.kernelTex = fl.add({ tex: "T_RO(n)=\\ker DF(R)=\\{H:\\ R^{\\top}H+H^{\\top}R=0\\}", x: 750, y: 100, size: 40 });
    this.derive = fl.add({ tex: this.deriveTex(0), x: 520, y: 420, size: 36, display: true });
    this.omegaGrid = new MatrixGrid(stage, fl, space, 3, 3, 92, 30);
    this.omegaLabel = fl.add({ tex: "\\Omega\\in\\mathrm{Skew}(3)", x: 1110, y: 250, size: 34, color: Palette.yellow });
    this.converse = fl.add({ tex: "H=R\\Omega:\\quad R^{\\top}R\\Omega+\\Omega^{\\top}R^{\\top}R=\\Omega+\\Omega^{\\top}=0\\ \\ \\checkmark", x: 750, y: 690, size: 34 });
    this.resultTex = fl.add({ tex: "T_RO(n)=R\\cdot\\mathrm{Skew}(n)", x: 750, y: 780, size: 42, boxed: true, color: Palette.yellow });
    this.identityNote = fl.add({ tex: "T_IO(n)=\\mathrm{Skew}(n),\\qquad T_RO(n)=R\\cdot T_IO(n)", x: 750, y: 300, size: 38 });
    this.dimNote = fl.add({ tex: "\\Omega\\mapsto R\\Omega\\ \\text{injective}\\ \\Rightarrow\\ \\dim=\\tfrac{n(n-1)}{2}\\ \\ \\textcolor{#69db7c}{\\checkmark\\ \\text{matches the level-set count}}", x: 750, y: 420, size: 34 });

    // n = 2 rotating frame
    this.frame = new PxGroup(space);
    this.frame.place(380, 470, 1);
    this.frameCircle = new Polyline(stage, this.circlePts(this.frame, 170), { color: Palette.grid, width: 2 });
    this.frame.adopt(this.frameCircle.object);
    this.axes = [new PxArrow(stage, this.frame, Palette.red, 20, 6), new PxArrow(stage, this.frame, Palette.green, 20, 6)];
    this.tipVels = [new PxArrow(stage, this.frame, Palette.orange, 18, 5), new PxArrow(stage, this.frame, Palette.orange, 18, 5)];
    this.n2Tex = fl.add({ tex: this.n2Formula(0), x: 960, y: 450, size: 32, display: true });

    // Rotation vs stretching
    this.left = new PxGroup(space);
    this.left.place(320, 470, 1);
    this.right = new PxGroup(space);
    this.right.place(1050, 470, 1);
    this.leftCircle = new Polyline(stage, this.circlePts(this.left, RADIUS), { color: Palette.blue, width: 3 });
    this.left.adopt(this.leftCircle.object);
    this.rightCurve = new Polyline(stage, this.circlePts(this.right, RADIUS), { color: Palette.blue, width: 3 });
    this.right.adopt(this.rightCurve.object);
    for (let k = 0; k < N_POINTS; k++) {
      const dl = new Dot(stage, this.left.v(0, 0, 0.02), Palette.text, 6, "2d");
      this.left.adopt(dl.object);
      this.leftDots.push(dl);
      const dr = new Dot(stage, this.right.v(0, 0, 0.02), Palette.text, 6, "2d");
      this.right.adopt(dr.object);
      this.rightDots.push(dr);
      this.leftArrows.push(new PxArrow(stage, this.left, Palette.orange, 14, 3.5));
      this.rightArrows.push(new PxArrow(stage, this.right, Palette.red, 14, 3.5));
    }
    this.skewProof = fl.add({ tex: this.skewProofTex(0), x: 960, y: 450, size: 34, display: true });
    this.symTex = fl.add({ tex: "\\|(I+tS)x\\|^2=\\|x\\|^2+2t\\,x^{\\top}Sx+O(t^2)", x: 690, y: 150, size: 36 });
    this.captionL = fl.add({ tex: "\\Omega\\ \\text{skew: pure rotation}", x: 320, y: 690, size: 32, color: Palette.orange });
    this.captionR = fl.add({ tex: "S\\ \\text{symmetric: stretching, leaves } O(n)", x: 1050, y: 690, size: 32, color: Palette.red });
    this.squareNote = fl.add({ tex: "H=RR^{\\top}H\\ \\text{uses } RR^{\\top}=I\\ \\ (R\\ \\text{square})", x: 750, y: 790, size: 32, color: Palette.muted });
    this.summary = fl.add({ tex: "T_RO(n)=\\{R\\Omega:\\ \\Omega^{\\top}=-\\Omega\\}\\quad\\text{(}R\\ \\text{times infinitesimal rotations)}", x: 750, y: 440, size: 36, boxed: true, color: Palette.yellow });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "T_RO(n)=\\ker DF(R)", at: cue.s(1) + 2.0 },
      { label: "2", tex: "T_RO(n)=R\\cdot\\mathrm{Skew}(n)\\ \\ \\blacksquare", at: cue.s(10) + 2.5 },
      { label: "3", tex: "\\dim=\\tfrac{n(n-1)}{2}\\ \\checkmark", at: cue.s(13) + 0.8 },
      { label: "4", tex: "\\Omega x\\perp x", at: cue.s(24) + 2.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  private circlePts(g: PxGroup, r: number): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) pts.push(g.v(r * Math.cos((2 * Math.PI * i) / 120), r * Math.sin((2 * Math.PI * i) / 120)));
    return pts;
  }

  private deriveTex(n: number): string {
    return Tex.revealLines([
      "&\\Omega:=R^{\\top}H",
      "&\\Omega^{\\top}=H^{\\top}R\\ \\Rightarrow\\ \\Omega+\\Omega^{\\top}=0",
      `&\\Rightarrow\\ ${Tex.c(Palette.yellow, "\\Omega\\in\\mathrm{Skew}(n)")}`,
      `&H=RR^{\\top}H=${Tex.c(Palette.yellow, "R\\Omega")}`,
    ], n);
  }

  private n2Formula(n: number): string {
    return Tex.revealLines([
      "R(\\theta)&=\\begin{pmatrix}\\cos\\theta&-\\sin\\theta\\\\ \\sin\\theta&\\cos\\theta\\end{pmatrix}",
      "\\tfrac{d}{dt}R(\\theta(t))&=\\theta'\\begin{pmatrix}-\\sin\\theta&-\\cos\\theta\\\\ \\cos\\theta&-\\sin\\theta\\end{pmatrix}",
      `&=R(\\theta)\\,${Tex.c(Palette.yellow, "\\begin{pmatrix}0&-\\theta'\\\\ \\theta'&0\\end{pmatrix}")}`,
    ], n);
  }

  private skewProofTex(n: number): string {
    return Tex.revealLines([
      "&R(0)=I,\\ R'(0)=\\Omega:\\ \\ \\tfrac{d}{dt}R(t)x\\big|_0=\\Omega x",
      "&x^{\\top}\\Omega x=(x^{\\top}\\Omega x)^{\\top}=x^{\\top}\\Omega^{\\top}x=-x^{\\top}\\Omega x",
      `&\\Rightarrow\\ x^{\\top}\\Omega x=0:\\ \\ ${Tex.c(Palette.orange, "\\Omega x\\perp x")}`,
    ], n);
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    FlatPixelSpace.view(this.stage);

    // ---- Kernel, derivation, converse (s0–s10)
    const phaseA = 1 - c.p(11, 0.6);
    this.kernelTex.set({ opacity: c.p(0, 0.8, -1.0) * (1 - c.p(14, 0.6)) });
    const dn = t >= c.s(6) ? 4 : t >= c.s(5) ? 3 : t >= c.s(4) ? 2 : t >= c.s(3) ? 1 : 0;
    this.derive.setContent(this.deriveTex(dn));
    this.derive.set({ opacity: (dn > 0 ? 1 : 0) * phaseA });
    this.omegaGrid.place(1110, 420, 1);
    const mirror = c.p(5, 0.6);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (i === j) {
          this.omegaGrid.setFill(i, j, GRAY_FILL, 0.95);
          this.omegaGrid.setEntry(i, j, "0", Palette.muted);
        } else if (i < j) {
          this.omegaGrid.setFill(i, j, YELLOW_FILL, 1);
          this.omegaGrid.setEntry(i, j, `\\omega_{${i + 1}${j + 1}}`);
        } else {
          this.omegaGrid.setFill(i, j, YELLOW_FILL, lerp(0.3, 0.75, mirror));
          this.omegaGrid.setEntry(i, j, `-\\omega_{${j + 1}${i + 1}}`, Palette.text);
        }
      }
    }
    this.omegaGrid.draw(c.p(5, 0.6) * phaseA);
    this.omegaLabel.set({ opacity: c.p(5, 0.6) * phaseA });
    this.converse.set({ opacity: c.p(8, 0.6) * phaseA });
    this.converse.setContent(t >= c.s(9)
      ? "H=R\\Omega:\\quad R^{\\top}R\\Omega+\\Omega^{\\top}R^{\\top}R=\\Omega+\\Omega^{\\top}=0\\ \\ \\checkmark"
      : "H=R\\Omega:\\quad \\phantom{R^{\\top}R\\Omega+\\Omega^{\\top}R^{\\top}R=\\Omega+\\Omega^{\\top}=0\\ \\ \\checkmark}");
    this.resultTex.set({ opacity: c.p(10, 0.6) * phaseA });
    const phaseB = c.p(11, 0.6) * (1 - c.p(14, 0.6));
    this.identityNote.set({ opacity: phaseB });
    this.dimNote.set({ opacity: c.p(12, 0.6) * (1 - c.p(14, 0.6)) });

    // ---- n = 2 (s14–s20)
    const phaseC = c.p(14, 0.6) * (1 - c.p(21, 0.6));
    const theta = 0.35 + 1.4 * smoothstep(c.s(14), c.e(20), t);
    const thetaDot = 0.55;
    const e1 = { x: Math.cos(theta), y: Math.sin(theta) };
    const e2 = { x: -Math.sin(theta), y: Math.cos(theta) };
    const L = 170;
    this.frameCircle.setOpacity(phaseC);
    this.axes[0].set(0, 0, L * e1.x, -L * e1.y);
    this.axes[1].set(0, 0, L * e2.x, -L * e2.y);
    this.axes.forEach((a) => a.setOpacity(phaseC));
    // Velocity of the tips: θ'·(−sin θ, cos θ) for e1 and θ'·(−cos θ, −sin θ) for e2.
    const v1 = { x: -Math.sin(theta) * thetaDot, y: Math.cos(theta) * thetaDot };
    const v2 = { x: -Math.cos(theta) * thetaDot, y: -Math.sin(theta) * thetaDot };
    this.tipVels[0].set(L * e1.x, -L * e1.y, L * (e1.x + v1.x), -L * (e1.y + v1.y));
    this.tipVels[1].set(L * e2.x, -L * e2.y, L * (e2.x + v2.x), -L * (e2.y + v2.y));
    this.tipVels.forEach((a) => a.setOpacity(phaseC * c.p(19, 0.6)));
    const nn = t >= c.s(18) ? 3 : t >= c.s(16) ? 2 : t >= c.s(15) ? 1 : 0;
    this.n2Tex.setContent(this.n2Formula(nn));
    this.n2Tex.set({ opacity: (nn > 0 ? 1 : 0) * phaseC });

    // ---- Ωx ⊥ x (s21–s25), then stretching (s26–s29)
    const phaseD = c.p(21, 0.6) * (1 - c.p(30, 0.6));
    const stretch = c.p(26, 0.6) * (1 - c.p(30, 0.6));
    const leftX = lerp(400, 320, stretch);
    this.left.place(leftX, 470, 1);
    const spin = 0.6 * smoothstep(c.s(26), c.e(29), t);
    const tS = 0.55 * smoothstep(c.s(27), c.e(28), t);
    this.leftCircle.setOpacity(phaseD);
    this.rightCurve.setPoints(this.ellipsePts(tS));
    this.rightCurve.setOpacity(stretch);
    for (let k = 0; k < N_POINTS; k++) {
      const a = (2 * Math.PI * k) / N_POINTS + spin;
      const x = { x: Math.cos(a), y: Math.sin(a) };
      this.leftDots[k].setPosition(this.left.v(RADIUS * x.x, -RADIUS * x.y, 0.02));
      this.leftDots[k].setOpacity(phaseD);
      const w = { x: -x.y, y: x.x };
      this.leftArrows[k].set(RADIUS * x.x, -RADIUS * x.y, RADIUS * (x.x + 0.35 * w.x), -RADIUS * (x.y + 0.35 * w.y));
      this.leftArrows[k].setOpacity(phaseD * c.p(22, 0.6, 0.04 * k));
      const a0 = (2 * Math.PI * k) / N_POINTS;
      const x0 = { x: Math.cos(a0), y: Math.sin(a0) };
      const sx = { x: S_MAT[0][0] * x0.x + S_MAT[0][1] * x0.y, y: S_MAT[1][0] * x0.x + S_MAT[1][1] * x0.y };
      const px = { x: x0.x + tS * sx.x, y: x0.y + tS * sx.y };
      this.rightDots[k].setPosition(this.right.v(RADIUS * px.x, -RADIUS * px.y, 0.02));
      this.rightDots[k].setOpacity(stretch);
      this.rightArrows[k].set(RADIUS * px.x, -RADIUS * px.y, RADIUS * (px.x + 0.6 * sx.x), -RADIUS * (px.y + 0.6 * sx.y));
      this.rightArrows[k].setOpacity(stretch);
    }
    const sp = t >= c.s(24) ? 3 : t >= c.s(23) ? 2 : t >= c.s(22) ? 1 : 0;
    this.skewProof.setContent(this.skewProofTex(sp));
    this.skewProof.set({ opacity: (sp > 0 ? 1 : 0) * (1 - c.p(26, 0.6)) });
    this.symTex.set({ opacity: c.p(27, 0.6) * stretch });
    this.captionL.set({ x: leftX, opacity: c.p(25, 0.6) * phaseD });
    this.captionR.set({ opacity: c.p(28, 0.6) * stretch });

    // ---- Remarks (s30–s33)
    this.squareNote.set({ opacity: c.p(30, 0.6) * (1 - c.p(32, 0.6)) });
    this.summary.set({ opacity: c.p(32, 0.6) });

    this.ledger.update(t, clamp01(c.p(1, 0.5, 2.0)));
  }

  private ellipsePts(tS: number): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) {
      const a = (2 * Math.PI * i) / 120;
      const x = Math.cos(a);
      const y = Math.sin(a);
      const px = x + tS * (S_MAT[0][0] * x + S_MAT[0][1] * y);
      const py = y + tS * (S_MAT[1][0] * x + S_MAT[1][1] * y);
      pts.push(this.right.v(RADIUS * px, -RADIUS * py));
    }
    return pts;
  }

  teardown(_layers: SceneLayers): void {}
}
