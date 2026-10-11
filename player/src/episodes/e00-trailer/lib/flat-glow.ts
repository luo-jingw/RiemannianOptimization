import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";

/** Radial falloff texture drawn on a canvas; the drawing is fixed, so frames stay deterministic. */
function haloTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Glow: 2D canvas unavailable");
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.18, "rgba(255,255,255,0.55)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.16)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Additive soft halo (camera-facing sprite) used to make points and tips glow. */
export class Glow {
  readonly sprite: THREE.Sprite;
  private readonly material: THREE.SpriteMaterial;
  private readonly peak: number;
  private readonly baseSize: number;

  /**
   * @param size world-space diameter of the halo at scale 1
   * @param peak opacity at full intensity
   */
  constructor(stage: StageLayer, color: string, size: number, peak = 0.7, depthTest = true) {
    this.material = new THREE.SpriteMaterial({
      map: haloTexture(),
      color: new THREE.Color(color),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      depthTest,
      opacity: 0,
    });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.renderOrder = 20;
    this.peak = peak;
    this.baseSize = size;
    this.sprite.scale.set(size, size, 1);
    stage.root.add(this.sprite);
  }

  /** Position, intensity in [0, 1] and size multiplier. Call every frame. */
  set(position: THREE.Vector3, intensity: number, scale = 1): void {
    this.sprite.position.copy(position);
    this.material.opacity = this.peak * Math.max(0, Math.min(1, intensity));
    this.sprite.visible = this.material.opacity > 0.001;
    this.sprite.scale.set(this.baseSize * scale, this.baseSize * scale, 1);
  }

  setColor(color: string): void {
    this.material.color.set(color);
  }
}
