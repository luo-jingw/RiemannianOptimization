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
import { LevelStack } from "./lib/LevelStack";
import { blendView, setOrbitView, type OrbitView } from "./lib/SphereCamera";
import { E3, X0, heightGrad, lift, spherePoint, tangentFrame } from "./lib/sphereMath";

/**
 * E06 c06 — Riemannian metric (smooth field of tangent inner products), Riemannian manifold,
 * Riemannian gradient grad f(x) = (df_x)^♯ (existence and uniqueness from Riesz), the sphere example
 * grad f(x) = a − (aᵀx)x for f(x) = aᵀx, the gradient field of f = x₃, and why ∇f̄ is not the answer.
 * Embedded metric g_x(u, v) = uᵀv on S²: unit vectors form ordinary circles in each tangent plane.
 * Sentence indices refer to content/episodes/e06-gradient-retraction/story.en.json, scene c06-riemannian-metric-gradient.
 */

const AMBER = "#f2b14c";
const RX = 1060;
const RULER_R = 0.2;
const RULER_POINTS: [number, number][] = [[35, -35], [62, 20], [85, -25], [105, 35], [58, 65], [118, -10]];
const VIEW_MAIN: OrbitView = { azDeg: 8, elDeg: 20, distance: 6.2, fovDeg: 36, center: new THREE.Vector3(0, 0, 0.05), shift: 1.85, lift: -0.1 };
const VIEW_SIDE: OrbitView = { azDeg: -40, elDeg: 15, distance: 6.4, fovDeg: 36, center: new THREE.Vector3(0, 0, 0.1), shift: 2.3, lift: -0.15 };
const SCALE = 0.8;

function tc(color: string, body: string): string {
  return `\\textcolor{${color}}{${body}}`;
}

function circleAt(p: THREE.Vector3, r: number, squashEast = 1): THREE.Vector3[] {
  const { east, north } = tangentFrame(p);
  const q = lift(p, 1.0).multiplyScalar(1.012);
  return sampleCurve((a) => q.clone().addScaledVector(east, r * squashEast * Math.cos(a)).addScaledVector(north, r * Math.sin(a)), 0, 2 * Math.PI, 64);
}

export class MetricGradientScene implements Scene {
  readonly id = "c06-riemannian-metric-gradient";
  private stage!: StageLayer;

  private sphere!: HeightSphere;
  private rulers: Polyline[] = [];
  private rulerDots: Dot[] = [];
  private mover!: Polyline;
  private moverDot!: Dot;
  private gLabel!: WorldLabel;

  private plane!: TangentPlane;
  private xDot!: Dot;
  private xLabel!: WorldLabel;
  private dfStack!: LevelStack;
  private gradArrow!: Arrow;
  private gradLabel!: WorldLabel;
  private e3Arrow!: Arrow;
  private e3Label!: WorldLabel;
  private normalLine!: Polyline;
  private normalLabel!: WorldLabel;

  private field: { arrow: Arrow; base: THREE.Vector3 }[] = [];
  private poleN!: WorldLabel;
  private poleS!: WorldLabel;

  private bar2Arrow!: Arrow;
  private bar2Label!: WorldLabel;
  private drop1!: Polyline;

  private fMetric!: FormulaHandle;
  private fSmooth!: FormulaHandle;
  private fJump!: FormulaHandle;
  private fManifold!: FormulaHandle;
  private fEmbedded!: FormulaHandle;
  private fOn!: FormulaHandle;
  private fDef!: FormulaHandle;
  private fSharp!: FormulaHandle;
  private fExist!: FormulaHandle;
  private fExample!: FormulaHandle;
  private fChecks!: FormulaHandle;
  private fResult!: FormulaHandle;
  private fPoles!: FormulaHandle;
  private fEuclid!: FormulaHandle;

  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    this.sphere = new HeightSphere(stage);
    for (const [pol, az] of RULER_POINTS) {
      const p = spherePoint(pol, az);
      this.rulers.push(new Polyline(stage, circleAt(p, RULER_R), { color: Palette.green, width: 3 }));
      this.rulerDots.push(new Dot(stage, lift(p, 1.01), Palette.green, 0.02, "3d"));
    }
    this.mover = new Polyline(stage, circleAt(X0, RULER_R), { color: Palette.yellow, width: 3.5 });
    this.moverDot = new Dot(stage, X0, Palette.yellow, 0.025, "3d");
    this.gLabel = new WorldLabel(stage, fl, { tex: "g_x", size: 32, color: Palette.yellow, align: "left" }, X0, { x: 24, y: -24 });

    this.plane = new TangentPlane(stage, Palette.green, 0.7);
    this.plane.place(X0, X0);
    this.xDot = new Dot(stage, X0, Palette.orange, 0.032, "3d");
    this.xLabel = new WorldLabel(stage, fl, { tex: "x", size: 34, color: Palette.orange }, X0, { x: 6, y: 28 });
    const { east, north } = tangentFrame(X0);
    this.dfStack = new LevelStack(stage, (q) => X0.clone().addScaledVector(east, q.x).addScaledVector(north, q.y).multiplyScalar(1.0), 0.66, AMBER, { width: 2.5 });
    const g = heightGrad(X0).multiplyScalar(SCALE);
    this.gradArrow = new Arrow(stage, X0, X0.clone().add(g), "#ffffff", { mode: "3d", width: 6, headLength: 0.1 });
    this.gradLabel = new WorldLabel(stage, fl, { tex: "\\operatorname{grad}f(x)", size: 32, color: "#ffffff", align: "right" }, X0.clone().add(g), { x: -14, y: -10 });
    this.e3Arrow = new Arrow(stage, X0, X0.clone().addScaledVector(E3, SCALE), Palette.red, { mode: "3d", width: 5, headLength: 0.1 });
    this.e3Label = new WorldLabel(stage, fl, { tex: "e_3=\\nabla\\bar f_1", size: 30, color: Palette.red, align: "left" }, X0.clone().addScaledVector(E3, SCALE), { x: 12, y: -8 });
    this.normalLine = new Polyline(stage, [X0.clone().add(g), X0.clone().addScaledVector(E3, SCALE)], { color: Palette.red, width: 2.5, dashed: true, dashSize: 0.04, gapSize: 0.03 });
    this.normalLabel = new WorldLabel(stage, fl, { tex: "x_3\\,x", size: 30, color: Palette.red, align: "left" }, X0.clone().add(g).lerp(X0.clone().addScaledVector(E3, SCALE), 0.5), { x: 10, y: 0 });

    // gradient field on a latitude/longitude grid (front hemisphere is what the camera sees)
    for (let pol = 20; pol <= 160; pol += 20) {
      for (let az = -90; az <= 90; az += 30) {
        const base = spherePoint(pol, az);
        const gg = heightGrad(base).multiplyScalar(0.28);
        this.field.push({ arrow: new Arrow(stage, lift(base, 1.01), lift(base, 1.01).add(gg), "#ffffff", { mode: "3d", width: 3, headLength: 0.06 }), base });
      }
    }
    this.poleN = new WorldLabel(stage, fl, { tex: "\\operatorname{grad}f=0", size: 28, color: Palette.yellow, align: "left" }, new THREE.Vector3(0, 0, 1.02), { x: 14, y: -14 });
    this.poleS = new WorldLabel(stage, fl, { tex: "\\operatorname{grad}f=0", size: 28, color: Palette.yellow, align: "left" }, new THREE.Vector3(0, 0, -1.02), { x: 14, y: 14 });

    const dir2 = E3.clone().addScaledVector(X0, 10).normalize();
    this.bar2Arrow = new Arrow(stage, X0, X0.clone().addScaledVector(dir2, 1.1), Palette.red, { mode: "3d", width: 5, headLength: 0.1 });
    this.bar2Label = new WorldLabel(stage, fl, { tex: "e_3+10x\\ \\ (\\text{truncated})", size: 28, color: Palette.red, align: "left" }, X0.clone().addScaledVector(dir2, 1.1), { x: 12, y: -6 });
    this.drop1 = new Polyline(stage, [X0.clone().add(g), X0.clone().add(g).addScaledVector(X0, 1.6)], { color: Palette.red, width: 2, dashed: true, dashSize: 0.05, gapSize: 0.04 });

    // formulas
    this.fMetric = fl.add({ tex: "x\\mapsto g_x:\\ T_xM\\times T_xM\\to\\mathbb{R}\\ \\ \\text{inner product}", x: RX, y: 120, size: 32 });
    this.fSmooth = fl.add({ tex: "U,V\\ \\text{smooth fields}\\ \\Rightarrow\\ x\\mapsto g_x(U(x),V(x))\\ \\text{smooth}", x: RX, y: 180, size: 28 });
    this.fJump = fl.add({ text: "no jumping rulers: otherwise grad f would jump", x: RX, y: 230, size: 26, color: Palette.red });
    this.fManifold = fl.add({ tex: "(M,g):\\ \\text{Riemannian manifold}", x: RX, y: 290, size: 32, color: Palette.yellow });
    this.fEmbedded = fl.add({ tex: "\\begin{gathered}M\\subseteq\\mathbb{R}^n:\\ g_x(u,v)=u^\\top v\\\\ u^\\top u=\\|u\\|^2>0\\ (u\\neq0)\\end{gathered}", x: RX, y: 400, size: 30, display: true });
    this.fOn = fl.add({ tex: "O(n):\\ g_R(H,K)=\\operatorname{tr}(H^\\top K)", x: RX, y: 510, size: 30 });
    this.fDef = fl.add({ tex: "\\begin{gathered}\\operatorname{grad}f(x)\\in T_xM\\ \\text{unique with}\\\\ df_x[v]=g_x(\\operatorname{grad}f(x),\\,v)\\quad\\forall v\\in T_xM\\end{gathered}", x: RX, y: 160, size: 32, display: true, boxed: true });
    this.fSharp = fl.add({ tex: `\\operatorname{grad}f(x)=${tc(Palette.yellow, "(df_x)^\\sharp")}`, x: RX, y: 290, size: 36 });
    this.fExist = fl.add({ tex: "", x: RX, y: 430, size: 28, display: true });
    this.fExample = fl.add({ tex: "f(x)=a^\\top x:\\quad df_x[v]=a^\\top v,\\qquad u:=a-(a^\\top x)\\,x", x: RX, y: 120, size: 30 });
    this.fChecks = fl.add({ tex: "", x: RX, y: 260, size: 28, display: true });
    this.fResult = fl.add({ tex: `${tc(Palette.yellow, "\\operatorname{grad}f(x)=a-(a^\\top x)\\,x")}\\qquad a=e_3:\\ e_3-x_3\\,x`, x: RX, y: 400, size: 30 });
    this.fPoles = fl.add({ tex: "x=\\pm e_3:\\ \\ e_3-(\\pm1)(\\pm e_3)=0", x: RX, y: 500, size: 30 });
    this.fEuclid = fl.add({ tex: "\\begin{gathered}\\nabla\\bar f_1=e_3,\\quad \\nabla\\bar f_2=e_3+10x\\\\ \\text{both project to } \\operatorname{grad}f(x)\\in T_xM\\end{gathered}", x: RX, y: 560, size: 30, display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "x\\mapsto g_x\\ \\text{smooth inner products}", at: cue.s(2) + 1.0 },
      { label: "2", tex: "g_x(u,v)=u^\\top v\\ \\ \\text{(embedded)}", at: cue.s(6) + 1.0 },
      { label: "3", tex: "\\exists!\\ \\operatorname{grad}f(x)=(df_x)^\\sharp", at: cue.s(17) + 2.0 },
      { label: "4", tex: "S^2:\\ \\operatorname{grad}f=a-(a^\\top x)x", at: cue.s(23) + 2.0 },
      { label: "5", tex: "\\operatorname{grad}f\\in T_xM,\\ \\text{no extension}", at: cue.s(33) + 1.5 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    setOrbitView(this.stage, blendView(VIEW_MAIN, VIEW_SIDE, c.p(24, 1.2) * (1 - c.p(26, 1.2)) + c.p(29, 1.2)));
    this.sphere.setOpacity(c.p(0, 0.8, -0.6));

    // ---- rulers (s0–s9)
    const rulers = c.p(0, 0.6) * (1 - c.p(10, 0.6));
    this.rulers.forEach((r, i) => r.setOpacity(rulers * c.p(0, 0.4, 0.35 * i)));
    this.rulerDots.forEach((d, i) => d.setOpacity(rulers * c.p(0, 0.4, 0.35 * i)));
    // moving ruler: follows a path; during s3 it jumps to a squashed (red) ruler halfway along
    const pathS = c.over(1, 0.05, 0.95);
    const pol = lerp(75, 40, pathS);
    const az = lerp(-45, 45, pathS);
    const p = spherePoint(pol, az);
    const jumpPhase = t >= c.s(3) && t < c.s(4);
    const jumpS = c.over(3, 0.05, 0.95);
    const pj = spherePoint(lerp(40, 75, jumpS), lerp(45, -45, jumpS));
    const jumped = jumpPhase && jumpS > 0.5;
    const where = jumpPhase ? pj : p;
    this.mover.setPoints(circleAt(where, RULER_R, jumped ? 0.45 : 1));
    this.mover.setColor(jumped ? Palette.red : Palette.yellow);
    const moverO = c.p(1, 0.5) * (1 - c.p(10, 0.6));
    this.mover.setOpacity(moverO);
    this.moverDot.setPosition(lift(where, 1.01));
    this.moverDot.setColor(jumped ? Palette.red : Palette.yellow);
    this.moverDot.setOpacity(moverO);
    this.gLabel.setAnchor(lift(where, 1.01));
    this.gLabel.update(moverO * (jumpPhase ? 0 : 1));

    // ---- tangent plane, df stack collapsing into grad (s10–s13)
    const atX = c.p(10, 0.6) * (1 - c.p(26, 0.6)) + c.p(29, 0.6);
    this.plane.setOpacity(Math.min(1, atX));
    this.xDot.setOpacity(Math.min(1, atX));
    this.xLabel.update(Math.min(1, atX));
    const collapse = c.over(13, 0.1, 0.8);
    const stackO = c.p(12, 0.6) * (1 - collapse);
    const dfN = new THREE.Vector2(0, Math.sin((50 * Math.PI) / 180));
    this.dfStack.update(dfN, 0.15, () => stackO);
    const gradVis = (t >= c.s(13) ? Math.max(collapse, 0) : 0) * (1 - c.p(18, 0.5)) + c.p(25, 0.6) * (1 - c.p(26, 0.6)) + c.p(29, 0.6);
    const gScale = t < c.s(18) ? collapse : 1;
    const g = heightGrad(X0).multiplyScalar(SCALE * Math.max(gScale, 0.001));
    this.gradArrow.set(X0, X0.clone().add(g));
    this.gradArrow.setOpacity(Math.min(1, gradVis));
    this.gradLabel.setAnchor(X0.clone().add(g));
    this.gradLabel.update(Math.min(1, gradVis) * (t >= c.s(13) ? 1 : 0));
    const e3Vis = c.p(24, 0.6) * (1 - c.p(26, 0.6)) + c.p(30, 0.6);
    this.e3Arrow.setOpacity(Math.min(1, e3Vis));
    this.e3Label.update(Math.min(1, e3Vis));
    const split = c.p(25, 0.6) * (1 - c.p(26, 0.6));
    this.normalLine.setOpacity(split);
    this.normalLabel.update(split);

    // ---- gradient field (s26–s28)
    const fieldO = c.p(26, 0.8) * (1 - c.p(29, 0.6));
    this.field.forEach((f, i) => f.arrow.setOpacity(fieldO * c.p(26, 0.5, 0.02 * i)));
    this.poleN.update(c.p(27, 0.6) * (1 - c.p(29, 0.6)));
    this.poleS.update(0);

    // ---- Euclidean gradients (s29–s33)
    const bar2 = c.p(30, 0.6, 1.0);
    this.bar2Arrow.setOpacity(bar2);
    this.bar2Label.update(bar2);
    this.drop1.setOpacity(c.p(32, 0.6));

    // ---- formulas
    const metric = 1 - c.p(10, 0.5);
    this.fMetric.set({ opacity: c.p(1, 0.6) * metric });
    this.fSmooth.set({ opacity: c.p(2, 0.6) * metric });
    this.fJump.set({ opacity: c.p(3, 0.6) * metric });
    this.fManifold.set({ opacity: c.p(4, 0.6) * metric });
    this.fEmbedded.set({ opacity: c.p(5, 0.6) * metric });
    this.fOn.set({ opacity: c.p(8, 0.6) * metric });
    const defO = c.p(11, 0.6) * (1 - c.p(18, 0.5));
    this.fDef.set({ opacity: defO });
    this.fSharp.set({ opacity: c.p(13, 0.6) * (1 - c.p(18, 0.5)) });
    const ex = t >= c.s(17) ? 3 : t >= c.s(16) ? 2 : t >= c.s(15) ? 1 : 0;
    const exRows = [
      "\\dim T_xM=n-k<\\infty",
      "g_x\\ \\text{inner product},\\quad df_x\\in(T_xM)^*",
      `\\overset{\\text{Riesz}}{\\Longrightarrow}\\ \\exists!\\,u\\in T_xM:\\ df_x=g_x(u,\\cdot)`,
    ];
    this.fExist.setContent(`\\begin{gathered}${exRows.map((r, i) => (i < ex ? r : `\\phantom{${r}}`)).join("\\\\ ")}\\end{gathered}`);
    this.fExist.set({ opacity: (ex > 0 ? 1 : 0) * (1 - c.p(18, 0.5)) });
    const exO = c.p(19, 0.6) * (1 - c.p(26, 0.5));
    this.fExample.set({ opacity: exO });
    const ck = t >= c.s(22) ? 2 : t >= c.s(21) ? 1 : 0;
    const ckRows = [
      `x^\\top u=x^\\top a-(a^\\top x)(x^\\top x)=0\\ \\ ${tc(Palette.green, "\\checkmark")}`,
      `u^\\top v=a^\\top v-(a^\\top x)(x^\\top v)=a^\\top v\\ \\ (v\\perp x)\\ \\ ${tc(Palette.green, "\\checkmark")}`,
    ];
    this.fChecks.setContent(`\\begin{gathered}${ckRows.map((r, i) => (i < ck ? r : `\\phantom{${r}}`)).join("\\\\ ")}\\end{gathered}`);
    this.fChecks.set({ opacity: (ck > 0 ? 1 : 0) * (1 - c.p(26, 0.5)) });
    this.fResult.set({ opacity: c.p(23, 0.6) * (1 - c.p(29, 0.5)) });
    this.fPoles.set({ opacity: c.p(27, 0.6) * (1 - c.p(29, 0.5)) });
    this.fEuclid.set({ opacity: c.p(30, 0.6) });

    this.ledger.update(t, c.p(2, 0.5, 1.0), true);
  }

  teardown(_layers: SceneLayers): void {}
}
