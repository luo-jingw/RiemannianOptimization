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
import { ProofLedger } from "../../primitives/ProofLedger";
import { Surface, sphereFn } from "../../primitives/Surface";
import { Anchor } from "./lib/Anchor";
import { FlatPatch } from "./lib/FlatPatch";
import { SphereCharts } from "./lib/SphereCharts";
import { Tex } from "./lib/Tex";
import { WireBox } from "./lib/WireBox";

/**
 * E04 c06 — proof of the regular level-set theorem, drawn on S² = h⁻¹(1), h(x) = xᵀx (n = 3, k = 1).
 * Chart 1 near p₁ (upper part): solve for x₃, project to the (x₁, x₂)-plane drawn below the sphere at z = Z_A.
 * Chart 2 near p₂ (near the equator): solve for x₁, project to the (x₂, x₃)-plane drawn beside the sphere at x = X_A.
 * Sentence indices refer to content/episodes/e04-implicit-level-sets/story.en.json, scene c06-level-set-theorem.
 */

const LEFT_CENTER_X = 750;
const GOLD = Palette.yellow;
const Z_A = -1.3;                       // height of the chart-1 coordinate plane
const X_A = 1.75;                        // position of the chart-2 coordinate plane
const A1 = { x0: -0.15, x1: 0.75, y0: -0.25, y1: 0.6 };      // chart-1 domain in (x₁, x₂)
const A2 = { y0: 0.25, y1: 0.85, z0: -0.15, z1: 0.45 };      // chart-2 domain in (x₂, x₃)
const P1 = new THREE.Vector3(0.3, 0.18, Math.sqrt(1 - 0.09 - 0.0324));
const P2 = new THREE.Vector3(Math.sqrt(1 - 0.3025 - 0.0225), 0.55, 0.15);
const v3 = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const g1 = (x: number, y: number): number => Math.sqrt(Math.max(0, 1 - x * x - y * y));

export class LevelSetTheoremScene implements Scene {
  readonly id = "c06-level-set-theorem";
  private stage!: StageLayer;
  private anchor!: Anchor;

  private theorem!: FormulaHandle;
  private topology!: FormulaHandle;
  private sphere!: Surface;
  private p1Dot!: Dot;
  private p1Label!: FormulaHandle;
  private rankLine!: FormulaHandle;
  private splitLine!: FormulaHandle;
  private fLine!: FormulaHandle;
  private box1!: WireBox;
  private patch1!: FlatPatch;
  private plane1!: FlatPatch;
  private plane1Label!: FormulaHandle;
  private verticals: Polyline[] = [];
  private grid1: { pts: [number, number][]; line: Polyline }[] = [];
  private graphLine!: FormulaHandle;
  private phiArrow!: Arrow;
  private psiArrow!: Arrow;
  private phiLabel!: FormulaHandle;
  private psiLabel!: FormulaHandle;
  private phiDef!: FormulaHandle;
  private psiDef!: FormulaHandle;
  private checks!: FormulaHandle;
  private chartNote!: FormulaHandle;
  private count!: FormulaHandle;

  private p2Dot!: Dot;
  private p2Label!: FormulaHandle;
  private equator!: Polyline;
  private equatorLabel!: FormulaHandle;
  private box2!: WireBox;
  private patch2!: FlatPatch;
  private plane2!: FlatPatch;
  private plane2Label!: FormulaHandle;
  private moverA1!: Dot;
  private moverM!: Dot;
  private moverA2!: Dot;
  private moverLinks: Polyline[] = [];
  private transition!: FormulaHandle;
  private embedded!: FormulaHandle;
  private cover: FlatPatch[] = [];
  private machine!: FormulaHandle;
  private hypothesisNote!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    this.anchor = new Anchor(stage);
    addStandardLights(stage);

    this.theorem = fl.add({
      tex: "\\begin{gathered}U\\subseteq\\mathbb{R}^n\\ \\text{open},\\quad h:U\\to\\mathbb{R}^k\\ \\text{smooth},\\quad c\\ \\text{a regular value}\\\\ \\Downarrow\\\\ M=h^{-1}(c)\\ \\text{is a smooth embedded submanifold of } \\mathbb{R}^n,\\ \\dim M=n-k\\end{gathered}",
      x: LEFT_CENTER_X, y: 420, size: 40, boxed: true, display: true,
    });
    this.topology = fl.add({ tex: "M\\subseteq\\mathbb{R}^n\\ \\text{subspace topology}\\ \\Rightarrow\\ \\text{Hausdorff, second countable}", x: LEFT_CENTER_X, y: 800, size: 34 });

    this.sphere = new Surface(stage, sphereFn(1), Palette.blue, { wireframe: true, opacity: 0.35, isoU: 24, isoV: 12 });
    this.p1Dot = new Dot(stage, P1, Palette.orange, 0.04, "3d");
    this.p1Label = fl.add({ tex: "p", x: 0, y: 0, size: 34, color: Palette.orange });
    this.rankLine = fl.add({ tex: `\\operatorname{rank}Dh(p)=k\\ \\Rightarrow\\ p=(a,b),\\ \\ ${Tex.color(GOLD, "D_yh(a,b)")}\\ \\text{invertible}`, x: LEFT_CENTER_X, y: 100, size: 38 });
    this.splitLine = fl.add({ tex: `x\\in\\mathbb{R}^{n-k},\\ \\ ${Tex.color(GOLD, "y\\in\\mathbb{R}^k")}\\qquad(\\text{here } x=(x_1,x_2),\\ ${Tex.color(GOLD, "y=x_3")})`, x: LEFT_CENTER_X, y: 800, size: 34 });
    this.fLine = fl.add({ tex: `f(x,y)=h(x,y)-c:\\quad f(a,b)=0,\\ \\ ${Tex.color(GOLD, "D_yf=D_yh")}\\ \\text{invertible}\\ \\Rightarrow\\ \\text{IFT}`, x: LEFT_CENTER_X, y: 800, size: 34 });

    this.box1 = new WireBox(stage, v3(A1.x0, A1.y0, 0.25), v3(A1.x1, A1.y1, 1.08), Palette.green);
    this.patch1 = new FlatPatch(stage, (u, v, target) => {
      const x = lerp(A1.x0, A1.x1, u);
      const y = lerp(A1.y0, A1.y1, v);
      target.set(x, y, g1(x, y) + 0.008);
    }, Palette.green);
    this.plane1 = new FlatPatch(stage, (u, v, target) => target.set(lerp(A1.x0, A1.x1, u), lerp(A1.y0, A1.y1, v), Z_A), Palette.muted, 2);
    this.plane1Label = fl.add({ tex: "A\\subseteq\\mathbb{R}^{n-k}", x: 0, y: 0, size: 30, color: Palette.muted, align: "left" });
    for (const [x, y] of [[0.0, 0.0], [0.6, 0.0], [0.6, 0.45], [0.0, 0.45]] as [number, number][]) {
      this.verticals.push(new Polyline(stage, [v3(x, y, Z_A), v3(x, y, g1(x, y))], { color: Palette.green, width: 1.8, dashed: true, dashSize: 0.05, gapSize: 0.04 }));
    }
    const lines: [number, number][][] = [];
    for (let i = 0; i <= 4; i++) {
      const x = lerp(A1.x0, A1.x1, i / 4);
      lines.push(sampleCurve((s) => v3(x, s, 0), A1.y0, A1.y1, 20).map((q) => [q.x, q.y]));
      const y = lerp(A1.y0, A1.y1, i / 4);
      lines.push(sampleCurve((s) => v3(s, y, 0), A1.x0, A1.x1, 20).map((q) => [q.x, q.y]));
    }
    this.grid1 = lines.map((pts) => ({ pts, line: new Polyline(stage, pts.map(([x, y]) => v3(x, y, g1(x, y))), { color: Palette.text, width: 1.8 }) }));
    this.graphLine = fl.add({ tex: `M\\cap(A\\times B)=\\{(x,${Tex.color(GOLD, "g(x)")}):\\ x\\in A\\}`, x: LEFT_CENTER_X, y: 100, size: 40 });
    this.phiArrow = new Arrow(stage, v3(-0.6, -1.05, 0.6), v3(-0.6, -1.05, Z_A + 0.15), Palette.orange, { mode: "3d", width: 4, headLength: 0.16 });
    this.psiArrow = new Arrow(stage, v3(-1.15, -0.45, Z_A + 0.15), v3(-1.15, -0.45, 0.6), Palette.green, { mode: "3d", width: 4, headLength: 0.16 });
    this.phiLabel = fl.add({ tex: "\\varphi", x: 0, y: 0, size: 40, color: Palette.orange });
    this.psiLabel = fl.add({ tex: "\\psi", x: 0, y: 0, size: 40, color: Palette.green });
    this.phiDef = fl.add({ tex: `\\varphi:W=M\\cap(A\\times B)\\to A,\\quad \\varphi(x,y)=x`, x: 470, y: 100, size: 36, color: Palette.orange });
    this.psiDef = fl.add({ tex: `\\psi:A\\to M,\\quad \\psi(x)=(x,${Tex.color(GOLD, "g(x)")})`, x: 1090, y: 100, size: 36, color: Palette.green });
    this.checks = fl.add({ tex: this.checkTex(0), x: LEFT_CENTER_X, y: 790, size: 34, display: true });
    this.chartNote = fl.add({ tex: `\\varphi:W\\to A\\ \\text{homeomorphism onto an open set}\\ \\Rightarrow\\ ${Tex.color(Palette.green, "\\text{a chart}")}`, x: LEFT_CENTER_X, y: 800, size: 34 });
    this.count = fl.add({ tex: `\\underbrace{x_1,\\ \\dots,\\ x_{n-k}}_{\\text{free}:\\ n-k}\\ \\ \\underbrace{${Tex.color(GOLD, "y_1,\\ \\dots,\\ y_k")}}_{\\text{fixed by } k \\text{ equations}}\\qquad \\dim M=n-k`, x: LEFT_CENTER_X, y: 790, size: 36, display: true });

    this.p2Dot = new Dot(stage, P2, Palette.orange, 0.04, "3d");
    this.p2Label = fl.add({ tex: "p_2", x: 0, y: 0, size: 32, color: Palette.orange });
    this.equator = new Polyline(stage, sampleCurve((s) => v3(1.006 * Math.cos(s), 1.006 * Math.sin(s), 0), 0, 2 * Math.PI, 128), { color: Palette.orange, width: 2.5, dashed: true, dashSize: 0.06, gapSize: 0.05 });
    this.equatorLabel = fl.add({ tex: "\\text{equator: }\\partial h/\\partial x_3=2x_3=0", x: 0, y: 0, size: 30, color: Palette.orange, align: "right" });
    this.box2 = new WireBox(stage, v3(0.22, A2.y0, A2.z0), v3(1.06, A2.y1, A2.z1), Palette.purple);
    this.patch2 = new FlatPatch(stage, SphereCharts.graphPatch(0, 1, (A2.y0 + A2.y1) / 2, (A2.z0 + A2.z1) / 2, 0.3, 1.008), Palette.purple);
    this.plane2 = new FlatPatch(stage, (u, v, target) => target.set(X_A, lerp(A2.y0, A2.y1, u), lerp(A2.z0, A2.z1, v)), Palette.purple, 2);
    this.plane2Label = fl.add({ tex: "A_2\\ (x_2,x_3)", x: 0, y: 0, size: 30, color: Palette.purple, align: "left" });
    this.moverA1 = new Dot(stage, v3(0, 0, Z_A), Palette.orange, 0.035, "3d");
    this.moverM = new Dot(stage, v3(0, 0, 0), Palette.orange, 0.035, "3d");
    this.moverA2 = new Dot(stage, v3(X_A, 0, 0), Palette.orange, 0.035, "3d");
    this.moverLinks = [0, 1].map(() => new Polyline(stage, [v3(0, 0, 0), v3(0, 0, 1)], { color: Palette.orange, width: 2, dashed: true, dashSize: 0.05, gapSize: 0.04 }));
    this.transition = fl.add({ tex: this.transitionTex(0), x: LEFT_CENTER_X, y: 800, size: 36 });
    this.embedded = fl.add({ tex: `D\\psi(x)=\\begin{pmatrix}I\\\\ ${Tex.color(GOLD, "Dg(x)")}\\end{pmatrix}\\ \\text{injective},\\quad M\\ \\text{has the subspace topology}\\ \\Rightarrow\\ ${Tex.color(Palette.green, "\\text{embedded}")}`, x: LEFT_CENTER_X, y: 790, size: 32, display: true });
    const capColors = [Palette.green, Palette.green, Palette.teal, Palette.teal, Palette.purple, Palette.purple];
    const capAxes: (0 | 1 | 2)[] = [2, 2, 0, 0, 1, 1];
    const capSigns: (1 | -1)[] = [1, -1, 1, -1, 1, -1];
    for (let i = 0; i < 6; i++) this.cover.push(new FlatPatch(stage, SphereCharts.cap(capAxes[i], capSigns[i], 1.01, 1.0), capColors[i]));
    this.machine = fl.add({ tex: `\\text{equations } h=c\\ \\longrightarrow\\ ${Tex.color(Palette.orange, "\\text{rank check + IFT}")}\\ \\longrightarrow\\ \\text{charts}`, x: LEFT_CENTER_X, y: 100, size: 38 });
    this.hypothesisNote = fl.add({ tex: `\\text{regularity used here: choose an invertible block. At the crossing of } x^2=y^2:\\ ${Tex.color(Palette.red, "Dh=0")}`, x: LEFT_CENTER_X, y: 800, size: 30 });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "M\\cap(A\\times B)=\\operatorname{graph}g", at: cue.s(10) + 1.5 },
      { label: "2", tex: "\\varphi(x,y)=x,\\ \\ \\psi=\\varphi^{-1}", at: cue.s(18) + 2.0 },
      { label: "3", tex: "\\dim M=n-k", at: cue.s(19) + 2.0 },
      { label: "4", tex: "\\varphi_2\\circ\\varphi_1^{-1}=\\pi_2\\circ\\psi_1\\ \\text{smooth}", at: cue.s(26) + 2.0 },
      { label: "5", tex: "D\\psi\\ \\text{injective: embedded}", at: cue.s(30) + 1.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  private checkTex(n: number): string {
    const rows = [
      `\\varphi(\\psi(x))=\\varphi(x,g(x))=x\\ \\ ${Tex.color(Palette.green, "\\checkmark")}`,
      `\\psi(\\varphi(x,y))=(x,g(x))=(x,y)\\ \\ ${Tex.color(Palette.green, "\\checkmark")}\\ \\ ${Tex.color(Palette.muted, "(y=g(x)\\text{ on } W)")}`,
    ];
    return `\\begin{gathered}${rows.map((r, i) => (i < n ? r : `\\phantom{${r}}`)).join("\\\\")}\\end{gathered}`;
  }

  private transitionTex(n: number): string {
    return Tex.reveal([
      "\\varphi_2\\circ\\varphi_1^{-1}",
      `=\\ \\pi_2\\circ\\psi_1`,
      `\\quad ${Tex.color(Palette.green, "\\text{linear}\\circ\\text{smooth}=\\text{smooth}")}`,
    ], n);
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const stage = this.stage;

    // Camera: slow orbit; the view is shifted so the sphere sits left of the ledger column.
    const az = -0.72 + 0.1 * Math.sin(0.05 * t);
    const pos = v3(8.6 * Math.cos(az), 8.6 * Math.sin(az), 4.0);
    const target = v3(0.35, 0.15, -0.42);
    const right = target.clone().sub(pos).cross(v3(0, 0, 1)).normalize().multiplyScalar(0.75);
    stage.setView3D(pos.add(right), target.add(right), 34);

    // Theorem statement (s0–s3)
    this.theorem.set({ opacity: c.p(1, 0.6) * (1 - c.p(3, 0.8)) });
    this.topology.set({ opacity: c.p(4, 0.6) * (1 - c.p(6, 0.6)) });
    const stageOn = c.p(3, 0.8);
    this.sphere.setOpacity(stageOn);

    // Point p and the box (s5–s10)
    const p1On = c.p(5, 0.6) * (1 - c.p(31, 0.6));
    this.p1Dot.setOpacity(p1On);
    this.anchor.place(this.p1Label, P1, p1On * (1 - c.p(9, 0.6)), -16, -24);
    this.rankLine.set({ opacity: c.p(6, 0.6) * (1 - c.p(10, 0.6)) });
    this.splitLine.set({ opacity: c.p(7, 0.6) * (1 - c.p(8, 0.5)) });
    this.fLine.set({ opacity: c.p(8, 0.6) * (1 - c.p(10, 0.5)) });
    const chart1 = c.p(9, 0.6) * (1 - c.p(31, 0.6));
    this.box1.setOpacity(chart1 * (1 - 0.6 * c.p(22, 0.6)));
    this.patch1.setOpacity(0.55 * c.p(10, 0.6) * (1 - c.p(31, 0.6)));
    this.plane1.setOpacity(0.35 * c.p(10, 0.6) * (1 - c.p(31, 0.6)));
    this.anchor.place(this.plane1Label, v3(A1.x1, A1.y0, Z_A), c.p(10, 0.6) * (1 - c.p(16, 0.6)), 14, 10);
    this.verticals.forEach((l) => l.setOpacity(c.p(10, 0.6, 0.6) * (1 - c.p(12, 0.6))));
    this.graphLine.set({ opacity: c.p(10, 0.6) * (1 - c.p(12, 0.6)) });

    // φ: grid falls to A (s12); ψ: grid rises back (s14)
    const fall = c.over(12, 0.15, 0.75) * (1 - c.over(14, 0.15, 0.75));
    const gridOn = c.p(11, 0.6) * (1 - c.p(21, 0.6));
    for (const g of this.grid1) {
      g.line.setPoints(g.pts.map(([x, y]) => v3(x, y, lerp(g1(x, y) + 0.012, Z_A + 0.005, fall))));
      g.line.setOpacity(gridOn);
    }
    const phiOn = c.p(12, 0.6) * (1 - c.p(21, 0.6));
    const psiOn = c.p(14, 0.6) * (1 - c.p(21, 0.6));
    this.phiArrow.setOpacity(phiOn);
    this.psiArrow.setOpacity(psiOn);
    this.anchor.place(this.phiLabel, v3(-0.6, -1.05, -0.35), phiOn, 26, 0);
    this.anchor.place(this.psiLabel, v3(-1.15, -0.45, -0.35), psiOn, -26, 0);
    this.phiDef.set({ opacity: phiOn * (1 - c.p(19, 0.6)) });
    this.psiDef.set({ opacity: psiOn * (1 - c.p(19, 0.6)) });
    const checkN = t >= c.s(17) ? 2 : t >= c.s(16) ? 1 : 0;
    this.checks.setContent(this.checkTex(checkN));
    this.checks.set({ opacity: (checkN > 0 ? 1 : 0) * (1 - c.p(18, 0.5)) });
    this.chartNote.set({ opacity: c.p(18, 0.5) * (1 - c.p(20, 0.5)) });
    this.count.set({ opacity: c.p(20, 0.6) * (1 - c.p(22, 0.5)) });

    // Second chart near the equator (s22–s28)
    const chart2 = c.p(22, 0.6) * (1 - c.p(31, 0.6));
    this.p2Dot.setOpacity(chart2);
    this.anchor.place(this.p2Label, P2, chart2, 22, -16);
    const eq = c.p(23, 0.6) * (1 - c.p(25, 0.6));
    this.equator.setOpacity(eq);
    this.anchor.place(this.equatorLabel, v3(-0.75, -0.66, 0), eq, -16, 0);
    this.box2.setOpacity(chart2 * c.p(23, 0.6, 1.0));
    this.patch2.setOpacity(0.55 * chart2 * c.p(23, 0.6, 1.0));
    this.plane2.setOpacity(0.35 * chart2 * c.p(23, 0.6, 1.0));
    this.anchor.place(this.plane2Label, v3(X_A, A2.y1, A2.z1), chart2 * c.p(23, 0.6, 1.0), 10, -20);

    // Transition: a point of A₁ in the overlap, lifted by ψ₁, projected by π₂ (s24–s27)
    const mover = c.p(24, 0.6) * (1 - c.p(28, 0.6));
    const tau = Math.max(0, t - c.s(24));
    const my = 0.565 + 0.025 * Math.sin(0.9 * tau);   // stays inside both chart domains (x₁ ≤ 0.74)
    const mz = 0.425 + 0.02 * Math.cos(0.9 * tau);
    const mx = Math.sqrt(1 - my * my - mz * mz);
    const onM = v3(mx, my, mz);
    const onA1 = v3(mx, my, Z_A);
    const onA2 = v3(X_A, my, mz);
    this.moverA1.setPosition(onA1);
    this.moverM.setPosition(onM.clone().multiplyScalar(1.01));
    this.moverA2.setPosition(onA2);
    this.moverA1.setOpacity(mover);
    this.moverM.setOpacity(mover * c.p(24, 0.6, 0.6));
    this.moverA2.setOpacity(mover * c.p(24, 0.6, 1.2));
    this.moverLinks[0].setPoints([onA1, onM]);
    this.moverLinks[1].setPoints([onM, onA2]);
    this.moverLinks[0].setOpacity(mover * c.p(24, 0.6, 0.6));
    this.moverLinks[1].setOpacity(mover * c.p(24, 0.6, 1.2));
    const trN = t >= c.s(26) ? 3 : t >= c.s(25) ? 2 : t >= c.s(24) ? 1 : 0;
    this.transition.setContent(this.transitionTex(trN));
    this.transition.set({ opacity: (trN > 0 ? 1 : 0) * (1 - c.p(29, 0.5)) });
    this.embedded.set({ opacity: c.p(29, 0.6) * (1 - c.p(31, 0.5)) });

    // Cover the sphere (s31–s34)
    for (let i = 0; i < 6; i++) this.cover[i].setOpacity(0.32 * c.p(31, 0.5, 0.35 * i));
    this.machine.set({ opacity: c.p(32, 0.6, 0.8) });
    this.hypothesisNote.set({ opacity: c.p(34, 0.6) });

    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
