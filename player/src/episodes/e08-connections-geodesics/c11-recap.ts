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
import { TangentPlane } from "../../primitives/TangentPlane";
import { WorldLabel } from "../../primitives/WorldLabel";
import { setOrbitView } from "../e06-gradient-retraction/lib/SphereCamera";
import { RayleighSphere } from "../e07-gradient-descent/lib/RayleighSphere";
import { Tex } from "../e07-gradient-descent/lib/tex";

/**
 * E08 c11 — recap (Boumal Def 5.14, (5.1)): the chain of results, and the Riemannian Hessian Hess f(x)[u] = ∇_u grad f;
 * for the Rayleigh quotient on S², Proj_x(Au) − (xᵀAx)u, with eigenvalues 3 (along e₁) and 1 (along e₂) at e₃.
 * Sentence indices refer to content/episodes/e08-connections-geodesics/story.en.json, scene c11-recap.
 */

const E3 = new THREE.Vector3(0, 0, 1);

export class RecapScene implements Scene {
  readonly id = "c11-recap";
  private stage!: StageLayer;
  private sphere!: RayleighSphere;
  private plane!: TangentPlane;
  private dot!: Dot;
  private eig1!: Arrow;
  private eig2!: Arrow;
  private l1!: WorldLabel;
  private l2!: WorldLabel;
  private fChain!: FormulaHandle;
  private fHess!: FormulaHandle;

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);
    this.sphere = new RayleighSphere(stage);
    this.plane = new TangentPlane(stage, Palette.green, 0.75);
    this.dot = new Dot(stage, E3.clone().multiplyScalar(1.01), Palette.orange, 0.03, "3d");
    this.eig1 = new Arrow(stage, E3, E3.clone().add(new THREE.Vector3(0.6, 0, 0)), Palette.yellow, { mode: "3d", width: 5, headLength: 0.08 });
    this.eig2 = new Arrow(stage, E3, E3.clone().add(new THREE.Vector3(0, 0.2, 0)), Palette.yellow, { mode: "3d", width: 5, headLength: 0.06 });
    this.l1 = new WorldLabel(stage, fl, { tex: "3\\,e_1", size: 30, color: Palette.yellow }, E3.clone().add(new THREE.Vector3(0.6, 0, 0)), { x: 10, y: 18 });
    this.l2 = new WorldLabel(stage, fl, { tex: "1\\,e_2", size: 30, color: Palette.yellow }, E3.clone().add(new THREE.Vector3(0, 0.2, 0)), { x: 14, y: -12 });
    this.fChain = fl.add({ tex: "", x: 960, y: 430, size: 32, display: true });
    this.fHess = fl.add({ tex: "", x: 60, y: 130, size: 32, display: true, align: "left", valign: "top" });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    setOrbitView(this.stage, { azDeg: 30, elDeg: 38, distance: 5.6, fovDeg: 34, center: new THREE.Vector3(0, 0, 0.2), shift: -0.6, lift: 0.1 });

    const ch = Tex.count(t, [c.s(1), c.s(2), c.s(3), c.s(4), c.s(5), c.s(6), c.s(7), c.s(8)]);
    this.fChain.setContent(Tex.rows([
      "\\text{ch.1}\\ \\ \\ddot\\gamma\\ \\text{leaves the tangent space}",
      "\\text{ch.2}\\ \\ Xf,\\ [X,Y]=DY[X]-DX[Y]",
      "\\text{ch.3–4}\\ \\ \\text{axioms (i)–(iii)};\\ \\ \\Gamma^k_{ij}",
      "\\text{ch.5}\\ \\ \\text{compatible: lengths;\\ torsion-free: no twist}",
      `\\text{ch.6}\\ \\ \\text{Koszul}\\Rightarrow${Tex.color(Palette.yellow, "\\text{one Levi-Civita connection}")}`,
      "\\text{ch.7}\\ \\ \\nabla_vX=\\mathrm{Proj}_p\\big(D\\bar X(p)[v]\\big)",
      "\\text{ch.8–9}\\ \\ \\gamma''=0;\\ \\ \\mathrm{Exp}_x\\ \\text{a second-order retraction}",
      "\\text{ch.10}\\ \\ \\Pi_\\gamma\\ \\text{isometry, path-dependent}",
    ], ch));
    this.fChain.set({ opacity: (ch > 0 ? 1 : 0) * (1 - c.p(9, 0.6)) });

    const sO = c.p(9, 0.8);
    this.sphere.setOpacity(sO, 0.7, sO);
    this.plane.place(E3, E3);
    this.plane.setOpacity(0.6 * sO * c.p(12, 0.5));
    this.dot.setOpacity(sO);
    const eO = sO * c.p(12, 0.5);
    this.eig1.setOpacity(eO);
    this.eig2.setOpacity(eO);
    this.l1.update(eO);
    this.l2.update(eO);
    const hs = Tex.count(t, [c.s(9), c.s(10), c.s(11), c.s(12), c.s(13)]);
    this.fHess.setContent(Tex.rows([
      `&${Tex.color(Palette.yellow, "\\operatorname{Hess}f(x)[u]=\\nabla_u\\operatorname{grad}f")}`,
      "&S^2:\\ \\mathrm{Proj}_x(Au)-(x^\\top Ax)\\,u",
      `&${Tex.color(Palette.green, "\\text{the normal term of chapter 1 is gone}")}`,
      "&x=e_3:\\ \\text{eigenvalues } 1,\\ 3\\ \\ \\text{(episode 7)}",
      `&${Tex.color(Palette.teal, "\\text{next: the Hessian and Newton's method}")}`,
    ], hs, "aligned"));
    this.fHess.set({ opacity: hs > 0 ? 1 : 0 });
  }

  teardown(_layers: SceneLayers): void {}
}
