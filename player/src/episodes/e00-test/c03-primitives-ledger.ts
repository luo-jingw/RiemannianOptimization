import type { Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Cues } from "../../primitives/Cues";
import { Palette } from "../../primitives/Palette";
import { ProofLedger } from "../../primitives/ProofLedger";

export class PrimitivesLedgerScene implements Scene {
  readonly id = "c03-c";
  private ledger!: ProofLedger;
  private main!: FormulaHandle;
  private tStart = 0;

  setup(layers: SceneLayers): void {
    this.tStart = 2.4;
    this.ledger = new ProofLedger(layers.formulas, [
      { label: "1", tex: "F(x,y)=(x,f(x,y))", at: this.tStart },
      { label: "2", tex: "DF=\\begin{pmatrix} I_d & 0\\\\ D_xf & D_yf\\end{pmatrix}", at: this.tStart + 1 },
      { label: "3", tex: "F^{-1}(u,v)=(u,Y(u,v))", at: this.tStart + 2 },
      { label: "4", tex: "g(u)=Y(u,0)", at: this.tStart + 3 },
      { label: "5", tex: "f(u,g(u))=0", at: this.tStart + 4 },
    ], { x: 1240, y: 170, width: 620, rowHeight: 120, capacity: 4 });
    this.main = layers.formulas.add({ tex: "\\det\\begin{pmatrix} I_d & 0\\\\ D_xf & D_yf\\end{pmatrix}=\\det D_yf\\neq 0", x: 560, y: 420, size: 52, color: Palette.text, display: true });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    this.ledger.update(ctx.localTime, 1);
    this.main.set({ opacity: c.p(0, 0.6) });
  }

  teardown(_layers: SceneLayers): void {}
}
