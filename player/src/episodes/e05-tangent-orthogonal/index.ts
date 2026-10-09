import type { SceneFactory } from "../../core/Scene";
import { WhyDirectionsScene } from "./c01-why-directions";
import { TangentByCurvesScene } from "./c02-tangent-by-curves";
import { RankNullityScene } from "./c03-rank-nullity";
import { KernelContainsTangentScene } from "./c04-kernel-contains-tangent";
import { TangentEqualsKernelScene } from "./c05-tangent-equals-kernel";
import { RegularitySphereScene } from "./c06-regularity-and-sphere";
import { OnDifferentialCodomainScene } from "./c07-on-differential-codomain";
import { OnSurjectiveDimensionScene } from "./c08-on-surjective-dimension";
import { OnTangentScene } from "./c09-on-tangent";
import { So3BridgeScene } from "./c10-so3-and-bridge";

export const e05Scenes: Record<string, SceneFactory> = {
  "c01-why-directions": () => new WhyDirectionsScene(),
  "c02-tangent-by-curves": () => new TangentByCurvesScene(),
  "c03-rank-nullity": () => new RankNullityScene(),
  "c04-kernel-contains-tangent": () => new KernelContainsTangentScene(),
  "c05-tangent-equals-kernel": () => new TangentEqualsKernelScene(),
  "c06-regularity-and-sphere": () => new RegularitySphereScene(),
  "c07-on-differential-codomain": () => new OnDifferentialCodomainScene(),
  "c08-on-surjective-dimension": () => new OnSurjectiveDimensionScene(),
  "c09-on-tangent": () => new OnTangentScene(),
  "c10-so3-and-bridge": () => new So3BridgeScene(),
};
