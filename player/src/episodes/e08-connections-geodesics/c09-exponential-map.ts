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
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { TangentPlane } from "../../primitives/TangentPlane";
import { WorldLabel } from "../../primitives/WorldLabel";
import { MiniPlot } from "../e06-gradient-retraction/lib/MiniPlot";
import { setOrbitView } from "../e06-gradient-retraction/lib/SphereCamera";
import type { SvgPath } from "../e06-gradient-retraction/lib/SvgOverlay";
import { SvgOverlay } from "../e06-gradient-retraction/lib/SvgOverlay";
import { Tex } from "../e07-gradient-descent/lib/tex";
import { GridSphere } from "./lib/GridSphere";
import { expMap, latitudePoint, normalizationCurve, sidewaysCurve } from "./lib/sphereGeometry";

/**
 * E08 c09 — the exponential map (lecture pp. 29–30; Boumal Def 10.16, 10.19, Prop 10.18, Def 5.42, Prop 5.55):
 * Exp_x(tv) = γ_v(t), the sphere formula, circles of radius ρ mapped to circles at distance ρ collapsing to −x at
 * ρ = π, Exp as a (second-order) retraction, the normalization retraction (error/t³ → 1/3) and a first-order-only
 * retraction (error/t² → 1/2), with their log–log error slopes 3 and 2.
 * Sentence indices refer to content/episodes/e08-connections-geodesics/story.en.json, scene c09-exponential-map.
 */

const DEG = Math.PI / 180;
const X = latitudePoint(38 * DEG, 25 * DEG);
const U = new THREE.Vector3(-X.y, X.x, 0).normalize();
const W = X.clone().cross(U).normalize();
const V = U.clone().multiplyScalar(0.55).addScaledVector(W, -0.84).normalize();
const VSIDE = X.clone().cross(V).normalize();
const errN = (t: number): number => normalizationCurve(X, V, t).distanceTo(expMap(X, V.clone().multiplyScalar(t)));
const errS = (t: number): number => sidewaysCurve(X, V, VSIDE, t).distanceTo(expMap(X, V.clone().multiplyScalar(t)));

export class ExponentialMapScene implements Scene {
  readonly id = "c09-exponential-map";
  private stage!: StageLayer;

  private sphere!: GridSphere;
  private plane!: TangentPlane;
  private xDot!: Dot;
  private vArrow!: Arrow;
  private ray!: Polyline;
  private geo!: Polyline;
  private rayDot!: Dot;
  private geoDot!: Dot;
  private lV!: WorldLabel;
  private lExp!: WorldLabel;
  private ring!: Polyline;
  private anti!: Dot;
  private lRho!: FormulaHandle;
  private curves: Polyline[] = [];

  private svg!: SvgOverlay;
  private plot!: MiniPlot;
  private plotN!: SvgPath;
  private plotS!: SvgPath;
  private lSlope3!: FormulaHandle;
  private lSlope2!: FormulaHandle;

  private fDef!: FormulaHandle;
  private fRetr!: FormulaHandle;
  private fOrder!: FormulaHandle;
  private fUse!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    this.sphere = new GridSphere(stage);
    this.plane = new TangentPlane(stage, Palette.green, 0.9);
    this.xDot = new Dot(stage, X.clone().multiplyScalar(1.01), Palette.orange, 0.032, "3d");
    const vLen = 1.15;
    this.vArrow = new Arrow(stage, X, X.clone().addScaledVector(V, vLen), Palette.teal, { mode: "3d", width: 4, headLength: 0.07 });
    this.ray = new Polyline(stage, [X, X.clone().addScaledVector(V, vLen)], { color: Palette.teal, width: 2, dashed: true, dashSize: 0.04, gapSize: 0.04 });
    const gpts: THREE.Vector3[] = [];
    for (let i = 0; i <= 80; i++) gpts.push(expMap(X, V.clone().multiplyScalar((vLen * i) / 80)).multiplyScalar(1.006));
    this.geo = new Polyline(stage, gpts, { color: "#ffffff", width: 4 });
    this.rayDot = new Dot(stage, X, Palette.teal, 0.026, "3d");
    this.geoDot = new Dot(stage, X, "#ffffff", 0.03, "3d");
    this.lV = new WorldLabel(stage, fl, { tex: "v", size: 30, color: Palette.teal }, X.clone().addScaledVector(V, vLen), { x: 12, y: 8 });
    this.lExp = new WorldLabel(stage, fl, { tex: "\\mathrm{Exp}_x(v)", size: 28, color: "#ffffff" }, expMap(X, V.clone().multiplyScalar(vLen)), { x: 18, y: 14 });
    this.ring = new Polyline(stage, [X, X], { color: Palette.orange, width: 4 });
    this.anti = new Dot(stage, X.clone().negate().multiplyScalar(1.01), Palette.red, 0.04, "3d");
    this.lRho = fl.add({ tex: "", x: 0, y: 0, size: 28, color: Palette.orange, align: "left" });
    const colors = ["#ffffff", Palette.green, Palette.red];
    for (let k = 0; k < 3; k++) this.curves.push(new Polyline(stage, [X, X], { color: colors[k], width: 3.5 }));

    this.svg = new SvgOverlay(fl);
    this.plot = new MiniPlot(this.svg, fl, { x: 120, y: 650, w: 420, h: 165, xMin: 0, xMax: 1.4, yMin: 0, yMax: 5.2, xLabel: "\\log t", yLabel: "\\log\\text{err}" });
    this.plotN = this.plot.curve({ color: Palette.green, width: 3 });
    this.plotS = this.plot.curve({ color: Palette.red, width: 3 });
    this.plot.plot(this.plotN, (s) => Math.log10(errN(Math.pow(10, s - 1.6))) + 5.4, 0, 1.4);
    this.plot.plot(this.plotS, (s) => Math.log10(errS(Math.pow(10, s - 1.6))) + 5.4, 0, 1.4);
    this.lSlope3 = fl.add({ tex: "\\text{slope }3", x: 0, y: 0, size: 26, color: Palette.green, align: "left" });
    this.lSlope2 = fl.add({ tex: "\\text{slope }2", x: 0, y: 0, size: 26, color: Palette.red, align: "left" });

    this.fDef = fl.add({ tex: "", x: 60, y: 120, size: 30, display: true, align: "left", valign: "top" });
    this.fRetr = fl.add({ tex: "", x: 60, y: 120, size: 30, display: true, align: "left", valign: "top" });
    this.fOrder = fl.add({ tex: "", x: 60, y: 100, size: 27, display: true, align: "left", valign: "top" });
    this.fUse = fl.add({ tex: "", x: 960, y: 430, size: 34, display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "\\mathrm{Exp}_x(tv)=\\gamma_v(t)", at: cue.e(4) },
      { label: "2", tex: "S^2:\\ \\cos\\|v\\|\\,x+\\sin\\|v\\|\\,\\tfrac{v}{\\|v\\|}", at: cue.e(6) },
      { label: "3", tex: "\\operatorname{inj}=\\pi", at: cue.e(11) },
      { label: "4", tex: "\\text{second order: } c''(0)=0", at: cue.e(15) },
    ], { x: 1440, y: 210, width: 460, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    setOrbitView(this.stage, { azDeg: 25, elDeg: 26, distance: 6.6, fovDeg: 34, center: new THREE.Vector3(0, 0, 0.1), shift: -0.45, lift: 0.05 });

    const wrap = c.during(9, 12, 0.5);
    const sO = c.during(0, 26, 0.5);
    this.sphere.setOpacity(sO * (1 - 0.6 * wrap), 1);
    this.xDot.setOpacity(sO);

    // ---- shooting geodesics (s0–s8)
    const aO = c.during(0, 9, 0.5);
    this.plane.place(X, X);
    this.plane.setOpacity(0.7 * aO);
    this.vArrow.setOpacity(aO);
    this.lV.update(aO);
    const s01 = c.over(4, 0.05, 0.9);
    const sweep = t < c.s(4) ? c.over(1, 0.1, 0.9) : s01;
    this.ray.setOpacity(aO * c.p(4, 0.5));
    this.geo.setProgress(sweep);
    this.geo.setOpacity(aO * c.p(1, 0.5));
    this.rayDot.setPosition(X.clone().addScaledVector(V, 1.15 * sweep));
    this.rayDot.setOpacity(aO * c.p(4, 0.5));
    this.geoDot.setPosition(expMap(X, V.clone().multiplyScalar(1.15 * sweep)).multiplyScalar(1.01));
    this.geoDot.setOpacity(aO * c.p(1, 0.5));
    this.lExp.update(aO * c.p(1, 0.5) * (sweep > 0.95 ? 1 : 0));
    const df = Tex.count(t, [c.s(0), c.s(1), c.s(2), c.s(3), c.s(4), c.s(5), c.s(6), c.s(7), c.s(8)]);
    this.fDef.setContent(Tex.rows([
      "&\\gamma_v:\\ \\gamma_v(0)=x,\\ \\dot\\gamma_v(0)=v",
      `&${Tex.color(Palette.yellow, "\\mathrm{Exp}_x(v)=\\gamma_v(1)")}`,
      "&\\text{defined where } \\gamma_v \\text{ lasts until } t=1",
      "&\\gamma_{tv}(s)=\\gamma_v(ts)",
      `&\\Rightarrow\\ ${Tex.color(Palette.yellow, "\\mathrm{Exp}_x(tv)=\\gamma_v(t)")}`,
      "&S^2:\\ \\text{geodesics are great circles}",
      `&\\mathrm{Exp}_x(v)=\\cos\\|v\\|\\,x+\\sin\\|v\\|\\,\\tfrac{v}{\\|v\\|}`,
      "&\\text{walk } \\|v\\| \\text{ along the great circle in direction } v",
      "&\\text{defined on all of } T_xS^2",
    ], df, "aligned"));
    this.fDef.set({ opacity: (df > 0 ? 1 : 0) * (1 - c.p(9, 0.5)) });

    // ---- wrapping the tangent plane (s9–s11)
    const rho = lerp(0.25, Math.PI, c.over(10, 0.05, 0.95));
    const rpts: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) {
      const a = (2 * Math.PI * i) / 120;
      rpts.push(expMap(X, U.clone().multiplyScalar(Math.cos(a) * rho).addScaledVector(W, Math.sin(a) * rho)).multiplyScalar(1.008));
    }
    this.ring.setPoints(rpts);
    this.ring.setOpacity(wrap);
    this.anti.setOpacity(wrap * c.p(10, 0.5));
    const lr = this.stage.project(rpts[30]);
    this.lRho.setContent(`\\rho=${rho.toFixed(2)}${rho > 3.13 ? "=\\pi" : ""}`);
    this.lRho.set({ x: lr.x + 16, y: lr.y - 20, opacity: wrap });
    const rt = Tex.count(t, [c.s(9), c.s(10), c.s(11), c.s(12), c.s(13), c.s(14)]);
    this.fRetr.setContent(Tex.rows([
      "&|v|=\\rho\\ \\mapsto\\ \\text{circle at distance } \\rho \\text{ from } x",
      `&\\rho\\to\\pi:\\ \\text{all of it lands on } ${Tex.color(Palette.red, "-x")}`,
      `&\\text{one-to-one for } \\|v\\|<\\pi:\\ ${Tex.color(Palette.yellow, "\\operatorname{inj}(x)=\\pi")}`,
      `&${Tex.color(Palette.green, "\\text{retraction:}")}\\ \\mathrm{Exp}_x(0)=x`,
      "&\\tfrac{d}{dt}\\mathrm{Exp}_x(tv)\\big|_0=\\dot\\gamma_v(0)=v\\ \\Rightarrow\\ D\\mathrm{Exp}_x(0)=\\mathrm{id}",
      "&t\\mapsto\\mathrm{Exp}_x(tv)\\ \\text{has zero acceleration everywhere}",
    ], rt, "aligned"));
    this.fRetr.set({ opacity: (rt > 0 ? 1 : 0) * (1 - c.p(15, 0.5)) });

    // ---- second order, three curves, error slopes (s15–s25)
    const cO = c.during(15, 26, 0.5);
    const tmax = 1.25;
    const fns = [
      (s: number): THREE.Vector3 => expMap(X, V.clone().multiplyScalar(s)),
      (s: number): THREE.Vector3 => normalizationCurve(X, V, s),
      (s: number): THREE.Vector3 => sidewaysCurve(X, V, VSIDE, s),
    ];
    const show = [c.p(15, 0.5), c.p(17, 0.5), c.p(21, 0.5)];
    this.curves.forEach((cv, k) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 80; i++) pts.push(fns[k]((tmax * i) / 80).multiplyScalar(1.006 + 0.002 * k));
      cv.setPoints(pts);
      cv.setOpacity(cO * show[k]);
    });
    const pl = cO * c.p(25, 0.5);
    this.plot.setOpacity(pl);
    this.plotN.setOpacity(pl);
    this.plotS.setOpacity(pl * c.p(25, 0.5, 0.6));
    const p3 = this.plot.px(1.1, Math.log10(errN(Math.pow(10, -0.5))) + 5.4);
    const p2 = this.plot.px(0.8, Math.log10(errS(Math.pow(10, -0.8))) + 5.4);
    this.lSlope3.set({ x: p3.x + 10, y: p3.y + 22, opacity: pl });
    this.lSlope2.set({ x: p2.x - 90, y: p2.y - 22, opacity: pl * c.p(25, 0.5, 0.6) });
    const or = Tex.count(t, [c.s(15), c.s(16), c.s(17), c.s(18), c.s(19), c.s(20), c.s(21), c.s(22), c.s(23), c.s(24)]);
    this.fOrder.setContent(Tex.rows([
      `&${Tex.color(Palette.yellow, "\\text{second order: } c(t)=R_x(tv),\\ c''(0)=0")}`,
      `&${Tex.color("#ffffff", "\\mathrm{Exp}")}:\\ c''\\equiv0`,
      `&${Tex.color(Palette.green, "\\text{normalization: } c(t)=\\frac{x+tv}{\\sqrt{1+t^2}}")}`,
      "&\\ddot c(0)=-x\\ \\text{normal}\\Rightarrow c''(0)=0",
      "&\\|R_x(tv)-\\mathrm{Exp}_x(tv)\\|/t^3:\\ 0.305,\\ 0.326,\\ 0.331,\\ 0.333",
      `&\\to\\tfrac13:\\ ${Tex.color(Palette.green, "\\text{agree to second order}")}`,
      `&${Tex.color(Palette.red, "\\text{sideways: } \\frac{x+tv+\\frac12t^2\\|v\\|^2w}{\\|\\cdot\\|}")},\\ w\\perp v`,
      "&R(0)=x,\\ DR(0)=\\mathrm{id}\\ \\checkmark",
      `&${Tex.color(Palette.red, "c''(0)=w\\neq0")}`,
      "&\\text{error}/t^2:\\ 0.479,\\ 0.495,\\ 0.499\\to\\tfrac12",
    ], or, "aligned"));
    this.fOrder.set({ opacity: (or > 0 ? 1 : 0) * (1 - c.p(26, 0.5)) });

    const us = Tex.count(t, [c.s(26), c.s(27), c.s(28)]);
    this.fUse.setContent(Tex.rows([
      "\\text{first-order analysis (RGD convergence): any retraction}",
      `\\text{second-order analysis (Hessians via pullbacks): }${Tex.color(Palette.yellow, "\\text{second-order retraction}")}`,
      `${Tex.color(Palette.teal, "\\text{next: carry a tangent vector to another point}")}`,
    ], us));
    this.fUse.set({ opacity: us > 0 ? 1 : 0 });

    this.ledger.update(t, 1 - c.p(26, 0.5), true);
  }

  teardown(_layers: SceneLayers): void {}
}
