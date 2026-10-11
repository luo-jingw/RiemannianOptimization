import type { SceneFactory } from "../../core/Scene";
import { FlatScene } from "./s01-flat";
import { FoldScene } from "./s02-fold";
import { WorldsScene } from "./s03-worlds";
import { RebuildScene } from "./s04-rebuild";
import { BuildScene } from "./s05-build";
import { DropScene } from "./s06-drop";
import { TitleScene } from "./s07-title";
import { CreditsScene } from "./s08-credits";

export const e00Scenes: Record<string, SceneFactory> = {
  "s01-flat": () => new FlatScene(),
  "s02-fold": () => new FoldScene(),
  "s03-worlds": () => new WorldsScene(),
  "s04-rebuild": () => new RebuildScene(),
  "s05-build": () => new BuildScene(),
  "s06-drop": () => new DropScene(),
  "s07-title": () => new TitleScene(),
  "s08-credits": () => new CreditsScene(),
};
