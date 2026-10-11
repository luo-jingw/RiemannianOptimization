import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Cues } from "../../primitives/Cues";
import { smoothstep } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";

/** s07 — quiet end credits: data and model attributions (required by their licences), tools, course source. */
const LINES: { text: string; size: number; color: string; weight?: number; gap: number }[] = [
  { text: "DATA & MODELS", size: 28, color: Palette.orange, weight: 700, gap: 0 },
  { text: "Stanford HARDI diffusion MRI — Rokem et al., Stanford Digital Repository (ODC-PDDL)", size: 30, color: "#c7cee0", gap: 52 },
  { text: "Dry Bean Dataset — M. Koklu & I. A. Ozkan, UCI Machine Learning Repository, doi:10.24432/C50S4B (CC BY 4.0)", size: 30, color: "#c7cee0", gap: 46 },
  { text: "UR5e model — MuJoCo Menagerie (Google DeepMind), © 2018 ROS Industrial Consortium (BSD-3-Clause)", size: 30, color: "#c7cee0", gap: 46 },
  { text: "Skydio X2 model — provided by Skydio via MuJoCo Menagerie (Apache-2.0); converted to glTF, rotor discs split", size: 30, color: "#c7cee0", gap: 46 },
  { text: "PRODUCED WITH", size: 28, color: Palette.orange, weight: 700, gap: 76 },
  { text: "Narration: Kokoro TTS   ·   Music: original, procedurally generated   ·   Rendering: Three.js, KaTeX", size: 30, color: "#c7cee0", gap: 52 },
  { text: "Based on course notes for EECE7223 Riemannian Optimization", size: 30, color: "#c7cee0", gap: 46 },
  { text: "Product names are used for identification only; no endorsement is implied.", size: 24, color: "#8a94b0", gap: 72 },
];
const TOP = 300;
const LEFT = 150;

export class CreditsScene implements Scene {
  readonly id = "s07-credits";
  private handles: FormulaHandle[] = [];
  private ys: number[] = [];

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    let y = TOP;
    for (const line of LINES) {
      y += line.gap;
      this.ys.push(y);
      this.handles.push(layers.formulas.add({ text: line.text, x: LEFT, y, size: line.size, color: line.color,
        weight: line.weight, align: "left" }));
    }
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const fadeIn = smoothstep(c.bar(0.15), c.bar(0.9), t);
    const fadeOut = 1 - smoothstep(ctx.duration - c.bar(0.9), ctx.duration - c.bar(0.1), t);
    this.handles.forEach((h, i) => {
      const lag = i * 0.04;
      h.set({ opacity: smoothstep(c.bar(0.15 + lag), c.bar(0.9 + lag), t) * fadeOut * (fadeIn > 0 ? 1 : 0), y: this.ys[i] });
    });
  }

  teardown(_layers: SceneLayers): void {}
}
