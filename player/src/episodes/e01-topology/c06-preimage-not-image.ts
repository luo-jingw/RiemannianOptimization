import type * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Cues } from "../../primitives/Cues";
import { CurvedArrow } from "../../primitives/CurvedArrow";
import { Dot } from "../../primitives/Dot";
import { lerp, smoothstep } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { PixelSpace } from "./lib/PixelSpace";
import { tc } from "./lib/tex";

/**
 * E01 c06 — why continuity uses preimages: the constant map and x² are continuous but send open sets to
 * non-open sets; preimages commute with unions and intersections, images do not commute with intersections.
 * Coordinates are output pixels (PixelSpace). Sentence indices refer to story.en.json, scene c06-preimage-not-image.
 */

const DOM = { x0: 120, x1: 620, y: 420 };     // domain line of the constant map, values in [−2, 2]
const COD = { x0: 800, x1: 1300, y: 420 };    // codomain line
const dx = (v: number): number => lerp(DOM.x0, DOM.x1, (v + 2) / 4);
const cx = (v: number): number => lerp(COD.x0, COD.x1, (v + 2) / 4);
const gx = (x: number): number => 710 + x * 200;     // parabola plot
const gy = (y: number): number => 740 - y * 140;
const N_PTS = 21;

export class PreimageNotImageScene implements Scene {
  readonly id = "c06-preimage-not-image";
  private stage!: StageLayer;

  private question!: FormulaHandle;
  private lines: Polyline[] = [];
  private lineLabels: FormulaHandle[] = [];
  private domBar!: Polyline;
  private domEnds: Dot[] = [];
  private cArrow!: CurvedArrow;
  private cLabel!: FormulaHandle;
  private flyers: Dot[] = [];
  private zeroDot!: Dot;
  private zeroNote!: FormulaHandle;
  private vBars: Polyline[] = [];
  private vLabels: FormulaHandle[] = [];
  private preAll!: Polyline;
  private preNote!: FormulaHandle;
  private constNote!: FormulaHandle;

  private axes: Polyline[] = [];
  private axisLabels: FormulaHandle[] = [];
  private parabola!: Polyline;
  private sqBar!: Polyline;
  private beams: Polyline[] = [];
  private imgBar!: Polyline;
  private imgSolid!: Dot;
  private imgHollow!: Dot;
  private imgNote!: FormulaHandle;
  private sqProof!: FormulaHandle;
  private probe!: Polyline;
  private probeNeg!: Polyline;

  private commute!: FormulaHandle;
  private commuteProof!: FormulaHandle;
  private abBars: Polyline[] = [];
  private abLabels: FormulaHandle[] = [];
  private abBeams: Polyline[] = [];
  private abImage!: Polyline;
  private abFormula!: FormulaHandle;

  private closing: FormulaHandle[] = [];
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    const P = PixelSpace.p;

    this.question = fl.add({ tex: "\\text{image of open}\\ \\overset{?}{=}\\ \\text{open}", x: 710, y: 110, size: 46, color: Palette.yellow });
    this.lines = [new Polyline(stage, [P(DOM.x0 - 20, DOM.y), P(DOM.x1 + 20, DOM.y)], { color: Palette.axis, width: 2 }),
      new Polyline(stage, [P(COD.x0 - 20, COD.y), P(COD.x1 + 20, COD.y)], { color: Palette.axis, width: 2 })];
    this.lineLabels = [
      fl.add({ tex: "\\mathbb{R}", x: DOM.x0 - 20, y: DOM.y - 40, size: 34, color: Palette.muted }),
      fl.add({ tex: "\\mathbb{R}", x: COD.x1 + 20, y: COD.y - 40, size: 34, color: Palette.muted }),
      ...[-1, 0, 1].map((v) => fl.add({ tex: String(v), x: dx(v), y: DOM.y + 36, size: 26, color: Palette.muted })),
      fl.add({ tex: "0", x: cx(0), y: COD.y + 36, size: 26, color: Palette.muted }),
    ];
    this.domBar = new Polyline(stage, [P(dx(-1), DOM.y), P(dx(1), DOM.y)], { color: Palette.blue, width: 9 });
    this.domEnds = [new Dot(stage, P(dx(-1), DOM.y), Palette.blue, 0.08, "2d", true), new Dot(stage, P(dx(1), DOM.y), Palette.blue, 0.08, "2d", true)];
    this.cArrow = new CurvedArrow(stage, P(DOM.x1 - 40, DOM.y - 90), P(COD.x0 + 40, COD.y - 90), 0.6, Palette.text, 3);
    this.cLabel = fl.add({ tex: "c(x)=0", x: (DOM.x1 + COD.x0) / 2, y: DOM.y - 175, size: 36 });
    for (let i = 0; i < N_PTS; i++) this.flyers.push(new Dot(stage, P(dx(-0.95 + (1.9 * i) / (N_PTS - 1)), DOM.y), Palette.orange, 0.055));
    this.zeroDot = new Dot(stage, P(cx(0), COD.y), Palette.orange, 0.08);
    this.zeroNote = fl.add({ tex: `c\\big((-1,1)\\big)=\\{0\\}\\ \\ ${tc(Palette.red, "\\text{not open}")}`, x: cx(0), y: COD.y + 100, size: 34 });
    this.vBars = [new Polyline(stage, [P(cx(-0.6), COD.y), P(cx(1.2), COD.y)], { color: Palette.purple, width: 9 }),
      new Polyline(stage, [P(cx(0.5), COD.y), P(cx(1.6), COD.y)], { color: Palette.purple, width: 9 })];
    this.vLabels = [fl.add({ tex: "V\\ni 0", x: cx(0.3), y: COD.y - 40, size: 32, color: Palette.purple }), fl.add({ tex: "V\\not\\ni 0", x: cx(1.05), y: COD.y - 40, size: 32, color: Palette.purple })];
    this.preAll = new Polyline(stage, [P(DOM.x0 - 20, DOM.y), P(DOM.x1 + 20, DOM.y)], { color: Palette.purple, width: 9 });
    this.preNote = fl.add({ tex: "", x: dx(0), y: DOM.y + 100, size: 34 });
    this.constNote = fl.add({ tex: `c^{-1}(V)\\in\\{\\mathbb{R},\\varnothing\\}\\ \\ ${tc(Palette.green, "\\text{both open}")}\\ \\Rightarrow\\ c\\ \\text{continuous}`, x: 710, y: 700, size: 38 });

    // ---- parabola
    this.axes = [new Polyline(stage, [P(gx(-2.3), gy(0)), P(gx(2.3), gy(0))], { color: Palette.axis, width: 2 }),
      new Polyline(stage, [P(gx(0), gy(-0.35)), P(gx(0), gy(4.4))], { color: Palette.axis, width: 2 })];
    this.axisLabels = [
      ...[-2, -1, 1, 2].map((v) => fl.add({ tex: String(v), x: gx(v), y: gy(0) + 30, size: 26, color: Palette.muted })),
      ...[1, 4].map((v) => fl.add({ tex: String(v), x: gx(0) - 26, y: gy(v), size: 26, color: Palette.muted })),
      fl.add({ tex: "y=x^2", x: gx(2.05) + 20, y: gy(4.2), size: 32, color: Palette.blue, align: "left" }),
    ];
    const para: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) {
      const x = -2.1 + (4.2 * i) / 120;
      para.push(P(gx(x), gy(x * x)));
    }
    this.parabola = new Polyline(stage, para, { color: Palette.blue, width: 4 });
    this.sqBar = new Polyline(stage, [P(gx(-1), gy(0)), P(gx(1), gy(0))], { color: Palette.blue, width: 9 });
    for (let i = 0; i < 9; i++) {
      const x = -0.9 + (1.8 * i) / 8;
      this.beams.push(new Polyline(stage, [P(gx(x), gy(0)), P(gx(x), gy(x * x)), P(gx(0), gy(x * x))], { color: Palette.yellow, width: 1.8 }));
    }
    this.imgBar = new Polyline(stage, [P(gx(0), gy(0)), P(gx(0), gy(1))], { color: Palette.yellow, width: 9 });
    this.imgSolid = new Dot(stage, P(gx(0), gy(0)), Palette.yellow, 0.08);
    this.imgHollow = new Dot(stage, P(gx(0), gy(1)), Palette.yellow, 0.08, "2d", true);
    this.imgNote = fl.add({ tex: `f\\big((-1,1)\\big)=[0,1)\\ \\ ${tc(Palette.red, "\\text{not open}")}`, x: 710, y: 95, size: 34 });
    this.sqProof = fl.add({ tex: "", x: 710, y: 815, size: 34 });
    this.probe = new Polyline(stage, [P(0, 0), P(0, 0)], { color: Palette.green, width: 6 });
    this.probeNeg = new Polyline(stage, [P(0, 0), P(0, 0)], { color: Palette.red, width: 8 });

    // ---- commuting
    this.commute = fl.add({
      tex: "\\begin{aligned}f^{-1}\\Big(\\bigcup_\\alpha V_\\alpha\\Big)&=\\bigcup_\\alpha f^{-1}(V_\\alpha)\\\\ f^{-1}\\Big(\\bigcap_i V_i\\Big)&=\\bigcap_i f^{-1}(V_i)\\end{aligned}",
      x: 710, y: 360, size: 44, display: true,
    });
    this.commuteProof = fl.add({ tex: "x\\in\\text{LHS}\\iff f(x)\\in\\textstyle\\bigcup V_\\alpha\\ (\\text{or }\\bigcap V_i)\\iff x\\in\\text{RHS}", x: 710, y: 600, size: 36, color: Palette.green });
    this.abBars = [new Polyline(stage, [P(gx(-2), gy(0)), P(gx(-1), gy(0))], { color: Palette.teal, width: 9 }), new Polyline(stage, [P(gx(1), gy(0)), P(gx(2), gy(0))], { color: Palette.pink, width: 9 })];
    this.abLabels = [fl.add({ tex: "A", x: gx(-1.5), y: gy(0) + 34, size: 34, color: Palette.teal }), fl.add({ tex: "B", x: gx(1.5), y: gy(0) + 34, size: 34, color: Palette.pink })];
    for (let i = 0; i < 5; i++) {
      const x = 1.1 + (0.8 * i) / 4;
      this.abBeams.push(new Polyline(stage, [P(gx(-x), gy(0)), P(gx(-x), gy(x * x)), P(gx(0), gy(x * x))], { color: Palette.teal, width: 1.8 }));
      this.abBeams.push(new Polyline(stage, [P(gx(x), gy(0)), P(gx(x), gy(x * x)), P(gx(0), gy(x * x))], { color: Palette.pink, width: 1.8 }));
    }
    this.abImage = new Polyline(stage, [P(gx(0), gy(1)), P(gx(0), gy(4))], { color: Palette.yellow, width: 10 });
    this.abFormula = fl.add({ tex: "", x: 710, y: 815, size: 36 });

    this.closing = [
      fl.add({ tex: "\\text{preimages}\\ \\leftrightarrow\\ \\bigcup,\\ \\bigcap\\ \\leftrightarrow\\ \\text{topology axioms}", x: 710, y: 250, size: 40 }),
      fl.add({ tex: "\\varepsilon\\text{–}\\delta:\\ \\text{output tolerance } V\\ \\text{first}\\ \\Rightarrow\\ \\text{input tolerance } f^{-1}(V)", x: 710, y: 370, size: 38 }),
      fl.add({ tex: `\\text{open map: } f(\\text{open})\\ \\text{open}\\qquad ${tc(Palette.muted, "(\\text{the other direction})")}`, x: 710, y: 490, size: 38 }),
      fl.add({ tex: `\\text{both directions}\\ \\Rightarrow\\ ${tc(Palette.yellow, "\\text{homeomorphism}")}\\ \\ (\\text{next})`, x: 710, y: 610, size: 40 }),
    ];

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "c\\ \\text{continuous},\\ c(\\mathbb{R})=\\{0\\}", at: cue.in(6, 0.6) },
      { label: "2", tex: "x^2:\\ (-1,1)\\mapsto[0,1)\\ \\text{not open}", at: cue.in(11, 0.6) },
      { label: "3", tex: "f^{-1}\\ \\text{commutes with}\\ \\bigcup,\\ \\bigcap", at: cue.in(14, 0.7) },
      { label: "4", tex: "f(A\\cap B)\\neq f(A)\\cap f(B)", at: cue.in(17, 0.7) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    PixelSpace.apply(this.stage);
    const P = PixelSpace.p;

    this.question.set({ opacity: c.p(0, 0.6, 0.4) * (1 - c.p(7, 0.6)) });

    // ---- constant map (s1–s6)
    const cm = c.p(1, 0.6) * (1 - c.p(7, 0.6));
    this.lines.forEach((l) => l.setOpacity(cm));
    this.lineLabels.forEach((l) => l.set({ opacity: cm }));
    this.domBar.setOpacity(cm * c.p(2, 0.5));
    this.domEnds.forEach((d) => d.setOpacity(cm * c.p(2, 0.5)));
    this.cArrow.setProgress(c.p(1, 1.0, 0.5), cm);
    this.cLabel.set({ opacity: cm * c.p(1, 0.6, 0.5) });
    const fly = c.over(2, 0.3, 0.95);
    const flyOn = cm * c.p(2, 0.4, 0.4) * (1 - c.p(4, 0.5));
    this.flyers.forEach((d, i) => {
      const s = smoothstep(0, 1, Math.min(1, Math.max(0, fly * 1.4 - (i / N_PTS) * 0.4)));
      const x0 = dx(-0.95 + (1.9 * i) / (N_PTS - 1));
      const x = lerp(x0, cx(0), s);
      const y = DOM.y + Math.sin(Math.PI * s) * 110;
      d.setPosition(P(x, y));
      d.setOpacity(flyOn);
    });
    const zeroOn = cm * c.p(3, 0.5);
    this.zeroDot.setOpacity(Math.max(zeroOn, cm * smoothstep(0.95, 1, fly)));
    this.zeroNote.set({ opacity: zeroOn * (1 - c.p(4, 0.5)) });
    const v1 = cm * c.during(5, 6, 0.3) * (t < c.in(5, 0.5) ? 1 : 0);
    const v2 = cm * (t >= c.in(5, 0.5) ? 1 : 0) * (1 - c.p(7, 0.5));
    this.vBars[0].setOpacity(Math.max(v1, t >= c.s(6) ? 0 : 0));
    this.vBars[1].setOpacity(v2 * (t < c.s(6) ? 1 : 0.0));
    this.vLabels[0].set({ opacity: v1 });
    this.vLabels[1].set({ opacity: v2 * (t < c.s(6) ? 1 : 0) });
    this.preAll.setOpacity(v1 * 0.8);
    this.preNote.setContent(t < c.in(5, 0.5) ? `c^{-1}(V)=\\mathbb{R}\\ \\ ${tc(Palette.green, "\\text{open}")}` : `c^{-1}(V)=\\varnothing\\ \\ ${tc(Palette.green, "\\text{open}")}`);
    this.preNote.set({ opacity: cm * c.p(5, 0.5, 0.6) * (1 - c.p(6, 0.4)) });
    this.domBar.setOpacity(cm * c.p(2, 0.5) * (t >= c.s(5) && t < c.s(6) ? 0.25 : 1));
    this.constNote.set({ opacity: cm * c.p(6, 0.5) });

    // ---- x² (s7–s11) and A, B (s15–s17)
    const sqOn = c.p(7, 0.6) * (1 - c.p(12, 0.6));
    const abOn = c.p(15, 0.6) * (1 - c.p(18, 0.6));
    const plot = Math.max(sqOn, abOn);
    this.axes.forEach((a) => a.setOpacity(plot));
    this.axisLabels.forEach((l) => l.set({ opacity: plot }));
    this.parabola.setOpacity(plot);
    this.sqBar.setOpacity(sqOn * c.p(8, 0.5));
    const beam = c.over(8, 0.15, 0.7);
    this.beams.forEach((b) => {
      b.setProgress(beam);
      b.setOpacity(sqOn * (beam > 0.001 ? 0.7 : 0) * (1 - c.p(10, 0.5)));
    });
    const img = sqOn * smoothstep(0.6, 1, beam);
    this.imgBar.setOpacity(img);
    this.imgSolid.setOpacity(img);
    this.imgHollow.setOpacity(img);
    this.imgNote.set({ opacity: img * c.p(8, 0.5, 2.5) });
    const proofTex = t >= c.s(10) ? `(-r,r)\\ni -\\tfrac r2<0,\\ \\ -\\tfrac r2\\notin[0,1)\\ \\Rightarrow\\ \\text{no ball around 0 inside}`
      : t >= c.s(9) ? "x\\in(-1,1)\\Rightarrow 0\\le x^2<1;\\qquad y\\in[0,1)\\Rightarrow y=(\\sqrt y)^2,\\ \\sqrt y\\in[0,1)"
      : "f(x)=x^2\\ \\ \\varepsilon\\text{–}\\delta\\ \\text{continuous}\\ \\Rightarrow\\ \\text{continuous (chapter 5)}";
    this.sqProof.setContent(proofTex);
    this.sqProof.set({ opacity: sqOn * (t >= c.s(7) ? 1 : 0) });
    const pr = sqOn * c.p(10, 0.5, 0.8);
    const r = 0.6 * Math.pow(0.15, c.over(11, 0.05, 0.9));
    this.probe.setPoints([P(gx(0), gy(0)), P(gx(0), gy(r))]);
    this.probeNeg.setPoints([P(gx(0), gy(0)), P(gx(0), gy(-r))]);
    this.probe.setOpacity(pr);
    this.probeNeg.setOpacity(pr);

    // ---- commuting (s12–s14)
    const cmm = c.p(12, 0.6) * (1 - c.p(15, 0.6));
    this.commute.set({ opacity: cmm * c.p(13, 0.6) });
    this.commuteProof.set({ opacity: cmm * c.p(14, 0.6) });

    // ---- A, B
    this.abBars.forEach((b) => b.setOpacity(abOn));
    this.abLabels.forEach((l) => l.set({ opacity: abOn }));
    const abBeam = c.over(17, 0.05, 0.6);
    this.abBeams.forEach((b) => {
      b.setProgress(abBeam);
      b.setOpacity(abOn * (abBeam > 0.001 ? 0.75 : 0));
    });
    this.abImage.setOpacity(abOn * smoothstep(0.6, 1, abBeam));
    const abTex = t >= c.s(17)
      ? `f(A)\\cap f(B)=(1,4)\\ ${tc(Palette.red, "\\neq")}\\ \\varnothing=f(A\\cap B)`
      : t >= c.s(16) ? "A\\cap B=\\varnothing\\ \\Rightarrow\\ f(A\\cap B)=\\varnothing" : "A=(-2,-1),\\quad B=(1,2)";
    this.abFormula.setContent(abTex);
    this.abFormula.set({ opacity: abOn });

    // ---- closing (s18–s21)
    this.closing.forEach((h, i) => h.set({ opacity: c.p(18 + i, 0.6) }));

    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
