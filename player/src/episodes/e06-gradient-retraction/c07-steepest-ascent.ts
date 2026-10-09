import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { lerp } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline, sampleCurve } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { LevelStack } from "./lib/LevelStack";
import { MiniPlot } from "./lib/MiniPlot";
import type { SvgPath } from "./lib/SvgOverlay";
import { SvgOverlay } from "./lib/SvgOverlay";

/**
 * E06 c07 — steepest ascent: unit directions, the Cauchy–Schwarz inequality from ‖u − tv‖² ≥ 0 with its
 * equality case, max/min of df_x on the unit circle, the A-ellipse of chapter 5, and the critical point.
 * Plane = T_xS² laid flat (east, north), embedded metric; grad f(x) = (0, sin 50°) for f = x₃.
 * Drawing scale: one unit of length is K world units.
 * Sentence indices refer to content/episodes/e06-gradient-retraction/story.en.json, scene c07-steepest-ascent.
 */

const AMBER = "#f2b14c";
const K = 1.6;
const RX = 1075;
const G = new THREE.Vector2(0, Math.sin((50 * Math.PI) / 180));
const U_CS = new THREE.Vector2(1.2, 0.9);
const W = (p: THREE.Vector2): THREE.Vector3 => new THREE.Vector3(p.x * K, p.y * K, 0);

function tc(color: string, body: string): string {
  return `\\textcolor{${color}}{${body}}`;
}

function rows(list: string[], n: number): string {
  return `\\begin{gathered}${list.map((r, i) => (i < n ? r : `\\phantom{${r}}`)).join("\\\\ ")}\\end{gathered}`;
}

export class SteepestAscentScene implements Scene {
  readonly id = "c07-steepest-ascent";
  private stage!: StageLayer;

  private axes: Arrow[] = [];
  private unit!: Polyline;
  private unitLabel!: FormulaHandle;
  private gradArrow!: Arrow;
  private gradLabel!: FormulaHandle;
  private vArrow!: Arrow;
  private vLabel!: FormulaHandle;
  private scaled!: Arrow;
  private scaledLabel!: FormulaHandle;
  private vStar!: Dot;
  private vStarLabel!: FormulaHandle;
  private vMin!: Dot;
  private vMinLabel!: FormulaHandle;

  private uArrow!: Arrow;
  private uLabel!: FormulaHandle;
  private csV!: Arrow;
  private csVLabel!: FormulaHandle;
  private csLine!: Polyline;
  private residual!: Polyline;
  private residualLabel!: FormulaHandle;

  private stack!: LevelStack;
  private touchLine!: Polyline;
  private touchDot!: Dot;
  private purple!: Arrow;
  private purpleLabel!: FormulaHandle;

  private svg!: SvgOverlay;
  private dfPlot!: MiniPlot;
  private dfCurve!: SvgPath;
  private dfDot!: SvgPath;
  private parPlot!: MiniPlot;
  private parCurve!: SvgPath;
  private parVertex!: SvgPath;
  private dfReadout!: FormulaHandle;

  private fScale!: FormulaHandle;
  private fCS!: FormulaHandle;
  private fProof!: FormulaHandle;
  private fEq!: FormulaHandle;
  private fApply!: FormulaHandle;
  private fSteep!: FormulaHandle;
  private fEllipse!: FormulaHandle;
  private fCritical!: FormulaHandle;

  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    const R = 2.3;
    this.axes = [
      new Arrow(stage, new THREE.Vector3(-R, 0, 0), new THREE.Vector3(R + 0.2, 0, 0), Palette.axis, { width: 2, headLength: 0.15 }),
      new Arrow(stage, new THREE.Vector3(0, -R, 0), new THREE.Vector3(0, R + 0.2, 0), Palette.axis, { width: 2, headLength: 0.15 }),
    ];
    this.stack = new LevelStack(stage, (p) => new THREE.Vector3(p.x, p.y, 0), R, AMBER, { width: 1.8 });
    this.unit = new Polyline(stage, this.ellipsePts(1), { color: "#ffffff", width: 3 });
    this.unitLabel = fl.add({ tex: "\\|v\\|_x=1", x: 0, y: 0, size: 28, color: "#ffffff", align: "right" });
    this.gradArrow = new Arrow(stage, new THREE.Vector3(), W(G), "#ffffff", { width: 6, headLength: 0.2 });
    this.gradLabel = fl.add({ tex: "\\operatorname{grad}f(x)", x: 0, y: 0, size: 30, color: "#ffffff", align: "left" });
    this.vArrow = new Arrow(stage, new THREE.Vector3(), W(new THREE.Vector2(1, 0)), Palette.teal, { width: 5, headLength: 0.2 });
    this.vLabel = fl.add({ tex: "v", x: 0, y: 0, size: 32, color: Palette.teal });
    this.scaled = new Arrow(stage, new THREE.Vector3(), W(new THREE.Vector2(1, 0)), Palette.red, { width: 4, headLength: 0.18 });
    this.scaledLabel = fl.add({ tex: "\\lambda v", x: 0, y: 0, size: 30, color: Palette.red });
    this.vStar = new Dot(stage, W(new THREE.Vector2(0, 1)), Palette.green, 0.09);
    this.vStarLabel = fl.add({ tex: "v^*:\\ \\text{steepest ascent}", x: 0, y: 0, size: 28, color: Palette.green, align: "left" });
    this.vMin = new Dot(stage, W(new THREE.Vector2(0, -1)), Palette.red, 0.09);
    this.vMinLabel = fl.add({ tex: "-v^*:\\ \\text{steepest descent}", x: 0, y: 0, size: 28, color: Palette.red, align: "left" });

    this.csLine = new Polyline(stage, [new THREE.Vector3(), new THREE.Vector3(1, 0, 0)], { color: Palette.muted, width: 2, dashed: true, dashSize: 0.1, gapSize: 0.07 });
    this.uArrow = new Arrow(stage, new THREE.Vector3(), W(U_CS), Palette.orange, { width: 5, headLength: 0.2 });
    this.uLabel = fl.add({ tex: "u", x: 0, y: 0, size: 32, color: Palette.orange });
    this.csV = new Arrow(stage, new THREE.Vector3(), W(new THREE.Vector2(1, 0)), Palette.teal, { width: 5, headLength: 0.2 });
    this.csVLabel = fl.add({ tex: "v", x: 0, y: 0, size: 32, color: Palette.teal });
    this.residual = new Polyline(stage, [new THREE.Vector3(), new THREE.Vector3()], { color: Palette.red, width: 4 });
    this.residualLabel = fl.add({ tex: "u-t^*v", x: 0, y: 0, size: 28, color: Palette.red, align: "left" });

    this.touchLine = new Polyline(stage, [new THREE.Vector3(), new THREE.Vector3(1, 0, 0)], { color: Palette.yellow, width: 3 });
    this.touchDot = new Dot(stage, new THREE.Vector3(), Palette.yellow, 0.08);
    this.purple = new Arrow(stage, new THREE.Vector3(), W(new THREE.Vector2(0.25, 1)), Palette.purple, { width: 5, headLength: 0.2 });
    this.purpleLabel = fl.add({ tex: "A^{-1}(1,1)", x: 0, y: 0, size: 28, color: Palette.purple, align: "right" });

    this.svg = new SvgOverlay(fl);
    this.dfPlot = new MiniPlot(this.svg, fl, { x: 850, y: 520, w: 420, h: 190, xMin: 0, xMax: 2 * Math.PI, yMin: -1, yMax: 1,
      xLabel: "\\theta", yLabel: "df_x[v(\\theta)]" });
    this.dfCurve = this.dfPlot.curve({ color: Palette.teal, width: 3 });
    this.dfDot = this.dfPlot.curve({ color: Palette.orange, width: 12 });
    this.parPlot = new MiniPlot(this.svg, fl, { x: 850, y: 520, w: 420, h: 200, xMin: -0.6, xMax: 3.0, yMin: 0, yMax: 4.0,
      xLabel: "t", yLabel: "\\|u-tv\\|^2" });
    this.parCurve = this.parPlot.curve({ color: Palette.yellow, width: 3 });
    this.parVertex = this.parPlot.curve({ color: Palette.red, width: 12 });
    this.dfReadout = fl.add({ tex: "", x: RX, y: 780, size: 30 });

    this.fScale = fl.add({ tex: `df_x[\\lambda v]=\\lambda\\,df_x[v]\\ \\Rightarrow\\ ${tc(Palette.red, "\\text{no max without }\\|v\\|_x=1")}`, x: RX, y: 140, size: 30 });
    this.fCS = fl.add({ tex: "|\\langle u,v\\rangle|\\le\\|u\\|\\,\\|v\\|,\\qquad =\\iff u,v\\ \\text{dependent}", x: RX, y: 110, size: 32, color: Palette.yellow });
    this.fProof = fl.add({ tex: "", x: RX, y: 300, size: 28, display: true });
    this.fEq = fl.add({ tex: "", x: RX, y: 300, size: 28, display: true });
    this.fApply = fl.add({ tex: "", x: RX, y: 250, size: 28, display: true });
    this.fSteep = fl.add({ tex: "\\pm\\operatorname{grad}f/\\|\\operatorname{grad}f\\|_x:\\ \\text{steepest ascent / descent}", x: RX, y: 420, size: 28, color: Palette.green });
    this.fEllipse = fl.add({ tex: "\\begin{gathered}\\text{chapter 5: } df[v]=v_1+v_2,\\ \\ 4v_1^2+v_2^2=1\\\\ \\text{max at } A^{-1}(1,1)/\\|\\cdot\\|_A:\\ \\text{the metric decides}\\end{gathered}", x: RX, y: 300, size: 28, display: true });
    this.fCritical = fl.add({ tex: "\\begin{gathered}\\operatorname{grad}f(x)=0\\ \\Rightarrow\\ df_x\\equiv0\\\\ \\text{critical point (north pole for } f=x_3)\\end{gathered}", x: RX, y: 300, size: 30, display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "|\\langle u,v\\rangle|\\le\\|u\\|\\,\\|v\\|", at: cue.s(12) + 2.0 },
      { label: "2", tex: "=\\ \\iff\\ u\\parallel v", at: cue.s(14) + 1.5 },
      { label: "3", tex: "\\max_{\\|v\\|_x=1}df_x[v]=\\|\\operatorname{grad}f\\|_x", at: cue.s(18) + 1.5 },
      { label: "4", tex: "\\min=-\\|\\operatorname{grad}f\\|_x\\ \\text{at}\\ -v^*", at: cue.s(19) + 1.5 },
      { label: "5", tex: "\\operatorname{grad}f=0:\\ \\text{critical point}", at: cue.s(25) + 1.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  private ellipsePts(a: number): THREE.Vector3[] {
    return sampleCurve((s) => W(new THREE.Vector2(a * Math.cos(s), Math.sin(s))), 0, 2 * Math.PI, 120);
  }

  private place(h: FormulaHandle, world: THREE.Vector3, dx: number, dy: number, opacity: number): void {
    const p = this.stage.project(world);
    h.set({ x: p.x + dx, y: p.y + dy, opacity });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    this.stage.setView2D(4.12, -0.6, 8.4);

    const base = c.p(0, 0.8, -0.6);
    this.axes.forEach((a) => a.setOpacity(base * 0.9));
    const wCirc = (1 - c.p(5, 0.5)) + c.p(16, 0.5) * (1 - c.p(24, 0.5)) + c.p(24, 0.5);
    const wCS = c.p(5, 0.5) * (1 - c.p(16, 0.5));
    const wEll = c.p(21, 0.6) * (1 - c.p(24, 0.6));
    const wCrit = c.p(24, 0.6);

    // unit set: circle, then morph to the A-ellipse during s21–s23
    const a = lerp(1, 0.5, c.over(21, 0.4, 0.95));
    this.unit.setPoints(this.ellipsePts(t >= c.s(21) && t < c.s(24) ? a : 1));
    this.unit.setColor(t >= c.s(21) && t < c.s(24) && a < 0.98 ? Palette.purple : "#ffffff");
    const unitO = c.p(1, 0.6) * Math.min(1, wCirc);
    this.unit.setOpacity(unitO);
    this.place(this.unitLabel, W(new THREE.Vector2(-0.72, -0.72)), -8, 10, unitO * (1 - wEll));

    // gradient (zero at the critical point)
    const gNow = t >= c.s(24) ? G.clone().multiplyScalar(1 - c.over(24, 0.1, 0.7)) : G.clone();
    const gradO = c.p(0, 0.6, 0.5) * (1 - wCS) * (1 - wEll);
    this.gradArrow.set(new THREE.Vector3(), W(gNow));
    this.gradArrow.setOpacity(gradO * (gNow.length() > 0.02 ? 1 : 0));
    this.place(this.gradLabel, W(gNow), 14, -8, gradO * (gNow.length() > 0.05 ? 1 : 0));

    // scaling counterexample (s2)
    const sc = c.p(2, 0.5) * (1 - c.p(3, 0.5));
    const lam = lerp(0.6, 1.4, c.over(2, 0.1, 0.9));
    const vDir = new THREE.Vector2(Math.cos(1.2), Math.sin(1.2));
    this.scaled.set(new THREE.Vector3(), W(vDir.clone().multiplyScalar(lam)));
    this.scaled.setOpacity(sc);
    this.place(this.scaledLabel, W(vDir.clone().multiplyScalar(lam + 0.12)), 0, 0, sc);
    this.fScale.set({ opacity: sc });

    // rotating unit vector v and the df plot (s3–s4, s16–s20, s24–s25)
    const rot1 = c.over(3, 0.2, 1.0);
    let theta = 2 * Math.PI * rot1 + 0.3;
    if (t >= c.s(4) && t < c.s(5)) theta = 0.3 + 2 * Math.PI + (Math.PI / 2 - 0.3) * c.over(4, 0.1, 0.7);
    if (t >= c.s(16) && t < c.s(19)) theta = lerp(0.3, Math.PI / 2, c.over(16, 0.1, 0.8));
    if (t >= c.s(19) && t < c.s(24)) theta = Math.PI / 2 + Math.PI * c.over(19, 0.1, 0.8);
    if (t >= c.s(24)) theta = 0.3 + 2 * Math.PI * c.over(24, 0.2, 1.0);
    const v = new THREE.Vector2(Math.cos(theta), Math.sin(theta));
    const vO = (c.p(3, 0.5) * (1 - c.p(5, 0.5)) + c.p(16, 0.5) * (1 - c.p(21, 0.5)) + c.p(24, 0.5));
    this.vArrow.set(new THREE.Vector3(), W(v));
    this.vArrow.setOpacity(Math.min(1, vO));
    this.place(this.vLabel, W(v.clone().multiplyScalar(1.15)), 0, 0, Math.min(1, vO));
    const plotO = Math.min(1, c.p(3, 0.5) * (1 - c.p(5, 0.5)) + c.p(16, 0.5) * (1 - c.p(21, 0.5)) + c.p(24, 0.5));
    this.dfPlot.setOpacity(plotO);
    const gLen = gNow.length();
    this.dfPlot.plot(this.dfCurve, (th) => gLen * Math.cos(th - Math.PI / 2), 0, 2 * Math.PI, 120);
    this.dfCurve.setOpacity(plotO);
    const thW = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const pd = this.dfPlot.px(thW, gNow.dot(v));
    this.dfDot.setPoints([pd, { x: pd.x + 0.01, y: pd.y }]);
    this.dfDot.setOpacity(plotO);
    this.dfReadout.setContent(`df_x[v]=g_x(\\operatorname{grad}f,v)=${gNow.dot(v) >= 0 ? "\\phantom{-}" : ""}${gNow.dot(v).toFixed(3)}`);
    this.dfReadout.set({ opacity: plotO });

    const star = c.p(17, 0.5) * (1 - c.p(21, 0.5));
    this.vStar.setOpacity(star);
    this.place(this.vStarLabel, W(new THREE.Vector2(0, 1)), 18, -18, c.p(20, 0.5) * (1 - c.p(21, 0.5)));
    const mn = c.p(19, 0.5) * (1 - c.p(21, 0.5));
    this.vMin.setOpacity(mn);
    this.place(this.vMinLabel, W(new THREE.Vector2(0, -1)), 18, 18, c.p(20, 0.5) * (1 - c.p(21, 0.5)));

    // ---- Cauchy–Schwarz (s5–s15)
    const phi = t < c.s(15) ? -0.35 : lerp(-0.35, Math.atan2(U_CS.y, U_CS.x), c.over(15, 0.15, 0.85));
    const vcs = new THREE.Vector2(Math.cos(phi), Math.sin(phi));
    const tStar = U_CS.dot(vcs);
    this.uArrow.setOpacity(wCS);
    this.place(this.uLabel, W(U_CS.clone().multiplyScalar(1.1)), 0, -6, wCS);
    this.csV.set(new THREE.Vector3(), W(vcs));
    this.csV.setOpacity(wCS);
    this.place(this.csVLabel, W(vcs.clone().multiplyScalar(0.55)), 0, 24, wCS);
    this.csLine.setPoints([W(vcs.clone().multiplyScalar(-1.4)), W(vcs.clone().multiplyScalar(1.4))]);
    this.csLine.setOpacity(wCS * 0.8);
    const resO = wCS * c.p(10, 0.5);
    this.residual.setPoints([W(vcs.clone().multiplyScalar(tStar)), W(U_CS)]);
    this.residual.setOpacity(resO);
    this.place(this.residualLabel, W(vcs.clone().multiplyScalar(tStar).lerp(U_CS, 0.5)), 12, 0, resO * (U_CS.distanceTo(vcs.clone().multiplyScalar(tStar)) > 0.08 ? 1 : 0));
    const parO = wCS * c.p(9, 0.5);
    this.parPlot.setOpacity(parO);
    const q = (tt: number): number => U_CS.lengthSq() - 2 * tt * U_CS.dot(vcs) + tt * tt;
    this.parPlot.plot(this.parCurve, q, -0.6, 3.0, 100);
    this.parCurve.setOpacity(parO);
    const pv = this.parPlot.px(tStar, q(tStar));
    this.parVertex.setPoints([pv, { x: pv.x + 0.01, y: pv.y }]);
    this.parVertex.setOpacity(parO * c.p(10, 0.5));
    this.fCS.set({ opacity: c.p(5, 0.6) * (1 - c.p(16, 0.5)) });
    const pr = t >= c.s(12) ? 5 : t >= c.s(11) ? 4 : t >= c.s(10) ? 3 : t >= c.s(8) ? 2 : t >= c.s(7) ? 1 : 0;
    this.fProof.setContent(rows([
      "v\\neq0:\\ \\ 0\\le\\|u-tv\\|^2",
      "=\\|u\\|^2-2t\\langle u,v\\rangle+t^2\\|v\\|^2",
      "t^*=\\langle u,v\\rangle/\\|v\\|^2",
      "0\\le\\|u\\|^2-\\langle u,v\\rangle^2/\\|v\\|^2",
      `\\Rightarrow\\ ${tc(Palette.yellow, "\\langle u,v\\rangle^2\\le\\|u\\|^2\\|v\\|^2")}`,
    ], pr));
    this.fProof.set({ opacity: (pr > 0 ? 1 : 0) * (1 - c.p(13, 0.5)) });
    const eq = t >= c.s(15) ? 3 : t >= c.s(14) ? 2 : t >= c.s(13) ? 1 : 0;
    this.fEq.setContent(rows([
      "\\text{equality}\\iff\\min_t\\|u-tv\\|^2=0\\iff\\|u-t^*v\\|=0",
      `\\overset{\\text{pos. def.}}{\\iff}\\ u=t^*v\\ \\ ${tc(Palette.green, "(u\\parallel v)")}`,
      "\\text{residual}\\to0\\ \\text{as } v\\ \\text{turns to } u",
    ], eq));
    this.fEq.set({ opacity: (eq > 0 ? 1 : 0) * (1 - c.p(16, 0.5)) });

    // ---- apply (s16–s20)
    const ap = t >= c.s(19) ? 4 : t >= c.s(18) ? 3 : t >= c.s(17) ? 2 : t >= c.s(16) ? 1 : 0;
    this.fApply.setContent(rows([
      "\\|v\\|_x=1:\\ df_x[v]=g_x(\\operatorname{grad}f,v)\\le\\|\\operatorname{grad}f\\|_x",
      "v^*=\\tfrac{\\operatorname{grad}f}{\\|\\operatorname{grad}f\\|_x}:\\ df_x[v^*]=\\tfrac{g_x(\\operatorname{grad}f,\\operatorname{grad}f)}{\\|\\operatorname{grad}f\\|_x}=\\|\\operatorname{grad}f\\|_x",
      "\\text{equality case}\\Rightarrow v^*\\ \\text{is the unique maximizer}",
      "df_x[v]\\ge-\\|\\operatorname{grad}f\\|_x,\\ \\ =\\ \\text{only at } -v^*",
    ], ap));
    this.fApply.set({ opacity: (ap > 0 ? 1 : 0) * (1 - c.p(21, 0.5)) });
    this.fSteep.set({ opacity: c.p(20, 0.5) * (1 - c.p(21, 0.5)) });

    // ---- the A-ellipse of chapter 5 (s21–s23)
    this.stack.update(new THREE.Vector2(1, 1), 0.5 * K, () => wEll * 0.6);
    const touch = new THREE.Vector2(a * a, 1).divideScalar(Math.sqrt(a * a + 1));
    const cTouch = touch.x + touch.y;
    const dir = new THREE.Vector2(-1, 1).normalize().multiplyScalar(1.2);
    const foot = new THREE.Vector2(cTouch / 2, cTouch / 2);
    this.touchLine.setPoints([W(foot.clone().sub(dir)), W(foot.clone().add(dir))]);
    this.touchLine.setOpacity(wEll);
    this.touchDot.setPosition(W(touch));
    this.touchDot.setOpacity(wEll);
    const pu = c.p(22, 0.6) * (1 - c.p(24, 0.6));
    this.purple.setOpacity(pu);
    this.place(this.purpleLabel, W(new THREE.Vector2(0.25, 1)), -14, -14, pu);
    this.fEllipse.set({ opacity: wEll });

    // ---- critical point (s24–s25)
    this.fCritical.set({ opacity: wCrit });

    this.ledger.update(t, c.p(12, 0.5, 1.0), true);
  }

  teardown(_layers: SceneLayers): void {}
}
