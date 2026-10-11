import type * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Cues } from "../../primitives/Cues";
import { smoothstep } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { GalleryCompositor } from "./lib/gallery-compositor";
import { DroneSlamVignette } from "./lib/gallery-drone-slam";
import { DtiBrainVignette } from "./lib/gallery-dti-brain";
import { HyperbolicTreeVignette } from "./lib/gallery-hyperbolic-tree";
import { NeuralNetVignette } from "./lib/gallery-neural-net";
import { PcaSubspaceVignette } from "./lib/gallery-pca-subspace";
import { RobotArmVignette } from "./lib/gallery-robot-arm";
import type { GalleryVignette } from "./lib/gallery-vignette";

/** Bars per vignette; vignette k (0-based) occupies bars 4k .. 4k + 4. */
const BARS_PER_SHOT = 4;
/** Crossfade window around each cut, in seconds relative to the bar line: the new shot is complete on the downbeat. */
const XFADE_BEFORE = 0.4;
const XFADE_AFTER = 0.1;

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
 * E00 s03 — application gallery: six 4-bar vignettes (robot arm, drone loop closure, orthogonal network weights,
 * hyperbolic hierarchy, diffusion tensors, principal subspace). Each vignette renders offscreen; the compositor
 * crossfades consecutive shots across each bar line 4, 8, 12, 16, 20 and adds the depth vignette.
 */
export class GalleryScene implements Scene {
  readonly id = "s03-gallery";
  private shots: GalleryVignette[] = [];
  private labels: FormulaHandle[] = [];
  private compositor!: GalleryCompositor;

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    this.shots = [new RobotArmVignette(), new DroneSlamVignette(), new NeuralNetVignette(), new HyperbolicTreeVignette(), new DtiBrainVignette(), new PcaSubspaceVignette()];
    this.compositor = new GalleryCompositor(layers.stage);
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
    const t = ctx.localTime;
    const shotSeconds = c.bar(BARS_PER_SHOT);
    const n = this.shots.length;
    // Index of the shot that owns time t, and the weight of the next shot inside the crossfade window before a cut.
    const k = Math.max(0, Math.min(n - 1, Math.floor((t + XFADE_BEFORE) / shotSeconds)));
    const cut = (k + 1) * shotSeconds;
    const hasNext = k + 1 < n && t > cut - XFADE_BEFORE;
    const wNext = hasNext ? smoothstep(cut - XFADE_BEFORE, cut + XFADE_AFTER, t) : 0;
    const prevCut = k * shotSeconds;
    const wThis = k > 0 && t < prevCut + XFADE_AFTER ? smoothstep(prevCut - XFADE_BEFORE, prevCut + XFADE_AFTER, t) : 1;

    const current = this.shots[k];
    current.draw(t - prevCut);
    let partner: GalleryVignette | null = null;
    let wPartner = 0;
    if (hasNext) {
      partner = this.shots[k + 1];
      partner.draw(t - cut);
      wPartner = wNext;
    } else if (wThis < 1) {
      partner = this.shots[k - 1];
      partner.draw(t - (prevCut - shotSeconds));
      wPartner = 1 - wThis;
    }
    // Section edges: rise from the background on the first downbeat, settle back before the next section.
    const fade = Math.max(1 - smoothstep(0, 0.3, t), smoothstep(ctx.duration - 0.35, ctx.duration, t));
    this.compositor.compose(current, partner, wPartner, fade);

    for (let i = 0; i < this.labels.length; i++) {
      const start = i * shotSeconds;
      const appear = smoothstep(start + 0.35, start + 0.85, t);
      const leave = 1 - smoothstep(start + shotSeconds - XFADE_BEFORE, start + shotSeconds - 0.05, t);
      const last = i === this.labels.length - 1 ? 1 - smoothstep(ctx.duration - 0.35, ctx.duration, t) : 1;
      const o = i < n ? appear * leave * last : 0;
      this.labels[i].set({ x: LABEL_X + 24 * (1 - appear), y: LABEL_Y, opacity: o });
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
