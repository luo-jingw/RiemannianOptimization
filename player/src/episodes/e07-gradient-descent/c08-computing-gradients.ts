import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { TangentPlane } from "../../primitives/TangentPlane";
import { WorldLabel } from "../../primitives/WorldLabel";
import { setOrbitView } from "../e06-gradient-retraction/lib/SphereCamera";
import type { SvgPath } from "../e06-gradient-retraction/lib/SvgOverlay";
import { SvgOverlay } from "../e06-gradient-retraction/lib/SvgOverlay";
import { RayleighSphere } from "./lib/RayleighSphere";
import { applyA, lift, rayleighGrad, spherePoint } from "./lib/rayleigh";
import { Tex } from "./lib/tex";

/**
 * E07 c08 — computing gradients (Boumal §4.7, (4.20)–(4.30), Exs. 4.24, 4.28): the three-step recipe, the chain,
 * product and inner product rules, grad ‖F‖² = 2DF*[F] with least squares, D(X⁻¹) with a 2×2 finite-difference check,
 * grad log det = X⁻¹, projection on the sphere (Ax sticks out), and the cheap gradient principle.
 * Sentence indices refer to content/episodes/e07-gradient-descent/story.en.json, scene c08-computing-gradients.
 */

const X = spherePoint(50, 35);
const CX = 680;

type M2 = [number, number, number, number];
const mul = (a: M2, b: M2): M2 => [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3]];
const inv = (a: M2): M2 => {
  const d = a[0] * a[3] - a[1] * a[2];
  return [a[3] / d, -a[1] / d, -a[2] / d, a[0] / d];
};
const fmt = (a: M2): string => `\\begin{pmatrix}${a[0].toFixed(4)}&${a[1].toFixed(4)}\\\\${a[2].toFixed(4)}&${a[3].toFixed(4)}\\end{pmatrix}`;

export class ComputingGradientsScene implements Scene {
  readonly id = "c08-computing-gradients";
  private stage!: StageLayer;

  private sphere!: RayleighSphere;
  private plane!: TangentPlane;
  private xDot!: Dot;
  private egrad!: Arrow;
  private tang!: Arrow;
  private normal!: Polyline;
  private lE!: WorldLabel;
  private lT!: WorldLabel;

  private svg!: SvgOverlay;
  private costBars: SvgPath[] = [];

  private fDef!: FormulaHandle;
  private fRecipe!: FormulaHandle;
  private fRules!: FormulaHandle;
  private fSq!: FormulaHandle;
  private fInv!: FormulaHandle;
  private fCheck!: FormulaHandle;
  private fLogdet!: FormulaHandle;
  private fProj!: FormulaHandle;
  private fCheap!: FormulaHandle;
  private barLabels: FormulaHandle[] = [];

  private ledger!: ProofLedger;
  private checkTex = "";

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    this.sphere = new RayleighSphere(stage);
    this.plane = new TangentPlane(stage, Palette.green, 0.9);
    this.xDot = new Dot(stage, lift(X, 1.01), Palette.orange, 0.03, "3d");
    const ax = applyA(X);
    const g = rayleighGrad(X);
    this.egrad = new Arrow(stage, X, X.clone().addScaledVector(ax, 0.3), Palette.red, { mode: "3d", width: 5, headLength: 0.08 });
    this.tang = new Arrow(stage, X, X.clone().addScaledVector(g, 0.3), "#ffffff", { mode: "3d", width: 5, headLength: 0.08 });
    this.normal = new Polyline(stage, [X.clone().addScaledVector(g, 0.3), X.clone().addScaledVector(ax, 0.3)], { color: Palette.red, width: 2.5, dashed: true, dashSize: 0.03, gapSize: 0.03 });
    this.lE = new WorldLabel(stage, fl, { tex: "Ax", size: 30, color: Palette.red }, X.clone().addScaledVector(ax, 0.3), { x: 14, y: -12 });
    this.lT = new WorldLabel(stage, fl, { tex: "(I-xx^\\top)Ax", size: 28, color: "#ffffff" }, X.clone().addScaledVector(g, 0.3), { x: 16, y: 18 });

    this.svg = new SvgOverlay(fl);
    for (let i = 0; i < 2; i++) this.costBars.push(this.svg.path({ color: i === 0 ? Palette.blue : Palette.green, width: 2, fill: i === 0 ? "rgba(90,169,255,0.45)" : "rgba(105,219,124,0.45)" }));
    this.barLabels.push(fl.add({ tex: "\\text{cost of } f", x: 420, y: 760, size: 26, color: Palette.blue }));
    this.barLabels.push(fl.add({ tex: "\\text{cost of }\\operatorname{grad}f\\ \\ (\\lesssim5\\times)", x: 900, y: 760, size: 26, color: Palette.green }));

    // the 2×2 inverse check (s18)
    const Xm: M2 = [2, 1, 0.5, 3];
    const U: M2 = [0.3, -1, 0.7, 0.2];
    const Xi = inv(Xm);
    const exact = mul(mul(Xi, U), Xi).map((v) => -v) as M2;
    const h = 1e-6;
    const Xh: M2 = [Xm[0] + h * U[0], Xm[1] + h * U[1], Xm[2] + h * U[2], Xm[3] + h * U[3]];
    const fd = inv(Xh).map((v, i) => (v - Xi[i]) / h) as M2;
    this.checkTex = `-X^{-1}UX^{-1}=${fmt(exact)}\\qquad \\tfrac{(X+hU)^{-1}-X^{-1}}{h}\\Big|_{h=10^{-6}}=${fmt(fd)}`;

    this.fDef = fl.add({ tex: "Df(x)[v]=\\langle\\operatorname{grad}f(x),v\\rangle_x\\quad\\forall v\\in T_xM\\qquad(4.20)", x: CX, y: 110, size: 34 });
    this.fRecipe = fl.add({ tex: "", x: CX, y: 420, size: 40, display: true });
    this.fRules = fl.add({ tex: "", x: CX, y: 420, size: 34, display: true });
    this.fSq = fl.add({ tex: "", x: CX, y: 420, size: 38, display: true });
    this.fInv = fl.add({ tex: "", x: CX, y: 340, size: 38, display: true });
    this.fCheck = fl.add({ tex: "", x: CX, y: 600, size: 26 });
    this.fLogdet = fl.add({ tex: "", x: CX, y: 420, size: 36, display: true });
    this.fProj = fl.add({ tex: "", x: CX, y: 110, size: 30, display: true });
    this.fCheap = fl.add({ tex: "", x: CX, y: 290, size: 34, display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "Df(x)[v]\\to\\langle g,v\\rangle\\Rightarrow\\operatorname{grad}f(x)=g", at: cue.e(4) },
      { label: "2", tex: "\\operatorname{grad}\\|F\\|^2=2\\,DF(x)^*[F(x)]", at: cue.e(13) },
      { label: "3", tex: "D(X^{-1})[U]=-X^{-1}UX^{-1}", at: cue.e(17) },
      { label: "4", tex: "\\operatorname{grad}\\log\\det X=X^{-1}", at: cue.e(21) },
      { label: "5", tex: "\\text{submanifold: project } \\nabla\\bar f", at: cue.e(24) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    setOrbitView(this.stage, { azDeg: 25, elDeg: 26, distance: 6.0, fovDeg: 34, center: new THREE.Vector3(0, 0, 0.2), shift: 1.1, lift: 0.1 });

    this.fDef.set({ opacity: c.p(1, 0.6) * (1 - c.p(5, 0.5)) });
    const rc = Tex.count(t, [c.s(2), c.s(3), c.s(4)]);
    this.fRecipe.setContent(Tex.rows([
      `\\boxed{\\text{1. write } Df(x)[v]}`,
      `\\Downarrow\\ \\boxed{\\text{2. adjoints: } =\\langle g,v\\rangle_x}`,
      `\\Downarrow\\ \\boxed{\\text{3. } ${Tex.color(Palette.yellow, "\\operatorname{grad}f(x)=g")}}`,
    ], rc));
    this.fRecipe.set({ opacity: (rc > 0 ? 1 : 0) * (1 - c.p(5, 0.5)) });
    const ru = Tex.count(t, [c.s(6), c.s(7), c.s(8), c.s(9)]);
    this.fRules.setContent(Tex.rows([
      "D(G\\circ F)(x)[v]=DG(F(x))\\big[DF(x)[v]\\big]",
      "D(FG)(x)[v]=DF(x)[v]\\,G(x)+F(x)\\,DG(x)[v]\\quad(\\cdot,\\ \\odot,\\ \\otimes)",
      `${Tex.color(Palette.muted, "\\text{along a curve: bilinear } \\Rightarrow\\ \\text{1-D product rule entrywise}")}`,
      "D\\langle F,G\\rangle(x)[v]=\\langle DF(x)[v],G(x)\\rangle+\\langle F(x),DG(x)[v]\\rangle",
    ], ru));
    this.fRules.set({ opacity: (ru > 0 ? 1 : 0) * (1 - c.p(10, 0.5)) });
    const sq = Tex.count(t, [c.s(10), c.s(11), c.s(12), c.s(13), c.s(14)]);
    this.fSq.setContent(Tex.rows([
      "f(x)=\\|F(x)\\|^2,\\quad F:M\\to E",
      "Df(x)[v]=2\\langle F(x),DF(x)[v]\\rangle",
      "=2\\langle DF(x)^*[F(x)],\\,v\\rangle_x",
      `${Tex.color(Palette.yellow, "\\operatorname{grad}f(x)=2\\,DF(x)^*[F(x)]")}`,
      "\\|Bx-y\\|^2:\\ \\ \\operatorname{grad}=2B^\\top(Bx-y)",
    ], sq));
    this.fSq.set({ opacity: (sq > 0 ? 1 : 0) * (1 - c.p(15, 0.5)) });
    const iv = Tex.count(t, [c.s(15), c.s(16), c.s(17)]);
    this.fInv.setContent(Tex.rows([
      "F(X)\\,X=I",
      "DF(X)[U]\\,X+F(X)\\,U=0",
      `${Tex.color(Palette.yellow, "DF(X)[U]=-X^{-1}UX^{-1}")}`,
    ], iv));
    this.fInv.set({ opacity: (iv > 0 ? 1 : 0) * (1 - c.p(19, 0.5)) });
    this.fCheck.setContent(`X=\\begin{pmatrix}2&1\\\\0.5&3\\end{pmatrix},\\ U=\\begin{pmatrix}0.3&-1\\\\0.7&0.2\\end{pmatrix}:\\qquad ${this.checkTex}`);
    this.fCheck.set({ opacity: c.p(18, 0.5) * (1 - c.p(19, 0.5)) });
    const ld = Tex.count(t, [c.s(19), c.s(20), c.s(21)]);
    this.fLogdet.setContent(Tex.rows([
      "\\log\\det(X+tU)=\\log\\det X+\\log\\det(I+tX^{-1}U)",
      "\\det(I+tB)=\\prod_i(1+t\\lambda_i)=1+t\\,\\mathrm{Tr}\\,B+O(t^2)",
      `D\\log\\det(X)[U]=\\mathrm{Tr}(X^{-1}U)\\ \\Rightarrow\\ ${Tex.color(Palette.yellow, "\\operatorname{grad}=X^{-1}\\ \\ (X\\succ0)")}`,
    ], ld));
    this.fLogdet.set({ opacity: (ld > 0 ? 1 : 0) * (1 - c.p(22, 0.5)) });

    // ---- projection on the sphere (s22–s26)
    const sO = c.p(22, 0.8) * (1 - c.p(27, 0.6));
    this.sphere.setOpacity(sO, 1, 0);
    this.plane.place(X, X);
    this.plane.setOpacity(0.6 * sO);
    this.xDot.setOpacity(sO);
    this.egrad.setOpacity(sO * c.p(24, 0.5));
    this.lE.update(sO * c.p(24, 0.5));
    this.tang.setOpacity(sO * c.p(24, 0.5, 1.2));
    this.lT.update(sO * c.p(24, 0.5, 1.2));
    this.normal.setOpacity(sO * c.p(25, 0.5));
    const pj = Tex.count(t, [c.s(23), c.s(24), c.s(25), c.s(26)]);
    this.fProj.setContent(Tex.rows([
      "\\operatorname{grad}f(x)=\\mathrm{Proj}_x\\big(\\nabla\\bar f(x)\\big)",
      `\\nabla\\bar f=Ax\\ \\Rightarrow\\ ${Tex.color(Palette.yellow, "Ax-(x^\\top Ax)\\,x")}`,
      `${Tex.color(Palette.red, "Ax\\notin T_xS^2:\\ \\text{do not skip the projection}")}`,
      `${Tex.color(Palette.muted, "\\text{adjoints depend on the inner product}")}`,
    ], pj));
    this.fProj.set({ opacity: (pj > 0 ? 1 : 0) * (1 - c.p(27, 0.5)) });

    // ---- cheap gradients (s27–s31)
    const bO = c.p(28, 0.6) * (1 - c.p(31, 0.6));
    const base = 720;
    const hF = 120;
    const hG = 120 * 3.2 * c.p(28, 0.8, 0.5);
    this.costBars[0].setPoints([{ x: 360, y: base }, { x: 480, y: base }, { x: 480, y: base - hF }, { x: 360, y: base - hF }], true);
    this.costBars[1].setPoints([{ x: 840, y: base }, { x: 960, y: base }, { x: 960, y: base - hG }, { x: 840, y: base - hG }], true);
    this.costBars.forEach((b) => b.setOpacity(bO));
    this.barLabels.forEach((l) => l.set({ opacity: bO }));
    const ch = Tex.count(t, [c.s(27), c.s(29), c.s(30), c.s(31)]);
    this.fCheap.setContent(Tex.rows([
      "\\textbf{cheap gradient principle}",
      "\\text{reuse the work for } f;\\ \\ \\text{slow gradient}\\Rightarrow\\text{improvable code}",
      "\\text{automatic differentiation (Manopt on manifolds)}",
      `${Tex.color(Palette.yellow, "\\text{next: check hand-derived gradients}")}`,
    ], ch));
    this.fCheap.set({ opacity: ch > 0 ? 1 : 0 });

    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
