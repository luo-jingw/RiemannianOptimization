import type { ChapterTiming, Scene, SceneContext } from "./Scene";
import type { SceneLayers } from "./SceneLayers";
import type { TimelineChapter } from "./Timeline";
import type { FormulaHandle } from "../layers/FormulaLayer";

/** Shown for chapters without an implemented scene. Capture refuses to run while any exist. */
export class PlaceholderScene implements Scene {
  readonly id: string;
  private label: FormulaHandle | null = null;

  constructor(private readonly chapter: TimelineChapter) {
    this.id = chapter.id;
  }

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    this.label = layers.formulas.add({ text: `[scene not implemented] ${this.chapter.id}`, x: 960, y: 420, size: 40, color: "#ff6b6b", opacity: 1 });
  }

  draw(_ctx: SceneContext): void {
    this.label?.set({ opacity: 1 });
  }

  teardown(_layers: SceneLayers): void {
    this.label = null;
  }
}
