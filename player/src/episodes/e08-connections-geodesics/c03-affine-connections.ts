import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { Palette } from "../../primitives/Palette";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Tex } from "../e07-gradient-descent/lib/tex";
import { ArrowField2D, gridPoints } from "./lib/ArrowField2D";

/**
 * E08 c03 — affine connections (lecture pp. 25–26; Boumal §5.2, §5.3, Def 5.20, §5.6): the three properties of the
 * ordinary derivative, the three axioms, why (i) makes ∇ pointwise in the direction and (iii) makes it a derivative,
 * the counterexample DY[X] + (div X)Y, the Euclidean connection, and ∇ + B for tensorial B.
 * Sentence indices refer to content/episodes/e08-connections-geodesics/story.en.json, scene c03-affine-connections.
 */

const P = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(x, y, 0);
const PT = new THREE.Vector2(0.3, 0.4);
const X1 = (): THREE.Vector2 => new THREE.Vector2(1, 0.5);
const X2 = (p: THREE.Vector2): THREE.Vector2 => new THREE.Vector2(1 - 0.45 * (p.y - PT.y), 0.5 + 0.6 * (p.x - PT.x));
/** Y(x, y) = (x², xy); at p = (0.6, 0.4) with X = (1, 0.5): DY[X] = (1.2, 0.7), ⟨X,Y⟩ = 0.48, X¹Y² = 0.24. */
const DYX = new THREE.Vector2(1.2, 0.7);
const SCALE = 0.6;

export class AffineConnectionsScene implements Scene {
  readonly id = "c03-affine-connections";
  private stage!: StageLayer;

  private fieldA!: ArrowField2D;
  private fieldB!: ArrowField2D;
  private pDot!: Dot;
  private result!: Arrow;
  private many: Arrow[] = [];
  private manyLabels: FormulaHandle[] = [];

  private fEuclid!: FormulaHandle;
  private fAxioms!: FormulaHandle;
  private fPoint!: FormulaHandle;
  private fCheck!: FormulaHandle;
  private fMany!: FormulaHandle;
  private fEnd!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;

    const pts = gridPoints(-0.3, 1.6, -0.6, 1.5, 5, 5);
    this.fieldA = new ArrowField2D(stage, pts, X1, Palette.blue, 0.32);
    this.fieldB = new ArrowField2D(stage, pts, X2, Palette.purple, 0.32);
    this.pDot = new Dot(stage, P(PT.x, PT.y), Palette.orange, 0.05);
    this.result = new Arrow(stage, P(PT.x, PT.y), P(PT.x + SCALE * DYX.x, PT.y + SCALE * DYX.y), Palette.yellow, { width: 5, headLength: 0.12 });
    const vals: [THREE.Vector2, string, string][] = [
      [DYX, "#ffffff", "DY[X]"],
      [new THREE.Vector2(1.2, 0.7 + 0.48), Palette.purple, "+\\langle X,Y\\rangle a"],
      [new THREE.Vector2(1.2 + 0.24, 0.7 - 0.24), Palette.red, "+X^1Y^2\\,b"],
    ];
    for (const [v, color, tex] of vals) {
      this.many.push(new Arrow(stage, P(PT.x, PT.y), P(PT.x + SCALE * v.x, PT.y + SCALE * v.y), color, { width: 5, headLength: 0.12 }));
      this.manyLabels.push(fl.add({ tex, x: 0, y: 0, size: 28, color, align: "left" }));
    }

    this.fEuclid = fl.add({ tex: "", x: 960, y: 420, size: 34, display: true });
    this.fAxioms = fl.add({ tex: "", x: 960, y: 420, size: 34, display: true });
    this.fPoint = fl.add({ tex: "", x: 1100, y: 420, size: 32, display: true });
    this.fCheck = fl.add({ tex: "", x: 960, y: 420, size: 34, display: true });
    this.fMany = fl.add({ tex: "", x: 1100, y: 420, size: 32, display: true });
    this.fEnd = fl.add({ tex: "", x: 960, y: 430, size: 36, display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "i", tex: "\\nabla_{fX+gY}Z=f\\nabla_XZ+g\\nabla_YZ", at: cue.e(8) },
      { label: "ii", tex: "\\nabla_X(aY+bZ)=a\\nabla_XY+b\\nabla_XZ", at: cue.e(10) },
      { label: "iii", tex: "\\nabla_X(fY)=f\\nabla_XY+(Xf)Y", at: cue.e(11) },
      { label: "4", tex: "\\nabla+B\\ \\text{is a connection}", at: cue.e(24) },
    ], { x: 1440, y: 210, width: 460, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    this.stage.setView2D(2.25, 0.45, 3.2);

    // ---- the ordinary derivative (s0–s4)
    const eu = Tex.count(t, [c.s(0), c.s(1), c.s(2), c.s(3), c.s(4)]);
    this.fEuclid.setContent(Tex.rows([
      "\\text{linear space: } DV(x)[u]",
      "1.\\ \\ DV(x)[au+bw]=a\\,DV(x)[u]+b\\,DV(x)[w]",
      "2.\\ \\ D(aV+bW)(x)[u]=a\\,DV(x)[u]+b\\,DW(x)[u]",
      "3.\\ \\ D(fV)(x)[u]=Df(x)[u]\\,V(x)+f(x)\\,DV(x)[u]",
      `${Tex.color(Palette.teal, "\\text{a connection keeps exactly these as axioms}")}`,
    ], eu));
    this.fEuclid.set({ opacity: (eu > 0 ? 1 : 0) * (1 - c.p(5, 0.5)) });

    // ---- the axioms (s5–s14)
    const ax = Tex.count(t, [c.s(5), c.s(6), c.s(7), c.s(8), c.s(9), c.s(10), c.s(11), c.s(12), c.s(13), c.s(14)]);
    const lb = c.p(13, 0.5) > 0.5;
    this.fAxioms.setContent(Tex.rows([
      "\\nabla:\\ \\mathfrak X(M)\\times\\mathfrak X(M)\\to\\mathfrak X(M),\\quad (X,Y)\\mapsto\\nabla_XY",
      `${Tex.color(Palette.muted, "\\text{the derivative of } Y \\text{ in the direction } X")}`,
      "\\text{(i) } C^\\infty\\text{-linear in the direction}",
      "\\nabla_{fX+gY}Z=f\\,\\nabla_XZ+g\\,\\nabla_YZ,\\quad f,g\\in C^\\infty(M)",
      "\\text{(ii) } \\mathbb R\\text{-linear in the field being differentiated}",
      "\\nabla_X(aY+bZ)=a\\,\\nabla_XY+b\\,\\nabla_XZ,\\quad a,b\\in\\mathbb R",
      `\\text{(iii) Leibniz:}\\ \\ \\nabla_X(fY)=f\\,\\nabla_XY+${lb ? Tex.color(Palette.yellow, "(Xf)\\,Y") : "(Xf)\\,Y"}`,
      `${Tex.color(Palette.muted, "\\text{direction: functions come out;\\ field: only constants}")}`,
      `${Tex.color(Palette.yellow, "(Xf)\\,Y\\ \\text{makes}\\ \\nabla\\ \\text{a derivative}")}`,
      `${Tex.color(Palette.red, "\\nabla\\equiv0\\ \\text{satisfies (i), (ii) but differentiates nothing}")}`,
    ], ax));
    this.fAxioms.set({ opacity: (ax > 0 ? 1 : 0) * (1 - c.p(15, 0.5)) });

    // ---- pointwise in the direction (s15–s19)
    const pO = c.during(15, 20, 0.5);
    this.fieldA.setOpacity(pO * c.p(16, 0.5));
    this.fieldB.setOpacity(pO * c.p(16, 0.5, 0.8));
    this.pDot.setOpacity(pO);
    this.result.setOpacity(pO * c.p(17, 0.5));
    const pr = Tex.count(t, [c.s(15), c.s(16), c.s(17), c.s(18), c.s(19)]);
    this.fPoint.setContent(Tex.rows([
      "(\\nabla_XY)(p)\\ \\text{depends only on } X(p)",
      `${Tex.color(Palette.blue, "X_1")}(p)=${Tex.color(Palette.purple, "X_2")}(p)\\ \\Rightarrow\\ \\nabla_{X_1}Y(p)=\\nabla_{X_2}Y(p)`,
      `\\Rightarrow\\ ${Tex.color(Palette.yellow, "\\nabla_vY,\\ \\ v\\in T_pM")}`,
      `${Tex.color(Palette.red, "\\mathbb R^n:\\ DY[X]+(\\operatorname{div}X)\\,Y\\ \\text{obeys (ii), (iii)}")}`,
      `${Tex.color(Palette.red, "X\\to fX\\ \\text{adds } (Xf)\\,Y:\\ \\text{not pointwise}")}`,
    ], pr));
    this.fPoint.set({ x: 1110, opacity: (pr > 0 ? 1 : 0) * (1 - c.p(20, 0.5)) });

    // ---- the Euclidean connection (s20–s22)
    const ck = Tex.count(t, [c.s(20), c.s(21), c.in(21, 0.5), c.s(22)]);
    this.fCheck.setContent(Tex.rows([
      `${Tex.color(Palette.green, "\\mathbb R^n:\\ \\nabla_XY=DY[X]\\ \\text{is a connection}")}`,
      "D(fY)[X]=Df[X]\\,Y+f\\,DY[X]",
      "=(Xf)\\,Y+f\\,DY[X]\\ \\ \\checkmark",
      `${Tex.color(Palette.muted, "\\text{but far from the only one}")}`,
    ], ck));
    this.fCheck.set({ opacity: (ck > 0 ? 1 : 0) * (1 - c.p(23, 0.5)) });

    // ---- many connections (s23–s27)
    const mO = c.during(23, 28, 0.5);
    this.pDot.setOpacity(Math.max(pO, mO));
    const mo = [c.p(23, 0.5), c.p(26, 0.5), c.p(27, 0.5)];
    this.many.forEach((a, i) => a.setOpacity(mO * mo[i]));
    const tips = [DYX, new THREE.Vector2(1.2, 1.18), new THREE.Vector2(1.44, 0.46)];
    this.manyLabels.forEach((l, i) => {
      const q = this.stage.project(P(PT.x + SCALE * tips[i].x, PT.y + SCALE * tips[i].y));
      l.set({ x: q.x + 16, y: q.y + (i === 2 ? 22 : -10), opacity: mO * mo[i] });
    });
    const mr = Tex.count(t, [c.s(23), c.s(24), c.s(25), c.s(25), c.s(26), c.s(27)]);
    this.fMany.setContent(Tex.rows([
      "B(X,Y)\\ \\ C^\\infty\\text{-linear in both slots}",
      `\\Rightarrow\\ ${Tex.color(Palette.green, "\\nabla+B\\ \\text{is a connection}")}`,
      "B(X,fY)=f\\,B(X,Y):\\ \\text{no new term}",
      "\\mathbb R^3:\\ DY[X]+X\\times Y",
      `${Tex.color(Palette.purple, "\\mathbb R^2:\\ DY[X]+\\langle X,Y\\rangle a")}`,
      "\\text{same } X,Y\\text{: three answers}",
    ], mr));
    this.fMany.set({ x: 1150, opacity: (mr > 0 ? 1 : 0) * (1 - c.p(28, 0.5)) });

    const en = Tex.count(t, [c.s(28), c.s(29)]);
    this.fEnd.setContent(Tex.rows([
      "\\text{the axioms do not single out a derivative;\\ the metric will}",
      `${Tex.color(Palette.teal, "\\text{next: a connection in coordinates}")}`,
    ], en));
    this.fEnd.set({ opacity: en > 0 ? 1 : 0 });

    this.ledger.update(t, 1 - c.p(28, 0.5), true);
  }

  teardown(_layers: SceneLayers): void {}
}
