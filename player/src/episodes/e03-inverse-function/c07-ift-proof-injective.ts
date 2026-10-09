import type * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { clamp01, lerp } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Region } from "../../primitives/Region";
import { pxv, usePixelView } from "./lib/PixelSpace";
import { PlotAxes } from "./lib/PlotAxes";
import { PlotFrame } from "./lib/PlotFrame";
import { RoadSign } from "./lib/RoadSign";
import { RudinExample } from "./lib/RudinExample";
import { Tex } from "./lib/Tex";

/**
 * E03 c07 — proof part (a), first half: frozen Newton map φ_y, ½-contraction on U, injectivity.
 * 1D illustration: f(x) = x + 0.3x², a = 0, y = 0.8. 2D example: RudinExample (A = I, λ = ½, U = unit ball).
 * Sentence indices refer to story.en.json, scene c07-ift-proof-injective.
 */

const ONE_D = new PlotFrame(290, 640, 420);
const Y1 = 0.8;
const PANEL_L = { x: 330, y: 470, s: 190 };
const PANEL_R = { x: 930, y: 470, s: 190 };
const TARGET: [number, number] = [0.6, 0.5];
const N_ITER = 6;

function f1(x: number): number {
  return x + 0.3 * x * x;
}

function df1(x: number): number {
  return 1 + 0.6 * x;
}

interface Para {
  q: [number, number];
  ok: boolean;
  line: Polyline;
}

export class IftInjectiveScene implements Scene {
  readonly id = "c07-ift-proof-injective";

  // 1D Newton
  private axes1!: PlotAxes;
  private curve1!: Polyline;
  private level1!: Polyline;
  private levelLabel!: FormulaHandle;
  private newtonPath!: Polyline;
  private frozenPath!: Polyline;
  private newtonF: FormulaHandle[] = [];

  private notation!: FormulaHandle;

  // Ball U and the parallelograms
  private paras: Para[] = [];
  private ballEdge!: Polyline;
  private aDot!: Dot;
  private aLabel!: FormulaHandle;
  private uLabel!: FormulaHandle;
  private stepF: FormulaHandle[] = [];

  // Iteration panels
  private uEdge!: Polyline;
  private fuEdge!: Polyline;
  private fuFill!: Region;
  private iterDots: Dot[] = [];
  private imgDots: Dot[] = [];
  private iterPath!: Polyline;
  private imgPath!: Polyline;
  private targetDot!: Dot;
  private targetLabel!: FormulaHandle;
  private panelLabels: FormulaHandle[] = [];
  private phiF: FormulaHandle[] = [];
  private stepReadout!: FormulaHandle;
  private iterates: [number, number][] = [];

  // Lemma
  private lemmaF: FormulaHandle[] = [];
  private seg!: Polyline;
  private segDots: Dot[] = [];
  private gammaDot!: Dot;
  private segLabels: FormulaHandle[] = [];

  // Injectivity
  private solA!: Dot;
  private solB!: Dot;
  private solLabel!: FormulaHandle;
  private barD!: Polyline;
  private barH!: Polyline;
  private injF!: FormulaHandle;

  // Remaining question
  private openQ!: FormulaHandle;
  private notes: FormulaHandle[] = [];

  private ledger!: ProofLedger;
  private road!: RoadSign;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    usePixelView(stage);

    // ---- 1D: true Newton vs frozen Newton
    this.axes1 = new PlotAxes(stage, fl, ONE_D, { uMin: -0.3, uMax: 1.15, vMin: -0.3, vMax: 1.1, uLabel: "x", vLabel: "" });
    const cv: THREE.Vector3[] = [];
    for (let i = 0; i <= 100; i++) {
      const x = -0.25 + (1.2 * i) / 100;
      cv.push(ONE_D.v3(x, f1(x)));
    }
    this.curve1 = new Polyline(stage, cv, { color: Palette.blue, width: 3.5 });
    this.level1 = new Polyline(stage, [ONE_D.v3(-0.3, Y1), ONE_D.v3(1.12, Y1)], { color: Palette.green, width: 2, dashed: true, dashSize: 0.07, gapSize: 0.06 });
    this.levelLabel = fl.add({ tex: "y", x: ONE_D.px(1.12, Y1).x + 20, y: ONE_D.px(1.12, Y1).y, size: 30, color: Palette.green });
    this.newtonPath = new Polyline(stage, this.newtonPts((x) => df1(x)), { color: Palette.purple, width: 3 });
    this.frozenPath = new Polyline(stage, this.newtonPts(() => df1(0)), { color: Palette.orange, width: 3 });
    const nf = [
      `${Tex.color(Palette.purple, "\\text{Newton: } x\\leftarrow x+f'(x)^{-1}\\,(y-f(x))")}`,
      `${Tex.color(Palette.red, "\\text{needs } f'(x)\\ \\text{invertible at every step}")}`,
      "\\text{freeze: } A=f'(a)",
      `${Tex.color(Palette.orange, "\\varphi_y(x)=x+A^{-1}\\,(y-f(x))")}`,
      "\\|f'-A\\|\\ \\text{small}\\ \\Rightarrow\\ \\text{error at least halves}",
    ];
    this.newtonF = nf.map((tex, i) => fl.add({ tex, x: 1030, y: [200, 270, 360, 430, 520][i], size: 30, boxed: i === 3 }));

    this.notation = fl.add({ tex: "\\text{Rudin's notation:}\\quad f=F,\\qquad a=x_0,\\qquad A=f'(a),\\qquad p=\\text{an arbitrary point}", x: 700, y: 450, size: 34, boxed: true });

    // ---- Ball U and derivative parallelograms
    for (let i = -4; i <= 4; i++) {
      for (let j = -4; j <= 4; j++) {
        const q: [number, number] = [0.4 * i, 0.4 * j];
        if (Math.hypot(q[0], q[1]) > 1.65) continue;
        const ok = RudinExample.deviation(q[0], q[1]) < RudinExample.LAMBDA;
        this.paras.push({ q, ok, line: new Polyline(stage, this.paraPts(q), { color: ok ? Palette.green : Palette.red, width: 2 }) });
      }
    }
    this.ballEdge = new Polyline(stage, this.circle(PANEL_L, 1.6), { color: Palette.blue, width: 3 });
    this.aDot = new Dot(stage, pxv(PANEL_L.x, PANEL_L.y, 0.02), Palette.orange, 0.06);
    this.aLabel = fl.add({ tex: "a", x: PANEL_L.x - 16, y: PANEL_L.y + 22, size: 28, color: Palette.orange });
    this.uLabel = fl.add({ tex: "U", x: PANEL_L.x - 150, y: PANEL_L.y - 160, size: 34, color: Palette.blue });
    const sf = [
      "\\text{Step 1: } 2\\lambda\\,\\|A^{-1}\\|=1",
      "\\text{Step 2: } \\|f'(x)-A\\|<\\lambda\\ \\text{on a ball } U\\ni a",
      `${Tex.color(Palette.orange, "\\text{uses } f\\in C^1")}`,
      "f(u,v)=\\big(u+\\tfrac{v^2}{4},\\ v+\\tfrac{u^2}{4}\\big),\\quad a=0",
      "A=I,\\quad \\lambda=\\tfrac12,\\quad \\|f'(x)-A\\|=\\tfrac12\\max(|u|,|v|)",
      `${Tex.color(Palette.green, "\\text{green: } \\|f'(x)-A\\|<\\lambda")}\\qquad ${Tex.color(Palette.red, "\\text{red: not}")}`,
    ];
    this.stepF = sf.map((tex, i) => fl.add({ tex, x: 1010, y: [200, 270, 330, 420, 490, 570][i], size: i === 4 ? 26 : 28 }));

    // ---- Iteration panels
    this.uEdge = new Polyline(stage, this.circle(PANEL_L, 1), { color: Palette.blue, width: 3 });
    const fu: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (2 * Math.PI * i) / 128;
      const p = RudinExample.f(Math.cos(a), Math.sin(a));
      fu.push(pxv(PANEL_R.x + PANEL_R.s * p[0], PANEL_R.y - PANEL_R.s * p[1]));
    }
    this.fuEdge = new Polyline(stage, fu, { color: Palette.purple, width: 3 });
    this.fuFill = new Region(stage, fu, Palette.purple, 0.12);
    this.iterates = RudinExample.iterates(TARGET, [0, 0], N_ITER);
    this.iterDots = this.iterates.map((_, i) => new Dot(stage, this.lp(this.iterates[i], 0.02), i === 0 ? Palette.orange : Palette.yellow, 0.055));
    this.imgDots = this.iterates.map((q, i) => new Dot(stage, this.rp(RudinExample.f(q[0], q[1]), 0.02), i === 0 ? Palette.orange : Palette.yellow, 0.055));
    this.iterPath = new Polyline(stage, this.iterates.map((q) => this.lp(q, 0.01)), { color: Palette.yellow, width: 2 });
    this.imgPath = new Polyline(stage, this.iterates.map((q) => this.rp(RudinExample.f(q[0], q[1]), 0.01)), { color: Palette.yellow, width: 2 });
    this.targetDot = new Dot(stage, this.rp(TARGET, 0.03), Palette.green, 0.1, "2d", true);
    this.targetLabel = fl.add({ tex: "y", x: this.rpx(TARGET).x + 26, y: this.rpx(TARGET).y - 22, size: 30, color: Palette.green });
    this.panelLabels = [
      fl.add({ tex: "U", x: PANEL_L.x - 150, y: PANEL_L.y - 160, size: 34, color: Palette.blue }),
      fl.add({ tex: "f(U)", x: PANEL_R.x - 170, y: PANEL_R.y - 150, size: 34, color: Palette.purple }),
      fl.add({ tex: "x_0=a", x: PANEL_L.x - 40, y: PANEL_L.y + 28, size: 26, color: Palette.orange }),
    ];
    const pf = [
      "\\text{Step 3: } \\varphi_y(x)=x+A^{-1}\\,(y-f(x))",
      `f(x)=y\\iff A^{-1}(y-f(x))=0\\iff ${Tex.color(Palette.yellow, "\\varphi_y(x)=x")}`,
    ];
    this.phiF = pf.map((tex, i) => fl.add({ tex, x: 640, y: [110, 790][i], size: 32 }));
    const steps = this.iterates.slice(1).map((q, i) => Math.hypot(q[0] - this.iterates[i][0], q[1] - this.iterates[i][1]));
    this.stepReadout = fl.add({ tex: `\\|x_{n+1}-x_n\\|:\\ ${steps.slice(0, 4).map((s) => s.toFixed(3)).join(",\\ ")},\\ \\dots`, x: 640, y: 720, size: 28, color: Palette.yellow });

    // ---- Lemma (mean value inequality)
    const lf = [
      "\\text{Step 4: } \\varphi_y'(x)=I-A^{-1}f'(x)=A^{-1}\\big(A-f'(x)\\big)",
      "\\|\\varphi_y'(x)\\|\\le\\|A^{-1}\\|\\,\\|A-f'(x)\\|<\\|A^{-1}\\|\\,\\lambda=\\tfrac12\\quad(x\\in U)",
      "\\text{Lemma: } E\\ \\text{convex},\\ \\|\\varphi'\\|\\le M\\ \\text{on } E\\ \\Rightarrow\\ \\|\\varphi(x_1)-\\varphi(x_2)\\|\\le M\\|x_1-x_2\\|",
      "u=\\varphi(x_1)-\\varphi(x_2),\\qquad \\gamma(t)=x_2+t\\,(x_1-x_2)\\in E",
      "s(t)=u\\cdot\\varphi(\\gamma(t))",
      "s(1)-s(0)=s'(\\tau)\\quad\\text{for some } \\tau\\in(0,1)",
      "s'(\\tau)=u\\cdot\\varphi'(\\gamma(\\tau))(x_1-x_2)\\le\\|u\\|\\,M\\,\\|x_1-x_2\\|",
      "s(1)-s(0)=u\\cdot u=\\|u\\|^2\\ \\Rightarrow\\ \\|u\\|\\le M\\,\\|x_1-x_2\\|",
      `${Tex.color(Palette.yellow, "\\text{Step 5: } \\|\\varphi_y(x_1)-\\varphi_y(x_2)\\|\\le\\tfrac12\\|x_1-x_2\\|\\ \\ (x_1,x_2\\in U)")}`,
    ];
    this.lemmaF = lf.map((tex, i) => fl.add({ tex, x: 960, y: [130, 195, 275, 345, 405, 465, 530, 595, 680][i], size: i === 2 ? 22 : 25, boxed: i === 2 }));
    const X1: [number, number] = [0.55, 0.35];
    const X2: [number, number] = [-0.45, -0.3];
    this.seg = new Polyline(stage, [this.lp(X2), this.lp(X1)], { color: Palette.orange, width: 3 });
    this.segDots = [X1, X2].map((q) => new Dot(stage, this.lp(q, 0.02), Palette.orange, 0.06));
    this.gammaDot = new Dot(stage, this.lp(X2, 0.03), Palette.yellow, 0.065);
    this.segLabels = [
      fl.add({ tex: "x_1", x: this.lpx(X1).x + 24, y: this.lpx(X1).y - 18, size: 28, color: Palette.orange }),
      fl.add({ tex: "x_2", x: this.lpx(X2).x - 26, y: this.lpx(X2).y + 20, size: 28, color: Palette.orange }),
      fl.add({ tex: "\\gamma(\\tau)", x: 0, y: 0, size: 26, color: Palette.yellow }),
    ];
    this.segEnds = [X1, X2];

    // ---- Injectivity
    this.solA = new Dot(stage, this.lp([-0.45, 0.35], 0.02), Palette.yellow, 0.07);
    this.solB = new Dot(stage, this.lp([0.45, -0.3], 0.02), Palette.pink, 0.07);
    this.solLabel = fl.add({ tex: "f(x_1)=f(x_2)=y\\ \\Rightarrow\\ \\text{both fixed points of } \\varphi_y", x: 640, y: 110, size: 30 });
    this.barD = new Polyline(stage, [pxv(760, 420), pxv(1160, 420)], { color: Palette.blue, width: 8 });
    this.barH = new Polyline(stage, [pxv(760, 470), pxv(960, 470)], { color: Palette.green, width: 8 });
    this.injF = fl.add({ tex: `\\|x_1-x_2\\|=\\|\\varphi_y(x_1)-\\varphi_y(x_2)\\|\\le\\tfrac12\\|x_1-x_2\\|\\ \\Rightarrow\\ x_1=x_2`, x: 640, y: 790, size: 30 });

    this.openQ = fl.add({ tex: "\\partial f(U):\\ \\text{open?}", x: PANEL_R.x + 170, y: PANEL_R.y + 210, size: 32, color: Palette.red });
    const notes = [
      "\\text{not yet used: completeness, existence of a solution}",
      "\\text{true Newton: } f'\\ \\text{invertible everywhere};\\ \\text{frozen: only at } a,\\ \\text{plus } f'\\ \\text{continuous}",
      "\\tfrac12\\ \\text{is a convenient choice; any constant } <1\\ \\text{works}",
    ];
    this.notes = notes.map((tex, i) => fl.add({ tex, x: 640, y: [110, 160, 790][i], size: i === 1 ? 24 : 28, color: Palette.muted }));

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "N", tex: "f=F,\\ a=x_0,\\ A=f'(a)", at: cue.s(8) + 0.5 },
      { label: "1", tex: "\\|f'(x)-A\\|<\\lambda\\ \\text{on } U", at: cue.s(11) + 0.5 },
      { label: "2", tex: "f(x)=y\\iff\\varphi_y(x)=x", at: cue.s(18) + 0.5 },
      { label: "3", tex: "\\varphi_y\\ \\text{is a }\\tfrac12\\text{-contraction on } U", at: cue.s(29) + 1.5 },
      { label: "4", tex: "f\\ \\text{one-to-one on } U", at: cue.s(32) + 1.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
    this.road = new RoadSign(fl, 700);
  }

  private segEnds: [number, number][] = [];

  /** Newton-type path from x₀ = 0: tangent-direction segment to the level y, then vertical back to the graph. */
  private newtonPts(slope: (x: number) => number): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [ONE_D.v3(0, f1(0))];
    let x = 0;
    for (let i = 0; i < 5; i++) {
      const nx = x + (Y1 - f1(x)) / slope(x);
      pts.push(ONE_D.v3(nx, Y1));
      pts.push(ONE_D.v3(nx, f1(nx)));
      x = nx;
    }
    return pts;
  }

  private paraPts(q: [number, number]): THREE.Vector3[] {
    const J = RudinExample.jacobian(q[0], q[1]);
    const h = 0.13;
    const c = { x: PANEL_L.x + PANEL_L.s * q[0], y: PANEL_L.y - PANEL_L.s * q[1] };
    const corner = (a: number, b: number): THREE.Vector3 => pxv(c.x + PANEL_L.s * (J[0] * a + J[1] * b), c.y - PANEL_L.s * (J[2] * a + J[3] * b));
    return [corner(-h, -h), corner(h, -h), corner(h, h), corner(-h, h), corner(-h, -h)];
  }

  private circle(P: { x: number; y: number; s: number }, r: number): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) pts.push(pxv(P.x + P.s * r * Math.cos((2 * Math.PI * i) / 128), P.y - P.s * r * Math.sin((2 * Math.PI * i) / 128)));
    return pts;
  }

  private lpx(q: [number, number]): { x: number; y: number } {
    return { x: PANEL_L.x + PANEL_L.s * q[0], y: PANEL_L.y - PANEL_L.s * q[1] };
  }

  private lp(q: [number, number], z = 0): THREE.Vector3 {
    const p = this.lpx(q);
    return pxv(p.x, p.y, z);
  }

  private rpx(q: [number, number]): { x: number; y: number } {
    return { x: PANEL_R.x + PANEL_R.s * q[0], y: PANEL_R.y - PANEL_R.s * q[1] };
  }

  private rp(q: [number, number], z = 0): THREE.Vector3 {
    const p = this.rpx(q);
    return pxv(p.x, p.y, z);
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;

    // ---- 1D Newton: s1–s6
    const v1 = c.p(1, 0.8, -0.5) * (1 - c.p(7, 0.6));
    this.axes1.setOpacity(v1);
    this.curve1.setOpacity(v1);
    this.level1.setOpacity(v1);
    this.levelLabel.set({ opacity: v1 });
    this.newtonPath.setProgress(c.over(2, 0.05, 0.9));
    this.newtonPath.setOpacity(v1 * c.p(2, 0.3) * (1 - 0.7 * c.p(4, 0.6)));
    this.frozenPath.setProgress(c.over(5, 0.05, 0.9));
    this.frozenPath.setOpacity(v1 * c.p(5, 0.3));
    const nfAt = [1, 3, 4, 5, 6];
    this.newtonF.forEach((h, i) => h.set({ opacity: c.p(nfAt[i], 0.6) * (1 - c.p(7, 0.6)) }));
    this.notation.set({ opacity: c.p(7, 0.6) * (1 - c.p(9, 0.6)) });

    // ---- Ball U: s9–s14
    const v2 = c.p(9, 0.6) * (1 - c.p(15, 0.6));
    const radius = lerp(1.6, 1.0, c.over(14, 0.15, 0.7));
    this.ballEdge.setPoints(this.circle(PANEL_L, radius));
    this.ballEdge.setOpacity(v2 * c.p(10, 0.6));
    this.paras.forEach((p) => {
      const inside = Math.hypot(p.q[0], p.q[1]) < radius - 1e-9;
      p.line.setOpacity(v2 * c.p(12, 0.6) * (inside ? 1 : 0.22));
    });
    this.aDot.setOpacity(v2);
    this.aLabel.set({ opacity: v2 });
    this.uLabel.set({ opacity: v2 * c.p(10, 0.6) });
    const sfAt = [9, 10, 11, 12, 13, 14];
    this.stepF.forEach((h, i) => h.set({ opacity: c.p(sfAt[i], 0.6) * (1 - c.p(15, 0.6)) }));

    // ---- Iteration panels: s15–s19, and again s33–s36
    const v3 = c.p(15, 0.6) * (1 - c.p(20, 0.6));
    const vEnd = c.p(33, 0.6);
    const vU = Math.max(v3, c.p(20, 0.6) * (1 - c.p(33, 0.4)), vEnd);
    this.uEdge.setOpacity(vU);
    this.panelLabels[0].set({ opacity: vU });
    const vR = Math.max(v3, vEnd);
    this.fuEdge.setOpacity(vR);
    this.fuFill.setOpacity(0.12 * vR);
    this.panelLabels[1].set({ opacity: vR });
    this.panelLabels[2].set({ opacity: v3 * c.p(19, 0.5) });
    const shown = (N_ITER + 1) * clamp01((t - c.s(19)) / ((c.e(19) - c.s(19)) * 0.85));
    this.iterDots.forEach((d, i) => d.setOpacity(v3 * (shown > i ? 1 : 0)));
    this.imgDots.forEach((d, i) => d.setOpacity(v3 * (shown > i ? 1 : 0)));
    this.iterPath.setProgress(clamp01((shown - 1) / N_ITER));
    this.iterPath.setOpacity(v3 * (shown > 1 ? 0.8 : 0));
    this.imgPath.setProgress(clamp01((shown - 1) / N_ITER));
    this.imgPath.setOpacity(v3 * (shown > 1 ? 0.8 : 0));
    this.targetDot.setOpacity(v3 * c.p(15, 0.6, 1.0));
    this.targetLabel.set({ opacity: v3 * c.p(15, 0.6, 1.0) });
    this.phiF[0].set({ opacity: v3 });
    this.phiF[1].set({ opacity: c.p(16, 0.6) * (1 - c.p(19, 0.5)) });
    this.stepReadout.set({ opacity: v3 * c.p(19, 0.5, 2.0) });

    // ---- Lemma: s20–s29
    const lfAt = [20, 21, 23, 24, 25, 26, 27, 28, 29];
    const lemmaOut = 1 - c.p(30, 0.6);
    this.lemmaF.forEach((h, i) => h.set({ opacity: c.p(lfAt[i], 0.6) * lemmaOut }));
    const segVis = c.p(24, 0.6) * (1 - c.p(29, 0.6));
    this.seg.setOpacity(segVis);
    this.seg.setProgress(c.over(24, 0.3, 0.9));
    this.segDots.forEach((d) => d.setOpacity(segVis));
    const tau = lerp(0, 0.62, c.over(26, 0.1, 0.8));
    const g: [number, number] = [lerp(this.segEnds[1][0], this.segEnds[0][0], tau), lerp(this.segEnds[1][1], this.segEnds[0][1], tau)];
    this.gammaDot.setPosition(this.lp(g, 0.03));
    this.gammaDot.setOpacity(segVis * c.p(25, 0.5));
    this.segLabels[0].set({ opacity: segVis });
    this.segLabels[1].set({ opacity: segVis });
    const gp = this.lpx(g);
    this.segLabels[2].set({ x: gp.x + 10, y: gp.y + 34, opacity: segVis * c.p(26, 0.5) });

    // ---- Injectivity: s30–s32
    const v5 = c.p(30, 0.6) * (1 - c.p(33, 0.6));
    const merge = c.over(31, 0.5, 0.95);
    this.solA.setPosition(this.lp([lerp(-0.45, 0, merge), lerp(0.35, 0.03, merge)], 0.02));
    this.solB.setPosition(this.lp([lerp(0.45, 0, merge), lerp(-0.3, 0.03, merge)], 0.02));
    this.solA.setOpacity(v5);
    this.solB.setOpacity(v5);
    this.solLabel.set({ opacity: v5 * c.p(31, 0.5) });
    this.barD.setOpacity(v5 * c.p(31, 0.5) * (1 - merge));
    this.barH.setOpacity(v5 * c.p(31, 0.5, 0.8) * (1 - merge));
    this.injF.set({ opacity: v5 * c.p(31, 0.5, 1.0) });

    // ---- What remains: s33–s36
    this.openQ.set({ opacity: c.p(36, 0.6) * (0.75 + 0.25 * Math.cos((t - c.s(36)) * 5)) });
    const nAt = [33, 34, 35];
    this.notes.forEach((h, i) => h.set({ opacity: c.p(nAt[i], 0.6) }));

    this.ledger.update(t, 1, true);
    this.road.update(c.p(0, 0.8, -0.8), 0);
  }

  teardown(_layers: SceneLayers): void {}
}
