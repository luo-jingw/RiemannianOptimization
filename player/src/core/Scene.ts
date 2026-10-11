import type * as THREE from "three";
import type { SceneLayers } from "./SceneLayers";

/** Measured timing of one chapter, in seconds relative to the chapter start. */
export interface ChapterTiming {
  duration: number;
  sentenceStarts: number[];
  sentenceEnds: number[];
  /** Trailers only: start of every beat (4 per bar, tempo map applied), then the chapter end. */
  beatTimes?: number[];
}

/** Per-frame input for a chapter scene. */
export interface SceneContext extends ChapterTiming {
  localTime: number;
  layers: SceneLayers;
}

/**
 * One chapter's visuals. draw() must be a pure function of ctx: the same localTime
 * always produces the same frame, regardless of the order in which frames are requested.
 */
export interface Scene {
  readonly id: string;
  setup(layers: SceneLayers, timing: ChapterTiming): void;
  /**
   * Optional: resources (e.g. image textures) the scene needs before its first frame. The renderer awaits it
   * after setup and redraws, so captured frames never depend on load timing.
   */
  preload?(): Promise<void>;
  draw(ctx: SceneContext): void;
  /**
   * Trailers, optional: frame uv (0..1, y up) of the element the outgoing zoom-through goes into, as of the last
   * draw. A scene without it ends without a transition.
   */
  exitPoint?(): THREE.Vector2;
  /** Trailers, optional: frame uv of the element the incoming zoom-through comes out of, as of the last draw. */
  entryPoint?(): THREE.Vector2;
  teardown(layers: SceneLayers): void;
}

export type SceneFactory = () => Scene;
