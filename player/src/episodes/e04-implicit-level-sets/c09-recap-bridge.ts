import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { lerp } from "../../primitives/Easing";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Polyline, sampleCurve } from "../../primitives/Polyline";
import { Surface, sphereFn } from "../../primitives/Surface";
import { TangentPlane } from "../../primitives/TangentPlane";
import { FlatPatch } from "./lib/FlatPatch";
import { Tex } from "./lib/Tex";

/**
 * E04 c09 — recap: the five-step chain, the two-step recipe, and the bridge to tangent spaces
 * (graph parametrization ψ on S², coordinate lines lifted to curves whose velocities are tangent arrows).
 * Full width (no ledger). Sentence indices refer to content/episodes/e04-implicit-level-sets/story.en.json, scene c09-recap-bridge.
 */

const P = new THREE.Vector3(0.3, 0.18, Math.sqrt(1 - 0.09 - 0.0324));
const v3 = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const g = (x: number, y: number): number => Math.sqrt(Math.max(0, 1 - x * x - y * y));
const NODE_X = [210, 570, 930, 1290, 1650];

export class RecapBridgeScene implements Scene {
  readonly id = "c09-recap-bridge";
  private stage!: StageLayer;

  private nodes: FormulaHandle[] = [];
  private links: FormulaHandle[] = [];
  private linkLabels: FormulaHandle[] = [];
  private cards: FormulaHandle[] = [];
  private limits!: FormulaHandle;
  private sphere!: Surface;
  private patch!: FlatPatch;
  private coordLines: Polyline[] = [];
  private pDot!: Dot;
  private tangents: Arrow[] = [];
  private plane!: TangentPlane;
  private texts: FormulaHandle[] = [];

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    const nodeTex = [
      "\\begin{gathered}\\text{invertible}\\\\ \\text{derivative}\\end{gathered}",
      "\\begin{gathered}\\text{local}\\\\ \\text{inverse}\\end{gathered}",
      "\\begin{gathered}\\text{implicit}\\\\ \\text{graph}\\end{gathered}",
      "\\begin{gathered}\\text{local}\\\\ \\text{chart}\\end{gathered}",
      "\\begin{gathered}\\text{regular level set}\\\\ \\text{is a manifold}\\end{gathered}",
    ];
    this.nodes = nodeTex.map((tex, i) => fl.add({ tex, x: NODE_X[i], y: 300, size: 34, boxed: true, display: true }));
    this.links = [0, 1, 2, 3].map((i) => fl.add({ tex: "\\Longrightarrow", x: (NODE_X[i] + NODE_X[i + 1]) / 2, y: 300, size: 44, color: Palette.muted }));
    const linkTex = ["\\text{inverse fn. thm}", "F(x,y)=(x,f)", "\\text{forget } y", "\\text{regularity}"];
    this.linkLabels = linkTex.map((tex, i) => fl.add({ tex, x: (NODE_X[i] + NODE_X[i + 1]) / 2, y: 445, size: 26, color: Palette.orange }));
    this.cards = [
      fl.add({ tex: "\\begin{gathered}\\textbf{1.}\\ \\text{differentiate the equations}\\\\ \\text{check } \\operatorname{rank}Dh=k \\text{ on } h^{-1}(c)\\end{gathered}", x: 640, y: 600, size: 34, boxed: true, display: true }),
      fl.add({ tex: "\\begin{gathered}\\textbf{2.}\\ \\text{take the kernel of } Dh(p)\\\\ \\text{(next episode)}\\end{gathered}", x: 1280, y: 600, size: 34, boxed: true, display: true }),
    ];
    this.limits = fl.add({ tex: `\\text{regularity: sufficient, not necessary}\\qquad \\text{regular level sets may be disconnected}`, x: 960, y: 780, size: 32, color: Palette.muted });

    this.sphere = new Surface(stage, sphereFn(1), Palette.blue, { wireframe: true, opacity: 0.4, isoU: 24, isoV: 12 });
    this.patch = new FlatPatch(stage, (u, v, target) => {
      const x = lerp(-0.15, 0.75, u);
      const y = lerp(-0.25, 0.6, v);
      target.set(x, y, g(x, y) + 0.008);
    }, Palette.green);
    this.coordLines = [
      new Polyline(stage, sampleCurve((x) => v3(x, P.y, g(x, P.y) + 0.012), -0.15, 0.75, 40), { color: Palette.orange, width: 3 }),
      new Polyline(stage, sampleCurve((y) => v3(P.x, y, g(P.x, y) + 0.012), -0.25, 0.6, 40), { color: Palette.purple, width: 3 }),
    ];
    this.pDot = new Dot(stage, P, Palette.yellow, 0.04, "3d");
    const d1 = v3(1, 0, -P.x / P.z).normalize().multiplyScalar(0.55);
    const d2 = v3(0, 1, -P.y / P.z).normalize().multiplyScalar(0.55);
    this.tangents = [
      new Arrow(stage, P, P.clone().add(d1), Palette.orange, { mode: "3d", width: 4, headLength: 0.12, depthTest: false }),
      new Arrow(stage, P, P.clone().add(d2), Palette.purple, { mode: "3d", width: 4, headLength: 0.12, depthTest: false }),
    ];
    this.plane = new TangentPlane(stage, Palette.teal, 0.6);
    this.plane.place(P, P.clone().normalize());
    this.texts = [
      fl.add({ tex: "\\psi(x)=(x,\\,g(x))", x: 1300, y: 260, size: 40, color: Palette.green }),
      fl.add({ tex: `D\\psi(x)=\\begin{pmatrix}I\\\\ Dg(x)\\end{pmatrix}\\ \\text{injective}`, x: 1300, y: 380, size: 36, display: true }),
      fl.add({ tex: `${Tex.color(Palette.orange, "\\partial_1\\psi(a)")},\\ ${Tex.color(Palette.purple, "\\partial_2\\psi(a)")}:\\ \\text{tangent arrows at } p`, x: 1300, y: 500, size: 34 }),
      fl.add({ tex: `\\text{next: they span } T_pM,\\ \\ ${Tex.color(Palette.teal, "T_pM=\\ker Dh(p)")}`, x: 1300, y: 600, size: 34 }),
      fl.add({ tex: "O(n):\\ \\ R^\\top R-I\\ \\to\\ \\text{expand}\\ \\to\\ \\text{linear term}\\ \\to\\ \\text{onto?}", x: 1300, y: 700, size: 32, color: Palette.yellow }),
      fl.add({ text: "Next: Tangent Spaces", x: 960, y: 90, size: 44, color: Palette.text, weight: 600 }),
    ];
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;

    const az = -0.72 + 0.06 * Math.sin(0.05 * t);
    const pos = v3(6.6 * Math.cos(az), 6.6 * Math.sin(az), 3.4);
    const target = v3(0.2, 0.1, 0.0);
    const right = target.clone().sub(pos).cross(v3(0, 0, 1)).normalize().multiplyScalar(1.6);
    this.stage.setView3D(pos.add(right), target.add(right), 34);

    // Chain (s0–s8)
    const chainOut = 1 - c.p(9, 0.6);
    for (let i = 0; i < 5; i++) {
      const on = i === 0 ? c.p(0, 0.6, 0.6) : c.p(i, 0.6, i === 1 ? 0 : 0.8);
      this.nodes[i].set({ opacity: on * chainOut, color: t >= c.s(5) ? Palette.text : on > 0.5 && t < c.s(i + 1) ? Palette.yellow : Palette.text });
    }
    for (let i = 0; i < 4; i++) {
      const on = c.p(i + 1, 0.6, 0.4);
      this.links[i].set({ opacity: on * chainOut });
      this.linkLabels[i].set({ opacity: on * chainOut });
    }
    this.cards[0].set({ opacity: c.p(6, 0.6) * chainOut });
    this.cards[1].set({ opacity: 0.55 * c.p(7, 0.6) * chainOut });
    this.limits.set({ opacity: c.p(8, 0.6) * chainOut });

    // Bridge (s9–s13)
    const bridge = c.p(9, 0.8);
    this.sphere.setOpacity(bridge);
    this.patch.setOpacity(0.45 * bridge);
    this.coordLines.forEach((l) => { l.setOpacity(bridge * c.p(11, 0.6)); l.setProgress(c.over(11, 0.0, 0.5)); });
    this.pDot.setOpacity(bridge);
    this.tangents.forEach((a) => a.setOpacity(bridge * c.p(11, 0.6, 1.5)));
    this.plane.setOpacity(bridge * c.p(12, 0.8) * 0.8);
    this.texts[0].set({ opacity: bridge * c.p(9, 0.6, 0.6) });
    this.texts[1].set({ opacity: bridge * c.p(10, 0.6) });
    this.texts[2].set({ opacity: bridge * c.p(11, 0.6, 1.5) });
    this.texts[3].set({ opacity: bridge * c.p(12, 0.6) });
    this.texts[4].set({ opacity: bridge * c.p(13, 0.6) });
    this.texts[5].set({ opacity: bridge * c.p(12, 0.6, 0.5) });
  }

  teardown(_layers: SceneLayers): void {}
}
