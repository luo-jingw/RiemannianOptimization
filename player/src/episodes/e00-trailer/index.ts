import type { SceneFactory } from "../../core/Scene";
import { FlatScene } from "./s01-flat";
import { FoldScene } from "./s02-fold";
import { GalleryScene } from "./s03-gallery";
import { ToolkitScene } from "./s04-toolkit";
import { MontageScene } from "./s05-montage";
import { TitleScene } from "./s06-title";
import { CreditsScene } from "./s07-credits";

export const e00Scenes: Record<string, SceneFactory> = {
  "s01-flat": () => new FlatScene(),
  "s02-fold": () => new FoldScene(),
  "s03-gallery": () => new GalleryScene(),
  "s04-toolkit": () => new ToolkitScene(),
  "s05-montage": () => new MontageScene(),
  "s06-title": () => new TitleScene(),
  "s07-credits": () => new CreditsScene(),
};
