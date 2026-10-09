import type { FormulaLayer } from "../layers/FormulaLayer";
import type { StageLayer } from "../layers/StageLayer";

/** The drawing surfaces a chapter scene may use. Captions and title cards are owned by the renderer. */
export interface SceneLayers {
  stage: StageLayer;
  formulas: FormulaLayer;
}
