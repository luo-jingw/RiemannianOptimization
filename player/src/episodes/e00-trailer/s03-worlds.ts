import type * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Cues } from "../../primitives/Cues";
import { clamp01, easeInOutCubic, lerp, smoothstep } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { GalleryCompositor, type MatchCut } from "./lib/gallery-compositor";
import { DroneSlamVignette } from "./lib/gallery-drone-slam";
import { DtiBrainVignette } from "./lib/gallery-dti-brain";
import { HyperbolicTreeVignette } from "./lib/gallery-hyperbolic-tree";
import { ManifoldGlyphs } from "./lib/gallery-manifold-glyphs";
import { NeuralNetVignette } from "./lib/gallery-neural-net";
import { PcaSubspaceVignette } from "./lib/gallery-pca-subspace";
import { RobotArmVignette } from "./lib/gallery-robot-arm";
import { GALLERY_SHOT_BARS, PUSH_SECONDS, VIGNETTE_SECONDS, shotStartBars } from "./lib/gallery-shots";
import type { GalleryVignette } from "./lib/gallery-vignette";

/** Half the length of a match-cut window, in seconds; the shots swap at the cut time. */
const CUT_HALF = 0.3;

interface ShotLabel {
  /** The field, flashed large on the cut. */
  word: string;
  /** Muted lead-in text (KaTeX text mode). */
  lead: string;
  /** The manifold, in the manifold colour. */
  manifold: string;
}

/** Bottom-right labels, as in content/episodes/e00-trailer/storyboard.md (s03-gallery). */
const LABELS: readonly ShotLabel[] = [
  { word: "ROBOTICS", lead: "\\text{orientation }\\in\\text{ }", manifold: "\\mathrm{SO}(3)" },
  { word: "SLAM", lead: "\\text{rotation averaging }\\cdot\\text{ }", manifold: "\\mathrm{SO}(3)^n" },
  { word: "DEEP LEARNING", lead: "\\text{orthonormal weights }\\cdot\\text{ }", manifold: "\\text{Stiefel manifold}" },
  { word: "HIERARCHIES", lead: "\\text{hyperbolic embedding }\\cdot\\text{ }", manifold: "\\text{Poincaré disk}" },
  { word: "NEUROIMAGING", lead: "\\text{diffusion tensors }\\cdot\\text{ }", manifold: "\\text{SPD matrices}" },
  { word: "DATA", lead: "\\text{principal subspace }\\cdot\\text{ }", manifold: "\\text{Grassmann manifold}" },
];

const LABEL_X = 1840;
const LABEL_Y = 806;

/** The big word flashed on each cut: centre of the frame, then it shrinks into the corner label. */
const WORD_X = 960;
const WORD_Y = 470;
const WORD_SIZE = 150;
const WORD_HOLD = 0.45;                           // seconds at full size after the cut
const WORD_SETTLE = 0.3;                          // seconds to shrink into the corner

/**
 * E00 s03-worlds — six real worlds as one accelerating arc: shots of 4, 3, 3, 2, 2, 2 bars (robot arm, drone loop
 * closure, orthogonal network weights, hyperbolic hierarchy, diffusion tensors, principal subspace). Each shot plays
 * its whole vignette once, rendered offscreen; consecutive shots are joined by match cuts through their key elements,
 * landing an eighth note before the bar line, with the incoming manifold's outline at the pivot. On every cut the
 * field's name flashes large and settles into the corner label. The section is entered and left by zoom-throughs on
 * the first and last shots' key elements.
 */
export class WorldsScene implements Scene {
  readonly id = "s03-worlds";
  private shots: GalleryVignette[] = [];
  private labels: FormulaHandle[] = [];
  private words: FormulaHandle[] = [];
  private compositor!: GalleryCompositor;
  private glyphs!: ManifoldGlyphs;
  private shown: GalleryVignette | null = null;

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    this.shots = [new RobotArmVignette(), new DroneSlamVignette(), new NeuralNetVignette(), new HyperbolicTreeVignette(), new DtiBrainVignette(), new PcaSubspaceVignette()];
    this.compositor = new GalleryCompositor(layers.stage);
    this.glyphs = new ManifoldGlyphs(layers.stage);
    this.labels = LABELS.map((l) => layers.formulas.add({
      tex: `\\textcolor{${Palette.muted}}{${l.lead}}\\textcolor{${Palette.blue}}{${l.manifold}}`,
      x: LABEL_X, y: LABEL_Y, size: 30, align: "right", valign: "bottom", opacity: 0,
    }));
    this.words = LABELS.map((l) => layers.formulas.add({
      text: l.word, x: WORD_X, y: WORD_Y, size: WORD_SIZE, weight: 800, color: "#f4f6fb", opacity: 0,
    }));
  }

  async preload(): Promise<void> {
    await Promise.all(this.shots.map((s) => s.preload()));
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = ctx.localTime;
    const n = this.shots.length;
    const starts = shotStartBars().map((bar) => c.bar(bar));
    const lengths = GALLERY_SHOT_BARS.map((bars) => c.bar(bars));
    const cuts = starts.map((s, i) => (i === 0 ? -Infinity : s - PUSH_SECONDS));
    const vignetteTime = (i: number): number => ((t - starts[i]) * VIGNETTE_SECONDS) / lengths[i];

    // the shot that owns t, and the match cut in progress (if t is inside a cut window)
    let k = 0;
    for (let i = 1; i < n; i++) if (t >= cuts[i]) k = i;
    let into = -1;
    for (let i = 1; i < n; i++) if (Math.abs(t - cuts[i]) < CUT_HALF) into = i;

    let cut: MatchCut | null = null;
    let current: GalleryVignette;
    if (into > 0) {
      current = this.shots[into - 1];
      current.draw(vignetteTime(into - 1));
      const next = this.shots[into];
      next.draw(vignetteTime(into));
      cut = { next, focusA: current.matchPoint(), focusB: next.matchPoint(), progress: (t - (cuts[into] - CUT_HALF)) / (2 * CUT_HALF) };
    } else {
      current = this.shots[k];
      current.draw(vignetteTime(k));
    }
    this.shown = cut !== null && cut.progress >= 0.5 ? cut.next : current;
    const pivot = this.compositor.compose(current, cut, 0);
    if (cut !== null) this.glyphs.show(into, pivot, cut.progress);
    else this.glyphs.hide();

    for (let i = 0; i < n; i++) {
      const at = i === 0 ? 0.1 : cuts[i];          // the moment the shot takes over the frame
      const until = i + 1 < n ? cuts[i + 1] - CUT_HALF : ctx.duration - 0.3;
      // big word: slams in on the cut, holds, then shrinks into the corner label and hands over to it
      const slam = smoothstep(at - 0.02, at + 0.08, t);
      const settle = easeInOutCubic(clamp01((t - at - WORD_HOLD) / WORD_SETTLE));
      const wordOn = slam * (1 - smoothstep(at + WORD_HOLD + WORD_SETTLE * 0.6, at + WORD_HOLD + WORD_SETTLE, t));
      this.words[i].set({
        x: lerp(WORD_X, LABEL_X - 200, settle), y: lerp(WORD_Y, LABEL_Y - 20, settle),
        scale: lerp(1.15, 1, slam) * lerp(1, 0.2, settle), opacity: t < until ? wordOn : 0,
      });
      const labelOn = smoothstep(at + WORD_HOLD + WORD_SETTLE * 0.5, at + WORD_HOLD + WORD_SETTLE, t);
      const leave = 1 - smoothstep(until - 0.2, until, t);
      this.labels[i].set({ x: LABEL_X, y: LABEL_Y, opacity: labelOn * leave });
    }
  }

  /** The zoom-through from s02 comes out of the robot arm's end effector. */
  entryPoint(): THREE.Vector2 {
    return this.shots[0].matchPoint();
  }

  /** The zoom-through into s04 enters the point cloud's centre. */
  exitPoint(): THREE.Vector2 {
    return (this.shown ?? this.shots[this.shots.length - 1]).matchPoint();
  }

  teardown(_layers: SceneLayers): void {
    this.compositor.dispose();
    // Shot scenes live outside the stage root, so the stage does not dispose them.
    for (const shot of this.shots) {
      const roots: THREE.Object3D[] = shot.hud !== null ? [shot.scene, shot.hud.scene] : [shot.scene];
      for (const root of roots) {
        root.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          const mat = (mesh as { material?: THREE.Material | THREE.Material[] }).material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else if (mat) mat.dispose();
        });
      }
    }
  }
}
