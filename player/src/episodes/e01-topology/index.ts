import type { SceneFactory } from "../../core/Scene";
import { WhyCurvedScene } from "./c01-why-curved";
import { MetricBallsScene } from "./c02-metric-and-balls";
import { TopologyAxiomsScene } from "./c03-topology-axioms";
import { ConvergenceScene } from "./c04-convergence";
import { ContinuityScene } from "./c05-continuity";
import { PreimageNotImageScene } from "./c06-preimage-not-image";
import { HomeomorphismScene } from "./c07-homeomorphism";
import { ContinuousInverseScene } from "./c08-continuous-inverse";
import { BridgeToChartsScene } from "./c09-bridge-to-charts";

export const e01Scenes: Record<string, SceneFactory> = {
  "c01-why-curved": () => new WhyCurvedScene(),
  "c02-metric-and-balls": () => new MetricBallsScene(),
  "c03-topology-axioms": () => new TopologyAxiomsScene(),
  "c04-convergence": () => new ConvergenceScene(),
  "c05-continuity": () => new ContinuityScene(),
  "c06-preimage-not-image": () => new PreimageNotImageScene(),
  "c07-homeomorphism": () => new HomeomorphismScene(),
  "c08-continuous-inverse": () => new ContinuousInverseScene(),
  "c09-bridge-to-charts": () => new BridgeToChartsScene(),
};
