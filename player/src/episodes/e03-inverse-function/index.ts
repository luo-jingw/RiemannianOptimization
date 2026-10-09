import type { SceneFactory } from "../../core/Scene";
import { WhyIftScene } from "./c01-why-ift";
import { DerivativeScene } from "./c02-derivative-as-linear-map";
import { IftStatementScene } from "./c03-ift-statement";
import { IftNecessityScene } from "./c04-ift-necessity";
import { ContractionScene } from "./c05-contraction-principle";
import { ContractionNecessityScene } from "./c06-contraction-necessity";
import { IftInjectiveScene } from "./c07-ift-proof-injective";
import { IftOpenScene } from "./c08-ift-proof-open";
import { IftDerivativeScene } from "./c09-ift-proof-derivative";
import { WhatIftBuysScene } from "./c10-what-ift-buys";

export const e03Scenes: Record<string, SceneFactory> = {
  "c01-why-ift": () => new WhyIftScene(),
  "c02-derivative-as-linear-map": () => new DerivativeScene(),
  "c03-ift-statement": () => new IftStatementScene(),
  "c04-ift-necessity": () => new IftNecessityScene(),
  "c05-contraction-principle": () => new ContractionScene(),
  "c06-contraction-necessity": () => new ContractionNecessityScene(),
  "c07-ift-proof-injective": () => new IftInjectiveScene(),
  "c08-ift-proof-open": () => new IftOpenScene(),
  "c09-ift-proof-derivative": () => new IftDerivativeScene(),
  "c10-what-ift-buys": () => new WhatIftBuysScene(),
};
