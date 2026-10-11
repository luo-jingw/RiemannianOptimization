import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { StageLayer } from "../../layers/StageLayer";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { clamp01, easeInOutCubic, easeOutCubic, lerp, ramp, smoothstep } from "../../primitives/Easing";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Polyline, circlePoints } from "../../primitives/Polyline";
import { RadialBackdrop } from "./lib/flat-backdrop";
import { flatCameraPose } from "./lib/flat-camera";
import { DustField } from "./lib/flat-dust";
import { Glow } from "./lib/flat-glow";
import { orbitPosition } from "./lib/flat-orbit";
import { Quadratic } from "./lib/flat-quadratic";
import { FoldingSheet } from "./lib/fold-sheet";

/**
 * s01-flat — the flat world (4 bars at 80 BPM, 12 s).
 * b0–b1: the elliptic contours of a quadratic light up from the center over a cold blue grid, all within the first
 *        two seconds.
 * b1–b3: gradient descent zig-zags toward the minimum, one step per beat (with the ticks), steps shrinking.
 * b3–b4: the camera tilts from overhead to 45°; contours fade and the grid becomes a flat 3D sheet, which s02 folds.
 */

const QUAD = new Quadratic(1, 5, 0.45);
const ALPHA = 0.32;                         // α λ2 = 1.6: the steep coordinate flips sign every step
const START = QUAD.fromFrame(-2.3, 0.72);
const STEPS = 8;
const FIRST_LANDING_BEAT = 5;               // landings on every beat from beat 5 (bar 1, beat 2) to beat 12
const STEP_MOVE = 0.4;                      // seconds of motion before each landing
const LEVEL_COUNT = 11;
const GRID_INNER = new THREE.Color("#3f7fd6");
const GRID_OUTER = new THREE.Color("#1d3f78");
const GROUND = new THREE.Color("#121c31");

const lift = (p: THREE.Vector2, z = 0.004): THREE.Vector3 => new THREE.Vector3(p.x, p.y, z);

export class FlatScene implements Scene {
  readonly id = "s01-flat";
  private stage!: StageLayer;
  private backdrop!: RadialBackdrop;
  private dust!: DustField;
  private sheet!: FoldingSheet;
  private contours: Polyline[] = [];
  private contourStarts: number[] = [];
  private iterates: THREE.Vector2[] = [];
  private trail!: Polyline;
  private dot!: Dot;
  private dotGlow!: Glow;
  private minGlow!: Glow;
  private ring!: Polyline;
  private grid!: Cues;                       // beat times of this chapter

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    this.stage = stage;
    this.grid = new Cues(timing, 0);
    this.backdrop = new RadialBackdrop(stage, { inner: "#18243f", outer: "#05070d" });
    addStandardLights(stage);
    this.dust = new DustField(stage, 7, 700, 9, 30, new THREE.Vector3(0, 0, -4), "#6f8fc9");
    this.sheet = new FoldingSheet(stage, 1.6, "#13233f");

    // Contour levels: f at the start point is the outermost; inner levels shrink geometrically.
    const fStart = QUAD.value(START);
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const level = fStart * Math.pow(0.66, i) * 1.04;
      const w = i / (LEVEL_COUNT - 1);
      const color = new THREE.Color("#1f4f9a").lerp(new THREE.Color("#8fd0ff"), w).getStyle();
      const line = new Polyline(stage, QUAD.contour(level, 160).map((p) => lift(p, 0.003)), { color, width: 2.2 + w });
      this.contours.push(line);
      // Reveal from the center outward: innermost first.
      this.contourStarts.push(0.05 + 0.12 * (LEVEL_COUNT - 1 - i));
    }

    this.iterates = QUAD.descent(START, ALPHA, STEPS);
    this.trail = new Polyline(stage, [lift(START, 0.01), lift(START, 0.01)], { color: Palette.orange, width: 3.5 });
    this.ring = new Polyline(stage, circlePoints(0, 0, 1, 64), { color: Palette.orange, width: 2.5 });
    this.minGlow = new Glow(stage, "#8fd0ff", 1.6, 0.5);
    this.dotGlow = new Glow(stage, Palette.orange, 1.1, 0.85);
    this.dot = new Dot(stage, lift(START, 0.02), Palette.orange, 0.085, "3d");
  }

  /** Landing time of step k (0-based). */
  private landing(k: number): number {
    return this.grid.beat(FIRST_LANDING_BEAT + k);
  }

  /** Number of completed landings at time t. */
  private landedAt(t: number): number {
    let k = 0;
    while (k < STEPS && t >= this.landing(k)) k++;
    return k;
  }

  /** Position of the descent dot at local time t. */
  private dotPosition(t: number): THREE.Vector2 {
    const k = this.landedAt(t);
    // k = number of completed landings; check whether the next step is in motion.
    const from = this.iterates[k];
    if (k >= STEPS) return from.clone();
    const landing = this.landing(k);
    const u = easeInOutCubic(ramp(landing - STEP_MOVE, landing, t));
    return from.clone().lerp(this.iterates[k + 1], u);
  }

  draw(ctx: SceneContext): void {
    const t = ctx.localTime;
    const c = new Cues(ctx, t);
    const pose = flatCameraPose(t);
    const cam = orbitPosition(pose);
    this.stage.setView3D(cam, pose.target, pose.fov);

    const fadeIn = smoothstep(0, c.bar(0.35), t);
    this.backdrop.set({ x: 960, y: 420, radius: 1050, strength: lerp(0.6, 1, fadeIn) }, fadeIn);
    this.dust.setOpacity(0.45 * smoothstep(0.2, 2.5, t));

    // Grid: reveals from the center with the contours, brightens into a 3D sheet during the tilt.
    const tilt = c.pb(3, 1);
    const reveal = lerp(0, 1.6, smoothstep(0, 2.4, t));
    this.sheet.update(0, cam, {
      inner: GRID_INNER, outer: GRID_OUTER, ground: GROUND.clone().multiplyScalar(fadeIn),
      brightness: lerp(0.5, 0.95, tilt), depthDim: 0.55 * tilt, reveal,
    }, 1, 0.55 * tilt);

    // Contours: draw themselves around the ellipse, innermost first; fade out during the tilt.
    const contourFade = 1 - smoothstep(c.bar(3.1), c.bar(3.8), t);
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const p = smoothstep(this.contourStarts[i], this.contourStarts[i] + 0.8, t);
      this.contours[i].setOpacity((0.35 + 0.65 * p) * contourFade);
      this.contours[i].setProgress(p);
    }
    this.minGlow.set(lift(new THREE.Vector2(0, 0), 0.01), 0.6 * smoothstep(0, 1.0, t) * contourFade, 1);

    // Gradient descent: the dot appears at b1 and lands on every beat.
    const appear = smoothstep(c.bar(1) - 0.3, c.bar(1) + 0.3, t);
    const descentFade = 1 - smoothstep(c.bar(3.3), c.bar(3.9), t);
    const pos = this.dotPosition(t);
    const landed = this.landedAt(t);
    const trailPts = this.iterates.slice(0, landed + 1).map((p) => lift(p, 0.008));
    trailPts.push(lift(pos, 0.008));
    this.trail.setPoints(trailPts);
    this.trail.setOpacity(0.95 * appear * descentFade);
    this.trail.setProgress(1);
    const dotPos = lift(pos, 0.09);
    this.dot.setPosition(dotPos);
    this.dot.setScale(lerp(0.3, 1, easeOutCubic(appear)));
    this.dot.setOpacity(appear * descentFade);
    // Landing pulse: brighter glow and an expanding ring at each landing.
    const sinceLanding = landed > 0 ? t - this.landing(landed - 1) : 99;
    const pulse = landed > 0 ? Math.exp(-sinceLanding * 5) : 0;
    this.dotGlow.set(dotPos, appear * descentFade * (0.65 + 0.35 * pulse), 1 + 0.4 * pulse);
    const ringU = clamp01(sinceLanding / 0.7);
    const ringScale = lerp(0.08, 0.5, easeOutCubic(ringU));
    this.ring.object.position.copy(lift(this.iterates[Math.max(0, landed)], 0.012));
    this.ring.object.scale.setScalar(ringScale);
    this.ring.setOpacity(landed > 0 ? 0.8 * (1 - ringU) * descentFade : 0);
    this.ring.setProgress(1);
  }

  teardown(_layers: SceneLayers): void {}
}
