import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { lerp, smoothstep } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline, sampleCurve } from "../../primitives/Polyline";
import { flash } from "./lib/Flash";
import { LabelPlacer } from "./lib/LabelPlacer";
import { PixelFrame } from "./lib/PixelFrame";
import { Shapes } from "./lib/Shapes";

/**
 * E02 c04 — transition maps. Part 1: U₊ (coordinate x) and U_r (coordinate y) on S¹, the point
 * p = (0.6, 0.8), the transition map x ↦ √(1 − x²) on (0, 1) and its blow-up at the excluded endpoint.
 * Part 2: stereographic charts σ_N, σ_S and the transition map u ↦ 1/u.
 * Default view (0, 0, 9); positions are given in pixels through PixelFrame.
 * Sentence indices refer to content/episodes/e02-smooth-manifolds/story.en.json, scene c04-transition-maps.
 */

const CIRC = PixelFrame.frame(420, 380, 200);    // circle of part 1 (math units)
const XAX_Y = -1.32;                             // math height of the φ₊ coordinate line
const YAX_X = 1.38;                              // math abscissa of the φ_r coordinate line
const GR = PixelFrame.frame(1010, 700, 400);     // transition-map graph (0..1 × 0..1)
const ST = PixelFrame.frame(500, 430, 190);      // stereographic circle (part 2)
const HY = PixelFrame.frame(1400, 430, 75);      // graph of v = 1/u
const P = new THREE.Vector2(0.6, 0.8);

/** Point of the overlap arc for parameter s ∈ [0, 1] (angle from 0.12 to π/2 − 0.12). */
const arcAngle = (s: number): number => lerp(0.15, Math.PI / 2 - 0.15, s);

export class TransitionMapsScene implements Scene {
  readonly id = "c04-transition-maps";
  private placer!: LabelPlacer;

  private circle!: Polyline;
  private arcUp!: Polyline;
  private arcRight!: Polyline;
  private overlap!: Polyline;
  private labelUp!: FormulaHandle;
  private labelRight!: FormulaHandle;
  private xAxis!: Arrow;
  private yAxis!: Arrow;
  private xAxisLabel!: FormulaHandle;
  private yAxisLabel!: FormulaHandle;
  private pDot!: Dot;
  private pLabel!: FormulaHandle;
  private dropX!: Polyline;
  private dropY!: Polyline;
  private xDot!: Dot;
  private yDot!: Dot;
  private xVal!: FormulaHandle;
  private yVal!: FormulaHandle;
  private imgX!: Polyline;
  private imgY!: Polyline;

  private defTop!: FormulaHandle;
  private defSub!: FormulaHandle;
  private bottom!: FormulaHandle;

  private grAxX!: Arrow;
  private grAxY!: Arrow;
  private grLabels: FormulaHandle[] = [];
  private curve!: Polyline;
  private grDot!: Dot;
  private endHollow!: Dot;
  private endHollow0!: Dot;
  private tangent!: Polyline;
  private endNote!: FormulaHandle;
  private closureNote!: FormulaHandle;
  private graphFormula!: FormulaHandle;

  private stCircle!: Polyline;
  private equator!: Polyline;
  private nDot!: Dot;
  private sDot!: Dot;
  private nLab!: FormulaHandle;
  private sLab!: FormulaHandle;
  private sp!: Dot;
  private rayN!: Polyline;
  private rayS!: Polyline;
  private uDot!: Dot;
  private vDot!: Dot;
  private uLab!: FormulaHandle;
  private vLab!: FormulaHandle;
  private hyAxX!: Arrow;
  private hyAxY!: Arrow;
  private hyLabels: FormulaHandle[] = [];
  private hyPos!: Polyline;
  private hyNeg!: Polyline;
  private hyDot!: Dot;
  private stFormula!: FormulaHandle;
  private stBottom!: FormulaHandle;

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.placer = new LabelPlacer(stage);
    stage.setView2D(0, 0, 9);

    // ---- Part 1: circle, two charts
    const C = (x: number, y: number): THREE.Vector3 => CIRC(x, y);
    this.circle = new Polyline(stage, Shapes.arc(0, 0, 1, 0, 2 * Math.PI, 160).map((v) => C(v.x, v.y)), { color: Palette.text, width: 2 });
    this.arcUp = new Polyline(stage, Shapes.arc(0, 0, 1.06, 0.02, Math.PI - 0.02, 90).map((v) => C(v.x, v.y)), { color: Palette.teal, width: 6 });
    this.arcRight = new Polyline(stage, Shapes.arc(0, 0, 1.13, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02, 90).map((v) => C(v.x, v.y)), { color: Palette.pink, width: 6 });
    this.overlap = new Polyline(stage, Shapes.arc(0, 0, 1.0, 0.02, Math.PI / 2 - 0.02, 50).map((v) => C(v.x, v.y)), { color: Palette.yellow, width: 8 });
    this.labelUp = fl.add({ tex: "U_+\\ (x)", x: 0, y: 0, size: 34, color: Palette.teal });
    this.labelRight = fl.add({ tex: "U_r\\ (y)", x: 0, y: 0, size: 34, color: Palette.pink, align: "left" });
    this.xAxis = new Arrow(stage, C(-1.25, XAX_Y), C(1.3, XAX_Y), Palette.axis, { width: 2.5, headLength: 0.16 });
    this.yAxis = new Arrow(stage, C(YAX_X, -1.2), C(YAX_X, 1.25), Palette.axis, { width: 2.5, headLength: 0.16 });
    this.xAxisLabel = fl.add({ tex: "x=\\varphi_+", x: 0, y: 0, size: 30, color: Palette.teal, align: "left" });
    this.yAxisLabel = fl.add({ tex: "y=\\varphi_r", x: 0, y: 0, size: 30, color: Palette.pink });
    this.imgX = new Polyline(stage, [C(0.01, XAX_Y), C(0.99, XAX_Y)], { color: Palette.yellow, width: 7 });
    this.imgY = new Polyline(stage, [C(YAX_X, 0.01), C(YAX_X, 0.99)], { color: Palette.yellow, width: 7 });
    this.pDot = new Dot(stage, C(P.x, P.y), Palette.orange, 0.08);
    this.pLabel = fl.add({ tex: "p", x: 0, y: 0, size: 32, color: Palette.orange });
    this.dropX = new Polyline(stage, [C(P.x, P.y), C(P.x, XAX_Y)], { color: Palette.teal, width: 2.5, dashed: true, dashSize: 0.1, gapSize: 0.07 });
    this.dropY = new Polyline(stage, [C(P.x, P.y), C(YAX_X, P.y)], { color: Palette.pink, width: 2.5, dashed: true, dashSize: 0.1, gapSize: 0.07 });
    this.xDot = new Dot(stage, C(P.x, XAX_Y), Palette.teal, 0.07);
    this.yDot = new Dot(stage, C(YAX_X, P.y), Palette.pink, 0.07);
    this.xVal = fl.add({ tex: "0.6", x: 0, y: 0, size: 30, color: Palette.teal });
    this.yVal = fl.add({ tex: "0.8", x: 0, y: 0, size: 30, color: Palette.pink, align: "left" });

    this.defTop = fl.add({ tex: "\\text{transition map}\\quad \\psi\\circ\\varphi^{-1}:\\ \\varphi(U\\cap V)\\ \\to\\ \\psi(U\\cap V)", x: 1260, y: 120, size: 38 });
    this.defSub = fl.add({ tex: "\\text{both open in } \\mathbb{R}^d\\ \\Rightarrow\\ \\text{ordinary calculus applies}", x: 1260, y: 190, size: 32, color: Palette.green });
    this.bottom = fl.add({ tex: "\\,", x: 960, y: 812, size: 34 });

    // ---- Transition graph
    this.grAxX = new Arrow(stage, GR(0, 0), GR(1.15, 0), Palette.axis, { width: 2.5, headLength: 0.16 });
    this.grAxY = new Arrow(stage, GR(0, 0), GR(0, 1.12), Palette.axis, { width: 2.5, headLength: 0.16 });
    const gl = (tex: string, color: string = Palette.muted): FormulaHandle => fl.add({ tex, x: 0, y: 0, size: 30, color });
    this.grLabels = [gl("x", Palette.teal), gl("y", Palette.pink), gl("0"), gl("1"), gl("1")];
    this.curve = new Polyline(stage, sampleCurve((x) => GR(x, Math.sqrt(1 - x * x)), 0.004, 0.996, 160), { color: Palette.yellow, width: 5 });
    this.grDot = new Dot(stage, GR(P.x, P.y), Palette.orange, 0.08);
    this.endHollow = new Dot(stage, GR(1, 0), Palette.yellow, 0.09, "2d", true);
    this.endHollow0 = new Dot(stage, GR(0, 1), Palette.yellow, 0.09, "2d", true);
    this.tangent = new Polyline(stage, [GR(0, 0), GR(1, 1)], { color: Palette.orange, width: 2.5, dashed: true, dashSize: 0.1, gapSize: 0.07 });
    this.endNote = fl.add({ tex: "x=1\\notin(0,1)", x: 0, y: 0, size: 32, color: Palette.orange, align: "left" });
    this.closureNote = fl.add({ tex: "\\text{on the closure } [0,1]:\\ \\text{not differentiable at } x=1", x: 0, y: 0, size: 30, color: Palette.red, align: "left" });
    this.graphFormula = fl.add({ tex: "\\varphi_r\\circ\\varphi_+^{-1}(x)=\\sqrt{1-x^2},\\qquad x\\in(0,1)", x: 1260, y: 120, size: 38, boxed: true });

    // ---- Part 2: stereographic charts
    const S = (x: number, y: number): THREE.Vector3 => ST(x, y);
    this.stCircle = new Polyline(stage, Shapes.arc(0, 0, 1, 0, 2 * Math.PI, 160).map((v) => S(v.x, v.y)), { color: Palette.blue, width: 3 });
    this.equator = new Polyline(stage, [S(-2.3, 0), S(2.6, 0)], { color: Palette.axis, width: 2.5 });
    this.nDot = new Dot(stage, S(0, 1), Palette.yellow, 0.08);
    this.sDot = new Dot(stage, S(0, -1), Palette.purple, 0.08);
    this.nLab = fl.add({ tex: "N", x: 0, y: 0, size: 32, color: Palette.yellow });
    this.sLab = fl.add({ tex: "S", x: 0, y: 0, size: 32, color: Palette.purple });
    this.sp = new Dot(stage, S(1, 0), Palette.orange, 0.08);
    this.rayN = new Polyline(stage, [S(0, 1), S(1, 0)], { color: Palette.green, width: 2.5 });
    this.rayS = new Polyline(stage, [S(0, -1), S(1, 0)], { color: Palette.purple, width: 2.5 });
    this.uDot = new Dot(stage, S(1, 0), Palette.green, 0.075);
    this.vDot = new Dot(stage, S(1, 0), Palette.purple, 0.075);
    this.uLab = fl.add({ tex: "u", x: 0, y: 0, size: 30, color: Palette.green });
    this.vLab = fl.add({ tex: "v", x: 0, y: 0, size: 30, color: Palette.purple });
    this.hyAxX = new Arrow(stage, HY(-3.2, 0), HY(3.3, 0), Palette.axis, { width: 2.5, headLength: 0.16 });
    this.hyAxY = new Arrow(stage, HY(0, -3.2), HY(0, 3.3), Palette.axis, { width: 2.5, headLength: 0.16 });
    this.hyLabels = [gl("u", Palette.green), gl("v", Palette.purple)];
    this.hyPos = new Polyline(stage, sampleCurve((u) => HY(u, 1 / u), 0.31, 3.1, 120), { color: Palette.yellow, width: 4 });
    this.hyNeg = new Polyline(stage, sampleCurve((u) => HY(u, 1 / u), -3.1, -0.31, 120), { color: Palette.yellow, width: 4 });
    this.hyDot = new Dot(stage, HY(1, 1), Palette.orange, 0.08);
    this.stFormula = fl.add({ tex: "\\sigma_S\\circ\\sigma_N^{-1}(u)=\\dfrac1u,\\qquad u\\in\\mathbb{R}\\setminus\\{0\\}", x: 960, y: 110, size: 40, boxed: true });
    this.stBottom = fl.add({ tex: "\\,", x: 960, y: 805, size: 34 });
  }

  private place(h: FormulaHandle, w: THREE.Vector3, dx: number, dy: number, o: number): void {
    this.placer.place(h, w, dx, dy, o);
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const C = (x: number, y: number): THREE.Vector3 => CIRC(x, y);

    // ---------- Part 1 visibility
    const part1 = c.p(1, 0.8) * (1 - c.p(23, 0.7));
    this.circle.setOpacity(part1 * 0.5);
    const chartsIn = c.p(2, 0.7);
    this.arcUp.setOpacity(part1 * chartsIn);
    this.arcRight.setOpacity(part1 * c.p(2, 0.7, 2.0));
    this.overlap.setOpacity(part1 * c.p(3, 0.6) * (t < c.s(4) ? flash(t, c.s(3) + 0.6, 1.0, 0.4) : 1));
    this.place(this.labelUp, C(-0.62, 1.05), -20, -16, part1 * chartsIn);
    this.place(this.labelRight, C(0.95, -1.12), -20, 0, part1 * c.p(2, 0.7, 2.0));
    this.xAxis.setOpacity(part1 * chartsIn);
    this.yAxis.setOpacity(part1 * c.p(2, 0.7, 2.0));
    this.place(this.xAxisLabel, C(1.32, XAX_Y), 14, 0, part1 * chartsIn);
    this.place(this.yAxisLabel, C(YAX_X, 1.27), 0, -24, part1 * c.p(2, 0.7, 2.0));
    const imgOn = part1 * c.p(12, 0.6) * (1 - c.p(14, 0.6));
    this.imgX.setOpacity(imgOn);
    this.imgY.setOpacity(part1 * c.p(13, 0.6, 2.0) * (1 - c.p(14, 0.6)));

    // p: fixed at (0.6, 0.8), slides along the overlap during s16 and s20–s21
    let ang = Math.atan2(P.y, P.x);
    if (t >= c.s(16) && t < c.s(17)) {
      const s = c.over(16, 0.05, 0.95);
      ang = s < 0.5 ? lerp(Math.atan2(P.y, P.x), arcAngle(1), smoothstep(0, 0.5, s)) : lerp(arcAngle(1), arcAngle(0), smoothstep(0.5, 1, s));
    } else if (t >= c.s(17) && t < c.s(20)) ang = arcAngle(0) + (Math.atan2(P.y, P.x) - arcAngle(0)) * c.p(17, 1.0);
    const px = Math.cos(ang);
    const py = Math.sin(ang);
    const pOn = part1 * c.p(4, 0.6);
    this.pDot.setPosition(C(px, py));
    this.pDot.setOpacity(pOn);
    this.place(this.pLabel, C(px, py), -26, 24, pOn);
    const grow = c.over(5, 0.0, 0.6);
    this.dropX.setPoints([C(px, py), C(px, lerp(py, XAX_Y, grow))]);
    this.dropY.setPoints([C(px, py), C(lerp(px, YAX_X, grow), py)]);
    const dropsOn = part1 * c.p(5, 0.4);
    this.dropX.setOpacity(dropsOn);
    this.dropY.setOpacity(dropsOn);
    this.xDot.setPosition(C(px, XAX_Y));
    this.yDot.setPosition(C(YAX_X, py));
    this.xDot.setOpacity(dropsOn * smoothstep(0.8, 1, grow));
    this.yDot.setOpacity(dropsOn * smoothstep(0.8, 1, grow));
    this.xVal.setContent(px.toFixed(2));
    this.yVal.setContent(py.toFixed(2));
    this.place(this.xVal, C(px, XAX_Y), 0, 30, dropsOn * smoothstep(0.8, 1, grow));
    this.place(this.yVal, C(YAX_X, py), 14, 0, dropsOn * smoothstep(0.8, 1, grow));

    // ---------- Definition and computation
    this.defTop.set({ opacity: c.p(7, 0.6) * (1 - c.p(15, 0.5)) });
    this.defSub.set({ opacity: c.p(9, 0.6, 1.0) * (1 - c.p(12, 0.5)) });
    let bTex = "\\,";
    let bOn = 0;
    if (t >= c.s(12) && t < c.s(14)) {
      bTex = "U_+\\cap U_r=\\{x>0,\\ y>0\\}:\\qquad \\varphi_+(U_+\\cap U_r)=(0,1),\\qquad \\varphi_r(U_+\\cap U_r)=(0,1)";
      bOn = c.p(12, 0.6) * (1 - c.p(14, 0.4, -0.4));
    } else if (t >= c.s(14) && t < c.s(17)) {
      bTex = t < c.s(15) ? "\\varphi_+^{-1}(x)=\\big(x,\\ \\sqrt{1-x^2}\\big)" : "\\varphi_r\\big(\\varphi_+^{-1}(x)\\big)=\\varphi_r\\big(x,\\ \\sqrt{1-x^2}\\big)=\\sqrt{1-x^2}";
      bOn = c.p(14, 0.6) * (1 - c.p(17, 0.4, -0.4));
    } else if (t >= c.s(17) && t < c.s(19)) {
      bTex = "1-x^2>0\\ \\text{on } (0,1),\\ \\ \\sqrt{\\cdot}\\in C^\\infty(0,\\infty)\\ \\Rightarrow\\ \\big(\\sqrt{1-x^2}\\big)'=\\dfrac{-x}{\\sqrt{1-x^2}}";
      bOn = c.p(17, 0.6) * (1 - c.p(19, 0.4, -0.4));
    } else if (t >= c.s(19) && t < c.s(20)) {
      bTex = "\\varphi_+\\circ\\varphi_r^{-1}(y)=\\sqrt{1-y^2},\\ \\ y\\in(0,1):\\ \\ \\text{smooth as well}";
      bOn = c.p(19, 0.6) * (1 - c.p(20, 0.4, -0.4));
    }
    this.bottom.setContent(bTex);
    this.bottom.set({ opacity: bOn });

    // ---------- Graph of the transition map (s15–s22)
    const grOn = c.p(15, 0.7) * (1 - c.p(23, 0.7));
    this.grAxX.setOpacity(grOn);
    this.grAxY.setOpacity(grOn);
    const gAnchors = [GR(1.2, 0), GR(0, 1.17), GR(0, 0), GR(1, 0), GR(0, 1)];
    const gOff: [number, number][] = [[14, 0], [0, -14], [-16, 18], [0, 26], [-20, 0]];
    this.grLabels.forEach((h, i) => this.place(h, gAnchors[i], gOff[i][0], gOff[i][1], grOn));
    this.curve.setProgress(c.over(15, 0.3, 0.95));
    this.curve.setOpacity(grOn);
    this.endHollow.setOpacity(grOn);
    this.endHollow0.setOpacity(grOn);
    this.grDot.setPosition(GR(px, py));
    this.grDot.setOpacity(grOn * c.p(16, 0.4) * (1 - c.p(20, 0.5)));
    this.graphFormula.set({ opacity: c.p(15, 0.6, 1.0) * (1 - c.p(23, 0.6)) });
    // Tangent line at x0 → 1 (s20), staying at x0 = 0.985 afterwards
    const x0 = lerp(0.5, 0.975, c.over(20, 0.1, 0.9));
    const y0 = Math.sqrt(1 - x0 * x0);
    const slope = -x0 / y0;
    const half = 0.45;
    const dx = half / Math.sqrt(1 + slope * slope);
    const dxLow = Math.min(dx, (y0 + 0.04) / Math.abs(slope));
    this.tangent.setPoints([GR(x0 - dx, y0 - slope * dx), GR(x0 + dxLow, y0 + slope * dxLow)]);
    const tanOn = grOn * c.p(20, 0.5);
    this.tangent.setOpacity(tanOn);
    this.endHollow.setScale(1 + 0.4 * (t >= c.s(21) && t < c.s(23) ? 1 - flash(t, c.s(21), 0.9, 0) : 0));
    this.place(this.endNote, GR(1, 0), 20, -34, grOn * c.p(21, 0.6));
    this.place(this.closureNote, GR(0.05, 0), 0, 62, grOn * c.p(22, 0.6));

    // ---------- Part 2: stereographic (s23–s31)
    const part2 = c.p(23, 0.8, 0.5);
    const S = (x: number, y: number): THREE.Vector3 => ST(x, y);
    this.stCircle.setOpacity(part2);
    this.equator.setOpacity(part2);
    this.nDot.setOpacity(part2);
    this.sDot.setOpacity(part2);
    this.place(this.nLab, S(0, 1), -24, -20, part2);
    this.place(this.sLab, S(0, -1), -24, 20, part2);
    const phase = Math.max(0, t - c.s(24));
    const th = 0.68 * Math.sin((phase * 2 * Math.PI) / 14 + 0.3);
    const qx = Math.cos(th);
    const qy = Math.sin(th);
    const u = qx / (1 - qy);
    const v = qx / (1 + qy);
    const qOn = part2 * c.p(24, 0.6);
    this.sp.setPosition(S(qx, qy));
    this.sp.setOpacity(qOn);
    this.rayN.setPoints([S(0, 1), qy < 0 ? S(qx, qy) : S(u, 0)]);
    this.rayS.setPoints([S(0, -1), qy > 0 ? S(qx, qy) : S(v, 0)]);
    this.rayN.setOpacity(qOn);
    this.rayS.setOpacity(qOn);
    this.uDot.setPosition(S(u, 0));
    this.vDot.setPosition(S(v, 0));
    this.uDot.setOpacity(qOn);
    this.vDot.setOpacity(qOn);
    this.uLab.setContent(`u=${u.toFixed(2)}`);
    this.vLab.setContent(`v=${v.toFixed(2)}`);
    const uAbove = u > v;
    this.place(this.uLab, S(u, 0), uAbove ? 30 : -30, -28, qOn);
    this.place(this.vLab, S(v, 0), uAbove ? -30 : 30, 30, qOn);
    const hyOn = part2 * c.p(25, 0.6);
    this.hyAxX.setOpacity(hyOn);
    this.hyAxY.setOpacity(hyOn);
    this.place(this.hyLabels[0], HY(3.45, 0), 10, 0, hyOn);
    this.place(this.hyLabels[1], HY(0, 3.45), 0, -6, hyOn);
    this.hyPos.setOpacity(hyOn * c.p(29, 0.6));
    this.hyNeg.setOpacity(hyOn * c.p(29, 0.6));
    this.hyDot.setPosition(HY(u, v));
    this.hyDot.setOpacity(hyOn);
    this.stFormula.set({ opacity: c.p(30, 0.6) });
    let sTex = "\\,";
    let sOn = 0;
    if (t >= c.s(25) && t < c.s(26)) { sTex = "\\text{overlap } S^1\\setminus\\{N,S\\},\\qquad \\sigma_N(\\text{overlap})=\\mathbb{R}\\setminus\\{0\\}"; sOn = c.p(25, 0.6) * (1 - c.p(26, 0.3, -0.3)); }
    else if (t >= c.s(26) && t < c.s(27)) { sTex = "\\sigma_N^{-1}(u)=\\Big(\\dfrac{2u}{u^2+1},\\ \\dfrac{u^2-1}{u^2+1}\\Big)"; sOn = c.p(26, 0.6) * (1 - c.p(27, 0.3, -0.3)); }
    else if (t >= c.s(27) && t < c.s(29)) { sTex = "\\sigma_S(x,y)=\\dfrac{x}{1+y},\\qquad 1+y=1+\\dfrac{u^2-1}{u^2+1}=\\dfrac{2u^2}{u^2+1}"; sOn = c.p(27, 0.6) * (1 - c.p(29, 0.3, -0.3)); }
    else if (t >= c.s(29) && t < c.s(31)) { sTex = "\\sigma_S\\big(\\sigma_N^{-1}(u)\\big)=\\dfrac{2u}{u^2+1}\\cdot\\dfrac{u^2+1}{2u^2}=\\dfrac1u"; sOn = c.p(29, 0.6) * (1 - c.p(31, 0.4, -0.2)); }
    else if (t >= c.s(31)) { sTex = "\\text{transition maps: ordinary maps between open subsets of } \\mathbb{R}^d"; sOn = c.p(31, 0.6); }
    this.stBottom.setContent(sTex);
    this.stBottom.set({ opacity: sOn });
  }

  teardown(_layers: SceneLayers): void {}
}
