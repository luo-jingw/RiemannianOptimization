import type { SceneFactory } from "../../core/Scene";
import { WhyEquationsScene } from "./c01-why-equations";
import { CircleLinearScene } from "./c02-circle-and-linear";
import { IftProofScene } from "./c03-ift-proof";
import { ImplicitDerivativeScene } from "./c04-implicit-derivative";
import { RegularValueScene } from "./c05-regular-value";
import { LevelSetTheoremScene } from "./c06-level-set-theorem";
import { SphereScene } from "./c07-sphere";
import { RegularityFailsScene } from "./c08-when-regularity-fails";
import { RecapBridgeScene } from "./c09-recap-bridge";

export const e04Scenes: Record<string, SceneFactory> = {
  "c01-why-equations": () => new WhyEquationsScene(),
  "c02-circle-and-linear": () => new CircleLinearScene(),
  "c03-ift-proof": () => new IftProofScene(),
  "c04-implicit-derivative": () => new ImplicitDerivativeScene(),
  "c05-regular-value": () => new RegularValueScene(),
  "c06-level-set-theorem": () => new LevelSetTheoremScene(),
  "c07-sphere": () => new SphereScene(),
  "c08-when-regularity-fails": () => new RegularityFailsScene(),
  "c09-recap-bridge": () => new RecapBridgeScene(),
};
