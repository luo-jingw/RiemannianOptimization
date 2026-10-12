import type { SceneFactory } from "../../core/Scene";
import { ProblemAndSequencesScene } from "./c01-problem-and-sequences";
import { TaylorOnCurvesScene } from "./c02-taylor-on-curves";
import { CriticalPointsScene } from "./c03-critical-points";
import { RgdSufficientDecreaseScene } from "./c04-rgd-and-sufficient-decrease";
import { LipschitzTypeScene } from "./c05-lipschitz-type-condition";
import { BacktrackingScene } from "./c06-backtracking";
import { LocalConvergenceScene } from "./c07-local-convergence";
import { ComputingGradientsScene } from "./c08-computing-gradients";
import { CheckingGradientsScene } from "./c09-checking-gradients";
import { RecapScene } from "./c10-recap";

export const e07Scenes: Record<string, SceneFactory> = {
  "c01-problem-and-sequences": () => new ProblemAndSequencesScene(),
  "c02-taylor-on-curves": () => new TaylorOnCurvesScene(),
  "c03-critical-points": () => new CriticalPointsScene(),
  "c04-rgd-and-sufficient-decrease": () => new RgdSufficientDecreaseScene(),
  "c05-lipschitz-type-condition": () => new LipschitzTypeScene(),
  "c06-backtracking": () => new BacktrackingScene(),
  "c07-local-convergence": () => new LocalConvergenceScene(),
  "c08-computing-gradients": () => new ComputingGradientsScene(),
  "c09-checking-gradients": () => new CheckingGradientsScene(),
  "c10-recap": () => new RecapScene(),
};
