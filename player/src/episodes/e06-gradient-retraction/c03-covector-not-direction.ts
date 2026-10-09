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
import { Polyline, circlePoints } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { TangentPlane } from "../../primitives/TangentPlane";
import { WorldLabel } from "../../primitives/WorldLabel";
import { HeightSphere } from "./lib/HeightSphere";
import { LevelStack } from "./lib/LevelStack";
import { MiniPlot } from "./lib/MiniPlot";
import { setOrbitView } from "./lib/SphereCamera";
import type { SvgPath } from "./lib/SvgOverlay";
import { SvgOverlay } from "./lib/SvgOverlay";
import { E3, X0, tangentFrame } from "./lib/sphereMath";

/**
 * E06 c03 — df_x is a covector: the dual space, its picture as a stack of level lines, the dual basis
 * and dim V* = dim V; a stack of lines does not single out an arrow.
 * s0: the sphere and T_xS²; from s1 the tangent plane is laid flat (2D view, coordinates east/north).
 * Height function at x: df_x[v] = e₃ᵀv = sin 50° · v_north. Example covector ℓ(v) = 2v₁ + v₂.
 * Sentence indices refer to content/episodes/e06-gradient-retraction/story.en.json, scene c03-covector-not-direction.
 */

const AMBER = "#f2b14c";
const R_DISC = 2.3;
const ELL = new THREE.Vector2(2, 1);
const V_EX = new THREE.Vector2(1.5, 1.0);            // ℓ(V_EX) = 4
const DF_N = new THREE.Vector2(0, Math.sin((50 * Math.PI) / 180));
const P = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(x, y, 0);
const P2 = (p: THREE.Vector2): THREE.Vector3 => new THREE.Vector3(p.x, p.y, 0);
const RX = 1075;

function tc(color: string, body: string): string {
  return `\\textcolor{${color}}{${body}}`;
}

export class CovectorScene implements Scene {
  readonly id = "c03-covector-not-direction";
  private stage!: StageLayer;

  private sphere!: HeightSphere;
  private plane3!: TangentPlane;
  private xDot!: Dot;
  private v3!: Arrow;
  private v3Label!: WorldLabel;

  private disc!: Polyline;
  private axes: Arrow[] = [];
  private axisLabels: FormulaHandle[] = [];
  private vArrow!: Arrow;
  private vLabel!: FormulaHandle;
  private dfReadout!: FormulaHandle;
  private svg!: SvgOverlay;
  private plot!: MiniPlot;
  private plotCurve!: SvgPath;
  private plotDot!: SvgPath;

  private ellStack!: LevelStack;
  private e1Stack!: LevelStack;
  private e2Stack!: LevelStack;
  private levelLabels: FormulaHandle[] = [];
  private countNote!: FormulaHandle;
  private e1Arrow!: Arrow;
  private e2Arrow!: Arrow;
  private e1Label!: FormulaHandle;
  private e2Label!: FormulaHandle;
  private stackLabel1!: FormulaHandle;
  private stackLabel2!: FormulaHandle;
  private candidates: Arrow[] = [];
  private qmarks: FormulaHandle[] = [];

  private fDual!: FormulaHandle;
  private fCov!: FormulaHandle;
  private fSpace!: FormulaHandle;
  private fDf!: FormulaHandle;
  private fEll!: FormulaHandle;
  private fBasis!: FormulaHandle;
  private fSpan!: FormulaHandle;
  private fIndep!: FormulaHandle;
  private fDim!: FormulaHandle;
  private fType!: FormulaHandle;
  private fNeed!: FormulaHandle;

  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    // 3D opening
    this.sphere = new HeightSphere(stage);
    this.plane3 = new TangentPlane(stage, Palette.green, 0.7);
    this.plane3.place(X0, X0);
    this.xDot = new Dot(stage, X0, Palette.orange, 0.032, "3d");
    const { east, north } = tangentFrame(X0);
    this.v3 = new Arrow(stage, X0, X0.clone().addScaledVector(north, 0.5), Palette.teal, { mode: "3d", width: 5, headLength: 0.1 });
    this.v3Label = new WorldLabel(stage, fl, { tex: "df_x[v]\\in\\mathbb{R}", size: 32, color: Palette.text, align: "left" }, X0, { x: 30, y: -10 });
    this.eastNorth = { east, north };

    // flat plane
    this.disc = new Polyline(stage, circlePoints(0, 0, R_DISC, 160), { color: Palette.green, width: 2.5 });
    this.axes = [
      new Arrow(stage, P(-R_DISC, 0), P(R_DISC + 0.25, 0), Palette.axis, { width: 2, headLength: 0.16 }),
      new Arrow(stage, P(0, -R_DISC), P(0, R_DISC + 0.25), Palette.axis, { width: 2, headLength: 0.16 }),
    ];
    this.axisLabels = [
      fl.add({ tex: "v_1", x: 0, y: 0, size: 30, color: Palette.muted, align: "left" }),
      fl.add({ tex: "v_2", x: 0, y: 0, size: 30, color: Palette.muted, valign: "bottom" }),
    ];
    this.ellStack = new LevelStack(stage, P2, R_DISC, AMBER, { width: 2.5 });
    this.e1Stack = new LevelStack(stage, P2, R_DISC, Palette.purple, { width: 2 });
    this.e2Stack = new LevelStack(stage, P2, R_DISC, Palette.purple, { width: 2 });
    for (let k = -1; k <= 4; k++) this.levelLabels.push(fl.add({ tex: `\\ell=${k}`, x: 0, y: 0, size: 26, color: AMBER, align: "left" }));
    this.vArrow = new Arrow(stage, P(0, 0), P(1, 0), Palette.teal, { width: 5, headLength: 0.2 });
    this.vLabel = fl.add({ tex: "v", x: 0, y: 0, size: 34, color: Palette.teal });
    this.dfReadout = fl.add({ tex: "", x: RX, y: 640, size: 36 });
    this.svg = new SvgOverlay(fl);
    this.plot = new MiniPlot(this.svg, fl, { x: 920, y: 330, w: 400, h: 200, xMin: 0, xMax: 2 * Math.PI, yMin: -1.4, yMax: 1.4,
      xLabel: "\\theta", yLabel: "df_x[v(\\theta)]" });
    this.plotCurve = this.plot.curve({ color: Palette.teal, width: 3 });
    this.plotDot = this.plot.curve({ color: Palette.orange, width: 10 });
    this.countNote = fl.add({ tex: "\\ell(v)=4=\\text{number of lines crossed}", x: RX, y: 640, size: 32, color: AMBER });
    this.e1Arrow = new Arrow(stage, P(0, 0), P(1, 0), Palette.teal, { width: 5, headLength: 0.2 });
    this.e2Arrow = new Arrow(stage, P(0, 0), P(0, 1), Palette.teal, { width: 5, headLength: 0.2 });
    this.e1Label = fl.add({ tex: "e_1", x: 0, y: 0, size: 32, color: Palette.teal });
    this.e2Label = fl.add({ tex: "e_2", x: 0, y: 0, size: 32, color: Palette.teal });
    this.stackLabel1 = fl.add({ tex: "e^1", x: 0, y: 0, size: 32, color: Palette.purple });
    this.stackLabel2 = fl.add({ tex: "e^2", x: 0, y: 0, size: 32, color: Palette.purple });
    for (const ang of [0, 0.62, -0.62]) {
      const dir = ELL.clone().normalize().rotateAround(new THREE.Vector2(0, 0), ang).multiplyScalar(1.7);
      this.candidates.push(new Arrow(stage, P(0, 0), P2(dir), ang === 0 ? "#ffffff" : Palette.red, { width: 4, headLength: 0.2 }));
      this.qmarks.push(fl.add({ tex: "?", x: 0, y: 0, size: 40, color: ang === 0 ? "#ffffff" : Palette.red }));
      this.candidateTips.push(P2(dir.clone().multiplyScalar(1.12)));
    }

    // formulas
    this.fDual = fl.add({ tex: "V^*=\\{\\ell:V\\to\\mathbb{R}\\ \\ \\text{linear}\\}", x: RX, y: 140, size: 40 });
    this.fCov = fl.add({ text: "linear functionals = covectors", x: RX, y: 205, size: 28, color: Palette.muted });
    this.fSpace = fl.add({ tex: "\\begin{gathered}(\\ell_1+\\ell_2)(v)=\\ell_1(v)+\\ell_2(v)\\\\ (\\alpha\\ell)(v)=\\alpha\\,\\ell(v)\\end{gathered}", x: RX, y: 285, size: 30, display: true });
    this.fDf = fl.add({ tex: "f:M\\to\\mathbb{R}\\ \\Rightarrow\\ df_x\\in(T_xM)^*", x: RX, y: 400, size: 36, color: Palette.yellow });
    this.fEll = fl.add({ tex: `\\ell(v)=${tc(AMBER, "2v_1+v_2")}`, x: RX, y: 140, size: 40 });
    this.fBasis = fl.add({ tex: "e^i(e_j)=\\delta_{ij}=\\begin{cases}1 & i=j\\\\ 0 & i\\neq j\\end{cases}", x: RX, y: 250, size: 32, display: true });
    this.fSpan = fl.add({ tex: "", x: RX, y: 400, size: 30, display: true });
    this.fIndep = fl.add({ tex: "\\textstyle\\sum_i c_i e^i=0\\ \\Rightarrow\\ \\big(\\sum_i c_ie^i\\big)(e_j)=c_j=0", x: RX, y: 560, size: 28 });
    this.fDim = fl.add({ tex: "\\begin{gathered}\\dim V^*=d=\\dim V\\\\ \\dim (T_xM)^*=n-k\\end{gathered}", x: RX, y: 660, size: 30, color: Palette.green, display: true });
    this.fType = fl.add({ tex: `x+df_x\\ \\ ${tc(Palette.red, "\\text{undefined: } df_x\\notin T_xM")}`, x: RX, y: 160, size: 34 });
    this.fNeed = fl.add({ tex: "\\text{perpendicular? unit length? }\\Rightarrow\\ \\text{needs an inner product}", x: 750, y: 828, size: 30, color: Palette.yellow });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "V^*=\\{\\ell:V\\to\\mathbb{R}\\ \\text{linear}\\}", at: cue.s(4) + 1.5 },
      { label: "2", tex: "df_x\\in(T_xM)^*", at: cue.s(7) + 1.5 },
      { label: "3", tex: "e^i(e_j)=\\delta_{ij}", at: cue.s(13) + 2.0 },
      { label: "4", tex: "\\ell=\\textstyle\\sum_j\\ell(e_j)\\,e^j", at: cue.s(17) + 2.0 },
      { label: "5", tex: "\\dim V^*=\\dim V", at: cue.s(20) + 1.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  private eastNorth!: { east: THREE.Vector3; north: THREE.Vector3 };
  private candidateTips: THREE.Vector3[] = [];

  private place(h: FormulaHandle, world: THREE.Vector3, dx: number, dy: number, opacity: number): void {
    const p = this.stage.project(world);
    h.set({ x: p.x + dx, y: p.y + dy, opacity });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const flatT = c.in(1, 0.25);
    const is3D = t < flatT;

    // ---- 3D opening (s0 – early s1)
    const open3 = c.p(0, 0.8, -0.6) * (1 - c.p(1, 0.6, -0.2));
    if (is3D) setOrbitView(this.stage, { azDeg: 8, elDeg: 20, distance: 6.2, fovDeg: 36, center: new THREE.Vector3(0, 0, 0.05), shift: 1.0, lift: -0.1 });
    else this.stage.setView2D(4.12, -0.6, 8.4);
    const o3 = is3D ? open3 : 0;
    this.sphere.setOpacity(o3);
    this.plane3.setOpacity(o3);
    this.xDot.setOpacity(o3);
    const ang0 = 0.9 * c.over(0, 0, 1);
    const v3 = this.eastNorth.north.clone().multiplyScalar(Math.cos(ang0)).addScaledVector(this.eastNorth.east, Math.sin(ang0)).multiplyScalar(0.5);
    this.v3.set(X0, X0.clone().add(v3));
    this.v3.setOpacity(o3);
    this.v3Label.handle.setContent(`df_x[v]=${E3.dot(v3).toFixed(2)}`);
    this.v3Label.setAnchor(X0.clone().add(v3));
    this.v3Label.update(o3 * c.p(0, 0.6, 1.0));

    // ---- flat plane
    const flat = is3D ? 0 : c.p(1, 0.6, 0.25 * (c.e(1) - c.s(1)));
    const planeVis = flat;
    this.disc.setOpacity(planeVis);
    this.axes.forEach((a) => a.setOpacity(planeVis * 0.9));
    if (!is3D) {
      this.place(this.axisLabels[0], P(R_DISC + 0.32, 0), 0, 0, planeVis);
      this.place(this.axisLabels[1], P(0, R_DISC + 0.3), 0, 0, planeVis);
    } else this.axisLabels.forEach((h) => h.set({ opacity: 0 }));

    // phase 1: rotating v and the df readout (s1–s7)
    const phase1 = flat * (1 - c.p(8, 0.6));
    const theta = 2 * Math.PI * c.over(1, 0.3, 1.0);
    const thetaHold = t >= c.e(1) ? 2 * Math.PI + 0.9 : theta;
    const vNow = new THREE.Vector2(Math.sin(thetaHold), Math.cos(thetaHold)).multiplyScalar(1.6);   // starts pointing north
    const dfNow = DF_N.dot(vNow);
    this.plot.setOpacity(phase1 * (1 - c.p(4, 0.6)));
    this.plot.plot(this.plotCurve, (th) => DF_N.dot(new THREE.Vector2(Math.sin(th), Math.cos(th)).multiplyScalar(1.6)), 0, Math.min(theta, 2 * Math.PI), 120);
    this.plotCurve.setOpacity(phase1 * (1 - c.p(4, 0.6)) * (theta > 0.01 ? 1 : 0));
    const thPlot = Math.min(theta, 2 * Math.PI);
    const pd = this.plot.px(thPlot, DF_N.dot(new THREE.Vector2(Math.sin(thPlot), Math.cos(thPlot)).multiplyScalar(1.6)));
    this.plotDot.setPoints([pd, { x: pd.x + 0.01, y: pd.y }]);
    this.plotDot.setOpacity(phase1 * (1 - c.p(4, 0.6)) * (theta > 0.01 && t < c.e(1) ? 1 : 0));

    // phase 2: covector stack ℓ = 2v₁ + v₂ (s8–s10), dual basis (s11–s21), not a direction (s22–)
    const stackIn = c.p(8, 0.8);
    const reveal = (k: number): number => {
      if (t < c.s(9)) return k === 0 ? stackIn : 0;
      const order = Math.abs(k) + (k < 0 ? 0.5 : 0);
      return Math.min(1, Math.max(0, (t - c.s(9)) / 0.35 - order));
    };
    const dualPhase = c.p(11, 0.6) * (1 - c.p(22, 0.6));
    const combine = c.p(18, 0.8) * (1 - c.p(19, 0.6));
    const ellDim = 1 - 0.85 * dualPhase * (1 - combine);
    const crossing = c.p(10, 0.5) * (1 - c.p(11, 0.5));
    this.ellStack.update(ELL, 1, (k) => flat * reveal(k) * ellDim * (crossing > 0.5 && (k < 1 || k > 4) ? 0.35 : 1));
    for (let i = 0; i < this.levelLabels.length; i++) {
      const k = i - 1;
      const foot = LevelStack.footPoint(ELL, 1, k);
      const along = new THREE.Vector2(-ELL.y, ELL.x).normalize().multiplyScalar(-Math.sqrt(Math.max(0, R_DISC * R_DISC - foot.lengthSq())) - 0.05);
      const show = k <= 2 ? c.p(9, 0.5, 0.35 * Math.abs(k) + 0.2) : 0;
      if (!is3D) this.place(this.levelLabels[i], P2(foot.clone().add(along)), 6, 14, flat * show * ellDim * (1 - c.p(11, 0.5)));
      else this.levelLabels[i].set({ opacity: 0 });
    }
    // v: rotating in phase 1, the example v in phase 2
    const vEx = c.p(10, 0.6) * (1 - c.p(11, 0.5));
    const vShown = t < c.s(8) ? vNow : V_EX;
    const vOpacity = t < c.s(8) ? phase1 : flat * vEx;
    this.vArrow.set(P(0, 0), P2(vShown));
    this.vArrow.setOpacity(vOpacity);
    if (!is3D) this.place(this.vLabel, P2(vShown.clone().multiplyScalar(1.12)), 0, 0, vOpacity);
    else this.vLabel.set({ opacity: 0 });
    this.dfReadout.setContent(`df_x[v]=${dfNow >= 0 ? "\\phantom{-}" : ""}${dfNow.toFixed(2)}`);
    this.dfReadout.set({ opacity: phase1 * (1 - c.p(3, 0.6)) });
    this.countNote.set({ opacity: crossing });

    const e1 = c.p(12, 0.6) * (1 - c.p(22, 0.6));
    this.e1Arrow.setOpacity(flat * e1);
    this.e2Arrow.setOpacity(flat * e1);
    if (!is3D) {
      this.place(this.e1Label, P(1.0, -0.28), 0, 0, flat * e1);
      this.place(this.e2Label, P(-0.3, 1.0), 0, 0, flat * e1);
    } else {
      this.e1Label.set({ opacity: 0 });
      this.e2Label.set({ opacity: 0 });
    }
    const stacks = c.p(15, 0.6) * (1 - c.p(22, 0.6));
    const stackO = (1 - 0.6 * combine) * stacks * flat;
    this.e1Stack.update(new THREE.Vector2(1, 0), 1, () => stackO * 0.9);
    this.e2Stack.update(new THREE.Vector2(0, 1), 1, () => stackO * 0.9 * c.p(15, 0.6, 1.2));
    if (!is3D) {
      this.place(this.stackLabel1, P(1, -R_DISC * 0.92), 16, 0, stackO);
      this.place(this.stackLabel2, P(-R_DISC * 0.92, 1), 0, -16, stackO * c.p(15, 0.6, 1.2));
    } else {
      this.stackLabel1.set({ opacity: 0 });
      this.stackLabel2.set({ opacity: 0 });
    }

    const cand = c.p(24, 0.6) * flat;
    const blink = t >= c.s(24) ? 0.6 + 0.4 * Math.cos((t - c.s(24)) * 2 * Math.PI / 1.1) : 1;
    this.candidates.forEach((a, i) => a.setOpacity(cand * blink * (i === 0 ? 1 : c.p(24, 0.5, 0.4))));
    this.qmarks.forEach((q, i) => {
      if (!is3D) this.place(q, this.candidateTips[i], 0, 0, cand * (i === 0 ? 1 : c.p(24, 0.5, 0.4)));
      else q.set({ opacity: 0 });
    });

    // ---- formulas
    const defs = c.p(4, 0.6) * (1 - c.p(8, 0.6));
    this.fDual.set({ opacity: defs });
    this.fCov.set({ opacity: c.p(5, 0.6) * (1 - c.p(8, 0.6)) });
    this.fSpace.set({ opacity: c.p(6, 0.6) * (1 - c.p(8, 0.6)) });
    this.fDf.set({ opacity: c.p(7, 0.6) * (1 - c.p(8, 0.6)) });
    this.fEll.set({ opacity: c.p(8, 0.6) * (1 - c.p(12, 0.6)) });
    this.fBasis.set({ opacity: c.p(13, 0.6) * (1 - c.p(22, 0.6)) });
    const spanState = t >= c.s(18) ? 3 : t >= c.s(17) ? 2 : t >= c.s(16) ? 1 : 0;
    const spanParts = [
      "\\ell(v)=\\textstyle\\sum_j v_j\\,\\ell(e_j)",
      "=\\textstyle\\sum_j \\ell(e_j)\\,e^j(v)",
      `\\quad\\Rightarrow\\quad ${tc(AMBER, "\\ell=2e^1+e^2")}`,
    ];
    this.fSpan.setContent(`\\begin{gathered}${spanParts[0]}${spanState >= 2 ? spanParts[1] : `\\phantom{${spanParts[1]}}`}\\\\ ${spanState >= 3 ? spanParts[2] : `\\phantom{${spanParts[2]}}`}\\end{gathered}`);
    this.fSpan.set({ opacity: (spanState > 0 ? 1 : 0) * (1 - c.p(22, 0.6)) });
    this.fIndep.set({ opacity: c.p(19, 0.6) * (1 - c.p(22, 0.6)) });
    this.fDim.set({ opacity: c.p(20, 0.6) * (1 - c.p(22, 0.6)) });
    this.fType.set({ opacity: c.p(23, 0.6) });
    this.fNeed.set({ opacity: c.p(25, 0.6) });

    this.ledger.update(t, c.p(4, 0.5, 1.0), true);
  }

  teardown(_layers: SceneLayers): void {}
}
