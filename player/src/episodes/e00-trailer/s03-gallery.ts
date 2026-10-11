import type * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Cues } from "../../primitives/Cues";
import { smoothstep } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { GalleryCompositor, type MatchCut } from "./lib/gallery-compositor";
import { DroneSlamVignette } from "./lib/gallery-drone-slam";
import { DtiBrainVignette } from "./lib/gallery-dti-brain";
import { HyperbolicTreeVignette } from "./lib/gallery-hyperbolic-tree";
import { ManifoldGlyphs } from "./lib/gallery-manifold-glyphs";
import { NeuralNetVignette } from "./lib/gallery-neural-net";
import { PcaSubspaceVignette } from "./lib/gallery-pca-subspace";
import { RobotArmVignette } from "./lib/gallery-robot-arm";
import { GALLERY_SHOT_BARS, PUSH_SECONDS, STOP_SECONDS, VIGNETTE_SECONDS, shotStartBars } from "./lib/gallery-shots";
import type { GalleryVignette } from "./lib/gallery-vignette";

/** Half the length of a match-cut window, in seconds; the shots swap at the cut time. */
const CUT_HALF = 0.3;

interface ShotLabel {
  /** Muted lead-in text (KaTeX text mode). */
  lead: string;
  /** The manifold, in the manifold colour. */
  manifold: string;
}

/** Bottom-right labels, as in content/episodes/e00-trailer/storyboard.md (s03-gallery). */
const LABELS: readonly ShotLabel[] = [
  { lead: "\\text{orientation }\\in\\text{ }", manifold: "\\mathrm{SO}(3)" },
  { lead: "\\text{rotation averaging }\\cdot\\text{ }", manifold: "\\mathrm{SO}(3)^n" },
  { lead: "\\text{orthonormal weights }\\cdot\\text{ }", manifold: "\\text{Stiefel manifold}" },
  { lead: "\\text{hyperbolic embedding }\\cdot\\text{ }", manifold: "\\text{Poincaré disk}" },
  { lead: "\\text{diffusion tensors }\\cdot\\text{ }", manifold: "\\text{SPD matrices}" },
  { lead: "\\text{principal subspace }\\cdot\\text{ }", manifold: "\\text{Grassmann manifold}" },
];

const LABEL_X = 1840;
const LABEL_Y = 806;

/**
 * E00 s03 — application gallery as one accelerating arc: six shots of 6, 5, 4, 3, 3, 3 bars (robot arm, drone loop
 * closure, orthogonal network weights, hyperbolic hierarchy, diffusion tensors, principal subspace). Each shot plays
 * its whole vignette once, rendered offscreen; consecutive shots are joined by match cuts through their key elements,
 * landing an eighth note before the bar line, with the incoming manifold's outline at the pivot. The last shot
 * freezes and fades in the stop that ends the section.
 */
export class GalleryScene implements Scene {
  readonly id = "s03-gallery";
  private shots: GalleryVignette[] = [];
  private labels: FormulaHandle[] = [];
  private compositor!: GalleryCompositor;
  private glyphs!: ManifoldGlyphs;

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    this.shots = [new RobotArmVignette(), new DroneSlamVignette(), new NeuralNetVignette(), new HyperbolicTreeVignette(), new DtiBrainVignette(), new PcaSubspaceVignette()];
    this.compositor = new GalleryCompositor(layers.stage);
    this.glyphs = new ManifoldGlyphs(layers.stage);
    this.labels = LABELS.map((l) => layers.formulas.add({
      tex: `\\textcolor{${Palette.muted}}{${l.lead}}\\textcolor{${Palette.blue}}{${l.manifold}}`,
      x: LABEL_X, y: LABEL_Y, size: 30, align: "right", valign: "bottom", opacity: 0,
    }));
  }

  async preload(): Promise<void> {
    await Promise.all(this.shots.map((s) => s.preload()));
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const n = this.shots.length;
    const starts = shotStartBars().map((bar) => c.bar(bar));
    const lengths = GALLERY_SHOT_BARS.map((bars) => c.bar(bars));
    const cuts = starts.map((s, i) => (i === 0 ? -Infinity : s - PUSH_SECONDS));
    const freezeAt = ctx.duration - STOP_SECONDS;
    const t = Math.min(ctx.localTime, freezeAt);         // the last shot holds its frame through the stop
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
    // Section edges: rise from the background on the first downbeat; fade out during the stop.
    const fade = Math.max(1 - smoothstep(0, 0.3, ctx.localTime), smoothstep(freezeAt + 0.05, ctx.duration - 0.1, ctx.localTime));
    const pivot = this.compositor.compose(current, cut, fade);
    if (cut !== null) this.glyphs.show(into, pivot, cut.progress);
    else this.glyphs.hide();

    for (let i = 0; i < this.labels.length; i++) {
      const from = i === 0 ? 0 : cuts[i] + CUT_HALF;
      const to = i + 1 < n ? cuts[i + 1] - CUT_HALF : freezeAt;
      const appear = smoothstep(from + 0.2, from + 0.6, ctx.localTime);
      const leave = 1 - smoothstep(to - 0.25, to, ctx.localTime);
      this.labels[i].set({ x: LABEL_X + 24 * (1 - appear), y: LABEL_Y, opacity: appear * leave });
    }
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
