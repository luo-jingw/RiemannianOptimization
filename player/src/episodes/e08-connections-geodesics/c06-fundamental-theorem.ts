import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Cues } from "../../primitives/Cues";
import { Palette } from "../../primitives/Palette";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Tex } from "../e07-gradient-descent/lib/tex";

/**
 * E08 c06 — the fundamental theorem of Riemannian geometry (lecture p.28, board photo; Boumal Thm 5.6 and its proof
 * sketch): compatibility written three times, the torsion-free substitutions, the Koszul formula, uniqueness by
 * Riesz, existence (sketch), and the coordinate formula Γ^k_ij = ½g^{kl}(∂_i g_jl + ∂_j g_il − ∂_l g_ij) checked on
 * polar coordinates.
 * Sentence indices refer to content/episodes/e08-connections-geodesics/story.en.json, scene c06-fundamental-theorem.
 */

const CX = Palette.orange;
const CY = Palette.teal;
const CZ = Palette.purple;

export class FundamentalTheoremScene implements Scene {
  readonly id = "c06-fundamental-theorem";

  private fTheorem!: FormulaHandle;
  private fLines!: FormulaHandle;
  private fCollect!: FormulaHandle;
  private fKoszul!: FormulaHandle;
  private fUnique!: FormulaHandle;
  private fExist!: FormulaHandle;
  private fCoord!: FormulaHandle;
  private fEnd!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const fl = layers.formulas;
    this.fTheorem = fl.add({ tex: "", x: 700, y: 430, size: 36, display: true });
    this.fLines = fl.add({ tex: "", x: 700, y: 330, size: 35, display: true });
    this.fCollect = fl.add({ tex: "", x: 700, y: 650, size: 33, display: true });
    this.fKoszul = fl.add({ tex: "", x: 700, y: 320, size: 38, display: true });
    this.fUnique = fl.add({ tex: "", x: 700, y: 620, size: 34, display: true });
    this.fExist = fl.add({ tex: "", x: 700, y: 420, size: 35, display: true });
    this.fCoord = fl.add({ tex: "", x: 700, y: 430, size: 35, display: true });
    this.fEnd = fl.add({ tex: "", x: 700, y: 430, size: 34, display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "C", tex: "\\text{compatible}", at: cue.s(0) },
      { label: "T", tex: "\\text{torsion-free}", at: cue.s(0) },
      { label: "K", tex: "\\text{Koszul formula}", at: cue.e(16) },
      { label: "!", tex: "\\exists!\\ \\text{Levi-Civita } \\nabla", at: cue.e(20) },
      { label: "Γ", tex: "\\Gamma^k_{ij}=\\tfrac12g^{kl}(\\partial_ig_{jl}+\\partial_jg_{il}-\\partial_lg_{ij})", at: cue.e(26) },
    ], { x: 1440, y: 210, width: 460, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const x = (s: string): string => Tex.color(CX, s);
    const y = (s: string): string => Tex.color(CY, s);
    const z = (s: string): string => Tex.color(CZ, s);

    // ---- the statement (s0–s3)
    const th = Tex.count(t, [c.s(0) + 0.3, c.s(1), c.s(2), c.s(3)]);
    this.fTheorem.setContent(Tex.rows([
      "\\textbf{Fundamental theorem of Riemannian geometry}",
      "\\text{on a Riemannian manifold there is exactly one connection}",
      `\\text{compatible with the metric and torsion-free:}\\ \\ ${Tex.color(Palette.yellow, "\\text{Levi-Civita}")}`,
      `${Tex.color(Palette.muted, "\\text{proof sketch, step 1: the Koszul formula}")}`,
    ], th));
    this.fTheorem.set({ opacity: (th > 0 ? 1 : 0) * (1 - c.p(4, 0.5)) });

    // ---- three copies of compatibility (s4–s13)
    const ln = Tex.count(t, [c.s(4), c.s(5), c.s(6), c.s(7), c.s(8)]);
    this.fLines.setContent(Tex.rows([
      `${Tex.color(Palette.muted, "\\text{cycle } X\\to Y\\to Z\\to X")}&`,
      `(+)\\ \\ X\\langle Y,Z\\rangle&=\\langle\\nabla_XY,${z("Z")}\\rangle+\\langle ${y("Y")},\\nabla_XZ\\rangle`,
      `(+)\\ \\ Y\\langle Z,X\\rangle&=\\langle\\nabla_YZ,${x("X")}\\rangle+\\langle ${z("Z")},\\nabla_YX\\rangle`,
      `(-)\\ \\ Z\\langle X,Y\\rangle&=\\langle\\nabla_ZX,${y("Y")}\\rangle+\\langle ${x("X")},\\nabla_ZY\\rangle`,
      `${Tex.color(Palette.muted, "\\text{add the first two, subtract the third}")}&`,
    ], ln, "aligned"));
    this.fLines.set({ opacity: (ln > 0 ? 1 : 0) * (1 - c.p(14, 0.5)) });
    const co = Tex.count(t, [c.s(9), c.s(10), c.s(11), c.s(12), c.s(13)]);
    this.fCollect.setContent(Tex.rows([
      `${Tex.color(Palette.muted, "\\text{group by the field outside}")}`,
      `\\langle ${y("Y")},\\nabla_XZ-\\nabla_ZX\\rangle=\\langle ${y("Y")},[X,Z]\\rangle`,
      `\\langle ${x("X")},\\nabla_YZ-\\nabla_ZY\\rangle=\\langle ${x("X")},[Y,Z]\\rangle`,
      `\\langle ${z("Z")},\\nabla_XY+\\nabla_YX\\rangle=\\langle ${z("Z")},2\\nabla_XY-[X,Y]\\rangle`,
      `\\Rightarrow\\ 2\\langle\\nabla_XY,Z\\rangle\\ +\\ \\text{three bracket terms}`,
    ], co));
    this.fCollect.set({ opacity: (co > 0 ? 1 : 0) * (1 - c.p(14, 0.5)) });

    // ---- the Koszul formula, uniqueness (s14–s20)
    const ko = Tex.count(t, [c.s(14), c.s(15), c.s(16)]);
    this.fKoszul.setContent(Tex.rows([
      `${Tex.color(Palette.yellow, "2\\langle\\nabla_XY,Z\\rangle=X\\langle Y,Z\\rangle+Y\\langle Z,X\\rangle-Z\\langle X,Y\\rangle")}`,
      `${Tex.color(Palette.yellow, "\\qquad-\\langle X,[Y,Z]\\rangle+\\langle Y,[Z,X]\\rangle+\\langle Z,[X,Y]\\rangle")}`,
      "\\text{(Koszul)}\\quad\\text{right side: no }\\nabla",
    ], ko));
    this.fKoszul.set({ opacity: (ko > 0 ? 1 : 0) * (1 - c.p(21, 0.5)) });
    const un = Tex.count(t, [c.s(17), c.s(18), c.s(19), c.s(20)]);
    this.fUnique.setContent(Tex.rows([
      "\\text{only the metric, the fields and their brackets}",
      "\\langle\\nabla_XY,Z\\rangle\\ \\text{fixed for every } Z",
      "\\text{Riesz: a vector is fixed by its inner products}",
      `${Tex.color(Palette.green, "\\Rightarrow\\ \\nabla_XY\\ \\text{determined: uniqueness}")}`,
    ], un));
    this.fUnique.set({ opacity: (un > 0 ? 1 : 0) * (1 - c.p(21, 0.5)) });

    // ---- existence (s21–s23)
    const ex = Tex.count(t, [c.s(21), c.s(22), c.s(23)]);
    this.fExist.setContent(Tex.rows([
      "\\text{step 2 (existence): define } \\nabla_XY \\text{ by the Koszul formula}",
      "\\text{check: } C^\\infty\\text{-linear in } Z;\\ \\text{all five properties hold}",
      `${Tex.color(Palette.muted, "\\text{direct but tedious;\\ explicit for submanifolds (next chapter)}")}`,
    ], ex));
    this.fExist.set({ opacity: (ex > 0 ? 1 : 0) * (1 - c.p(24, 0.5)) });

    // ---- coordinates and polar check (s24–s30)
    const cd = Tex.count(t, [c.s(24), c.s(25), c.s(26), c.s(27), c.s(28), c.s(29), c.s(30)]);
    this.fCoord.setContent(Tex.rows([
      "X=E_i,\\ Y=E_j,\\ Z=E_l:\\ \\ \\text{all brackets } 0",
      "g_{ij}=\\langle E_i,E_j\\rangle",
      `${Tex.color(Palette.yellow, "\\Gamma^k_{ij}=\\tfrac12\\,g^{kl}\\big(\\partial_ig_{jl}+\\partial_jg_{il}-\\partial_lg_{ij}\\big)")}`,
      "\\text{polar: } g=\\operatorname{diag}(1,\\,r^2)",
      "\\Gamma^r_{\\theta\\theta}=\\tfrac12\\cdot1\\cdot(-\\partial_r r^2)=-r",
      "\\Gamma^\\theta_{r\\theta}=\\tfrac12\\cdot\\tfrac1{r^2}\\cdot\\partial_r r^2=\\tfrac1r",
      `${Tex.color(Palette.green, "\\text{both match chapter 4}\\ \\checkmark\\ \\ DY[X]\\ \\text{is Levi-Civita on } \\mathbb R^2")}`,
    ], cd));
    this.fCoord.set({ opacity: (cd > 0 ? 1 : 0) * (1 - c.p(31, 0.5)) });

    const en = Tex.count(t, [c.s(31)]);
    this.fEnd.setContent(Tex.rows([
      `\\text{one property: room for others;}\\ \\ ${Tex.color(Palette.green, "\\text{both: exactly one}")}`,
    ], en));
    this.fEnd.set({ opacity: en > 0 ? 1 : 0 });

    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
