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
import { Polyline, sampleCurve } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { WorldLabel } from "../../primitives/WorldLabel";
import { MiniPlot } from "../e06-gradient-retraction/lib/MiniPlot";
import { setOrbitView } from "../e06-gradient-retraction/lib/SphereCamera";
import type { SvgDot, SvgPath } from "../e06-gradient-retraction/lib/SvgOverlay";
import { SvgOverlay } from "../e06-gradient-retraction/lib/SvgOverlay";
import { PullbackPlane } from "./lib/PullbackPlane";
import { RayleighSphere } from "./lib/RayleighSphere";
import { lift, rayleigh, rayleighGrad, retract, spherePoint, tangentFrame } from "./lib/rayleigh";
import { Tex } from "./lib/tex";

/**
 * E07 c02 — first-order Taylor expansion along curves (Boumal §4.1, (4.2)–(4.5), Ex. 4.3): g(t) = f(c(t)) and its
 * tangent line, the retraction curve, the O(t²) gap, the pullback f∘R_x colored on the tangent plane, its gradient at
 * 0, the speed-doubling counterexample, and the mean value form.
 * Sentence indices refer to content/episodes/e07-gradient-descent/story.en.json, scene c02-taylor-on-curves.
 */

const X = spherePoint(50, 30);
const T_MAX = 0.6;
const PANEL = { x: 800, y: 430, w: 480, h: 270 };

/** A curve through X with velocity v but its own second-order bend: (x + tv + t²w)/‖x + tv + t²w‖. */
function bentCurve(v: THREE.Vector3, w: THREE.Vector3, t: number): THREE.Vector3 {
  return X.clone().addScaledVector(v, t).addScaledVector(w, t * t).normalize();
}

export class TaylorOnCurvesScene implements Scene {
  readonly id = "c02-taylor-on-curves";
  private stage!: StageLayer;

  private sphere!: RayleighSphere;
  private xDot!: Dot;
  private xLabel!: WorldLabel;
  private vArrow!: Arrow;
  private vLabel!: WorldLabel;
  private bent!: Polyline;
  private retr!: Polyline;
  private doubled!: Polyline;
  private mover!: Dot;
  private plane!: PullbackPlane;
  private links: Polyline[] = [];
  private yDot!: Dot;
  private yLabel!: WorldLabel;
  private w = new THREE.Vector3();
  private v = new THREE.Vector3();

  private svg!: SvgOverlay;
  private plot!: MiniPlot;
  private gCurve!: SvgPath;
  private tangent!: SvgPath;
  private gDouble!: SvgPath;
  private secant!: SvgPath;
  private parallel!: SvgPath;
  private plotDot!: SvgDot;
  private mvPlot!: MiniPlot;
  private mvCurve!: SvgPath;

  private fG!: FormulaHandle;
  private fChain!: FormulaHandle;
  private fTaylor!: FormulaHandle;
  private fRatio!: FormulaHandle;
  private fPull!: FormulaHandle;
  private fProof!: FormulaHandle;
  private fSlopes!: FormulaHandle;
  private fMv!: FormulaHandle;
  private fCaveat!: FormulaHandle;

  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);
    const { east, north } = tangentFrame(X);
    this.v = rayleighGrad(X).multiplyScalar(-1);
    this.w = east.clone().multiplyScalar(1.4).addScaledVector(north, -0.6);

    this.sphere = new RayleighSphere(stage);
    this.xDot = new Dot(stage, lift(X, 1.01), Palette.orange, 0.032, "3d");
    this.xLabel = new WorldLabel(stage, fl, { tex: "x", size: 34, color: Palette.orange }, X, { x: -20, y: 12 });
    this.vArrow = new Arrow(stage, X, X.clone().addScaledVector(this.v, 0.45), Palette.teal, { mode: "3d", width: 5, headLength: 0.08 });
    this.vLabel = new WorldLabel(stage, fl, { tex: "v", size: 30, color: Palette.teal }, X.clone().addScaledVector(this.v, 0.5), { x: 12, y: -8 });
    this.bent = new Polyline(stage, sampleCurve((t) => lift(bentCurve(this.v, this.w, t)), 0, T_MAX, 60), { color: Palette.blue, width: 3.5 });
    this.retr = new Polyline(stage, sampleCurve((t) => lift(retract(X, this.v.clone().multiplyScalar(t))), 0, 1, 60), { color: "#ffffff", width: 3.5 });
    this.doubled = new Polyline(stage, sampleCurve((t) => lift(retract(X, this.v.clone().multiplyScalar(2 * t))), 0, T_MAX, 60), { color: Palette.purple, width: 3 });
    this.mover = new Dot(stage, X, Palette.orange, 0.026, "3d");
    this.plane = new PullbackPlane(stage, X, 0.75);
    for (const [a, b] of [[0.55, 0.3], [-0.5, 0.5], [0.4, -0.6], [-0.65, -0.35]]) {
      const s = east.clone().multiplyScalar(a).addScaledVector(north, b);
      this.links.push(new Polyline(stage, [X.clone().add(s), lift(retract(X, s), 1.008)], { color: "#d0d6e6", width: 1.5, dashed: true, dashSize: 0.03, gapSize: 0.03 }));
    }
    const y = retract(X, this.v.clone().multiplyScalar(1));
    this.yDot = new Dot(stage, lift(y, 1.01), Palette.purple, 0.03, "3d");
    this.yLabel = new WorldLabel(stage, fl, { tex: "y", size: 32, color: Palette.purple }, y, { x: 16, y: -10 });

    this.svg = new SvgOverlay(fl);
    const fx = rayleigh(X);
    this.plot = new MiniPlot(this.svg, fl, { ...PANEL, xMin: 0, xMax: T_MAX, yMin: fx - 0.75, yMax: fx + 0.1, xLabel: "t", yLabel: "g(t)=f(c(t))" });
    this.tangent = this.plot.curve({ color: Palette.yellow, width: 2.5, dash: "8 6" });
    this.gDouble = this.plot.curve({ color: Palette.purple, width: 3 });
    this.gCurve = this.plot.curve({ color: "#ffffff", width: 3.5 });
    this.plotDot = this.svg.dot(Palette.orange, 8);
    this.mvPlot = new MiniPlot(this.svg, fl, { ...PANEL, xMin: 0, xMax: 1, yMin: fx - 1.05, yMax: fx + 0.1, xLabel: "t", yLabel: "g(t)" });
    this.mvCurve = this.mvPlot.curve({ color: "#ffffff", width: 3.5 });
    this.secant = this.mvPlot.curve({ color: Palette.purple, width: 2.5 });
    this.parallel = this.mvPlot.curve({ color: Palette.yellow, width: 2.5, dash: "8 6" });

    this.fG = fl.add({ tex: "c(0)=x,\\ \\ c'(0)=v,\\qquad g(t)=f(c(t))", x: 700, y: 110, size: 34 });
    this.fChain = fl.add({ tex: "", x: 700, y: 240, size: 28, display: true });
    this.fTaylor = fl.add({ tex: "", x: 700, y: 110, size: 32, display: true });
    this.fRatio = fl.add({ tex: "", x: PANEL.x + PANEL.w / 2, y: 770, size: 26 });
    this.fPull = fl.add({ tex: "\\hat f_x=f\\circ R_x:\\ T_xM\\to\\mathbb R\\qquad\\text{(the pullback)}", x: 700, y: 190, size: 30 });
    this.fProof = fl.add({ tex: "", x: PANEL.x + PANEL.w / 2, y: 560, size: 28, display: true });
    this.fSlopes = fl.add({ tex: "", x: PANEL.x + PANEL.w / 2, y: 770, size: 26 });
    this.fMv = fl.add({ tex: "f(y)=f(x)+\\langle\\operatorname{grad}f(c(t)),\\,c'(t)\\rangle_{c(t)},\\quad t\\in(0,1)", x: 700, y: 110, size: 32 });
    this.fCaveat = fl.add({ tex: "O(t^2):\\ \\text{constant depends on } x \\text{ and } v\\ \\Rightarrow\\ \\text{uniform bound in chapter 5}", x: 700, y: 110, size: 30, color: Palette.muted });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "f(c(t))=f(x)+t\\langle\\operatorname{grad}f(x),v\\rangle+O(t^2)", at: cue.e(7) },
      { label: "2", tex: "f(R_x(s))=f(x)+\\langle\\operatorname{grad}f(x),s\\rangle+O(\\|s\\|^2)", at: cue.e(13) },
      { label: "3", tex: "\\operatorname{grad}\\hat f_x(0)=\\operatorname{grad}f(x)", at: cue.e(21) },
      { label: "4", tex: "f(y)=f(x)+\\langle\\operatorname{grad}f(c(t)),c'(t)\\rangle", at: cue.e(26) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    setOrbitView(this.stage, { azDeg: 18, elDeg: 26, distance: 5.4, fovDeg: 34, center: new THREE.Vector3(0, 0, 0.2), shift: 1.55, lift: -0.05 });
    const fx = rayleigh(X);
    const g2 = this.v.lengthSq();

    const sphereO = c.p(0, 0.8, -0.8);
    this.sphere.setOpacity(sphereO * (1 - 0.45 * c.p(14, 0.6) * (1 - c.p(18, 0.6))), 1, 0);
    this.xDot.setOpacity(sphereO);
    this.xLabel.update(sphereO);
    const vO = sphereO * c.p(1, 0.5) * (1 - c.p(14, 0.5));
    this.vArrow.setOpacity(vO);
    this.vLabel.update(vO);
    const bentO = c.p(1, 0.6) * (1 - c.p(8, 0.6));
    this.bent.setOpacity(bentO);
    this.bent.setProgress(c.over(1, 0.2, 0.9));
    const retrO = c.p(8, 0.6) * (1 - c.p(27, 0.6));
    this.retr.setOpacity(retrO);
    this.retr.setProgress(t < c.s(24) ? Math.min(1, c.over(8, 0.2, 0.9)) * T_MAX : 1);
    this.doubled.setOpacity(c.p(22, 0.5) * (1 - c.p(24, 0.5)));
    // the moving point and its value on the plot (s2–s11)
    const tau = T_MAX * (0.5 + 0.5 * Math.sin((t - c.s(2)) * 0.9 - Math.PI / 2));
    const onBent = t < c.s(8);
    const cur = onBent ? bentCurve(this.v, this.w, tau) : retract(X, this.v.clone().multiplyScalar(tau));
    const moveO = c.p(2, 0.5) * (1 - c.p(12, 0.5));
    this.mover.setPosition(lift(cur, 1.014));
    this.mover.setOpacity(moveO);

    // ---- the plot of g (s2–s23)
    const plotO = c.p(2, 0.6) * (1 - c.p(14, 0.5)) + c.p(22, 0.5) * (1 - c.p(24, 0.5));
    this.plot.setOpacity(plotO);
    const gFn = (s: number): number => rayleigh(onBent ? bentCurve(this.v, this.w, s) : retract(X, this.v.clone().multiplyScalar(s)));
    this.plot.plot(this.gCurve, gFn, 0, T_MAX, 120);
    this.gCurve.setOpacity(plotO);
    this.plot.plot(this.tangent, (s) => fx - s * g2, 0, T_MAX, 2);
    this.tangent.setOpacity(plotO * c.p(6, 0.5));
    this.plot.plot(this.gDouble, (s) => rayleigh(retract(X, this.v.clone().multiplyScalar(2 * s))), 0, T_MAX, 120);
    this.gDouble.setOpacity(c.p(22, 0.5) * (1 - c.p(24, 0.5)));
    const q = this.plot.px(tau, gFn(tau));
    this.plotDot.set(q.x, q.y, plotO * moveO);
    // s11: the O(t²) ratio at shrinking t
    const tr = [0.4, 0.2, 0.1, 0.05, 0.025];
    const ri = Math.min(tr.length - 1, Math.floor(c.over(11, 0.05, 0.95) * tr.length));
    const tt = tr[ri];
    const ratio = (rayleigh(retract(X, this.v.clone().multiplyScalar(tt))) - (fx - tt * g2)) / (tt * tt);
    this.fRatio.setContent(`t=${tt}:\\quad \\dfrac{g(t)-\\big(f(x)-t\\|\\operatorname{grad}f\\|^2\\big)}{t^2}=${ratio.toFixed(3)}`);
    this.fRatio.set({ opacity: c.p(11, 0.4) * (1 - c.p(12, 0.5)) });

    // ---- formulas for s0–s13
    this.fG.set({ opacity: c.p(1, 0.6) * (1 - c.p(6, 0.5)) });
    const ch = Tex.count(t, [c.s(3), c.s(4), c.s(5)]);
    this.fChain.setContent(Tex.rows([
      "g(t)=g(0)+t\\,g'(0)+O(t^2)",
      "g'(t)=Df(c(t))[c'(t)]",
      "=\\langle\\operatorname{grad}f(c(t)),\\,c'(t)\\rangle_{c(t)}",
    ], ch));
    this.fChain.set({ opacity: (ch > 0 ? 1 : 0) * (1 - c.p(6, 0.5)) });
    const tl = Tex.count(t, [c.s(6), c.s(12)]);
    this.fTaylor.setContent(Tex.rows([
      `f(c(t))=f(x)+t\\,\\langle\\operatorname{grad}f(x),v\\rangle_x+O(t^2)`,
      `f(R_x(s))=f(x)+\\langle\\operatorname{grad}f(x),s\\rangle_x+O(\\|s\\|_x^2)`,
    ], tl));
    this.fTaylor.set({ opacity: (tl > 0 ? 1 : 0) * (1 - c.p(18, 0.5)) });

    // ---- the pullback (s14–s21)
    const pullO = c.p(14, 0.8) * (1 - c.p(22, 0.6));
    this.plane.setOpacity(0.92 * pullO);
    this.links.forEach((l) => l.setOpacity(pullO * c.p(16, 0.5)));
    this.fPull.set({ opacity: c.p(14, 0.6) * (1 - c.p(18, 0.5)) });
    const pr = Tex.count(t, [c.s(18), c.s(19), c.s(20), c.s(21)]);
    this.fProof.setContent(Tex.rows([
      "D\\hat f_x(0)[s]",
      "=Df\\big(R_x(0)\\big)\\big[DR_x(0)[s]\\big]&",
      `=Df(x)[s]\\quad ${Tex.color(Palette.muted, "\\text{since } R_x(0)=x,\\ DR_x(0)=\\mathrm{id}")}`,
      `=${Tex.color(Palette.yellow, "\\langle\\operatorname{grad}f(x),s\\rangle_x")}`,
    ].map((r) => r.replace("&", "")), pr));
    this.fProof.set({ opacity: (pr > 0 ? 1 : 0) * (1 - c.p(22, 0.5)) });
    const d0 = (rayleigh(retract(X, this.v.clone().multiplyScalar(2e-4))) - fx) / 1e-4;
    this.fSlopes.setContent(`\\text{slope at }0:\\ \\ ${Tex.color("#ffffff", `-\\|\\operatorname{grad}f\\|^2=${(-g2).toFixed(3)}`)}\\qquad ${Tex.color(Palette.purple, `\\text{doubled speed: } ${d0.toFixed(3)}`)}`);
    this.fSlopes.set({ opacity: c.p(23, 0.5) * (1 - c.p(24, 0.5)) });

    // ---- mean value form (s24–s26)
    const mvO = c.p(24, 0.6) * (1 - c.p(27, 0.6));
    const y = retract(X, this.v.clone().multiplyScalar(1));
    this.yDot.setPosition(lift(y, 1.012));
    this.yDot.setOpacity(mvO);
    this.yLabel.update(mvO);
    this.mvPlot.setOpacity(mvO);
    const gm = (s: number): number => rayleigh(retract(X, this.v.clone().multiplyScalar(s)));
    this.mvPlot.plot(this.mvCurve, gm, 0, 1, 120);
    this.mvCurve.setOpacity(mvO);
    const g0 = gm(0);
    const g1 = gm(1);
    this.mvPlot.plot(this.secant, (s) => g0 + (g1 - g0) * s, 0, 1, 2);
    this.secant.setOpacity(mvO * c.p(25, 0.5));
    let tStar = 0.5;
    let best = Infinity;
    for (let i = 1; i < 400; i++) {
      const s = i / 400;
      const d = (gm(s + 1e-4) - gm(s - 1e-4)) / 2e-4;
      if (Math.abs(d - (g1 - g0)) < best) {
        best = Math.abs(d - (g1 - g0));
        tStar = s;
      }
    }
    this.mvPlot.plot(this.parallel, (s) => gm(tStar) + (g1 - g0) * (s - tStar), Math.max(0, tStar - 0.3), Math.min(1, tStar + 0.3), 2);
    this.parallel.setOpacity(mvO * c.p(25, 0.5, 1.2));
    this.fMv.set({ opacity: c.p(26, 0.5) * (1 - c.p(27, 0.5)) });
    this.fCaveat.set({ opacity: c.p(27, 0.6) });

    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
