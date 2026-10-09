import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { lerp } from "../../primitives/Easing";
import { keyframes } from "../../primitives/Keyframes";
import { Palette } from "../../primitives/Palette";
import { Polyline, circlePoints, sampleCurve } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Anchor } from "./lib/Anchor";
import { Tex } from "./lib/Tex";

/**
 * E04 c04 — the derivative of the implicit function: differentiate f(x, g(x)) ≡ 0 with the chain rule.
 * Phase A (s0–s11): derivation in the formula area, with the circle and the graph of g as a small reminder.
 * Phase B (s12–s20): check on the circle at p = (0.6, 0.8), then push the point to (1, 0) where the slope blows up.
 * Sentence indices refer to content/episodes/e04-implicit-level-sets/story.en.json, scene c04-implicit-derivative.
 */

const LEFT_CENTER_X = 750;
const THETA_P = Math.atan2(0.8, 0.6);
const GOLD = Palette.yellow;
const GRAY = Palette.muted;
const v3 = (x: number, y: number, z = 0): THREE.Vector3 => new THREE.Vector3(x, y, z);

export class ImplicitDerivativeScene implements Scene {
  readonly id = "c04-implicit-derivative";
  private anchor!: Anchor;

  private identity!: FormulaHandle;
  private phiDef!: FormulaHandle;
  private chain!: FormulaHandle;
  private blocks!: FormulaHandle;
  private sum!: FormulaHandle;
  private need!: FormulaHandle;
  private noFormula!: FormulaHandle;
  private result!: FormulaHandle;
  private linear!: FormulaHandle;
  private linLink!: FormulaHandle;

  private axes: Arrow[] = [];
  private axisLabels: FormulaHandle[] = [];
  private circle!: Polyline;
  private graph!: Polyline;
  private graphLabel!: FormulaHandle;
  private pDot!: Dot;
  private tangent!: Polyline;
  private slopeReadout!: FormulaHandle;
  private panelFormula!: FormulaHandle;
  private panelDirect!: FormulaHandle;
  private agree!: FormulaHandle;
  private verdict!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.anchor = new Anchor(stage);
    stage.setView2D(1.767, -0.233, 3.6);       // origin at pixel (430, 470), 300 px per unit

    this.noFormula = fl.add({ tex: `g:A\\to B\\ \\text{exists, smooth}\\qquad g(x)=\\ ${Tex.color(Palette.red, "?")}`, x: LEFT_CENTER_X, y: 400, size: 44 });
    this.identity = fl.add({ tex: this.identityTex(false), x: LEFT_CENTER_X, y: 110, size: 50 });
    this.phiDef = fl.add({ tex: `\\Phi(x)=(${Tex.color(GRAY, "x")},\\ ${Tex.color(GOLD, "g(x)")}),\\qquad f\\circ\\Phi\\equiv 0`, x: LEFT_CENTER_X, y: 220, size: 42 });
    this.chain = fl.add({ tex: "D(f\\circ\\Phi)(x)=Df(\\Phi(x))\\cdot D\\Phi(x)", x: LEFT_CENTER_X, y: 330, size: 42 });
    this.blocks = fl.add({ tex: `=\\begin{pmatrix}D_xf & ${Tex.color(GOLD, "D_yf")}\\end{pmatrix}\\begin{pmatrix}I_d\\\\ ${Tex.color(GOLD, "Dg(x)")}\\end{pmatrix}`, x: LEFT_CENTER_X, y: 460, size: 42, display: true });
    this.sum = fl.add({ tex: this.sumTex(0), x: LEFT_CENTER_X, y: 590, size: 44 });
    this.need = fl.add({ tex: `\\det ${Tex.color(GOLD, "D_yf(x,g(x))")}\\neq 0\\ \\text{for } x \\text{ near } a\\quad(\\text{continuity; shrink } A)`, x: LEFT_CENTER_X, y: 690, size: 34, color: Palette.text });
    this.result = fl.add({ tex: `Dg(x)=-\\big[${Tex.color(GOLD, "D_yf(x,g(x))")}\\big]^{-1}D_xf(x,g(x))`, x: LEFT_CENTER_X, y: 790, size: 44, boxed: true, color: Palette.green });
    this.linear = fl.add({ tex: "\\text{linear case: } y=-B^{-1}Ax", x: LEFT_CENTER_X, y: 690, size: 36, color: Palette.muted });
    this.linLink = fl.add({ tex: "\\text{same formula, point by point}", x: LEFT_CENTER_X, y: 600, size: 32, color: Palette.muted });

    const axis = (a: THREE.Vector3, b: THREE.Vector3): Arrow => new Arrow(stage, a, b, Palette.axis, { width: 2.5, headLength: 0.1 });
    this.axes = [axis(v3(-1.3, 0), v3(1.4, 0)), axis(v3(0, -1.2), v3(0, 1.3))];
    this.axisLabels = [fl.add({ tex: "x", x: 0, y: 0, size: 32, color: GRAY }), fl.add({ tex: "y", x: 0, y: 0, size: 32, color: GRAY })];
    this.circle = new Polyline(stage, circlePoints(0, 0, 1, 256), { color: Palette.blue, width: 5 });
    this.graph = new Polyline(stage, sampleCurve((x) => v3(x, Math.sqrt(1 - x * x), 0.01), 0.42, 0.78, 40), { color: Palette.green, width: 8 });
    this.graphLabel = fl.add({ tex: "y=g(x)", x: 0, y: 0, size: 30, color: Palette.green, align: "right" });
    this.pDot = new Dot(stage, v3(0.6, 0.8, 0.02), Palette.orange, 0.035);
    this.tangent = new Polyline(stage, [v3(0, 0), v3(1, 1)], { color: Palette.orange, width: 4 });
    this.slopeReadout = fl.add({ tex: "", x: 960, y: 160, size: 40, align: "left" });
    this.panelFormula = fl.add({ tex: this.panelTex(0), x: 960, y: 330, size: 36, align: "left", display: true });
    this.panelDirect = fl.add({ tex: this.directTex(0), x: 960, y: 540, size: 36, align: "left", display: true });
    this.agree = fl.add({ tex: `${Tex.color(Palette.green, "\\checkmark")}\\ \\text{the two answers agree}`, x: 960, y: 680, size: 34, align: "left" });
    this.verdict = fl.add({ tex: `\\begin{aligned}&\\text{at }(1,0):\\ D_yf=2y=0\\\\ &\\text{vertical tangent: no } g\\end{aligned}`, x: 960, y: 330, size: 36, color: Palette.red, align: "left", display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "D_xf+D_yf\\,Dg=0", at: cue.s(7) + 1.2 },
      { label: "2", tex: "Dg=-[D_yf]^{-1}D_xf", at: cue.s(10) + 2.0 },
      { label: "3", tex: "\\text{circle: } g'=-x/y", at: cue.s(16) + 1.5 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  private identityTex(flash: boolean): string {
    return `f(x,\\ ${Tex.color(GOLD, "g(x)")})\\ ${flash ? Tex.color(Palette.orange, "\\equiv") : "\\equiv"}\\ 0\\qquad (x\\in A)`;
  }

  private sumTex(n: number): string {
    return Tex.reveal(["=D_xf+", `${Tex.color(GOLD, "D_yf")}\\cdot Dg(x)`, `\\ =\\ 0\\ \\ ${Tex.color(Palette.green, "(\\text{derivative of } 0)")}`], n);
  }

  private panelTex(n: number): string {
    const rows = [
      `D_xf=2x,\\quad ${Tex.color(GOLD, "D_yf=2y")}`,
      "g'=-(2y)^{-1}\\,2x=-\\dfrac{x}{y}",
      `\\text{at }p:\\ -\\dfrac{0.6}{0.8}=${Tex.color(Palette.orange, "-0.75")}`,
    ];
    return `\\begin{aligned}${rows.map((r, i) => (i < n ? r : `\\phantom{${r}}`)).join("\\\\[4pt]")}\\end{aligned}`;
  }

  private directTex(n: number): string {
    const rows = [
      "\\dfrac{d}{dx}\\sqrt{1-x^2}=-\\dfrac{x}{\\sqrt{1-x^2}}",
      `=-\\dfrac{x}{y}=${Tex.color(Palette.orange, "-0.75")}\\ \\text{at } p`,
    ];
    return `\\begin{aligned}${rows.map((r, i) => (i < n ? r : `\\phantom{${r}}`)).join("\\\\[4pt]")}\\end{aligned}`;
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;

    // ---- Phase A: derivation
    const phaseA = 1 - c.p(12, 0.8);
    const flash = t >= c.s(2) && t < c.e(2) && Math.sin((t - c.s(2)) * 2 * Math.PI / 0.9) > 0;
    this.identity.setContent(this.identityTex(flash));
    this.noFormula.set({ opacity: c.p(0, 0.6) * (1 - c.p(1, 0.5)) });
    this.identity.set({ opacity: c.p(1, 0.6) * phaseA });
    this.phiDef.set({ opacity: c.p(3, 0.6) * phaseA });
    this.chain.set({ opacity: c.p(4, 0.6) * phaseA });
    this.blocks.set({ opacity: c.p(5, 0.6) * phaseA });
    const sumN = t >= c.s(7) ? 3 : t >= c.s(6) ? 2 : 0;
    this.sum.setContent(this.sumTex(sumN));
    this.sum.set({ opacity: (sumN > 0 ? 1 : 0) * phaseA * (1 - c.p(11, 0.6)) });
    this.need.set({ opacity: c.p(8, 0.6) * phaseA * (1 - c.p(11, 0.6)), color: t >= c.s(9) ? Palette.green : Palette.text });
    this.result.set({ opacity: c.p(10, 0.6) * phaseA });
    this.linear.set({ opacity: c.p(11, 0.6) * phaseA });
    this.linLink.set({ opacity: c.p(11, 0.6, 1.2) * phaseA });

    // ---- Plot: dim reminder during the derivation, full during the check
    const plotOn = c.p(0, 0.8) * lerp(0.0, 1, c.p(12, 0.8));
    this.axes.forEach((a) => a.setOpacity(plotOn));
    this.anchor.place(this.axisLabels[0], v3(1.52, 0), plotOn);
    this.anchor.place(this.axisLabels[1], v3(0, 1.42), plotOn);
    this.circle.setOpacity(plotOn);
    this.graph.setOpacity(plotOn * (1 - c.p(17, 0.6)));
    this.anchor.place(this.graphLabel, v3(0.55, 0.83), plotOn * (1 - c.p(17, 0.6)), -16, 30);

    // Point and tangent: at p for s14–s16, then pushed to (1, 0) during s17–s19
    const theta = keyframes(t, [
      { t: 0, v: { th: THETA_P } },
      { t: c.s(17), v: { th: Math.atan(1 / 3) } },
      { t: c.in(18, 0.45), v: { th: Math.atan(0.1) } },
      { t: c.s(19), v: { th: 0 } },
    ], 1.6).th;
    const px = Math.cos(theta);
    const py = Math.sin(theta);
    const tanOn = c.p(14, 0.6) * plotOn;
    this.pDot.setPosition(v3(px, py, 0.02));
    this.pDot.setOpacity(c.p(12, 0.6) * plotOn);
    this.pDot.setColor(theta < 0.01 ? Palette.red : Palette.orange);
    const dir = v3(-Math.sin(theta), Math.cos(theta));
    this.tangent.setPoints([v3(px, py).addScaledVector(dir, -0.6), v3(px, py).addScaledVector(dir, 0.6)]);
    this.tangent.setOpacity(tanOn);
    this.tangent.setColor(theta < 0.01 ? Palette.red : Palette.orange);
    const slope = py > 1e-4 ? -px / py : Number.NEGATIVE_INFINITY;
    const readout = Number.isFinite(slope) && slope > -1000
      ? `\\text{slope}=-\\dfrac{x}{y}=${slope.toFixed(2)}`
      : `\\text{slope}=-\\dfrac{x}{y}=${Tex.color(Palette.red, "-\\dfrac{1}{0}")}`;
    this.slopeReadout.setContent(readout);
    this.slopeReadout.set({ opacity: c.p(17, 0.6) * plotOn });

    const panelN = t >= c.s(14) ? 3 : t >= c.in(13, 0.55) ? 2 : t >= c.s(13) ? 1 : 0;
    this.panelFormula.setContent(this.panelTex(panelN));
    const panelOn = (1 - c.p(17, 0.6));
    this.panelFormula.set({ opacity: (panelN > 0 ? 1 : 0) * panelOn });
    const directN = t >= c.s(16) ? 2 : t >= c.s(15) ? 1 : 0;
    this.panelDirect.setContent(this.directTex(directN));
    this.panelDirect.set({ opacity: (directN > 0 ? 1 : 0) * panelOn });
    this.agree.set({ opacity: c.p(16, 0.6, 1.5) * panelOn });
    this.verdict.set({ opacity: c.p(19, 0.6, 1.0) });

    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
