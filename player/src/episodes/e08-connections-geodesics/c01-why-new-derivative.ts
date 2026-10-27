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
import { Polyline, circlePoints } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { TangentPlane } from "../../primitives/TangentPlane";
import { WorldLabel } from "../../primitives/WorldLabel";
import { setOrbitView } from "../e06-gradient-retraction/lib/SphereCamera";
import { RayleighSphere } from "../e07-gradient-descent/lib/RayleighSphere";
import { applyA, lift, spherePoint, tangentFrame } from "../e07-gradient-descent/lib/rayleigh";
import { Tex } from "../e07-gradient-descent/lib/tex";

/**
 * E08 c01 — why a new derivative (lecture p.25; Boumal §5.1, (5.1)): the circle's velocity field, the difference
 * quotient γ̈ = −γ that leaves the tangent line, vectors in different tangent spaces, and the ambient derivative of
 * the Rayleigh gradient field on S² with its normal term −(uᵀAx)x.
 * Sentence indices refer to content/episodes/e08-connections-geodesics/story.en.json, scene c01-why-new-derivative.
 */

const P = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(x, y, 0);
const pt = (a: number): THREE.Vector3 => P(Math.cos(a), Math.sin(a));
const vel = (a: number): THREE.Vector3 => P(-Math.sin(a), Math.cos(a));
const A0 = 0.55;
const VS = 0.62;
const FIELD_ANGLES = Array.from({ length: 12 }, (_, i) => (2 * Math.PI * i) / 12);
const X = spherePoint(58, 28);

export class WhyNewDerivativeScene implements Scene {
  readonly id = "c01-why-new-derivative";
  private stage!: StageLayer;

  private circle!: Polyline;
  private walker!: Dot;
  private walkerVel!: Arrow;
  private field: Arrow[] = [];
  private pDot!: Dot;
  private qDot!: Dot;
  private pVel!: Arrow;
  private qVel!: Arrow;
  private qCopy!: Arrow;
  private diff!: Polyline;
  private quotient!: Arrow;
  private tanP!: Polyline;
  private tanQ!: Polyline;
  private lTanP!: FormulaHandle;
  private lTanQ!: FormulaHandle;

  private sphere!: RayleighSphere;
  private plane!: TangentPlane;
  private xDot!: Dot;
  private uArrow!: Arrow;
  private dvArrow!: Arrow;
  private tanArrow!: Arrow;
  private normal!: Polyline;
  private lU!: WorldLabel;
  private lDv!: WorldLabel;

  private fNewton!: FormulaHandle;
  private fCircle!: FormulaHandle;
  private fQuot!: FormulaHandle;
  private fSpaces!: FormulaHandle;
  private fSphere!: FormulaHandle;
  private fPlan!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    this.circle = new Polyline(stage, circlePoints(0, 0, 1, 160), { color: Palette.blue, width: 4 });
    this.walker = new Dot(stage, pt(0), Palette.orange, 0.05);
    this.walkerVel = new Arrow(stage, pt(0), pt(0).add(vel(0).multiplyScalar(VS)), Palette.green, { width: 4, headLength: 0.1 });
    for (const a of FIELD_ANGLES) {
      this.field.push(new Arrow(stage, pt(a), pt(a).add(vel(a).multiplyScalar(0.42)), Palette.green, { width: 2.5, headLength: 0.07 }));
    }
    this.pDot = new Dot(stage, pt(A0), Palette.orange, 0.045);
    this.qDot = new Dot(stage, pt(A0 + 1), Palette.purple, 0.045);
    this.pVel = new Arrow(stage, pt(A0), pt(A0), Palette.green, { width: 4, headLength: 0.1 });
    this.qVel = new Arrow(stage, pt(A0), pt(A0), Palette.purple, { width: 4, headLength: 0.1 });
    this.qCopy = new Arrow(stage, pt(A0), pt(A0), Palette.purple, { width: 3, headLength: 0.09 });
    this.diff = new Polyline(stage, [pt(A0), pt(A0)], { color: Palette.red, width: 3, dashed: true, dashSize: 0.04, gapSize: 0.03 });
    this.quotient = new Arrow(stage, pt(A0), pt(A0), Palette.red, { width: 5, headLength: 0.12 });
    this.tanP = new Polyline(stage, [pt(A0), pt(A0)], { color: Palette.orange, width: 2, opacity: 0.8 });
    this.tanQ = new Polyline(stage, [pt(A0), pt(A0)], { color: Palette.purple, width: 2, opacity: 0.8 });
    this.lTanP = fl.add({ tex: "T_{\\gamma(t)}S^1", x: 0, y: 0, size: 30, color: Palette.orange });
    this.lTanQ = fl.add({ tex: "T_{\\gamma(t+h)}S^1", x: 0, y: 0, size: 30, color: Palette.purple });

    this.sphere = new RayleighSphere(stage);
    this.plane = new TangentPlane(stage, Palette.green, 0.7);
    this.xDot = new Dot(stage, lift(X, 1.01), Palette.orange, 0.03, "3d");
    const { east, north } = tangentFrame(X);
    const u = east.clone().multiplyScalar(0.8).addScaledVector(north, 0.6).normalize();
    const ax = applyA(X);
    const au = applyA(u);
    const xax = X.dot(ax);
    const uax = u.dot(ax);
    const projAu = au.clone().addScaledVector(X, -X.dot(au));
    const tangent = projAu.addScaledVector(u, -xax);
    const total = tangent.clone().addScaledVector(X, -uax);
    const k = 1.6;
    this.uArrow = new Arrow(stage, X, X.clone().addScaledVector(u, 0.55), Palette.teal, { mode: "3d", width: 4, headLength: 0.07 });
    this.dvArrow = new Arrow(stage, X, X.clone().addScaledVector(total, k), Palette.red, { mode: "3d", width: 5, headLength: 0.08 });
    this.tanArrow = new Arrow(stage, X, X.clone().addScaledVector(tangent, k), Palette.green, { mode: "3d", width: 5, headLength: 0.08 });
    this.normal = new Polyline(stage, [X.clone().addScaledVector(tangent, k), X.clone().addScaledVector(total, k)],
      { color: Palette.red, width: 2.5, dashed: true, dashSize: 0.03, gapSize: 0.03 });
    this.lU = new WorldLabel(stage, fl, { tex: "u", size: 30, color: Palette.teal }, X.clone().addScaledVector(u, 0.55), { x: 14, y: -6 });
    this.lDv = new WorldLabel(stage, fl, { tex: "D\\bar V(x)[u]", size: 28, color: Palette.red }, X.clone().addScaledVector(total, k), { x: 16, y: -14 });

    this.fNewton = fl.add({ tex: "", x: 960, y: 430, size: 40, display: true });
    this.fCircle = fl.add({ tex: "", x: 1090, y: 330, size: 36, display: true });
    this.fQuot = fl.add({ tex: "", x: 1090, y: 430, size: 34, display: true });
    this.fSpaces = fl.add({ tex: "", x: 1090, y: 560, size: 34, display: true });
    this.fSphere = fl.add({ tex: "", x: 60, y: 430, size: 30, display: true, align: "left" });
    this.fPlan = fl.add({ tex: "", x: 960, y: 430, size: 36, display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "\\dot\\gamma(t)\\in T_{\\gamma(t)}S^1", at: cue.e(7) },
      { label: "2", tex: "\\ddot\\gamma(t)=-\\gamma(t)\\perp T_{\\gamma(t)}S^1", at: cue.e(15) },
      { label: "3", tex: "D\\bar V(x)[u]\\notin T_xS^2", at: cue.e(27) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const in3d = t >= c.s(22) - 0.3 && t < c.s(30) - 0.3;
    if (in3d) {
      setOrbitView(this.stage, { azDeg: 18, elDeg: 20, distance: 6.0, fovDeg: 34, center: new THREE.Vector3(0, 0, 0.1), shift: -0.15, lift: 0.05 });
    } else {
      this.stage.setView2D(1.5, -0.2, 3.1);
    }

    // ---- Newton needs a derivative of a vector field (s0–s3)
    const nw = Tex.count(t, [c.s(0) + 0.4, c.s(1), c.s(2), c.s(3)]);
    this.fNewton.setContent(Tex.rows([
      "\\text{first order: } \\operatorname{grad}f,\\ R_x,\\ \\alpha_k",
      `\\text{Newton: }${Tex.color(Palette.yellow, "\\operatorname{Hess}f(x)[s]=-\\operatorname{grad}f(x)")}`,
      "\\operatorname{Hess}f=\\text{derivative of the vector field }\\operatorname{grad}f",
      `${Tex.color(Palette.teal, "\\text{how do we differentiate a vector field on } M\\,?")}`,
    ], nw));
    this.fNewton.set({ opacity: (nw > 0 ? 1 : 0) * (1 - c.p(4, 0.5)) });

    // ---- the circle and its velocity field (s4–s21)
    const cO = c.during(4, 22, 0.5);
    this.circle.setOpacity(cO);
    const walkA = 0.4 + 0.45 * Math.max(0, t - c.s(5));
    const wO = cO * c.p(5, 0.5) * (1 - c.p(9, 0.5));
    this.walker.setPosition(pt(walkA));
    this.walker.setOpacity(wO);
    this.walkerVel.set(pt(walkA), pt(walkA).add(vel(walkA).multiplyScalar(VS)));
    this.walkerVel.setOpacity(wO * c.p(6, 0.5));
    const fO = cO * c.p(8, 0.6) * (1 - c.p(10, 0.5));
    this.field.forEach((a) => a.setOpacity(fO));

    const cr = Tex.count(t, [c.s(5), c.s(6), c.s(7)]);
    this.fCircle.setContent(Tex.rows([
      "\\gamma(t)=(\\cos t,\\ \\sin t)",
      "\\dot\\gamma(t)=(-\\sin t,\\ \\cos t)",
      `\\langle\\dot\\gamma(t),\\gamma(t)\\rangle=0\\ \\Rightarrow\\ ${Tex.color(Palette.green, "\\dot\\gamma(t)\\in T_{\\gamma(t)}S^1")}`,
    ], cr));
    this.fCircle.set({ opacity: (cr > 0 ? 1 : 0) * (1 - c.p(10, 0.5)) });

    // difference quotient (s10–s16), then two tangent spaces (s17–s21)
    const dq = c.p(10, 0.5) * (1 - c.p(22, 0.5));
    const h = t < c.s(17) ? lerp(1.0, 0.14, c.over(13, 0.1, 0.9)) : 0.95;
    const qa = A0 + h;
    this.pDot.setPosition(pt(A0));
    this.qDot.setPosition(pt(qa));
    this.pDot.setOpacity(dq);
    this.qDot.setOpacity(dq * c.p(11, 0.4));
    this.pVel.set(pt(A0), pt(A0).add(vel(A0).multiplyScalar(VS)));
    this.qVel.set(pt(qa), pt(qa).add(vel(qa).multiplyScalar(VS)));
    this.pVel.setOpacity(dq);
    this.qVel.setOpacity(dq * c.p(11, 0.4));
    const subtract = c.p(12, 0.6) * (1 - c.p(17, 0.5));
    const copyTip = pt(A0).add(vel(qa).multiplyScalar(VS));
    this.qCopy.set(pt(A0), copyTip);
    this.qCopy.setOpacity(dq * subtract * 0.8);
    this.diff.setPoints([pt(A0).add(vel(A0).multiplyScalar(VS)), copyTip]);
    this.diff.setOpacity(dq * subtract);
    const qv = vel(qa).sub(vel(A0)).multiplyScalar(VS / h);
    this.quotient.set(pt(A0), pt(A0).add(qv));
    this.quotient.setOpacity(dq * c.p(13, 0.5) * (1 - c.p(17, 0.5)));
    const tl = 1.25;
    const tanO = dq * Math.max(c.p(14, 0.5) * (1 - c.p(17, 0.4)), c.p(17, 0.5));
    this.tanP.setPoints([pt(A0).addScaledVector(vel(A0), -tl), pt(A0).addScaledVector(vel(A0), tl)]);
    this.tanP.setOpacity(tanO);
    this.tanQ.setPoints([pt(qa).addScaledVector(vel(qa), -tl), pt(qa).addScaledVector(vel(qa), tl)]);
    this.tanQ.setOpacity(dq * c.p(17, 0.5));
    const lp = this.stage.project(pt(A0).addScaledVector(vel(A0), -tl * 0.95));
    const lq = this.stage.project(pt(qa).addScaledVector(vel(qa), 0.7));
    this.lTanP.set({ x: lp.x + 40, y: lp.y + 26, opacity: dq * c.p(18, 0.5) });
    this.lTanQ.set({ x: lq.x, y: lq.y - 34, opacity: dq * c.p(17, 0.5) });

    const qr = Tex.count(t, [c.s(11), c.s(13), c.s(14), c.s(15), c.s(16)]);
    this.fQuot.setContent(Tex.rows([
      "\\dfrac{\\dot\\gamma(t+h)-\\dot\\gamma(t)}{h}",
      "\\xrightarrow{h\\to0}\\ (-\\cos t,-\\sin t)=-\\gamma(t)",
      `${Tex.color(Palette.red, "\\langle\\ddot\\gamma(t),\\gamma(t)\\rangle=-1\\neq0")}`,
      `${Tex.color(Palette.red, "\\ddot\\gamma(t)\\notin T_{\\gamma(t)}S^1")}`,
      `${Tex.color(Palette.muted, "\\text{constant speed: acceleration should be } 0")}`,
    ], qr));
    this.fQuot.set({ opacity: (qr > 0 ? 1 : 0) * (1 - c.p(17, 0.5)) });
    const sp = Tex.count(t, [c.s(17), c.s(18), c.s(19), c.s(20), c.s(21)]);
    this.fSpaces.setContent(Tex.rows([
      "\\dot\\gamma(t+h)-\\dot\\gamma(t)\\ \\ ?",
      `${Tex.color(Palette.purple, "\\dot\\gamma(t+h)\\in T_{\\gamma(t+h)}S^1")}`,
      `${Tex.color(Palette.orange, "\\dot\\gamma(t)\\in T_{\\gamma(t)}S^1")}`,
      "\\text{two different vector spaces}",
      `${Tex.color(Palette.muted, "\\text{no ambient plane}\\ \\Rightarrow\\ \\text{nothing to subtract in}")}`,
    ], sp));
    this.fSpaces.set({ y: 400, opacity: (sp > 0 ? 1 : 0) * (1 - c.p(22, 0.5)) });

    // ---- the Rayleigh gradient field on S² (s22–s29)
    const sO = c.during(22, 30, 0.5);
    this.sphere.setOpacity(sO, 0.6, 0);
    this.plane.place(X, X);
    this.plane.setOpacity(0.7 * sO * c.p(24, 0.5));
    this.xDot.setOpacity(sO);
    this.uArrow.setOpacity(sO * c.p(24, 0.5));
    this.lU.update(sO * c.p(24, 0.5));
    this.dvArrow.setOpacity(sO * c.p(25, 0.5));
    this.lDv.update(sO * c.p(25, 0.5));
    this.tanArrow.setOpacity(sO * c.p(26, 0.5));
    this.normal.setOpacity(sO * c.p(26, 0.5, 0.8));
    const sr = Tex.count(t, [c.s(23), c.s(25), c.s(26), c.s(27), c.s(28), c.s(29)]);
    this.fSphere.setContent(Tex.rows([
      "&V(x)=\\operatorname{grad}f(x)=Ax-(x^\\top Ax)\\,x",
      "&D\\bar V(x)[u]=\\mathrm{Proj}_x(Au)-(x^\\top Ax)\\,u-(u^\\top Ax)\\,x",
      `&${Tex.color(Palette.green, "\\text{tangent: first two terms}")}\\quad ${Tex.color(Palette.red, "\\text{normal: }-(u^\\top Ax)\\,x")}`,
      `&${Tex.color(Palette.red, "u^\\top Ax\\neq0\\ \\Rightarrow\\ D\\bar V(x)[u]\\notin T_xS^2")}`,
      "&\\langle\\operatorname{Hess}f(x)[u],u\\rangle\\ \\ ?",
      `&${Tex.color(Palette.yellow, "\\text{we need a new derivative for vector fields}")}`,
    ], sr, "aligned"));
    this.fSphere.set({ opacity: (sr > 0 ? 1 : 0) * (1 - c.p(30, 0.5)) });

    // ---- the plan (s30–s31)
    const pl = Tex.count(t, [c.s(30), c.in(30, 0.5), c.s(31)]);
    this.fPlan.setContent(Tex.rows([
      "\\text{properties of the ordinary derivative}\\ \\to\\ \\text{axioms}",
      "+\\ \\text{what the metric demands}\\ \\Rightarrow\\ \\text{one derivative}",
      `${Tex.color(Palette.teal, "\\text{first: how vector fields act on functions}")}`,
    ], pl));
    this.fPlan.set({ opacity: pl > 0 ? 1 : 0 });

    this.ledger.update(t, 1 - c.p(30, 0.5), true);
  }

  teardown(_layers: SceneLayers): void {}
}
