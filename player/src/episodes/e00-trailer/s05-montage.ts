import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import { Cues } from "../../primitives/Cues";
import { clamp01, easeInOutCubic, lerp, smoothstep } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";

/**
 * s05 — montage as a fly-in mosaic. Eight stills from delivered episodes (content/episodes/e00-trailer/montage.json),
 * one per bar: each shot first plays large in the centre, pushing in *inside* its frame (texture zoom, so it never
 * leaves its border), then flies into its slot of a 4×2 wall. The full wall is the closing image of the section.
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
    for (let i = 0; i < SHOTS; i++) {
      const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
      stage.root.add(mesh);
      const border = new Polyline(stage, rectPoints(slotRect(i), 0.01), { color: Palette.grid, width: 2 });
      this.shots.push({ mesh, material, border });
    }
  }

  async preload(): Promise<void> {
    const loader = new THREE.TextureLoader();
    const textures = await Promise.all(this.shots.map((_, i) =>
      loader.loadAsync(`${import.meta.env.BASE_URL}trailer-montage/${String(i + 1).padStart(2, "0")}.jpg`)));
    textures.forEach((tex, i) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      this.shots[i].material.map = tex;
      this.shots[i].material.needsUpdate = true;
    });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const sectionIn = smoothstep(0, 0.35, t);
    const sectionOut = 1 - smoothstep(ctx.duration - 0.45, ctx.duration, t);
    const fade = sectionIn * sectionOut;
    let bigness = 0;                                // how much a large shot is on screen (dims the wall behind it)

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
      shot.mesh.visible = o > 0.001 && shot.material.map !== null;

      // push-in inside the frame: zoom the texture, not the plane (never crosses the border)
      const tex = shot.material.map;
      if (tex) {
        const zoom = local < FLY_END ? 1 + 0.08 * easeInOutCubic(clamp01(local / FLY_END)) : 1.08 + 0.02 * Math.sin(0.6 * t + i);
        const panX = (i % 2 === 0 ? 1 : -1) * 0.02 * clamp01(local);
        tex.repeat.set(1 / zoom, 1 / zoom);
        tex.offset.set((1 - 1 / zoom) / 2 + panX * (1 - 1 / zoom) * 4, (1 - 1 / zoom) / 2);
      }

      // border follows the frame; the shot being shown is highlighted
      const current = t >= a - 0.12 && local < 1;
      shot.border.setPoints(rectPoints(r, local < FLY_END ? 1.01 : 0.03));
      shot.border.setColor(current ? Palette.orange : Palette.grid);
      shot.border.setWidth(current ? 3 : 2);
      shot.border.setOpacity(o * (current ? 1 : 0.8));
      if (local >= 0 && local < FLY_END) bigness = Math.max(bigness, appear * (1 - fly));
    });

    this.dimMaterial.opacity = 0.55 * bigness * fade;
    this.dim.visible = this.dimMaterial.opacity > 0.001;
  }

  teardown(_layers: SceneLayers): void {
    for (const s of this.shots) s.material.map?.dispose();
  }
}
