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
import { applyA, lift, rayleighGrad, spherePoint, tangentFrame } from "./lib/rayleigh";
import { Tex } from "./lib/tex";

/**
 * E07 c08 — computing gradients (Boumal §4.7, (4.20)–(4.30), Exs. 4.24, 4.28): the three-step recipe, the chain,
 * product and inner product rules, grad ‖F‖² = 2DF*[F] with least squares, D(X⁻¹) with a 2×2 finite-difference check,
 * grad log det = X⁻¹, the projection rule grad f = Proj_x ∇f̄ with its proof (Prop. 3.61), the projector
 * I − Jᵀ(JJᵀ)⁻¹J onto ker J by least squares (§7.7, (7.70)–(7.75)), the sphere and ‖x‖² check, the Rayleigh example,
 * and the cheap gradient principle.
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
  private vArrow!: Arrow;
  private radial!: Arrow;
  private lE!: WorldLabel;
  private lT!: WorldLabel;
  private lN!: WorldLabel;
  private lV!: WorldLabel;
  private lR!: WorldLabel;

  private svg!: SvgOverlay;
  private costBars: SvgPath[] = [];

  private fDef!: FormulaHandle;
  private fRecipe!: FormulaHandle;
  private fRules!: FormulaHandle;
  private fSq!: FormulaHandle;
  private fInv!: FormulaHandle;
  private fCheck!: FormulaHandle;
  private fLogdet!: FormulaHandle;
  private fWhy!: FormulaHandle;
  private fProjector!: FormulaHandle;
  private fSphere!: FormulaHandle;
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
    const { east } = tangentFrame(X);
    const vEnd = X.clone().addScaledVector(east, -0.55);
    this.vArrow = new Arrow(stage, X, vEnd, Palette.green, { mode: "3d", width: 4, headLength: 0.07 });
    this.radial = new Arrow(stage, X, X.clone().multiplyScalar(1.6), Palette.purple, { mode: "3d", width: 5, headLength: 0.08 });
    this.lE = new WorldLabel(stage, fl, { tex: "\\nabla\\bar f(x)", size: 30, color: Palette.red }, X.clone().addScaledVector(ax, 0.3), { x: -50, y: -38 });
    this.lT = new WorldLabel(stage, fl, { tex: "\\tau", size: 30, color: "#ffffff" }, X.clone().addScaledVector(g, 0.3), { x: 16, y: 18 });
    this.lN = new WorldLabel(stage, fl, { tex: "\\nu", size: 30, color: Palette.red }, X.clone().addScaledVector(g, 0.3).lerp(X.clone().addScaledVector(ax, 0.3), 0.5), { x: 18, y: 0 });
    this.lV = new WorldLabel(stage, fl, { tex: "v\\in T_xM", size: 28, color: Palette.green }, vEnd, { x: -20, y: 20 });
    this.lR = new WorldLabel(stage, fl, { tex: "\\nabla\\bar f=2x", size: 30, color: Palette.purple }, X.clone().multiplyScalar(1.6), { x: 18, y: -14 });

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
    this.fWhy = fl.add({ tex: "", x: 60, y: 430, size: 30, display: true, align: "left" });
    this.fProjector = fl.add({ tex: "", x: CX, y: 440, size: 31, display: true });
    this.fSphere = fl.add({ tex: "", x: 60, y: 430, size: 30, display: true, align: "left" });
    this.fProj = fl.add({ tex: "", x: 60, y: 430, size: 30, display: true, align: "left" });
    this.fCheap = fl.add({ tex: "", x: CX, y: 290, size: 34, display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "Df(x)[v]\\to\\langle g,v\\rangle\\Rightarrow\\operatorname{grad}f(x)=g", at: cue.e(4) },
      { label: "2", tex: "\\operatorname{grad}\\|F\\|^2=2\\,DF(x)^*[F(x)]", at: cue.e(13) },
      { label: "3", tex: "D(X^{-1})[U]=-X^{-1}UX^{-1}", at: cue.e(17) },
      { label: "4", tex: "\\operatorname{grad}\\log\\det X=X^{-1}", at: cue.e(21) },
      { label: "5", tex: "\\operatorname{grad}f(x)=\\mathrm{Proj}_x\\big(\\nabla\\bar f(x)\\big)", at: cue.e(28) },
      { label: "6", tex: "\\mathrm{Proj}_x=I-J^\\top(JJ^\\top)^{-1}J", at: cue.e(37) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    setOrbitView(this.stage, { azDeg: -20, elDeg: 15, distance: 7.2, fovDeg: 34, center: new THREE.Vector3(0, 0, 0.1), shift: -0.16, lift: 0.05 });

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

    // ---- the projection rule, the projector, the sphere check, the Rayleigh example (s22–s45)
    const sO = Math.max(c.p(23, 0.8) * (1 - c.p(29, 0.6)), c.p(39, 0.8) * (1 - c.p(46, 0.6)));
    const why = c.p(23, 0.5) * (1 - c.p(29, 0.5));
    const ray = c.p(43, 0.5) * (1 - c.p(46, 0.5));
    const decomp = Math.max(why, ray);
    this.sphere.setOpacity(sO, 1, 0);
    this.plane.place(X, X);
    this.plane.setOpacity(0.6 * sO);
    this.xDot.setOpacity(sO);
    this.egrad.setOpacity(decomp);
    this.lE.handle.setContent(t >= c.s(43) ? "\\nabla\\bar f=Ax" : "\\nabla\\bar f(x)");
    this.lE.update(decomp);
    const split = Math.max(c.p(26, 0.5) * (1 - c.p(29, 0.5)), ray);
    this.tang.setOpacity(split);
    this.lT.handle.setContent(t >= c.s(43) ? "(I-xx^\\top)Ax" : "\\tau");
    this.lT.update(split);
    const nO = Math.max(c.p(26, 0.5, 1.2) * (1 - c.p(29, 0.5)), c.p(44, 0.5) * (1 - c.p(46, 0.5)));
    this.normal.setOpacity(nO);
    this.lN.update(c.p(26, 0.5, 1.2) * (1 - c.p(29, 0.5)));
    const vO = c.p(24, 0.5) * (1 - c.p(28, 0.5));
    this.vArrow.setOpacity(vO);
    this.lV.update(vO);
    const rO = c.p(41, 0.5) * (1 - c.p(43, 0.5));
    this.radial.setOpacity(rO);
    this.lR.handle.setContent(t >= c.s(42) ? "2x\\perp T_xS^2" : "\\nabla\\bar f=2x");
    this.lR.update(rO);

    const wy = Tex.count(t, [c.s(23), c.s(24), c.s(25), c.s(26), c.s(27), c.s(28)]);
    this.fWhy.setContent(Tex.rows([
      "&\\bar f:U\\to\\mathbb R\\ \\text{smooth},\\ \\ \\bar f|_M=f",
      "&c\\subset M,\\ c(0)=x,\\ c'(0)=v:\\ \\ f\\circ c=\\bar f\\circ c",
      "&Df(x)[v]=D\\bar f(x)[v]=\\langle\\nabla\\bar f(x),v\\rangle",
      `&\\nabla\\bar f(x)=${Tex.color("#ffffff", "\\tau")}+${Tex.color(Palette.red, "\\nu")},\\ \\ \\tau\\in T_xM,\\ \\nu\\perp T_xM`,
      "&Df(x)[v]=\\langle\\tau,v\\rangle+\\underbrace{\\langle\\nu,v\\rangle}_{=\\,0}",
      `&${Tex.color(Palette.yellow, "\\operatorname{grad}f(x)=\\tau=\\mathrm{Proj}_x\\big(\\nabla\\bar f(x)\\big)")}`,
    ], wy, "aligned"));
    this.fWhy.set({ opacity: (wy > 0 ? 1 : 0) * (1 - c.p(29, 0.5)) });

    const pr = Tex.count(t, [c.s(29), c.s(30), c.s(31), c.s(32), c.s(33), c.s(34), c.s(35), c.s(36), c.s(37), c.s(38)]);
    this.fProjector.setContent(Tex.rows([
      "M=\\{x\\in\\mathbb R^n:\\ c(x)=0\\},\\quad c:\\mathbb R^n\\to\\mathbb R^k",
      "J=Dc(x)\\in\\mathbb R^{k\\times n},\\quad \\operatorname{rank}J=k",
      "T_xM=\\ker J,\\qquad N_xM=(\\ker J)^\\perp=\\operatorname{im}J^\\top",
      "q=p+J^\\top w,\\qquad p\\in T_xM,\\ \\ w\\in\\mathbb R^k",
      "\\min_{w}\\ L(w)=\\|q-J^\\top w\\|^2",
      "L(w)=\\|q\\|^2-2\\,q^\\top J^\\top w+w^\\top JJ^\\top w",
      `\\nabla L(w)=2JJ^\\top w-2Jq\\qquad ${Tex.color(Palette.muted, "JJ^\\top \\text{ invertible}")}`,
      "w^*=(JJ^\\top)^{-1}Jq",
      `${Tex.color(Palette.yellow, "\\boxed{\\mathrm{Proj}_x=I-J^\\top(JJ^\\top)^{-1}J}")}`,
      `${Tex.color(Palette.muted, "J\\,\\mathrm{Proj}_x\\,q=Jq-Jq=0")}`,
    ], pr));
    this.fProjector.set({ opacity: (pr > 0 ? 1 : 0) * (1 - c.p(39, 0.5)) });

    const sp = Tex.count(t, [c.s(39), c.s(40), c.s(41), c.s(42)]);
    this.fSphere.setContent(Tex.rows([
      "&S^2:\\ \\ c(x)=x^\\top x-1,\\ \\ J=2x^\\top",
      `&JJ^\\top=4x^\\top x=4\\ \\Rightarrow\\ ${Tex.color(Palette.yellow, "\\mathrm{Proj}_x=I-xx^\\top")}`,
      `&\\bar f(x)=\\|x\\|^2:\\ \\ ${Tex.color(Palette.purple, "\\nabla\\bar f(x)=2x\\neq0")}`,
      `&\\operatorname{grad}f(x)=(I-xx^\\top)\\,2x=2x-2x\\,(x^\\top x)=${Tex.color(Palette.yellow, "0")}`,
    ], sp, "aligned"));
    this.fSphere.set({ opacity: (sp > 0 ? 1 : 0) * (1 - c.p(43, 0.5)) });

    const pj = Tex.count(t, [c.s(43), c.s(44), c.s(45)]);
    this.fProj.setContent(Tex.rows([
      `&\\nabla\\bar f=Ax\\ \\Rightarrow\\ ${Tex.color(Palette.yellow, "\\operatorname{grad}f(x)=Ax-(x^\\top Ax)\\,x")}`,
      `&${Tex.color(Palette.red, "Ax\\notin T_xS^2:\\ \\text{do not skip the projection}")}`,
      `&${Tex.color(Palette.muted, "\\text{adjoints depend on the inner product}")}`,
    ], pj, "aligned"));
    this.fProj.set({ opacity: (pj > 0 ? 1 : 0) * (1 - c.p(46, 0.5)) });

    // ---- cheap gradients (s46–s50)
    const bO = c.p(47, 0.6) * (1 - c.p(50, 0.6));
    const base = 720;
    const hF = 120;
    const hG = 120 * 3.2 * c.p(47, 0.8, 0.5);
    this.costBars[0].setPoints([{ x: 360, y: base }, { x: 480, y: base }, { x: 480, y: base - hF }, { x: 360, y: base - hF }], true);
    this.costBars[1].setPoints([{ x: 840, y: base }, { x: 960, y: base }, { x: 960, y: base - hG }, { x: 840, y: base - hG }], true);
    this.costBars.forEach((b) => b.setOpacity(bO));
    this.barLabels.forEach((l) => l.set({ opacity: bO }));
    const ch = Tex.count(t, [c.s(46), c.s(48), c.s(49), c.s(50)]);
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
