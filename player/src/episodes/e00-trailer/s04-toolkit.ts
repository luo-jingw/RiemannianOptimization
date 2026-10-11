import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { clamp01, easeInOutCubic, easeOutCubic, lerp, ramp, smoothstep } from "../../primitives/Easing";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { RadialBackdrop } from "./lib/flat-backdrop";
import { DustField } from "./lib/flat-dust";
import { Glow } from "./lib/flat-glow";
import type { OrbitPose } from "./lib/flat-orbit";
import { orbitPosition } from "./lib/flat-orbit";
import { CaptionShade } from "./lib/toolkit-caption-shade";
import { GraphDescent } from "./lib/toolkit-descent";
import type { TangentFrame } from "./lib/toolkit-tangent-disk";
import { TangentDisk, framePoint } from "./lib/toolkit-tangent-disk";
import { HeightField, TerrainView } from "./lib/toolkit-terrain";
import { ToolkitWordRow, wordOnsets } from "./lib/toolkit-words";

/**
 * s04-toolkit — rebuilding the toolkit on a curved terrain (16 bars, 32 s).
 * b0–b6: a smooth terrain with several valleys turns slowly; the camera closes in on a point p on a
 *        hill's shoulder; a ring of the surface around p is matched by a tangent disk ("flat up close").
 * b7–b16: four words arrive with the second line, each with its visual at p:
 *        direction — tangent vectors in the tangent disk;
 *        distance — the unit circle of the tangent plane becomes the unit ellipse of another inner product;
 *        gradient — the steepest-descent direction −grad h, tangent to the surface and pointing downhill;
 *        step — a step along the tangent plane leaves the surface and bends back onto it (retraction);
 *        then the iterates of Riemannian gradient descent slide down into the valley.
 * Sentence 0 = "They all live on manifolds ...", sentence 1 = "To optimize there ... step."
 */

const FIELD = new HeightField();
const DESCENT = new GraphDescent(FIELD, 0.9);
const P = new THREE.Vector2(-0.35, 0.2);    // start point, on the shoulder of the main hill
const ITERATES = 14;
const DIRECTION_COUNT = 6;
const DIRECTION_LENGTH = 0.5;
const CIRCLE_RADIUS = 0.42;
/** Second inner product on T_pM: unit-ball semi-axes and orientation (in the e1, e2 frame). */
const METRIC_AXES = new THREE.Vector2(1.45, 0.6);
const METRIC_ANGLE = 0.5;
const GRADIENT_LENGTH = 0.85;
const DISK_RADIUS = 0.72;
const NEIGHBORHOOD_RADIUS = 0.62;
const LIFT = 0.02;                          // drawn paths float this far above the surface
const FIRST_LANDING_BAR = 11;               // the demonstrated step lands at b11
const LANDING_SPACING_BARS = 0.25;          // later iterates land on every beat
const MOVE_SECONDS = 0.32;

function tangentFrame(p: THREE.Vector2): TangentFrame {
  const origin = FIELD.point(p.x, p.y);
  const n = FIELD.normal(p.x, p.y);
  const e1 = FIELD.tangent(p.x, p.y, 1, 0).normalize();
  const e2 = new THREE.Vector3().crossVectors(n, e1).normalize();
  return { origin, e1, e2, n };
}

export class ToolkitScene implements Scene {
  readonly id = "s04-toolkit";
  private stage!: StageLayer;
  private backdrop!: RadialBackdrop;
  private shade!: CaptionShade;
  private dust!: DustField;
  private terrain!: TerrainView;
  private frameP!: TangentFrame;
  private iterates: THREE.Vector2[] = [];
  private neighborhood!: Polyline;
  private disk!: TangentDisk;
  private directions: Arrow[] = [];
  private circle!: Polyline;
  private gradient!: Arrow;
  private tangentStep!: Polyline;
  private bendBack!: Polyline;
  private bendHead!: Arrow;
  private trail!: Polyline;
  private iterateDots: Dot[] = [];
  private current!: Dot;
  private currentGlow!: Glow;
  private valleyGlow!: Glow;
  private words!: ToolkitWordRow;
  private barSeconds = 2;
  /** Camera azimuth (deg) at b8 that shows the descent direction at p running left to right. */
  private closeAzimuth = 0;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    this.stage = stage;
    if (timing.barSeconds === undefined) throw new Error("s04-toolkit: trailer timing without a bar grid");
    this.barSeconds = timing.barSeconds;
    this.backdrop = new RadialBackdrop(stage, { inner: "#1a2846", outer: "#05070d" });
    addStandardLights(stage);
    this.dust = new DustField(stage, 11, 700, 10, 30, new THREE.Vector3(0, 0, 0), "#6f8fc9");
    this.terrain = new TerrainView(stage, FIELD);
    this.frameP = tangentFrame(P);
    this.iterates = DESCENT.iterates(P, ITERATES);
    const d = DESCENT.stepCoordinates(P);
    this.closeAzimuth = (Math.atan2(d.y, d.x) * 180) / Math.PI - 90;

    this.neighborhood = new Polyline(stage, this.neighborhoodPoints(), { color: Palette.green, width: 3 });
    this.disk = new TangentDisk(stage, Palette.green);
    for (let i = 0; i < DIRECTION_COUNT; i++) {
      this.directions.push(new Arrow(stage, this.frameP.origin, this.frameP.origin, Palette.green,
        { width: 3.5, headLength: 0.11, mode: "3d" }));
    }
    this.circle = new Polyline(stage, this.loopPoints(0), { color: Palette.text, width: 3 });
    this.gradient = new Arrow(stage, this.frameP.origin, this.frameP.origin, Palette.yellow,
      { width: 5, headLength: 0.16, mode: "3d" });
    this.tangentStep = new Polyline(stage, [this.frameP.origin, this.frameP.origin],
      { color: Palette.orange, width: 3.5, dashed: true, dashSize: 0.07, gapSize: 0.05 });
    this.bendBack = new Polyline(stage, [this.frameP.origin, this.frameP.origin], { color: Palette.orange, width: 3.5 });
    this.bendHead = new Arrow(stage, this.frameP.origin, this.frameP.origin, Palette.orange,
      { width: 3.5, headLength: 0.11, mode: "3d" });
    this.trail = new Polyline(stage, [this.frameP.origin, this.frameP.origin], { color: Palette.orange, width: 4 });
    for (let k = 0; k <= ITERATES; k++) {
      const q = this.iterates[k];
      this.iterateDots.push(new Dot(stage, FIELD.point(q.x, q.y, LIFT), Palette.orange, 0.04, "3d"));
    }
    const last = this.iterates[ITERATES];
    this.valleyGlow = new Glow(stage, Palette.orange, 1.4, 0.55);
    this.valleyGlow.set(FIELD.point(last.x, last.y, 0.05), 0);
    this.currentGlow = new Glow(stage, Palette.orange, 0.4, 0.7);
    this.current = new Dot(stage, this.frameP.origin, Palette.orange, 0.06, "3d");
    this.words = new ToolkitWordRow(layers.formulas);
    this.shade = new CaptionShade(stage, "#04060b", 900, 1080);   // light lift under the shadowed captions only
  }

  /** The circle of chart radius NEIGHBORHOOD_RADIUS around p, lifted onto the surface. */
  private neighborhoodPoints(): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) {
      const s = (2 * Math.PI * i) / 120;
      pts.push(FIELD.point(P.x + NEIGHBORHOOD_RADIUS * Math.cos(s), P.y + NEIGHBORHOOD_RADIUS * Math.sin(s), 0.015));
    }
    return pts;
  }

  /** Unit circle (m = 0) morphing into the unit ball of the second inner product (m = 1), in T_pM. */
  private loopPoints(m: number): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    const ca = Math.cos(METRIC_ANGLE);
    const sa = Math.sin(METRIC_ANGLE);
    const ax = lerp(1, METRIC_AXES.x, m);
    const ay = lerp(1, METRIC_AXES.y, m);
    for (let i = 0; i <= 120; i++) {
      const s = (2 * Math.PI * i) / 120;
      const u = ax * Math.cos(s);
      const v = ay * Math.sin(s);
      pts.push(framePoint(this.frameP, CIRCLE_RADIUS * (ca * u - sa * v), CIRCLE_RADIUS * (sa * u + ca * v), 0.01));
    }
    return pts;
  }

  /** Landing time of iterate k (k ≥ 1). */
  private landing(k: number): number {
    return (FIRST_LANDING_BAR + LANDING_SPACING_BARS * (k - 1)) * this.barSeconds;
  }

  /** Chart position of the moving point: iterate k − 1 → k along the retraction curve before landing k. */
  private chartPosition(t: number): { p: THREE.Vector2; landed: number } {
    let landed = 0;
    while (landed < ITERATES && t >= this.landing(landed + 1)) landed++;
    if (landed === 0 || landed >= ITERATES) return { p: this.iterates[landed].clone(), landed };
    const next = this.landing(landed + 1);
    const u = easeInOutCubic(ramp(next - MOVE_SECONDS, next, t));
    return { p: this.iterates[landed].clone().lerp(this.iterates[landed + 1], u), landed };
  }

  private cameraPose(t: number, c: Cues): OrbitPose {
    const zoom = easeInOutCubic(ramp(c.bar(2), c.bar(5.75), t));
    const side = easeInOutCubic(ramp(c.bar(9.85), c.bar(10.35), t));
    const back = easeInOutCubic(ramp(c.bar(10.95), c.bar(12.2), t));
    const valley = this.iterates[ITERATES];
    const mid = new THREE.Vector2((P.x + valley.x) / 2, (P.y + valley.y) / 2);
    const wide = new THREE.Vector3(0, 0, -0.35);
    const close = this.frameP.origin.clone().add(new THREE.Vector3(0, 0, -0.05));
    const follow = FIELD.point(lerp(mid.x, valley.x, 0.3), lerp(mid.y, valley.y, 0.3), 0.55);
    const r1 = this.iterates[1];
    const stepMid = this.frameP.origin.clone().add(FIELD.point(r1.x, r1.y)).multiplyScalar(0.5).add(new THREE.Vector3(0, 0, -0.12));
    const target = wide.clone().lerp(close, zoom).lerp(stepMid, side).lerp(follow, back);
    return {
      target,
      azimuth: this.closeAzimuth - 1.5 * (t - c.bar(8)),
      // Low and side-on while the step leaves the surface and bends back (b9.85–b11), so the gap shows.
      elevation: lerp(lerp(lerp(38, 55, zoom), 16, side), 68, back),
      distance: lerp(lerp(lerp(12.5, 3.7, zoom), 2.7, side), 9.0, back) + 0.6 * smoothstep(c.bar(12.5), c.bar(16), t),
      fov: 38,
    };
  }

  draw(ctx: SceneContext): void {
    const t = ctx.localTime;
    const c = new Cues(ctx, t);
    const pose = this.cameraPose(t, c);
    this.stage.setView3D(orbitPosition(pose), pose.target, pose.fov);

    const fadeIn = smoothstep(0, 1.2, t);
    const fadeOut = 1 - smoothstep(ctx.duration - 0.6, ctx.duration, t);
    const all = fadeIn * fadeOut;
    this.backdrop.set({ x: 960, y: 380, radius: 1100, strength: 1 }, all);
    this.dust.setOpacity(0.4 * all);
    this.terrain.setOpacity(all, all);
    this.shade.setStrength(0.35);

    // Flat up close: a ring of the surface around p, then the tangent disk settling onto it.
    const ringIn = smoothstep(c.bar(3.5), c.bar(4.5), t);
    const fit = easeInOutCubic(ramp(c.bar(4.5), c.bar(6), t));
    const neighborhoodFade = 1 - smoothstep(c.bar(6.5), c.bar(7.5), t);
    this.neighborhood.setOpacity(ringIn * neighborhoodFade * all);
    this.neighborhood.setProgress(ringIn);

    const onsets = wordOnsets(c.s(1), c.e(1));
    const [tDir, tDist, tGrad, tStep] = onsets;
    const { p: chart, landed } = this.chartPosition(t);
    // After the first step the disk follows the moving point: the tangent plane at the current iterate.
    const travel = smoothstep(this.landing(1) - 0.2, this.landing(1) + 0.4, t);
    const frame = landed >= 1 ? tangentFrame(chart) : this.frameP;
    const sideView = smoothstep(c.bar(9.85), c.bar(10.35), t);
    const diskRadius = lerp(DISK_RADIUS * lerp(0.35, 1, fit) * lerp(1, 0.75, sideView), 0.5, travel);
    const diskFade = 1 - smoothstep(this.landing(ITERATES) - 0.5, this.landing(ITERATES) + 1.0, t);
    this.disk.set(frame, diskRadius, fit * diskFade * all * (landed >= 1 ? lerp(0.55, 1, 1 - travel) : 1));

    // direction: tangent vectors fan out in the disk.
    const dirFade = 1 - smoothstep(tStep + 0.3, tStep + 0.9, t);
    for (let i = 0; i < DIRECTION_COUNT; i++) {
      const g = easeOutCubic(ramp(tDir + 0.06 * i, tDir + 0.06 * i + 0.5, t));
      const a = (2 * Math.PI * i) / DIRECTION_COUNT + 0.3;
      const len = DIRECTION_LENGTH * (i % 2 === 0 ? 1 : 0.72) * Math.max(g, 1e-3);
      const from = framePoint(this.frameP, 0, 0, 0.012);
      this.directions[i].set(from, framePoint(this.frameP, len * Math.cos(a), len * Math.sin(a), 0.012));
      this.directions[i].setOpacity(g > 0.01 ? lerp(1, 0.45, smoothstep(tGrad, tGrad + 0.4, t)) * dirFade * all : 0);
    }

    // distance: the unit circle becomes the unit ellipse of another inner product.
    const circleIn = smoothstep(tDist, tDist + 0.35, t);
    const morph = easeInOutCubic(ramp(tDist + 0.3, tDist + 1.2, t));
    const circleFade = 1 - smoothstep(tStep + 0.3, tStep + 0.9, t);
    this.circle.setPoints(this.loopPoints(morph));
    this.circle.setColor(new THREE.Color(Palette.text).lerp(new THREE.Color(Palette.purple), morph).getStyle());
    this.circle.setOpacity(circleIn * circleFade * all);
    this.circle.setProgress(circleIn);

    // gradient: −grad h at the current point, tangent to the surface, pointing downhill.
    const gradIn = easeOutCubic(ramp(tGrad, tGrad + 0.5, t));
    // It steps aside while the demonstrated step travels along it, then follows the iterates.
    const aside = smoothstep(c.bar(10.0), c.bar(10.15), t) * (1 - smoothstep(this.landing(1) - 0.1, this.landing(1) + 0.3, t));
    const gradFade = (1 - aside) * (1 - smoothstep(this.landing(6), this.landing(8), t));
    const dirNow = DESCENT.descentDirection(chart);
    const base = FIELD.point(chart.x, chart.y).addScaledVector(frame.n, 0.016);
    this.gradient.set(base, base.clone().addScaledVector(dirNow, GRADIENT_LENGTH * lerp(1, 0.6, travel) * Math.max(gradIn, 1e-3)));
    this.gradient.setOpacity(gradIn > 0.01 ? gradFade * all : 0);

    // step: along the tangent plane (dashed), then bending back onto the surface (retraction).
    const d0 = DESCENT.stepCoordinates(P);
    const p0 = this.frameP.origin.clone().addScaledVector(this.frameP.n, 0.03);
    const q = p0.clone().add(FIELD.tangent(P.x, P.y, d0.x, d0.y));
    const r = FIELD.point(this.iterates[1].x, this.iterates[1].y, LIFT);
    const out = easeInOutCubic(ramp(Math.max(tStep, c.bar(10.1)), c.bar(10.55), t));
    const backIn = easeInOutCubic(ramp(c.bar(10.6), c.bar(10.95), t));
    const stepFade = 1 - smoothstep(this.landing(2), this.landing(4), t);
    this.tangentStep.setPoints([p0, p0.clone().lerp(q, Math.max(out, 1e-3))]);
    this.tangentStep.setOpacity(out > 0.001 ? stepFade * all : 0);
    this.tangentStep.setProgress(1);
    const ctrl = q.clone().lerp(r, 0.15).addScaledVector(q.clone().sub(p0).normalize(), 0.12);
    const arc: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const s = i / 40;
      arc.push(q.clone().multiplyScalar((1 - s) ** 2).addScaledVector(ctrl, 2 * s * (1 - s)).addScaledVector(r, s * s));
    }
    this.bendBack.setPoints(arc.slice(0, 37));
    this.bendBack.setOpacity(backIn > 0.001 ? stepFade * all : 0);
    this.bendBack.setProgress(backIn);
    this.bendHead.set(arc[34], arc[40]);
    this.bendHead.setOpacity(backIn > 0.97 ? stepFade * all : 0);

    // The iterates: a trail on the surface (each piece is the retraction curve of one step).
    const trailPts: THREE.Vector3[] = [];
    for (let k = 0; k < landed; k++) {
      for (let i = 0; i < 12; i++) {
        const u = this.iterates[k].clone().lerp(this.iterates[k + 1], i / 12);
        trailPts.push(FIELD.point(u.x, u.y, LIFT));
      }
    }
    if (landed >= 1) {
      const from = this.iterates[landed];
      for (let i = 0; i <= 12; i++) {
        const u = from.clone().lerp(chart, i / 12);
        trailPts.push(FIELD.point(u.x, u.y, LIFT));
      }
    } else {
      trailPts.push(FIELD.point(P.x, P.y, LIFT), FIELD.point(P.x, P.y, LIFT));
    }
    this.trail.setPoints(trailPts);
    this.trail.setOpacity(landed >= 1 ? all : 0);
    this.trail.setProgress(1);
    for (let k = 0; k <= ITERATES; k++) {
      // Past iterates only: the current point is drawn by its own dot, never on top of an iterate dot.
      const shown = k < landed ? 1 : 0;
      this.iterateDots[k].setOpacity(shown * 0.95 * all);
    }

    // The current point: appears with the neighborhood ring, then travels.
    const pointIn = smoothstep(c.bar(3.25), c.bar(3.75), t);
    // During the demonstrated step the point rides out along the tangent plane and back along the arc.
    const here = landed >= 1 || out <= 0
      ? FIELD.point(chart.x, chart.y, LIFT + 0.02)
      : backIn <= 0 ? p0.clone().lerp(q, out) : arc[Math.round(backIn * 40)].clone();
    const since = landed >= 1 ? t - this.landing(landed) : 99;
    const pulse = Math.exp(-since * 6);
    this.current.setPosition(here);
    this.current.setScale(lerp(0.3, 1, easeOutCubic(pointIn)) * (1 + 0.3 * pulse));
    this.current.setOpacity(pointIn * all);
    this.currentGlow.set(here, pointIn * all * (0.7 + 0.3 * pulse), 1 + 0.5 * pulse);
    const last = this.iterates[ITERATES];
    const settle = smoothstep(this.landing(ITERATES), this.landing(ITERATES) + 1.2, t);
    this.valleyGlow.set(FIELD.point(last.x, last.y, 0.05), settle * all * (0.75 + 0.25 * Math.cos((t - this.landing(ITERATES)) * Math.PI)));

    this.words.update(t, onsets, fadeOut * clamp01(1 - smoothstep(c.bar(14.5), c.bar(15.5), t) * 0.5));
  }

  teardown(_layers: SceneLayers): void {}
}
