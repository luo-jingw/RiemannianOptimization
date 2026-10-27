import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { setOrbitView } from "../e06-gradient-retraction/lib/SphereCamera";
import { Tex } from "../e07-gradient-descent/lib/tex";

/**
 * E08 c05 — metric compatibility and torsion-freeness (lecture p.27, board photos): definitions, Γ symmetric ⇔
 * torsion-free, and two connections that keep one property and lose the other: DY[X] + X×Y on ℝ³ (compatible,
 * torsion 2X×Y: parallel vectors along e₁ rotate about it) and DY[X] + ⟨X,Y⟩e₁ on ℝ² (torsion-free, incompatible:
 * along e₁ the first component decays, ż₁ = −z₁).
 * Sentence indices refer to content/episodes/e08-connections-geodesics/story.en.json, scene c05-compatibility-torsion.
 */

const N_SCREW = 13;
const N_SHRINK = 9;
const SCREW_X0 = -2.4;
const SCREW_LEN = 4.8;
const SHRINK_LEN = 3.6;
const Z0 = new THREE.Vector2(0.9, 0.7);

export class CompatibilityTorsionScene implements Scene {
  readonly id = "c05-compatibility-torsion";
  private stage!: StageLayer;

  private axis3!: Arrow;
  private screw: Arrow[] = [];
  private screwTips!: Polyline;
  private axis2!: Arrow;
  private shrink: Arrow[] = [];
  private flat: Arrow[] = [];

  private fDefs!: FormulaHandle;
  private fScrew!: FormulaHandle;
  private fShrink!: FormulaHandle;
  private fEnd!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    this.axis3 = new Arrow(stage, new THREE.Vector3(SCREW_X0 - 0.3, 0, 0), new THREE.Vector3(SCREW_X0 + SCREW_LEN + 0.5, 0, 0), Palette.axis, { mode: "3d", width: 3, headLength: 0.15 });
    const tips: THREE.Vector3[] = [];
    for (let k = 0; k < N_SCREW; k++) {
      const s = (k / (N_SCREW - 1)) * SCREW_LEN;
      const base = new THREE.Vector3(SCREW_X0 + s, 0, 0);
      const tip = base.clone().add(new THREE.Vector3(0, 0.75 * Math.sin(s), 0.75 * Math.cos(s)));
      tips.push(tip);
      this.screw.push(new Arrow(stage, base, tip, Palette.purple, { mode: "3d", width: 4, headLength: 0.1 }));
    }
    this.screwTips = new Polyline(stage, tips, { color: Palette.purple, width: 1.5, opacity: 0.5, dashed: true, dashSize: 0.05, gapSize: 0.05 });

    this.axis2 = new Arrow(stage, new THREE.Vector3(-0.3, 0, 0), new THREE.Vector3(SHRINK_LEN + 0.6, 0, 0), Palette.axis, { width: 3, headLength: 0.15 });
    for (let k = 0; k < N_SHRINK; k++) {
      const s = (k / (N_SHRINK - 1)) * SHRINK_LEN;
      const base = new THREE.Vector3(s, 0, 0);
      this.shrink.push(new Arrow(stage, base, base.clone().add(new THREE.Vector3(Z0.x * Math.exp(-s), Z0.y, 0)), Palette.purple, { width: 4, headLength: 0.11 }));
      this.flat.push(new Arrow(stage, base, base.clone().add(new THREE.Vector3(Z0.x, Z0.y, 0)), Palette.green, { width: 2, headLength: 0.08 }));
    }

    this.fDefs = fl.add({ tex: "", x: 960, y: 420, size: 34, display: true });
    this.fScrew = fl.add({ tex: "", x: 60, y: 110, size: 30, display: true, align: "left", valign: "top" });
    this.fShrink = fl.add({ tex: "", x: 60, y: 110, size: 30, display: true, align: "left", valign: "top" });
    this.fEnd = fl.add({ tex: "", x: 960, y: 430, size: 36, display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "C", tex: "X\\langle Y,Z\\rangle=\\langle\\nabla_XY,Z\\rangle+\\langle Y,\\nabla_XZ\\rangle", at: cue.e(2) },
      { label: "T", tex: "\\nabla_XY-\\nabla_YX=[X,Y]", at: cue.e(5) },
      { label: "T'", tex: "\\Gamma^k_{ij}=\\Gamma^k_{ji}", at: cue.e(8) },
      { label: "✗T", tex: "DY[X]+X\\times Y", at: cue.e(16) },
      { label: "✗C", tex: "DY[X]+\\langle X,Y\\rangle a", at: cue.e(23) },
    ], { x: 1440, y: 210, width: 460, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const screwPart = t >= c.s(11) - 0.3 && t < c.s(20) - 0.3;
    if (screwPart) {
      setOrbitView(this.stage, { azDeg: -62 + 10 * c.over(18, 0, 1), elDeg: 18, distance: 10.5, fovDeg: 34, center: new THREE.Vector3(0, 0, 0.2), shift: 0.55, lift: -0.5 });
    } else {
      this.stage.setView2D(2.8, 0.55, 5.4);
    }

    // ---- definitions (s0–s10)
    const df = Tex.count(t, [c.s(0), c.s(1), c.s(2), c.s(3), c.s(4), c.s(5), c.s(6), c.s(7), c.s(8), c.s(9), c.s(10)]);
    this.fDefs.setContent(Tex.rows([
      "\\text{Riemannian metric}\\ \\langle\\cdot,\\cdot\\rangle:\\ \\text{two more properties}",
      `${Tex.color(Palette.green, "\\text{compatible with the metric}")}`,
      "X\\langle Y,Z\\rangle=\\langle\\nabla_XY,Z\\rangle+\\langle Y,\\nabla_XZ\\rangle",
      `${Tex.color(Palette.muted, "\\text{product rule for inner products}")}`,
      `${Tex.color(Palette.muted, "\\text{zero derivative along a curve}\\Rightarrow\\text{lengths and angles kept}")}`,
      `${Tex.color(Palette.green, "\\text{torsion-free}")}:\\ \\ \\nabla_XY-\\nabla_YX=[X,Y]`,
      `${Tex.color(Palette.muted, "\\mathbb R^n:\\ DY[X]-DX[Y]=[X,Y]")}`,
      "[E_i,E_j]=0:\\ \\ \\nabla_{E_i}E_j=\\nabla_{E_j}E_i",
      `${Tex.color(Palette.yellow, "\\Gamma^k_{ij}=\\Gamma^k_{ji}\\quad\\forall\\,i,j")}`,
      "\\text{polar: }\\Gamma^\\theta_{r\\theta}=\\Gamma^\\theta_{\\theta r}=\\tfrac1r\\ \\ \\checkmark",
      "\\text{ordinary derivative: both.}\\ \\ \\text{Independent?}",
    ], df));
    this.fDefs.set({ opacity: (df > 0 ? 1 : 0) * (1 - c.p(11, 0.5)) });

    // ---- compatible but twisted (s11–s19)
    const sO = c.during(11, 20, 0.5);
    this.axis3.setOpacity(sO * c.p(17, 0.5));
    const grow = c.over(18, 0.05, 0.9);
    this.screw.forEach((a, k) => a.setOpacity(sO * c.p(17, 0.4) * (k / (N_SCREW - 1) <= grow + 1e-6 ? 1 : 0)));
    this.screwTips.setProgress(grow);
    this.screwTips.setOpacity(sO * 0.6 * c.p(18, 0.5));
    const sc = Tex.count(t, [c.s(11), c.s(12), c.s(13), c.s(14), c.s(15), c.s(16), c.s(18), c.s(19)]);
    this.fScrew.setContent(Tex.rows([
      `&${Tex.color(Palette.purple, "\\text{compatible, not torsion-free}")}`,
      "&\\mathbb R^3:\\ \\nabla_XY=DY[X]+X\\times Y",
      "&\\langle X\\times Y,Z\\rangle+\\langle Y,X\\times Z\\rangle",
      "&=\\det(X,Y,Z)+\\det(X,Z,Y)=0\\ \\ \\checkmark",
      "&\\nabla_XY-\\nabla_YX-[X,Y]=2\\,X\\times Y",
      `&${Tex.color(Palette.red, "\\neq0:\\ \\text{torsion}")}`,
      "&\\text{along } e_1:\\ \\dot z=-e_1\\times z\\ \\ \\text{(a screw)}",
      `&|z|\\ \\text{constant};\\ ${Tex.color(Palette.purple, "\\text{the twist is the torsion}")}`,
    ], sc, "aligned"));
    this.fScrew.set({ opacity: (sc > 0 ? 1 : 0) * (1 - c.p(20, 0.5)) });

    // ---- torsion-free but shrinking (s20–s25)
    const kO = c.during(20, 26, 0.5);
    this.axis2.setOpacity(kO * c.p(24, 0.5));
    const g2 = c.over(24, 0.05, 0.9);
    this.shrink.forEach((a, k) => a.setOpacity(kO * c.p(24, 0.4) * (k / (N_SHRINK - 1) <= g2 + 1e-6 ? 1 : 0)));
    this.flat.forEach((a, k) => a.setOpacity(kO * 0.5 * c.p(25, 0.5) * (k / (N_SHRINK - 1) <= g2 + 1e-6 ? 1 : 0)));
    const sh = Tex.count(t, [c.s(20), c.s(21), c.s(22), c.s(23), c.s(24), c.s(25)]);
    this.fShrink.setContent(Tex.rows([
      `&${Tex.color(Palette.purple, "\\text{torsion-free, not compatible}")}`,
      "&\\mathbb R^2:\\ \\nabla_XY=DY[X]+\\langle X,Y\\rangle a,\\ \\ a=e_1",
      "&\\text{symmetric in } X,Y\\Rightarrow\\text{torsion-free}\\ \\ \\checkmark",
      `&X=Y=Z=e_1:\\ \\ 0\\ \\text{vs}\\ 2\\langle e_1,e_1\\rangle\\langle a,e_1\\rangle=2\\ \\ ${Tex.color(Palette.red, "\\times")}`,
      "&\\text{along } e_1:\\ \\dot z_1=-z_1,\\ \\ \\dot z_2=0",
      `&${Tex.color(Palette.purple, "\\text{shrinks and turns}")}\\ \\ \\text{vs}\\ \\ ${Tex.color(Palette.green, "\\text{ordinary: constant}")}`,
    ], sh, "aligned"));
    this.fShrink.set({ opacity: (sh > 0 ? 1 : 0) * (1 - c.p(26, 0.5)) });

    const en = Tex.count(t, [c.s(26), c.s(27)]);
    this.fEnd.setContent(Tex.rows([
      `${Tex.color(Palette.green, "\\text{compatible: lengths kept}")}\\qquad ${Tex.color(Palette.green, "\\text{torsion-free: no twisting}")}`,
      `${Tex.color(Palette.teal, "\\text{together: a single connection?}")}`,
    ], en));
    this.fEnd.set({ opacity: en > 0 ? 1 : 0 });

    this.ledger.update(t, 1 - c.p(26, 0.5), true);
  }

  teardown(_layers: SceneLayers): void {}
}
