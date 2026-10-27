import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { setOrbitView } from "../e06-gradient-retraction/lib/SphereCamera";
import { Tex } from "../e07-gradient-descent/lib/tex";
import { GridSphere } from "./lib/GridSphere";
import { latitudePoint, transportArc } from "./lib/sphereGeometry";

/**
 * E08 c10 — parallel transport (lecture p.30; Boumal Defs 10.33, 10.35, Thm 10.34, Prop 10.36, §10.5): D/dt Z = 0,
 * linearity and isometry from compatibility, Ż = −⟨Z, γ̇⟩γ on S², constant angle with the velocity along a great
 * circle, the octant triangle N → e₁ → e₂ → N (e₁ returns as e₂: 90° = area π/2, length 1), and why conjugate
 * gradients and BFGS need it.
 * Sentence indices refer to content/episodes/e08-connections-geodesics/story.en.json, scene c10-parallel-transport.
 */

const DEG = Math.PI / 180;
const N = new THREE.Vector3(0, 0, 1);
const E1 = new THREE.Vector3(1, 0, 0);
const E2 = new THREE.Vector3(0, 1, 0);
const SAMPLES = 60;
const LEGS = (() => {
  const a = transportArc(N, E1, E1, SAMPLES);
  const b = transportArc(E1, E2, a.vectors[SAMPLES], SAMPLES);
  const c = transportArc(E2, N, b.vectors[SAMPLES], SAMPLES);
  return [a, b, c];
})();
const ARC_P = latitudePoint(70 * DEG, -60 * DEG);
const ARC_Q = latitudePoint(35 * DEG, 30 * DEG);
const ARC_Z0 = (() => {
  const u = ARC_Q.clone().addScaledVector(ARC_P, -ARC_P.dot(ARC_Q)).normalize();
  const w = ARC_P.clone().cross(u).normalize();
  return { a: u.clone().multiplyScalar(Math.cos(0.9)).addScaledVector(w, Math.sin(0.9)), b: u.clone().multiplyScalar(Math.cos(-0.5)).addScaledVector(w, Math.sin(-0.5)), u };
})();
const ARC_A = transportArc(ARC_P, ARC_Q, ARC_Z0.a, 40);
const ARC_B = transportArc(ARC_P, ARC_Q, ARC_Z0.b, 40);
const ARC_V = transportArc(ARC_P, ARC_Q, ARC_Z0.u, 40);
const VL = 0.32;

export class ParallelTransportScene implements Scene {
  readonly id = "c10-parallel-transport";
  private stage!: StageLayer;

  private sphere!: GridSphere;
  private arc!: Polyline;
  private seqA: Arrow[] = [];
  private seqB: Arrow[] = [];
  private seqV: Arrow[] = [];
  private lAngle!: FormulaHandle;
  private tri: Polyline[] = [];
  private triDots: Dot[] = [];
  private triLabels: FormulaHandle[] = [];
  private mover!: Arrow;
  private moverDot!: Dot;
  private ghost!: Arrow;
  private trail: Arrow[] = [];
  private lRot!: FormulaHandle;
  private gOld!: Arrow;
  private gNew!: Arrow;
  private gMoved!: Arrow;

  private fDef!: FormulaHandle;
  private fSphere!: FormulaHandle;
  private fTri!: FormulaHandle;
  private fUse!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    this.sphere = new GridSphere(stage);
    this.arc = new Polyline(stage, ARC_A.points.map((p) => p.clone().multiplyScalar(1.006)), { color: "#ffffff", width: 3.5 });
    for (let k = 0; k <= 40; k += 5) {
      const p = ARC_A.points[k];
      this.seqA.push(new Arrow(stage, p, p.clone().addScaledVector(ARC_A.vectors[k], VL), Palette.orange, { mode: "3d", width: 3.5, headLength: 0.06 }));
      this.seqB.push(new Arrow(stage, p, p.clone().addScaledVector(ARC_B.vectors[k], VL), Palette.purple, { mode: "3d", width: 3.5, headLength: 0.06 }));
      this.seqV.push(new Arrow(stage, p, p.clone().addScaledVector(ARC_V.vectors[k], VL), Palette.green, { mode: "3d", width: 3, headLength: 0.06 }));
    }
    this.lAngle = fl.add({ tex: "", x: 0, y: 0, size: 28, color: Palette.text, align: "left" });

    const colors = [Palette.teal, Palette.teal, Palette.teal];
    LEGS.forEach((leg, i) => this.tri.push(new Polyline(stage, leg.points.map((p) => p.clone().multiplyScalar(1.006)), { color: colors[i], width: 4 })));
    const names: [THREE.Vector3, string][] = [[N, "N"], [E1, "e_1"], [E2, "e_2"]];
    for (const [p, name] of names) {
      this.triDots.push(new Dot(stage, p.clone().multiplyScalar(1.01), Palette.text, 0.026, "3d"));
      this.triLabels.push(fl.add({ tex: name, x: 0, y: 0, size: 30, color: Palette.text }));
    }
    this.mover = new Arrow(stage, N, N.clone().addScaledVector(E1, 0.45), Palette.orange, { mode: "3d", width: 5, headLength: 0.08 });
    this.moverDot = new Dot(stage, N, Palette.orange, 0.03, "3d");
    this.ghost = new Arrow(stage, N, N.clone().addScaledVector(E1, 0.45), Palette.orange, { mode: "3d", width: 2.5, headLength: 0.06 });
    for (let k = 0; k < 9; k++) this.trail.push(new Arrow(stage, N, N.clone().addScaledVector(E1, 0.3), Palette.orange, { mode: "3d", width: 2, headLength: 0.05 }));
    this.lRot = fl.add({ tex: "", x: 0, y: 0, size: 30, color: Palette.yellow, align: "right" });

    const gx = latitudePoint(55 * DEG, -35 * DEG);
    const gy = latitudePoint(40 * DEG, 25 * DEG);
    const tr = transportArc(gx, gy, new THREE.Vector3(0.2, -0.5, 0).addScaledVector(gx, -gx.dot(new THREE.Vector3(0.2, -0.5, 0))).normalize(), 20);
    this.gOld = new Arrow(stage, gx, gx.clone().addScaledVector(tr.vectors[0], 0.45), Palette.red, { mode: "3d", width: 4, headLength: 0.07 });
    this.gMoved = new Arrow(stage, gy, gy.clone().addScaledVector(tr.vectors[20], 0.45), Palette.orange, { mode: "3d", width: 4, headLength: 0.07 });
    const gnew = new THREE.Vector3(0.6, 0.3, 0).addScaledVector(gy, -gy.dot(new THREE.Vector3(0.6, 0.3, 0))).normalize();
    this.gNew = new Arrow(stage, gy, gy.clone().addScaledVector(gnew, 0.45), Palette.green, { mode: "3d", width: 4, headLength: 0.07 });

    this.fDef = fl.add({ tex: "", x: 60, y: 110, size: 30, display: true, align: "left", valign: "top" });
    this.fSphere = fl.add({ tex: "", x: 60, y: 110, size: 30, display: true, align: "left", valign: "top" });
    this.fTri = fl.add({ tex: "", x: 60, y: 110, size: 30, display: true, align: "left", valign: "top" });
    this.fUse = fl.add({ tex: "", x: 60, y: 110, size: 30, display: true, align: "left", valign: "top" });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "\\tfrac{D}{dt}Z=0", at: cue.e(1) },
      { label: "2", tex: "\\Pi_\\gamma:T_{\\gamma(0)}M\\to T_{\\gamma(1)}M", at: cue.e(4) },
      { label: "3", tex: "\\Pi_\\gamma\\ \\text{linear isometry}", at: cue.e(8) },
      { label: "4", tex: "S^2:\\ \\dot Z=-\\langle Z,\\dot\\gamma\\rangle\\gamma", at: cue.e(10) },
      { label: "5", tex: "\\text{octant: } 90^\\circ=\\text{area }\\tfrac\\pi2", at: cue.e(21) },
    ], { x: 1440, y: 210, width: 460, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const triPart = t >= c.s(14) - 0.3 && t < c.s(22) - 0.3;
    if (triPart) setOrbitView(this.stage, { azDeg: 40, elDeg: 32, distance: 6.2, fovDeg: 34, center: new THREE.Vector3(0, 0, 0.2), shift: -0.45, lift: 0.0 });
    else setOrbitView(this.stage, { azDeg: -10, elDeg: 24, distance: 6.4, fovDeg: 34, center: new THREE.Vector3(0, 0, 0.05), shift: -0.45, lift: 0.05 });

    this.sphere.setOpacity(1, 1);

    // ---- definition along an arc (s0–s13)
    const aO = c.during(0, 14, 0.5);
    this.arc.setOpacity(aO);
    const grow = (k: number, n: number, start: number): number => (k / (n - 1) <= start + 1e-6 ? 1 : 0);
    const gA = Math.max(c.over(3, 0.05, 0.9), c.p(6, 0.1));
    this.seqA.forEach((a, k) => a.setOpacity(aO * c.p(1, 0.5) * grow(k, this.seqA.length, gA)));
    this.seqB.forEach((a) => a.setOpacity(aO * c.p(6, 0.6) * (1 - c.p(11, 0.5))));
    this.seqV.forEach((a) => a.setOpacity(aO * c.p(11, 0.6)));
    const ang = (k: number): number => Math.acos(Math.max(-1, Math.min(1, ARC_A.vectors[k].dot(ARC_B.vectors[k])))) / DEG;
    const kk = Math.min(40, Math.round(40 * c.over(7, 0.05, 0.95)));
    const lp = this.stage.project(ARC_A.points[kk]);
    this.lAngle.setContent(`\\angle=${ang(kk).toFixed(1)}^\\circ,\\ |Z|=${ARC_A.vectors[kk].length().toFixed(3)}`);
    this.lAngle.set({ x: lp.x + 20, y: lp.y + 40, opacity: aO * c.during(7, 9, 0.3) });
    const de = Tex.count(t, [c.s(0), c.s(1), c.s(2), c.s(3), c.s(4), c.s(5), c.s(6), c.s(7), c.s(8)]);
    this.fDef.setContent(Tex.rows([
      "&\\text{compare vectors at different points: along a curve}",
      `&Z\\ \\text{parallel:}\\ ${Tex.color(Palette.yellow, "\\tfrac{D}{dt}Z=0")}`,
      "&\\text{linear ODE: one parallel field per } Z(0)",
      `&${Tex.color(Palette.yellow, "\\Pi_\\gamma:\\ Z(0)\\mapsto Z(1)")}`,
      "&T_{\\gamma(0)}M\\to T_{\\gamma(1)}M",
      "&\\text{linear}",
      "&\\text{isometry: } Z,W\\ \\text{parallel}",
      "&\\tfrac{d}{dt}\\langle Z,W\\rangle=\\langle\\tfrac{D}{dt}Z,W\\rangle+\\langle Z,\\tfrac{D}{dt}W\\rangle=0",
      `&${Tex.color(Palette.green, "\\text{lengths, angles kept}")}\\ \\ ${Tex.color(Palette.red, "\\text{(not with ch. 5's shrinking } \\nabla)")}`,
    ], de, "aligned"));
    this.fDef.set({ opacity: (de > 0 ? 1 : 0) * (1 - c.p(9, 0.5)) });
    const sp = Tex.count(t, [c.s(9), c.s(10), c.s(11), c.s(12), c.s(13)]);
    this.fSphere.setContent(Tex.rows([
      "&S^2:\\ \\tfrac{D}{dt}Z=0\\iff\\dot Z\\parallel\\gamma",
      `&\\langle Z,\\gamma\\rangle=0\\Rightarrow${Tex.color(Palette.yellow, "\\dot Z=-\\langle Z,\\dot\\gamma\\rangle\\,\\gamma")}`,
      `&\\text{great circle: } ${Tex.color(Palette.green, "\\dot\\gamma")}\\ \\text{is itself parallel}`,
      "&\\text{constant angle with the direction of travel}",
      `&${Tex.color(Palette.red, "\\text{constant vector of } \\mathbb R^3:\\ \\text{leaves } T_{\\gamma(t)}S^2")}`,
    ], sp, "aligned"));
    this.fSphere.set({ opacity: (sp > 0 ? 1 : 0) * (1 - c.p(14, 0.5)) });

    // ---- the octant triangle (s14–s21)
    const tO = c.during(14, 22, 0.5);
    this.tri.forEach((l) => l.setOpacity(tO));
    this.triDots.forEach((d) => d.setOpacity(tO));
    this.triLabels.forEach((l, i) => {
      const base = [N, E1, E2][i];
      const q = this.stage.project(base.clone().multiplyScalar(1.12));
      l.set({ x: q.x, y: q.y - 6, opacity: tO });
    });
    const legP = [c.over(16, 0.05, 0.9), c.over(17, 0.05, 0.9), c.over(18, 0.05, 0.9)];
    let leg = 0;
    let f = 0;
    if (legP[2] > 0) { leg = 2; f = legP[2]; } else if (legP[1] > 0) { leg = 1; f = legP[1]; } else { leg = 0; f = legP[0]; }
    const idx = Math.round(f * SAMPLES);
    const pos = LEGS[leg].points[idx];
    const vec = LEGS[leg].vectors[idx];
    const mO = tO * c.p(15, 0.5);
    this.moverDot.setPosition(pos.clone().multiplyScalar(1.01));
    this.moverDot.setOpacity(mO);
    this.mover.set(pos, pos.clone().addScaledVector(vec, 0.45));
    this.mover.setOpacity(mO);
    this.trail.forEach((a, k) => {
      const lg = Math.floor(k / 3);
      const j = ((k % 3) + 1) * (SAMPLES / 4);
      const shown = lg < leg || (lg === leg && j <= idx);
      const p = LEGS[lg].points[j];
      a.set(p, p.clone().addScaledVector(LEGS[lg].vectors[j], 0.3));
      a.setOpacity(mO * 0.45 * (shown ? 1 : 0));
    });
    const done = c.p(19, 0.5);
    this.ghost.setOpacity(tO * done * 0.6);
    const nq = this.stage.project(N.clone().multiplyScalar(1.15));
    this.lRot.setContent("\\text{rotated } 90^\\circ,\\ |Z|=1");
    this.lRot.set({ x: nq.x - 40, y: nq.y - 20, opacity: tO * done });
    const tr = Tex.count(t, [c.s(14), c.s(15), c.s(16), c.s(17), c.s(18), c.s(19), c.s(20), c.s(21)]);
    this.fTri.setContent(Tex.rows([
      "&\\text{three great-circle arcs: } \\tfrac18\\ \\text{of the sphere}",
      `&\\text{start at } N,\\ Z=${Tex.color(Palette.orange, "e_1")}`,
      "&N\\to e_1:\\ Z\\ \\text{stays the velocity};\\ \\text{at } e_1:\\ -e_3",
      "&e_1\\to e_2:\\ Z\\perp\\text{path, stays } -e_3",
      `&e_2\\to N:\\ Z\\ \\text{points backward, arrives as } ${Tex.color(Palette.yellow, "e_2")}`,
      `&${Tex.color(Palette.yellow, "e_1\\mapsto e_2:\\ 90^\\circ,\\ |Z|=1")}`,
      "&\\text{RK4 integration agrees to 12 digits}",
      `&90^\\circ=\\tfrac\\pi2=\\text{area of the triangle}\\ ${Tex.color(Palette.muted, "\\text{(curvature)}")}`,
    ], tr, "aligned"));
    this.fTri.set({ opacity: (tr > 0 ? 1 : 0) * (1 - c.p(22, 0.5)) });

    // ---- why optimizers care (s22–s25)
    const uO = c.during(22, 40, 0.5);
    this.gOld.setOpacity(uO * c.p(24, 0.5));
    this.gNew.setOpacity(uO * c.p(24, 0.5, 0.8));
    this.gMoved.setOpacity(uO * c.p(25, 0.5));
    const us = Tex.count(t, [c.s(22), c.s(23), c.s(24), c.s(25)]);
    this.fUse.setContent(Tex.rows([
      `&${Tex.color(Palette.red, "\\text{path-dependent: no global comparison}")}`,
      "&\\text{along a chosen curve: what optimizers need}",
      `&\\text{CG, BFGS: } ${Tex.color(Palette.green, "\\operatorname{grad}f(x_{k+1})")}\\ \\text{and}\\ ${Tex.color(Palette.red, "\\operatorname{grad}f(x_k)")}`,
      `&${Tex.color(Palette.orange, "\\text{transport the old one first}")}\\ \\text{(or a cheaper transporter)}`,
    ], us, "aligned"));
    this.fUse.set({ opacity: us > 0 ? 1 : 0 });

    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
