import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import { Cues } from "../../primitives/Cues";
import { clamp01, easeInOutCubic, lerp, smoothstep } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { type MiniViz, TILE_PX_H, TILE_PX_W } from "./lib/montage-kit";
import { ChartsViz } from "./lib/montage-viz-charts";
import { CobwebViz } from "./lib/montage-viz-cobweb";
import { ConvergenceViz } from "./lib/montage-viz-convergence";
import { FlattenViz } from "./lib/montage-viz-flatten";
import { InverseViz } from "./lib/montage-viz-inverse";
import { RetractionViz } from "./lib/montage-viz-retraction";
import { RotationViz } from "./lib/montage-viz-rotation";
import { TangentViz } from "./lib/montage-viz-tangent";

/**
 * s05 — montage as a fly-in mosaic of eight live visualizations, one per core idea of the series (lib/montage-viz-*).
 * Each tile renders its own mini scene into a render target every frame. One tile per bar: it first plays large in
 * the centre, gently pushing in inside its frame, then flies into its slot of a 4×2 wall, where it keeps animating.
 */
const SHOTS = 8;
const PX = 120;                                   // px per world unit (view height 9 over 1080 px)
const COLS = 4;
const TILE_W = 400;
const TILE_H = 225;
const GAP = 28;
const GRID_LEFT = (1920 - (COLS * TILE_W + (COLS - 1) * GAP)) / 2;
const GRID_TOP = 191;
const BIG_W = 1200;
const BIG_H = 675;
const BIG_CY = 430;
const BIG_PHASE = 0.55;                           // fraction of the bar spent large
const FLY_END = 0.95;                             // fraction of the bar when the shot has landed

interface Rect {
  cx: number;                                     // px
  cy: number;
  w: number;
  h: number;
}

interface Shot {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  border: Polyline;
  viz: MiniViz;
  target: THREE.WebGLRenderTarget;
  label: FormulaHandle;
}

function slotRect(i: number): Rect {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  return { cx: GRID_LEFT + TILE_W / 2 + col * (TILE_W + GAP), cy: GRID_TOP + TILE_H / 2 + row * (TILE_H + GAP), w: TILE_W, h: TILE_H };
}

function rectPoints(r: Rect, z: number): THREE.Vector3[] {
  const x0 = (r.cx - r.w / 2 - 960) / PX;
  const x1 = (r.cx + r.w / 2 - 960) / PX;
  const y0 = (540 - (r.cy + r.h / 2)) / PX;
  const y1 = (540 - (r.cy - r.h / 2)) / PX;
  return [new THREE.Vector3(x0, y0, z), new THREE.Vector3(x1, y0, z), new THREE.Vector3(x1, y1, z),
    new THREE.Vector3(x0, y1, z), new THREE.Vector3(x0, y0, z)];
}

export class MontageScene implements Scene {
  readonly id = "s05-montage";
  private shots: Shot[] = [];
  private placeholders: Polyline[] = [];
  private dim!: THREE.Mesh;
  private dimMaterial!: THREE.MeshBasicMaterial;

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    const stage = layers.stage;
    stage.setView2D(0, 0, 9);
    for (let i = 0; i < SHOTS; i++) {
      this.placeholders.push(new Polyline(stage, rectPoints(slotRect(i), 0), { color: Palette.grid, width: 1.5 }));
    }
    this.dimMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color("#05070d"), transparent: true, opacity: 0, depthWrite: false });
    this.dim = new THREE.Mesh(new THREE.PlaneGeometry(1920 / PX, 1080 / PX), this.dimMaterial);
    this.dim.position.z = 0.5;
    this.dim.renderOrder = 50;
    stage.root.add(this.dim);
    const vizzes: MiniViz[] = [new ConvergenceViz(), new ChartsViz(), new InverseViz(), new CobwebViz(),
      new FlattenViz(), new TangentViz(), new RotationViz(), new RetractionViz()];
    vizzes.forEach((viz, i) => {
      const target = new THREE.WebGLRenderTarget(TILE_PX_W, TILE_PX_H, { samples: 4, type: THREE.HalfFloatType });
      const material = new THREE.MeshBasicMaterial({ map: target.texture, transparent: true, opacity: 0, depthWrite: false });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
      stage.root.add(mesh);
      const border = new Polyline(stage, rectPoints(slotRect(i), 0.01), { color: Palette.grid, width: 2 });
      const label = layers.formulas.add({ text: viz.label, x: 0, y: 0, size: 30, weight: 600, align: "left", valign: "bottom", color: "#e8ecf4" });
      this.shots.push({ mesh, material, border, viz, target, label });
    });
  }

  draw(ctx: SceneContext): void {
    const renderer = ctx.layers.stage.renderer;
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const sectionIn = smoothstep(0, 0.35, t);
    const sectionOut = 1 - smoothstep(ctx.duration - 0.45, ctx.duration, t);
    const fade = sectionIn * sectionOut;
    // how much a large shot is on screen (dims the wall behind it and hides the wall's labels)
    let bigness = 0;
    for (let i = 0; i < SHOTS; i++) {
      const local = (t - c.bar(i)) / c.bar(1);
      const appear = i === 0 ? smoothstep(0, 0.35, t) : smoothstep(c.bar(i) - 0.12, c.bar(i) + 0.18, t);
      if (local >= -0.1 && local < FLY_END) bigness = Math.max(bigness, appear * (1 - easeInOutCubic(clamp01((local - BIG_PHASE) / (FLY_END - BIG_PHASE)))));
    }

    this.placeholders.forEach((p, i) => p.setOpacity(0.5 * fade * (1 - smoothstep(c.bar(i + FLY_END - 0.1), c.bar(i + FLY_END), t))));

    this.shots.forEach((shot, i) => {
      const a = c.bar(i);
      const local = (t - a) / c.bar(1);             // 0..1 across this shot's bar
      const appear = i === 0 ? smoothstep(0, 0.35, t) : smoothstep(a - 0.12, a + 0.18, t);
      const fly = easeInOutCubic(clamp01((local - BIG_PHASE) / (FLY_END - BIG_PHASE)));
      const big: Rect = { cx: 960, cy: BIG_CY, w: BIG_W, h: BIG_H };
      const slot = slotRect(i);
      const entering = 0.94 + 0.06 * easeInOutCubic(clamp01(local / 0.2));
      const r: Rect = {
        cx: lerp(big.cx, slot.cx, fly), cy: lerp(big.cy, slot.cy, fly),
        w: lerp(big.w * entering, slot.w, fly), h: lerp(big.h * entering, slot.h, fly),
      };
      shot.mesh.position.set((r.cx - 960) / PX, (540 - r.cy) / PX, local < FLY_END ? 1 : 0.02 + 0.001 * i);
      shot.mesh.scale.set(r.w / PX, r.h / PX, 1);
      shot.mesh.renderOrder = local < FLY_END ? 100 : 10 + i;
      const o = appear * fade;
      shot.material.opacity = o;
      shot.mesh.visible = o > 0.001;
      if (shot.mesh.visible) {
        // the tile's live animation, rendered into its own target (time continues after it lands on the wall)
        shot.viz.update(Math.max(0, t - a + 0.6));
        renderer.setRenderTarget(shot.target);
        renderer.render(shot.viz.scene, shot.viz.camera);
        renderer.setRenderTarget(null);
      }
      // gentle push-in inside the frame: zoom the texture, not the plane (never crosses the border)
      const zoom = 1 + 0.05 * easeInOutCubic(clamp01(local / FLY_END));
      shot.target.texture.repeat.set(1 / zoom, 1 / zoom);
      shot.target.texture.offset.set((1 - 1 / zoom) / 2, (1 - 1 / zoom) / 2);
      const scaleLabel = r.w / BIG_W;
      const labelOpacity = local < FLY_END ? o : o * (1 - bigness);
      shot.label.set({ x: r.cx - r.w / 2 + 24 * scaleLabel, y: r.cy + r.h / 2 - 18 * scaleLabel, scale: Math.max(0.5, scaleLabel), opacity: labelOpacity });

      // border follows the frame; the shot being shown is highlighted
      const current = t >= a - 0.12 && local < 1;
      shot.border.setPoints(rectPoints(r, local < FLY_END ? 1.01 : 0.03));
      shot.border.setColor(current ? Palette.orange : Palette.grid);
      shot.border.setWidth(current ? 3 : 2);
      shot.border.setOpacity(o * (current ? 1 : 0.8));
    });

    this.dimMaterial.opacity = 0.55 * bigness * fade;
    this.dim.visible = this.dimMaterial.opacity > 0.001;
  }

  teardown(_layers: SceneLayers): void {
    for (const s of this.shots) s.target.dispose();
  }
}
