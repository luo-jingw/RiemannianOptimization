import type { SceneFactory } from "../../core/Scene";
import { PrimitivesFlatScene } from "./c01-primitives-flat";
import { PrimitivesSpaceScene } from "./c02-primitives-space";
import { PrimitivesLedgerScene } from "./c03-primitives-ledger";

/** Development fixture: exercises every primitive. Data lives in build/e00-test (not a series episode). */
export const e00TestScenes: Record<string, SceneFactory> = {
  "c01-a": () => new PrimitivesFlatScene(),
  "c02-b": () => new PrimitivesSpaceScene(),
  "c03-c": () => new PrimitivesLedgerScene(),
};
