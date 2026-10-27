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
import { setOrbitView } from "../e06-gradient-retraction/lib/SphereCamera";
import { tangentFrame } from "../e07-gradient-descent/lib/rayleigh";
import { Tex } from "../e07-gradient-descent/lib/tex";
import { GridSphere } from "./lib/GridSphere";
import { greatCircle, latitudePoint, proj } from "./lib/sphereGeometry";

/**
 * E08 c07 — the Levi-Civita connection of a Riemannian submanifold (lecture pp. 28–29; Boumal Thms 5.2, 5.8, 5.9):
 * extend, differentiate, project; independence of the extension; the connection axioms; compatibility; torsion-free
 * via the symmetry of D²h; and the rotation field V(x) = e₃ × x on S² (∇_V V = 0 on the equator, tangent part of
 * length sin θ cos θ toward the pole on the latitude at polar angle θ).
 * Sentence indices refer to content/episodes/e08-connections-geodesics/story.en.json, scene c07-submanifold-connection.
 */

const E3 = new THREE.Vector3(0, 0, 1);
const rot = (x: THREE.Vector3): THREE.Vector3 => E3.clone().cross(x);
const DEG = Math.PI / 180;
const P0 = latitudePoint(55 * DEG, 25 * DEG);
const FIELD_PTS: THREE.Vector3[] = [];
for (const th of [35, 60, 90, 120]) for (let k = 0; k < 10; k++) FIELD_PTS.push(latitudePoint(th * DEG, (k * 36 + 8) * DEG));
const FS = 0.32;

export class SubmanifoldConnectionScene implements Scene {
  readonly id = "c07-submanifold-connection";
  private stage!: StageLayer;

  private sphere!: GridSphere;
  private field: Arrow[] = [];
  private shellA: Arrow[] = [];
  private shellB: Arrow[] = [];
  private plane!: TangentPlane;
  private pDot!: Dot;
  private vArrow!: Arrow;
  private dArrow!: Arrow;
  private yArrow!: Arrow;
  private nLine!: Polyline;
  private curve!: Polyline;
  private lV!: WorldLabel;
  private lD!: WorldLabel;
  private lY!: WorldLabel;
  private equator!: Polyline;
  private latLine!: Polyline;
  private exDot!: Dot;
  private exAmb!: Arrow;
  private exTan!: Arrow;
  private exNorm!: Polyline;
  private exVel!: Arrow;
  private lEx!: FormulaHandle;

  private fIntro!: FormulaHandle;
  private fBuild!: FormulaHandle;
  private fProofs!: FormulaHandle;
  private fExample!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    this.sphere = new GridSphere(stage);
    for (const q of FIELD_PTS) {
      this.field.push(new Arrow(stage, q.clone().multiplyScalar(1.01), q.clone().multiplyScalar(1.01).addScaledVector(rot(q), FS), Palette.blue, { mode: "3d", width: 2.5, headLength: 0.05 }));
    }
    const shellPts = FIELD_PTS.filter((_, i) => i % 2 === 0).map((q) => q.clone().multiplyScalar(1.3));
    for (const q of shellPts) {
      this.shellA.push(new Arrow(stage, q, q.clone().addScaledVector(rot(q), FS), "#ffffff", { mode: "3d", width: 2.5, headLength: 0.05 }));
      const w = new THREE.Vector3(0.0, 0.0, 1.0).multiplyScalar(q.lengthSq() - 1);
      this.shellB.push(new Arrow(stage, q, q.clone().addScaledVector(rot(q).add(w.multiplyScalar(0.9)), FS), Palette.purple, { mode: "3d", width: 2.5, headLength: 0.05 }));
    }
    const { east } = tangentFrame(P0);
    const v = east.clone().multiplyScalar(0.85);
    const d = rot(v);
    const y = proj(P0, d);
    const K = 1.0;
    this.plane = new TangentPlane(stage, Palette.green, 0.7);
    this.pDot = new Dot(stage, P0.clone().multiplyScalar(1.01), Palette.orange, 0.03, "3d");
    this.vArrow = new Arrow(stage, P0, P0.clone().addScaledVector(v, 0.6), Palette.teal, { mode: "3d", width: 4, headLength: 0.07 });
    this.dArrow = new Arrow(stage, P0, P0.clone().addScaledVector(d, K), Palette.red, { mode: "3d", width: 5, headLength: 0.08, depthTest: false });
    this.yArrow = new Arrow(stage, P0, P0.clone().addScaledVector(y, K), Palette.yellow, { mode: "3d", width: 5, headLength: 0.08 });
    this.nLine = new Polyline(stage, [P0.clone().addScaledVector(y, K), P0.clone().addScaledVector(d, K)], { color: Palette.red, width: 2.5, dashed: true, dashSize: 0.03, gapSize: 0.03 });
    const u = east.clone();
    const cpts: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) cpts.push(greatCircle(P0, u, -0.6 + (1.2 * i) / 60).multiplyScalar(1.006));
    this.curve = new Polyline(stage, cpts, { color: "#ffffff", width: 3 });
    this.lV = new WorldLabel(stage, fl, { tex: "v", size: 30, color: Palette.teal }, P0.clone().addScaledVector(v, 0.6), { x: 12, y: -10 });
    this.lD = new WorldLabel(stage, fl, { tex: "D\\bar X(p)[v]", size: 28, color: Palette.red }, P0.clone().addScaledVector(d, K), { x: 16, y: -12 });
    this.lY = new WorldLabel(stage, fl, { tex: "\\nabla_vX", size: 30, color: Palette.yellow }, P0.clone().addScaledVector(y, K), { x: -20, y: 26 });

    const eq: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) eq.push(latitudePoint(Math.PI / 2, (2 * Math.PI * i) / 160).multiplyScalar(1.006));
    this.equator = new Polyline(stage, eq, { color: Palette.green, width: 4 });
    this.latLine = new Polyline(stage, eq, { color: Palette.orange, width: 4 });
    this.exDot = new Dot(stage, P0, Palette.orange, 0.032, "3d");
    this.exAmb = new Arrow(stage, P0, P0, Palette.red, { mode: "3d", width: 5, headLength: 0.08, depthTest: false });
    this.exTan = new Arrow(stage, P0, P0, Palette.yellow, { mode: "3d", width: 5, headLength: 0.08 });
    this.exNorm = new Polyline(stage, [P0, P0], { color: Palette.red, width: 2.5, dashed: true, dashSize: 0.03, gapSize: 0.03 });
    this.exVel = new Arrow(stage, P0, P0, Palette.blue, { mode: "3d", width: 4, headLength: 0.07 });
    this.lEx = fl.add({ tex: "", x: 0, y: 0, size: 28, color: Palette.yellow, align: "left" });

    this.fIntro = fl.add({ tex: "", x: 960, y: 430, size: 36, display: true });
    this.fBuild = fl.add({ tex: "", x: 60, y: 120, size: 30, display: true, align: "left", valign: "top" });
    this.fProofs = fl.add({ tex: "", x: 700, y: 430, size: 31, display: true });
    this.fExample = fl.add({ tex: "", x: 60, y: 120, size: 30, display: true, align: "left", valign: "top" });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "\\nabla_vX=\\mathrm{Proj}_p\\big(D\\bar X(p)[v]\\big)", at: cue.e(5) },
      { label: "2", tex: "\\text{independent of } \\bar X", at: cue.e(9) },
      { label: "3", tex: "\\text{connection, compatible}", at: cue.e(14) },
      { label: "4", tex: "\\text{torsion-free}\\Rightarrow\\text{Levi-Civita}", at: cue.e(21) },
    ], { x: 1440, y: 210, width: 460, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    setOrbitView(this.stage, { azDeg: 20, elDeg: 24, distance: 6.4, fovDeg: 34, center: new THREE.Vector3(0, 0, 0.05), shift: -0.35, lift: 0.05 });

    const io = Tex.count(t, [c.s(0), c.s(1), c.s(2)]);
    this.fIntro.setContent(Tex.rows([
      "\\text{spheres, } O(n),\\ \\text{Stiefel: inside a Euclidean space}",
      "\\text{their Levi-Civita connection has a simple description}",
      "M\\subseteq\\mathbb R^n,\\ \\text{induced metric},\\ X\\in\\mathfrak X(M)",
    ], io));
    this.fIntro.set({ opacity: (io > 0 ? 1 : 0) * (1 - c.p(3, 0.5)) });

    // ---- extend, differentiate, project (s3–s9)
    const bO = c.during(3, 10, 0.5);
    const exO = c.during(23, 31, 0.5);
    const sO = Math.max(bO, exO);
    this.sphere.setOpacity(sO, 1);
    this.field.forEach((a) => a.setOpacity(Math.max(bO * c.p(3, 0.5), exO * c.p(23, 0.5))));
    this.shellA.forEach((a) => a.setOpacity(bO * c.p(3, 0.5) * (1 - c.p(5, 0.5)) + bO * c.p(9, 0.5)));
    this.shellB.forEach((a) => a.setOpacity(bO * c.p(9, 0.5)));
    this.plane.place(P0, P0);
    this.plane.setOpacity(0.7 * bO * c.p(4, 0.5));
    this.pDot.setOpacity(bO);
    this.vArrow.setOpacity(bO * c.p(4, 0.5));
    this.lV.update(bO * c.p(4, 0.5));
    this.dArrow.setOpacity(bO * c.p(4, 0.5, 1.2));
    this.lD.update(bO * c.p(4, 0.5, 1.2));
    this.yArrow.setOpacity(bO * c.p(5, 0.5));
    this.lY.update(bO * c.p(5, 0.5));
    this.nLine.setOpacity(bO * c.p(5, 0.5));
    this.curve.setOpacity(bO * c.p(7, 0.5));
    const bu = Tex.count(t, [c.s(3), c.s(4), c.s(5), c.s(6), c.s(7), c.s(8), c.s(9)]);
    this.fBuild.setContent(Tex.rows([
      "&\\text{1. extend: } \\bar X \\text{ on an open } U\\supseteq M",
      "&\\text{2. differentiate: } D\\bar X(p)[v],\\ v\\in\\mathbb R^n",
      `&\\text{3. project: } ${Tex.color(Palette.yellow, "\\nabla_vX=\\mathrm{Proj}_p\\big(D\\bar X(p)[v]\\big)")}`,
      "&\\text{the fix the circle asked for}",
      "&c\\subset M,\\ c(0)=p,\\ c'(0)=v",
      "&D\\bar X(p)[v]=(\\bar X\\circ c)'(0)=(X\\circ c)'(0)",
      `&${Tex.color(Palette.purple, "\\text{two extensions, same derivative along } M")}`,
    ], bu, "aligned"));
    this.fBuild.set({ opacity: (bu > 0 ? 1 : 0) * (1 - c.p(10, 0.5)) });

    // ---- the four checks (s10–s22)
    const pr = Tex.count(t, [c.s(10), c.s(11), c.s(12), c.s(13), c.s(14), c.s(15), c.s(16), c.s(17), c.s(18), c.s(19), c.s(20), c.s(21), c.s(22)]);
    this.fProofs.setContent(Tex.rows([
      "&\\text{connection: } D\\bar X\\ \\text{obeys (i)–(iii)},\\ \\mathrm{Proj}\\ \\text{linear}",
      "&\\text{Leibniz: } (Xf)\\,Y\\ \\text{already tangent}",
      `&${Tex.color(Palette.green, "\\text{compatible}")}`,
      "&X\\langle Y,Z\\rangle=\\langle D\\bar Y[X],Z\\rangle+\\langle Y,D\\bar Z[X]\\rangle",
      "&Z\\ \\text{tangent}\\Rightarrow\\langle D\\bar Y[X],Z\\rangle=\\langle\\nabla_XY,Z\\rangle\\ \\ \\checkmark",
      `&${Tex.color(Palette.green, "\\text{torsion-free}")}:\\ \\nabla_XY-\\nabla_YX=\\mathrm{Proj}\\big(D\\bar Y[X]-D\\bar X[Y]\\big)`,
      "&D\\bar Y[X]-D\\bar X[Y]=[\\bar X,\\bar Y]:\\ \\text{tangent?}",
      "&M=\\{h=0\\}:\\ \\ Dh(x)[Y(x)]=0\\ \\text{on } M",
      `&\\text{along } X:\\ ${Tex.color(Palette.yellow, "D^2h[X,Y]")}+Dh\\big[D\\bar Y[X]\\big]=0`,
      `&\\text{swap, subtract:}\\ ${Tex.color(Palette.yellow, "D^2h\\ \\text{symmetric}")}`,
      "&Dh\\big[D\\bar Y[X]-D\\bar X[Y]\\big]=0\\ \\Rightarrow\\ \\text{tangent}\\ \\ \\checkmark",
      `&${Tex.color(Palette.yellow, "\\text{uniqueness}\\Rightarrow\\text{the Levi-Civita connection of } M")}`,
      `&${Tex.color(Palette.muted, "\\text{another metric on } M\\ \\text{may give another connection}")}`,
    ], pr, "aligned"));
    this.fProofs.set({ opacity: (pr > 0 ? 1 : 0) * (1 - c.p(23, 0.5)) });

    // ---- the rotation field (s23–s31)
    this.equator.setOpacity(exO * c.p(26, 0.5) * (1 - c.p(28, 0.5)));
    const thDeg = t < c.s(28) ? 90 : lerp(90, 42, c.over(28, 0.05, 0.9));
    const th = thDeg * DEG;
    const xp = latitudePoint(th, 40 * DEG);
    const amb = rot(rot(xp));
    const tan = proj(xp, amb);
    const lat: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) lat.push(latitudePoint(th, (2 * Math.PI * i) / 160).multiplyScalar(1.006));
    this.latLine.setPoints(lat);
    this.latLine.setOpacity(exO * c.p(28, 0.5));
    const KE = 1.1;
    const showEx = exO * c.p(26, 0.5);
    this.exDot.setPosition(xp.clone().multiplyScalar(1.01));
    this.exDot.setOpacity(showEx);
    this.exVel.set(xp, xp.clone().addScaledVector(rot(xp), 0.5));
    this.exVel.setOpacity(showEx);
    this.exAmb.set(xp, xp.clone().addScaledVector(amb, KE * 0.55));
    this.exAmb.setOpacity(showEx);
    const tipT = xp.clone().addScaledVector(tan, KE);
    this.exTan.set(xp, tan.length() < 1e-3 ? xp.clone().addScaledVector(tan, 1).add(new THREE.Vector3(1e-4, 0, 0)) : tipT);
    this.exTan.setOpacity(showEx * c.p(27, 0.5) * (tan.length() > 0.02 ? 1 : 0));
    this.exNorm.setPoints([tipT, xp.clone().addScaledVector(amb, KE * 0.55)]);
    this.exNorm.setOpacity(0);
    const lp = this.stage.project(xp.clone().addScaledVector(tan, KE));
    this.lEx.setContent(`\\theta=${thDeg.toFixed(0)}^\\circ:\\ |\\nabla_VV|=\\sin\\theta\\cos\\theta=${(Math.sin(th) * Math.cos(th)).toFixed(3)}`);
    this.lEx.set({ x: lp.x + 18, y: lp.y - 24, opacity: showEx * c.p(27, 0.5) });
    const ex = Tex.count(t, [c.s(23), c.s(24), c.s(25), c.s(26), c.s(27), c.s(28), c.s(29), c.s(30), c.s(31)]);
    this.fExample.setContent(Tex.rows([
      `&${Tex.color(Palette.blue, "V(x)=e_3\\times x")}`,
      "&\\bar V\\ \\text{same formula:}\\ D\\bar V(x)[u]=e_3\\times u",
      `&${Tex.color(Palette.yellow, "\\nabla_uV=\\mathrm{Proj}_x(e_3\\times u)")}`,
      `&\\text{equator: } ${Tex.color(Palette.red, "e_3\\times V(x)=-x")}\\ \\text{(normal)}`,
      `&${Tex.color(Palette.green, "\\nabla_VV=0\\ \\text{on the equator}")}`,
      "&\\text{latitude } \\theta:\\ e_3\\times V(x)=-(x_1,x_2,0)",
      `&${Tex.color(Palette.yellow, "\\text{tangent part: } \\sin\\theta\\cos\\theta,\\ \\text{toward the pole}")}`,
      `&\\text{circle: }\\ddot\\gamma=-\\gamma\\ \\text{normal}\\Rightarrow\\mathrm{Proj}=0\\ \\checkmark`,
      `&${Tex.color(Palette.teal, "\\text{next: differentiate a curve's velocity}")}`,
    ], ex, "aligned"));
    this.fExample.set({ opacity: ex > 0 ? 1 : 0 });

    this.ledger.update(t, 1 - c.p(23, 0.5), true);
  }

  teardown(_layers: SceneLayers): void {}
}
