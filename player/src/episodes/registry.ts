import type { SceneFactory } from "../core/Scene";
import { e00TestScenes } from "./e00-test/index";
import { e00Scenes } from "./e00-trailer/index";
import { e01Scenes } from "./e01-topology/index";
import { e02Scenes } from "./e02-smooth-manifolds/index";
import { e03Scenes } from "./e03-inverse-function/index";
import { e04Scenes } from "./e04-implicit-level-sets/index";
import { e05Scenes } from "./e05-tangent-orthogonal/index";
import { e06Scenes } from "./e06-gradient-retraction/index";

/** Episode ID -> chapter scenes. Adding an episode adds one import and one entry here. */
export const EPISODE_SCENES: Record<string, Record<string, SceneFactory>> = {
  "e00-test": e00TestScenes,
  "e00-trailer": e00Scenes,
  "e01-topology": e01Scenes,
  "e02-smooth-manifolds": e02Scenes,
  "e03-inverse-function": e03Scenes,
  "e04-implicit-level-sets": e04Scenes,
  "e05-tangent-orthogonal": e05Scenes,
  "e06-gradient-retraction": e06Scenes,
};
