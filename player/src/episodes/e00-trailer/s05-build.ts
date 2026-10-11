import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { StageLayer } from "../../layers/StageLayer";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { easeInOutCubic, lerp, ramp, smoothstep } from "../../primitives/Easing";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { RadialBackdrop } from "./lib/flat-backdrop";
import { Glow } from "./lib/flat-glow";
import { orbitPosition } from "./lib/flat-orbit";
import { GraphDescent } from "./lib/toolkit-descent";
import { HeightField, TerrainView } from "./lib/toolkit-terrain";

/**
 * s05-build — the build (2 bars, accelerando 120 → 128 BPM) under the snare roll.
 * b0–b1.75: the camera dives from above into the valley where s04's descent ended, faster and faster, circling it;
 *           the descent path glows on the terrain.
 * b1.75–b2: the empty beat before the drop: everything goes dark except the orange point, which swells with the
 *           reversed cymbal.
 * Entered by the zoom-through out of the valley's minimum (s04's exit point).
 */
const FIELD = new HeightField();
const DESCENT = new GraphDescent(FIELD, 0.9);
const P = new THREE.Vector2(-0.35, 0.2);    // s04's start point; the same descent ends in the same valley
const ITERATES = 14;
const LIFT = 0.02;
const DARK_BAR = 1.75;                      // the empty last beat

export class BuildScene implements Scene {
  readonly id = "s05-build";
  private stage!: StageLayer;
  private backdrop!: RadialBackdrop;
  private terrain!: TerrainView;
  private trail!: Polyline;
  private dot!: Dot;
  private glow!: Glow;
  private valley = new THREE.Vector3();
  private readonly entryUv = new THREE.Vector2(0.5, 0.5);

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    const stage = layers.stage;
    this.stage = stage;
    this.backdrop = new RadialBackdrop(stage, { inner: "#1a2846", outer: "#05070d" });
    addStandardLights(stage);
    this.terrain = new TerrainView(stage, FIELD);
    const iterates = DESCENT.iterates(P, ITERATES);
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k < ITERATES; k++) {
      for (let i = 0; i < 12; i++) {
        const u = iterates[k].clone().lerp(iterates[k + 1], i / 12);
        pts.push(FIELD.point(u.x, u.y, LIFT));
      }
    }
    const last = iterates[ITERATES];
    this.valley = FIELD.point(last.x, last.y, LIFT + 0.03);
    pts.push(this.valley.clone());
    this.trail = new Polyline(stage, pts, { color: Palette.orange, width: 4 });
    this.glow = new Glow(stage, Palette.orange, 1.0, 0.85, false);
    this.dot = new Dot(stage, this.valley, Palette.orange, 0.06, "3d");
  }

  draw(ctx: SceneContext): void {
    const t = ctx.localTime;
    const c = new Cues(ctx, t);
    // the dive: an ease-in, so the camera keeps accelerating until the dark beat
    const dive = ramp(0, c.bar(DARK_BAR), t) ** 2.2;
    const pose = {
      target: this.valley.clone(),
      azimuth: -60 + 70 * dive,
      elevation: lerp(66, 30, easeInOutCubic(dive)),
      distance: lerp(9.0, 2.4, dive),
      fov: 38,
    };
    this.stage.setView3D(orbitPosition(pose), pose.target, pose.fov);

    const dark = smoothstep(c.bar(DARK_BAR) - 0.04, c.bar(DARK_BAR) + 0.02, t);
    const lit = 1 - dark;
    this.backdrop.set({ x: 960, y: 420, radius: 1100, strength: 1 }, lit);
    this.terrain.setOpacity(lit, lit);
    this.trail.setOpacity(lit);
    this.trail.setProgress(1);
    // the point: steady during the dive, swelling through the dark beat
    const swell = smoothstep(c.bar(DARK_BAR), c.bar(2), t);
    this.dot.setPosition(this.valley);
    this.dot.setScale(1 + 0.7 * swell * swell);
    this.dot.setOpacity(1);
    this.glow.set(this.valley, 0.8 + 0.2 * swell, 1 + 0.8 * swell * swell);

    const p = this.stage.project(this.valley);
    this.entryUv.set(p.x / 1920, 1 - p.y / 1080);
  }

  /** The zoom-through from s04 comes out of the valley's minimum. */
  entryPoint(): THREE.Vector2 {
    return this.entryUv.clone();
  }

  teardown(_layers: SceneLayers): void {}
}
