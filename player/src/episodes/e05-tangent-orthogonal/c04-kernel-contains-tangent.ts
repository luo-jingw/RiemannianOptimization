import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { clamp01, lerp } from "../../primitives/Easing";
import { keyframes } from "../../primitives/Keyframes";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Polyline, sampleCurve } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Surface, sphereFn } from "../../primitives/Surface";
import { TangentPlane } from "../../primitives/TangentPlane";
import { Hud } from "./lib/Hud";
import { Orbit } from "./lib/Orbit";
import { PlotPanel } from "./lib/PlotPanel";
import { TangentBasis } from "./lib/TangentBasis";
import { Tex } from "./lib/Tex";

/**
 * E05 c04 — step one: T_pM ⊆ ker Dh(p).
 * S² with a ball moving along a curve in M (h stays 1) and a red ball leaving along p + tv (h is a parabola);
 * the chain-rule derivation; the normal 2p and the kernel plane; k = 2 constraints: cylinder ∩ plane.
 * Sentence indices refer to content/episodes/e05-tangent-orthogonal/story.en.json, scene c04-kernel-contains-tangent.
 */

const FOV = 32;
const P = new THREE.Vector3(0.6, 0.35, 0.72).normalize();
const BASIS = new TangentBasis(P);
const PV = 0.5;                                        // pᵀv of the red, non-tangent direction
const V_OUT = BASIS.e1.clone().multiplyScalar(Math.sqrt(1 - PV * PV)).addScaledVector(P, PV);
const GAMMA_BETA = 0.6;
const THETA_Q = -0.75;                                   // point on the cylinder–plane curve
const Q = new THREE.Vector3(Math.cos(THETA_Q), Math.sin(THETA_Q), Math.sin(THETA_Q) / 2);
const GRAD1 = new THREE.Vector3(2 * Q.x, 2 * Q.y, 0);
const GRAD2 = new THREE.Vector3(0, -0.5, 1);
const TANGENT_Q = new THREE.Vector3(-Math.sin(THETA_Q), Math.cos(THETA_Q), Math.cos(THETA_Q) / 2).normalize();

const hOut = (t: number): number => 1 + 2 * t * PV + t * t;

export class KernelContainsTangentScene implements Scene {
  readonly id = "c04-kernel-contains-tangent";
  private stage!: StageLayer;
  private hud!: Hud;
  private sphere!: Surface;
  private pDot!: Dot;
  private pLabel!: FormulaHandle;
  private gammaCurve!: Polyline;
  private ball!: Dot;
  private redBall!: Dot;
  private redPath!: Polyline;
  private plot!: PlotPanel;
  private flat!: Polyline;
  private parabola!: Polyline;
  private slopeLine!: Polyline;
  private plotDot!: Dot;
  private plotRedDot!: Dot;
  private flatLabel!: FormulaHandle;
  private parabolaLabel!: FormulaHandle;
  private slopeLabel!: FormulaHandle;
  private setting!: FormulaHandle;
  private derivation!: FormulaHandle;
  private normal!: Arrow;
  private normalLabel!: FormulaHandle;
  private kerPlane!: TangentPlane;
  private tanPlane!: TangentPlane;
  private sphereFormula!: FormulaHandle;
  private kerLabel!: FormulaHandle;
  private cylinder!: Surface;
  private cutPlane!: TangentPlane;
  private curve!: Polyline;
  private qDot!: Dot;
  private grads: Arrow[] = [];
  private gradLabels: FormulaHandle[] = [];
  private tangentLine!: Polyline;
  private rowsCard!: FormulaHandle;
  private cylLabel!: FormulaHandle;
  private badge!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);
    this.hud = new Hud(stage);
    this.sphere = new Surface(stage, sphereFn(1), Palette.blue, { wireframe: true, opacity: 0.5 });
    this.pDot = new Dot(stage, P, Palette.orange, 0.04, "3d");
    this.pLabel = fl.add({ tex: "p", x: 0, y: 0, size: 36, color: Palette.orange });
    this.gammaCurve = new Polyline(stage, sampleCurve((s) => BASIS.geodesic(GAMMA_BETA, s).multiplyScalar(1.005), -1.0, 1.0, 80),
      { color: Palette.teal, width: 4.5 });
    this.ball = new Dot(stage, P, Palette.text, 0.05, "3d");
    this.redBall = new Dot(stage, P, Palette.red, 0.05, "3d");
    this.redPath = new Polyline(stage, [P.clone().addScaledVector(V_OUT, -0.6), P.clone().addScaledVector(V_OUT, 1.0)],
      { color: Palette.red, width: 3, dashed: true, dashSize: 0.05, gapSize: 0.035 });

    this.plot = new PlotPanel(stage, fl, this.hud, {
      width: 560, height: 380, xMin: -1, xMax: 1, yMin: 0, yMax: 3.1,
      xLabel: "t", yLabel: "h(\\cdot)", originX: 0, originY: 0,
    });
    this.flat = this.plot.curve(() => 1, -1, 1, 60, Palette.teal, 5);
    this.parabola = this.plot.curve(hOut, -1, 1, 80, Palette.red, 4);
    this.slopeLine = new Polyline(stage, [this.plot.v(-0.9, 1 - 0.9 * 2 * PV, 0.02), this.plot.v(0.9, 1 + 0.9 * 2 * PV, 0.02)],
      { color: Palette.yellow, width: 2.5, dashed: true, dashSize: 10, gapSize: 7 });
    this.plot.grp.adopt(this.slopeLine.object);
    this.plotDot = new Dot(stage, new THREE.Vector3(), Palette.text, 7, "2d");
    this.plot.grp.adopt(this.plotDot.object);
    this.plotRedDot = new Dot(stage, new THREE.Vector3(), Palette.red, 7, "2d");
    this.plot.grp.adopt(this.plotRedDot.object);
    this.flatLabel = fl.add({ tex: "h(\\gamma(t))=1", x: 0, y: 0, size: 28, color: Palette.teal, align: "left" });
    this.parabolaLabel = fl.add({ tex: "h(p+tv)", x: 0, y: 0, size: 28, color: Palette.red, align: "left" });
    this.slopeLabel = fl.add({ tex: "\\text{slope } 2p^{\\top}v\\neq0", x: 0, y: 0, size: 28, color: Palette.yellow, align: "left" });

    this.setting = fl.add({ tex: "h:U\\subseteq\\mathbb{R}^n\\to\\mathbb{R}^k\\ \\text{smooth},\\quad c\\ \\text{regular value},\\quad M=h^{-1}(c)", x: 750, y: 96, size: 34 });
    this.derivation = fl.add({ tex: this.derivTex(0), x: 900, y: 520, size: 32, display: true });

    this.normal = new Arrow(stage, P, P.clone().multiplyScalar(1.75), Palette.red, { mode: "3d", headLength: 0.1, width: 5 });
    this.normalLabel = fl.add({ tex: "\\nabla h(p)=2p", x: 0, y: 0, size: 32, color: Palette.red });
    this.kerPlane = new TangentPlane(stage, Palette.purple, 0.78);
    this.kerPlane.place(P, P);
    this.tanPlane = new TangentPlane(stage, Palette.orange, 0.6);
    this.tanPlane.place(P.clone().multiplyScalar(1.002), P);
    this.sphereFormula = fl.add({ tex: "Dh(p)[v]=2p^{\\top}v=0\\iff v\\perp p", x: 1010, y: 300, size: 36 });
    this.kerLabel = fl.add({ tex: "\\ker Dh(p)", x: 0, y: 0, size: 32, color: Palette.purple });

    this.cylinder = new Surface(stage, (u, v, target) => {
      target.set(Math.cos(2 * Math.PI * u), Math.sin(2 * Math.PI * u), -1.1 + 2.2 * v);
    }, Palette.blue, { wireframe: true, opacity: 0.4, isoU: 24, isoV: 6 });
    this.cutPlane = new TangentPlane(stage, Palette.purple, 1.35);
    this.cutPlane.place(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.5, 1));
    this.curve = new Polyline(stage, sampleCurve((s) => new THREE.Vector3(Math.cos(s), Math.sin(s), Math.sin(s) / 2).multiplyScalar(1.004), 0, 2 * Math.PI, 160),
      { color: Palette.teal, width: 5 });
    this.qDot = new Dot(stage, Q, Palette.orange, 0.045, "3d");
    [GRAD1.clone().normalize().multiplyScalar(0.8), GRAD2.clone().normalize().multiplyScalar(0.8)].forEach((g, i) => {
      this.grads.push(new Arrow(stage, Q, Q.clone().add(g), i === 0 ? Palette.red : Palette.pink, { mode: "3d", headLength: 0.1, width: 5 }));
      this.gradLabels.push(fl.add({ tex: `\\nabla h_${i + 1}`, x: 0, y: 0, size: 32, color: i === 0 ? Palette.red : Palette.pink }));
    });
    this.tangentLine = new Polyline(stage, [Q.clone().addScaledVector(TANGENT_Q, -0.8), Q.clone().addScaledVector(TANGENT_Q, 0.8)],
      { color: Palette.orange, width: 5 });
    this.rowsCard = fl.add({
      tex: "Dh(p)=\\begin{pmatrix}\\nabla h_1(p)^{\\top}\\\\ \\vdots\\\\ \\nabla h_k(p)^{\\top}\\end{pmatrix},\\qquad \\ker Dh(p)=\\{v:\\ \\nabla h_i(p)^{\\top}v=0\\ \\ \\forall i\\}",
      x: 750, y: 110, size: 32,
    });
    this.cylLabel = fl.add({ tex: "x^2+y^2=1,\\quad z=y/2", x: 1060, y: 640, size: 32, color: Palette.text });
    this.badge = fl.add({ tex: "\\text{regularity used: } \\textbf{no}", x: 1120, y: 780, size: 32, color: Palette.yellow, boxed: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "T_pM\\subseteq\\ker Dh(p)", at: cue.s(15) + 1.5 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  private derivTex(n: number): string {
    const lines = [
      "&v\\in T_pM:\\ \\ \\gamma:(-\\varepsilon,\\varepsilon)\\to M,\\ \\gamma(0)=p,\\ \\gamma'(0)=v",
      "&\\gamma(t)\\in M=h^{-1}(c)\\ \\Rightarrow\\ h(\\gamma(t))=c\\ \\ \\forall t",
      "&\\Rightarrow\\ \\tfrac{d}{dt}\\,h(\\gamma(t))=0\\ \\ \\forall t",
      "&\\tfrac{d}{dt}\\,h(\\gamma(t))=Dh(\\gamma(t))\\,\\gamma'(t)\\quad\\text{(chain rule)}",
      `&t=0:\\ \\ ${Tex.c(Palette.purple, "\\boxed{Dh(p)\\,v=0}")}`,
      `&\\Rightarrow\\ v\\in\\ker Dh(p),\\quad ${Tex.c(Palette.yellow, "T_pM\\subseteq\\ker Dh(p)")}`,
    ];
    return Tex.revealLines(lines, n);
  }

  private label(h: FormulaHandle, world: THREE.Vector3, dx: number, dy: number, opacity: number): void {
    const f = this.stage.project(world);
    h.set({ x: f.x + dx, y: f.y + dy, opacity });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const lay = keyframes(t, [
      { t: 0, v: { sx: 420, sy: 480, d: 7.0, az: 0.3, el: 0.4 } },
      { t: c.s(9), v: { sx: 270, sy: 560, d: 10.5, az: 0.4, el: 0.4 } },
      { t: c.s(16), v: { sx: 470, sy: 480, d: 7.0, az: 0.5, el: 0.4 } },
      { t: c.s(20), v: { sx: 470, sy: 480, d: 8.8, az: -1.0, el: 0.5 } },
    ], 1.2);
    Orbit.frame(this.stage, lay.az, lay.el, lay.d, FOV, new THREE.Vector3(0, 0, 0), lay.sx, lay.sy);
    this.hud.sync(this.stage, FOV);

    const sphereVis = c.p(0, 1.0, -1.6) * (1 - c.p(20, 0.8));
    this.sphere.setOpacity(sphereVis);
    this.pDot.setOpacity(sphereVis);
    this.label(this.pLabel, P, -22, -24, sphereVis);
    this.setting.set({ opacity: c.p(1, 0.6) * (1 - c.p(9, 0.5)) });

    // ---- Motion inside M (s3–s4) and leaving M (s5–s8).
    const inside = c.p(3, 0.6) * (1 - c.p(9, 0.6));
    const tau = lerp(-1, 1, c.over(3, 0.05, 0.95));
    this.gammaCurve.setOpacity(inside);
    this.ball.setPosition(BASIS.geodesic(GAMMA_BETA, tau).multiplyScalar(1.01));
    this.ball.setOpacity(inside);
    const leave = c.p(5, 0.6) * (1 - c.p(9, 0.6));
    const tauR = lerp(-0.6, 1.0, c.over(5, 0.05, 0.95));
    this.redPath.setOpacity(leave);
    this.redBall.setPosition(P.clone().addScaledVector(V_OUT, tauR));
    this.redBall.setOpacity(leave);

    const plotVis = c.p(3, 0.7) * (1 - c.p(16, 0.6));
    const plotSmall = c.p(9, 1.0);
    this.plot.place(lerp(1060, 1170, plotSmall), lerp(330, 210, plotSmall), lerp(1, 0.55, plotSmall));
    this.plot.draw(plotVis);
    const k = this.plot.grp.scale;
    this.flat.setProgress(t < c.s(5) ? (tau + 1) / 2 : 1);
    this.flat.setOpacity(plotVis);
    this.flat.setWidth(t >= c.s(12) && t < c.e(12) ? 8 : 5);
    this.plotDot.setPosition(this.plot.v(tau, 1, 0.03));
    this.plotDot.setOpacity(inside * (1 - c.p(5, 0.4)));
    const parProg = clamp01((tauR + 1) / 2);
    this.parabola.setProgress(t < c.s(6) ? parProg : 1);
    this.parabola.setOpacity(leave * plotVis);
    this.plotRedDot.setPosition(this.plot.v(Math.max(-1, tauR), hOut(Math.max(-1, tauR)), 0.03));
    this.plotRedDot.setOpacity(leave * (1 - c.p(6, 0.4)) * (tauR >= -1 ? 1 : 0));
    this.slopeLine.setOpacity(c.p(7, 0.6) * (1 - c.p(9, 0.6)));
    const fl = this.plot.frame(0.25, 1);
    this.flatLabel.set({ x: fl.x, y: fl.y + 22 * k, scale: k, opacity: plotVis * c.p(4, 0.6) });
    const pl = this.plot.frame(0.45, hOut(0.45));
    this.parabolaLabel.set({ x: pl.x + 26 * k, y: pl.y, scale: k, opacity: leave * plotVis * c.p(6, 0.6) });
    const sl = this.plot.frame(-0.95, 2.6);
    this.slopeLabel.set({ x: sl.x, y: sl.y, scale: k, opacity: c.p(7, 0.6) * (1 - c.p(9, 0.6)) });

    // ---- Derivation (s9–s15).
    const dn = t >= c.s(15) ? 6 : t >= c.s(14) ? 5 : t >= c.s(13) ? 4 : t >= c.s(12) ? 3 : t >= c.s(11) ? 2 : t >= c.s(10) ? 1 : 0;
    this.derivation.setContent(this.derivTex(dn));
    this.derivation.set({ opacity: (dn > 0 ? 1 : 0) * (1 - c.p(16, 0.6)) });

    // ---- Sphere: normal and kernel plane (s16–s19).
    const geo = c.p(16, 0.6) * (1 - c.p(20, 0.8));
    this.sphereFormula.set({ opacity: c.p(16, 0.6) * (1 - c.p(20, 0.6)) });
    this.normal.setOpacity(c.p(18, 0.6) * geo);
    this.label(this.normalLabel, P.clone().multiplyScalar(1.85), 0, -20, c.p(18, 0.6) * geo);
    this.kerPlane.setOpacity(c.p(18, 0.8, 1.0) * geo);
    this.label(this.kerLabel, P.clone().addScaledVector(BASIS.e1, 0.9).addScaledVector(BASIS.e2, -0.6), 0, 0, c.p(18, 0.8, 1.0) * geo);
    this.tanPlane.setOpacity(c.p(19, 0.6) * geo);

    // ---- k constraints: cylinder ∩ plane (s20–s27).
    const cyl = c.p(20, 0.9, 0.4);
    this.rowsCard.set({ opacity: c.p(20, 0.6) });
    this.cylinder.setOpacity(c.p(22, 0.8) * 0.8);
    this.cutPlane.setOpacity(c.p(22, 0.8, 0.6) * 0.8);
    this.curve.setProgress(c.over(22, 0.3, 0.9));
    this.curve.setOpacity(c.p(22, 0.5, 0.8));
    this.cylLabel.set({ opacity: c.p(22, 0.6) });
    const gq = c.p(23, 0.6) * cyl;
    this.qDot.setOpacity(gq);
    const gEnds = [GRAD1.clone().normalize().multiplyScalar(0.8), GRAD2.clone().normalize().multiplyScalar(0.8)];
    this.grads.forEach((g, i) => {
      g.setOpacity(gq);
      this.label(this.gradLabels[i], Q.clone().add(gEnds[i]).multiplyScalar(1.0), i === 0 ? 34 : -10, i === 0 ? 10 : -22, gq);
    });
    this.tangentLine.setOpacity(c.p(23, 0.6, 2.0) * cyl);
    this.tangentLine.setWidth(t >= c.s(24) && t < c.e(24) ? 8 : 5);

    this.badge.set({ opacity: c.p(25, 0.6) });
    this.ledger.update(t, clamp01(c.p(15, 0.5, 1.5)));
  }

  teardown(_layers: SceneLayers): void {}
}
