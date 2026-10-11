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
import { FLAT_DURATION, ORBIT_DRIFT, flatCameraPose } from "./lib/flat-camera";
import { DustField } from "./lib/flat-dust";
import { Glow } from "./lib/flat-glow";
import type { OrbitPose } from "./lib/flat-orbit";
import { orbitPosition } from "./lib/flat-orbit";
import { FoldingSheet, SPHERE_CENTER, SPHERE_RADIUS, sheetMidHeight } from "./lib/fold-sheet";

/**
 * s02-fold — the fold (7 bars, 14 s).
 * b0–b3: the flat sheet bends from its rim upward and closes into a sphere
 *        (every grid point moves from its plane position to its image on the sphere).
 * b3–b5: from a point on the sphere, a straight step along a tangent direction leaves the sphere;
 *        its tip turns red as it lifts off and the frame holds.
 * b5–b7: the sphere and the red step recede and fade before the gallery.
 */

const GRID_INNER = new THREE.Color("#3f7fd6");
const GRID_OUTER = new THREE.Color("#1d3f78");
const GRID_SPHERE = new THREE.Color("#8cc4ff");
const GROUND = new THREE.Color("#121c31");
const FILL_FLAT = new THREE.Color("#13233f");
const FILL_SPHERE = new THREE.Color("#2d5fa6");
const STEP_LENGTH = 1.5;                    // the straight step, in units of the sphere radius
const POINT_OFFSET_AZIMUTH = -50;           // degrees from the camera azimuth at the step: toward the left limb
const POINT_ELEVATION = 4;                  // latitude of the point on the sphere, degrees
const STEP_HEADING = 122;                   // heading of the step above the eastward tangent, degrees
const FOLD_START = 0.15;                    // bars
const FOLD_END = 3;                         // bars

export class FoldScene implements Scene {
  readonly id = "s02-fold";
  private stage!: StageLayer;
  private backdrop!: RadialBackdrop;
  private dust!: DustField;
  private sheet!: FoldingSheet;
  private start!: OrbitPose;
  private barSeconds = 2;
  private point = new THREE.Vector3();
  private normal = new THREE.Vector3();
  private heading = new THREE.Vector3();
  private pointDot!: Dot;
  private pointGlow!: Glow;
  private headingArrow!: Arrow;
  private step!: Polyline;
  private tipDot!: Dot;
  private tipGlow!: Glow;
  private gap!: Polyline;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    this.stage = stage;
    if (timing.barSeconds === undefined) throw new Error("s02-fold: trailer timing without a bar grid");
    this.barSeconds = timing.barSeconds;
    this.start = flatCameraPose(FLAT_DURATION);
    this.backdrop = new RadialBackdrop(stage, { inner: "#18243f", outer: "#05070d" });
    addStandardLights(stage);
    this.dust = new DustField(stage, 7, 700, 9, 30, new THREE.Vector3(0, 0, -4), "#6f8fc9");
    this.sheet = new FoldingSheet(stage, 1.6, "#13233f");

    // The point faces the camera as it is at the step (b4), a little left of center and above the equator.
    const az = ((this.cameraPose(8).azimuth + POINT_OFFSET_AZIMUTH) * Math.PI) / 180;
    const el = (POINT_ELEVATION * Math.PI) / 180;
    this.normal.set(Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el));
    this.point.copy(SPHERE_CENTER).addScaledVector(this.normal, SPHERE_RADIUS);
    const east = new THREE.Vector3(-Math.sin(az), Math.cos(az), 0);
    const north = new THREE.Vector3().crossVectors(this.normal, east).normalize();
    const h = (STEP_HEADING * Math.PI) / 180;
    this.heading.copy(east).multiplyScalar(Math.cos(h)).addScaledVector(north, Math.sin(h)).normalize();

    this.gap = new Polyline(stage, [this.point, this.point], { color: Palette.red, width: 2, dashed: true, dashSize: 0.06, gapSize: 0.05 });
    this.step = new Polyline(stage, [this.point, this.point], { color: Palette.orange, width: 4.5 });
    this.headingArrow = new Arrow(stage, this.point, this.point, Palette.orange, { width: 4, headLength: 0.16, mode: "3d" });
    this.pointGlow = new Glow(stage, Palette.orange, 0.7, 0.8);
    this.pointDot = new Dot(stage, this.point, Palette.orange, 0.055, "3d");
    this.tipGlow = new Glow(stage, Palette.red, 0.9, 0.9);
    this.tipDot = new Dot(stage, this.point, Palette.orange, 0.06, "3d");
  }

  /** Camera: continues s01's orbit, swings down and in to frame the closing sphere, then pulls away. */
  private cameraPose(t: number): OrbitPose {
    const s = this.start;
    const settle = easeInOutCubic(ramp(0, 6.5, t));
    const away = easeInOutCubic(ramp(10, 14, t));
    const azimuth = s.azimuth + ORBIT_DRIFT * t + 24 * smoothstep(0, 9, t);
    const elevation = lerp(lerp(s.elevation, 20, settle), 28, away);
    const distance = lerp(s.distance, 6.4, settle) + 9 * away * away;
    // Follow the middle of the bending sheet so the rising rim stays in frame.
    const k = this.curvature(t);
    const target = s.target.clone().lerp(new THREE.Vector3(0, 0, 0), settle);
    target.z = 0.85 * sheetMidHeight(k);
    return { target, azimuth, elevation, distance, fov: s.fov };
  }

  /** Curvature fraction of the sheet: 0 → 1 over b0–b3. */
  private curvature(t: number): number {
    return easeInOutCubic(ramp(FOLD_START * this.barSeconds, FOLD_END * this.barSeconds, t));
  }

  draw(ctx: SceneContext): void {
    const t = ctx.localTime;
    const c = new Cues(ctx, t);
    const pose = this.cameraPose(t);
    const cam = orbitPosition(pose);
    this.stage.setView3D(cam, pose.target, pose.fov);

    const out = smoothstep(c.bar(5.25), c.bar(6.9), t);
    this.backdrop.set({ x: 960, y: 420, radius: lerp(1050, 800, out), strength: 1 }, lerp(1, 0.35, out));
    this.dust.setOpacity(0.45 * (1 - out));

    // The fold: curvature fraction 0 → 1 over b0–b3, the rim rising first.
    const k = this.curvature(t);
    const lineColor = GRID_INNER.clone().lerp(GRID_SPHERE, k);
    this.sheet.update(k, cam, {
      inner: lineColor, outer: GRID_OUTER.clone().lerp(GRID_SPHERE, k), ground: GROUND,
      brightness: lerp(0.95, 0.75, k) * (1 - out), depthDim: lerp(0.55, 0.9, k), reveal: 9,
    }, 1, lerp(0.55, 0.96, smoothstep(0, 0.8, k)) * (1 - out));
    this.sheet.setFillColor(FILL_FLAT.clone().lerp(FILL_SPHERE, k), new THREE.Color("#0b1a33").multiplyScalar(k));

    // The point and its heading (b3).
    const show = smoothstep(c.bar(3), c.bar(3) + 0.4, t) * (1 - out);
    const lifted = this.point.clone().addScaledVector(this.normal, 0.012);
    this.pointDot.setPosition(lifted);
    this.pointDot.setScale(lerp(0.3, 1, easeOutCubic(show)));
    this.pointDot.setOpacity(show);
    this.pointGlow.set(lifted, show * 0.8);
    const arrowGrow = easeOutCubic(ramp(c.bar(3.2), c.bar(3.6), t));
    const stepGrow = easeInOutCubic(ramp(c.bar(3.75), c.bar(4.6), t));
    const arrowLen = 0.42 * arrowGrow * (1 - stepGrow);
    this.headingArrow.set(lifted, lifted.clone().addScaledVector(this.heading, Math.max(arrowLen, 1e-4)));
    this.headingArrow.setOpacity(arrowLen > 0.02 ? show : 0);

    // The straight step leaves the sphere; the tip reddens with its height above the surface.
    const tip = this.point.clone().addScaledVector(this.heading, STEP_LENGTH * SPHERE_RADIUS * stepGrow);
    this.step.setPoints([lifted, tip]);
    this.step.setOpacity(stepGrow > 0.001 ? show : 0);
    this.step.setProgress(1);
    const height = tip.distanceTo(SPHERE_CENTER) - SPHERE_RADIUS;
    const red = clamp01(height / 0.45);
    const tipColor = new THREE.Color(Palette.orange).lerp(new THREE.Color(Palette.red), red).getStyle();
    this.step.setColor(tipColor);
    this.tipDot.setColor(tipColor);
    this.tipDot.setPosition(tip);
    this.tipDot.setOpacity(stepGrow > 0.001 ? show : 0);
    // Freeze: at the end of the step the red tip flashes once.
    const freeze = c.bar(4.6);
    const flash = t >= freeze ? Math.exp(-(t - freeze) * 3) : 0;
    this.tipGlow.setColor(tipColor);
    this.tipGlow.set(tip, show * stepGrow * (0.55 + 0.45 * flash), 1 + 0.8 * flash);
    // The gap: a dashed radial drop from the tip to the sphere.
    const foot = SPHERE_CENTER.clone().add(tip.clone().sub(SPHERE_CENTER).setLength(SPHERE_RADIUS));
    this.gap.setPoints([tip, foot]);
    this.gap.setOpacity(0.8 * smoothstep(freeze, freeze + 0.5, t) * (1 - out));
    this.gap.setProgress(1);
  }

  teardown(_layers: SceneLayers): void {}
}
