import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import { Cues } from "../../primitives/Cues";
import { clamp01, easeInOutCubic, smoothstep } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";

/**
 * s05 — montage of series shots: eight stills from delivered episodes (content/episodes/e00-trailer/montage.json),
 * one per bar, each slowly pushing in with a gentle alternating pan, crossfading on the bar line.
 */
const SHOTS = 8;
const PX_PER_UNIT = 120;                    // view height 9 world units over 1080 px
const FRAME_W = 1440 / PX_PER_UNIT;         // shot size in world units (16:9)
const FRAME_H = 810 / PX_PER_UNIT;
const CENTER_Y = (540 - 430) / PX_PER_UNIT; // shot centred at y = 430 px, clear of the caption band
const FADE_BARS = 0.12;

interface Shot {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
}

export class MontageScene implements Scene {
  readonly id = "s05-montage";
  private shots: Shot[] = [];
  private border!: Polyline;

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    layers.stage.setView2D(0, 0, 9);
    for (let i = 0; i < SHOTS; i++) {
      const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(FRAME_W, FRAME_H), material);
      mesh.position.set(0, CENTER_Y, -0.01 * i);
      layers.stage.root.add(mesh);
      this.shots.push({ mesh, material });
    }
    const hw = FRAME_W / 2;
    const hh = FRAME_H / 2;
    this.border = new Polyline(layers.stage, [
      new THREE.Vector3(-hw, CENTER_Y - hh, 0.1), new THREE.Vector3(hw, CENTER_Y - hh, 0.1),
      new THREE.Vector3(hw, CENTER_Y + hh, 0.1), new THREE.Vector3(-hw, CENTER_Y + hh, 0.1),
      new THREE.Vector3(-hw, CENTER_Y - hh, 0.1)], { color: Palette.grid, width: 2 });
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
    const bar = c.bar(1);
    const sectionIn = smoothstep(0, 0.3, t);
    const sectionOut = 1 - smoothstep(ctx.duration - 0.35, ctx.duration, t);
    this.shots.forEach((shot, i) => {
      const a = c.bar(i);
      const b = c.bar(i + 1);
      const fade = FADE_BARS * bar;
      // visible from its bar until the next bar, fading in over the previous shot (last shot holds to the end)
      const fadeIn = i === 0 ? 1 : smoothstep(a - fade, a + fade, t);
      const fadeOut = i === SHOTS - 1 ? 1 : 1 - smoothstep(b - fade, b + fade, t);
      const o = clamp01(fadeIn * fadeOut) * sectionIn * sectionOut;
      shot.material.opacity = o;
      shot.mesh.visible = o > 0.001 && shot.material.map !== null;
      const local = easeInOutCubic(clamp01((t - (a - fade)) / (b - a + 2 * fade)));
      const zoom = 1.0 + 0.07 * local;
      const pan = (i % 2 === 0 ? 1 : -1) * 0.25 * (local - 0.5);
      shot.mesh.scale.set(zoom, zoom, 1);
      shot.mesh.position.x = pan;
      shot.mesh.renderOrder = i;
    });
    this.border.setOpacity(0.6 * sectionIn * sectionOut);
  }

  teardown(_layers: SceneLayers): void {
    for (const s of this.shots) s.material.map?.dispose();
  }
}
