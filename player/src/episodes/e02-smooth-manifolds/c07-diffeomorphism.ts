import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { lerp, smoothstep } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline, sampleCurve } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { LabelPlacer } from "./lib/LabelPlacer";
import { PixelFrame } from "./lib/PixelFrame";
import { Tex } from "./lib/Tex";

/**
 * E02 c07 — diffeomorphisms. x³ is a smooth homeomorphism of ℝ whose inverse is not differentiable at 0;
 * the necessary condition F′(x) ≠ 0 from the chain rule; κ as a diffeomorphism (ℝ,{κ}) → (ℝ,{id});
 * diffeomorphisms preserve smoothness under change of variables; the topological ↔ smooth dictionary.
 * Default view (0, 0, 9); positions in pixels through PixelFrame.
 * Sentence indices refer to content/episodes/e02-smooth-manifolds/story.en.json, scene c07-diffeomorphism.
 */

const G = PixelFrame.frame(640, 470, 170);
const W = PixelFrame.world;
const TICKS = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1];
const HS = [0.1, 0.01, 0.001];
const EPS = 0.6;
const cbrt = (u: number): number => Math.sign(u) * Math.pow(Math.abs(u), 1 / 3);

export class DiffeomorphismScene implements Scene {
  readonly id = "c07-diffeomorphism";
  private placer!: LabelPlacer;

  private tableHead!: FormulaHandle;
  private tableRows: FormulaHandle[] = [];
  private segment!: Polyline;
  private cusp!: Polyline;
  private crumpleLabel!: FormulaHandle;
  private cuspLabel!: FormulaHandle;
  private definition!: FormulaHandle;

  private grid: Polyline[] = [];
  private axX!: Arrow;
  private axY!: Arrow;
  private axLabels: FormulaHandle[] = [];
  private cube!: Polyline;
  private mirror!: Polyline;
  private root!: Polyline;
  private cubeLabel!: FormulaHandle;
  private rootLabel!: FormulaHandle;
  private tickIn: Dot[] = [];
  private tickOut: Dot[] = [];
  private tickPaths: Polyline[] = [];
  private vertical!: Polyline;
  private secants: Polyline[] = [];
  private dq!: FormulaHandle;
  private dqTable!: FormulaHandle;
  private notDiff!: FormulaHandle;
  private segIn!: Polyline;
  private segOut!: Polyline;
  private segLabel!: FormulaHandle;
  private bottom!: FormulaHandle;

  private kappaBlock!: FormulaHandle;
  private reparam!: FormulaHandle;
  private reparamDiagram!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.placer = new LabelPlacer(stage);
    stage.setView2D(0, 0, 9);

    this.tableHead = fl.add({ tex: "\\textbf{topological spaces}\\qquad\\longleftrightarrow\\qquad\\textbf{smooth manifolds}", x: 960, y: 110, size: 40 });
    const rowTex = [
      "\\text{homeomorphism}\\qquad\\longleftrightarrow\\qquad\\text{diffeomorphism}",
      "\\text{continuous map}\\qquad\\longleftrightarrow\\qquad\\text{smooth map}",
      "\\text{charts onto open subsets of } \\mathbb{R}^d\\qquad\\longleftrightarrow\\qquad\\text{compatible charts (smooth atlas)}",
    ];
    this.tableRows = rowTex.map((tex, i) => fl.add({ tex, x: 960, y: 260 + i * 120, size: 36 }));

    // Crumple versus cusp (s1–s2)
    this.segment = new Polyline(stage, sampleCurve((s) => W(300 + 300 * s, 470), 0, 1, 120), { color: Palette.blue, width: 5 });
    this.cusp = new Polyline(stage, sampleCurve((s) => {
      const t = 2 * s - 1;
      return W(1150 + 260 * t * t - 130, 470 - 210 * t * t * t);
    }, 0, 1, 160), { color: Palette.red, width: 5 });
    this.crumpleLabel = fl.add({ text: "homeomorphic image: crumpled, not torn", x: 450, y: 660, size: 30, color: Palette.blue });
    this.cuspLabel = fl.add({ tex: "t\\mapsto(t^2,t^3):\\ \\text{a cusp at } t=0", x: 1150, y: 700, size: 30, color: Palette.red });
    this.definition = fl.add({
      tex: "F:M\\to N\\ \\text{diffeomorphism}\\iff F\\ \\text{bijective},\\ \\ F\\ \\text{smooth},\\ \\ F^{-1}\\ \\text{smooth}",
      x: 960, y: 470, size: 40, boxed: true,
    });

    // ---- Graph of x³
    for (let k = -1; k <= 1; k++) {
      this.grid.push(new Polyline(stage, [G(k, -1.55), G(k, 1.55)], { color: Palette.grid, width: 1.5 }));
      this.grid.push(new Polyline(stage, [G(-1.5, k), G(1.5, k)], { color: Palette.grid, width: 1.5 }));
    }
    this.axX = new Arrow(stage, G(-1.55, 0), G(1.6, 0), Palette.axis, { width: 2.5, headLength: 0.14 });
    this.axY = new Arrow(stage, G(0, -1.6), G(0, 1.65), Palette.axis, { width: 2.5, headLength: 0.14 });
    this.axLabels = [fl.add({ tex: "x", x: 0, y: 0, size: 30, color: Palette.muted }), fl.add({ tex: "y", x: 0, y: 0, size: 30, color: Palette.muted })];
    this.cube = new Polyline(stage, sampleCurve((x) => G(x, x * x * x), -1.165, 1.165, 160), { color: Palette.teal, width: 5 });
    this.mirror = new Polyline(stage, [G(-1.5, -1.5), G(1.5, 1.5)], { color: Palette.muted, width: 2, dashed: true, dashSize: 0.1, gapSize: 0.08 });
    this.root = new Polyline(stage, sampleCurve((x) => G(x, x * x * x), -1.165, 1.165, 160), { color: Palette.orange, width: 5 });
    this.cubeLabel = fl.add({ tex: "y=x^3", x: 0, y: 0, size: 32, color: Palette.teal });
    this.rootLabel = fl.add({ tex: "y=\\sqrt[3]{x}", x: 0, y: 0, size: 32, color: Palette.orange });
    for (const x of TICKS) {
      this.tickIn.push(new Dot(stage, G(x, 0), Palette.yellow, 0.05));
      this.tickOut.push(new Dot(stage, G(0, x * x * x), Palette.yellow, 0.05));
      this.tickPaths.push(new Polyline(stage, [G(x, 0), G(x, x * x * x), G(0, x * x * x)], { color: Palette.yellow, width: 1.5, dashed: true, dashSize: 0.07, gapSize: 0.06 }));
    }
    this.vertical = new Polyline(stage, [G(0, -1.4), G(0, 1.4)], { color: Palette.red, width: 3, dashed: true, dashSize: 0.1, gapSize: 0.07 });
    this.secants = HS.map((h) => new Polyline(stage, [G(0, 0), G(h, cbrt(h))], { color: Palette.yellow, width: 2.5 }));
    this.dq = fl.add({ tex: "\\dfrac{F^{-1}(h)-F^{-1}(0)}{h}=h^{-2/3}", x: 1185, y: 260, size: 32 });
    this.dqTable = fl.add({ tex: "", x: 1150, y: 430, size: 32, display: true });
    this.notDiff = fl.add({ tex: "F^{-1}\\ \\text{not differentiable at } 0", x: 1150, y: 590, size: 30, color: Palette.red });
    this.segIn = new Polyline(stage, [G(-EPS, 0), G(EPS, 0)], { color: Palette.orange, width: 9 });
    this.segOut = new Polyline(stage, [G(0, -(EPS ** 3)), G(0, EPS ** 3)], { color: Palette.green, width: 9 });
    this.segLabel = fl.add({ tex: "2\\varepsilon\\ \\mapsto\\ 2\\varepsilon^3", x: 0, y: 0, size: 32, color: Palette.orange });
    this.bottom = fl.add({ tex: "\\,", x: 700, y: 805, size: 34 });

    this.kappaBlock = fl.add({
      tex: "\\begin{aligned}&F=\\kappa:\\ (\\mathbb{R},\\{\\kappa\\})\\to(\\mathbb{R},\\{\\mathrm{id}\\}),\\quad p\\mapsto p^3\\\\[4pt] &\\hat F=\\mathrm{id}\\circ\\kappa\\circ\\kappa^{-1}:\\ u\\mapsto u\\\\[4pt] &\\widehat{F^{-1}}=\\kappa\\circ\\kappa^{-1}\\circ\\mathrm{id}^{-1}:\\ x\\mapsto x\\\\[4pt] &\\Rightarrow\\ \\text{diffeomorphism: different structures, same smooth manifold}\\end{aligned}",
      x: 700, y: 420, size: 34, display: true,
    });
    this.reparam = fl.add({
      tex: "\\begin{aligned}&f\\ \\text{smooth on } N\\ \\Rightarrow\\ f\\circ F\\ \\text{smooth (composition)}\\\\[4pt] &f\\circ F\\ \\text{smooth}\\ \\Rightarrow\\ f=(f\\circ F)\\circ F^{-1}\\ \\text{smooth}\\end{aligned}",
      x: 700, y: 470, size: 34, display: true,
    });
    this.reparamDiagram = fl.add({ tex: "M\\ \\xrightarrow{\\ F\\ (\\text{diffeo})\\ }\\ N\\ \\xrightarrow{\\ f\\ }\\ \\mathbb{R}", x: 700, y: 300, size: 40 });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "x^3\\ \\text{smooth (polynomial)}", at: cue.in(5, 0.6) },
      { label: "2", tex: "\\text{increasing, onto}\\Rightarrow\\text{bijective}", at: cue.in(7, 0.8) },
      { label: "3", tex: "\\sqrt[3]{\\cdot}\\ \\text{continuous}\\Rightarrow\\text{homeomorphism}", at: cue.in(10, 0.7) },
      { label: "4", tex: "\\sqrt[3]{\\cdot}\\ \\text{not differentiable at } 0", at: cue.in(14, 0.6) },
      { label: "5", tex: "\\text{diffeo}\\Rightarrow F'(x)\\neq 0", at: cue.in(20, 0.5) },
      { label: "6", tex: "\\text{diffeo preserves smoothness}", at: cue.in(29, 0.8) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 }, "x³ and diffeomorphisms");
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;

    // ---------- Header, crumple vs cusp, definition (s0–s3); table (s31–s34)
    this.tableHead.set({ opacity: c.p(0, 0.6) * (1 - c.p(4, 0.6)) + c.p(31, 0.6) });
    this.tableRows.forEach((h, i) => h.set({ opacity: c.p(32 + i, 0.6) }));
    const crumpleOn = c.p(1, 0.6) * (1 - c.p(3, 0.6));
    const wig = c.over(1, 0.1, 0.8);
    this.segment.setPoints(sampleCurve((s) => {
      const x = 300 + 300 * s;
      const y = 470 - wig * (110 * Math.sin(3 * Math.PI * s) * Math.sin(Math.PI * s));
      return W(x - wig * 60 * Math.sin(2 * Math.PI * s), y);
    }, 0, 1, 120));
    this.segment.setOpacity(crumpleOn);
    this.crumpleLabel.set({ opacity: crumpleOn * c.p(1, 0.6, 1.0) });
    const cuspOn = c.p(2, 0.6) * (1 - c.p(3, 0.6));
    this.cusp.setOpacity(cuspOn);
    this.cuspLabel.set({ opacity: cuspOn });
    this.definition.set({ opacity: c.p(3, 0.6) * (1 - c.p(4, 0.6)) });

    // ---------- Graph (s4–s21)
    const gOn = c.p(4, 0.7) * (1 - c.p(22, 0.6));
    this.grid.forEach((g) => g.setOpacity(gOn * 0.8));
    this.axX.setOpacity(gOn);
    this.axY.setOpacity(gOn);
    this.placer.place(this.axLabels[0], G(1.7, 0), 0, 0, gOn);
    this.placer.place(this.axLabels[1], G(0, 1.75), 0, 0, gOn);
    this.cube.setProgress(c.over(4, 0.2, 0.9));
    this.cube.setOpacity(gOn * (1 - 0.6 * c.p(11, 0.6)));
    this.placer.place(this.cubeLabel, G(1.2, 1.55), 75, 0, gOn * c.p(4, 0.5, 1.5));
    const ticksOn = gOn * c.p(8, 0.4) * (1 - c.p(9, 0.6));
    this.tickIn.forEach((d, i) => {
      const g = c.p(8, 0.4, 0.15 * i);
      d.setOpacity(ticksOn * g);
      this.tickOut[i].setOpacity(ticksOn * c.p(8, 0.4, 0.15 * i + 0.6));
      this.tickPaths[i].setOpacity(ticksOn * c.p(8, 0.4, 0.15 * i + 0.3) * 0.8);
    });
    const mirrorOn = gOn * c.p(9, 0.5);
    this.mirror.setOpacity(mirrorOn);
    const refl = c.over(9, 0.25, 0.9);
    this.root.setPoints(sampleCurve((x) => {
      const a = G(x, x * x * x);
      const b = G(x * x * x, x);
      return a.lerp(b, refl);
    }, -1.165, 1.165, 160));
    this.root.setOpacity(mirrorOn * smoothstep(0.0, 0.1, refl));
    this.placer.place(this.rootLabel, G(1.55, 1.15), 40, 0, mirrorOn * smoothstep(0.85, 1, refl));
    const vertOn = gOn * c.p(11, 0.5);
    this.vertical.setOpacity(vertOn);
    this.secants.forEach((s, i) => {
      const h = HS[i];
      s.setPoints([G(0, 0), G(h, cbrt(h))]);
      s.setOpacity(gOn * c.p(13, 0.4, 0.3 + 3.2 * i) * (1 - c.p(15, 0.5)));
    });
    const dqOn = gOn * c.p(12, 0.6) * (1 - c.p(15, 0.5));
    this.dq.set({ opacity: dqOn });
    const nRows = t >= c.in(13, 0.68) ? 3 : t >= c.in(13, 0.36) ? 2 : t >= c.s(13) + 0.3 ? 1 : 0;
    const rows = ["0.1 & 4.64", "0.01 & 21.5", "0.001 & 100"].map((r, i) => (i < nRows ? r : "\\phantom{0.001} & \\phantom{100}"));
    this.dqTable.setContent(`\\begin{array}{c|c} h & h^{-2/3}\\\\ \\hline ${rows.join("\\\\ ")}\\end{array}`);
    this.dqTable.set({ opacity: dqOn * c.p(13, 0.4) });
    this.notDiff.set({ opacity: gOn * c.p(14, 0.5) * (1 - c.p(15, 0.5)) });
    const segOn = gOn * c.p(16, 0.5) * (1 - c.p(18, 0.6));
    const squash = c.over(16, 0.2, 0.7);
    this.segIn.setOpacity(segOn);
    this.segOut.setPoints([G(0, -lerp(EPS, EPS ** 3, squash)), G(0, lerp(EPS, EPS ** 3, squash))]);
    this.segOut.setOpacity(segOn * c.p(16, 0.4, 1.0));
    this.placer.place(this.segLabel, G(0.65, -0.35), 40, 0, segOn * c.p(16, 0.4, 2.0));
    let bTex = "\\,";
    let bOn = 0;
    if (t >= c.s(15) && t < c.s(18)) { bTex = "F'(x)=3x^2,\\qquad F'(0)=0"; bOn = c.p(15, 0.5) * (1 - c.p(18, 0.3, -0.3)); }
    else if (t >= c.s(18) && t < c.s(21)) {
      bTex = Tex.reveal(["F^{-1}\\circ F=\\mathrm{id}\\ \\Rightarrow\\ (F^{-1})'(F(x))\\cdot F'(x)=1", "\\ \\Rightarrow\\ F'(x)\\neq 0", `\\qquad ${Tex.c(Palette.red, "x^3:\\ \\text{fails at } 0")}`], t >= c.in(20, 0.5) ? 3 : t >= c.s(20) ? 2 : 1);
      bOn = c.p(18, 0.5) * (1 - c.p(21, 0.3, -0.3));
    } else if (t >= c.s(21) && t < c.s(22)) { bTex = "\\text{E03 (inverse function theorem): } F'(x_0)\\neq 0\\ \\Rightarrow\\ \\text{smooth local inverse}"; bOn = c.p(21, 0.5) * (1 - c.p(22, 0.4)); }
    this.bottom.setContent(bTex);
    this.bottom.set({ opacity: bOn });

    // ---------- κ example (s22–s26) and reparametrization (s27–s30)
    const kOn = c.p(22, 0.7) * (1 - c.p(27, 0.6));
    const kLines = t >= c.s(26) ? 4 : t >= c.s(25) ? 3 : t >= c.s(24) ? 2 : 1;
    const kParts = [
      "&F=\\kappa:\\ (\\mathbb{R},\\{\\kappa\\})\\to(\\mathbb{R},\\{\\mathrm{id}\\}),\\quad p\\mapsto p^3",
      "&\\hat F=\\mathrm{id}\\circ\\kappa\\circ\\kappa^{-1}:\\ u\\mapsto u",
      "&\\widehat{F^{-1}}=\\kappa\\circ\\kappa^{-1}\\circ\\mathrm{id}^{-1}:\\ x\\mapsto x",
      `&${Tex.c(Palette.green, "\\Rightarrow\\ \\text{diffeomorphism}")}`,
    ];
    this.kappaBlock.setContent(`\\begin{aligned}${kParts.map((p, i) => (i < kLines ? p : `&\\phantom{${p.slice(1)}}`)).join("\\\\[6pt] ")}\\end{aligned}`);
    this.kappaBlock.set({ opacity: kOn * c.p(23, 0.6) });
    const rOn = c.p(27, 0.6) * (1 - c.p(31, 0.6));
    this.reparamDiagram.set({ opacity: rOn });
    this.reparam.set({ opacity: rOn * c.p(28, 0.6) });
    this.ledger.update(t, c.p(5, 0.4) * (1 - c.p(31, 0.6)), t < c.s(31));
    this.notDiff.set({ color: Palette.red });
  }

  teardown(_layers: SceneLayers): void {}
}
