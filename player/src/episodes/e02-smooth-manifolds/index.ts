import type { SceneFactory } from "../../core/Scene";
import { RecapE01Scene } from "./c01-recap-e01";
import { ChartsOnCircleScene } from "./c02-charts-on-the-circle";
import { TopologicalManifoldScene } from "./c03-topological-manifold";
import { TransitionMapsScene } from "./c04-transition-maps";
import { WhyCompatibilityScene } from "./c05-why-compatibility";
import { SmoothMapsScene } from "./c06-smooth-maps";
import { DiffeomorphismScene } from "./c07-diffeomorphism";
import { IntrinsicExtrinsicScene } from "./c08-intrinsic-vs-extrinsic";

export const e02Scenes: Record<string, SceneFactory> = {
  "c01-recap-e01": () => new RecapE01Scene(),
  "c02-charts-on-the-circle": () => new ChartsOnCircleScene(),
  "c03-topological-manifold": () => new TopologicalManifoldScene(),
  "c04-transition-maps": () => new TransitionMapsScene(),
  "c05-why-compatibility": () => new WhyCompatibilityScene(),
  "c06-smooth-maps": () => new SmoothMapsScene(),
  "c07-diffeomorphism": () => new DiffeomorphismScene(),
  "c08-intrinsic-vs-extrinsic": () => new IntrinsicExtrinsicScene(),
};
