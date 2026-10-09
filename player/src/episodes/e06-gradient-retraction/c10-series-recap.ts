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
import { Polyline, sampleCurve } from "../../primitives/Polyline";
import { TangentPlane } from "../../primitives/TangentPlane";
import { HeightSphere } from "./lib/HeightSphere";
import { setOrbitView } from "./lib/SphereCamera";
import type { SvgPath } from "./lib/SvgOverlay";
import { SvgOverlay } from "./lib/SvgOverlay";
import { X0, heightGrad, lift, normalizeRetract } from "./lib/sphereMath";

/**
 * E06 c10 — series recap: the dependency tree of docs/knowledge-map.md lit bottom-up (E01 → E06),
 * the two branches (grad f and R_x) meeting in x ↦ R_x(−t grad f(x)), the step on the sphere,
 * the course frontier, and the next topic.
 * Sentence indices refer to content/episodes/e06-gradient-retraction/story.en.json, scene c10-series-recap.
 */

interface TreeNode {
  id: string;
  tex: string;
  x: number;
  y: number;
  /** Sentence at which the node lights up. */
  lit: number;
  why?: string;
  branch: "trunk" | "grad" | "retr" | "both" | "top";
}

const NODES: TreeNode[] = [
  { id: "top", tex: "x\\ \\mapsto\\ R_x(-t\\,\\operatorname{grad}f(x))", x: 960, y: 90, lit: 11, branch: "top" },
  { id: "grad", tex: "\\operatorname{grad}f(x)=(df_x)^\\sharp", x: 720, y: 200, lit: 6, branch: "grad" },
  { id: "retr", tex: "R_x:\\ R_x(0)=x,\\ d(R_x)_0=\\mathrm{id}", x: 1220, y: 200, lit: 7, branch: "retr" },
  { id: "df", tex: "df_x[\\gamma'(0)]=(f\\circ\\gamma)'(0)", x: 1000, y: 305, lit: 6, branch: "both" },
  { id: "riesz", tex: "\\text{Riesz},\\ \\ g_x", x: 560, y: 305, lit: 6, branch: "grad" },
  { id: "e05", tex: "\\text{E05: } T_xM=\\ker Dh(x)", x: 960, y: 410, lit: 5, why: "legal directions are computable", branch: "both" },
  { id: "e04", tex: "\\text{E04: implicit function thm.} \\Rightarrow \\text{regular level sets}", x: 960, y: 510, lit: 4, why: "equations define manifolds", branch: "trunk" },
  { id: "e03", tex: "\\text{E03: inverse function theorem}", x: 960, y: 605, lit: 3, why: "invertible derivative ⇒ local inverse", branch: "trunk" },
  { id: "e02", tex: "\\text{E02: charts, smooth atlases}", x: 960, y: 700, lit: 2, why: "calculus on M, coordinate-free", branch: "trunk" },
  { id: "e01", tex: "\\text{E01: topology}", x: 960, y: 795, lit: 1, why: "nearness without coordinates", branch: "trunk" },
];

const EDGES: [string, string][] = [
  ["e01", "e02"], ["e02", "e03"], ["e03", "e04"], ["e04", "e05"],
  ["e05", "df"], ["e05", "riesz"], ["e05", "retr"],
  ["df", "grad"], ["riesz", "grad"], ["df", "retr"],
  ["grad", "top"], ["retr", "top"],
];

function nodeById(id: string): TreeNode {
  const n = NODES.find((k) => k.id === id);
  if (!n) throw new Error(`unknown node ${id}`);
  return n;
}

export class SeriesRecapScene implements Scene {
  readonly id = "c10-series-recap";
  private stage!: StageLayer;

  private svg!: SvgOverlay;
  private edges: { path: SvgPath; from: TreeNode; to: TreeNode }[] = [];
  private nodes: { h: FormulaHandle; n: TreeNode }[] = [];
  private whys: { h: FormulaHandle; n: TreeNode }[] = [];
  private thisEp!: FormulaHandle;

  private sphere!: HeightSphere;
  private plane!: TangentPlane;
  private xDot!: Dot;
  private gArrow!: Arrow;
  private curve!: Polyline;
  private mover!: Dot;

  private frontier!: FormulaHandle;
  private open!: FormulaHandle;
  private next!: FormulaHandle;

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    this.sphere = new HeightSphere(stage);
    this.plane = new TangentPlane(stage, Palette.green, 0.7);
    this.plane.place(X0, X0);
    this.xDot = new Dot(stage, X0, Palette.orange, 0.034, "3d");
    const g = heightGrad(X0);
    this.gArrow = new Arrow(stage, X0, X0.clone().sub(g), "#ffffff", { mode: "3d", width: 6, headLength: 0.1 });
    this.curve = new Polyline(stage, sampleCurve((s) => lift(normalizeRetract(X0, g.clone().multiplyScalar(-s))), 0, 1.0, 60), { color: "#ffffff", width: 4 });
    this.mover = new Dot(stage, X0, Palette.orange, 0.04, "3d");

    this.svg = new SvgOverlay(fl);
    for (const [a, b] of EDGES) {
      const from = nodeById(a);
      const to = nodeById(b);
      const path = this.svg.path({ color: Palette.grid, width: 3 });
      path.setPoints([{ x: from.x, y: from.y - 18 }, { x: to.x, y: to.y + 18 }]);
      this.edges.push({ path, from, to });
    }
    for (const n of NODES) {
      this.nodes.push({ h: fl.add({ tex: n.tex, x: n.x, y: n.y, size: n.id === "top" ? 34 : 28, boxed: true }), n });
      if (n.why) this.whys.push({ h: fl.add({ text: n.why, x: 1320, y: n.y, size: 24, color: Palette.muted, align: "left" }), n });
    }
    this.thisEp = fl.add({ text: "E06", x: 330, y: 250, size: 30, color: Palette.yellow, weight: 700 });

    this.frontier = fl.add({ tex: "\\begin{gathered}\\text{course frontier:}\\\\ \\text{retraction}\\ +\\ \\varphi'(0)=-\\|\\operatorname{grad}f(x)\\|_x^2\\end{gathered}", x: 1400, y: 300, size: 34, display: true });
    this.open = fl.add({ text: "open: step size · iteration · convergence", x: 1400, y: 450, size: 30, color: Palette.muted });
    this.next = fl.add({ text: "Next: Riemannian gradient descent", x: 1400, y: 600, size: 44, color: Palette.yellow, weight: 700 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const tree = c.p(0, 0.6, -0.4) * (1 - c.p(12, 0.8));
    const in3D = t >= c.s(12) - 0.05;
    if (in3D) setOrbitView(this.stage, { azDeg: 80, elDeg: 18, distance: 6.4, fovDeg: 36, center: new THREE.Vector3(0, 0, 0.05), shift: 1.2, lift: -0.1 });
    else this.stage.setView2D(0, 0, 9);

    const branchOn = (b: TreeNode["branch"]): number => {
      const gradHi = c.p(9, 0.5) * (1 - c.p(10, 0.5));
      const retrHi = c.p(10, 0.5) * (1 - c.p(11, 0.5));
      if (b === "grad") return gradHi;
      if (b === "retr") return retrHi;
      if (b === "both") return Math.max(gradHi, retrHi);
      if (b === "top") return c.p(11, 0.5);
      return 0;
    };
    const merging = t >= c.s(8) && t < c.s(12);
    for (const { h, n } of this.nodes) {
      const lit = c.p(n.lit, 0.6);
      const hi = branchOn(n.branch);
      const dimTrunk = merging && n.branch === "trunk" ? 0.45 : 1;
      h.set({ opacity: tree * (0.25 + 0.75 * lit) * dimTrunk, color: hi > 0.5 ? Palette.yellow : lit > 0.5 ? Palette.text : Palette.muted });
    }
    for (const { h, n } of this.whys) h.set({ opacity: tree * c.p(n.lit, 0.6, 0.8) * (merging ? 0.3 : 1) });
    this.thisEp.set({ opacity: tree * c.p(6, 0.6) * (merging ? 0.3 : 1) });
    for (const e of this.edges) {
      const lit = Math.min(c.p(e.from.lit, 0.6), c.p(e.to.lit, 0.6));
      const toHi = branchOn(e.to.branch) > 0.5 && (branchOn(e.from.branch) > 0.5 || e.to.branch === "top");
      e.path.setColor(toHi ? Palette.yellow : lit > 0.5 ? Palette.axis : Palette.grid);
      e.path.setOpacity(tree * (0.4 + 0.6 * lit));
    }

    // the step on the sphere (s12–s16)
    const sph = in3D ? c.p(12, 0.8) : 0;
    this.sphere.setOpacity(sph);
    this.plane.setOpacity(sph);
    this.xDot.setOpacity(sph);
    this.gArrow.setOpacity(sph * c.p(12, 0.5, 0.6));
    const prog = c.over(12, 0.3, 0.95);
    this.curve.setProgress(prog);
    this.curve.setOpacity(prog > 0.01 ? sph : 0);
    const g = heightGrad(X0);
    this.mover.setPosition(lift(normalizeRetract(X0, g.clone().multiplyScalar(-prog)), 1.012));
    this.mover.setOpacity(sph * (prog > 0.01 ? 1 : 0));

    this.frontier.set({ opacity: c.p(14, 0.6) });
    this.open.set({ opacity: c.p(15, 0.6) });
    this.next.set({ opacity: c.p(16, 0.8) });
  }

  teardown(_layers: SceneLayers): void {}
}
