import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { lerp, smoothstep } from "../../primitives/Easing";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Polyline, sampleCurve } from "../../primitives/Polyline";
import { Surface, sphereFn } from "../../primitives/Surface";
import { TangentPlane } from "../../primitives/TangentPlane";
import { Hud } from "./lib/Hud";
import { Orbit } from "./lib/Orbit";
import { PlotPanel } from "./lib/PlotPanel";
import { TangentBasis } from "./lib/TangentBasis";
import { Tex } from "./lib/Tex";

/**
 * E05 c01 — why an optimizer needs the directions that stay on M to first order.
 * S² at p; six arrows from p; the distance of p + tv from the sphere (order t vs t²);
 * the tangent plane; differences q − p along two paths converging to different directions.
 * Sentence indices refer to content/episodes/e05-tangent-orthogonal/story.en.json, scene c01-why-directions.
 */

const FOV = 32;
const DIST = 6.2;
const P = new THREE.Vector3(0.62, 0.18, 0.76).normalize();
const BASIS = new TangentBasis(P);
/** (tangent angle, elevation above the tangent plane) of the six arrows; elevation 0 = tangent. */
const ARROWS: [number, number][] = [[0.35, 0], [0.95, 0.62], [2.3, 0], [3.3, 0.42], [4.3, 0.78], [5.4, 0.3]];
const ARROW_COLORS = [Palette.teal, Palette.pink, Palette.purple, Palette.green, Palette.yellow, Palette.blue];
const GENERAL_PV = 0.8;
const T_MAX = 0.6;
const PATH_BETAS = [-0.25, 2.1];

/** Distance from p + t v to the unit sphere for |v| = 1 and pᵀv = pv. */
function dist(pv: number, t: number): number {
  return Math.abs(Math.sqrt(1 + 2 * t * pv + t * t) - 1);
}

export class WhyDirectionsScene implements Scene {
  readonly id = "c01-why-directions";
  private stage!: StageLayer;
  private hud!: Hud;
  private sphere!: Surface;
  private pDot!: Dot;
  private pLabel!: FormulaHandle;
  private card!: FormulaHandle;
  private arrows: Arrow[] = [];
  private gaps: Polyline[] = [];
  private plot!: PlotPanel;
  private curveGeneral!: Polyline;
  private curveTangent!: Polyline;
  private labelGeneral!: FormulaHandle;
  private labelTangent!: FormulaHandle;
  private expansion!: FormulaHandle;
  private plane!: TangentPlane;
  private planeLabel!: FormulaHandle;
  private paths: Polyline[] = [];
  private qDots: Dot[] = [];
  private diffArrows: Arrow[] = [];
  private qLabels: FormulaHandle[] = [];
  private motionNote!: FormulaHandle;
  private question!: FormulaHandle;
  private subQuestion!: FormulaHandle;

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);
    this.hud = new Hud(stage);
    this.sphere = new Surface(stage, sphereFn(1), Palette.blue, { wireframe: true, opacity: 0.55, isoU: 24, isoV: 12 });
    this.pDot = new Dot(stage, P, Palette.orange, 0.045, "3d");
    this.pLabel = fl.add({ tex: "p", x: 0, y: 0, size: 38, color: Palette.orange });
    this.card = fl.add({ tex: "S^2=h^{-1}(1),\\qquad h(x)=x^{\\top}x", x: 80, y: 96, size: 40, align: "left" });

    ARROWS.forEach((_, i) => {
      this.arrows.push(new Arrow(stage, P, P.clone().add(new THREE.Vector3(0, 0, 0.1)), ARROW_COLORS[i],
        { mode: "3d", headLength: 0.09, width: 4 }));
      this.gaps.push(new Polyline(stage, [P, P], { color: Palette.red, width: 3, dashed: true, dashSize: 0.04, gapSize: 0.03 }));
    });

    this.plot = new PlotPanel(stage, fl, this.hud, {
      width: 640, height: 430, xMin: -T_MAX, xMax: T_MAX, yMin: 0, yMax: 0.62,
      xLabel: "t", yLabel: "\\operatorname{dist}(p+tv,\\,S^2)", originX: 0, originY: 0,
    });
    this.curveGeneral = this.plot.curve((t) => dist(GENERAL_PV, t), -T_MAX, T_MAX, 120, Palette.red, 4);
    this.curveTangent = this.plot.curve((t) => dist(0, t), -T_MAX, T_MAX, 120, Palette.orange, 5);
    this.labelGeneral = fl.add({ tex: "p^{\\top}v\\neq 0:\\ \\text{order } t", x: 0, y: 0, size: 28, color: Palette.red, align: "left" });
    this.labelTangent = fl.add({ tex: "p^{\\top}v=0:\\ \\text{order } t^2", x: 0, y: 0, size: 28, color: Palette.orange, align: "left" });
    this.expansion = fl.add({ tex: this.expansionTex(false), x: 1530, y: 96, size: 38 });

    this.plane = new TangentPlane(stage, Palette.orange, 0.62);
    this.plane.place(P, P);
    this.planeLabel = fl.add({ tex: "p^{\\top}v=0", x: 0, y: 0, size: 34, color: Palette.orange });

    const betas = PATH_BETAS;
    const colors = [Palette.teal, Palette.pink];
    betas.forEach((beta, i) => {
      this.paths.push(new Polyline(stage, sampleCurve((s) => BASIS.geodesic(beta, s).multiplyScalar(1.004), 0, 1.1, 60),
        { color: colors[i], width: 4 }));
      this.qDots.push(new Dot(stage, P, colors[i], 0.04, "3d"));
      this.diffArrows.push(new Arrow(stage, P, P.clone().add(BASIS.e1), colors[i], { mode: "3d", headLength: 0.09, width: 4 }));
      this.qLabels.push(fl.add({ tex: "q", x: 0, y: 0, size: 34, color: colors[i] }));
    });
    this.motionNote = fl.add({ text: "Direction must come from motion inside M", x: 1440, y: 700, size: 34, color: Palette.text });
    this.question = fl.add({ tex: "\\text{Which directions keep us on } M\\text{, to first order?}", x: 960, y: 380, size: 54, boxed: true });
    this.subQuestion = fl.add({ text: "…computed by differentiating the constraint, without a chart", x: 960, y: 500, size: 34, color: Palette.muted });
  }

  private expansionTex(highlight: boolean): string {
    const mid = highlight ? Tex.c(Palette.yellow, "2t\\,p^{\\top}v") : "2t\\,p^{\\top}v";
    return `\\|p+tv\\|^2=1+${mid}+t^2\\|v\\|^2`;
  }

  private label(h: FormulaHandle, world: THREE.Vector3, dx: number, dy: number, opacity: number): void {
    const f = this.stage.project(world);
    h.set({ x: f.x + dx, y: f.y + dy, opacity });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const az = lerp(-0.62, -0.42, smoothstep(0, ctx.duration, t));
    Orbit.frame(this.stage, az, 0.36, DIST, FOV, new THREE.Vector3(0, 0, 0), 640, 450);
    this.hud.sync(this.stage, FOV);

    const questionPhase = c.p(19, 0.8);
    const stageDim = 1 - 0.8 * questionPhase;
    this.sphere.setOpacity(c.p(0, 1.0, -1.6) * stageDim);
    this.card.set({ opacity: c.p(0, 0.8, 0.6) * (1 - c.p(10, 0.6)) });
    this.pDot.setOpacity(c.p(1, 0.5) * stageDim);
    this.label(this.pLabel, P, -26, -26, c.p(1, 0.5) * stageDim);

    // Arrows: grow (s2), push forward (s4), dim the non-tangent ones (s10), fade (s12).
    const grow = c.over(2, 0.25, 0.85);
    const push = c.over(4, 0.05, 0.6);
    const arrowsOut = 1 - c.p(12, 0.8);
    const tangentFocus = c.p(10, 0.8);
    ARROWS.forEach(([beta, alpha], i) => {
      const v = BASIS.direction(beta, alpha);
      const len = lerp(0.001, 0.42, grow) + 0.26 * push;
      const tip = P.clone().addScaledVector(v, len);
      this.arrows[i].set(P, tip);
      const tangent = alpha === 0;
      this.arrows[i].setColor(tangent && tangentFocus > 0.5 ? Palette.orange : ARROW_COLORS[i]);
      const dimNon = tangent ? 1 : 1 - 0.75 * tangentFocus;
      this.arrows[i].setOpacity((grow > 0.01 ? 1 : 0) * arrowsOut * dimNon * stageDim);
      const foot = tip.clone().normalize();
      this.gaps[i].setPoints([tip, foot]);
      this.gaps[i].setOpacity(smoothstep(0.1, 0.5, push) * (1 - c.p(10, 0.8)) * arrowsOut);
    });

    // Distance plot (s5–s9), shrinks to the upper right at s10.
    const plotIn = c.p(5, 0.8) * (1 - c.p(12, 0.8));
    const shrink = c.p(10, 1.0);
    this.plot.place(lerp(1530, 1640, shrink), lerp(420, 300, shrink), lerp(1, 0.62, shrink));
    this.plot.draw(plotIn);
    this.expansion.setContent(this.expansionTex(t >= c.in(6, 0.45)));
    this.expansion.set({ opacity: c.p(6, 0.7) * (1 - c.p(10, 0.6)) });
    const drawGeneral = c.over(7, 0.1, 0.8);
    this.curveGeneral.setProgress(drawGeneral);
    this.curveGeneral.setOpacity(plotIn);
    const drawTangent = c.over(8, 0.1, 0.8);
    this.curveTangent.setProgress(drawTangent);
    this.curveTangent.setOpacity(plotIn);
    const k = this.plot.grp.scale;
    const lg = this.plot.grp.toFrame(-290, -140);
    this.labelGeneral.set({ x: lg.x, y: lg.y, scale: k, opacity: plotIn * smoothstep(0.6, 1, drawGeneral) });
    const lt = this.plot.grp.toFrame(-290, -100);
    this.labelTangent.set({ x: lt.x, y: lt.y, scale: k, opacity: plotIn * smoothstep(0.6, 1, drawTangent) });

    // Tangent plane (s10 onward).
    this.plane.setOpacity(c.p(10, 1.0) * stageDim);
    this.label(this.planeLabel, P.clone().addScaledVector(BASIS.e1, -0.62).addScaledVector(BASIS.e2, -0.45), 70, 0,
      c.p(10, 0.8, 0.6) * (1 - c.p(12, 0.6)) * stageDim);

    // Differences q − p along two paths (s13–s18).
    const pathsIn = c.p(13, 0.8) * stageDim;
    const slides = [c.over(14, 0.05, 0.95), c.over(15, 0.45, 0.95)];
    const shows = [pathsIn, c.p(15, 0.6) * stageDim];
    PATH_BETAS.forEach((beta, i) => {
      const s = lerp(1.05, 0.06, slides[i]);
      const q = BASIS.geodesic(beta, s);
      this.paths[i].setOpacity(shows[i] * 0.9);
      this.qDots[i].setPosition(q.clone().multiplyScalar(1.004));
      this.qDots[i].setOpacity(shows[i] * (1 - smoothstep(0.9, 1, slides[i])));
      const dir = q.clone().sub(P).normalize();
      this.diffArrows[i].set(P, P.clone().addScaledVector(dir, 0.55));
      this.diffArrows[i].setOpacity(shows[i]);
      this.label(this.qLabels[i], q, 22, -22, shows[i] * (1 - smoothstep(0.85, 1, slides[i])));
    });
    this.motionNote.set({ opacity: c.p(18, 0.8) * (1 - questionPhase) });
    this.question.set({ opacity: questionPhase });
    this.subQuestion.set({ opacity: c.p(20, 0.8) });
  }

  teardown(_layers: SceneLayers): void {}
}
