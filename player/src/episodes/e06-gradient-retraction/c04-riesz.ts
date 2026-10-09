import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { lerp } from "../../primitives/Easing";
import { keyframes } from "../../primitives/Keyframes";
import { Palette } from "../../primitives/Palette";
import { Polyline, circlePoints } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { LevelStack } from "./lib/LevelStack";

/**
 * E06 c04 — the finite-dimensional Riesz representation theorem, its proof (linear, injective by positive
 * definiteness, onto by rank–nullity), the degenerate counterexample b(u, v) = u₁v₁, and ℓ^♯ = Σ ℓ(e_i) e_i.
 * Plane picture: a covector ⟨u, ·⟩ is drawn as its level lines {v : ⟨u, v⟩ = k}, k ∈ ℤ.
 * Sentence indices refer to content/episodes/e06-gradient-retraction/story.en.json, scene c04-riesz.
 */

const AMBER = "#f2b14c";
const R_DISC = 2.3;
const RX = 1075;
const P = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(x, y, 0);
const P2 = (p: THREE.Vector2): THREE.Vector3 => new THREE.Vector3(p.x, p.y, 0);
const U_EX = new THREE.Vector2(2, 1);
const U_LIN = new THREE.Vector2(0.9, 0.25);
const W_LIN = new THREE.Vector2(0.15, 0.85);

function tc(color: string, body: string): string {
  return `\\textcolor{${color}}{${body}}`;
}

function shown(parts: string[], n: number): string {
  return parts.map((s, i) => (i < n ? s : `\\phantom{${s}}`)).join("");
}

export class RieszScene implements Scene {
  readonly id = "c04-riesz";
  private stage!: StageLayer;

  private disc!: Polyline;
  private axes: Arrow[] = [];
  private axisLabels: FormulaHandle[] = [];
  private stackMain!: LevelStack;
  private stackU!: LevelStack;
  private stackW!: LevelStack;
  private stackTarget!: LevelStack;
  private stackB!: LevelStack;
  private uArrow!: Arrow;
  private uLabel!: FormulaHandle;
  private wArrow!: Arrow;
  private wLabel!: FormulaHandle;
  private sumArrow!: Arrow;
  private sumLabel!: FormulaHandle;
  private e1Arrow!: Arrow;
  private e2Arrow!: Arrow;
  private e1Label!: FormulaHandle;
  private e2Label!: FormulaHandle;
  private sharpArrow!: Arrow;
  private sharpLabel!: FormulaHandle;
  private rightAngle!: Polyline;

  private fIP!: FormulaHandle;
  private fPD!: FormulaHandle;
  private fPhiU!: FormulaHandle;
  private fTheorem!: FormulaHandle;
  private fEquiv!: FormulaHandle;
  private fStep1!: FormulaHandle;
  private fStep2!: FormulaHandle;
  private fStep3!: FormulaHandle;
  private fStep4!: FormulaHandle;
  private fIso!: FormulaHandle;
  private fUnique!: FormulaHandle;
  private fB!: FormulaHandle;
  private fBcov!: FormulaHandle;
  private fBtarget!: FormulaHandle;
  private fBfail!: FormulaHandle;
  private fSharp!: FormulaHandle;
  private fExample!: FormulaHandle;
  private fFinite!: FormulaHandle;
  private fNext!: FormulaHandle;
  private uReadout!: FormulaHandle;

  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;

    this.disc = new Polyline(stage, circlePoints(0, 0, R_DISC, 160), { color: Palette.green, width: 2.5 });
    this.axes = [
      new Arrow(stage, P(-R_DISC, 0), P(R_DISC + 0.25, 0), Palette.axis, { width: 2, headLength: 0.16 }),
      new Arrow(stage, P(0, -R_DISC), P(0, R_DISC + 0.25), Palette.axis, { width: 2, headLength: 0.16 }),
    ];
    this.axisLabels = [
      fl.add({ tex: "v_1", x: 0, y: 0, size: 30, color: Palette.muted, align: "left" }),
      fl.add({ tex: "v_2", x: 0, y: 0, size: 30, color: Palette.muted, valign: "bottom" }),
    ];
    this.stackU = new LevelStack(stage, P2, R_DISC, AMBER, { width: 1.6 });
    this.stackW = new LevelStack(stage, P2, R_DISC, Palette.purple, { width: 1.6 });
    this.stackTarget = new LevelStack(stage, P2, R_DISC, AMBER, { width: 3 });
    this.stackB = new LevelStack(stage, P2, R_DISC, Palette.red, { width: 2.5 });
    this.stackMain = new LevelStack(stage, P2, R_DISC, AMBER, { width: 2.5 });
    this.rightAngle = new Polyline(stage, [P(0, 0), P(0, 0), P(0, 0)], { color: "#ffffff", width: 2 });
    this.uArrow = new Arrow(stage, P(0, 0), P(1, 0), "#ffffff", { width: 5, headLength: 0.2 });
    this.uLabel = fl.add({ tex: "u", x: 0, y: 0, size: 34, color: "#ffffff" });
    this.wArrow = new Arrow(stage, P(0, 0), P2(W_LIN), Palette.purple, { width: 4, headLength: 0.18 });
    this.wLabel = fl.add({ tex: "w", x: 0, y: 0, size: 32, color: Palette.purple });
    this.sumArrow = new Arrow(stage, P(0, 0), P2(U_LIN.clone().add(W_LIN)), AMBER, { width: 5, headLength: 0.2 });
    this.sumLabel = fl.add({ tex: "u+w", x: 0, y: 0, size: 32, color: AMBER });
    this.e1Arrow = new Arrow(stage, P(0, 0), P(1, 0), Palette.teal, { width: 5, headLength: 0.2 });
    this.e2Arrow = new Arrow(stage, P(0, 0), P(0, 1), Palette.teal, { width: 5, headLength: 0.2 });
    this.e1Label = fl.add({ tex: "e_1", x: 0, y: 0, size: 32, color: Palette.teal });
    this.e2Label = fl.add({ tex: "e_2", x: 0, y: 0, size: 32, color: Palette.teal });
    this.sharpArrow = new Arrow(stage, P(0, 0), P2(U_EX), "#ffffff", { width: 6, headLength: 0.22 });
    this.sharpLabel = fl.add({ tex: "\\ell^\\sharp=(2,1)", x: 0, y: 0, size: 34, color: "#ffffff", align: "left" });

    this.fIP = fl.add({ tex: "\\langle\\cdot,\\cdot\\rangle:V\\times V\\to\\mathbb{R}\\quad\\text{bilinear, symmetric}", x: RX, y: 130, size: 32 });
    this.fPD = fl.add({ tex: `${tc(Palette.yellow, "\\langle v,v\\rangle>0")}\\ \\ \\text{for } v\\neq0`, x: RX, y: 190, size: 34 });
    this.fPhiU = fl.add({ tex: "v\\mapsto\\langle u,v\\rangle\\ \\in V^*", x: RX, y: 290, size: 36 });
    this.uReadout = fl.add({ tex: "", x: 430, y: 838, size: 30, color: Palette.muted });
    this.fTheorem = fl.add({ tex: "\\begin{gathered}\\textbf{Riesz: } \\dim V<\\infty\\ \\Rightarrow\\\\ \\Phi:V\\to V^*,\\ \\ \\Phi(u)=\\langle u,\\cdot\\rangle\\\\ \\text{is a linear isomorphism}\\end{gathered}",
      x: RX, y: 180, size: 32, boxed: true, display: true });
    this.fEquiv = fl.add({ tex: "\\forall\\ell\\in V^*\\ \\exists!\\,u:\\ \\ \\ell(v)=\\langle u,v\\rangle\\ \\ \\forall v", x: RX, y: 330, size: 32 });
    this.fStep1 = fl.add({ tex: "\\text{1. }\\Phi(u)\\in V^*\\ \\ (\\text{linear in 2nd slot})", x: RX, y: 400, size: 28 });
    this.fStep2 = fl.add({ tex: "\\text{2. }\\Phi(\\alpha u+\\beta w)(v)=\\alpha\\langle u,v\\rangle+\\beta\\langle w,v\\rangle", x: RX, y: 460, size: 28 });
    this.fStep3 = fl.add({ tex: "", x: RX, y: 540, size: 28 });
    this.fStep4 = fl.add({ tex: "", x: RX, y: 630, size: 28, display: true });
    this.fIso = fl.add({ tex: "\\Rightarrow\\ \\Phi\\ \\text{isomorphism}", x: RX, y: 720, size: 32, color: Palette.green });
    this.fUnique = fl.add({ tex: "\\langle u-u',v\\rangle=0\\ \\forall v\\ \\overset{v=u-u'}{\\Longrightarrow}\\ \\|u-u'\\|^2=0\\ \\Rightarrow\\ u=u'", x: RX, y: 790, size: 28 });
    this.fB = fl.add({ tex: `b(u,v)=u_1v_1:\\quad b(e_2,e_2)=${tc(Palette.red, "0")},\\ \\ e_2\\neq0`, x: RX, y: 140, size: 32, color: Palette.text });
    this.fBcov = fl.add({ tex: `b(u,\\cdot)=${tc(Palette.red, "u_1\\,v_1")}\\ \\ \\text{(vertical lines)}`, x: RX, y: 220, size: 32 });
    this.fBtarget = fl.add({ tex: `\\text{target } ${tc(AMBER, "\\ell(v)=v_2")}\\ \\ \\text{(horizontal lines)}`, x: RX, y: 290, size: 32 });
    this.fBfail = fl.add({ tex: `\\begin{gathered}e_2\\in\\ker\\Phi_b\\ \\Rightarrow\\ \\dim\\operatorname{im}\\Phi_b=1<2\\\\ ${tc(Palette.red, "v_2\\ \\text{has no representative}")}\\end{gathered}`, x: RX, y: 420, size: 32, display: true });
    this.fSharp = fl.add({ tex: "", x: RX, y: 200, size: 32, display: true });
    this.fExample = fl.add({ tex: `\\begin{gathered}\\ell=2v_1+v_2:\\ \\ \\ell(e_1)=2,\\ \\ell(e_2)=1\\\\ \\Rightarrow\\ \\ell^\\sharp=2e_1+e_2=(2,1)\\end{gathered}`, x: RX, y: 420, size: 30, display: true });
    this.fFinite = fl.add({ text: "finite dimension: injective ⇒ onto (infinite dimensions need completeness)", x: RX, y: 560, size: 24, color: Palette.muted, maxWidth: 480 });
    this.fNext = fl.add({ tex: "V=T_xM,\\ \\ \\langle\\cdot,\\cdot\\rangle=g_x:\\quad \\operatorname{grad}f(x)=(df_x)^\\sharp", x: RX, y: 680, size: 30, color: Palette.yellow });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "\\langle v,v\\rangle>0\\ \\ (v\\neq0)", at: cue.s(1) + 1.0 },
      { label: "2", tex: "\\Phi\\ \\text{linear}", at: cue.s(11) + 2.5 },
      { label: "3", tex: "\\ker\\Phi=\\{0\\}", at: cue.s(15) + 1.0 },
      { label: "4", tex: "\\operatorname{im}\\Phi=V^*", at: cue.s(17) + 2.0 },
      { label: "5", tex: "\\ell^\\sharp=\\textstyle\\sum_i\\ell(e_i)\\,e_i", at: cue.s(29) + 1.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  private place(h: FormulaHandle, world: THREE.Vector3, dx: number, dy: number, opacity: number): void {
    const p = this.stage.project(world);
    h.set({ x: p.x + dx, y: p.y + dy, opacity });
  }

  /** The vector u shown during the chapter (white arrow). */
  private uAt(c: Cues): THREE.Vector2 {
    const t = c.t;
    // s3–s5: u turns and stretches, settling at (2, 1)
    const k = keyframes(t, [
      { t: 0, v: { a: Math.atan2(1, 2) + 1.2, r: 0.8 } },
      { t: c.in(4, 0.0), v: { a: Math.atan2(1, 2) + 0.4, r: 2.1 } },
      { t: c.in(4, 0.5), v: { a: Math.atan2(1, 2) - 0.8, r: 1.2 } },
      { t: c.s(5), v: { a: Math.atan2(1, 2), r: Math.sqrt(5) } },
    ], 1.4);
    let u = new THREE.Vector2(Math.cos(k.a), Math.sin(k.a)).multiplyScalar(k.r);
    // s10–s12: linearity example
    if (t >= c.s(10) && t < c.s(13)) u = U_LIN.clone();
    // s13–s15: u shrinks to zero
    if (t >= c.s(13) && t < c.s(16)) {
      const s = c.over(14, 0.1, 0.95);
      u = new THREE.Vector2(1.4, 0.7).multiplyScalar(lerp(1, 0, s));
    }
    // s20–s25: degenerate sweep
    if (t >= c.s(21) && t < c.s(26)) {
      const a = Math.PI * 0.15 + 2 * Math.PI * c.over(24, 0.0, 1.0);
      u = new THREE.Vector2(Math.cos(a), Math.sin(a)).multiplyScalar(1.3);
    }
    return u;
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    this.stage.setView2D(4.12, -0.6, 8.4);

    const plane = c.p(0, 0.8, -0.6);
    this.disc.setOpacity(plane);
    this.axes.forEach((a) => a.setOpacity(plane * 0.9));
    this.place(this.axisLabels[0], P(R_DISC + 0.32, 0), 0, 0, plane);
    this.place(this.axisLabels[1], P(0, R_DISC + 0.3), 0, 0, plane);

    const u = this.uAt(c);
    // windows
    const wIntro = c.p(2, 0.6) * (1 - c.p(6, 0.6));
    const wTheorem = c.p(6, 0.6) * (1 - c.p(10, 0.5));
    const wLinear = c.p(10, 0.5) * (1 - c.p(13, 0.5));
    const wInj = c.p(13, 0.5) * (1 - c.p(16, 0.5));
    const wDegen = c.p(20, 0.6) * (1 - c.p(26, 0.6));
    const wSharp = c.p(26, 0.6);
    const uVis = Math.max(wIntro, wInj, wDegen * c.p(21, 0.5)) + wLinear;

    // the main stack ⟨u, ·⟩ = k (intro, theorem, injectivity) and ℓ = 2v₁ + v₂ later
    const mainVec = t < c.s(6) ? u : t < c.s(13) ? U_EX : t < c.s(16) ? u : U_EX;
    const mainO = Math.max(wIntro, wTheorem * 0.8, wInj, wSharp);
    this.stackMain.update(mainVec, 1, () => mainO);
    this.uArrow.set(P(0, 0), P2(u));
    this.uArrow.setOpacity(Math.min(1, uVis));
    const uLen = u.length();
    this.place(this.uLabel, P2(u.clone().multiplyScalar(uLen > 0.05 ? 1 + 0.25 / uLen : 1)), 0, 0, Math.min(1, uVis) * (uLen > 0.05 ? 1 : 0));
    this.uReadout.setContent(`u=(${u.x.toFixed(2)},\\,${u.y.toFixed(2)})`);
    this.uReadout.set({ opacity: wIntro * c.p(3, 0.5) + wInj });

    // linearity: stacks of u, w and the stack of u + w
    const sum = U_LIN.clone().add(W_LIN);
    this.stackU.update(U_LIN, 1, () => wLinear * 0.55);
    this.stackW.update(W_LIN, 1, () => wLinear * 0.55);
    this.wArrow.setOpacity(wLinear);
    this.place(this.wLabel, P2(W_LIN.clone().multiplyScalar(1.25)), 0, 0, wLinear);
    this.sumArrow.setOpacity(wLinear * c.p(12, 0.6));
    this.place(this.sumLabel, P2(sum.clone().multiplyScalar(1.18)), 14, 0, wLinear * c.p(12, 0.6));
    this.stackTarget.setColor(AMBER);
    if (t < c.s(16)) this.stackTarget.update(sum, 1, () => wLinear * c.p(12, 0.6));
    else this.stackTarget.update(new THREE.Vector2(0, 1), 1, () => wDegen * c.p(23, 0.6));

    // degenerate form: b(u, ·) = u₁ v₁ has vertical level lines
    this.stackB.update(new THREE.Vector2(u.x, 0), 1, () => wDegen * c.p(22, 0.6));
    const e2Red = wDegen * c.p(21, 0.6);
    this.e2Arrow.setColor(t >= c.s(20) && t < c.s(26) ? Palette.red : Palette.teal);
    this.e2Label.set({ color: t >= c.s(20) && t < c.s(26) ? Palette.red : Palette.teal });

    // ℓ♯: basis and the arrow (2, 1)
    const basis = wSharp * c.p(27, 0.6);
    this.e1Arrow.setOpacity(basis);
    this.e2Arrow.setOpacity(Math.max(basis, e2Red));
    this.place(this.e1Label, P(1.0, -0.3), 0, 0, basis);
    this.place(this.e2Label, P(-0.3, 1.0), 0, 0, Math.max(basis, e2Red));
    const grow = c.over(30, 0.1, 0.8);
    this.sharpArrow.set(P(0, 0), P2(U_EX.clone().multiplyScalar(Math.max(grow, 0.001))));
    this.sharpArrow.setOpacity(wSharp * (grow > 0.01 ? 1 : 0));
    this.place(this.sharpLabel, P2(U_EX), 14, -16, wSharp * c.p(30, 0.6, 1.5));
    const ra = c.p(31, 0.6) * wSharp;
    const dU = U_EX.clone().normalize().multiplyScalar(0.22);
    const dL = new THREE.Vector2(-U_EX.y, U_EX.x).normalize().multiplyScalar(0.22);
    const foot = U_EX.clone().multiplyScalar(2 / 5);           // on the level line ℓ = 2
    this.rightAngle.setPoints([P2(foot.clone().sub(dU)), P2(foot.clone().sub(dU).add(dL)), P2(foot.clone().add(dL))]);
    this.rightAngle.setOpacity(ra);

    // ---- formulas
    this.fIP.set({ opacity: c.p(0, 0.6) * (1 - c.p(6, 0.5)) });
    this.fPD.set({ opacity: c.p(1, 0.6) * (1 - c.p(6, 0.5)) });
    this.fPhiU.set({ opacity: c.p(3, 0.6) * (1 - c.p(6, 0.5)) });
    const proof = c.p(6, 0.6) * (1 - c.p(20, 0.6));
    this.fTheorem.set({ opacity: proof });
    this.fEquiv.set({ opacity: c.p(8, 0.6) * (1 - c.p(20, 0.6)) });
    this.fStep1.set({ opacity: c.p(10, 0.6) * (1 - c.p(20, 0.6)) });
    this.fStep2.set({ opacity: c.p(11, 0.6) * (1 - c.p(20, 0.6)) });
    const s3 = t >= c.s(15) ? 3 : t >= c.s(14) ? 2 : t >= c.s(13) ? 1 : 0;
    const pdHi = t >= c.s(15) && t < c.s(16);
    this.fStep3.setContent(shown([
      "\\text{3. }\\Phi(u)=0",
      "\\Rightarrow\\langle u,u\\rangle=\\Phi(u)(u)=0",
      `\\overset{${tc(pdHi ? Palette.yellow : Palette.text, "\\text{pos. def.}")}}{\\Longrightarrow}u=0`,
    ], s3));
    this.fStep3.set({ opacity: (s3 > 0 ? 1 : 0) * (1 - c.p(20, 0.6)) });
    const s4 = t >= c.s(17) ? 2 : t >= c.s(16) ? 1 : 0;
    this.fStep4.setContent(`\\begin{gathered}${shown(["\\text{4. }\\dim\\operatorname{im}\\Phi=\\dim V-\\dim\\ker\\Phi=d-0=d"], s4 >= 1 ? 1 : 0)}\\\\ ${shown(["=\\dim V^*\\ \\Rightarrow\\ \\operatorname{im}\\Phi=V^*"], s4 >= 2 ? 1 : 0)}\\end{gathered}`);
    this.fStep4.set({ opacity: (s4 > 0 ? 1 : 0) * (1 - c.p(20, 0.6)) });
    this.fIso.set({ opacity: c.p(18, 0.6) * (1 - c.p(20, 0.6)) });
    this.fUnique.set({ opacity: c.p(19, 0.6) * (1 - c.p(20, 0.6)) });

    this.fB.set({ opacity: c.p(21, 0.6) * (1 - c.p(26, 0.6)) });
    this.fBcov.set({ opacity: c.p(22, 0.6) * (1 - c.p(26, 0.6)) });
    this.fBtarget.set({ opacity: c.p(23, 0.6) * (1 - c.p(26, 0.6)) });
    this.fBfail.set({ opacity: c.p(24, 0.6, 2.0) * (1 - c.p(26, 0.6)) });

    const sh = t >= c.s(29) ? 3 : t >= c.s(28) ? 2 : t >= c.s(27) ? 1 : 0;
    this.fSharp.setContent(`\\begin{gathered}${shown(["u=\\textstyle\\sum_i\\ell(e_i)\\,e_i"], sh >= 1 ? 1 : 0)}\\\\ ${shown(["\\langle u,e_j\\rangle=\\ell(e_j)\\ \\ \\forall j"], sh >= 2 ? 1 : 0)}\\\\ ${shown([`\\Rightarrow\\ u=${tc(Palette.yellow, "\\ell^\\sharp")}`], sh >= 3 ? 1 : 0)}\\end{gathered}`);
    this.fSharp.set({ opacity: (c.p(26, 0.6) > 0 ? 1 : 0) * Math.max(c.p(26, 0.6) * (sh > 0 ? 1 : 0), 0) });
    this.fExample.set({ opacity: c.p(30, 0.6) });
    this.fFinite.set({ opacity: c.p(32, 0.6) });
    this.fNext.set({ opacity: c.p(33, 0.6) });

    this.ledger.update(t, c.p(1, 0.5, 0.8), true);
  }

  teardown(_layers: SceneLayers): void {}
}
