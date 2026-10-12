import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { setOrbitView } from "../e06-gradient-retraction/lib/SphereCamera";
import { RayleighSphere } from "./lib/RayleighSphere";
import { E2, arcPath, lift, rgdBacktracking, spherePoint } from "./lib/rayleigh";
import type { RgdStep } from "./lib/rayleigh";
import { Tex } from "./lib/tex";

/**
 * E07 c10 — recap (Boumal §4.6 opening, §4.9): the chain of results, RGD with backtracking from many starts on the
 * Rayleigh quotient (all reach ±e₃; a start exactly at the saddle e₂ stays), the limits, and the next tools.
 * Sentence indices refer to content/episodes/e07-gradient-descent/story.en.json, scene c10-recap.
 */

/** Starts (polar, azimuth in degrees) on the hemisphere facing the camera; four converge to +e₃, four to −e₃. */
const STARTS: [number, number][] = [[35, 30], [55, 85], [70, 45], [82, 105], [98, 35], [112, 95], [128, 55], [150, 100]];

export class RecapScene implements Scene {
  readonly id = "c10-recap";
  private stage!: StageLayer;
  private sphere!: RayleighSphere;
  private runs: RgdStep[][] = [];
  private paths: Polyline[] = [];
  private heads: Dot[] = [];
  private starts: Dot[] = [];
  private saddle!: Dot;
  private fChain!: FormulaHandle;
  private fLimits!: FormulaHandle;
  private fNext!: FormulaHandle;

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);
    this.sphere = new RayleighSphere(stage);
    for (const [p, a] of STARTS) {
      const run = rgdBacktracking(spherePoint(p, a), 25, { tau: 0.5, r: 1e-4, l0: 0.6 });
      this.runs.push(run);
      this.paths.push(new Polyline(stage, arcPath(run.map((s) => s.x)), { color: Palette.orange, width: 3 }));
      this.heads.push(new Dot(stage, run[0].x, Palette.orange, 0.026, "3d"));
      this.starts.push(new Dot(stage, lift(run[0].x, 1.014), Palette.yellow, 0.02, "3d"));
    }
    this.saddle = new Dot(stage, lift(E2, 1.02), Palette.red, 0.035, "3d");
    this.fChain = fl.add({ tex: "", x: 960, y: 430, size: 36, display: true });
    this.fLimits = fl.add({ tex: "", x: 1350, y: 430, size: 30, display: true });
    this.fNext = fl.add({ tex: "", x: 960, y: 430, size: 36, display: true });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    setOrbitView(this.stage, { azDeg: 55 + 12 * c.over(9, 0, 1) + 8 * c.over(10, 0, 1), elDeg: 8, distance: 5.0, fovDeg: 34, center: new THREE.Vector3(0, 0, 0), shift: 0, lift: -0.05 });

    const ch = Tex.count(t, [c.s(1), c.s(2), c.s(3), c.s(4), c.s(5), c.s(6), c.s(7), c.s(8)]);
    this.fChain.setContent(Tex.rows([
      "\\text{ch.2}\\ \\ f(R_x(s))=f(x)+\\langle\\operatorname{grad}f(x),s\\rangle+O(\\|s\\|^2)",
      "\\text{ch.3}\\ \\ \\text{local min}\\Rightarrow\\text{critical}\\iff\\operatorname{grad}f=0",
      "\\text{ch.4}\\ \\ \\text{A4.1+A4.2}\\Rightarrow\\min_{k<K}\\|\\operatorname{grad}f(x_k)\\|=O(1/\\sqrt K)",
      "\\text{ch.5}\\ \\ \\text{A4.3}:\\ \\alpha\\in(0,2/L)\\Rightarrow\\text{A4.2}",
      "\\alpha=\\tfrac1L:\\ K\\ge2L(f(x_0)-f_{\\mathrm{low}})/\\varepsilon^2",
      "\\text{ch.6}\\ \\ \\text{backtracking: same guarantee, no } L",
      "\\text{ch.7}\\ \\ \\operatorname{Hess}\\succ0:\\ \\text{linear, factor } 1-1/\\kappa",
      "\\text{ch.8–9}\\ \\ \\text{adjoints, projection; slope and tangency checks}",
    ], ch));
    this.fChain.set({ opacity: (ch > 0 ? 1 : 0) * (1 - c.p(9, 0.6)) });

    const sO = c.p(9, 0.8) * (1 - c.p(11, 0.6));
    this.sphere.setOpacity(sO, 1, sO);
    this.runs.forEach((run, i) => {
      const n = Math.min(run.length, 2 + Math.floor(c.over(9, 0.05, 0.95) * (run.length - 2)));
      this.paths[i].setPoints(arcPath(run.slice(0, n).map((s) => s.x)));
      this.paths[i].setOpacity(sO);
      this.heads[i].setPosition(lift(run[n - 1].x, 1.016));
      this.heads[i].setOpacity(sO);
      this.starts[i].setOpacity(sO);
    });
    this.saddle.setOpacity(sO * c.p(10, 0.5));

    const lm = Tex.count(t, [c.s(11), c.s(12)]);
    this.fLimits.setContent(Tex.rows([
      "1/\\sqrt K:\\ \\text{worst case, attained even in } \\mathbb R^n",
      "\\kappa\\ \\text{large}\\Rightarrow1-1/\\kappa\\approx1:\\ \\text{slow}",
    ], lm));
    this.fLimits.set({ x: 960, opacity: (lm > 0 ? 1 : 0) * (1 - c.p(13, 0.5)) });
    const nx = Tex.count(t, [c.s(13), c.s(14), c.s(15), c.s(16)]);
    this.fNext.setContent(Tex.rows([
      "\\text{CG, BFGS: combine several iterates}",
      `\\Rightarrow\\ ${Tex.color(Palette.teal, "\\text{vector transport}")}`,
      `\\text{Newton, trust regions}\\ \\Rightarrow\\ ${Tex.color(Palette.yellow, "\\text{Riemannian Hessian}")}`,
      "\\text{the next tools to build}",
    ], nx));
    this.fNext.set({ opacity: nx > 0 ? 1 : 0 });
  }

  teardown(_layers: SceneLayers): void {}
}
