import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { lerp } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Tex } from "../e07-gradient-descent/lib/tex";
import { ArrowField2D, gridPoints } from "./lib/ArrowField2D";

/**
 * E08 c02 — vector fields acting on functions and the Lie bracket (Boumal Def 5.5, footnote 1, Prop 5.10): X f,
 * cancellation of second derivatives, [X,Y] = DY[X] − DX[Y] in ℝⁿ, the example U = (1,0), V = (0, x₁x₂), the flow
 * square from (1,1) with gap ≈ ε²[U,V], and commuting coordinate fields.
 * Sentence indices refer to content/episodes/e08-connections-geodesics/story.en.json, scene c02-vector-fields-brackets.
 */

const P = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(x, y, 0);
const fX = (p: THREE.Vector2): THREE.Vector2 => new THREE.Vector2(-p.y, p.x).multiplyScalar(0.5);
const ellipse = (c: number): THREE.Vector3[] => {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 128; i++) {
    const a = (2 * Math.PI * i) / 128;
    pts.push(P(Math.sqrt(c) * Math.cos(a), Math.sqrt(2 * c) * Math.sin(a)));
  }
  return pts;
};
/** Endpoints of the two flow paths from (1, 1): U then V, and V then U (U = (1,0), V = (0, x₁x₂)). */
const flowPaths = (eps: number): { uv: THREE.Vector3[]; vu: THREE.Vector3[] } => ({
  uv: [P(1, 1), P(1 + eps, 1), P(1 + eps, Math.exp((1 + eps) * eps))],
  vu: [P(1, 1), P(1, Math.exp(eps)), P(1 + eps, Math.exp(eps))],
});

export class VectorFieldsBracketsScene implements Scene {
  readonly id = "c02-vector-fields-brackets";
  private stage!: StageLayer;

  private levels: Polyline[] = [];
  private xField!: ArrowField2D;
  private probe!: Dot;
  private probeArrow!: Arrow;
  private probeLabel!: FormulaHandle;
  private uField!: ArrowField2D;
  private vField!: ArrowField2D;
  private bracketField!: ArrowField2D;
  private pathUV!: Polyline;
  private pathVU!: Polyline;
  private gap!: Polyline;
  private start!: Dot;
  private endUV!: Dot;
  private endVU!: Dot;
  private grid: Polyline[] = [];
  private gridPaths: Polyline[] = [];

  private fAct!: FormulaHandle;
  private fExpand!: FormulaHandle;
  private fExample!: FormulaHandle;
  private fFlow!: FormulaHandle;
  private fCommute!: FormulaHandle;
  private fSummary!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;

    for (const c of [0.15, 0.45, 0.9, 1.5]) this.levels.push(new Polyline(stage, ellipse(c), { color: Palette.muted, width: 1.6, opacity: 0.6 }));
    this.xField = new ArrowField2D(stage, gridPoints(-1.5, 1.5, -1.2, 1.5, 7, 6), fX, Palette.blue, 0.42);
    this.probe = new Dot(stage, P(0, 0), Palette.orange, 0.05);
    this.probeArrow = new Arrow(stage, P(0, 0), P(0.1, 0), Palette.orange, { width: 4, headLength: 0.1 });
    this.probeLabel = fl.add({ tex: "", x: 0, y: 0, size: 28, color: Palette.orange, align: "left" });

    const fieldPts = gridPoints(-0.2, 2.0, 0.0, 2.0, 6, 6);
    this.uField = new ArrowField2D(stage, fieldPts, () => new THREE.Vector2(1, 0), Palette.orange, 0.26);
    this.vField = new ArrowField2D(stage, fieldPts, (p) => new THREE.Vector2(0, p.x * p.y), Palette.purple, 0.16);
    this.bracketField = new ArrowField2D(stage, fieldPts, (p) => new THREE.Vector2(0, p.y), Palette.red, 0.2);

    const f0 = flowPaths(0.4);
    this.pathUV = new Polyline(stage, f0.uv, { color: Palette.orange, width: 4 });
    this.pathVU = new Polyline(stage, f0.vu, { color: Palette.purple, width: 4 });
    this.gap = new Polyline(stage, [f0.uv[2], f0.vu[2]], { color: Palette.red, width: 5 });
    this.start = new Dot(stage, P(1, 1), Palette.text, 0.022);
    this.endUV = new Dot(stage, f0.uv[2], Palette.orange, 0.02);
    this.endVU = new Dot(stage, f0.vu[2], Palette.purple, 0.02);

    for (let k = -2; k <= 2; k++) {
      this.grid.push(new Polyline(stage, [P(-2.2, k * 0.8), P(2.2, k * 0.8)], { color: Palette.grid, width: 1.5 }));
      this.grid.push(new Polyline(stage, [P(k * 0.8, -1.8), P(k * 0.8, 1.8)], { color: Palette.grid, width: 1.5 }));
    }
    this.gridPaths.push(new Polyline(stage, [P(-0.8, -0.8), P(0.8, -0.8), P(0.8, 0.8)], { color: Palette.orange, width: 5 }));
    this.gridPaths.push(new Polyline(stage, [P(-0.8, -0.8), P(-0.8, 0.8), P(0.8, 0.8)], { color: Palette.purple, width: 5 }));

    this.fAct = fl.add({ tex: "", x: 1390, y: 300, size: 30, display: true, align: "right" });
    this.fExpand = fl.add({ tex: "", x: 960, y: 420, size: 32, display: true });
    this.fExample = fl.add({ tex: "", x: 1150, y: 330, size: 32, display: true });
    this.fFlow = fl.add({ tex: "", x: 1150, y: 420, size: 30, display: true });
    this.fCommute = fl.add({ tex: "", x: 1150, y: 430, size: 32, display: true });
    this.fSummary = fl.add({ tex: "", x: 960, y: 430, size: 34, display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "(Xf)(p)=Df(p)[X(p)]", at: cue.e(2) },
      { label: "2", tex: "[X,Y]f=X(Yf)-Y(Xf)", at: cue.e(6) },
      { label: "3", tex: "\\mathbb R^n:\\ [X,Y]=DY[X]-DX[Y]", at: cue.e(12) },
      { label: "4", tex: "\\text{gap}\\approx\\varepsilon^2[U,V](p)", at: cue.e(23) },
      { label: "5", tex: "[\\partial_i,\\partial_j]=0", at: cue.e(25) },
    ], { x: 1440, y: 210, width: 460, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const flowPart = t >= c.s(18) - 0.3 && t < c.s(24) - 0.3;
    const eps = t < c.s(22) ? 0.4 : lerp(0.4, 0.12, c.over(22, 0.1, 0.9));
    if (t < c.s(14) - 0.3) this.stage.setView2D(1.4, -0.3, 4.4);
    else if (flowPart) this.stage.setView2D(1 + 2.0 * eps, 1 + 0.55 * eps, 3.2 * eps);
    else if (t < c.s(24) - 0.3) this.stage.setView2D(2.45, 1.0, 3.0);
    else this.stage.setView2D(1.9, 0, 4.4);

    // ---- fields act on functions (s0–s4)
    const aO = c.p(0, 0.6) * (1 - c.p(5, 0.5));
    this.levels.forEach((l) => l.setOpacity(0.6 * aO * c.p(3, 0.5)));
    this.xField.setOpacity(aO);
    const pa = 0.6 + 0.5 * Math.max(0, t - c.s(1));
    const pp = new THREE.Vector2(1.05 * Math.cos(pa), 1.05 * Math.sin(pa));
    const xv = fX(pp);
    const xf = 2 * pp.x * xv.x + pp.y * xv.y;
    this.probe.setPosition(P(pp.x, pp.y));
    this.probeArrow.set(P(pp.x, pp.y), P(pp.x + 0.9 * xv.x, pp.y + 0.9 * xv.y));
    const prO = aO * c.p(1, 0.5);
    this.probe.setOpacity(prO);
    this.probeArrow.setOpacity(prO);
    const lp = this.stage.project(P(pp.x, pp.y));
    this.probeLabel.setContent(`(Xf)(p)=${xf.toFixed(2)}`);
    this.probeLabel.set({ x: lp.x + 24, y: lp.y - 30, opacity: prO * c.p(3, 0.5) });
    const ar = Tex.count(t, [c.s(1), c.s(2), c.s(3), c.s(4)]);
    this.fAct.setContent(Tex.rows([
      "(Xf)(p)=Df(p)[X(p)]",
      "Xf\\ \\text{is again a smooth function}",
      `f=x^2+\\tfrac12y^2,\\ \\ X=\\tfrac12(-y,\\,x)`,
      "\\langle X,Y\\rangle(p)=\\langle X(p),Y(p)\\rangle_p",
    ], ar));
    this.fAct.set({ opacity: (ar > 0 ? 1 : 0) * (1 - c.p(5, 0.5)) });

    // ---- the bracket and the cancellation (s5–s13)
    const ex = Tex.count(t, [c.s(5), c.s(6), c.s(7), c.s(8), c.s(9), c.s(10), c.s(11), c.s(12), c.s(13)]);
    const cancel = c.p(10, 0.6) > 0.5;
    const second = (s: string): string => (cancel ? `\\cancel{${s}}` : s);
    this.fExpand.setContent(Tex.rows([
      "X(Yf)\\quad\\text{(apply } Y\\text{, then } X)",
      `${Tex.color(Palette.yellow, "[X,Y]f=X(Yf)-Y(Xf)")}`,
      "X=X^i\\partial_i,\\quad Y=Y^j\\partial_j",
      `X(Yf)=X^i(\\partial_iY^j)\\,\\partial_jf+${second("X^iY^j\\,\\partial_i\\partial_jf")}`,
      `Y(Xf)=Y^j(\\partial_jX^i)\\,\\partial_if+${second("Y^jX^i\\,\\partial_j\\partial_if")}`,
      `${Tex.color(Palette.muted, "\\partial_i\\partial_jf=\\partial_j\\partial_if\\ \\Rightarrow\\ \\text{second-order terms cancel}")}`,
      "[X,Y]f=\\big(X(Y^j)-Y(X^j)\\big)\\,\\partial_jf",
      `${Tex.color(Palette.green, "[X,Y]=DY[X]-DX[Y]\\quad\\text{a vector field}")}`,
      `${Tex.color(Palette.red, "X=\\partial_x:\\ X(Xf)=f_{xx}\\ \\text{is not a vector field}")}`,
    ], ex));
    this.fExpand.set({ opacity: (ex > 0 ? 1 : 0) * (1 - c.p(14, 0.5)) });

    // ---- the example U, V (s14–s17)
    const eO = c.p(14, 0.6) * (1 - c.p(18, 0.5));
    this.uField.setOpacity(eO);
    this.vField.setOpacity(eO * c.p(14, 0.5, 1.2));
    this.bracketField.setOpacity(eO * c.p(17, 0.6));
    const er = Tex.count(t, [c.s(14), c.s(15), c.s(16), c.s(17)]);
    this.fExample.setContent(Tex.rows([
      `${Tex.color(Palette.orange, "U=(1,0)")},\\quad ${Tex.color(Palette.purple, "V=(0,\\,x_1x_2)")}`,
      "f=x_2:\\ \\ Vf=x_1x_2,\\ \\ U(Vf)=x_2",
      "Uf=0,\\ \\ V(Uf)=0,\\ \\ [U,V]f=x_2",
      `${Tex.color(Palette.red, "[U,V]=(0,\\,x_2)")}`,
    ], er));
    this.fExample.set({ x: 1180, opacity: (er > 0 ? 1 : 0) * (1 - c.p(18, 0.5)) });

    // ---- the flow square (s18–s23)
    const fO = c.during(18, 24, 0.5);
    const fp = flowPaths(eps);
    [this.start, this.endUV, this.endVU].forEach((d) => d.setScale(eps / 0.4));
    this.pathUV.setPoints(fp.uv);
    this.pathVU.setPoints(fp.vu);
    this.pathUV.setProgress(c.over(19, 0.05, 0.8));
    this.pathVU.setProgress(c.over(20, 0.05, 0.8));
    this.pathUV.setOpacity(fO * c.p(19, 0.4));
    this.pathVU.setOpacity(fO * c.p(20, 0.4));
    this.gap.setPoints([fp.uv[2], fp.vu[2]]);
    this.gap.setOpacity(fO * c.p(21, 0.5));
    this.start.setOpacity(fO);
    this.endUV.setPosition(fp.uv[2]);
    this.endVU.setPosition(fp.vu[2]);
    this.endUV.setOpacity(fO * c.p(19, 0.4, 1.0));
    this.endVU.setOpacity(fO * c.p(20, 0.4, 1.0));
    const fr = Tex.count(t, [c.s(18), c.s(19), c.s(20), c.s(21), c.s(22), c.s(23)]);
    const gapNow = (fp.uv[2].y - fp.vu[2].y) / (eps * eps);
    this.fFlow.setContent(Tex.rows([
      "p=(1,1)",
      `${Tex.color(Palette.orange, "U\\text{ for }\\varepsilon,\\ \\text{then }V\\text{ for }\\varepsilon")}`,
      `${Tex.color(Palette.purple, "V\\text{ first, then }U")}`,
      `${Tex.color(Palette.red, "\\text{gap}\\approx\\varepsilon^2\\,[U,V](p)")}\\qquad \\varepsilon=${eps.toFixed(2)}:\\ \\text{gap}/\\varepsilon^2=${gapNow.toFixed(2)}`,
      "\\varepsilon=0.2,\\,0.1,\\,0.05,\\,0.025:\\ \\ 1.25,\\ 1.11,\\ 1.05,\\ 1.03",
      `[U,V](p)=(0,1)\\ \\Rightarrow\\ ${Tex.color(Palette.green, "\\text{limit }1")}`,
    ], fr));
    this.fFlow.set({ x: 1130, y: 330, opacity: (fr > 0 ? 1 : 0) * (1 - c.p(24, 0.5)) });

    // ---- coordinate fields commute (s24–s25)
    const gO = c.during(24, 26, 0.5);
    this.grid.forEach((g) => g.setOpacity(gO));
    this.gridPaths[0].setOpacity(gO * c.p(24, 0.5, 0.8));
    this.gridPaths[1].setOpacity(gO * c.p(24, 0.5, 1.6));
    const cm = Tex.count(t, [c.s(24), c.s(25)]);
    this.fCommute.setContent(Tex.rows([
      "[\\partial_i,\\partial_j]f=\\partial_i\\partial_jf-\\partial_j\\partial_if=0",
      `${Tex.color(Palette.green, "\\text{the grid squares close}")}`,
    ], cm));
    this.fCommute.set({ x: 1080, opacity: (cm > 0 ? 1 : 0) * (1 - c.p(26, 0.5)) });

    // ---- summary (s26–s27)
    const su = Tex.count(t, [c.s(26), c.s(27)]);
    this.fSummary.setContent(Tex.rows([
      "[X,Y]\\ \\text{measures how differentiation along fields fails to commute}",
      `${Tex.color(Palette.teal, "\\text{tools for the axioms: } Xf,\\ \\langle X,Y\\rangle,\\ [X,Y]")}`,
    ], su));
    this.fSummary.set({ opacity: su > 0 ? 1 : 0 });

    this.ledger.update(t, 1 - c.p(26, 0.5), true);
  }

  teardown(_layers: SceneLayers): void {}
}
