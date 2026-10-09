import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { clamp01, lerp, smoothstep } from "../../primitives/Easing";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Polyline, sampleCurve } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { seeded } from "../../primitives/Seeded";
import { Surface, sphereFn } from "../../primitives/Surface";
import { TangentPlane } from "../../primitives/TangentPlane";
import { Orbit } from "./lib/Orbit";
import { Tex } from "./lib/Tex";

/**
 * E05 c02 — tangent vectors as velocities of curves in M.
 * S² at p = (1, 0, 0): an "ant" curve with its velocity; the definition card; equator and meridian;
 * twenty curves whose velocities fill the tangent plane; reparametrization γ(st); the sum γ₁ + γ₂ − p leaves S².
 * Sentence indices refer to content/episodes/e05-tangent-orthogonal/story.en.json, scene c02-tangent-by-curves.
 */

const FOV = 32;
const DIST = 6.8;
const P = new THREE.Vector3(1, 0, 0);
const ARROW_SCALE = 0.55;          // world length of a unit velocity
const ANT_A = new THREE.Vector3(0, 0.9, 0.55);
const ANT_B = new THREE.Vector3(0, 0.25, -0.35);
const N_CURVES = 20;
const RIGHT_X = 1110;              // center of the formula column between the sphere and the ledger

/** Smooth curve on S² through p with velocity a at t = 0: normalize(p + t a + t² b), a ⊥ p. */
function sphereCurve(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  return P.clone().addScaledVector(a, t).addScaledVector(b, t * t).normalize();
}

const equator = (t: number): THREE.Vector3 => new THREE.Vector3(Math.cos(t), Math.sin(t), 0);
const meridian = (t: number): THREE.Vector3 => new THREE.Vector3(Math.cos(t), 0, Math.sin(t));
const sumCurve = (t: number): THREE.Vector3 => equator(t).add(meridian(t)).sub(P);

export class TangentByCurvesScene implements Scene {
  readonly id = "c02-tangent-by-curves";
  private stage!: StageLayer;
  private sphere!: Surface;
  private pDot!: Dot;
  private pLabel!: FormulaHandle;
  private antCurve!: Polyline;
  private ant!: Dot;
  private antArrow!: Arrow;
  private antLabel!: FormulaHandle;
  private defCard!: FormulaHandle;
  private defSetting!: FormulaHandle;
  private eqCurve!: Polyline;
  private merCurve!: Polyline;
  private eqArrow!: Arrow;
  private merArrow!: Arrow;
  private eqTex!: FormulaHandle;
  private merTex!: FormulaHandle;
  private perpTex!: FormulaHandle;
  private eqLabel!: FormulaHandle;
  private merLabel!: FormulaHandle;
  private curves: Polyline[] = [];
  private curveArrows: Arrow[] = [];
  private tips: Dot[] = [];
  private curveData: { a: THREE.Vector3; b: THREE.Vector3 }[] = [];
  private plane!: TangentPlane;
  private scaleTex!: FormulaHandle;
  private sValue!: FormulaHandle;
  private sumCurveLine!: Polyline;
  private sumArrow!: Arrow;
  private sumGap!: Polyline;
  private sumLabel!: FormulaHandle;
  private notInM!: FormulaHandle;
  private sumTex!: FormulaHandle;
  private openQuestion!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);
    this.sphere = new Surface(stage, sphereFn(1), Palette.blue, { wireframe: true, opacity: 0.5 });
    this.pDot = new Dot(stage, P, Palette.orange, 0.04, "3d");
    this.pLabel = fl.add({ tex: "p", x: 0, y: 0, size: 36, color: Palette.orange });

    this.antCurve = new Polyline(stage, sampleCurve((t) => sphereCurve(ANT_A, ANT_B, t).multiplyScalar(1.004), -1.7, 1.7, 120),
      { color: Palette.teal, width: 4.5 });
    this.ant = new Dot(stage, P, Palette.text, 0.05, "3d");
    this.antArrow = new Arrow(stage, P, P.clone().addScaledVector(ANT_A, ARROW_SCALE), Palette.orange, { mode: "3d", headLength: 0.09, width: 5 });
    this.antLabel = fl.add({ tex: "\\gamma'(0)", x: 0, y: 0, size: 34, color: Palette.orange });

    this.defCard = fl.add({ tex: this.defTex(0), x: 750, y: 92, size: 40, boxed: true });
    this.defSetting = fl.add({ tex: "M\\subseteq\\mathbb{R}^n\\ \\text{smooth embedded submanifold},\\quad p\\in M", x: 750, y: 166, size: 30, color: Palette.muted });

    this.eqCurve = new Polyline(stage, sampleCurve((t) => equator(t).multiplyScalar(1.004), -1.2, 1.2, 80), { color: Palette.teal, width: 4.5 });
    this.merCurve = new Polyline(stage, sampleCurve((t) => meridian(t).multiplyScalar(1.004), -1.2, 1.2, 80), { color: Palette.pink, width: 4.5 });
    this.eqArrow = new Arrow(stage, P, P.clone().add(new THREE.Vector3(0, ARROW_SCALE, 0)), Palette.orange, { mode: "3d", headLength: 0.09, width: 5 });
    this.merArrow = new Arrow(stage, P, P.clone().add(new THREE.Vector3(0, 0, ARROW_SCALE)), Palette.orange, { mode: "3d", headLength: 0.09, width: 5 });
    this.eqTex = fl.add({ tex: this.eqFormula(0), x: RIGHT_X, y: 330, size: 32 });
    this.merTex = fl.add({ tex: this.merFormula(0), x: RIGHT_X, y: 450, size: 32 });
    this.perpTex = fl.add({ tex: "(0,1,0)\\perp p,\\qquad (0,0,1)\\perp p", x: RIGHT_X, y: 560, size: 32, color: Palette.green });
    this.eqLabel = fl.add({ tex: "(0,1,0)", x: 0, y: 0, size: 28, color: Palette.teal });
    this.merLabel = fl.add({ tex: "(0,0,1)", x: 0, y: 0, size: 28, color: Palette.pink });

    const rnd = seeded(5);
    for (let k = 0; k < N_CURVES; k++) {
      const ang = (2 * Math.PI * k) / N_CURVES + 0.25 * rnd();
      const mag = 0.35 + 0.65 * rnd();
      const a = new THREE.Vector3(0, mag * Math.cos(ang), mag * Math.sin(ang));
      const b = new THREE.Vector3(0, 0.6 * (rnd() - 0.5), 0.6 * (rnd() - 0.5));
      this.curveData.push({ a, b });
      this.curves.push(new Polyline(stage, sampleCurve((t) => sphereCurve(a, b, t).multiplyScalar(1.004), -0.9, 0.9, 50),
        { color: Palette.teal, width: 2.5 }));
      this.curveArrows.push(new Arrow(stage, P, P.clone().addScaledVector(a, ARROW_SCALE), Palette.orange, { mode: "3d", headLength: 0.06, width: 2.5 }));
      this.tips.push(new Dot(stage, P.clone().addScaledVector(a, ARROW_SCALE), Palette.orange, 0.025, "3d"));
    }
    this.plane = new TangentPlane(stage, Palette.orange, 0.62);
    this.plane.place(P, P);

    this.scaleTex = fl.add({ tex: this.scaleFormula(0), x: RIGHT_X, y: 330, size: 32 });
    this.sValue = fl.add({ tex: "s=2", x: RIGHT_X, y: 470, size: 44, color: Palette.yellow });

    this.sumCurveLine = new Polyline(stage, sampleCurve(sumCurve, -1.3, 1.3, 100), { color: Palette.red, width: 4, dashed: true, dashSize: 0.05, gapSize: 0.035 });
    this.sumArrow = new Arrow(stage, P, P.clone().add(new THREE.Vector3(0, ARROW_SCALE, ARROW_SCALE)), Palette.green, { mode: "3d", headLength: 0.09, width: 5 });
    const end = sumCurve(1.3);
    this.sumGap = new Polyline(stage, [end, end.clone().normalize()], { color: Palette.red, width: 3 });
    this.sumLabel = fl.add({ tex: "v_1+v_2", x: 0, y: 0, size: 30, color: Palette.green });
    this.notInM = fl.add({ tex: "\\notin M", x: 0, y: 0, size: 34, color: Palette.red });
    this.sumTex = fl.add({ tex: "\\gamma_1(t)+\\gamma_2(t)-p", x: RIGHT_X, y: 330, size: 34, color: Palette.red });
    this.openQuestion = fl.add({ tex: "\\text{Is } T_pM \\text{ closed under addition?}", x: RIGHT_X, y: 620, size: 32, color: Palette.yellow, boxed: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "def", tex: "v=\\gamma'(0),\\ \\gamma\\subset M,\\ \\gamma(0)=p", at: cue.s(8) + 1.2 },
      { label: "1", tex: "s\\,v\\in T_pM\\ \\ (s\\in\\mathbb{R})", at: cue.s(27) + 0.8 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  private defTex(highlight: number): string {
    const hl = (k: number, body: string): string => (highlight === k ? Tex.c(Palette.yellow, body) : body);
    return `v\\in T_pM\\iff\\exists\\ ${hl(1, "\\gamma:(-\\varepsilon,\\varepsilon)\\to M")},\\ \\ ${hl(2, "\\gamma(0)=p")},\\ \\ ${hl(3, "\\gamma'(0)=v")}`;
  }

  private eqFormula(n: number): string {
    return this.twoLines("\\gamma(t)=(\\cos t,\\sin t,0)", "\\gamma'(0)=(0,1,0)", n);
  }

  private merFormula(n: number): string {
    return this.twoLines("\\gamma(t)=(\\cos t,0,\\sin t)", "\\gamma'(0)=(0,0,1)", n);
  }

  private twoLines(a: string, b: string, n: number): string {
    return `\\begin{gathered}${a}\\\\ ${n >= 2 ? b : `\\phantom{${b}}`}\\end{gathered}`;
  }

  private scaleFormula(n: number): string {
    const lines = [
      "&\\sigma(t)=\\gamma(st)",
      "&\\sigma(t)\\in M,\\ \\ \\sigma(0)=p",
      "&\\sigma'(0)=s\\,\\gamma'(0)=s\\,v",
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
    const az = lerp(-0.72, -0.58, smoothstep(0, ctx.duration, t));
    Orbit.frame(this.stage, az, 0.4, DIST, FOV, new THREE.Vector3(0, 0, 0), 520, 500);

    this.sphere.setOpacity(c.p(0, 1.0, -1.6));
    this.pDot.setOpacity(c.p(0, 0.6));
    this.label(this.pLabel, P, 18, 26, c.p(0, 0.6));

    // ---- The ant (s0–s9) and again for reparametrization (s20–s27).
    const antPhase = c.p(0, 0.6) * (1 - c.p(10, 0.6)) + c.p(21, 0.6) * (1 - c.p(28, 0.6));
    this.antCurve.setProgress(t < c.s(10) ? c.over(0, 0.0, 0.7) : 1);
    this.antCurve.setOpacity(antPhase);
    let tau: number;
    let s = 1;
    if (t < c.s(21)) {
      tau = lerp(-1.4, 0, smoothstep(c.s(0), c.in(1, 0.7), t));
    } else if (t < c.s(24)) {
      tau = 0;
    } else if (t < c.s(25)) {
      s = 2;
      tau = lerp(-0.75, 0.75, c.over(24, 0.1, 0.9));
    } else if (t < c.s(26)) {
      s = -1;
      tau = lerp(-1.2, 1.2, c.over(25, 0.1, 0.9));
    } else {
      s = 0;
      tau = lerp(-1.2, 1.2, c.over(26, 0.1, 0.9));
    }
    this.ant.setPosition(sphereCurve(ANT_A, ANT_B, s * tau).multiplyScalar(1.01));
    this.ant.setOpacity(antPhase);
    const arrowShow = c.p(2, 0.6) * (1 - c.p(10, 0.6)) + c.p(21, 0.6) * (1 - c.p(28, 0.6));
    const flash7 = t >= c.s(7) && t < c.e(7) ? 0.5 + 0.5 * Math.cos((t - c.s(7)) * 2 * Math.PI / 0.8) : 1;
    // During the scaling demo the arrow is s·v, eased between the three values of s.
    const sShown = t < c.s(24) ? 1 : keyS(c, t);
    this.antArrow.set(P, P.clone().addScaledVector(ANT_A, ARROW_SCALE * sShown));
    this.antArrow.setOpacity(arrowShow * (0.4 + 0.6 * flash7) * (Math.abs(sShown) > 0.02 ? 1 : 0));
    this.label(this.antLabel, P.clone().addScaledVector(ANT_A, ARROW_SCALE * sShown), 40, -18,
      arrowShow * (t < c.s(21) ? 1 : 0));
    const flash5 = t >= c.s(5) && t < c.e(5) ? 0.5 + 0.5 * Math.cos((t - c.s(5)) * 2 * Math.PI / 0.8) : 1;
    this.antCurve.setWidth(t >= c.s(5) && t < c.e(5) ? 4.5 + 3 * (1 - flash5) : 4.5);
    const flash6 = t >= c.s(6) && t < c.e(6) ? 1.0 + 0.6 * (1 - (0.5 + 0.5 * Math.cos((t - c.s(6)) * 2 * Math.PI / 0.8))) : 1;
    this.pDot.setScale(flash6);

    // ---- Definition card (s3–s9).
    const hl = t >= c.s(7) && t < c.s(8) ? 3 : t >= c.s(6) && t < c.s(7) ? 2 : t >= c.s(5) && t < c.s(6) ? 1 : 0;
    this.defCard.setContent(this.defTex(hl));
    this.defCard.set({ opacity: c.p(3, 0.7) * (1 - c.p(10, 0.6)) });
    this.defSetting.set({ opacity: c.p(4, 0.7) * (1 - c.p(10, 0.6)) });

    // ---- Equator and meridian (s10–s15).
    const exPhase = 1 - c.p(16, 0.6);
    this.eqCurve.setProgress(c.over(11, 0.05, 0.7));
    this.eqCurve.setOpacity(c.p(11, 0.3) * exPhase);
    this.eqArrow.setOpacity(c.p(12, 0.6, 0.8) * exPhase);
    this.label(this.eqLabel, P.clone().add(new THREE.Vector3(0, ARROW_SCALE, 0)), 52, 0, c.p(12, 0.6, 0.8) * exPhase);
    this.eqTex.setContent(this.eqFormula(t >= c.s(12) ? 2 : 1));
    this.eqTex.set({ opacity: c.p(11, 0.6) * exPhase });
    this.merCurve.setProgress(c.over(13, 0.05, 0.7));
    this.merCurve.setOpacity(c.p(13, 0.3) * exPhase);
    this.merArrow.setOpacity(c.p(14, 0.6, 0.3) * exPhase);
    this.label(this.merLabel, P.clone().add(new THREE.Vector3(0, 0, ARROW_SCALE)), 0, -26, c.p(14, 0.6, 0.3) * exPhase);
    this.merTex.setContent(this.merFormula(t >= c.s(14) ? 2 : 1));
    this.merTex.set({ opacity: c.p(13, 0.6) * exPhase });
    this.perpTex.set({ opacity: c.p(15, 0.6) * exPhase });

    // ---- Twenty curves; their velocity tips fill the plane (s16–s19).
    const manyOut = 1 - c.p(19, 0.8);
    for (let k = 0; k < N_CURVES; k++) {
      const appear = smoothstep(c.s(16) + (k / N_CURVES) * (c.e(17) - c.s(16)) * 0.8,
        c.s(16) + (k / N_CURVES) * (c.e(17) - c.s(16)) * 0.8 + 0.5, t);
      this.curves[k].setOpacity(appear * manyOut * 0.85);
      this.curveArrows[k].setOpacity(appear * manyOut);
      this.tips[k].setOpacity(appear * c.p(17, 0.5) * (1 - c.p(20, 0.8)));
    }
    const planeIn = c.p(18, 1.0);
    const planeOut = 1 - c.p(28, 0.8) * 0.6;
    this.plane.setOpacity(planeIn * planeOut);

    // ---- Scaling (s20–s27).
    const scalePhase = c.p(21, 0.6) * (1 - c.p(28, 0.6));
    const scaleLines = t >= c.s(23) ? 3 : t >= c.s(22) ? 2 : 1;
    this.scaleTex.setContent(this.scaleFormula(scaleLines));
    this.scaleTex.set({ opacity: scalePhase });
    const sText = t >= c.s(26) ? "s=0" : t >= c.s(25) ? "s=-1" : "s=2";
    this.sValue.setContent(sText);
    this.sValue.set({ opacity: c.p(24, 0.4) * (1 - c.p(27, 0.6)) });

    // ---- Sums (s28–s35).
    const sumPhase = c.p(28, 0.6) * (1 - c.p(34, 0.8) * 0.0);
    const twoCurves = c.p(28, 0.6);
    this.eqCurve.setOpacity(Math.max(c.p(11, 0.3) * exPhase, twoCurves));
    this.merCurve.setOpacity(Math.max(c.p(13, 0.3) * exPhase, twoCurves));
    if (t >= c.s(28)) {
      this.eqCurve.setProgress(1);
      this.merCurve.setProgress(1);
    }
    this.eqArrow.setOpacity(Math.max(c.p(12, 0.6, 0.8) * exPhase, twoCurves));
    this.merArrow.setOpacity(Math.max(c.p(14, 0.6, 0.3) * exPhase, twoCurves));
    this.label(this.eqLabel, P.clone().add(new THREE.Vector3(0, ARROW_SCALE, 0)), 52, 0, Math.max(c.p(12, 0.6, 0.8) * exPhase, 0));
    this.label(this.merLabel, P.clone().add(new THREE.Vector3(0, 0, ARROW_SCALE)), 0, -26, Math.max(c.p(14, 0.6, 0.3) * exPhase, 0));
    this.eqLabel.setContent(t >= c.s(28) ? "v_1" : "(0,1,0)");
    this.merLabel.setContent(t >= c.s(28) ? "v_2" : "(0,0,1)");
    if (t >= c.s(28)) {
      this.label(this.eqLabel, P.clone().add(new THREE.Vector3(0, ARROW_SCALE, 0)), 34, 10, twoCurves);
      this.label(this.merLabel, P.clone().add(new THREE.Vector3(0, 0, ARROW_SCALE)), -10, -26, twoCurves);
    }
    const drawSum = c.over(29, 0.1, 0.8);
    this.sumCurveLine.setProgress(drawSum);
    this.sumCurveLine.setOpacity(c.p(29, 0.3) * sumPhase);
    this.sumArrow.setOpacity(c.p(29, 0.6, 1.5) * sumPhase);
    this.label(this.sumLabel, P.clone().add(new THREE.Vector3(0, ARROW_SCALE, ARROW_SCALE)), 46, -10, c.p(29, 0.6, 1.5) * sumPhase);
    this.sumGap.setOpacity(c.p(30, 0.6) * sumPhase);
    this.label(this.notInM, sumCurve(1.3), 50, 0, c.p(30, 0.6) * sumPhase);
    this.sumTex.set({ opacity: c.p(29, 0.6) * sumPhase });
    this.openQuestion.set({ opacity: c.p(33, 0.8) });

    this.ledger.update(t, clamp01(c.p(8, 0.5, 1.0)));
  }

  teardown(_layers: SceneLayers): void {}
}

/** The displayed factor s during the reparametrization demo: 2, then −1, then 0, with short easings. */
function keyS(c: Cues, t: number): number {
  const a = smoothstep(c.s(24), c.s(24) + 0.6, t);
  const b = smoothstep(c.s(25), c.s(25) + 0.6, t);
  const d = smoothstep(c.s(26), c.s(26) + 0.6, t);
  const e = smoothstep(c.s(28), c.s(28) + 0.6, t);
  return lerp(lerp(lerp(lerp(1, 2, a), -1, b), 0, d), 1, e);
}
