import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import { FRAME_HEIGHT, FRAME_WIDTH } from "../../core/Frame";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Cues } from "../../primitives/Cues";
import { clamp01, lerp, smoothstep } from "../../primitives/Easing";
import type { MiniViz } from "./lib/montage-kit";
import { ChartsViz } from "./lib/montage-viz-charts";
import { ConvergenceViz } from "./lib/montage-viz-convergence";
import { FlattenViz } from "./lib/montage-viz-flatten";
import { GeodesicsViz } from "./lib/montage-viz-geodesics";
import { HessianViz } from "./lib/montage-viz-hessian";
import { MetricsViz } from "./lib/montage-viz-metrics";
import { NewtonViz } from "./lib/montage-viz-newton";
import { RetractionViz } from "./lib/montage-viz-retraction";
import { TangentViz } from "./lib/montage-viz-tangent";
import { TransportViz } from "./lib/montage-viz-transport";
import { TrustRegionViz } from "./lib/montage-viz-trust-region";
import { VectorTransportViz } from "./lib/montage-viz-vector-transport";

/** The tape stop of the film score (pipeline/rvideo/music/film_score.py TAPE_STOP_SECONDS, tape_stop.py exponent). */
const TAPE_STOP_SECONDS = 2.0;
const TAPE_STOP_EXPONENT = 1.3;
/** Beats of the drop at which a new picture cuts in: twelve every two beats, then eight on every beat. */
const CUT_BEATS: readonly number[] = [...Array.from({ length: 12 }, (_, i) => 2 * i), ...Array.from({ length: 8 }, (_, i) => 24 + i)];
/** Pictures for the cuts: the twelve in course order, then a faster reprise. */
const CUT_PICTURES: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 4, 7, 8, 10, 2, 6, 9, 11];
const STOP_BAR = 8;
const WORD_X = 110;
const WORD_Y = 960;

/**
 * s06-drop — the phonk drop (9 bars at 128 BPM). The course's geometry flashes past full screen: twelve live
 * visualizations (lib/montage-viz-*), one every two beats with its name slammed in large, then a reprise on every
 * beat. The score's tape stop starts inside bar 8 and plays through it; the picture follows it exactly: its time
 * slows to a halt with the same curve while it darkens, then the frame stays black until the title's hit.
 */
export class DropScene implements Scene {
  readonly id = "s06-drop";
  private vizzes: MiniViz[] = [];
  private words: FormulaHandle[] = [];
  private target!: THREE.WebGLRenderTarget;
  private screenMaterial!: THREE.MeshBasicMaterial;
  private screen!: THREE.Mesh;
  private shade!: THREE.MeshBasicMaterial;
  private flash!: THREE.MeshBasicMaterial;

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    const stage = layers.stage;
    stage.setView2D(0, 0, 9);
    this.vizzes = [new ConvergenceViz(), new ChartsViz(), new FlattenViz(), new TangentViz(), new MetricsViz(),
      new RetractionViz(), new HessianViz(), new GeodesicsViz(), new TransportViz(), new VectorTransportViz(), new NewtonViz(),
      new TrustRegionViz()];
    this.target = new THREE.WebGLRenderTarget(FRAME_WIDTH, FRAME_HEIGHT, { samples: 4, type: THREE.HalfFloatType });
    this.screenMaterial = new THREE.MeshBasicMaterial({ map: this.target.texture, depthWrite: false, depthTest: false });
    this.screen = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), this.screenMaterial);
    this.screen.renderOrder = 0;
    stage.root.add(this.screen);
    this.shade = new THREE.MeshBasicMaterial({ color: new THREE.Color("#000000"), transparent: true, opacity: 0, depthWrite: false, depthTest: false });
    const shadeMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), this.shade);
    shadeMesh.position.z = 0.1;
    shadeMesh.renderOrder = 1;
    stage.root.add(shadeMesh);
    this.flash = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffffff"), transparent: true, opacity: 0, depthWrite: false,
      depthTest: false, blending: THREE.AdditiveBlending });
    const flashMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), this.flash);
    flashMesh.position.z = 0.2;
    flashMesh.renderOrder = 2;
    stage.root.add(flashMesh);
    this.words = this.vizzes.map((v) => layers.formulas.add({
      text: v.label.toUpperCase(), x: WORD_X, y: WORD_Y, size: 64, weight: 800, align: "left", valign: "bottom",
      color: "#f4f6fb", opacity: 0,
    }));
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = ctx.localTime;
    const renderer = ctx.layers.stage.renderer;
    ctx.layers.stage.setView2D(0, 0, 9);

    // the tape stop: picture time follows the score's slowing playback, then stands still
    const consumed = TAPE_STOP_SECONDS / (TAPE_STOP_EXPONENT + 1);
    const stopAt = c.bar(STOP_BAR) - consumed;
    const u = clamp01((t - stopAt) / TAPE_STOP_SECONDS);
    const tt = t < stopAt ? t : stopAt + consumed * (1 - (1 - u) ** (TAPE_STOP_EXPONENT + 1));

    // the cut showing at picture time tt
    let k = 0;
    for (let i = 0; i < CUT_BEATS.length; i++) if (tt >= c.beat(CUT_BEATS[i])) k = i;
    const cutAt = c.beat(CUT_BEATS[k]);
    const picture = CUT_PICTURES[k];
    const viz = this.vizzes[picture];
    viz.update(Math.max(0, tt - cutAt + 0.6));
    renderer.setRenderTarget(this.target);
    renderer.render(viz.scene, viz.camera);
    renderer.setRenderTarget(null);

    // each cut lands with a short flash and a small push-in; the stop darkens and leans in
    const since = tt - cutAt;
    this.flash.opacity = 0.22 * Math.exp(-since / 0.07) * (1 - u);
    this.screen.scale.setScalar((1 + 0.03 * Math.exp(-since / 0.25)) * (1 + 0.06 * u));
    this.shade.opacity = t >= stopAt + TAPE_STOP_SECONDS ? 1 : 0.92 * u ** 1.4;

    // the picture's name slams in on the two-beat cuts and is gone before the next
    const span = (k + 1 < CUT_BEATS.length ? c.beat(CUT_BEATS[k + 1]) : c.bar(STOP_BAR)) - cutAt;
    this.words.forEach((w, i) => {
      const on = i === picture && span > c.beat(1) * 1.5;
      const slam = smoothstep(0, 0.06, since);
      const out = 1 - smoothstep(span - 0.12, span - 0.02, since);
      w.set({ x: WORD_X, y: WORD_Y, scale: lerp(1.12, 1, slam), opacity: on ? slam * out * (1 - u) : 0 });
    });
  }

  teardown(_layers: SceneLayers): void {
    this.target.dispose();
  }
}
