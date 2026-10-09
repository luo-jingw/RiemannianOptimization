import type { SceneFactory } from "../../core/Scene";
import { TwoQuestionsScene } from "./c01-two-questions";
import { DifferentialByCurvesScene } from "./c02-differential-by-curves";
import { CovectorScene } from "./c03-covector-not-direction";
import { RieszScene } from "./c04-riesz";
import { MetricMattersScene } from "./c05-metric-matters";
import { MetricGradientScene } from "./c06-riemannian-metric-gradient";
import { SteepestAscentScene } from "./c07-steepest-ascent";
import { RetractionScene } from "./c08-retraction";
import { SphereRetractionDescentScene } from "./c09-sphere-retraction-descent";
import { SeriesRecapScene } from "./c10-series-recap";

export const e06Scenes: Record<string, SceneFactory> = {
  "c01-two-questions": () => new TwoQuestionsScene(),
  "c02-differential-by-curves": () => new DifferentialByCurvesScene(),
  "c03-covector-not-direction": () => new CovectorScene(),
  "c04-riesz": () => new RieszScene(),
  "c05-metric-matters": () => new MetricMattersScene(),
  "c06-riemannian-metric-gradient": () => new MetricGradientScene(),
  "c07-steepest-ascent": () => new SteepestAscentScene(),
  "c08-retraction": () => new RetractionScene(),
  "c09-sphere-retraction-descent": () => new SphereRetractionDescentScene(),
  "c10-series-recap": () => new SeriesRecapScene(),
};
