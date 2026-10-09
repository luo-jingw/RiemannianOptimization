import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { lerp, smoothstep } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline, circlePoints } from "../../primitives/Polyline";
import { Region } from "../../primitives/Region";
import { flash } from "./lib/Flash";
import { LabelPlacer } from "./lib/LabelPlacer";
import { Shapes } from "./lib/Shapes";
import { Tex } from "./lib/Tex";

/**
 * E02 c02 — charts on S¹: the upper half-circle chart, why domain and image must be open,
 * why one chart cannot cover S¹ (borrowed compactness/connectedness), the four half-circle atlas,
 * and stereographic projection with its inverse.
 * Math coordinates (x, y) are drawn at world 2·(x, y); the view puts the circle center at pixel (700, 420).
 * The x-axis copy of ℝ for chart images is drawn below the circle at world y = AX_Y.
 * Sentence indices refer to content/episodes/e02-smooth-manifolds/story.en.json, scene c02-charts-on-the-circle.
 */

const S = 2;                                 // world units per math unit
const AX_Y = -2.92;                          // world height of the chart-image line ℝ
const YAX_X = 3.1;                           // world x of the vertical image line (charts using y)
const RIGHT_X = 1400;                        // left edge of the right column (px)
const W = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(S * x, S * y, 0);
const AX = (x: number): THREE.Vector3 => new THREE.Vector3(S * x, AX_Y, 0);
const YAX = (y: number): THREE.Vector3 => new THREE.Vector3(YAX_X, S * y, 0);
const up = (x: number): THREE.Vector3 => W(x, Math.sqrt(Math.max(0, 1 - x * x)));
const SAMPLE_X = [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9];
const TWO_TO_ONE_X = [-0.75, -0.25, 0.25, 0.75];

interface Row {
  h: FormulaHandle;
  tex: string;
}

export class ChartsOnCircleScene implements Scene {
  readonly id = "c02-charts-on-the-circle";
  private placer!: LabelPlacer;

  // Base
  private circle!: Polyline;
  private axisLine!: Polyline;
  private axisLabel!: FormulaHandle;
  private s1Label!: FormulaHandle;
  private top!: FormulaHandle;

  // Definition (right column)
  private defLines: FormulaHandle[] = [];

  // Upper chart
  private arcUp!: Polyline;
  private endL!: Dot;
  private endR!: Dot;
  private drops: Polyline[] = [];
  private dropDots: Dot[] = [];
  private image!: Polyline;
  private imgEndL!: Dot;
  private imgEndR!: Dot;
  private tickM1!: FormulaHandle;
  private tickP1!: FormulaHandle;
  private uPlusLabel!: FormulaHandle;
  private scanAxis!: Dot;
  private scanArc!: Dot;
  private scanLink!: Polyline;
  private scanLabel!: FormulaHandle;
  private halfPlane!: Region;
  private lowerTwin!: Dot;
  private lowerLabel!: FormulaHandle;

  // Checklist
  private checkTitle!: FormulaHandle;
  private checks: Row[] = [];

  // Closed half circle
  private closedImage!: Polyline;
  private closedEndDots: Dot[] = [];
  private magCircle!: Polyline;
  private magAxis!: Polyline;
  private nbhdCircle!: Polyline;
  private nbhdAxis!: Polyline;
  private nbhdMissing!: Polyline;
  private notOpen!: FormulaHandle;

  // Wrapped interval reminder
  private wrapLine!: Polyline;
  private wrapStart!: Dot;
  private wrapEnd!: Dot;
  private wrap0!: FormulaHandle;
  private wrap2pi!: FormulaHandle;
  private wrapCircleDot!: Dot;
  private wrapAxisDot!: Dot;
  private wrapNote!: FormulaHandle;
  private nearNote!: FormulaHandle;

  // Two to one
  private pairs: { a: Polyline; b: Polyline; da: Dot; db: Dot; land: Dot }[] = [];
  private twoToOne!: FormulaHandle;

  // Proof that one chart is not enough
  private proof: Row[] = [];
  private borrowBox!: FormulaHandle;
  private compactLabel!: FormulaHandle;

  // Four half circles
  private quarter: { arc: Polyline; img: Polyline; label: FormulaHandle; at: THREE.Vector3 }[] = [];
  private yAxisLine!: Polyline;
  private yAxisLabel!: FormulaHandle;

  // Stereographic projection
  private equator!: Polyline;
  private nDot!: Dot;
  private sDot!: Dot;
  private nLabel!: FormulaHandle;
  private sLabel!: FormulaHandle;
  private pDot!: Dot;
  private ray!: Polyline;
  private uDot!: Dot;
  private uLabel!: FormulaHandle;
  private pLabel!: FormulaHandle;
  private infNote!: FormulaHandle;
  private stereo: Row[] = [];

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.placer = new LabelPlacer(stage);
    stage.setView2D(2.1667, -1.0, 9);

    this.circle = new Polyline(stage, circlePoints(0, 0, S, 160), { color: Palette.text, width: 2.5 });
    this.axisLine = new Polyline(stage, [AX(-1.75), AX(1.75)], { color: Palette.axis, width: 2.5 });
    this.axisLabel = fl.add({ tex: "\\mathbb{R}", x: 0, y: 0, size: 34, color: Palette.muted });
    this.s1Label = fl.add({ tex: "S^1", x: 0, y: 0, size: 40, color: Palette.text });
    this.top = fl.add({ tex: "", x: 700, y: 92, size: 40 });

    const defTex = [
      "\\text{chart }(U,\\varphi)\\text{ of dimension } d:",
      "U\\subseteq M\\ \\text{open},",
      "\\varphi:U\\to\\varphi(U)\\subseteq\\mathbb{R}^d\\ \\text{homeomorphism},",
      "\\varphi(U)\\ \\text{open in } \\mathbb{R}^d.",
      "\\varphi(p)=\\text{local coordinates of } p",
    ];
    this.defLines = defTex.map((tex, i) => fl.add({ tex, x: RIGHT_X - 40, y: 250 + i * 70, size: i === 0 ? 32 : 30, align: "left",
      color: i === 4 ? Palette.orange : Palette.text }));

    // ---- Upper chart
    this.arcUp = new Polyline(stage, Shapes.arc(0, 0, S, 0.012, Math.PI - 0.012, 100), { color: Palette.teal, width: 7 });
    this.endL = new Dot(stage, W(-1, 0), Palette.teal, 0.1, "2d", true);
    this.endR = new Dot(stage, W(1, 0), Palette.teal, 0.1, "2d", true);
    this.drops = SAMPLE_X.map((x) => new Polyline(stage, [up(x), AX(x)], { color: Palette.teal, width: 2, dashed: true, dashSize: 0.1, gapSize: 0.08 }));
    this.dropDots = SAMPLE_X.map((x) => new Dot(stage, up(x), Palette.teal, 0.06));
    this.image = new Polyline(stage, [AX(-0.985), AX(0.985)], { color: Palette.teal, width: 8 });
    this.imgEndL = new Dot(stage, AX(-1), Palette.teal, 0.1, "2d", true);
    this.imgEndR = new Dot(stage, AX(1), Palette.teal, 0.1, "2d", true);
    this.tickM1 = fl.add({ tex: "-1", x: 0, y: 0, size: 30, color: Palette.muted });
    this.tickP1 = fl.add({ tex: "1", x: 0, y: 0, size: 30, color: Palette.muted });
    this.uPlusLabel = fl.add({ tex: "U_+", x: 0, y: 0, size: 38, color: Palette.teal });
    this.scanAxis = new Dot(stage, AX(0), Palette.orange, 0.08);
    this.scanArc = new Dot(stage, up(0), Palette.orange, 0.08);
    this.scanLink = new Polyline(stage, [AX(0), up(0)], { color: Palette.orange, width: 2.5 });
    this.scanLabel = fl.add({ tex: "", x: 0, y: 0, size: 30, color: Palette.orange, align: "left" });
    this.halfPlane = new Region(stage, [W(-1.3, 0), W(1.3, 0), W(1.3, 1.25), W(-1.3, 1.25)], Palette.teal, 0.12, -0.02);
    this.lowerTwin = new Dot(stage, W(0.6, -0.8), Palette.red, 0.08);
    this.lowerLabel = fl.add({ tex: "(0.6,-0.8)\\notin U_+", x: 0, y: 0, size: 30, color: Palette.red, align: "left" });

    // ---- Checklist
    this.checkTitle = fl.add({ text: "Is (U₊, φ₊) a chart?", x: RIGHT_X - 40, y: 200, size: 30, color: Palette.muted, align: "left", weight: 600 });
    const checkTex = [
      "U_+=S^1\\cap\\{y>0\\}\\ \\text{open}",
      "\\varphi_+\\ \\text{continuous}",
      "\\varphi_+:U_+\\to(-1,1)\\ \\text{bijective}",
      "\\varphi_+^{-1}\\ \\text{continuous}",
      "\\varphi_+(U_+)=(-1,1)\\ \\text{open}",
    ];
    this.checks = checkTex.map((tex, i) => ({ tex, h: fl.add({ tex, x: RIGHT_X - 40, y: 270 + i * 80, size: 30, align: "left" }) }));

    // ---- Closed half circle
    this.closedImage = new Polyline(stage, [AX(-1), AX(1)], { color: Palette.teal, width: 8 });
    this.closedEndDots = [W(-1, 0), W(1, 0), AX(-1), AX(1)].map((q) => new Dot(stage, q, Palette.teal, 0.1));
    this.magCircle = new Polyline(stage, circlePoints(S, 0, 0.62, 80), { color: Palette.text, width: 2 });
    this.magAxis = new Polyline(stage, circlePoints(S, AX_Y, 0.62, 80), { color: Palette.text, width: 2 });
    this.nbhdCircle = new Polyline(stage, Shapes.arc(0, 0, S, -0.28, 0.28, 30), { color: Palette.orange, width: 10 });
    this.nbhdAxis = new Polyline(stage, [AX(0.72), AX(1)], { color: Palette.orange, width: 10 });
    this.nbhdMissing = new Polyline(stage, [AX(1.02), AX(1.28)], { color: Palette.red, width: 4, dashed: true, dashSize: 0.06, gapSize: 0.05 });
    this.notOpen = fl.add({ tex: "[-1,1]\\ \\text{is not open}", x: 0, y: 0, size: 34, color: Palette.red, align: "left" });

    // ---- Wrapped interval reminder: [0, 2π) drawn on the axis line from math x = −1.5 to 1.5
    this.wrapLine = new Polyline(stage, [AX(-1.5), AX(1.49)], { color: Palette.blue, width: 6 });
    this.wrapStart = new Dot(stage, AX(-1.5), Palette.blue, 0.085);
    this.wrapEnd = new Dot(stage, AX(1.5), Palette.blue, 0.095, "2d", true);
    this.wrap0 = fl.add({ tex: "0", x: 0, y: 0, size: 30, color: Palette.muted });
    this.wrap2pi = fl.add({ tex: "2\\pi", x: 0, y: 0, size: 30, color: Palette.muted });
    this.wrapCircleDot = new Dot(stage, W(1, 0), Palette.orange, 0.09);
    this.wrapAxisDot = new Dot(stage, AX(-1.5), Palette.orange, 0.09);
    this.wrapNote = fl.add({ tex: "[0,2\\pi)\\ \\text{is not open}", x: 0, y: 0, size: 32, color: Palette.red, align: "left" });
    this.nearNote = fl.add({ tex: "\\text{near on } M\\ \\not\\Rightarrow\\ \\text{near in coordinates}", x: 1180, y: 250, size: 32, color: Palette.red });

    // ---- Two points per x
    this.pairs = TWO_TO_ONE_X.map((x) => {
      const yy = Math.sqrt(1 - x * x);
      return {
        a: new Polyline(stage, [W(x, yy), AX(x)], { color: Palette.teal, width: 2.5 }),
        b: new Polyline(stage, [W(x, -yy), AX(x)], { color: Palette.purple, width: 2.5, dashed: true, dashSize: 0.1, gapSize: 0.07 }),
        da: new Dot(stage, W(x, yy), Palette.teal, 0.08),
        db: new Dot(stage, W(x, -yy), Palette.purple, 0.08),
        land: new Dot(stage, AX(x), Palette.red, 0.09),
      };
    });
    this.twoToOne = fl.add({ tex: "2\\to 1:\\ \\text{not injective}", x: 0, y: 0, size: 34, color: Palette.red, align: "left" });

    // ---- Proof block (x from 1010)
    const px = 1010;
    this.borrowBox = fl.add({
      tex: "\\begin{aligned}&\\textbf{borrowed from analysis}\\\\ &\\text{1. bounded closed}\\subseteq\\mathbb{R}^d\\Rightarrow\\text{compact};\\\\ &\\quad\\ \\ \\text{continuous image of compact is compact}\\\\ &\\text{2. } \\mathbb{R}^d\\ \\text{connected: open and closed}\\Rightarrow\\varnothing\\ \\text{or}\\ \\mathbb{R}^d\\end{aligned}",
      x: px, y: 250, size: 28, align: "left", display: true, boxed: true, color: Palette.muted,
    });
    const proofTex = [
      "\\text{Suppose }\\varphi:S^1\\to V\\subseteq\\mathbb{R}^d\\ \\text{homeomorphism},\\ V\\ \\text{open}",
      `${Tex.c(Palette.muted, "\\text{(invariance of dimension: } d=1\\text{; not needed below)}")}`,
      "S^1\\ \\text{compact}\\ \\Rightarrow\\ V=\\varphi(S^1)\\ \\text{compact}\\ \\Rightarrow\\ V\\ \\text{bounded, closed}",
      "V\\neq\\varnothing,\\ \\text{open and closed}\\ \\Rightarrow\\ V=\\mathbb{R}^d",
      `V\\ \\text{bounded},\\ \\mathbb{R}^d\\ \\text{unbounded}\\ \\Rightarrow\\ ${Tex.c(Palette.red, "\\text{contradiction}")}`,
      `${Tex.c(Palette.yellow, "\\text{every atlas of } S^1\\ \\text{needs}\\ \\geq 2\\ \\text{charts}")}`,
    ];
    this.proof = proofTex.map((tex, i) => ({ tex, h: fl.add({ tex, x: px, y: 420 + i * 62, size: 28, align: "left" }) }));
    this.compactLabel = fl.add({ text: "bounded + closed ⇒ compact", x: 0, y: 0, size: 26, color: Palette.muted });

    // ---- Four half circles
    const quarterSpec: { color: string; r: number; a0: number; a1: number; tex: string; label: THREE.Vector3; img: THREE.Vector3[] }[] = [
      { color: Palette.teal, r: 1.07, a0: 0, a1: Math.PI, tex: "U_+", label: W(0, 1.24), img: [AX(-0.985), AX(0.985)].map((v) => v.clone().add(new THREE.Vector3(0, 0.07, 0))) },
      { color: Palette.green, r: 1.07, a0: Math.PI, a1: 2 * Math.PI, tex: "U_-", label: W(0, -1.24), img: [AX(-0.985), AX(0.985)].map((v) => v.clone().add(new THREE.Vector3(0, -0.07, 0))) },
      { color: Palette.pink, r: 1.14, a0: -Math.PI / 2, a1: Math.PI / 2, tex: "U_r", label: W(1.3, 0.12), img: [YAX(-0.985), YAX(0.985)].map((v) => v.clone().add(new THREE.Vector3(0.07, 0, 0))) },
      { color: Palette.purple, r: 1.14, a0: Math.PI / 2, a1: 1.5 * Math.PI, tex: "U_l", label: W(-1.3, 0.12), img: [YAX(-0.985), YAX(0.985)].map((v) => v.clone().add(new THREE.Vector3(-0.07, 0, 0))) },
    ];
    this.quarter = quarterSpec.map((q) => ({
      arc: new Polyline(stage, Shapes.arc(0, 0, S * q.r, q.a0 + 0.02, q.a1 - 0.02, 90), { color: q.color, width: 6 }),
      img: new Polyline(stage, q.img, { color: q.color, width: 6 }),
      label: fl.add({ tex: q.tex, x: 0, y: 0, size: 36, color: q.color }),
      at: q.label,
    }));
    this.yAxisLine = new Polyline(stage, [YAX(-1.3), YAX(1.3)], { color: Palette.axis, width: 2.5 });
    this.yAxisLabel = fl.add({ tex: "\\mathbb{R}\\ (y)", x: 0, y: 0, size: 30, color: Palette.muted });

    // ---- Stereographic projection
    this.equator = new Polyline(stage, [W(-2.6, 0), W(2.72, 0)], { color: Palette.axis, width: 2.5 });
    this.nDot = new Dot(stage, W(0, 1), Palette.yellow, 0.09);
    this.sDot = new Dot(stage, W(0, -1), Palette.purple, 0.09);
    this.nLabel = fl.add({ tex: "N=(0,1)", x: 0, y: 0, size: 32, color: Palette.yellow });
    this.sLabel = fl.add({ tex: "S=(0,-1)", x: 0, y: 0, size: 32, color: Palette.purple });
    this.pDot = new Dot(stage, W(1, 0), Palette.orange, 0.085);
    this.ray = new Polyline(stage, [W(0, 1), W(1, 0)], { color: Palette.orange, width: 2.5 });
    this.uDot = new Dot(stage, W(1, 0), Palette.green, 0.085);
    this.uLabel = fl.add({ tex: "u", x: 0, y: 0, size: 32, color: Palette.green });
    this.pLabel = fl.add({ tex: "p", x: 0, y: 0, size: 32, color: Palette.orange });
    this.infNote = fl.add({ tex: "u\\to\\infty", x: 0, y: 0, size: 34, color: Palette.green });
    const stereoTex = [
      "\\text{line through } N,\\,(u,0):\\ \\ t\\mapsto(tu,\\ 1-t)",
      "t^2u^2+(1-t)^2=1",
      "\\iff t\\,\\big(t(u^2+1)-2\\big)=0",
      "t=0\\ \\text{is } N\\ \\Rightarrow\\ t=\\dfrac{2}{u^2+1}",
      `${Tex.c(Palette.yellow, "\\sigma_N^{-1}(u)=\\Big(\\dfrac{2u}{u^2+1},\\ \\dfrac{u^2-1}{u^2+1}\\Big)")}`,
      `1-y=\\dfrac{2}{u^2+1}\\ \\Rightarrow\\ \\dfrac{x}{1-y}=u\\ ${Tex.c(Palette.green, "\\checkmark")}`,
      `${Tex.c(Palette.purple, "\\sigma_S(x,y)=\\dfrac{x}{1+y}\\ \\ \\text{on } S^1\\setminus\\{S\\}")}`,
    ];
    this.stereo = stereoTex.map((tex, i) => ({ tex, h: fl.add({ tex, x: RIGHT_X - 30, y: 175 + i * 88, size: 28, align: "left" }) }));
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;

    // ---------- Base: circle and image line
    const circleOn = c.p(0, 1.0, 0.5);
    this.circle.setOpacity(circleOn * (t >= c.s(7) && t < c.s(32) ? 0.35 : 0.8));
    const axisOn = c.p(0, 1.0, 1.5) * (1 - c.p(49, 0.8));
    this.axisLine.setOpacity(axisOn);
    this.placer.place(this.axisLabel, AX(1.85), 0, 0, axisOn);
    this.placer.place(this.s1Label, W(-0.86, 0.86), -30, -20, circleOn * (1 - c.p(7, 0.6)) + circleOn * c.p(34, 0.6) * (1 - c.p(44, 0.6)));

    // Top band formula
    let topTex = "";
    let topOn = 0;
    if (t >= c.s(2) && t < c.s(3) + 0.6) { topTex = "S^1=\\{(x,y)\\in\\mathbb{R}^2:\\ x^2+y^2=1\\}"; topOn = c.p(2, 0.6) * (1 - c.p(3, 0.5)); }
    else if (t >= c.s(10) && t < c.s(22)) { topTex = "\\varphi_+(x,y)=x,\\qquad \\varphi_+^{-1}(x)=\\big(x,\\ \\sqrt{1-x^2}\\big)"; topOn = c.p(10, 0.6) * (1 - c.p(22, 0.5, -0.5)); }
    else if (t >= c.s(22) && t < c.s(27)) { topTex = "\\varphi_+:\\{y\\geq 0\\}\\to[-1,1]\\ \\ \\text{injective, image not open}"; topOn = c.p(22, 0.6) * (1 - c.p(27, 0.5, -0.5)); }
    else if (t >= c.s(27) && t < c.s(32)) { topTex = "t\\mapsto(\\cos t,\\sin t):\\ \\ \\text{inverse}\\ S^1\\to[0,2\\pi)\\ \\text{jumps at } (1,0)"; topOn = c.p(27, 0.6) * (1 - c.p(32, 0.5, -0.5)); }
    else if (t >= c.s(49) && t < c.s(59)) { topTex = "\\sigma_N(x,y)=\\dfrac{x}{1-y}\\quad\\text{on } S^1\\setminus\\{N\\}"; topOn = c.p(51, 0.6); }
    this.top.setContent(topTex === "" ? "\\," : topTex);
    this.top.set({ opacity: topOn });

    // ---------- Definition (s3–s6)
    const defOn = 1 - c.p(12, 0.6);
    const defStart = [3, 4, 5, 5, 6];
    this.defLines.forEach((h, i) => h.set({ opacity: defOn * c.p(defStart[i], 0.6, i === 3 ? 2.0 : 0.3) }));

    // ---------- Upper chart (s7–s21)
    const chartOn = c.p(7, 0.8) * (1 - c.p(22, 0.6, -0.3));
    const closedOn = c.p(22, 0.6) * (1 - c.p(27, 0.6));
    const arcOn = Math.max(chartOn, closedOn);
    this.arcUp.setOpacity(arcOn);
    this.endL.setOpacity(chartOn);
    this.endR.setOpacity(chartOn);
    this.uPlusLabel.setContent(t >= c.s(22) ? "\\{y\\geq 0\\}" : "U_+");
    this.placer.place(this.uPlusLabel, W(-0.55, 1.05), -10, -10, arcOn);

    const dropProg = c.over(9, 0.05, 0.7);
    const dropFlash = t >= c.s(15) && t < c.s(16) ? flash(t, c.s(15), 0.8, 0.3) : 1;
    const dropsOn = t >= c.s(15) && t < c.s(16) ? chartOn : chartOn * (1 - 0.75 * c.p(10, 0.6));
    this.drops.forEach((d, i) => {
      const x = SAMPLE_X[i];
      const pr = smoothstep(i * 0.08, i * 0.08 + 0.4, dropProg);
      d.setPoints([up(x), up(x).lerp(AX(x), pr)]);
      d.setOpacity(dropsOn * dropFlash * (pr > 0.001 ? 1 : 0));
      this.dropDots[i].setOpacity(chartOn * c.p(9, 0.4) * (1 - 0.6 * c.p(10, 0.6)));
    });
    const imgOn = Math.max(chartOn * smoothstep(0.55, 0.95, dropProg), 0);
    const imgFlash = t >= c.s(21) && t < c.s(22) ? flash(t, c.s(21), 0.8, 0.3) : 1;
    this.image.setOpacity(imgOn * imgFlash);
    this.imgEndL.setOpacity(imgOn);
    this.imgEndR.setOpacity(imgOn);
    const tickOn = Math.max(imgOn, closedOn);
    this.placer.place(this.tickM1, AX(-1), 0, 34, tickOn);
    this.placer.place(this.tickP1, AX(1), 0, 34, tickOn);

    // Scan point: sweeps in s11, rests at 0.6; sweeps again in s18–s19 (onto)
    const sweep1 = c.over(11, 0.0, 0.9);
    const sweep2 = c.over(18, 0.2, 1.0) * (1 - c.over(19, 0.1, 0.9));
    let xs = 0.6;
    if (t < c.s(12)) xs = sweep1 < 0.5 ? lerp(0, -0.9, smoothstep(0, 0.5, sweep1)) : lerp(-0.9, 0.6, smoothstep(0.5, 1, sweep1));
    else if (t >= c.s(18) && t < c.s(20)) xs = lerp(0.6, -0.75, sweep2);
    const scanOn = chartOn * c.p(10, 0.6, 1.0);
    const linkFlash = t >= c.s(20) && t < c.s(21) ? flash(t, c.s(20), 0.8, 0.3) : 1;
    this.scanAxis.setPosition(AX(xs));
    this.scanArc.setPosition(up(xs));
    this.scanLink.setPoints([AX(xs), up(xs)]);
    this.scanAxis.setOpacity(scanOn);
    this.scanArc.setOpacity(scanOn);
    this.scanLink.setOpacity(scanOn * 0.8 * linkFlash);
    this.scanLabel.setContent(`x=${xs.toFixed(2)}\\ \\mapsto\\ (${xs.toFixed(2)},\\ ${Math.sqrt(1 - xs * xs).toFixed(2)})`);
    this.placer.place(this.scanLabel, W(0.95, 1.12), 0, 0, scanOn * c.p(11, 0.5) * (t >= c.s(12) && t < c.s(18) ? 0 : 1));

    const halfOn = chartOn * c.p(13, 0.6) * (1 - c.p(15, 0.5));
    this.halfPlane.setOpacity(0.14 * halfOn * flash(t, c.s(13) + 0.6, 1.0, 0.5));
    const twinOn = chartOn * c.p(16, 0.6) * (1 - c.p(18, 0.5));
    this.lowerTwin.setOpacity(twinOn);
    this.placer.place(this.lowerLabel, W(0.6, -0.8), 20, 18, twinOn);

    // ---------- Checklist (s12–s21)
    const listOn = c.p(12, 0.6) * (1 - c.p(22, 0.6));
    this.checkTitle.set({ opacity: listOn });
    const checkAt = [c.in(14, 0.6), c.in(15, 0.6), c.in(19, 0.7), c.in(20, 0.6), c.in(21, 0.6)];
    this.checks.forEach((row, i) => {
      const done = t >= checkAt[i];
      row.h.setContent(`${done ? Tex.c(Palette.green, "\\checkmark") : "\\phantom{\\checkmark}"}\\ \\ ${row.tex}`);
      row.h.set({ opacity: listOn, color: done ? Palette.text : Palette.muted });
    });

    // ---------- Closed half circle (s22–s26)
    const closedImgOn = closedOn * c.p(23, 0.6);
    this.closedImage.setOpacity(closedImgOn);
    this.closedEndDots.forEach((d, i) => d.setOpacity(i < 2 ? closedOn : closedImgOn));
    const magOn = closedOn * c.p(24, 0.6);
    this.magCircle.setOpacity(magOn);
    this.nbhdCircle.setOpacity(magOn);
    const magAxisOn = closedOn * c.p(25, 0.6);
    this.magAxis.setOpacity(magAxisOn);
    this.nbhdAxis.setOpacity(magAxisOn);
    this.nbhdMissing.setOpacity(magAxisOn);
    this.placer.place(this.notOpen, AX(1.35), 20, -75, closedOn * c.p(26, 0.6));

    // ---------- Wrapped interval (s27–s31)
    const wrapOn = c.p(28, 0.6) * (1 - c.p(32, 0.6));
    this.wrapLine.setOpacity(wrapOn);
    this.wrapStart.setOpacity(wrapOn);
    this.wrapEnd.setOpacity(wrapOn * flash(t, c.s(29), 0.9, 0.3));
    this.placer.place(this.wrap0, AX(-1.5), 0, 34, wrapOn);
    this.placer.place(this.wrap2pi, AX(1.5), 0, 34, wrapOn);
    const ang = lerp(0.7, -0.7, c.over(28, 0.15, 0.85));
    const tPar = ang >= 0 ? ang : 2 * Math.PI + ang;
    this.wrapCircleDot.setPosition(W(Math.cos(ang), Math.sin(ang)));
    this.wrapAxisDot.setPosition(AX(-1.5 + 3 * tPar / (2 * Math.PI)));
    this.wrapCircleDot.setOpacity(wrapOn);
    this.wrapAxisDot.setOpacity(wrapOn);
    this.placer.place(this.wrapNote, AX(0.2), 0, -40, wrapOn * c.p(29, 0.6));
    this.nearNote.set({ opacity: c.p(30, 0.6) * (1 - c.p(32, 0.6)) });

    // ---------- Whole-circle projection (s32–s33)
    const pairOn = c.p(32, 0.6) * (1 - c.p(34, 0.6));
    this.pairs.forEach((pr, i) => {
      const g = c.p(32, 0.8, 1.5 + 0.35 * i);
      pr.a.setOpacity(pairOn * g);
      pr.b.setOpacity(pairOn * g);
      pr.da.setOpacity(pairOn * g);
      pr.db.setOpacity(pairOn * g);
      pr.land.setOpacity(pairOn * c.p(33, 0.4) * flash(t, c.s(33) + 0.4, 0.8, 0.3));
    });
    this.placer.place(this.twoToOne, AX(1.1), 30, -60, pairOn * c.p(33, 0.6));

    // ---------- One chart is not enough (s34–s43)
    const proofOn = 1 - c.p(44, 0.6);
    this.borrowBox.set({ opacity: proofOn * c.p(36, 0.6) });
    const proofStart = [38, 39, 40, 41, 42, 43];
    const proofOffset = [0.3, 0.3, 0.5, 0.5, 0.5, 0.3];
    this.proof.forEach((row, i) => row.h.set({ opacity: c.p(proofStart[i], 0.6, proofOffset[i]) * proofOn }));
    this.placer.place(this.compactLabel, W(0, -1.25), 0, 0, c.p(40, 0.6) * (1 - c.p(44, 0.6)));

    // ---------- Four half circles (s44–s48)
    const fourOn = c.p(44, 0.6) * (1 - c.p(49, 0.8));
    const starts = [45, 45, 46, 46];
    this.quarter.forEach((q, i) => {
      const g = c.p(starts[i], 0.7, i % 2 === 0 ? 0.2 : 1.6) * fourOn;
      const overlapFlash = t >= c.s(48) && t < c.s(49) ? flash(t, c.s(48), 1.0, 0.45) : 1;
      q.arc.setOpacity(g * overlapFlash);
      q.img.setOpacity(g * (1 - c.p(49, 0.6)));
      this.placer.place(q.label, q.at, 0, 0, g * (1 - c.p(49, 0.6)));
    });
    const yAxOn = c.p(46, 0.6) * (1 - c.p(49, 0.6));
    this.yAxisLine.setOpacity(yAxOn);
    this.placer.place(this.yAxisLabel, YAX(1.42), 0, 0, yAxOn);

    // ---------- Stereographic projection (s49–s58)
    const stOn = c.p(49, 0.8);
    this.equator.setOpacity(stOn);
    this.nDot.setOpacity(stOn);
    this.placer.place(this.nLabel, W(0, 1), -80, -26, stOn);
    const sOn = c.p(58, 0.6);
    this.sDot.setOpacity(sOn);
    this.placer.place(this.sLabel, W(0, -1), -85, 24, sOn);
    // p: rests at angle −0.5, then (s52) climbs toward N from the right, then returns to −0.5 for the derivation
    const climb = c.over(52, 0.05, 0.85) * (1 - c.p(53, 1.2));
    const thetaP = lerp(-0.5, Math.PI / 2 - 0.72, climb) + 0.35 * Math.sin(Math.max(0, Math.min(1, c.over(50, 0.2, 1.0))) * Math.PI) * (t < c.s(52) ? 1 : 0);
    const px = Math.cos(thetaP);
    const py = Math.sin(thetaP);
    const u = px / (1 - py);
    const pOn = c.p(50, 0.6);
    this.pDot.setPosition(W(px, py));
    this.pDot.setOpacity(pOn);
    this.ray.setPoints([W(0, 1), py < 0 ? W(px, py) : W(u, 0)]);
    this.ray.setOpacity(pOn * c.over(50, 0.2, 0.6));
    this.uDot.setPosition(W(u, 0));
    this.uDot.setOpacity(pOn * c.over(50, 0.4, 0.7));
    this.uLabel.setContent(`u=${u.toFixed(2)}`);
    this.placer.place(this.uLabel, W(u, 0), -62, 26, pOn * c.over(50, 0.4, 0.7));
    this.placer.place(this.pLabel, W(px, py), 24, -10, pOn);
    this.placer.place(this.infNote, W(2.45, 0), 0, -34, c.p(52, 0.6) * (1 - c.p(53, 0.6)));
    const stStart = [53, 54, 54, 55, 56, 57, 58];
    const stOff = [0.3, 0.3, 3.0, 0.3, 0.3, 0.3, 0.5];
    this.stereo.forEach((row, i) => row.h.set({ opacity: c.p(stStart[i], 0.6, stOff[i]) }));
  }

  teardown(_layers: SceneLayers): void {}
}
