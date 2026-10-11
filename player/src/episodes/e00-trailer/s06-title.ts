import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { clamp01, lerp, smoothstep } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline, circlePoints } from "../../primitives/Polyline";

/**
 * s06 — title: the circle of fifths completes (all twelve keys light in fifths order, landing on C) as the
 * series title appears; everything fades out in the reverb tail.
 */
const KEYS = ["C", "G", "D", "A", "E", "B", "F♯", "C♯", "A♭", "E♭", "B♭", "F"];
const PX = 120;                                      // px per world unit (view height 9)
const CX = (1580 - 960) / PX;
const CY = (540 - 420) / PX;
const R = 190 / PX;

export class TitleScene implements Scene {
  readonly id = "s06-title";
  private ring!: Polyline;
  private dots: Dot[] = [];
  private labels: FormulaHandle[] = [];
  private glow!: Dot;
  private title!: FormulaHandle;
  private subtitle!: FormulaHandle;
  private tagline!: FormulaHandle;
  private small!: FormulaHandle;
  private s1!: FormulaHandle;

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    const fl = layers.formulas;
    layers.stage.setView2D(0, 0, 9);
    this.ring = new Polyline(layers.stage, circlePoints(CX, CY, R, 180), { color: "#2b3550", width: 3 });
    KEYS.forEach((name, k) => {
      const a = Math.PI / 2 - (k * 2 * Math.PI) / 12;
      const p = new THREE.Vector3(CX + R * Math.cos(a), CY + R * Math.sin(a), 0.05);
      this.dots.push(new Dot(layers.stage, p, "#3a4566", 0.065));
      const lx = 1580 + (R * PX + 40) * Math.cos(a);
      const ly = 420 - (R * PX + 40) * Math.sin(a);
      this.labels.push(fl.add({ text: name, x: lx, y: ly, size: 26, color: "#66708c", weight: 600 }));
    });
    this.glow = new Dot(layers.stage, new THREE.Vector3(CX, CY + R, 0.04), Palette.orange, 0.2);
    this.s1 = fl.add({ tex: "S^1", x: 1580, y: 420, size: 46, color: "#66708c" });
    this.title = fl.add({ text: "Riemannian Optimization", x: 150, y: 330, size: 84, weight: 800, align: "left", color: "#ffffff" });
    this.subtitle = fl.add({ text: "from the Ground Up", x: 150, y: 430, size: 60, weight: 700, align: "left", color: "#ffffff" });
    this.tagline = fl.add({ text: "Full proofs  ·  Animated counterexamples  ·  English / Chinese captions", x: 152, y: 530, size: 28, align: "left", color: Palette.muted });
    this.small = fl.add({ text: "New episodes follow the course.", x: 152, y: 590, size: 26, align: "left", color: "#8a94b0" });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const fadeOut = 1 - smoothstep(c.bar(6.2), c.bar(7.8), t);
    const ringIn = smoothstep(0, c.bar(0.8), t);
    this.ring.setProgress(ringIn);
    this.ring.setOpacity(fadeOut);
    // keys light in fifths order over 1.5 bars; each flashes orange then settles; C ends lit
    const lightStart = c.bar(0.15);
    const lightSpan = c.bar(1.5);
    this.dots.forEach((dot, k) => {
      const tk = lightStart + (k / 12) * lightSpan;
      const flash = smoothstep(tk, tk + 0.12, t) * (1 - smoothstep(tk + 0.25, tk + 0.9, t));
      const visible = smoothstep(tk - 0.05, tk + 0.1, t);
      const isC = k === 0;
      const settledC = isC ? smoothstep(lightStart + lightSpan, lightStart + lightSpan + 0.4, t) : 0;
      dot.setColor(flash > 0.5 || settledC > 0.5 ? Palette.orange : "#46557c");
      dot.setScale(1 + 0.6 * flash + 0.5 * settledC);
      dot.setOpacity(visible * fadeOut);
      const label = this.labels[k];
      label.set({ opacity: visible * fadeOut, color: flash > 0.5 || settledC > 0.5 ? Palette.orange : "#66708c" });
    });
    const cLit = smoothstep(lightStart + lightSpan, lightStart + lightSpan + 0.5, t);
    this.glow.setOpacity(0.18 * cLit * (0.75 + 0.25 * Math.cos(t * 2.4)) * fadeOut);
    this.glow.setScale(1 + 0.15 * Math.sin(t * 1.7));
    this.s1.set({ opacity: ringIn * fadeOut });
    const rise = (start: number): { opacity: number; dy: number } => {
      const p = smoothstep(c.bar(start), c.bar(start + 0.6), t);
      return { opacity: p * fadeOut, dy: lerp(18, 0, p) };
    };
    const a = rise(0.4);
    this.title.set({ opacity: a.opacity, y: 330 + a.dy });
    const b = rise(0.9);
    this.subtitle.set({ opacity: b.opacity, y: 430 + b.dy });
    const d = rise(2.4);
    this.tagline.set({ opacity: d.opacity, y: 530 + d.dy });
    const f = rise(3.0);
    this.small.set({ opacity: clamp01(f.opacity), y: 590 + f.dy });
  }

  teardown(_layers: SceneLayers): void {}
}
