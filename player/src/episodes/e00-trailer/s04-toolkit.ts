import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";

/** Placeholder: replaced by the real section (see content/episodes/e00-trailer/storyboard.md). */
export class ToolkitScene implements Scene {
  readonly id = "s04-toolkit";
  setup(_layers: SceneLayers, _timing: ChapterTiming): void {}
  draw(_ctx: SceneContext): void {}
  teardown(_layers: SceneLayers): void {}
}
