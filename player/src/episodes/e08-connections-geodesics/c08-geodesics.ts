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
import { setOrbitView } from "../e06-gradient-retraction/lib/SphereCamera";
import { Tex } from "../e07-gradient-descent/lib/tex";
import { GridSphere } from "./lib/GridSphere";
import { greatCircle, latitudePoint, proj } from "./lib/sphereGeometry";

/**
 * E08 c08 — covariant derivatives along curves and geodesics (lecture pp. 29–30; Boumal Thm 5.29, Prop 5.31,
 * Defs 5.36, 5.38): D/dt Z = Proj(Ż), acceleration γ'' = Proj(γ̈), great circles (γ̈ = −γ) vs latitude circles
 * (tangential acceleration sin θ cos θ toward the pole), constant speed of geodesics, the coordinate equation
 * ẍ^k + Γ^k_ij ẋⁱẋ^j = 0 checked on a straight line in polar coordinates, and one geodesic per initial velocity.
 * Sentence indices refer to content/episodes/e08-connections-geodesics/story.en.json, scene c08-geodesics.
 */

const DEG = Math.PI / 180;
const wobble = (s: number): THREE.Vector3 => latitudePoint((62 + 16 * Math.sin(2 * s)) * DEG, s);
const H = 1e-3;
const d1 = (f: (s: number) => THREE.Vector3, s: number): THREE.Vector3 => f(s + H).sub(f(s - H)).divideScalar(2 * H);
const d2 = (f: (s: number) => THREE.Vector3, s: number): THREE.Vector3 => f(s + H).add(f(s - H)).sub(f(s).multiplyScalar(2)).divideScalar(H * H);
const GC_X = latitudePoint(90 * DEG, -20 * DEG);
const GC_U = new THREE.Vector3(0.25, 0.45, 0.86).sub(GC_X.clone().multiplyScalar(GC_X.dot(new THREE.Vector3(0.25, 0.45, 0.86)))).normalize();
const FAN_X = latitudePoint(40 * DEG, 10 * DEG);
const P = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(x, y, 0);

export class GeodesicsScene implements Scene {
  readonly id = "c08-geodesics";
  private stage!: StageLayer;

  private sphere!: GridSphere;
  private curve!: Polyline;
  private along: Arrow[] = [];
  private mover!: Dot;
  private vel!: Arrow;
  private acc!: Arrow;
  private accTan!: Arrow;
  private accNorm!: Polyline;
  private gcLine!: Polyline;
  private latLine!: Polyline;
  private lLat!: FormulaHandle;
  private fan: Polyline[] = [];
  private fanDot!: Dot;
  private polar: Polyline[] = [];
  private line!: Polyline;
  private lineDot!: Dot;

  private fCov!: FormulaHandle;
  private fGeo!: FormulaHandle;
  private fCoord!: FormulaHandle;
  private fOde!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    this.sphere = new GridSphere(stage);
    const cpts: THREE.Vector3[] = [];
    for (let i = 0; i <= 240; i++) cpts.push(wobble((2 * Math.PI * i) / 240).multiplyScalar(1.006));
    this.curve = new Polyline(stage, cpts, { color: "#ffffff", width: 3 });
    for (let k = 0; k < 9; k++) {
      const s = -0.4 + k * 0.32;
      const q = wobble(s);
      this.along.push(new Arrow(stage, q, q.clone().addScaledVector(d1(wobble, s), 0.28), Palette.green, { mode: "3d", width: 3, headLength: 0.05 }));
    }
    this.mover = new Dot(stage, GC_X, Palette.orange, 0.032, "3d");
    this.vel = new Arrow(stage, GC_X, GC_X, Palette.green, { mode: "3d", width: 4, headLength: 0.07 });
    this.acc = new Arrow(stage, GC_X, GC_X, Palette.red, { mode: "3d", width: 5, headLength: 0.08, depthTest: false });
    this.accTan = new Arrow(stage, GC_X, GC_X, Palette.yellow, { mode: "3d", width: 5, headLength: 0.08 });
    this.accNorm = new Polyline(stage, [GC_X, GC_X], { color: Palette.red, width: 2.5, dashed: true, dashSize: 0.03, gapSize: 0.03, depthTest: false });
    const gpts: THREE.Vector3[] = [];
    for (let i = 0; i <= 200; i++) gpts.push(greatCircle(GC_X, GC_U, (2 * Math.PI * i) / 200).multiplyScalar(1.006));
    this.gcLine = new Polyline(stage, gpts, { color: Palette.green, width: 3.5 });
    this.latLine = new Polyline(stage, gpts, { color: Palette.orange, width: 3.5 });
    this.lLat = fl.add({ tex: "", x: 0, y: 0, size: 28, color: Palette.yellow, align: "left" });
    const { u: fu, w: fw } = frameAt(FAN_X);
    for (let k = 0; k < 10; k++) {
      const a = (2 * Math.PI * k) / 10;
      const dir = fu.clone().multiplyScalar(Math.cos(a)).addScaledVector(fw, Math.sin(a));
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 60; i++) pts.push(greatCircle(FAN_X, dir, (1.6 * i) / 60).multiplyScalar(1.007));
      this.fan.push(new Polyline(stage, pts, { color: Palette.teal, width: 2.5 }));
    }
    this.fanDot = new Dot(stage, FAN_X.clone().multiplyScalar(1.01), Palette.orange, 0.032, "3d");

    for (const r of [0.5, 1, 1.5, 2, 2.5]) this.polar.push(new Polyline(stage, circlePoints(0, 0, r, 160), { color: Palette.grid, width: 1.5 }));
    for (let k = 0; k < 12; k++) this.polar.push(new Polyline(stage, [P(0, 0), P(2.7 * Math.cos((k * Math.PI) / 6), 2.7 * Math.sin((k * Math.PI) / 6))], { color: Palette.grid, width: 1.5 }));
    this.line = new Polyline(stage, [P(1, -2.3), P(1, 2.3)], { color: Palette.green, width: 4 });
    this.lineDot = new Dot(stage, P(1, 0), Palette.orange, 0.05);

    this.fCov = fl.add({ tex: "", x: 60, y: 120, size: 30, display: true, align: "left", valign: "top" });
    this.fGeo = fl.add({ tex: "", x: 60, y: 120, size: 30, display: true, align: "left", valign: "top" });
    this.fCoord = fl.add({ tex: "", x: 1150, y: 420, size: 31, display: true });
    this.fOde = fl.add({ tex: "", x: 60, y: 120, size: 30, display: true, align: "left", valign: "top" });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "\\tfrac{D}{dt}Z=\\mathrm{Proj}_{\\gamma(t)}\\dot Z(t)", at: cue.e(3) },
      { label: "2", tex: "\\gamma''=\\tfrac{D}{dt}\\dot\\gamma=\\mathrm{Proj}(\\ddot\\gamma)", at: cue.e(5) },
      { label: "3", tex: "\\text{geodesic: }\\nabla_{\\dot\\gamma}\\dot\\gamma=0", at: cue.e(7) },
      { label: "4", tex: "\\ddot x^k+\\Gamma^k_{ij}\\dot x^i\\dot x^j=0", at: cue.e(21) },
      { label: "5", tex: "\\text{one geodesic per } (x,v)", at: cue.e(27) },
    ], { x: 1440, y: 210, width: 460, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const in2d = t >= c.s(19) - 0.3 && t < c.s(25) - 0.3;
    if (in2d) this.stage.setView2D(2.9, 0, 5.4);
    else setOrbitView(this.stage, { azDeg: 25, elDeg: 22, distance: 6.4, fovDeg: 34, center: new THREE.Vector3(0, 0, 0.05), shift: -0.35, lift: 0.05 });

    const sO = Math.max(c.during(0, 19, 0.5), c.during(25, 40, 0.5));
    this.sphere.setOpacity(sO, 1);

    // ---- fields along a curve, acceleration (s0–s7)
    const wO = c.during(0, 8, 0.5);
    this.curve.setOpacity(wO);
    this.along.forEach((a, k) => a.setOpacity(wO * c.p(1, 0.5, 0.1 * k)));
    // generic curve: decomposition of γ̈ at a moving point (s4–s7); then great circle (s8–s9); latitude (s10–s18)
    let x: THREE.Vector3;
    let v: THREE.Vector3;
    let a: THREE.Vector3;
    let showTan = 1;
    let thDeg = 90;
    if (t < c.s(8)) {
      const s = 0.9 + 0.25 * Math.max(0, t - c.s(4));
      x = wobble(s);
      v = d1(wobble, s);
      a = d2(wobble, s);
    } else if (t < c.s(10)) {
      const s = 0.5 * Math.max(0, t - c.s(8));
      x = greatCircle(GC_X, GC_U, s);
      v = GC_U.clone().multiplyScalar(Math.cos(s)).addScaledVector(GC_X, -Math.sin(s));
      a = x.clone().negate();
      showTan = 0;
    } else {
      if (t < c.s(13)) thDeg = 50;
      else if (t < c.s(14)) thDeg = lerp(60, 30, c.over(13, 0.05, 0.95));
      else if (t < c.s(15)) thDeg = lerp(30, 90, c.over(14, 0.05, 0.9));
      else thDeg = 50;
      const th = thDeg * DEG;
      const ph = 0.2 + 0.6 * Math.max(0, t - c.s(10));
      x = latitudePoint(th, ph);
      v = new THREE.Vector3(-Math.sin(th) * Math.sin(ph), Math.sin(th) * Math.cos(ph), 0);
      a = new THREE.Vector3(-Math.sin(th) * Math.cos(ph), -Math.sin(th) * Math.sin(ph), 0);
    }
    const tan = proj(x, a);
    const KA = 0.6;
    const mO = Math.max(c.during(4, 8, 0.4), c.during(8, 19, 0.4));
    this.mover.setPosition(x.clone().multiplyScalar(1.01));
    this.mover.setOpacity(mO);
    this.vel.set(x, x.clone().addScaledVector(v, 0.5));
    this.vel.setOpacity(mO);
    this.acc.set(x, x.clone().addScaledVector(a, KA));
    this.acc.setOpacity(mO * c.p(4, 0.5));
    const tipT = x.clone().addScaledVector(tan, KA);
    this.accTan.set(x, tan.length() < 1e-3 ? x.clone().add(new THREE.Vector3(1e-4, 0, 0)) : tipT);
    this.accTan.setOpacity(mO * c.p(5, 0.5) * showTan * (tan.length() > 0.015 ? 1 : 0));
    this.accNorm.setPoints([tipT, x.clone().addScaledVector(a, KA)]);
    this.accNorm.setOpacity(mO * c.p(5, 0.5) * showTan * (tan.length() > 0.015 ? 1 : 0));
    this.gcLine.setOpacity(c.during(8, 10, 0.4));
    const lat: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) lat.push(latitudePoint(thDeg * DEG, (2 * Math.PI * i) / 160).multiplyScalar(1.006));
    this.latLine.setPoints(lat);
    this.latLine.setOpacity(c.during(10, 19, 0.4));
    const lp = this.stage.project(tipT);
    const th = thDeg * DEG;
    this.lLat.setContent(`\\theta=${thDeg.toFixed(0)}^\\circ:\\ |\\gamma''|=${(Math.sin(th) * Math.cos(th)).toFixed(3)}`);
    this.lLat.set({ x: lp.x + 16, y: lp.y - 26, opacity: c.during(12, 17, 0.4) });

    const cv = Tex.count(t, [c.s(0), c.s(1), c.s(2), c.s(3), c.s(4), c.s(5), c.s(6), c.s(7)]);
    this.fCov.setContent(Tex.rows([
      "&Z(t)\\in T_{\\gamma(t)}M\\ \\ \\text{along } \\gamma",
      `&${Tex.color(Palette.green, "\\dot\\gamma")}\\ \\text{is the main example}`,
      "&\\text{a connection induces } \\tfrac{D}{dt}",
      `&${Tex.color(Palette.yellow, "\\tfrac{D}{dt}Z=\\mathrm{Proj}_{\\gamma(t)}\\big(\\dot Z(t)\\big)")}`,
      `&\\text{acceleration: } \\gamma''=\\tfrac{D}{dt}\\dot\\gamma`,
      `&\\gamma''=\\mathrm{Proj}(${Tex.color(Palette.red, "\\ddot\\gamma")})\\ \\ ${Tex.color(Palette.yellow, "\\text{(yellow)}")}`,
      `&${Tex.color(Palette.yellow, "\\text{geodesic: } \\nabla_{\\dot\\gamma}\\dot\\gamma=0")}`,
      "&\\text{submanifold: } \\ddot\\gamma\\ \\text{always normal}",
    ], cv, "aligned"));
    this.fCov.set({ opacity: (cv > 0 ? 1 : 0) * (1 - c.p(8, 0.5)) });

    const ge = Tex.count(t, [c.s(8), c.s(9), c.s(10), c.s(11), c.s(12), c.s(13), c.s(14), c.s(15), c.s(16), c.s(17), c.s(18)]);
    this.fGeo.setContent(Tex.rows([
      `&${Tex.color(Palette.green, "\\gamma(t)=\\cos t\\,x+\\sin t\\,v")}`,
      `&\\ddot\\gamma=-\\gamma\\ \\text{normal}\\Rightarrow${Tex.color(Palette.green, "\\ \\text{geodesic}")}`,
      `&${Tex.color(Palette.orange, "\\text{latitude } \\theta,\\ \\text{unit angular speed}")}`,
      "&\\ddot\\gamma\\ \\text{points at the axis, not the center}",
      `&|\\gamma''|=${Tex.color(Palette.yellow, "\\sin\\theta\\cos\\theta")}\\ \\text{toward the pole}`,
      "&60^\\circ:0.433\\quad45^\\circ:0.5\\quad30^\\circ:0.433",
      `&90^\\circ:\\ 0\\ \\ ${Tex.color(Palette.green, "\\text{only the equator}")}`,
      "&\\text{a walker must keep turning}",
      `&${Tex.color(Palette.red, "\\text{constant speed is not the criterion}")}`,
      "&\\tfrac{d}{dt}|\\dot\\gamma|^2=2\\langle\\gamma'',\\dot\\gamma\\rangle=0",
      `&${Tex.color(Palette.muted, "\\text{(compatibility)}")}`,
    ], ge, "aligned"));
    this.fGeo.set({ opacity: (ge > 0 ? 1 : 0) * (1 - c.p(19, 0.5)) });

    // ---- coordinates: polar check (s19–s24)
    const pO = c.during(19, 25, 0.5);
    this.polar.forEach((g) => g.setOpacity(pO));
    this.line.setOpacity(pO * c.p(23, 0.5));
    const yy = -1.8 + 3.6 * c.over(23, 0.05, 0.95);
    this.lineDot.setPosition(P(1, Math.min(1.8, yy)));
    this.lineDot.setOpacity(pO * c.p(23, 0.5));
    const cd = Tex.count(t, [c.s(19), c.s(20), c.s(21), c.s(22), c.s(23), c.s(24)]);
    this.fCoord.setContent(Tex.rows([
      "\\dot\\gamma=\\dot x^jE_j",
      "\\gamma''=\\big(\\ddot x^k+\\Gamma^k_{ij}\\dot x^i\\dot x^j\\big)E_k",
      `${Tex.color(Palette.yellow, "\\ddot x^k+\\Gamma^k_{ij}\\dot x^i\\dot x^j=0")}`,
      "\\ddot r-r\\dot\\theta^2=0,\\quad \\ddot\\theta+\\tfrac2r\\dot r\\dot\\theta=0",
      "x=1:\\ r=\\sqrt{1+t^2},\\ \\theta=\\arctan t:\\ \\ \\text{residuals}<3\\times10^{-16}",
      `${Tex.color(Palette.green, "\\text{straight lines, even in curved coordinates}")}`,
    ], cd));
    this.fCoord.set({ opacity: (cd > 0 ? 1 : 0) * (1 - c.p(25, 0.5)) });

    // ---- existence and uniqueness, the fan (s25–s29)
    const fO = c.during(25, 40, 0.5);
    this.fan.forEach((f, k) => {
      f.setProgress(c.over(28, 0.05 + 0.03 * k, 0.6 + 0.03 * k));
      f.setOpacity(fO * c.p(28, 0.3));
    });
    this.fanDot.setOpacity(fO);
    const od = Tex.count(t, [c.s(25), c.s(26), c.s(27), c.s(28), c.s(29)]);
    this.fOde.setContent(Tex.rows([
      "&\\text{smooth second-order ODE}",
      "&\\gamma(0)=x,\\ \\dot\\gamma(0)=v:\\ \\text{unique local solution}",
      `&${Tex.color(Palette.yellow, "\\text{one geodesic per tangent vector}")}`,
      `&${Tex.color(Palette.teal, "\\text{a fan of great circles from } x")}`,
      `&${Tex.color(Palette.muted, "\\text{next: package the fan into one map}")}`,
    ], od, "aligned"));
    this.fOde.set({ opacity: od > 0 ? 1 : 0 });

    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}

/** Orthonormal tangent pair at x. */
function frameAt(x: THREE.Vector3): { u: THREE.Vector3; w: THREE.Vector3 } {
  const u = new THREE.Vector3(-x.y, x.x, 0).normalize();
  const w = x.clone().cross(u).normalize();
  return { u, w };
}
