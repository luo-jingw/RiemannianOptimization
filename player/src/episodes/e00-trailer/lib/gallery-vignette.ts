import type * as THREE from "three";

/** A screen-space overlay drawn on top of a vignette's 3D view (orthographic, 1 unit = 1 output pixel, y up). */
export interface GalleryHud {
  readonly scene: THREE.Scene;
  readonly camera: THREE.OrthographicCamera;
}

/**
 * One 4-bar shot of the application gallery. It owns its own scene and camera; the gallery compositor renders it
 * into an offscreen target so two shots can crossfade on a bar line.
 */
export interface GalleryVignette {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly hud: GalleryHud | null;
  /** Loads external resources (models); resolves once the shot can be drawn completely. */
  preload(): Promise<void>;
  /**
   * Sets every animated property for vignette time `t` in seconds (0 = the vignette's first downbeat).
   * Called for t slightly outside [0, 8] during crossfades.
   */
  draw(t: number): void;
}
