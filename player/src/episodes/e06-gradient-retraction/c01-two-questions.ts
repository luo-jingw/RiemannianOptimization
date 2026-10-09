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
import { TangentPlane } from "../../primitives/TangentPlane";
import { WorldLabel } from "../../primitives/WorldLabel";
import { HeightSphere } from "./lib/HeightSphere";
import { setOrbitView } from "./lib/SphereCamera";
import { E3, X0 } from "./lib/sphereMath";

/**
 * E06 c01 — Euclidean gradient descent hides two questions; on S² and O(n) both fail.
 * Phase A (s0–s6): 2D contour plot of f(p) = ½(p₁² + 3p₂²), one gradient step from p₀ = (2.2, 1).
 * Phase B (s7–s15): S² with f = x₃; the step x − αe₃ leaves the sphere; e₃ = tangent part + normal part.
 * Phase C (s16–s19): O(2) numbers: (R − αG)ᵀ(R − αG) drifts from I as α grows.
 * Phase D (s20–s24): the two questions enter the ledger.
 * Sentence indices refer to content/episodes/e06-gradient-retraction/story.en.json, scene c01-two-questions.
 */

const BG = Palette.background;
const P0 = new THREE.Vector2(2.2, 1.0);
const ALPHA_2D = 0.3;
const fFlat = (x: number, y: number): number => 0.5 * (x * x + 3 * y * y);
const STEP_LEN = 0.8;          // drawn length of e₃ on the sphere
const ALPHA_MAX = 0.62;        // final α of the off-sphere step

/** O(2) example: R = rotation by 30°, G a fixed matrix. */
const R = [[Math.cos(Math.PI / 6), -Math.sin(Math.PI / 6)], [Math.sin(Math.PI / 6), Math.cos(Math.PI / 6)]];
const G = [[0.8, 0.3], [0.1, 0.6]];

function tc(color: string, body: string): string {
  return `\\textcolor{${color}}{${body}}`;
}

function gramOf(alpha: number): number[][] {
  const M = [[R[0][0] - alpha * G[0][0], R[0][1] - alpha * G[0][1]], [R[1][0] - alpha * G[1][0], R[1][1] - alpha * G[1][1]]];
  const out = [[0, 0], [0, 0]];
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) out[i][j] = M[0][i] * M[0][j] + M[1][i] * M[1][j];
  return out;
}

export class TwoQuestionsScene implements Scene {
  readonly id = "c01-two-questions";
  private stage!: StageLayer;

  // Phase A
  private contours: Polyline[] = [];
  private flatDot!: Dot;
  private flatGhost!: Dot;
  private flatArrow!: Arrow;
  private gdFormula!: FormulaHandle;
  private expansion!: FormulaHandle;
  private fReadout!: FormulaHandle;
  private sameSpace!: FormulaHandle;

  // Phase B
  private sphere!: HeightSphere;
  private xDot!: Dot;
  private e3Arrow!: Arrow;
  private stepLine!: Polyline;
  private offDot!: Dot;
  private offLabel!: WorldLabel;
  private xLabel!: WorldLabel;
  private e3Label!: WorldLabel;
  private plane!: TangentPlane;
  private planeLabel!: WorldLabel;
  private tanArrow!: Arrow;
  private norArrow!: Arrow;
  private norLabel!: WorldLabel;
  private tanLabel!: WorldLabel;
  private sphereFormula!: FormulaHandle;

  // Phase C
  private matR!: FormulaHandle;
  private matStep!: FormulaHandle;
  private matGram!: FormulaHandle;

  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    // ---- Phase A: flat contour plot
    for (const c of [0.25, 0.6, 1.2, 2.0, 3.0, 3.92, 5.2]) {
      const a = Math.sqrt(2 * c);
      const b = Math.sqrt((2 * c) / 3);
      this.contours.push(new Polyline(stage, sampleCurve((s) => new THREE.Vector3(a * Math.cos(s), b * Math.sin(s), 0), 0, 2 * Math.PI, 120),
        { color: c === 3.92 ? Palette.blue : "#3d4f78", width: c === 3.92 ? 3 : 2 }));
    }
    const p1 = P0.clone().sub(new THREE.Vector2(P0.x, 3 * P0.y).multiplyScalar(ALPHA_2D));
    this.flatGhost = new Dot(stage, new THREE.Vector3(P0.x, P0.y, 0.01), Palette.orange, 0.07, "2d", true);
    this.flatDot = new Dot(stage, new THREE.Vector3(P0.x, P0.y, 0.02), Palette.orange, 0.08);
    this.flatArrow = new Arrow(stage, new THREE.Vector3(P0.x, P0.y, 0), new THREE.Vector3(p1.x, p1.y, 0), Palette.text, { width: 5, headLength: 0.25 });
    this.gdFormula = fl.add({ tex: this.gdTex(0), x: 750, y: 110, size: 54 });
    this.expansion = fl.add({ tex: "f(x-\\alpha\\nabla f(x))=f(x)-\\alpha\\,\\|\\nabla f(x)\\|^2+o(\\alpha)", x: 750, y: 790, size: 40 });
    this.fReadout = fl.add({ tex: "f=3.92", x: 0, y: 0, size: 32, color: Palette.orange, align: "left" });
    this.sameSpace = fl.add({ text: "in ℝⁿ: points and directions live in the same space", x: 750, y: 790, size: 32, color: Palette.muted });

    // ---- Phase B: the sphere
    this.sphere = new HeightSphere(stage);
    this.xDot = new Dot(stage, X0, Palette.orange, 0.035, "3d");
    this.e3Arrow = new Arrow(stage, X0, X0.clone().addScaledVector(E3, STEP_LEN), Palette.red, { mode: "3d", width: 5, headLength: 0.12 });
    this.stepLine = new Polyline(stage, [X0, X0], { color: Palette.red, width: 3, dashed: true, dashSize: 0.05, gapSize: 0.04 });
    this.offDot = new Dot(stage, X0, Palette.red, 0.035, "3d");
    this.offLabel = new WorldLabel(stage, fl, { tex: "\\|x-\\alpha e_3\\|=1.00", size: 30, color: Palette.red, align: "left" }, X0, { x: 26, y: 10 });
    this.xLabel = new WorldLabel(stage, fl, { tex: "x", size: 36, color: Palette.orange }, X0, { x: 22, y: 24 });
    this.e3Label = new WorldLabel(stage, fl, { tex: "\\nabla\\bar f=e_3", size: 32, color: Palette.red, align: "left" }, X0.clone().addScaledVector(E3, STEP_LEN), { x: 14, y: -14 });
    this.plane = new TangentPlane(stage, Palette.green, 0.62);
    this.planeLabel = new WorldLabel(stage, fl, { tex: "T_xS^2=x^{\\perp}", size: 32, color: Palette.green, align: "left" }, X0, { x: 0, y: 0 });
    const normalPart = X0.clone().multiplyScalar(X0.z * STEP_LEN);
    const tangentPart = E3.clone().multiplyScalar(STEP_LEN).sub(normalPart);
    this.tanArrow = new Arrow(stage, X0, X0.clone().add(tangentPart), Palette.teal, { mode: "3d", width: 5, headLength: 0.1 });
    this.norArrow = new Arrow(stage, X0, X0.clone().add(normalPart), Palette.red, { mode: "3d", width: 5, headLength: 0.1 });
    this.tanLabel = new WorldLabel(stage, fl, { tex: "e_3-x_3x", size: 34, color: Palette.teal, align: "right" }, X0.clone().add(tangentPart), { x: -18, y: -4 });
    this.norLabel = new WorldLabel(stage, fl, { tex: "x_3x\\ \\ \\text{not in } T_xS^2", size: 34, color: Palette.red, align: "left", boxed: true }, X0.clone().add(normalPart), { x: 24, y: -10 });
    this.sphereFormula = fl.add({ tex: "\\begin{gathered}S^2=\\{x\\in\\mathbb{R}^3:\\ x^\\top x=1\\}\\\\ f(x)=x_3\\end{gathered}", x: 1150, y: 330, size: 40, display: true });

    // ---- Phase C: O(2)
    const rTex = `R=\\begin{pmatrix}${R[0][0].toFixed(2)} & ${R[0][1].toFixed(2)}\\\\ ${R[1][0].toFixed(2)} & ${R[1][1].toFixed(2)}\\end{pmatrix},\\quad G=\\begin{pmatrix}${G[0][0]} & ${G[0][1]}\\\\ ${G[1][0]} & ${G[1][1]}\\end{pmatrix}`;
    this.matR = fl.add({ tex: rTex, x: 1080, y: 330, size: 36, display: true });
    this.matStep = fl.add({ tex: this.alphaTex(0), x: 1080, y: 470, size: 36 });
    this.matGram = fl.add({ tex: this.gramTex(0), x: 1080, y: 590, size: 36, display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "①", tex: "df_x+\\langle\\cdot,\\cdot\\rangle_x\\ \\Rightarrow\\ \\operatorname{grad} f(x)", at: cue.s(21) + 1.0 },
      { label: "②", tex: "\\text{retraction } R_x:T_xM\\to M", at: cue.s(23) + 1.5 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 }, "Two questions");
  }

  private gdTex(state: number): string {
    // state 0: plain; 1: direction brace; 2: both braces
    const hide = (on: boolean, body: string): string => (on ? body : tc(BG, body));
    const dir = `${hide(state >= 1, `\\underbrace{${tc(Palette.text, `${tc(state >= 1 ? Palette.orange : Palette.text, "-\\alpha\\nabla f(x_k)")}`)}}_{\\text{① direction}}`)}`;
    const mv = `${hide(state >= 2, `\\underbrace{${tc(Palette.text, `${tc(state >= 2 ? Palette.green : Palette.text, "x_k\\;+")}`)}}_{\\text{② move}}`)}`;
    return `x_{k+1}=${mv}\\;${dir}`;
  }

  private alphaTex(alpha: number): string {
    return `\\alpha=${alpha.toFixed(2)}:\\qquad (R-\\alpha G)^\\top(R-\\alpha G)=`;
  }

  private gramTex(alpha: number): string {
    const g = gramOf(alpha);
    const cell = (i: number, j: number): string => {
      const target = i === j ? 1 : 0;
      const v = g[i][j];
      const s = (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);
      return Math.abs(v - target) > 0.005 ? tc(Palette.red, s) : s;
    };
    const off = Math.abs(g[0][0] - 1) + Math.abs(g[1][1] - 1) + Math.abs(g[0][1]) > 0.01;
    return `\\begin{pmatrix}${cell(0, 0)} & ${cell(0, 1)}\\\\ ${cell(1, 0)} & ${cell(1, 1)}\\end{pmatrix}\\ ${off ? tc(Palette.red, "\\neq I") : "=I"}`;
  }

  private place(h: FormulaHandle, world: THREE.Vector3, dx: number, dy: number, opacity: number): void {
    const p = this.stage.project(world);
    h.set({ x: p.x + dx, y: p.y + dy, opacity });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const stage = this.stage;

    // ---- Phase A (2D) until sentence 7
    const phaseA = 1 - c.p(7, 0.6, -0.6);
    const in3D = t >= c.s(7) - 0.05;
    if (!in3D) stage.setView2D(2.67, -0.6, 8);
    const plotIn = c.p(0, 0.8, -0.4) * phaseA;
    this.contours.forEach((p) => p.setOpacity(plotIn * 0.9));
    const move = c.over(0, 0.45, 0.9);
    const p1 = P0.clone().sub(new THREE.Vector2(P0.x, 3 * P0.y).multiplyScalar(ALPHA_2D));
    const pNow = P0.clone().lerp(p1, move);
    this.flatDot.setPosition(new THREE.Vector3(pNow.x, pNow.y, 0.02));
    this.flatDot.setOpacity(plotIn);
    this.flatGhost.setOpacity(plotIn * (move > 0.02 ? 0.8 : 0));
    this.flatArrow.set(new THREE.Vector3(P0.x, P0.y, 0), new THREE.Vector3(p1.x, p1.y, 0));
    this.flatArrow.setOpacity(plotIn * c.p(0, 0.6, 0.4));
    const fNow = fFlat(pNow.x, pNow.y);
    this.fReadout.setContent(`f=${fNow.toFixed(2)}`);
    if (!in3D) this.place(this.fReadout, new THREE.Vector3(pNow.x, pNow.y, 0), -150, 10, plotIn);
    else this.fReadout.set({ opacity: 0 });
    const gdState = t >= c.s(5) ? 2 : t >= c.s(4) ? 1 : 0;
    this.gdFormula.setContent(this.gdTex(gdState));
    this.gdFormula.set({ opacity: c.p(0, 0.8, 0.2) * phaseA });
    this.expansion.set({ opacity: c.p(1, 0.6) * (1 - c.p(6, 0.5)) * phaseA });
    this.sameSpace.set({ opacity: c.p(6, 0.6, 0.3) * phaseA });

    // ---- Phase B (3D) from sentence 7
    const phaseB = c.p(7, 0.8);
    const dimC = c.p(16, 0.8);
    const endDim = c.p(20, 0.8);
    if (in3D) {
      const shift = lerp(1.0, 2.0, dimC);
      setOrbitView(stage, { azDeg: lerp(4, 0, dimC), elDeg: 22, distance: 6.2, fovDeg: 36, center: new THREE.Vector3(0, 0, 0.05), shift: shift * 1.12, lift: -0.1 });
    }
    const seeInside = c.p(9, 0.6) * (1 - c.p(12, 0.6));
    const sphereO = phaseB * (1 - 0.65 * endDim) * (1 - 0.55 * seeInside);
    this.sphere.setOpacity(in3D ? sphereO : 0);
    const onSphere = phaseB * (1 - 0.8 * dimC);
    this.xDot.setOpacity(in3D ? onSphere : 0);
    this.xLabel.update(in3D ? onSphere : 0);
    this.sphereFormula.set({ opacity: c.p(7, 0.6, 0.3) * (1 - c.p(16, 0.6)) });
    const e3Vis = c.p(8, 0.6) * (1 - 0.8 * dimC) * (1 - c.p(14, 0.6));
    this.e3Arrow.setOpacity(in3D ? e3Vis : 0);
    this.e3Label.update(in3D ? c.p(8, 0.6, 0.4) * (1 - c.p(13, 0.6)) * (1 - 0.8 * dimC) : 0);
    const alpha = ALPHA_MAX * c.over(9, 0.1, 0.9);
    const off = X0.clone().addScaledVector(E3, -alpha);
    const stepVis = c.p(9, 0.5) * (1 - c.p(13, 0.8)) * (1 - dimC);
    this.stepLine.setPoints([X0, off]);
    this.stepLine.setOpacity(in3D ? stepVis : 0);
    this.offDot.setPosition(off);
    this.offDot.setOpacity(in3D ? stepVis : 0);
    this.offLabel.handle.setContent(`\\|x-\\alpha e_3\\|=${off.length().toFixed(2)}`);
    this.offLabel.setAnchor(off);
    this.offLabel.update(in3D ? stepVis * c.p(10, 0.5, -0.8) : 0);
    const planeVis = c.p(13, 0.8) * (1 - 0.8 * dimC);
    this.plane.place(X0, X0);
    this.plane.setOpacity(in3D ? planeVis : 0);
    this.planeLabel.setAnchor(X0.clone().addScaledVector(new THREE.Vector3(-X0.y, X0.x, 0).normalize(), -0.62));
    this.planeLabel.update(in3D ? c.p(13, 0.6, 0.6) * (1 - c.p(14, 0.5)) * (1 - dimC) : 0);
    const split = c.p(14, 0.8) * (1 - 0.8 * dimC);
    const blink = t >= c.s(15) && t < c.e(15) ? 0.55 + 0.45 * Math.cos((t - c.s(15)) * 2 * Math.PI / 0.9) : 1;
    this.tanArrow.setOpacity(in3D ? split : 0);
    this.norArrow.setOpacity(in3D ? split * blink : 0);
    this.tanLabel.update(in3D ? split * c.p(14, 0.5, 0.6) * (1 - dimC) : 0);
    this.norLabel.update(in3D ? split * c.p(14, 0.5, 1.2) * (1 - dimC) : 0);

    // ---- Phase C: O(2)
    const phaseC = c.p(16, 0.8) * (1 - c.p(20, 0.8));
    this.matR.set({ opacity: phaseC * c.p(17, 0.6) });
    const a = 0.3 * c.over(18, 0.05, 0.85);
    this.matStep.setContent(this.alphaTex(a));
    this.matGram.setContent(this.gramTex(a));
    this.matStep.set({ opacity: phaseC * c.p(17, 0.6, 1.0) });
    this.matGram.set({ opacity: phaseC * c.p(17, 0.6, 1.0) });

    // ---- Phase D: ledger
    this.ledger.update(t, c.p(20, 0.6), true);
  }

  teardown(_layers: SceneLayers): void {}
}
