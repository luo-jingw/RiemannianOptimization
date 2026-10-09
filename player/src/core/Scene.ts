import type { SceneLayers } from "./SceneLayers";

/** Measured timing of one chapter, in seconds relative to the chapter start. */
export interface ChapterTiming {
  duration: number;
  sentenceStarts: number[];
  sentenceEnds: number[];
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
  draw(ctx: SceneContext): void;
  teardown(layers: SceneLayers): void;
}

export type SceneFactory = () => Scene;
