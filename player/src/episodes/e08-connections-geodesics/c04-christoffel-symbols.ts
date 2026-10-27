import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { Palette } from "../../primitives/Palette";
import { Polyline, circlePoints } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Tex } from "../e07-gradient-descent/lib/tex";

/**
 * E08 c04 — the coordinate description of a connection (lecture p.26, board photo): expansion of ∇_X Y with the
 * axioms, Christoffel symbols ∇_{E_i}E_j = Γ^k_ij E_k, the Euclidean connection in polar coordinates (Γ^r_θθ = −r,
 * Γ^θ_rθ = Γ^θ_θr = 1/r), the turning frame, and why "differentiate the components" (Γ = 0) is coordinate-dependent.
 * Sentence indices refer to content/episodes/e08-connections-geodesics/story.en.json, scene c04-christoffel-symbols.
 */

const P = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(x, y, 0);
const Er = (th: number): THREE.Vector3 => P(Math.cos(th), Math.sin(th));
const Eth = (r: number, th: number): THREE.Vector3 => P(-r * Math.sin(th), r * Math.cos(th));
const pos = (r: number, th: number): THREE.Vector3 => Er(th).multiplyScalar(r);
const ER_LEN = 0.45;
const ETH_SCALE = 0.3;
const SAMPLES: [number, number][] = [];
for (const r of [0.8, 1.5]) for (let k = 0; k < 8; k++) SAMPLES.push([r, (k * Math.PI) / 4 + 0.2]);
const R_WALK = 1.4;

export class ChristoffelSymbolsScene implements Scene {
  readonly id = "c04-christoffel-symbols";
  private stage!: StageLayer;

  private polarGrid: Polyline[] = [];
  private erArrows: Arrow[] = [];
  private ethArrows: Arrow[] = [];
  private walk!: Dot;
  private walkEr!: Arrow;
  private trail: Arrow[] = [];
  private turnDiff!: Arrow;
  private testDot!: Dot;
  private trueArrow!: Arrow;
  private zeroDot!: Dot;
  private lTrue!: FormulaHandle;
  private lZero!: FormulaHandle;

  private fCoords!: FormulaHandle;
  private fDerive!: FormulaHandle;
  private fPolar!: FormulaHandle;
  private fTurn!: FormulaHandle;
  private fTest!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;

    for (const r of [0.5, 1, 1.5, 2]) this.polarGrid.push(new Polyline(stage, circlePoints(0, 0, r, 160), { color: Palette.grid, width: 1.6 }));
    for (let k = 0; k < 12; k++) {
      const th = (k * Math.PI) / 6;
      this.polarGrid.push(new Polyline(stage, [P(0, 0), pos(2.0, th)], { color: Palette.grid, width: 1.6 }));
    }
    for (const [r, th] of SAMPLES) {
      this.erArrows.push(new Arrow(stage, pos(r, th), pos(r, th).addScaledVector(Er(th), ER_LEN), Palette.orange, { width: 3, headLength: 0.09 }));
      this.ethArrows.push(new Arrow(stage, pos(r, th), pos(r, th).addScaledVector(Eth(r, th), ETH_SCALE), Palette.purple, { width: 3, headLength: 0.09 }));
    }
    this.walk = new Dot(stage, pos(R_WALK, 0), Palette.text, 0.045);
    this.walkEr = new Arrow(stage, pos(R_WALK, 0), pos(R_WALK, 0), Palette.orange, { width: 5, headLength: 0.12 });
    for (let k = 0; k < 6; k++) this.trail.push(new Arrow(stage, P(0, 0), P(0.1, 0), Palette.orange, { width: 2.5, headLength: 0.08 }));
    this.turnDiff = new Arrow(stage, P(0, 0), P(0.1, 0), Palette.yellow, { width: 5, headLength: 0.12 });
    this.testDot = new Dot(stage, pos(2, 0), Palette.text, 0.05);
    this.trueArrow = new Arrow(stage, pos(2, 0), pos(2, 0).add(P(0, 0.9)), Palette.yellow, { width: 5, headLength: 0.13 });
    this.zeroDot = new Dot(stage, pos(2, 0), Palette.red, 0.08, "2d", true);
    this.lTrue = fl.add({ tex: "\\nabla_{E_\\theta}E_r=(0,1)", x: 0, y: 0, size: 28, color: Palette.yellow, align: "right" });
    this.lZero = fl.add({ tex: "\\Gamma=0:\\ 0", x: 0, y: 0, size: 28, color: Palette.red, align: "right" });

    this.fCoords = fl.add({ tex: "", x: 960, y: 420, size: 34, display: true });
    this.fDerive = fl.add({ tex: "", x: 960, y: 420, size: 34, display: true });
    this.fPolar = fl.add({ tex: "", x: 1160, y: 420, size: 29, display: true });
    this.fTurn = fl.add({ tex: "", x: 1160, y: 420, size: 29, display: true });
    this.fTest = fl.add({ tex: "", x: 1170, y: 420, size: 28, display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "\\nabla_{E_i}E_j=\\Gamma^k_{ij}E_k", at: cue.e(8) },
      { label: "2", tex: "\\nabla_XY=\\big(X(Y^k)+\\Gamma^k_{ij}X^iY^j\\big)E_k", at: cue.e(9) },
      { label: "3", tex: "\\text{polar: }\\Gamma^r_{\\theta\\theta}=-r,\\ \\Gamma^\\theta_{r\\theta}=\\Gamma^\\theta_{\\theta r}=\\tfrac1r", at: cue.e(19) },
    ], { x: 1440, y: 210, width: 460, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    this.stage.setView2D(2.45, -0.53, 5.2);

    // ---- coordinates and the expansion (s0–s11)
    const co = Tex.count(t, [c.s(0), c.s(1), c.s(2)]);
    this.fCoords.setContent(Tex.rows([
      "(x^1,\\dots,x^n)\\ \\text{local coordinates on } U\\subseteq M",
      "E_i=\\dfrac{\\partial}{\\partial x^i}\\ \\ \\text{a basis of every } T_pM,\\ p\\in U",
      "X=X^iE_i,\\qquad Y=Y^jE_j,\\qquad X^i,Y^j\\in C^\\infty(U)",
    ], co));
    this.fCoords.set({ opacity: (co > 0 ? 1 : 0) * (1 - c.p(3, 0.5)) });
    const de = Tex.count(t, [c.s(3), c.s(4), c.s(5), c.s(6), c.s(7), c.s(8), c.s(9), c.s(10), c.s(11)]);
    this.fDerive.setContent(Tex.rows([
      "&\\nabla_XY=\\nabla_{X^iE_i}(Y^jE_j)",
      `&\\phantom{\\nabla_XY}=X^i\\,\\nabla_{E_i}(Y^jE_j)\\qquad ${Tex.color(Palette.muted, "\\text{(i)}")}`,
      `&\\phantom{\\nabla_XY}=X^iY^j\\,${Tex.color(Palette.yellow, "\\nabla_{E_i}E_j")}+X^i(\\partial_iY^j)\\,E_j\\qquad ${Tex.color(Palette.muted, "\\text{(ii), (iii)}")}`,
      `&${Tex.color(Palette.yellow, "\\nabla_{E_i}E_j")}\\ \\text{: one coordinate field along another}`,
      `&\\nabla_{E_i}E_j=${Tex.color(Palette.yellow, "\\Gamma^k_{ij}")}\\,E_k`,
      `&\\Gamma^k_{ij}:\\ n^3\\ \\text{functions, the Christoffel symbols}`,
      `&${Tex.color(Palette.green, "\\nabla_XY=\\big(X(Y^k)+\\Gamma^k_{ij}X^iY^j\\big)\\,E_k")}`,
      "&\\text{on } U,\\ \\text{the connection is determined by its } \\Gamma",
      `&${Tex.color(Palette.muted, "X(Y^k):\\ \\text{components change;}\\ \\ \\Gamma:\\ \\text{the basis changes}")}`,
    ], de, "aligned"));
    this.fDerive.set({ opacity: (de > 0 ? 1 : 0) * (1 - c.p(12, 0.5)) });

    // ---- polar coordinates (s12–s19)
    const gO = c.p(12, 0.6);
    this.polarGrid.forEach((g) => g.setOpacity(gO));
    const fO = gO * c.p(13, 0.5) * (1 - c.p(20, 0.5));
    this.erArrows.forEach((a) => a.setOpacity(fO));
    this.ethArrows.forEach((a) => a.setOpacity(fO * c.p(14, 0.5)));
    const po = Tex.count(t, [c.s(12), c.s(13), c.s(14), c.s(15), c.s(16), c.s(17), c.s(18), c.s(19)]);
    this.fPolar.setContent(Tex.rows([
      "\\text{Euclidean } DY[X]\\ \\text{in polar coordinates}",
      `${Tex.color(Palette.orange, "E_r=(\\cos\\theta,\\sin\\theta)")},\\ \\ ${Tex.color(Palette.purple, "E_\\theta=(-r\\sin\\theta,\\,r\\cos\\theta)")}`,
      `${Tex.color(Palette.muted, "|E_r|=1,\\ \\ |E_\\theta|=r")}`,
      "\\partial_rE_r=0",
      "\\partial_rE_\\theta=(-\\sin\\theta,\\cos\\theta)=\\tfrac1r E_\\theta",
      "\\partial_\\theta E_r=\\tfrac1r E_\\theta",
      "\\partial_\\theta E_\\theta=(-r\\cos\\theta,-r\\sin\\theta)=-r\\,E_r",
      `${Tex.color(Palette.yellow, "\\Gamma^r_{\\theta\\theta}=-r,\\ \\ \\Gamma^\\theta_{r\\theta}=\\Gamma^\\theta_{\\theta r}=\\tfrac1r,\\ \\ \\text{others } 0")}`,
    ], po));
    this.fPolar.set({ opacity: (po > 0 ? 1 : 0) * (1 - c.p(20, 0.5)) });

    // ---- the turning frame (s20–s22)
    const wO = c.during(20, 23, 0.5);
    const th = 0.15 + 1.1 * c.over(20, 0.05, 0.95);
    this.walk.setPosition(pos(R_WALK, th));
    this.walk.setOpacity(wO);
    this.walkEr.set(pos(R_WALK, th), pos(R_WALK, th).addScaledVector(Er(th), 0.6));
    this.walkEr.setOpacity(wO);
    this.trail.forEach((a, k) => {
      const tk = 0.15 + (1.1 * k) / 5;
      a.set(pos(R_WALK, tk), pos(R_WALK, tk).addScaledVector(Er(tk), 0.6));
      a.setOpacity(wO * 0.35 * (th >= tk ? 1 : 0));
    });
    this.turnDiff.set(pos(R_WALK, th).addScaledVector(Er(th), 0.6), pos(R_WALK, th).addScaledVector(Er(th), 0.6).addScaledVector(Eth(R_WALK, th), 0.5 / R_WALK));
    this.turnDiff.setOpacity(wO * c.p(21, 0.5));
    const tu = Tex.count(t, [c.s(20), c.s(21), c.s(22)]);
    this.fTurn.setContent(Tex.rows([
      `\\nabla_{E_\\theta}E_r=${Tex.color(Palette.yellow, "\\tfrac1r E_\\theta")}\\ \\ \\text{: } E_r\\ \\text{turns}`,
      `E_r\\ \\text{has components } (1,0),\\ \\text{yet}\\ \\nabla_{E_\\theta}E_r\\neq0`,
      `${Tex.color(Palette.green, "\\text{constant components}\\neq\\text{constant field}")}`,
    ], tu));
    this.fTurn.set({ opacity: (tu > 0 ? 1 : 0) * (1 - c.p(23, 0.5)) });

    // ---- Γ = 0 is coordinate-dependent (s23–s27)
    const xO = c.during(23, 28, 0.5);
    this.testDot.setOpacity(xO);
    this.trueArrow.setOpacity(xO * c.p(24, 0.5));
    this.zeroDot.setOpacity(xO * c.p(24, 0.5, 1.0));
    const tp = this.stage.project(pos(2, 0).add(P(0, 0.9)));
    const zp = this.stage.project(pos(2, 0));
    this.lTrue.set({ x: tp.x - 16, y: tp.y, opacity: xO * c.p(24, 0.5) });
    this.lZero.set({ x: zp.x - 26, y: zp.y + 30, opacity: xO * c.p(24, 0.5, 1.0) });
    const te = Tex.count(t, [c.s(23), c.s(23), c.s(24), c.s(25), c.s(26), c.s(27)]);
    this.fTest.setContent(Tex.rows([
      "\\Gamma=0:\\ \\nabla_XY:=X(Y^k)E_k\\ ?",
      "\\text{at } (r,\\theta)=(2,0)",
      `${Tex.color(Palette.yellow, "\\nabla_{E_\\theta}E_r=(0,1)")}\\ \\ \\text{vs}\\ \\ ${Tex.color(Palette.red, "0")}`,
      "\\text{Cartesian: } DY[X];\\ \\ \\text{polar: not}",
      `${Tex.color(Palette.red, "\\text{coordinate-dependent:\\ not a derivative}")}`,
      `${Tex.color(Palette.teal, "\\text{next: compatibility and torsion}")}`,
    ], te));
    this.fTest.set({ opacity: te > 0 ? 1 : 0 });

    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
