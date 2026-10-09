import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Palette } from "../../primitives/Palette";
import { Polyline, sampleCurve } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { LevelStack } from "./lib/LevelStack";

/**
 * E06 c05 — supplementary example: one covector df[v] = v₁ + v₂ on ℝ², two inner products
 * (standard; ⟨u, v⟩_A = uᵀAv with A = diag(4, 1)), two gradients (1, 1) and A⁻¹(1, 1) = (1/4, 1).
 * The stretch y = A^{1/2} v = (2v₁, v₂) turns the A-geometry into the Euclidean one; it is animated by
 * M(s) = diag(1 + s, 1), s ∈ [0, 1], applied to every drawn object.
 * Sentence indices refer to content/episodes/e06-gradient-retraction/story.en.json, scene c05-metric-matters.
 */

const AMBER = "#f2b14c";
const R_DISC = 1.6;
const RX = 1090;
const STEP = 0.5;
const G_STD = new THREE.Vector2(1, 1);
const G_A = new THREE.Vector2(0.25, 1);
const P2 = (p: THREE.Vector2): THREE.Vector3 => new THREE.Vector3(p.x, p.y, 0);
const stretch = (p: THREE.Vector2, s: number): THREE.Vector2 => new THREE.Vector2(p.x * (1 + s), p.y);

function tc(color: string, body: string): string {
  return `\\textcolor{${color}}{${body}}`;
}

export class MetricMattersScene implements Scene {
  readonly id = "c05-metric-matters";
  private stage!: StageLayer;

  private axes: Arrow[] = [];
  private axisLabels: FormulaHandle[] = [];
  private stack!: LevelStack;
  private circle!: Polyline;
  private ellipse!: Polyline;
  private circleLabel!: FormulaHandle;
  private ellipseLabel!: FormulaHandle;
  private gStd!: Arrow;
  private gA!: Arrow;
  private gStdLabel!: FormulaHandle;
  private gALabel!: FormulaHandle;
  private angleArc!: Polyline;
  private angleLabel!: FormulaHandle;
  private raStd!: Polyline;
  private raA!: Polyline;
  private wArrow!: Arrow;
  private wLabel!: FormulaHandle;
  private sweepLine!: Polyline;
  private touchStd!: Polyline;
  private touchA!: Polyline;

  private fCov!: FormulaHandle;
  private fA!: FormulaHandle;
  private fAprops!: FormulaHandle;
  private fEllipse!: FormulaHandle;
  private fSolve!: FormulaHandle;
  private fGeneral!: FormulaHandle;
  private fOrtho!: FormulaHandle;
  private fStretch!: FormulaHandle;
  private fTangency!: FormulaHandle;
  private fConclusion!: FormulaHandle;

  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;

    this.axes = [
      new Arrow(stage, new THREE.Vector3(-R_DISC, 0, 0), new THREE.Vector3(R_DISC + 0.15, 0, 0), Palette.axis, { width: 2, headLength: 0.1 }),
      new Arrow(stage, new THREE.Vector3(0, -R_DISC, 0), new THREE.Vector3(0, R_DISC + 0.15, 0), Palette.axis, { width: 2, headLength: 0.1 }),
    ];
    this.axisLabels = [
      fl.add({ tex: "v_1", x: 0, y: 0, size: 30, color: Palette.muted, align: "left" }),
      fl.add({ tex: "v_2", x: 0, y: 0, size: 30, color: Palette.muted, valign: "bottom" }),
    ];
    this.stack = new LevelStack(stage, P2, R_DISC, AMBER, { width: 2 });
    this.circle = new Polyline(stage, this.circlePts(0), { color: "#ffffff", width: 3 });
    this.ellipse = new Polyline(stage, this.ellipsePts(0), { color: Palette.purple, width: 3.5 });
    this.circleLabel = fl.add({ tex: "\\|v\\|=1", x: 0, y: 0, size: 28, color: "#ffffff", align: "right" });
    this.ellipseLabel = fl.add({ tex: "4v_1^2+v_2^2=1", x: 0, y: 0, size: 28, color: Palette.purple, align: "left" });
    this.gStd = new Arrow(stage, new THREE.Vector3(), P2(G_STD), "#ffffff", { width: 5, headLength: 0.12 });
    this.gA = new Arrow(stage, new THREE.Vector3(), P2(G_A), Palette.purple, { width: 5, headLength: 0.12 });
    this.gStdLabel = fl.add({ tex: "(1,1)", x: 0, y: 0, size: 30, color: "#ffffff", align: "left" });
    this.gALabel = fl.add({ tex: "A^{-1}(1,1)=(\\tfrac14,1)", x: 0, y: 0, size: 30, color: Palette.purple, align: "right" });
    this.angleArc = new Polyline(stage, sampleCurve((a) => new THREE.Vector3(0.45 * Math.cos(a), 0.45 * Math.sin(a), 0), Math.PI / 4, Math.atan2(1, 0.25), 30),
      { color: Palette.yellow, width: 2.5 });
    this.angleLabel = fl.add({ tex: "\\approx31^\\circ", x: 0, y: 0, size: 28, color: Palette.yellow });
    this.raStd = new Polyline(stage, [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], { color: "#ffffff", width: 2.5 });
    this.raA = new Polyline(stage, [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], { color: Palette.purple, width: 2.5 });
    this.wArrow = new Arrow(stage, new THREE.Vector3(), new THREE.Vector3(0.8, -0.8, 0), Palette.teal, { width: 4, headLength: 0.1 });
    this.wLabel = fl.add({ tex: "w=(1,-1)", x: 0, y: 0, size: 28, color: Palette.teal, align: "left" });
    this.sweepLine = new Polyline(stage, [new THREE.Vector3(), new THREE.Vector3(1, 0, 0)], { color: Palette.yellow, width: 3.5 });
    this.touchStd = new Polyline(stage, [new THREE.Vector3(), new THREE.Vector3()], { color: Palette.yellow, width: 18 });
    this.touchA = new Polyline(stage, [new THREE.Vector3(), new THREE.Vector3()], { color: Palette.yellow, width: 18 });

    this.fCov = fl.add({ tex: `df[v]=${tc(AMBER, "v_1+v_2")}`, x: RX, y: 120, size: 40 });
    this.fA = fl.add({ tex: `\\langle u,v\\rangle_A=u^\\top A v,\\qquad A=\\begin{pmatrix}4&0\\\\0&1\\end{pmatrix}`, x: RX, y: 220, size: 32, color: Palette.purple, display: true });
    this.fAprops = fl.add({ text: "symmetric (Aᵀ = A) · bilinear · positive definite (A ≻ 0)", x: RX, y: 300, size: 24, color: Palette.muted });
    this.fEllipse = fl.add({ tex: "\\|v\\|_A=1\\iff 4v_1^2+v_2^2=1", x: RX, y: 350, size: 30, color: Palette.purple });
    this.fSolve = fl.add({ tex: "", x: RX, y: 480, size: 30, display: true });
    this.fGeneral = fl.add({ tex: "\\operatorname{grad}_A f=A^{-1}\\nabla f", x: RX, y: 600, size: 34, color: Palette.yellow });
    this.fOrtho = fl.add({ tex: "", x: RX, y: 420, size: 30, display: true });
    this.fStretch = fl.add({ tex: "y=A^{1/2}v=(2v_1,\\,v_2):\\quad \\langle u,v\\rangle_A=(A^{1/2}u)^\\top(A^{1/2}v)", x: RX, y: 600, size: 26 });
    this.fTangency = fl.add({ tex: "\\text{tangency point}=\\text{steepest unit direction}", x: RX, y: 420, size: 30, color: Palette.yellow });
    this.fConclusion = fl.add({ tex: "\\begin{gathered}\\text{same } df,\\ \\text{two gradients}\\\\ \\Rightarrow\\ \\text{a gradient needs a metric } g_x \\text{ on every } T_xM\\end{gathered}", x: RX, y: 560, size: 30, display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "\\langle u,v\\rangle_A=u^\\top Av\\ \\ \\text{inner product}", at: cue.s(5) + 1.0 },
      { label: "2", tex: "\\operatorname{grad}f=(1,1)", at: cue.s(7) + 1.5 },
      { label: "3", tex: "\\operatorname{grad}_Af=A^{-1}\\nabla f=(\\tfrac14,1)", at: cue.s(11) + 1.0 },
      { label: "4", tex: "\\text{each}\\perp\\text{level set in its metric}", at: cue.s(16) + 2.5 },
      { label: "5", tex: "df\\ \\text{alone fixes no direction}", at: cue.s(25) + 1.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  private circlePts(s: number): THREE.Vector3[] {
    return sampleCurve((a) => P2(stretch(new THREE.Vector2(Math.cos(a), Math.sin(a)), s)), 0, 2 * Math.PI, 120);
  }

  private ellipsePts(s: number): THREE.Vector3[] {
    return sampleCurve((a) => P2(stretch(new THREE.Vector2(0.5 * Math.cos(a), Math.sin(a)), s)), 0, 2 * Math.PI, 120);
  }

  private place(h: FormulaHandle, world: THREE.Vector3, dx: number, dy: number, opacity: number): void {
    const p = this.stage.project(world);
    h.set({ x: p.x + dx, y: p.y + dy, opacity });
  }

  /** Right-angle marker at `foot` with legs along unit vectors a and b (already in drawing coordinates). */
  private marker(foot: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2, size: number): THREE.Vector3[] {
    return [P2(foot.clone().addScaledVector(a, -size)), P2(foot.clone().addScaledVector(a, -size).addScaledVector(b, size)), P2(foot.clone().addScaledVector(b, size))];
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    this.stage.setView2D(2.5, -0.3, 5.0);

    // stretch parameter: out during s17, back during s18
    const s = c.over(17, 0.3, 0.9) * (1 - c.over(18, 0.05, 0.8));
    const base = c.p(0, 0.8, -0.6);
    this.axes.forEach((a) => a.setOpacity(base * 0.9));
    this.place(this.axisLabels[0], new THREE.Vector3(R_DISC + 0.2, 0, 0), 0, 0, base);
    this.place(this.axisLabels[1], new THREE.Vector3(0, R_DISC + 0.18, 0), 0, 0, base);

    // level lines of df = v₁ + v₂ in drawing coordinates y = M(s) v: y₁/(1+s) + y₂ = k·STEP
    const nNow = new THREE.Vector2(1 / (1 + s), 1);
    const stackO = c.p(1, 0.8);
    this.stack.update(nNow, STEP, () => stackO * 0.85);

    const circO = c.p(3, 0.6) * (1 - 0.75 * c.p(17, 0.4));
    this.circle.setPoints(this.circlePts(s));
    this.circle.setOpacity(circO);
    this.place(this.circleLabel, new THREE.Vector3(-0.72 * (1 + s), -0.72, 0), -6, 10, circO);
    const ellO = c.p(4, 0.6, 0.6);
    this.ellipse.setPoints(this.ellipsePts(s));
    this.ellipse.setOpacity(ellO);
    this.place(this.ellipseLabel, P2(stretch(new THREE.Vector2(0.62, -0.98), s)), 6, 14, ellO * (1 - c.p(17, 0.4)));

    // gradients
    const grow1 = c.over(7, 0.1, 0.6);
    const gStdNow = stretch(G_STD, s).multiplyScalar(grow1);
    this.gStd.set(new THREE.Vector3(), P2(gStdNow));
    this.gStd.setOpacity((grow1 > 0.01 ? 1 : 0) * (1 - 0.6 * c.p(17, 0.4) * (1 - c.p(19, 0.5))));
    this.place(this.gStdLabel, P2(stretch(G_STD, s)), 12, -10, c.p(7, 0.5, 1.0) * (1 - c.p(17, 0.4)));
    const grow2 = c.over(10, 0.2, 0.8);
    const gANow = stretch(G_A, s).multiplyScalar(grow2);
    this.gA.set(new THREE.Vector3(), P2(gANow));
    this.gA.setOpacity(grow2 > 0.01 ? 1 : 0);
    this.place(this.gALabel, P2(stretch(G_A, s)), -18, -34, c.p(10, 0.5, 1.0) * (1 - c.p(17, 0.4)));
    const ang = c.p(12, 0.6) * (1 - c.p(13, 0.6));
    this.angleArc.setOpacity(ang);
    this.place(this.angleLabel, new THREE.Vector3(0.38, 0.72, 0), 0, 0, ang);

    // right-angle markers on the level line through the two arrow tips' directions
    const markers = c.p(13, 0.6) * (1 - c.p(19, 0.6));
    const lineDir = new THREE.Vector2(-1, 1 / (1 + s)).normalize();      // level-line direction in drawing coordinates
    const footStd = stretch(new THREE.Vector2(0.5, 0.5), s);
    const dStd = stretch(G_STD, s).normalize();
    this.raStd.setPoints(this.marker(footStd, dStd, lineDir, 0.1));
    this.raStd.setOpacity(markers * (1 - c.p(17, 0.4) * (1 - c.p(18, 0.4))));
    // the A-right angle: a square in the stretched picture (s = 1), mapped back by M(s)·M(1)⁻¹
    const footA1 = new THREE.Vector2(0.25 * 2, 1).multiplyScalar(1 / (0.25 + 1));   // y-coords of the foot on df = 1
    const gA1 = new THREE.Vector2(0.5, 1).normalize();
    const l1 = new THREE.Vector2(-1, 0.5).normalize();
    const back = (y: THREE.Vector2): THREE.Vector2 => new THREE.Vector2((y.x / 2) * (1 + s), y.y);
    const sq = [footA1.clone().addScaledVector(gA1, -0.1), footA1.clone().addScaledVector(gA1, -0.1).addScaledVector(l1, 0.1), footA1.clone().addScaledVector(l1, 0.1)];
    this.raA.setPoints(sq.map((p) => P2(back(p))));
    this.raA.setOpacity(markers);
    const wVis = c.p(14, 0.6) * (1 - c.p(17, 0.4));
    this.wArrow.set(new THREE.Vector3(), P2(stretch(new THREE.Vector2(0.8, -0.8), s)));
    this.wArrow.setOpacity(wVis);
    this.place(this.wLabel, new THREE.Vector3(0.82, -0.82, 0), 10, 10, wVis);

    // tangency sweep
    const sweepStd = c.over(20, 0.1, 0.75);
    const sweepA = c.over(21, 0.1, 0.75);
    const inA = t >= c.s(21);
    const cMax = inA ? Math.sqrt(1.25) : Math.SQRT2;
    const cNow = (inA ? sweepA : sweepStd) * cMax;
    const sweepVis = c.p(20, 0.4) * (1 - c.p(23, 0.6));
    const foot = new THREE.Vector2(cNow / 2, cNow / 2);
    const dir = new THREE.Vector2(-1, 1).normalize().multiplyScalar(1.5);
    this.sweepLine.setPoints([P2(foot.clone().sub(dir)), P2(foot.clone().add(dir))]);
    this.sweepLine.setOpacity(sweepVis);
    const tStd = new THREE.Vector2(Math.SQRT1_2, Math.SQRT1_2);
    const tA = new THREE.Vector2(0.25, 1).divideScalar(Math.sqrt(1.25));
    this.touchStd.setPoints([P2(tStd), P2(tStd.clone().addScalar(0.001))]);
    this.touchStd.setOpacity(sweepStd > 0.99 ? c.p(20, 0.3) * (1 - c.p(23, 0.6)) : 0);
    this.touchA.setPoints([P2(tA), P2(tA.clone().addScalar(0.001))]);
    this.touchA.setOpacity(sweepA > 0.99 ? (1 - c.p(23, 0.6)) : 0);

    // ---- formulas
    const top = 1 - c.p(13, 0.5);
    this.fCov.set({ opacity: c.p(1, 0.6) });
    this.fA.set({ opacity: c.p(4, 0.6) * top });
    this.fAprops.set({ opacity: c.p(5, 0.6) * top });
    this.fEllipse.set({ opacity: c.p(6, 0.6) * top });
    const solve = t >= c.s(10) ? 3 : t >= c.s(9) ? 2 : t >= c.s(8) ? 1 : 0;
    const rows = [
      "u^\\top A v=v_1+v_2\\ \\ \\forall v",
      "\\Rightarrow\\ A u=(1,1)^\\top\\ \\ (A^\\top=A)",
      `\\Rightarrow\\ u=A^{-1}(1,1)^\\top=${tc(Palette.purple, "(\\tfrac14,\\,1)")}`,
    ];
    this.fSolve.setContent(`\\begin{gathered}${rows.map((r, i) => (i < solve ? r : `\\phantom{${r}}`)).join("\\\\ ")}\\end{gathered}`);
    this.fSolve.set({ opacity: (solve > 0 ? 1 : 0) * top });
    this.fGeneral.set({ opacity: c.p(11, 0.6) * top });
    const ortho = t >= c.s(16) ? 2 : t >= c.s(15) ? 1 : 0;
    const orows = [
      "(1,1)\\cdot(1,-1)=0",
      `(\\tfrac14,1)\\,A\\,(1,-1)^\\top=\\tfrac14\\cdot4-1=0`,
    ];
    this.fOrtho.setContent(`\\begin{gathered}${orows.map((r, i) => (i < ortho ? r : `\\phantom{${r}}`)).join("\\\\ ")}\\end{gathered}`);
    this.fOrtho.set({ opacity: (ortho > 0 ? 1 : 0) * (1 - c.p(19, 0.5)) });
    this.fStretch.set({ opacity: c.p(17, 0.6) * (1 - c.p(19, 0.5)) });
    this.fTangency.set({ opacity: c.p(22, 0.6) * (1 - c.p(23, 0.5)) });
    this.fConclusion.set({ opacity: c.p(23, 0.6) });

    this.ledger.update(t, c.p(5, 0.5, 1.0), true);
  }

  teardown(_layers: SceneLayers): void {}
}
