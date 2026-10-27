import type { SceneFactory } from "../../core/Scene";
import { WhyNewDerivativeScene } from "./c01-why-new-derivative";
import { VectorFieldsBracketsScene } from "./c02-vector-fields-brackets";
import { AffineConnectionsScene } from "./c03-affine-connections";
import { ChristoffelSymbolsScene } from "./c04-christoffel-symbols";
import { CompatibilityTorsionScene } from "./c05-compatibility-torsion";
import { FundamentalTheoremScene } from "./c06-fundamental-theorem";
import { SubmanifoldConnectionScene } from "./c07-submanifold-connection";
import { GeodesicsScene } from "./c08-geodesics";
import { ExponentialMapScene } from "./c09-exponential-map";
import { ParallelTransportScene } from "./c10-parallel-transport";
import { RecapScene } from "./c11-recap";

export const e08Scenes: Record<string, SceneFactory> = {
  "c01-why-new-derivative": () => new WhyNewDerivativeScene(),
  "c02-vector-fields-brackets": () => new VectorFieldsBracketsScene(),
  "c03-affine-connections": () => new AffineConnectionsScene(),
  "c04-christoffel-symbols": () => new ChristoffelSymbolsScene(),
  "c05-compatibility-torsion": () => new CompatibilityTorsionScene(),
  "c06-fundamental-theorem": () => new FundamentalTheoremScene(),
  "c07-submanifold-connection": () => new SubmanifoldConnectionScene(),
  "c08-geodesics": () => new GeodesicsScene(),
  "c09-exponential-map": () => new ExponentialMapScene(),
  "c10-parallel-transport": () => new ParallelTransportScene(),
  "c11-recap": () => new RecapScene(),
};
